using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NotificationService.Core.Entities;
using NotificationService.Core.Interfaces;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace NotificationService.Infrastructure.Services;

public class RabbitMQConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private IConnection? _connection;
    private IModel? _channel;

    public RabbitMQConsumer(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public override Task StartAsync(CancellationToken cancellationToken)
    {
        var hostName = Environment.GetEnvironmentVariable("RABBITMQ_HOST") ?? "rabbitmq";
        var factory = new ConnectionFactory { HostName = hostName };
        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();
        _channel.QueueDeclare(
            queue: "comment_created",
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
        return base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += async (model, ea) =>
        {
            var message = Encoding.UTF8.GetString(ea.Body.ToArray());
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
            await HandleMessageAsync(message, repo);
        };

        _channel.BasicConsume(queue: "comment_created", autoAck: true, consumer: consumer);
        return;
    }

    // Pure message-handling logic, decoupled from RabbitMQ so it can be unit tested.
    public static async Task HandleMessageAsync(string message, INotificationRepository repo)
    {
        CommentCreatedEvent? commentEvent;
        try
        {
            commentEvent = JsonSerializer.Deserialize<CommentCreatedEvent>(message);
        }
        catch (JsonException)
        {
            return; // ignore malformed messages
        }

        if (commentEvent == null || commentEvent.RecipientId == Guid.Empty) return;

        var notificationMessage = commentEvent.IsReply
            ? $"{commentEvent.Username} replied to your comment: {commentEvent.Content}"
            : $"{commentEvent.Username} commented on your artwork: {commentEvent.Content}";

        await repo.CreateAsync(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = commentEvent.RecipientId,
            Message = notificationMessage,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            // Link the commenter's name to their profile. No artwork id travels on
            // the comment_created event, so there is no object link to attach.
            ActorUsername = commentEvent.Username
        });
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        base.Dispose();
    }
}

public class CommentCreatedEvent
{
    // The user to notify: the artwork's artist for a review, or the parent
    // comment's author for a reply. Kept in sync with the publisher in CommentService.
    public Guid RecipientId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsReply { get; set; }
}
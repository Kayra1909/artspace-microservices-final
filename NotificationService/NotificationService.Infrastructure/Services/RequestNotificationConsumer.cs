using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NotificationService.Core.Entities;
using NotificationService.Core.Interfaces;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace NotificationService.Infrastructure.Services;

// Consumes the generic notification events RequestService publishes for the artwork
// request feature. Unlike comment_created, these arrive with the target user and a
// ready-made message, so the consumer just persists them verbatim.
public class RequestNotificationConsumer : BackgroundService
{
    public const string QueueName = "request_notification";

    private readonly IServiceScopeFactory _scopeFactory;
    private IConnection? _connection;
    private IModel? _channel;

    public RequestNotificationConsumer(IServiceScopeFactory scopeFactory)
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
            queue: QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
        return base.StartAsync(cancellationToken);
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var consumer = new EventingBasicConsumer(_channel);
        consumer.Received += async (model, ea) =>
        {
            var message = Encoding.UTF8.GetString(ea.Body.ToArray());
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
            await HandleMessageAsync(message, repo);
        };

        _channel.BasicConsume(queue: QueueName, autoAck: true, consumer: consumer);
        return Task.CompletedTask;
    }

    // Pure message-handling logic, decoupled from RabbitMQ so it can be unit tested.
    public static async Task HandleMessageAsync(string message, INotificationRepository repo)
    {
        RequestNotificationEvent? evt;
        try
        {
            evt = JsonSerializer.Deserialize<RequestNotificationEvent>(message);
        }
        catch (JsonException)
        {
            return; // ignore malformed messages
        }

        if (evt == null || evt.UserId == Guid.Empty || string.IsNullOrWhiteSpace(evt.Message))
            return;

        await repo.CreateAsync(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = evt.UserId,
            Message = evt.Message,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            ActorUsername = evt.ActorUsername,
            LinkType = evt.LinkType,
            LinkId = evt.LinkId
        });
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        base.Dispose();
    }
}

public class RequestNotificationEvent
{
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ActorUsername { get; set; }
    public string? LinkType { get; set; }
    public string? LinkId { get; set; }
}

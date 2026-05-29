using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace CommentService.Infrastructure.Services;

public class RabbitMQPublisher
{
    private readonly IConnection _connection;
    private readonly IModel _channel;

    public RabbitMQPublisher()
    {
        var factory = new ConnectionFactory { HostName = "rabbitmq" };
        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();
        _channel.QueueDeclare(
            queue: "comment_created",
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
    }

    public void Publish(object message)
    {
        var json = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(json);
        _channel.BasicPublish(
            exchange: "",
            routingKey: "comment_created",
            basicProperties: null,
            body: body);
    }
}
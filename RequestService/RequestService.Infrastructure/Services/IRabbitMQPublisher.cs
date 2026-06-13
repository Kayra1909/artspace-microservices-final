namespace RequestService.Infrastructure.Services;

public interface IRabbitMQPublisher
{
    // Notify a single user. The payload shape
    // ({ UserId, Message, ActorUsername, LinkType, LinkId }) is consumed by
    // NotificationService's RequestNotificationConsumer. actorUsername/linkType/linkId
    // are optional link metadata the frontend uses to make the message clickable
    // (actor → profile, "request" + id → the request).
    void PublishNotification(Guid userId, string message,
        string? actorUsername = null, string? linkType = null, string? linkId = null);
}

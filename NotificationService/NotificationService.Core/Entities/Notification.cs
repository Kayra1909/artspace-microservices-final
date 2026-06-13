namespace NotificationService.Core.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Optional link metadata so the frontend can turn the message into clickable
    // references. ActorUsername points at the user who triggered the notification
    // (linked to their profile); LinkType/LinkId point at the affected object
    // (e.g. "request" + the request id → /requests/{id}). All nullable: older
    // notifications and ones without a target (none currently) simply omit them.
    public string? ActorUsername { get; set; }
    public string? LinkType { get; set; }
    public string? LinkId { get; set; }
}
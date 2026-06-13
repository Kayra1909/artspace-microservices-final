namespace NotificationService.API.DTOs;

public class NotificationResponseDto
{
    public Guid Id { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? ActorUsername { get; set; }
    public string? LinkType { get; set; }
    public string? LinkId { get; set; }
}
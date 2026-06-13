using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NotificationService.API.DTOs;
using NotificationService.Core.Entities;
using NotificationService.Core.Interfaces;
using System.Security.Claims;

namespace NotificationService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationRepository _notificationRepository;

    public NotificationController(INotificationRepository notificationRepository)
    {
        _notificationRepository = notificationRepository;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationResponseDto>>> GetMyNotifications()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var notifications = await _notificationRepository.GetByUserIdAsync(userId);
        return Ok(notifications.Select(MapToDto));
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        await _notificationRepository.MarkAsReadAsync(id);
        return NoContent();
    }

    private NotificationResponseDto MapToDto(Notification n) => new()
    {
        Id = n.Id,
        Message = n.Message,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt,
        ActorUsername = n.ActorUsername,
        LinkType = n.LinkType,
        LinkId = n.LinkId
    };
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RequestService.API.DTOs;
using RequestService.Core.Entities;
using RequestService.Core.Interfaces;
using System.Security.Claims;

namespace RequestService.API.Controllers;

// Public showcase of completed commissions. Reads are anonymous; hiding/un-hiding and
// review edits require the relevant participant.
[ApiController]
[Route("api/[controller]")]
public class ReferenceController : ControllerBase
{
    private readonly IReferenceArtworkRepository _repository;

    public ReferenceController(IReferenceArtworkRepository repository)
    {
        _repository = repository;
    }

    private Guid? CurrentUserId =>
        Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    // GET /api/Reference — everyone sees items hidden by neither party.
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ReferenceArtworkDto>>> GetAll()
    {
        var items = await _repository.GetVisibleAsync();
        return Ok(items.Select(MapToDto));
    }

    // GET /api/Reference/{id} — visible items are public; a hidden item is viewable only by
    // its artist or client (so they can still manage it).
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<ReferenceArtworkDto>> GetById(Guid id)
    {
        var item = await _repository.GetByIdAsync(id);
        if (item == null) return NotFound();
        if (!item.IsVisible && !IsParticipant(item)) return NotFound();
        return Ok(MapToDto(item));
    }

    // POST /api/Reference/{id}/hide — the calling participant hides it from their side.
    [HttpPost("{id}/hide")]
    [Authorize]
    public Task<ActionResult<ReferenceArtworkDto>> Hide(Guid id) => SetHidden(id, true);

    // POST /api/Reference/{id}/unhide — the calling participant clears their hide flag.
    [HttpPost("{id}/unhide")]
    [Authorize]
    public Task<ActionResult<ReferenceArtworkDto>> Unhide(Guid id) => SetHidden(id, false);

    private async Task<ActionResult<ReferenceArtworkDto>> SetHidden(Guid id, bool hidden)
    {
        var item = await _repository.GetByIdAsync(id);
        if (item == null) return NotFound();

        if (CurrentUserId == item.ArtistId) item.HiddenByArtist = hidden;
        else if (CurrentUserId == item.ClientId) item.HiddenByClient = hidden;
        else return Forbid();

        await _repository.UpdateAsync(item);
        return Ok(MapToDto(item));
    }

    // PUT /api/Reference/{id}/review — only the client (owner) may write/edit the review.
    [HttpPut("{id}/review")]
    [Authorize]
    public async Task<ActionResult<ReferenceArtworkDto>> UpdateReview(Guid id, UpdateReviewDto dto)
    {
        var item = await _repository.GetByIdAsync(id);
        if (item == null) return NotFound();
        if (CurrentUserId != item.ClientId) return Forbid();
        if (dto.Rating is < 1 or > 5) return BadRequest("Rating must be between 1 and 5.");
        if (string.IsNullOrWhiteSpace(dto.Review)) return BadRequest("Review is required.");

        item.Rating = dto.Rating;
        item.Review = dto.Review;
        await _repository.UpdateAsync(item);
        return Ok(MapToDto(item));
    }

    private bool IsParticipant(ReferenceArtwork item) =>
        CurrentUserId == item.ArtistId || CurrentUserId == item.ClientId;

    private static ReferenceArtworkDto MapToDto(ReferenceArtwork r) => new()
    {
        Id = r.Id,
        RequestId = r.RequestId,
        Title = r.Title,
        Description = r.Description,
        ImageUrl = r.ImageUrl,
        Budget = r.Budget,
        DeliveryTime = r.DeliveryTime,
        CompletedAt = r.CompletedAt,
        Rating = r.Rating,
        Review = r.Review,
        ArtistId = r.ArtistId,
        ArtistUsername = r.ArtistUsername,
        ClientId = r.ClientId,
        ClientUsername = r.ClientUsername,
        HiddenByClient = r.HiddenByClient,
        HiddenByArtist = r.HiddenByArtist,
        IsVisible = r.IsVisible
    };
}

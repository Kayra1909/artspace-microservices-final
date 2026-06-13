using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RequestService.API.DTOs;
using RequestService.Core.Entities;
using RequestService.Core.Interfaces;
using RequestService.Core.StateMachine;
using RequestService.Infrastructure.Services;
using System.Security.Claims;

namespace RequestService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RequestController : ControllerBase
{
    private readonly IArtworkRequestRepository _repository;
    private readonly IReferenceArtworkRepository _references;
    private readonly IRabbitMQPublisher _publisher;

    public RequestController(IArtworkRequestRepository repository,
        IReferenceArtworkRepository references, IRabbitMQPublisher publisher)
    {
        _repository = repository;
        _references = references;
        _publisher = publisher;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string CurrentUsername => User.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown";
    private string CurrentEmail => User.FindFirst(ClaimTypes.Email)?.Value ?? "";

    // ---- Reads (open regardless of state) -----------------------------------------

    // GET /api/Request/received — requests addressed to the signed-in artist.
    [HttpGet("received")]
    public async Task<ActionResult<IEnumerable<RequestResponseDto>>> GetReceived()
    {
        var requests = await _repository.GetReceivedAsync(CurrentUserId);
        return Ok(requests.Select(MapToDto));
    }

    // GET /api/Request/sent — requests the signed-in user has sent.
    [HttpGet("sent")]
    public async Task<ActionResult<IEnumerable<RequestResponseDto>>> GetSent()
    {
        var requests = await _repository.GetSentAsync(CurrentUserId);
        return Ok(requests.Select(MapToDto));
    }

    // GET /api/Request/{id} — only the artist or the requester may view a request.
    [HttpGet("{id}")]
    public async Task<ActionResult<RequestResponseDto>> GetById(Guid id)
    {
        var request = await _repository.GetByIdAsync(id);
        if (request == null) return NotFound();
        if (!IsParticipant(request)) return Forbid();
        return Ok(MapToDto(request));
    }

    // ---- submit_request (δ #1) ----------------------------------------------------

    [HttpPost]
    public async Task<ActionResult<RequestResponseDto>> Create(CreateRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest("Title is required.");
        if (dto.ArtistId == Guid.Empty)
            return BadRequest("An artist must be specified.");
        if (dto.ArtistId == CurrentUserId)
            return BadRequest("You cannot send an artwork request to yourself.");

        var request = new ArtworkRequest
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Description = dto.Description,
            State = RequestState.WaitingArtistReview,
            ProgressMode = ProgressMode.None,
            // The client's opening ask becomes the first proposed terms.
            ProposedPrice = dto.Budget,
            ProposedDeadline = dto.Deadline,
            ProposedDeliveryTime = dto.Deadline?.ToString("yyyy-MM-dd"),
            ArtworkId = dto.ArtworkId,
            RequesterId = CurrentUserId,
            RequesterUsername = CurrentUsername,
            RequesterEmail = CurrentEmail,
            ArtistId = dto.ArtistId,
            ArtistUsername = dto.ArtistUsername,
            CreatedAt = DateTime.UtcNow
        };

        var creationLog = new RequestLog
        {
            Id = Guid.NewGuid(),
            RequestId = request.Id,
            FromState = RequestState.WaitingArtistReview,
            ToState = RequestState.WaitingArtistReview,
            Action = "submit_request",
            ActorId = CurrentUserId,
            ActorRole = "client",
            ActorUsername = CurrentUsername,
            PayloadBudget = dto.Budget,
            PayloadDeadline = dto.Deadline,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _repository.CreateAsync(request, creationLog);
        _publisher.PublishNotification(
            created.ArtistId,
            $"{CurrentUsername} sent you an artwork request: \"{created.Title}\"",
            CurrentUsername, "request", created.Id.ToString());

        var full = await _repository.GetByIdAsync(created.Id);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapToDto(full!));
    }

    // ---- δ action endpoints (all funnel into Transition) --------------------------

    [HttpPost("{id}/offer")]
    public Task<ActionResult<RequestResponseDto>> SetOffer(Guid id, ActionRequestDto dto) =>
        Transition(id, RequestAction.SetOffer, dto);

    [HttpPost("{id}/accept-offer")]
    public Task<ActionResult<RequestResponseDto>> AcceptOffer(Guid id, ActionRequestDto dto) =>
        Transition(id, RequestAction.AcceptOffer, dto);

    [HttpPost("{id}/counter-offer")]
    public Task<ActionResult<RequestResponseDto>> CounterOffer(Guid id, ActionRequestDto dto) =>
        Transition(id, RequestAction.CounterOffer, dto);

    [HttpPost("{id}/submit-artwork")]
    public Task<ActionResult<RequestResponseDto>> SubmitArtwork(Guid id, ActionRequestDto dto) =>
        Transition(id, RequestAction.SubmitArtwork, dto);

    [HttpPost("{id}/accept-artwork")]
    public Task<ActionResult<RequestResponseDto>> AcceptArtwork(Guid id, ActionRequestDto dto) =>
        Transition(id, RequestAction.AcceptArtwork, dto);

    [HttpPost("{id}/request-revisions")]
    public Task<ActionResult<RequestResponseDto>> RequestRevisions(Guid id, ActionRequestDto dto) =>
        Transition(id, RequestAction.RequestRevisions, dto);

    [HttpPost("{id}/cancel")]
    public Task<ActionResult<RequestResponseDto>> Cancel(Guid id, ActionRequestDto dto) =>
        Transition(id, RequestAction.Cancel, dto);

    // The single transition function δ-driver. Looks up δ[state][action], authorizes the
    // actor, validates+applies the payload, and writes the new state + an audit row in one
    // atomic CAS. Anything not in δ is rejected — no implicit fallthrough.
    private async Task<ActionResult<RequestResponseDto>> Transition(Guid id, RequestAction action, ActionRequestDto? dto)
    {
        dto ??= new ActionRequestDto();

        var request = await _repository.GetByIdAsync(id);
        if (request == null) return NotFound();
        if (!IsParticipant(request)) return Forbid();

        var role = request.ArtistId == CurrentUserId ? ActorRole.Artist : ActorRole.Client;

        // Idempotency: this exact retry already applied → current state as a success no-op,
        // no duplicate history row, no term change.
        if (!string.IsNullOrWhiteSpace(dto.IdempotencyKey)
            && await _repository.HasIdempotencyKeyAsync(id, dto.IdempotencyKey))
            return Ok(MapToDto(request));

        // Locking: terminal states reject every mutation.
        if (RequestTransitions.IsTerminal(request.State))
            return Conflict("This request is locked and can no longer change.");

        // δ lookup — reject if this action is not legal from the current state.
        var def = RequestTransitions.Resolve(request.State, action);
        if (def == null)
            return UnprocessableEntity(
                $"'{ActionName(action)}' is not a legal action from state '{request.State}'.");

        // Authorization for this specific edge.
        if (!def.Allows(role))
            return Forbid();

        // Validate + apply the payload's side effects.
        var from = request.State;
        var error = ApplyAction(request, action, def, dto);
        if (error != null) return BadRequest(error);

        request.UpdatedAt = DateTime.UtcNow;

        var log = BuildLog(request, from, def.To, action, role, dto);
        var committed = await _repository.TryTransitionAsync(request, log);
        if (!committed)
        {
            // CAS loser: another writer moved the state first. Return the winning state.
            var fresh = await _repository.GetByIdAsync(id);
            return Ok(MapToDto(fresh!));
        }

        Notify(request, action, role);

        // Surface the deliverable link (submit_artwork) or revision note (request_revisions)
        // in the conversation thread so both parties see it inline. The transition already
        // notified the other party, so this does not publish a second notification.
        if ((action == RequestAction.SubmitArtwork || action == RequestAction.RequestRevisions)
            && !string.IsNullOrWhiteSpace(dto.Note))
        {
            await _repository.AddMessageAsync(new RequestMessage
            {
                Id = Guid.NewGuid(),
                RequestId = request.Id,
                SenderId = CurrentUserId,
                SenderUsername = CurrentUsername,
                Content = dto.Note!,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Completing a request promotes it to the public reference showcase.
        if (action == RequestAction.AcceptArtwork)
            await CreateReferenceArtwork(request, dto);

        var full = await _repository.GetByIdAsync(id);
        return Ok(MapToDto(full!));
    }

    // Seeds a ReferenceArtwork from the just-completed request. Idempotent: one reference
    // per request (a replayed accept won't duplicate it).
    private async Task CreateReferenceArtwork(ArtworkRequest r, ActionRequestDto dto)
    {
        if (await _references.GetByRequestIdAsync(r.Id) != null) return;

        await _references.CreateAsync(new ReferenceArtwork
        {
            Id = Guid.NewGuid(),
            RequestId = r.Id,
            Title = r.Title,
            Description = r.Description,
            ImageUrl = r.Deliverable ?? string.Empty,
            Budget = r.AgreedPrice,
            DeliveryTime = r.AgreedDeliveryTime,
            CompletedAt = DateTime.UtcNow,
            Rating = dto.Rating!.Value,
            Review = dto.Review!,
            ArtistId = r.ArtistId,
            ArtistUsername = r.ArtistUsername,
            ClientId = r.RequesterId,
            ClientUsername = r.RequesterUsername,
            CreatedAt = DateTime.UtcNow
        });
    }

    // Validates the payload for `action` and mutates the request's terms + head. Returns an
    // error string on invalid payload, or null on success.
    private static string? ApplyAction(ArtworkRequest r, RequestAction action, TransitionDef def, ActionRequestDto dto)
    {
        switch (action)
        {
            case RequestAction.SetOffer:
                if (dto.Price is null or < 0) return "An offer requires a non-negative price.";
                if (string.IsNullOrWhiteSpace(dto.Eta)) return "An offer requires an estimated delivery time.";
                r.ProposedPrice = dto.Price;
                r.ProposedDeliveryTime = dto.Eta;
                r.ProposedDeadline = null;
                break;

            case RequestAction.CounterOffer:
                if (dto.Budget is null or < 0) return "A counter-offer requires a non-negative budget.";
                if (dto.Deadline is null) return "A counter-offer requires a deadline.";
                r.ProposedPrice = dto.Budget;
                r.ProposedDeadline = dto.Deadline;
                r.ProposedDeliveryTime = dto.Deadline.Value.ToString("yyyy-MM-dd");
                break;

            case RequestAction.AcceptOffer:
                if (r.ProposedPrice is null) return "There is no offer on the table to accept.";
                // Finalize: lock the proposed terms as the binding agreement.
                r.AgreedPrice = r.ProposedPrice;
                r.AgreedDeliveryTime = r.ProposedDeliveryTime;
                r.AgreedDeadline = r.ProposedDeadline;
                r.ProgressMode = ProgressMode.Accepted;
                break;

            case RequestAction.SubmitArtwork:
                if (string.IsNullOrWhiteSpace(dto.Note)) return "Attach a deliverable note or link.";
                r.Deliverable = dto.Note;
                break;

            case RequestAction.RequestRevisions:
                r.ProgressMode = ProgressMode.Rejected;
                break;

            case RequestAction.AcceptArtwork:
                // Accepting finalizes the commission and seeds the showcase, so a review is required.
                if (dto.Rating is null or < 1 or > 5) return "A rating from 1 to 5 is required to accept the artwork.";
                if (string.IsNullOrWhiteSpace(dto.Review)) return "A review is required to accept the artwork.";
                break;

            case RequestAction.Cancel:
                break; // no payload requirements
        }

        r.State = def.To;
        return null;
    }

    private RequestLog BuildLog(ArtworkRequest r, RequestState from, RequestState to,
        RequestAction action, ActorRole role, ActionRequestDto dto) => new()
    {
        Id = Guid.NewGuid(),
        RequestId = r.Id,
        FromState = from,
        ToState = to,
        Action = ActionName(action),
        ActorId = CurrentUserId,
        ActorRole = role == ActorRole.Artist ? "artist" : "client",
        ActorUsername = CurrentUsername,
        PayloadPrice = dto.Price,
        PayloadBudget = dto.Budget,
        PayloadDeadline = dto.Deadline,
        PayloadNote = dto.Note,
        IdempotencyKey = string.IsNullOrWhiteSpace(dto.IdempotencyKey) ? null : dto.IdempotencyKey,
        CreatedAt = DateTime.UtcNow
    };

    private void Notify(ArtworkRequest r, RequestAction action, ActorRole actorRole)
    {
        // The other party is the recipient.
        var recipientId = actorRole == ActorRole.Artist ? r.RequesterId : r.ArtistId;
        var actor = CurrentUsername;
        var message = action switch
        {
            RequestAction.SetOffer => $"{actor} sent an offer on \"{r.Title}\".",
            RequestAction.CounterOffer => $"{actor} sent a counter-offer on \"{r.Title}\".",
            RequestAction.AcceptOffer => $"{actor} accepted the offer on \"{r.Title}\" — work can begin.",
            RequestAction.SubmitArtwork => $"{actor} submitted the artwork for \"{r.Title}\".",
            RequestAction.AcceptArtwork => $"{actor} accepted the artwork — \"{r.Title}\" is complete.",
            RequestAction.RequestRevisions => $"{actor} requested revisions on \"{r.Title}\".",
            RequestAction.Cancel => $"{actor} cancelled the request \"{r.Title}\".",
            _ => $"{actor} updated the request \"{r.Title}\"."
        };
        _publisher.PublishNotification(recipientId, message, actor, "request", r.Id.ToString());
    }

    // ---- Messaging (separate channel; open to participants in any state) ----------

    [HttpPost("{id}/messages")]
    public async Task<ActionResult<RequestMessageDto>> AddMessage(Guid id, CreateMessageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            return BadRequest("Message content is required.");

        var request = await _repository.GetByIdAsync(id);
        if (request == null) return NotFound();
        if (!IsParticipant(request)) return Forbid();

        var message = new RequestMessage
        {
            Id = Guid.NewGuid(),
            RequestId = request.Id,
            SenderId = CurrentUserId,
            SenderUsername = CurrentUsername,
            Content = dto.Content,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _repository.AddMessageAsync(message);

        var recipientId = request.ArtistId == CurrentUserId ? request.RequesterId : request.ArtistId;
        _publisher.PublishNotification(
            recipientId,
            $"{CurrentUsername} sent a message on the request: \"{request.Title}\"",
            CurrentUsername, "request", request.Id.ToString());

        return Ok(MapMessage(created));
    }

    // ---- Helpers ------------------------------------------------------------------

    private bool IsParticipant(ArtworkRequest request) =>
        request.ArtistId == CurrentUserId || request.RequesterId == CurrentUserId;

    private static string ActionName(RequestAction action) => action switch
    {
        RequestAction.SetOffer => "set_offer",
        RequestAction.AcceptOffer => "accept_offer",
        RequestAction.CounterOffer => "counter_offer",
        RequestAction.SubmitArtwork => "submit_artwork",
        RequestAction.AcceptArtwork => "accept_artwork",
        RequestAction.RequestRevisions => "request_revisions",
        RequestAction.Cancel => "cancel",
        _ => action.ToString()
    };

    private static RequestResponseDto MapToDto(ArtworkRequest r) => new()
    {
        Id = r.Id,
        Title = r.Title,
        Description = r.Description,
        State = r.State.ToString(),
        ProgressMode = r.ProgressMode.ToString(),
        IsLocked = RequestTransitions.IsTerminal(r.State),
        ProposedPrice = r.ProposedPrice,
        ProposedDeliveryTime = r.ProposedDeliveryTime,
        ProposedDeadline = r.ProposedDeadline,
        AgreedPrice = r.AgreedPrice,
        AgreedDeliveryTime = r.AgreedDeliveryTime,
        AgreedDeadline = r.AgreedDeadline,
        Deliverable = r.Deliverable,
        ArtworkId = r.ArtworkId,
        RequesterId = r.RequesterId,
        RequesterUsername = r.RequesterUsername,
        RequesterEmail = r.RequesterEmail,
        ArtistId = r.ArtistId,
        ArtistUsername = r.ArtistUsername,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt,
        Logs = r.Logs.OrderBy(l => l.CreatedAt).Select(MapLog).ToList(),
        Messages = r.Messages.OrderBy(m => m.CreatedAt).Select(MapMessage).ToList()
    };

    private static RequestLogDto MapLog(RequestLog l) => new()
    {
        Id = l.Id,
        FromState = l.FromState.ToString(),
        ToState = l.ToState.ToString(),
        Action = l.Action,
        ActorId = l.ActorId,
        ActorRole = l.ActorRole,
        ActorUsername = l.ActorUsername,
        PayloadPrice = l.PayloadPrice,
        PayloadBudget = l.PayloadBudget,
        PayloadDeadline = l.PayloadDeadline,
        PayloadNote = l.PayloadNote,
        CreatedAt = l.CreatedAt
    };

    private static RequestMessageDto MapMessage(RequestMessage m) => new()
    {
        Id = m.Id,
        SenderId = m.SenderId,
        SenderUsername = m.SenderUsername,
        Content = m.Content,
        CreatedAt = m.CreatedAt
    };
}

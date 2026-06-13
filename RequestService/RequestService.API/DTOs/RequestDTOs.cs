namespace RequestService.API.DTOs;

// submit_request (δ #1): the client opens a commission. Budget/Deadline are the client's
// opening ask, stored as the first *proposed* terms until the artist makes an offer.
public class CreateRequestDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal? Budget { get; set; }
    public DateTime? Deadline { get; set; }

    // The artist the commission is addressed to, denormalized from the artwork.
    public Guid ArtistId { get; set; }
    public string ArtistUsername { get; set; } = string.Empty;

    // Optional: the artwork that inspired the request.
    public Guid? ArtworkId { get; set; }
}

// One shape for every δ action endpoint. Only the fields relevant to the action are read:
// - set_offer (artist):        Price + Eta
// - counter_offer (client):    Budget + Deadline
// - submit_artwork (artist):   Note (deliverable image link)
// - request_revisions (client):Note
// - accept_artwork (client):   Rating (1-5) + Review — finalize & seed the reference showcase
// - accept_offer/cancel: no payload
// IdempotencyKey de-dupes retries; resending the same key returns the current state no-op.
public class ActionRequestDto
{
    public string? IdempotencyKey { get; set; }
    public decimal? Price { get; set; }
    public string? Eta { get; set; }
    public decimal? Budget { get; set; }
    public DateTime? Deadline { get; set; }
    public string? Note { get; set; }
    public int? Rating { get; set; }
    public string? Review { get; set; }
}

public class CreateMessageDto
{
    public string Content { get; set; } = string.Empty;
}

// An append-only audit line: the full δ edge plus the payload snapshot.
public class RequestLogDto
{
    public Guid Id { get; set; }
    public string FromState { get; set; } = string.Empty;
    public string ToState { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public Guid ActorId { get; set; }
    public string ActorRole { get; set; } = string.Empty;
    public string ActorUsername { get; set; } = string.Empty;
    public decimal? PayloadPrice { get; set; }
    public decimal? PayloadBudget { get; set; }
    public DateTime? PayloadDeadline { get; set; }
    public string? PayloadNote { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RequestMessageDto
{
    public Guid Id { get; set; }
    public Guid SenderId { get; set; }
    public string SenderUsername { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class RequestResponseDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Head of the machine + WIP annotation.
    public string State { get; set; } = string.Empty;
    public string ProgressMode { get; set; } = string.Empty;
    public bool IsLocked { get; set; }

    // Proposed (non-binding) vs agreed (locked) deal terms.
    public decimal? ProposedPrice { get; set; }
    public string? ProposedDeliveryTime { get; set; }
    public DateTime? ProposedDeadline { get; set; }
    public decimal? AgreedPrice { get; set; }
    public string? AgreedDeliveryTime { get; set; }
    public DateTime? AgreedDeadline { get; set; }

    public string? Deliverable { get; set; }
    public Guid? ArtworkId { get; set; }

    public Guid RequesterId { get; set; }
    public string RequesterUsername { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;

    public Guid ArtistId { get; set; }
    public string ArtistUsername { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public List<RequestLogDto> Logs { get; set; } = new();
    public List<RequestMessageDto> Messages { get; set; } = new();
}

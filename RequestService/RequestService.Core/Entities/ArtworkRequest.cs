namespace RequestService.Core.Entities;

// The "tape" of the state machine: the request record. The head is `State`; every field
// here is written only through a validated δ transition (see RequestController.Transition).
public class ArtworkRequest
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Head of the machine, plus the WIP annotation (None unless in WorkInProgress).
    public RequestState State { get; set; } = RequestState.WaitingArtistReview;
    public ProgressMode ProgressMode { get; set; } = ProgressMode.None;

    // Proposed (non-binding) deal terms — the offer currently on the table. Overwritten by
    // each set_offer (artist: price + ETA text) and counter_offer (client: budget + deadline).
    public decimal? ProposedPrice { get; set; }
    public string? ProposedDeliveryTime { get; set; }
    public DateTime? ProposedDeadline { get; set; }

    // Agreed (binding) deal terms — committed and locked once on accept_offer (3.1); after
    // that they never change.
    public decimal? AgreedPrice { get; set; }
    public string? AgreedDeliveryTime { get; set; }
    public DateTime? AgreedDeadline { get; set; }

    // The deliverable note/link attached by submit_artwork (4.1).
    public string? Deliverable { get; set; }

    // The artwork that inspired the commission (optional context).
    public Guid? ArtworkId { get; set; }

    // Requester (client) — denormalized from the JWT at creation time.
    public Guid RequesterId { get; set; }
    public string RequesterUsername { get; set; } = string.Empty;
    public string RequesterEmail { get; set; } = string.Empty;

    // Artist — denormalized from the artwork the form was opened on.
    public Guid ArtistId { get; set; }
    public string ArtistUsername { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Set on every transition; NULL means never transitioned past creation.
    public DateTime? UpdatedAt { get; set; }

    public ICollection<RequestLog> Logs { get; set; } = new List<RequestLog>();
    public ICollection<RequestMessage> Messages { get; set; } = new List<RequestMessage>();
}

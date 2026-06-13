namespace RequestService.Core.Entities;

// An append-only audit row written on every state transition. Never updated or deleted.
// Records the full δ edge (from→to + action), who took it, and a snapshot of the payload.
public class RequestLog
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public ArtworkRequest? Request { get; set; }

    public RequestState FromState { get; set; }
    public RequestState ToState { get; set; }

    // The action name (e.g. "set_offer") and the actor.
    public string Action { get; set; } = string.Empty;
    public Guid ActorId { get; set; }
    public string ActorRole { get; set; } = string.Empty;   // "client" | "artist"
    public string ActorUsername { get; set; } = string.Empty;

    // Snapshot of the action payload, for a reconstructable history.
    public decimal? PayloadPrice { get; set; }
    public decimal? PayloadBudget { get; set; }
    public DateTime? PayloadDeadline { get; set; }
    public string? PayloadNote { get; set; }

    // De-dupes retries: (RequestId, IdempotencyKey) is unique. NULL for the creation row.
    public string? IdempotencyKey { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

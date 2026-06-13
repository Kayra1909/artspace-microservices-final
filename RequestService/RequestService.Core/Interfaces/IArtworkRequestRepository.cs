using RequestService.Core.Entities;

namespace RequestService.Core.Interfaces;

public interface IArtworkRequestRepository
{
    // Detail with logs + messages eagerly loaded.
    Task<ArtworkRequest?> GetByIdAsync(Guid id);

    Task<IEnumerable<ArtworkRequest>> GetReceivedAsync(Guid artistId);
    Task<IEnumerable<ArtworkRequest>> GetSentAsync(Guid requesterId);

    Task<ArtworkRequest> CreateAsync(ArtworkRequest request, RequestLog creationLog);

    // Atomic compare-and-swap transition: persists the mutated `request` and appends `log`
    // in one transaction, guarded by the request's original State (optimistic concurrency).
    // Returns false if another writer already moved the state (CAS loser) — nothing is saved.
    Task<bool> TryTransitionAsync(ArtworkRequest request, RequestLog log);

    // True if a transition with this idempotency key was already recorded for the request.
    Task<bool> HasIdempotencyKeyAsync(Guid requestId, string idempotencyKey);

    Task<RequestMessage> AddMessageAsync(RequestMessage message);
}

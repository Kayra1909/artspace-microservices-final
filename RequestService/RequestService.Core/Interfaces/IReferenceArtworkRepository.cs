using RequestService.Core.Entities;

namespace RequestService.Core.Interfaces;

public interface IReferenceArtworkRepository
{
    // Public gallery: only items visible to everyone (hidden by neither party).
    Task<IEnumerable<ReferenceArtwork>> GetVisibleAsync();

    Task<ReferenceArtwork?> GetByIdAsync(Guid id);
    Task<ReferenceArtwork?> GetByRequestIdAsync(Guid requestId);

    Task<ReferenceArtwork> CreateAsync(ReferenceArtwork reference);
    Task<ReferenceArtwork> UpdateAsync(ReferenceArtwork reference);
}

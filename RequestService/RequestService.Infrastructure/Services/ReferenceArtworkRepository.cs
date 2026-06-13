using Microsoft.EntityFrameworkCore;
using RequestService.Core.Entities;
using RequestService.Core.Interfaces;
using RequestService.Infrastructure.Data;

namespace RequestService.Infrastructure.Services;

public class ReferenceArtworkRepository : IReferenceArtworkRepository
{
    private readonly RequestServiceContext _context;

    public ReferenceArtworkRepository(RequestServiceContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ReferenceArtwork>> GetVisibleAsync()
    {
        return await _context.ReferenceArtworks
            .Where(r => !r.HiddenByClient && !r.HiddenByArtist)
            .OrderByDescending(r => r.CompletedAt)
            .ToListAsync();
    }

    public Task<ReferenceArtwork?> GetByIdAsync(Guid id) =>
        _context.ReferenceArtworks.FirstOrDefaultAsync(r => r.Id == id);

    public Task<ReferenceArtwork?> GetByRequestIdAsync(Guid requestId) =>
        _context.ReferenceArtworks.FirstOrDefaultAsync(r => r.RequestId == requestId);

    public async Task<ReferenceArtwork> CreateAsync(ReferenceArtwork reference)
    {
        _context.ReferenceArtworks.Add(reference);
        await _context.SaveChangesAsync();
        return reference;
    }

    public async Task<ReferenceArtwork> UpdateAsync(ReferenceArtwork reference)
    {
        _context.ReferenceArtworks.Update(reference);
        await _context.SaveChangesAsync();
        return reference;
    }
}

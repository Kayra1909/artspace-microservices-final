using ArtService.Core.Entities;
using ArtService.Core.Interfaces;
using ArtService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArtService.Infrastructure.Services;

public class ArtworkRepository : IArtworkRepository
{
    private readonly ArtServiceContext _context;

    public ArtworkRepository(ArtServiceContext context)
    {
        _context = context;
    }

    public async Task<Artwork?> GetByIdAsync(Guid id)
    {
        return await _context.Artworks.FindAsync(id);
    }

    public async Task<IEnumerable<Artwork>> GetAllAsync()
    {
        return await _context.Artworks.OrderByDescending(a => a.CreatedAt).ToListAsync();
    }

    public async Task<IEnumerable<Artwork>> GetByArtistIdAsync(Guid artistId)
    {
        return await _context.Artworks.Where(a => a.ArtistId == artistId).ToListAsync();
    }

    public async Task<IEnumerable<Artwork>> SearchAsync(string? category, string? keyword)
    {
        var query = _context.Artworks.AsQueryable();

        if (!string.IsNullOrEmpty(category))
            query = query.Where(a => a.Category == category);

        if (!string.IsNullOrEmpty(keyword))
            query = query.Where(a => a.Title.Contains(keyword) || a.Description.Contains(keyword) || a.Category.Contains(keyword));

        return await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
    }

    public async Task<Artwork> CreateAsync(Artwork artwork)
    {
        _context.Artworks.Add(artwork);
        await _context.SaveChangesAsync();
        return artwork;
    }

    public async Task<Artwork> UpdateAsync(Artwork artwork)
    {
        _context.Artworks.Update(artwork);
        await _context.SaveChangesAsync();
        return artwork;
    }

    public async Task DeleteAsync(Guid id)
    {
        var artwork = await _context.Artworks.FindAsync(id);
        if (artwork != null)
        {
            _context.Artworks.Remove(artwork);
            await _context.SaveChangesAsync();
        }
    }
}

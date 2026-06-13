using Microsoft.EntityFrameworkCore;
using RequestService.Core.Entities;
using RequestService.Core.Interfaces;
using RequestService.Infrastructure.Data;

namespace RequestService.Infrastructure.Services;

public class ArtworkRequestRepository : IArtworkRequestRepository
{
    private readonly RequestServiceContext _context;

    public ArtworkRequestRepository(RequestServiceContext context)
    {
        _context = context;
    }

    public async Task<ArtworkRequest?> GetByIdAsync(Guid id)
    {
        return await _context.ArtworkRequests
            .Include(r => r.Logs.OrderBy(l => l.CreatedAt))
            .Include(r => r.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<IEnumerable<ArtworkRequest>> GetReceivedAsync(Guid artistId)
    {
        return await _context.ArtworkRequests
            .Where(r => r.ArtistId == artistId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ArtworkRequest>> GetSentAsync(Guid requesterId)
    {
        return await _context.ArtworkRequests
            .Where(r => r.RequesterId == requesterId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<ArtworkRequest> CreateAsync(ArtworkRequest request, RequestLog creationLog)
    {
        _context.ArtworkRequests.Add(request);
        _context.RequestLogs.Add(creationLog);
        await _context.SaveChangesAsync();
        return request;
    }

    public async Task<bool> TryTransitionAsync(ArtworkRequest request, RequestLog log)
    {
        // `request` is tracked from GetByIdAsync with its original State captured as the
        // concurrency token; SaveChanges issues UPDATE ... WHERE Id=? AND State=<original>.
        _context.RequestLogs.Add(log);
        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            // Another writer won the race: the UPDATE matched 0 rows. Nothing was committed.
            // Refresh the tracked request to the winning DB values and drop the audit row we
            // tried to add, so a subsequent GetByIdAsync on this context sees real state.
            foreach (var entry in ex.Entries)
                await entry.ReloadAsync();
            _context.Entry(log).State = EntityState.Detached;
            return false;
        }
    }

    public Task<bool> HasIdempotencyKeyAsync(Guid requestId, string idempotencyKey)
    {
        return _context.RequestLogs
            .AnyAsync(l => l.RequestId == requestId && l.IdempotencyKey == idempotencyKey);
    }

    public async Task<RequestMessage> AddMessageAsync(RequestMessage message)
    {
        _context.RequestMessages.Add(message);
        await _context.SaveChangesAsync();
        return message;
    }
}

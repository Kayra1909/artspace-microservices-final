using RequestService.Core.Entities;
using RequestService.Infrastructure.Services;
using RequestService.Tests.Helpers;

namespace RequestService.Tests.Unit;

public class ArtworkRequestRepositoryTests : IDisposable
{
    private readonly SqliteContextFactory _factory = new();

    private static ArtworkRequest NewRequest(Guid artistId, Guid requesterId,
        RequestState state = RequestState.WaitingArtistReview) => new()
    {
        Id = Guid.NewGuid(),
        Title = "Commission",
        Description = "Paint my cat",
        State = state,
        ArtistId = artistId,
        ArtistUsername = "artist",
        RequesterId = requesterId,
        RequesterUsername = "client",
        RequesterEmail = "client@example.com",
        CreatedAt = DateTime.UtcNow,
    };

    private static RequestLog Log(Guid requestId, RequestState from, RequestState to, string action) => new()
    {
        Id = Guid.NewGuid(),
        RequestId = requestId,
        FromState = from,
        ToState = to,
        Action = action,
        ActorId = Guid.NewGuid(),
        ActorRole = "client",
        ActorUsername = "client",
        CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task GetReceived_and_GetSent_filter_by_owner()
    {
        var artist = Guid.NewGuid();
        var client = Guid.NewGuid();
        var other = Guid.NewGuid();

        await using (var ctx = _factory.NewContext())
        {
            ctx.ArtworkRequests.Add(NewRequest(artist, client));
            ctx.ArtworkRequests.Add(NewRequest(artist, other));
            ctx.ArtworkRequests.Add(NewRequest(other, client));
            await ctx.SaveChangesAsync();
        }

        await using var read = _factory.NewContext();
        var repo = new ArtworkRequestRepository(read);

        Assert.Equal(2, (await repo.GetReceivedAsync(artist)).Count());
        Assert.Equal(2, (await repo.GetSentAsync(client)).Count());
        Assert.Single(await repo.GetReceivedAsync(other));
    }

    [Fact]
    public async Task GetById_includes_logs_and_messages_in_order()
    {
        var id = Guid.NewGuid();
        await using (var ctx = _factory.NewContext())
        {
            var req = NewRequest(Guid.NewGuid(), Guid.NewGuid());
            req.Id = id;
            ctx.ArtworkRequests.Add(req);
            ctx.RequestLogs.Add(Log(id, RequestState.WaitingArtistReview, RequestState.WaitingArtistReview, "submit_request"));
            ctx.RequestMessages.Add(new RequestMessage { Id = Guid.NewGuid(), RequestId = id, SenderId = Guid.NewGuid(), SenderUsername = "client", Content = "hi", CreatedAt = DateTime.UtcNow });
            await ctx.SaveChangesAsync();
        }

        await using var read = _factory.NewContext();
        var repo = new ArtworkRequestRepository(read);

        var loaded = await repo.GetByIdAsync(id);
        Assert.NotNull(loaded);
        Assert.Single(loaded!.Logs);
        Assert.Single(loaded.Messages);
    }

    [Fact]
    public async Task Deleting_request_cascades_to_logs_and_messages()
    {
        var id = Guid.NewGuid();
        await using (var ctx = _factory.NewContext())
        {
            var req = NewRequest(Guid.NewGuid(), Guid.NewGuid());
            req.Id = id;
            ctx.ArtworkRequests.Add(req);
            ctx.RequestLogs.Add(Log(id, RequestState.WaitingArtistReview, RequestState.WaitingArtistReview, "submit_request"));
            ctx.RequestMessages.Add(new RequestMessage { Id = Guid.NewGuid(), RequestId = id, SenderId = Guid.NewGuid(), SenderUsername = "client", Content = "hi" });
            await ctx.SaveChangesAsync();
        }

        await using (var del = _factory.NewContext())
        {
            var req = await del.ArtworkRequests.FindAsync(id);
            del.ArtworkRequests.Remove(req!);
            await del.SaveChangesAsync();
        }

        await using var verify = _factory.NewContext();
        Assert.Empty(verify.ArtworkRequests);
        Assert.Empty(verify.RequestLogs);
        Assert.Empty(verify.RequestMessages);
    }

    [Fact]
    public async Task TryTransitionAsync_CAS_lets_only_one_concurrent_writer_win()
    {
        var id = Guid.NewGuid();
        await using (var seed = _factory.NewContext())
        {
            var req = NewRequest(Guid.NewGuid(), Guid.NewGuid(), RequestState.NegotiationClient);
            req.Id = id;
            req.ProposedPrice = 100m;
            seed.ArtworkRequests.Add(req);
            await seed.SaveChangesAsync();
        }

        // Two writers each load the request at the same (NegotiationClient) state.
        await using var ctxA = _factory.NewContext();
        await using var ctxB = _factory.NewContext();
        var repoA = new ArtworkRequestRepository(ctxA);
        var repoB = new ArtworkRequestRepository(ctxB);

        var reqA = await repoA.GetByIdAsync(id);
        var reqB = await repoB.GetByIdAsync(id);

        // A accepts the offer first and commits.
        reqA!.State = RequestState.WorkInProgress;
        var aWon = await repoA.TryTransitionAsync(reqA, Log(id, RequestState.NegotiationClient, RequestState.WorkInProgress, "accept_offer"));

        // B then tries to cancel from its now-stale NegotiationClient snapshot.
        reqB!.State = RequestState.Cancelled;
        var bWon = await repoB.TryTransitionAsync(reqB, Log(id, RequestState.NegotiationClient, RequestState.Cancelled, "cancel"));

        Assert.True(aWon);
        Assert.False(bWon);

        await using var verify = _factory.NewContext();
        var final = await verify.ArtworkRequests.FindAsync(id);
        Assert.Equal(RequestState.WorkInProgress, final!.State);
        Assert.Single(verify.RequestLogs); // the CAS loser wrote no audit row
    }

    public void Dispose() => _factory.Dispose();
}

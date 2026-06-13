using RequestService.API.DTOs;
using RequestService.Tests.Helpers;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace RequestService.Tests.Integration;

public class RequestEndpointsTests : IClassFixture<RequestApiFactory>
{
    private readonly RequestApiFactory _factory;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public RequestEndpointsTests(RequestApiFactory factory) => _factory = factory;

    private HttpClient ClientFor(Guid userId, string username, string email = "u@example.com")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Create(userId, username, email));
        return client;
    }

    private static ActionRequestDto Key() => new() { IdempotencyKey = Guid.NewGuid().ToString() };

    private static async Task<RequestResponseDto> Body(HttpResponseMessage res)
    {
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<RequestResponseDto>(Json))!;
    }

    private async Task<(HttpClient artist, HttpClient client, Guid id)> NewRequest(decimal? budget = 150m)
    {
        var artistId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var artist = ClientFor(artistId, "artist", "artist@example.com");
        var client = ClientFor(clientId, "client", "client@example.com");

        var createRes = await client.PostAsJsonAsync("/api/Request", new CreateRequestDto
        {
            Title = "Paint my cat",
            Description = "A portrait of Mittens",
            Budget = budget,
            ArtistId = artistId,
            ArtistUsername = "artist",
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = (await createRes.Content.ReadFromJsonAsync<RequestResponseDto>(Json))!;
        Assert.Equal("WaitingArtistReview", created.State);
        return (artist, client, created.Id);
    }

    [Fact]
    public async Task Creating_a_request_requires_authentication()
    {
        var anon = _factory.CreateClient();
        var res = await anon.PostAsJsonAsync("/api/Request", new CreateRequestDto { Title = "X", ArtistId = Guid.NewGuid() });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Full_lifecycle_traverses_negotiation_and_revision_loops_to_completion()
    {
        var (artist, client, id) = await NewRequest();

        // Negotiation loop (artist offer ↔ client counter), traversed twice.
        var s = await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" }));
        Assert.Equal("NegotiationClient", s.State);
        Assert.Equal(200m, s.ProposedPrice);
        Assert.Null(s.AgreedPrice); // still only proposed

        s = await Body(await client.PostAsJsonAsync($"/api/Request/{id}/counter-offer", new ActionRequestDto { Budget = 175m, Deadline = DateTime.UtcNow.AddDays(20) }));
        Assert.Equal("NegotiationArtist", s.State);

        s = await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 190m, Eta = "18 days" }));
        Assert.Equal("NegotiationClient", s.State);

        // Client accepts → terms lock, WorkInProgress / accepted.
        s = await Body(await client.PostAsJsonAsync($"/api/Request/{id}/accept-offer", Key()));
        Assert.Equal("WorkInProgress", s.State);
        Assert.Equal("Accepted", s.ProgressMode);
        Assert.Equal(190m, s.AgreedPrice);
        Assert.Equal("18 days", s.AgreedDeliveryTime);

        // Artist submits → client review.
        s = await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/submit-artwork", new ActionRequestDto { Note = "First draft attached." }));
        Assert.Equal("WaitingReviewClient", s.State);
        Assert.Equal("First draft attached.", s.Deliverable);

        // Revision loop, traversed once.
        s = await Body(await client.PostAsJsonAsync($"/api/Request/{id}/request-revisions", new ActionRequestDto { Note = "Make it brighter." }));
        Assert.Equal("WorkInProgress", s.State);
        Assert.Equal("Rejected", s.ProgressMode); // "revisions requested"
        Assert.Equal(190m, s.AgreedPrice);         // locked terms unchanged through revisions

        s = await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/submit-artwork", new ActionRequestDto { Note = "Brighter version." }));
        Assert.Equal("WaitingReviewClient", s.State);

        s = await Body(await client.PostAsJsonAsync($"/api/Request/{id}/accept-artwork",
            new ActionRequestDto { IdempotencyKey = Guid.NewGuid().ToString(), Rating = 5, Review = "Love it!" }));
        Assert.Equal("Completed", s.State);
        Assert.True(s.IsLocked);

        // Audit history is append-only, ordered, and records from→to + actor role.
        var detail = await artist.GetFromJsonAsync<RequestResponseDto>($"/api/Request/{id}", Json);
        var actions = detail!.Logs.Select(l => l.Action).ToList();
        Assert.Equal(new[]
        {
            "submit_request", "set_offer", "counter_offer", "set_offer",
            "accept_offer", "submit_artwork", "request_revisions", "submit_artwork", "accept_artwork",
        }, actions);
        var accept = detail.Logs.Single(l => l.Action == "accept_offer");
        Assert.Equal("NegotiationClient", accept.FromState);
        Assert.Equal("WorkInProgress", accept.ToState);
        Assert.Equal("client", accept.ActorRole);
    }

    [Fact]
    public async Task Submit_artwork_link_and_revision_note_appear_in_the_message_thread()
    {
        var (artist, client, id) = await NewRequest();
        await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" }));
        await Body(await client.PostAsJsonAsync($"/api/Request/{id}/accept-offer", Key()));
        await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/submit-artwork", new ActionRequestDto { Note = "https://img.example/cat.png" }));
        await Body(await client.PostAsJsonAsync($"/api/Request/{id}/request-revisions", new ActionRequestDto { Note = "Make it brighter." }));

        var detail = await client.GetFromJsonAsync<RequestResponseDto>($"/api/Request/{id}", Json);
        Assert.Contains(detail!.Messages, m => m.Content == "https://img.example/cat.png" && m.SenderUsername == "artist");
        Assert.Contains(detail.Messages, m => m.Content == "Make it brighter." && m.SenderUsername == "client");
    }

    [Fact]
    public async Task Action_outside_delta_is_rejected_with_422()
    {
        var (artist, _, id) = await NewRequest();
        await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" }));

        // submit_artwork from NegotiationClient is not in δ.
        var res = await artist.PostAsJsonAsync($"/api/Request/{id}/submit-artwork", new ActionRequestDto { Note = "x" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, res.StatusCode);
    }

    [Fact]
    public async Task Double_accept_offer_with_same_key_is_a_single_logged_no_op()
    {
        var (artist, client, id) = await NewRequest();
        await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" }));

        var key = new ActionRequestDto { IdempotencyKey = "accept-once" };
        var first = await Body(await client.PostAsJsonAsync($"/api/Request/{id}/accept-offer", key));
        var second = await Body(await client.PostAsJsonAsync($"/api/Request/{id}/accept-offer", key));

        Assert.Equal("WorkInProgress", first.State);
        Assert.Equal("WorkInProgress", second.State);
        Assert.Equal(first.AgreedPrice, second.AgreedPrice); // terms unchanged

        var detail = await client.GetFromJsonAsync<RequestResponseDto>($"/api/Request/{id}", Json);
        Assert.Single(detail!.Logs, l => l.Action == "accept_offer"); // exactly one history row
    }

    [Fact]
    public async Task Mutations_after_a_terminal_state_are_locked()
    {
        var (artist, client, id) = await NewRequest();
        await Body(await client.PostAsJsonAsync($"/api/Request/{id}/cancel", Key()));

        var afterCancel = await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" });
        Assert.Equal(HttpStatusCode.Conflict, afterCancel.StatusCode);

        // Reads stay open.
        var read = await artist.GetAsync($"/api/Request/{id}");
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
    }

    [Fact]
    public async Task Cancel_is_allowed_from_a_non_terminal_state_by_either_party()
    {
        // Cancelled by the artist mid-negotiation.
        var (artist, client, id) = await NewRequest();
        await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" }));
        var byArtist = await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/cancel", Key()));
        Assert.Equal("Cancelled", byArtist.State);

        // And cancellable by the client from the very first state.
        var (_, client2, id2) = await NewRequest();
        var byClient = await Body(await client2.PostAsJsonAsync($"/api/Request/{id2}/cancel", Key()));
        Assert.Equal("Cancelled", byClient.State);
    }

    [Fact]
    public async Task Actions_are_bound_to_their_actor_role()
    {
        var (artist, client, id) = await NewRequest();

        // Client cannot make an artist's offer.
        var clientOffer = await client.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" });
        Assert.Equal(HttpStatusCode.Forbidden, clientOffer.StatusCode);

        await Body(await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 200m, Eta = "2 weeks" }));

        // Artist cannot accept on the client's behalf.
        var artistAccept = await artist.PostAsJsonAsync($"/api/Request/{id}/accept-offer", Key());
        Assert.Equal(HttpStatusCode.Forbidden, artistAccept.StatusCode);

        // A non-participant can neither read nor act.
        var stranger = ClientFor(Guid.NewGuid(), "nosy");
        Assert.Equal(HttpStatusCode.Forbidden, (await stranger.GetAsync($"/api/Request/{id}")).StatusCode);
    }
}

using RequestService.API.DTOs;
using RequestService.Tests.Helpers;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace RequestService.Tests.Integration;

public class ReferenceEndpointsTests : IClassFixture<RequestApiFactory>
{
    private readonly RequestApiFactory _factory;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public ReferenceEndpointsTests(RequestApiFactory factory) => _factory = factory;

    private HttpClient ClientFor(Guid userId, string username)
    {
        var c = _factory.CreateClient();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", TestJwt.Create(userId, username));
        return c;
    }

    private static ActionRequestDto Key() => new() { IdempotencyKey = Guid.NewGuid().ToString() };

    // Drives a fresh request all the way to Completed and returns the reference it created.
    private async Task<(Guid artistId, Guid clientId, ReferenceArtworkDto reference)> CompleteCommission(int rating = 5, string review = "Great work!")
    {
        var artistId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var artist = ClientFor(artistId, "artist");
        var client = ClientFor(clientId, "client");

        var create = await client.PostAsJsonAsync("/api/Request", new CreateRequestDto { Title = "Mural", ArtistId = artistId, ArtistUsername = "artist" });
        var id = (await create.Content.ReadFromJsonAsync<RequestResponseDto>(Json))!.Id;

        await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 500m, Eta = "1 month" });
        await client.PostAsJsonAsync($"/api/Request/{id}/accept-offer", Key());
        await artist.PostAsJsonAsync($"/api/Request/{id}/submit-artwork", new ActionRequestDto { Note = "https://img.example/mural.png" });
        await client.PostAsJsonAsync($"/api/Request/{id}/accept-artwork", new ActionRequestDto { IdempotencyKey = Guid.NewGuid().ToString(), Rating = rating, Review = review });

        var anon = _factory.CreateClient();
        var all = await anon.GetFromJsonAsync<List<ReferenceArtworkDto>>("/api/Reference", Json);
        var reference = all!.Single(r => r.ClientId == clientId);
        return (artistId, clientId, reference);
    }

    [Fact]
    public async Task Accept_artwork_requires_a_review_and_rating()
    {
        var artistId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var artist = ClientFor(artistId, "artist");
        var client = ClientFor(clientId, "client");

        var create = await client.PostAsJsonAsync("/api/Request", new CreateRequestDto { Title = "Sketch", ArtistId = artistId, ArtistUsername = "artist" });
        var id = (await create.Content.ReadFromJsonAsync<RequestResponseDto>(Json))!.Id;
        await artist.PostAsJsonAsync($"/api/Request/{id}/offer", new ActionRequestDto { Price = 100m, Eta = "3 days" });
        await client.PostAsJsonAsync($"/api/Request/{id}/accept-offer", Key());
        await artist.PostAsJsonAsync($"/api/Request/{id}/submit-artwork", new ActionRequestDto { Note = "https://img.example/s.png" });

        var bad = await client.PostAsJsonAsync($"/api/Request/{id}/accept-artwork", Key()); // no review/rating
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task Completing_a_commission_publishes_a_public_reference()
    {
        var (_, _, reference) = await CompleteCommission(rating: 4, review: "Beautiful piece.");

        Assert.Equal("Mural", reference.Title);
        Assert.Equal("https://img.example/mural.png", reference.ImageUrl);
        Assert.Equal(500m, reference.Budget);
        Assert.Equal(4, reference.Rating);
        Assert.Equal("Beautiful piece.", reference.Review);
        Assert.True(reference.IsVisible);

        // Anonymous detail is readable.
        var anon = _factory.CreateClient();
        var detail = await anon.GetAsync($"/api/Reference/{reference.Id}");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
    }

    [Fact]
    public async Task Hiding_by_either_party_removes_it_from_the_public_gallery()
    {
        var (artistId, clientId, reference) = await CompleteCommission();
        var artist = ClientFor(artistId, "artist");
        var anon = _factory.CreateClient();

        await artist.PostAsync($"/api/Reference/{reference.Id}/hide", null);

        var visible = await anon.GetFromJsonAsync<List<ReferenceArtworkDto>>("/api/Reference", Json);
        Assert.DoesNotContain(visible!, r => r.Id == reference.Id);

        // Anonymous detail of a hidden item is hidden (404); the participant can still see it.
        Assert.Equal(HttpStatusCode.NotFound, (await anon.GetAsync($"/api/Reference/{reference.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await artist.GetAsync($"/api/Reference/{reference.Id}")).StatusCode);

        // Un-hiding restores it.
        await artist.PostAsync($"/api/Reference/{reference.Id}/unhide", null);
        var again = await anon.GetFromJsonAsync<List<ReferenceArtworkDto>>("/api/Reference", Json);
        Assert.Contains(again!, r => r.Id == reference.Id);
    }

    [Fact]
    public async Task Only_the_client_owner_can_edit_the_review()
    {
        var (artistId, clientId, reference) = await CompleteCommission();
        var artist = ClientFor(artistId, "artist");
        var client = ClientFor(clientId, "client");

        var artistTry = await artist.PutAsJsonAsync($"/api/Reference/{reference.Id}/review", new UpdateReviewDto { Rating = 1, Review = "nope" });
        Assert.Equal(HttpStatusCode.Forbidden, artistTry.StatusCode);

        var clientEdit = await client.PutAsJsonAsync($"/api/Reference/{reference.Id}/review", new UpdateReviewDto { Rating = 3, Review = "Updated thoughts." });
        Assert.Equal(HttpStatusCode.OK, clientEdit.StatusCode);
        var updated = await clientEdit.Content.ReadFromJsonAsync<ReferenceArtworkDto>(Json);
        Assert.Equal(3, updated!.Rating);
        Assert.Equal("Updated thoughts.", updated.Review);
    }

    [Fact]
    public async Task A_stranger_cannot_hide_someone_elses_reference()
    {
        var (_, _, reference) = await CompleteCommission();
        var stranger = ClientFor(Guid.NewGuid(), "stranger");

        var res = await stranger.PostAsync($"/api/Reference/{reference.Id}/hide", null);
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }
}

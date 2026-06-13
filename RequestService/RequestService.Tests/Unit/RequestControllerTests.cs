using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using RequestService.API.Controllers;
using RequestService.API.DTOs;
using RequestService.Core.Entities;
using RequestService.Core.Interfaces;
using RequestService.Infrastructure.Services;
using System.Security.Claims;

namespace RequestService.Tests.Unit;

public class RequestControllerTests
{
    private readonly Mock<IArtworkRequestRepository> _repo = new();
    private readonly Mock<IReferenceArtworkRepository> _references = new();
    private readonly Mock<IRabbitMQPublisher> _publisher = new();

    private RequestController BuildController(Guid userId, string username = "tester", string email = "t@example.com")
    {
        var controller = new RequestController(_repo.Object, _references.Object, _publisher.Object);
        var claims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Email, email),
        }, "Test"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claims }
        };
        return controller;
    }

    private static ArtworkRequest Request(Guid artistId, Guid requesterId, RequestState state) => new()
    {
        Id = Guid.NewGuid(),
        Title = "Commission",
        State = state,
        ArtistId = artistId,
        ArtistUsername = "artist",
        RequesterId = requesterId,
        RequesterUsername = "client",
    };

    // ---- create -------------------------------------------------------------------

    [Fact]
    public async Task Create_rejects_request_to_self()
    {
        var me = Guid.NewGuid();
        var controller = BuildController(me);

        var result = await controller.Create(new CreateRequestDto { Title = "X", ArtistId = me, ArtistUsername = "me" });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        _repo.Verify(r => r.CreateAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()), Times.Never);
    }

    [Fact]
    public async Task Create_starts_in_WaitingArtistReview_and_notifies_artist()
    {
        var me = Guid.NewGuid();
        var artist = Guid.NewGuid();
        var controller = BuildController(me, "client", "client@example.com");

        ArtworkRequest? saved = null;
        _repo.Setup(r => r.CreateAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()))
            .Callback<ArtworkRequest, RequestLog>((r, _) => saved = r)
            .ReturnsAsync((ArtworkRequest r, RequestLog _) => r);
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync(() => saved);

        var result = await controller.Create(new CreateRequestDto
        {
            Title = "Paint my cat",
            Budget = 150m,
            ArtistId = artist,
            ArtistUsername = "artist",
        });

        Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.NotNull(saved);
        Assert.Equal(RequestState.WaitingArtistReview, saved!.State);
        Assert.Equal(me, saved.RequesterId);
        Assert.Equal(150m, saved.ProposedPrice); // opening ask seeded as first proposed terms
        _publisher.Verify(p => p.PublishNotification(artist, It.Is<string>(s => s.Contains("Paint my cat")),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Once);
    }

    // ---- authorization / δ enforcement --------------------------------------------

    [Fact]
    public async Task SetOffer_is_forbidden_for_the_client()
    {
        var artist = Guid.NewGuid();
        var client = Guid.NewGuid();
        var req = Request(artist, client, RequestState.WaitingArtistReview);
        _repo.Setup(r => r.GetByIdAsync(req.Id)).ReturnsAsync(req);

        var controller = BuildController(client, "client"); // client trying an artist action
        var result = await controller.SetOffer(req.Id, new ActionRequestDto { Price = 200m, Eta = "2 weeks" });

        Assert.IsType<ForbidResult>(result.Result);
        _repo.Verify(r => r.TryTransitionAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()), Times.Never);
    }

    [Fact]
    public async Task Illegal_action_for_state_returns_422()
    {
        var artist = Guid.NewGuid();
        var client = Guid.NewGuid();
        var req = Request(artist, client, RequestState.NegotiationClient);
        _repo.Setup(r => r.GetByIdAsync(req.Id)).ReturnsAsync(req);

        // submit_artwork is not in δ from NegotiationClient.
        var controller = BuildController(artist, "artist");
        var result = await controller.SubmitArtwork(req.Id, new ActionRequestDto { Note = "done" });

        Assert.IsType<UnprocessableEntityObjectResult>(result.Result);
        _repo.Verify(r => r.TryTransitionAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()), Times.Never);
    }

    [Theory]
    [InlineData(RequestState.Completed)]
    [InlineData(RequestState.Cancelled)]
    public async Task Mutating_a_terminal_request_returns_409_locked(RequestState terminal)
    {
        var artist = Guid.NewGuid();
        var client = Guid.NewGuid();
        var req = Request(artist, client, terminal);
        _repo.Setup(r => r.GetByIdAsync(req.Id)).ReturnsAsync(req);

        var controller = BuildController(client, "client");
        var result = await controller.Cancel(req.Id, new ActionRequestDto());

        Assert.IsType<ConflictObjectResult>(result.Result);
        _repo.Verify(r => r.TryTransitionAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()), Times.Never);
    }

    // ---- idempotency & CAS --------------------------------------------------------

    [Fact]
    public async Task Replaying_an_idempotency_key_is_a_no_op_success()
    {
        var artist = Guid.NewGuid();
        var client = Guid.NewGuid();
        var req = Request(artist, client, RequestState.NegotiationClient);
        req.ProposedPrice = 200m;
        _repo.Setup(r => r.GetByIdAsync(req.Id)).ReturnsAsync(req);
        _repo.Setup(r => r.HasIdempotencyKeyAsync(req.Id, "key-1")).ReturnsAsync(true);

        var controller = BuildController(client, "client");
        var result = await controller.AcceptOffer(req.Id, new ActionRequestDto { IdempotencyKey = "key-1" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RequestResponseDto>(ok.Value);
        Assert.Equal(nameof(RequestState.NegotiationClient), dto.State); // unchanged
        _repo.Verify(r => r.TryTransitionAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()), Times.Never);
    }

    [Fact]
    public async Task AcceptOffer_locks_terms_and_moves_to_WorkInProgress()
    {
        var artist = Guid.NewGuid();
        var client = Guid.NewGuid();
        var req = Request(artist, client, RequestState.NegotiationClient);
        req.ProposedPrice = 200m;
        req.ProposedDeliveryTime = "2 weeks";
        _repo.Setup(r => r.GetByIdAsync(req.Id)).ReturnsAsync(req);
        _repo.Setup(r => r.HasIdempotencyKeyAsync(It.IsAny<Guid>(), It.IsAny<string>())).ReturnsAsync(false);

        RequestLog? written = null;
        _repo.Setup(r => r.TryTransitionAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()))
            .Callback<ArtworkRequest, RequestLog>((_, l) => written = l)
            .ReturnsAsync(true);

        var controller = BuildController(client, "client");
        var result = await controller.AcceptOffer(req.Id, new ActionRequestDto { IdempotencyKey = "k" });

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(RequestState.WorkInProgress, req.State);
        Assert.Equal(ProgressMode.Accepted, req.ProgressMode);
        Assert.Equal(200m, req.AgreedPrice);                 // proposed terms locked
        Assert.Equal("2 weeks", req.AgreedDeliveryTime);
        Assert.Equal(RequestState.NegotiationClient, written!.FromState);
        Assert.Equal(RequestState.WorkInProgress, written.ToState);
        _publisher.Verify(p => p.PublishNotification(artist, It.IsAny<string>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Once); // the other party
    }

    [Fact]
    public async Task CAS_loser_returns_current_state_without_error()
    {
        var artist = Guid.NewGuid();
        var client = Guid.NewGuid();
        var stale = Request(artist, client, RequestState.NegotiationClient);
        stale.ProposedPrice = 200m;
        var winner = Request(artist, client, RequestState.Cancelled);
        winner.Id = stale.Id;

        _repo.SetupSequence(r => r.GetByIdAsync(stale.Id))
            .ReturnsAsync(stale)    // initial load
            .ReturnsAsync(winner);  // reload after CAS failure
        _repo.Setup(r => r.HasIdempotencyKeyAsync(It.IsAny<Guid>(), It.IsAny<string>())).ReturnsAsync(false);
        _repo.Setup(r => r.TryTransitionAsync(It.IsAny<ArtworkRequest>(), It.IsAny<RequestLog>()))
            .ReturnsAsync(false); // another writer won

        var controller = BuildController(client, "client");
        var result = await controller.AcceptOffer(stale.Id, new ActionRequestDto { IdempotencyKey = "k" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<RequestResponseDto>(ok.Value);
        Assert.Equal(nameof(RequestState.Cancelled), dto.State); // sees the winning state
        _publisher.Verify(p => p.PublishNotification(It.IsAny<Guid>(), It.IsAny<string>(),
            It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task GetById_is_forbidden_for_non_participant()
    {
        var request = Request(Guid.NewGuid(), Guid.NewGuid(), RequestState.WaitingArtistReview);
        _repo.Setup(r => r.GetByIdAsync(request.Id)).ReturnsAsync(request);

        var controller = BuildController(Guid.NewGuid());
        var result = await controller.GetById(request.Id);

        Assert.IsType<ForbidResult>(result.Result);
    }
}

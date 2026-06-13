using RequestService.Core.Entities;
using RequestService.Core.StateMachine;

namespace RequestService.Tests.Unit;

// Pure δ-table coverage — no DB, no controller.
public class RequestTransitionsTests
{
    [Theory]
    [InlineData(RequestState.WaitingArtistReview, RequestAction.SetOffer, RequestState.NegotiationClient, ActorRole.Artist)]
    [InlineData(RequestState.NegotiationClient, RequestAction.AcceptOffer, RequestState.WorkInProgress, ActorRole.Client)]
    [InlineData(RequestState.NegotiationClient, RequestAction.CounterOffer, RequestState.NegotiationArtist, ActorRole.Client)]
    [InlineData(RequestState.NegotiationArtist, RequestAction.SetOffer, RequestState.NegotiationClient, ActorRole.Artist)]
    [InlineData(RequestState.NegotiationArtist, RequestAction.AcceptOffer, RequestState.WorkInProgress, ActorRole.Artist)]
    [InlineData(RequestState.WorkInProgress, RequestAction.SubmitArtwork, RequestState.WaitingReviewClient, ActorRole.Artist)]
    [InlineData(RequestState.WaitingReviewClient, RequestAction.AcceptArtwork, RequestState.Completed, ActorRole.Client)]
    [InlineData(RequestState.WaitingReviewClient, RequestAction.RequestRevisions, RequestState.WorkInProgress, ActorRole.Client)]
    public void Delta_defines_each_legal_edge_with_its_actor(RequestState from, RequestAction action, RequestState to, ActorRole role)
    {
        var def = RequestTransitions.Resolve(from, action);
        Assert.NotNull(def);
        Assert.Equal(to, def!.To);
        Assert.True(def.Allows(role));
        Assert.False(def.Allows(role == ActorRole.Artist ? ActorRole.Client : ActorRole.Artist));
    }

    [Theory]
    [InlineData(RequestState.NegotiationClient, RequestAction.SubmitArtwork)] // wrong phase
    [InlineData(RequestState.WaitingArtistReview, RequestAction.AcceptOffer)] // no offer yet
    [InlineData(RequestState.WorkInProgress, RequestAction.AcceptOffer)]      // already accepted
    public void Resolve_returns_null_for_actions_outside_delta(RequestState from, RequestAction action)
    {
        Assert.Null(RequestTransitions.Resolve(from, action));
    }

    [Theory]
    [InlineData(RequestState.WaitingArtistReview)]
    [InlineData(RequestState.NegotiationClient)]
    [InlineData(RequestState.NegotiationArtist)]
    [InlineData(RequestState.WorkInProgress)]
    [InlineData(RequestState.WaitingReviewClient)]
    public void Cancel_is_legal_from_every_non_terminal_state_for_both_parties(RequestState from)
    {
        var def = RequestTransitions.Resolve(from, RequestAction.Cancel);
        Assert.NotNull(def);
        Assert.Equal(RequestState.Cancelled, def!.To);
        Assert.True(def.Allows(ActorRole.Client));
        Assert.True(def.Allows(ActorRole.Artist));
    }

    [Theory]
    [InlineData(RequestState.Completed)]
    [InlineData(RequestState.Cancelled)]
    public void Terminal_states_admit_no_transitions(RequestState terminal)
    {
        Assert.True(RequestTransitions.IsTerminal(terminal));
        foreach (RequestAction action in Enum.GetValues<RequestAction>())
            Assert.Null(RequestTransitions.Resolve(terminal, action));
    }
}

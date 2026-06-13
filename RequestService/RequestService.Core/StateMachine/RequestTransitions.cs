using RequestService.Core.Entities;

namespace RequestService.Core.StateMachine;

// The actions (Σ) that can be applied to a request.
public enum RequestAction
{
    SetOffer,
    AcceptOffer,
    CounterOffer,
    SubmitArtwork,
    AcceptArtwork,
    RequestRevisions,
    Cancel
}

// Which party an action belongs to. The actor's role is derived from the request
// (artist vs requester); a non-participant has no role and is rejected outright.
public enum ActorRole
{
    Client,
    Artist
}

// A single δ edge: the target state and the role(s) allowed to take it.
public sealed record TransitionDef(RequestState To, params ActorRole[] AllowedRoles)
{
    public bool Allows(ActorRole role) => Array.IndexOf(AllowedRoles, role) >= 0;
}

// The transition function δ — the single source of truth for what is legal. Nothing
// mutates a request except through Resolve(); anything not present here is rejected with
// no implicit fallthrough. Pure: no DB, no I/O.
public static class RequestTransitions
{
    // δ[(from, action)] → edge. Cancel is intentionally absent here and handled as a
    // blanket rule (any non-terminal state, either party) in Resolve().
    private static readonly Dictionary<(RequestState, RequestAction), TransitionDef> Delta = new()
    {
        [(RequestState.WaitingArtistReview, RequestAction.SetOffer)] =
            new(RequestState.NegotiationClient, ActorRole.Artist),

        [(RequestState.NegotiationClient, RequestAction.AcceptOffer)] =
            new(RequestState.WorkInProgress, ActorRole.Client),
        [(RequestState.NegotiationClient, RequestAction.CounterOffer)] =
            new(RequestState.NegotiationArtist, ActorRole.Client),

        [(RequestState.NegotiationArtist, RequestAction.SetOffer)] =
            new(RequestState.NegotiationClient, ActorRole.Artist),

        [(RequestState.WorkInProgress, RequestAction.SubmitArtwork)] =
            new(RequestState.WaitingReviewClient, ActorRole.Artist),

        [(RequestState.WaitingReviewClient, RequestAction.AcceptArtwork)] =
            new(RequestState.Completed, ActorRole.Client),
        [(RequestState.WaitingReviewClient, RequestAction.RequestRevisions)] =
            new(RequestState.WorkInProgress, ActorRole.Client),
    };

    public static bool IsTerminal(RequestState state) =>
        state is RequestState.Completed or RequestState.Cancelled;

    // Looks up δ for (state, action). Cancel resolves to Cancelled from any non-terminal
    // state for either party. Returns null when the action is not legal in this state.
    public static TransitionDef? Resolve(RequestState from, RequestAction action)
    {
        if (action == RequestAction.Cancel)
            return IsTerminal(from)
                ? null
                : new TransitionDef(RequestState.Cancelled, ActorRole.Client, ActorRole.Artist);

        return Delta.TryGetValue((from, action), out var def) ? def : null;
    }
}

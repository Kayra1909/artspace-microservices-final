namespace RequestService.Core.Entities;

// The states (Q) of the request lifecycle state machine. COMPLETED and CANCELLED are
// terminal: once the head lands on one, no further transition is legal and the record
// is locked. See RequestService.Core.StateMachine.RequestTransitions for δ.
public enum RequestState
{
    WaitingArtistReview,
    NegotiationClient,
    NegotiationArtist,
    WorkInProgress,
    WaitingReviewClient,
    Completed,
    Cancelled
}

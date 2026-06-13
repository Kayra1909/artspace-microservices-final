namespace RequestService.Core.Entities;

// Annotates *why* a request is in WorkInProgress; it never changes which actions are legal.
// - Accepted: WIP was entered by accept_offer (3.1).
// - Rejected: WIP was re-entered by request_revisions (5.2) — surfaced as "revisions requested".
public enum ProgressMode
{
    None,
    Accepted,
    Rejected
}

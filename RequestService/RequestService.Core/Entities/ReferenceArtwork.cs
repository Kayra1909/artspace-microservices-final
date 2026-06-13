namespace RequestService.Core.Entities;

// A completed commission promoted to the public showcase ("Reference Artwork"). Created
// when the client accepts the delivered artwork (δ #5.1). Carries the final image, the
// agreed deal terms, and the client's review + rating.
//
// Visibility is the AND of neither party hiding it:
//   IsVisible = NOT(HiddenByClient OR HiddenByArtist)
// Either the artist or the client can independently hide it; it reappears only when the
// party who hid it un-hides.
public class ReferenceArtwork
{
    public Guid Id { get; set; }

    // The source request — one reference per completed request (unique).
    public Guid RequestId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // The delivered artwork image (the latest deliverable on the request).
    public string ImageUrl { get; set; } = string.Empty;

    // Agreed (locked) deal terms, denormalized from the request.
    public decimal? Budget { get; set; }
    public string? DeliveryTime { get; set; }
    public DateTime CompletedAt { get; set; }

    // The client's review of the finished piece. Only the client (owner) may set these.
    public int Rating { get; set; }
    public string Review { get; set; } = string.Empty;

    public Guid ArtistId { get; set; }
    public string ArtistUsername { get; set; } = string.Empty;
    public Guid ClientId { get; set; }
    public string ClientUsername { get; set; } = string.Empty;

    public bool HiddenByClient { get; set; }
    public bool HiddenByArtist { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsVisible => !(HiddenByClient || HiddenByArtist);
}

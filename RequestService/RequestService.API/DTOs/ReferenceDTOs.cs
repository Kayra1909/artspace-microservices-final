namespace RequestService.API.DTOs;

// A completed-commission showcase item. Visible to everyone unless hidden by either party.
public class ReferenceArtworkDto
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public decimal? Budget { get; set; }
    public string? DeliveryTime { get; set; }
    public DateTime CompletedAt { get; set; }
    public int Rating { get; set; }
    public string Review { get; set; } = string.Empty;

    public Guid ArtistId { get; set; }
    public string ArtistUsername { get; set; } = string.Empty;
    public Guid ClientId { get; set; }
    public string ClientUsername { get; set; } = string.Empty;

    public bool HiddenByClient { get; set; }
    public bool HiddenByArtist { get; set; }
    public bool IsVisible { get; set; }
}

// The client (owner) editing their review on the showcase item.
public class UpdateReviewDto
{
    public int Rating { get; set; }
    public string Review { get; set; } = string.Empty;
}

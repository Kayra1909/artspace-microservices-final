using Microsoft.EntityFrameworkCore;
using RequestService.Core.Entities;

namespace RequestService.Infrastructure.Data;

public class RequestServiceContext : DbContext
{
    public RequestServiceContext(DbContextOptions<RequestServiceContext> options) : base(options)
    {
    }

    public DbSet<ArtworkRequest> ArtworkRequests { get; set; }
    public DbSet<RequestLog> RequestLogs { get; set; }
    public DbSet<RequestMessage> RequestMessages { get; set; }
    public DbSet<ReferenceArtwork> ReferenceArtworks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ArtworkRequest>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Title).IsRequired();
            entity.Property(r => r.RequesterId).IsRequired();
            entity.Property(r => r.ArtistId).IsRequired();

            // Persist the enums as their string names so the DB stays readable.
            entity.Property(r => r.ProgressMode).HasConversion<string>();

            // State is the CAS guard: marking it a concurrency token makes every UPDATE
            // include `AND State = <original>` and fail (0 rows) if another writer moved on.
            entity.Property(r => r.State).HasConversion<string>().IsConcurrencyToken();

            // Listing queries filter by the two owner columns.
            entity.HasIndex(r => r.ArtistId);
            entity.HasIndex(r => r.RequesterId);

            entity.HasMany(r => r.Logs)
                .WithOne(l => l.Request)
                .HasForeignKey(l => l.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(r => r.Messages)
                .WithOne(m => m.Request)
                .HasForeignKey(m => m.RequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RequestLog>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Action).IsRequired();
            entity.Property(l => l.FromState).HasConversion<string>();
            entity.Property(l => l.ToState).HasConversion<string>();

            // History de-dupe: a (request, idempotency key) pair is recorded at most once.
            // NULL keys (e.g. the creation row) are distinct, so they are exempt.
            entity.HasIndex(l => new { l.RequestId, l.IdempotencyKey }).IsUnique();
        });

        modelBuilder.Entity<RequestMessage>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Content).IsRequired();
        });

        modelBuilder.Entity<ReferenceArtwork>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Title).IsRequired();
            entity.Ignore(r => r.IsVisible); // computed from the two hidden flags
            // One reference per completed request.
            entity.HasIndex(r => r.RequestId).IsUnique();
        });
    }
}

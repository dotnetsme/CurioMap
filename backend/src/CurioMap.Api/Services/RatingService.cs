namespace CurioMap.Api.Services;

using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Persisted read/review rating operations.
/// Ratings are 1–5 stars, one per (user, book). Upserts, never duplicates.
/// </summary>
public interface IRatingService
{
    Task RateAsync(Guid userId, Guid bookId, int value, CancellationToken ct = default);
    Task<RatingStats?> GetStatsAsync(Guid bookId, CancellationToken ct = default);
}

public class RatingService(AppDbContext db) : IRatingService
{
    public async Task RateAsync(Guid userId, Guid bookId, int value, CancellationToken ct = default)
    {
        if (value < 1 || value > 5) throw new ArgumentOutOfRangeException(nameof(value));

        var existing = await db.Ratings
            .FirstOrDefaultAsync(r => r.UserId == userId && r.BookId == bookId, ct);

        if (existing is null)
        {
            db.Ratings.Add(new Rating { UserId = userId, BookId = bookId, Value = value });
        }
        else
        {
            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task<RatingStats?> GetStatsAsync(Guid bookId, CancellationToken ct = default)
    {
        var query = db.Ratings.Where(r => r.BookId == bookId);
        var count = await query.CountAsync(ct);
        if (count == 0) return null;

        var avg = await query.AverageAsync(r => r.Value, ct);
        return new RatingStats { Average = Math.Round(avg, 2), Count = count };
    }
}

public class RatingStats
{
    public double Average { get; set; }
    public int Count { get; set; }
}


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
        var stats = await db.Ratings
            .Where(r => r.BookId == bookId)
            .Select(r => new RatingStats
            {
                Average = r.Value, Count = 1
            })
            .DefaultIfEmpty()
            .AggregateAsync(
                (acc, next) => new RatingStats
                {
                    Average = (acc!.Average * acc.Count + next!.Average * next.Count) / (acc.Count + next.Count),
                    Count = acc.Count + next.Count
                },
                ct);

        // Fallback in case of empty aggregate (no ratings)
        if (stats is null)
        {
            return null;
        }

        return new RatingStats
        {
            Average = stats.Average == 0 ? 0 : Math.Round(stats.Average, 2),
            Count = stats.Count
        };
    }
}

public class RatingStats
{
    public double Average { get; set; }
    public int Count { get; set; }
}

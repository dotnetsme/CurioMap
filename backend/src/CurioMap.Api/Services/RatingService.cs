namespace CurioMap.Api.Services;

using CurioMap.Api.Common;
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
        // Defense in depth: the DTO carries [Range(1, 5)], but any other caller
        // must surface a 400, not an unhandled 500 from the DB CHECK constraint.
        if (value is < 1 or > 5) throw new AppException(400, "Rating must be between 1 and 5.");
        if (!await db.Books.AnyAsync(b => b.Id == bookId, ct))
        {
            throw new AppException(404, "Book not found.");
        }
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

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // FK race: book deleted between the existence check and the insert.
            throw new AppException(404, "Book not found.");
        }
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


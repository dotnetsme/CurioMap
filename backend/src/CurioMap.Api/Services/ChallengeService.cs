namespace CurioMap.Api.Services;

using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Pure-math pacing helpers for yearly reading challenges.
/// Extracted so the heuristic is unit-testable without an EF fixture.
/// </summary>
public static class ChallengeMath
{
    /// <summary>Percent of the target completed, floored to an integer.</summary>
    public static int Pct(int finished, int target) =>
        target == 0 ? 0 : Math.Min(100, (int)(finished * 100.0 / target));

    /// <summary>
    /// True when the user has finished more books than the year-to-date share
    /// of the target would predict.
    /// </summary>
    public static bool AheadOfPace(int finished, int target, double daysElapsed, double daysTotal = 365.0)
    {
        if (target <= 0) return false;
        var expected = target * (daysElapsed / daysTotal);
        return finished > expected;
    }
}

/// <summary>
/// Yearly reading-challenge persistence (Goodreads-style goal tracker).
/// One challenge per user per year. Stats computed from BookshelfEntry
/// rows where Status == Finished and CreatedAt falls in the target year.
/// </summary>
public interface IChallengeService
{
    Task<ChallengeStats> GetStatsAsync(Guid userId, int? year = null, CancellationToken ct = default);
    Task<ChallengeStats> SetTargetAsync(Guid userId, int target, int? year = null, CancellationToken ct = default);
}

public class ChallengeService(AppDbContext db) : IChallengeService
{
    public async Task<ChallengeStats> GetStatsAsync(Guid userId, int? year = null, CancellationToken ct = default)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;

        var challenge = await db.Challenges
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Year == targetYear, ct);

        var yearStart = new DateTime(targetYear, 1, 1);
        var yearEnd = yearStart.AddYears(1);

        var finishedThisYear = await db.BookshelfEntries
            .AsNoTracking()
            .CountAsync(e => e.UserId == userId
                && e.Status == BookStatus.Finished
                && e.CreatedAt >= yearStart
                && e.CreatedAt < yearEnd, ct);

        var target = challenge?.Target ?? 50;
        var daysElapsed = (DateTime.UtcNow - yearStart).TotalDays;
        var monthsElapsed = Math.Max(1, DateTime.UtcNow.Month);

        return new ChallengeStats
        {
            Year = targetYear,
            Target = target,
            Finished = finishedThisYear,
            Average = finishedThisYear / monthsElapsed,
            Pct = ChallengeMath.Pct(finishedThisYear, target),
            AheadOfPace = ChallengeMath.AheadOfPace(finishedThisYear, target, daysElapsed)
        };
    }

    public async Task<ChallengeStats> SetTargetAsync(Guid userId, int target, int? year = null, CancellationToken ct = default)
    {
        if (target < 1) throw new ArgumentOutOfRangeException(nameof(target));

        var targetYear = year ?? DateTime.UtcNow.Year;

        var entity = await db.Challenges
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Year == targetYear, ct);

        if (entity is null)
        {
            entity = new Challenge { UserId = userId, Year = targetYear, Target = target };
            db.Challenges.Add(entity);
        }
        else
        {
            entity.Target = target;
            entity.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return await GetStatsAsync(userId, targetYear, ct);
    }
}

public class ChallengeStats
{
    public int Year { get; set; }
    public int Target { get; set; }
    public int Finished { get; set; }
    public int Average { get; set; }
    public bool AheadOfPace { get; set; }
    public int Pct { get; set; }
}

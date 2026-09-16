namespace CurioMap.Api.Services;

using CurioMap.Api.Common;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

/// <summary>Pure helpers for circle-streak badge milestones.</summary>
public static class CircleStreakMath
{
    /// <summary>Group badges a circle unlocks as its longest streak grows.</summary>
    public static IReadOnlyList<BadgeKind> BadgesFor(int longestStreak)
    {
        var kinds = new List<BadgeKind>();
        if (longestStreak >= 7) kinds.Add(BadgeKind.CircleStreak7);
        if (longestStreak >= 30) kinds.Add(BadgeKind.CircleStreak30);
        return kinds;
    }
}

/// <summary>Group streak snapshot for one circle.</summary>
public record CircleStreakStats
{
    public int CurrentStreak { get; init; }
    public int LongestStreak { get; init; }
    public int FreezeCount { get; init; }
    public DateTime? LastActivityAt { get; init; }
    public bool ActiveToday { get; init; }
}

/// <summary>
/// Group reading streaks for reading circles. The circle's streak advances
/// when any member posts a message; the same UTC-day gap and freeze rules as
/// personal streaks apply (reusing StreakMath). When the circle reaches a
/// milestone, every current member earns the group badge.
/// </summary>
public interface ICircleStreakService
{
    Task<CircleStreakStats> GetStatsAsync(Guid circleId, CancellationToken ct = default);
    Task RecordActivityAsync(Guid circleId, CancellationToken ct = default);
}

public class CircleStreakService(AppDbContext db, ActivityService activity) : ICircleStreakService
{
    public async Task<CircleStreakStats> GetStatsAsync(Guid circleId, CancellationToken ct = default)
    {
        var streak = await db.CircleStreaks.AsNoTracking()
            .FirstOrDefaultAsync(s => s.CircleId == circleId, ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateOnly? lastDay = streak is null ? null : DateOnly.FromDateTime(streak.LastActivityAt);

        return new CircleStreakStats
        {
            CurrentStreak = streak?.CurrentStreak ?? 0,
            LongestStreak = streak?.LongestStreak ?? 0,
            FreezeCount = streak?.FreezeCount ?? 0,
            LastActivityAt = streak?.LastActivityAt,
            ActiveToday = StreakMath.IsActiveOn(lastDay, today),
        };
    }

    public async Task RecordActivityAsync(Guid circleId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        var streak = await db.CircleStreaks.FirstOrDefaultAsync(s => s.CircleId == circleId, ct);
        if (streak is null)
        {
            streak = new CircleStreak
            {
                CircleId = circleId,
                CurrentStreak = 1,
                LongestStreak = 1,
                LastActivityAt = now,
                UpdatedAt = now,
            };
            db.CircleStreaks.Add(streak);
        }
        else
        {
            var lastDay = DateOnly.FromDateTime(streak.LastActivityAt);
            if (lastDay != today)
            {
                var (consumed, remaining) = StreakMath.TryConsumeFreeze(lastDay, today, streak.FreezeCount);
                if (consumed)
                {
                    // A freeze shields the missed day: the group streak survives.
                    streak.FreezeCount = remaining;
                }
                else
                {
                    var previous = streak.CurrentStreak;
                    streak.CurrentStreak = StreakMath.AdvanceStreak(streak.CurrentStreak, lastDay, today);
                    streak.LongestStreak = Math.Max(streak.LongestStreak, streak.CurrentStreak);
                    if (StreakMath.ShouldAwardFreeze(
                            streak.CurrentStreak == previous + 1, streak.CurrentStreak, streak.FreezeCount))
                    {
                        streak.FreezeCount++;
                    }
                }

                streak.LastActivityAt = now;
                streak.UpdatedAt = now;
            }
        }

        await db.SaveChangesAsync(ct);
        await AwardGroupBadgesAsync(circleId, streak, ct);
    }

    private async Task AwardGroupBadgesAsync(Guid circleId, CircleStreak streak, CancellationToken ct)
    {
        var eligible = CircleStreakMath.BadgesFor(streak.LongestStreak);
        if (eligible.Count == 0) return;

        var memberIds = await db.CircleMemberships.AsNoTracking()
            .Where(m => m.CircleId == circleId)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        if (memberIds.Count == 0) return;

        var owned = await db.UserBadges.AsNoTracking()
            .Where(b => memberIds.Contains(b.UserId) && eligible.Contains(b.Kind))
            .Select(b => new { b.UserId, b.Kind })
            .ToListAsync(ct);
        var ownedSet = owned.Select(x => (x.UserId, x.Kind)).ToHashSet();

        // (user, badge) pairs not yet earned — these are the fresh awards.
        var missing = memberIds
            .SelectMany(userId => eligible.Select(kind => (userId, kind)))
            .Where(pair => !ownedSet.Contains(pair))
            .ToList();
        if (missing.Count == 0) return;

        db.UserBadges.AddRange(missing.Select(p => new UserBadge { UserId = p.userId, Kind = p.kind }));

        // Celebrate in the followers' feed — public-shelf members only.
        var publicIds = (await db.Users.AsNoTracking()
                .Where(u => memberIds.Contains(u.Id) && u.BookshelfVisibility == ShelfVisibility.Public)
                .Select(u => u.Id)
                .ToListAsync(ct))
            .ToHashSet();
        foreach (var p in missing)
        {
            if (publicIds.Contains(p.userId))
            {
                activity.RecordBadgeEarned(p.userId, p.kind);
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
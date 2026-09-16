namespace CurioMap.Api.Services;

using CurioMap.Api.Common;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;

/// <summary>Kinds of reader activity that keep a streak alive.</summary>
public enum StreakActivity
{
    BookAdded,
    BookFinished,
    Rating,
    CircleCreated,
    CircleMessage,
    DirectMessage,
}

/// <summary>
/// Pure helpers for streak math and badge eligibility, extracted so the rules
/// are unit-testable without an EF fixture. Days are UTC — the server has no
/// notion of reader-local time, so NightOwl/EarlyBird use UTC-hour windows.
/// </summary>
public static class StreakMath
{
    /// <summary>
    /// Next streak value given the current streak, the UTC date of the last
    /// activity and today. Same day keeps the count, consecutive day
    /// increments, any larger gap resets to 1.
    /// </summary>
    public static int AdvanceStreak(int currentStreak, DateOnly lastActivityDay, DateOnly today)
    {
        if (today == lastActivityDay) return Math.Max(1, currentStreak);
        if (today.DayNumber == lastActivityDay.DayNumber + 1) return Math.Max(1, currentStreak) + 1;
        return 1;
    }

    /// <summary>True when the reader already has activity logged today (UTC).</summary>
    public static bool IsActiveOn(DateOnly? lastActivityDay, DateOnly today) => lastActivityDay == today;

    /// <summary>Freezes a reader can hold at once; one freeze shields one missed day.</summary>
    public const int MaxFreezesHeld = 2;

    /// <summary>
    /// A streak that just advanced to a multiple of seven days earns a freeze
    /// (unless the reader already holds the cap). Freezes never accrue on
    /// same-day repeats or after a reset.
    /// </summary>
    public static bool ShouldAwardFreeze(bool streakAdvanced, int newStreak, int heldFreezes) =>
        streakAdvanced && newStreak > 0 && newStreak % 7 == 0 && heldFreezes < MaxFreezesHeld;

    /// <summary>
    /// Attempts to shield a missed day: last=Monday, missed Tuesday, active
    /// Wednesday means today-last==2. Consecutive days (+1) advance normally
    /// and never consume; larger gaps reset regardless.
    /// NOTE: AGENTS.md says "+1" here, which collides with consecutive-day
    /// advance — the only consistent reading is +2 for a single missed day.
    /// </summary>
    public static (bool Consumed, int Remaining) TryConsumeFreeze(
        DateOnly lastActivityDay, DateOnly today, int heldFreezes)
    {
        if (heldFreezes > 0 && today.DayNumber == lastActivityDay.DayNumber + 2)
        {
            return (true, heldFreezes - 1);
        }
        return (false, heldFreezes);
    }

    /// <summary>All badges whose criteria are met for the given stats snapshot.</summary>
    public static IReadOnlyList<BadgeKind> EvaluateBadges(
        int finishedBooks,
        int distinctAuthors,
        int longestStreak,
        bool inCircle,
        bool hasReview,
        bool hasMessage,
        int activityHourUtc)
    {
        var earned = new List<BadgeKind>();

        if (finishedBooks >= 1) earned.Add(BadgeKind.FirstBook);
        if (finishedBooks >= 5) earned.Add(BadgeKind.FiveBooks);
        if (finishedBooks >= 10) earned.Add(BadgeKind.TenBooks);
        if (finishedBooks >= 25) earned.Add(BadgeKind.TwentyFiveBooks);
        if (finishedBooks >= 50) earned.Add(BadgeKind.FiftyBooks);
        if (finishedBooks >= 100) earned.Add(BadgeKind.HundredBooks);

        if (longestStreak >= 3) earned.Add(BadgeKind.Streak3);
        if (longestStreak >= 7) earned.Add(BadgeKind.Streak7);
        if (longestStreak >= 30) earned.Add(BadgeKind.Streak30);
        if (longestStreak >= 100) earned.Add(BadgeKind.Streak100);

        if (inCircle) earned.Add(BadgeKind.FirstCircle);
        if (hasReview) earned.Add(BadgeKind.FirstReview);
        if (hasMessage) earned.Add(BadgeKind.FirstMessage);

        // 00:00–03:59 = night owl, 04:00–05:59 = early bird (UTC proxy for local).
        if (activityHourUtc is >= 0 and < 4) earned.Add(BadgeKind.NightOwl);
        if (activityHourUtc is >= 4 and < 6) earned.Add(BadgeKind.EarlyBird);

        if (distinctAuthors >= 5) earned.Add(BadgeKind.Globetrotter);

        return earned;
    }
}

/// <summary>Streak + badge snapshot for one reader.</summary>
public record StreakStats
{
    public int CurrentStreak { get; init; }
    public int LongestStreak { get; init; }
    public DateTime? LastActivityAt { get; init; }
    public bool ActiveToday { get; init; }
    public int FreezeCount { get; init; }
    public IReadOnlyList<(BadgeKind Kind, DateTime AwardedAt)> Badges { get; init; } = [];
}

/// <summary>One row of the community streak leaderboard.</summary>
public record LeaderboardEntry(
    Guid UserId,
    string Handle,
    string AvatarId,
    string DisplayName,
    int CurrentStreak,
    int LongestStreak,
    int BadgeCount);

/// <summary>
/// Reading-streak tracking + milestone badge awarding.
/// One streak row per user, keyed by user_id; badge rows are deduplicated by
/// a unique (user_id, kind) index. Activity = adding/finishing a book,
/// rating, or posting a message (direct or in a circle).
/// </summary>
public interface IStreakService
{
    Task<StreakStats> GetStatsAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<BadgeKind>> RecordActivityAsync(Guid userId, StreakActivity activity, CancellationToken ct = default);
    Task<IReadOnlyList<LeaderboardEntry>> GetLeaderboardAsync(int limit = 25, CancellationToken ct = default);
    Task<IReadOnlyList<DateOnly>> GetActiveDaysAsync(Guid userId, int days = 91, CancellationToken ct = default);
    Task<(int UsersScanned, int BadgesAwarded)> BackfillBadgesAsync(CancellationToken ct = default);
}

public class StreakService(AppDbContext db, ActivityService activity) : IStreakService
{
    public async Task<StreakStats> GetStatsAsync(Guid userId, CancellationToken ct = default)
    {
        var streak = await db.ReadingStreaks.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        var badges = await db.UserBadges.AsNoTracking()
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.AwardedAt)
            .Select(b => new ValueTuple<BadgeKind, DateTime>(b.Kind, b.AwardedAt))
            .ToListAsync(ct);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateOnly? lastDay = streak is null ? null : DateOnly.FromDateTime(streak.LastActivityAt);

        return new StreakStats
        {
            CurrentStreak = streak?.CurrentStreak ?? 0,
            LongestStreak = streak?.LongestStreak ?? 0,
            LastActivityAt = streak?.LastActivityAt,
            ActiveToday = StreakMath.IsActiveOn(lastDay, today),
            FreezeCount = streak?.FreezeCount ?? 0,
            Badges = badges,
        };
    }

    public async Task<IReadOnlyList<BadgeKind>> RecordActivityAsync(Guid userId, StreakActivity activity, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        var streak = await db.ReadingStreaks.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (streak is null)
        {
            streak = new ReadingStreak
            {
                UserId = userId,
                CurrentStreak = 1,
                LongestStreak = 1,
                LastActivityAt = now,
                UpdatedAt = now,
            };
            db.ReadingStreaks.Add(streak);
        }
        else
        {
            var lastDay = DateOnly.FromDateTime(streak.LastActivityAt);
            if (lastDay != today)
            {
                var (consumed, remaining) = StreakMath.TryConsumeFreeze(lastDay, today, streak.FreezeCount);
                if (consumed)
                {
                    // A freeze shields the missed day: the streak count survives.
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
        return await EvaluateBadgesAsync(userId, streak, now, ct);
    }

    private async Task<IReadOnlyList<BadgeKind>> EvaluateBadgesAsync(Guid userId, ReadingStreak streak, DateTime now, CancellationToken ct)
    {
        var finishedBooks = await db.BookshelfEntries.AsNoTracking()
            .CountAsync(e => e.UserId == userId && e.Status == BookStatus.Finished, ct);

        var distinctAuthors = await db.BookshelfEntries.AsNoTracking()
            .Where(e => e.UserId == userId && e.Status == BookStatus.Finished)
            .Select(e => e.Book!.Author)
            .Distinct()
            .CountAsync(ct);

        var inCircle = await db.CircleMemberships.AsNoTracking()
            .AnyAsync(m => m.UserId == userId, ct);

        var hasReview = await db.Ratings.AsNoTracking()
            .AnyAsync(r => r.UserId == userId, ct);

        var hasMessage = await db.Messages.AsNoTracking().AnyAsync(m => m.AuthorId == userId, ct)
            || await db.CircleMessages.AsNoTracking().AnyAsync(m => m.AuthorId == userId, ct);

        var longest = Math.Max(streak.CurrentStreak, streak.LongestStreak);
        var eligible = StreakMath.EvaluateBadges(
            finishedBooks, distinctAuthors, longest, inCircle, hasReview, hasMessage, now.Hour);

        var owned = await db.UserBadges.AsNoTracking()
            .Where(b => b.UserId == userId)
            .Select(b => b.Kind)
            .ToListAsync(ct);

        var newKinds = eligible.Where(k => !owned.Contains(k)).ToList();
        if (newKinds.Count == 0) return newKinds;

        db.UserBadges.AddRange(newKinds.Select(kind => new UserBadge { UserId = userId, Kind = kind }));

        // Celebrate in the followers' feed — but only for readers whose shelf
        // is public (same privacy gate as /users/:id/streak and the leaderboard).
        var owner = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.BookshelfVisibility })
            .FirstOrDefaultAsync(ct);
        if (owner?.BookshelfVisibility == ShelfVisibility.Public)
        {
            foreach (var kind in newKinds)
            {
                activity.RecordBadgeEarned(userId, kind);
            }
        }

        await db.SaveChangesAsync(ct);
        return newKinds;
    }

    /// <summary>
    /// UTC days with qualifying reader activity inside the last <paramref name="days"/>
    /// window, derived from the same sources the streak hooks use: bookshelf
    /// updates, ratings, thread messages and circle messages.
    /// </summary>
    public async Task<IReadOnlyList<DateOnly>> GetActiveDaysAsync(Guid userId, int days = 91, CancellationToken ct = default)
    {
        days = Math.Clamp(days, 7, 366);
        var since = DateTime.UtcNow.Date.AddDays(-(days - 1));

        var shelfDays = await db.BookshelfEntries.AsNoTracking()
            .Where(e => e.UserId == userId && e.UpdatedAt >= since)
            .Select(e => e.UpdatedAt)
            .ToListAsync(ct);
        var ratingDays = await db.Ratings.AsNoTracking()
            .Where(r => r.UserId == userId && r.CreatedAt >= since)
            .Select(r => r.CreatedAt)
            .ToListAsync(ct);
        var messageDays = await db.Messages.AsNoTracking()
            .Where(m => m.AuthorId == userId && m.CreatedAt >= since)
            .Select(m => m.CreatedAt)
            .ToListAsync(ct);
        var circleDays = await db.CircleMessages.AsNoTracking()
            .Where(m => m.AuthorId == userId && m.CreatedAt >= since)
            .Select(m => m.CreatedAt)
            .ToListAsync(ct);

        return shelfDays.Concat(ratingDays).Concat(messageDays).Concat(circleDays)
            .Select(DateOnly.FromDateTime)
            .Distinct()
            .OrderBy(d => d)
            .ToList();
    }

    public async Task<IReadOnlyList<LeaderboardEntry>> GetLeaderboardAsync(int limit = 25, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 100);

        // Public-shelf readers only: a private shelf keeps streaks and badges
        // out of public rankings (mirrors the /users/:id/streak visibility gate).
        var rows = await db.ReadingStreaks.AsNoTracking()
            .Where(s => s.CurrentStreak >= 2)
            .Join(db.Users.AsNoTracking(), s => s.UserId, u => u.Id, (s, u) => new { s, u })
            .Where(x => x.u.BookshelfVisibility == ShelfVisibility.Public)
            .OrderByDescending(x => x.s.CurrentStreak)
            .ThenByDescending(x => x.s.LongestStreak)
            .ThenBy(x => x.u.Handle)
            .Take(limit)
            .Select(x => new
            {
                x.u.Id,
                x.u.Handle,
                x.u.AvatarId,
                x.u.DisplayNameMode,
                x.u.RealName,
                x.s.CurrentStreak,
                x.s.LongestStreak,
            })
            .ToListAsync(ct);

        var ids = rows.Select(r => r.Id).ToList();
        var badgeCounts = await db.UserBadges.AsNoTracking()
            .Where(b => ids.Contains(b.UserId))
            .GroupBy(b => b.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

        return rows.Select(r => new LeaderboardEntry(
            r.Id,
            r.DisplayNameMode == DisplayMode.Anonymous ? "anonymous" : r.Handle,
            r.AvatarId,
            DisplayName.Resolve(r.DisplayNameMode, r.RealName, r.Handle),
            r.CurrentStreak,
            r.LongestStreak,
            badgeCounts.GetValueOrDefault(r.Id))).ToList();
    }

    /// <summary>
    /// One-shot catch-up after a feature launch: awards every badge readers
    /// already qualify for from historical data, so quiet readers don't have
    /// to wait for their next activity. NightOwl/EarlyBird depend on the hour
    /// an activity happened and can only be earned live. No feed events are
    /// emitted — the client-side toast diff surfaces the awards on the
    /// reader's next visit instead. Idempotent: the unique (user, kind) index
    /// plus the in-memory set make re-runs no-ops.
    /// </summary>
    public async Task<(int UsersScanned, int BadgesAwarded)> BackfillBadgesAsync(CancellationToken ct = default)
    {
        var userIds = await db.Users.AsNoTracking().Select(u => u.Id).ToListAsync(ct);
        var longestByUser = await db.ReadingStreaks.AsNoTracking()
            .Select(s => new { s.UserId, s.CurrentStreak, s.LongestStreak })
            .ToDictionaryAsync(s => s.UserId, s => Math.Max(s.CurrentStreak, s.LongestStreak), ct);
        var ownedPairs = (await db.UserBadges.AsNoTracking()
                .Select(b => new { b.UserId, b.Kind })
                .ToListAsync(ct))
            .Select(x => (x.UserId, x.Kind))
            .ToHashSet();

        var finishedByUser = await db.BookshelfEntries.AsNoTracking()
            .Where(e => e.Status == BookStatus.Finished)
            .GroupBy(e => e.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);
        var authorsByUser = await db.BookshelfEntries.AsNoTracking()
            .Where(e => e.Status == BookStatus.Finished)
            .GroupBy(e => e.UserId)
            .Select(g => new { UserId = g.Key, Authors = g.Select(e => e.Book!.Author).Distinct().Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Authors, ct);
        var circleUsers = (await db.CircleMemberships.AsNoTracking()
                .Select(m => m.UserId)
                .ToListAsync(ct))
            .ToHashSet();
        var reviewUsers = (await db.Ratings.AsNoTracking()
                .Select(r => r.UserId)
                .ToListAsync(ct))
            .ToHashSet();
        var messageUsers = (await db.Messages.AsNoTracking()
                .Select(m => m.AuthorId)
                .ToListAsync(ct))
            .Concat(await db.CircleMessages.AsNoTracking()
                .Select(m => m.AuthorId)
                .ToListAsync(ct))
            .ToHashSet();

        var toAdd = new List<UserBadge>();
        foreach (var userId in userIds)
        {
            // Hour 12 (noon) guarantees no NightOwl/EarlyBird in the result;
            // the explicit filter documents that they are live-earn only.
            var eligible = StreakMath.EvaluateBadges(
                    finishedByUser.GetValueOrDefault(userId),
                    authorsByUser.GetValueOrDefault(userId),
                    longestByUser.GetValueOrDefault(userId),
                    circleUsers.Contains(userId),
                    reviewUsers.Contains(userId),
                    messageUsers.Contains(userId),
                    activityHourUtc: 12)
                .Where(k => k is not BadgeKind.NightOwl and not BadgeKind.EarlyBird);

            foreach (var kind in eligible)
            {
                if (ownedPairs.Contains((userId, kind))) continue;
                ownedPairs.Add((userId, kind));
                toAdd.Add(new UserBadge { UserId = userId, Kind = kind });
            }
        }

        db.UserBadges.AddRange(toAdd);
        await db.SaveChangesAsync(ct);
        return (userIds.Count, toAdd.Count);
    }
}
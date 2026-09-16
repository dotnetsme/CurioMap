using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CurioMap.Api.Controllers;

/// <summary>
/// Reading-streak endpoint group. Read-only: streaks advance automatically
/// when the reader adds/finishes books, rates, or posts messages.
/// </summary>
[ApiController]
[Route("me/streak")]
[Authorize]
public class StreakController(
    IStreakService streakService,
    AppDbContext db,
    ICacheService cache,
    Auth.CurrentUser currentUser) : ControllerBase
{
    /// <summary>Current streak, longest streak and earned badges for the signed-in reader.</summary>
    [HttpGet]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<StreakStatsDto>> Get()
    {
        var userId = currentUser.RequireUserId();
        return Ok(ToDto(await streakService.GetStatsAsync(userId)));
    }

    /// <summary>Active-day calendar (UTC dates) for the signed-in reader.</summary>
    [HttpGet("calendar")]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<StreakCalendarDto>> MyCalendar([FromQuery] int days = 91)
    {
        days = Math.Clamp(days, 7, 366);
        var userId = currentUser.RequireUserId();
        var activeDays = await streakService.GetActiveDaysAsync(userId, days);
        return Ok(ToCalendarDto(days, activeDays));
    }

    /// <summary>
    /// A reader's public streak + badges. Honors the bookshelf visibility gate:
    /// readers with a private shelf keep their achievements to themselves.
    /// </summary>
    [HttpGet("/users/{userId:guid}/streak")]
    [AllowAnonymous]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<StreakStatsDto>> ForUser(Guid userId)
    {
        await EnsureViewableAsync(userId);
        return Ok(ToDto(await streakService.GetStatsAsync(userId)));
    }

    /// <summary>Active-day calendar for a reader; same visibility gate as the streak.</summary>
    [HttpGet("/users/{userId:guid}/streak/calendar")]
    [AllowAnonymous]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<StreakCalendarDto>> ForUserCalendar(Guid userId, [FromQuery] int days = 91)
    {
        days = Math.Clamp(days, 7, 366);
        await EnsureViewableAsync(userId);
        var activeDays = await streakService.GetActiveDaysAsync(userId, days);
        return Ok(ToCalendarDto(days, activeDays));
    }

    /// <summary>
    /// Community streak leaderboard: top readers by current streak.
    /// Public-shelf readers only; Redis-cached for 5 minutes.
    /// </summary>
    [HttpGet("/streaks/leaderboard")]
    [AllowAnonymous]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<IReadOnlyList<LeaderboardEntryDto>>> Leaderboard()
    {
        var entries = await cache.GetOrSetAsync(
            "streaks:leaderboard", TimeSpan.FromMinutes(5), () => streakService.GetLeaderboardAsync());
        return Ok(entries
            .Select(e => new LeaderboardEntryDto(
                e.UserId, e.Handle, e.AvatarId, e.DisplayName,
                e.CurrentStreak, e.LongestStreak, e.BadgeCount))
            .ToList());
    }

    private async Task EnsureViewableAsync(Guid userId)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new AppException(404, "User not found.");

        if (user.BookshelfVisibility == ShelfVisibility.Private && currentUser.UserId != userId)
        {
            throw new AppException(403, "This reader keeps their achievements private.");
        }
    }

    private static StreakStatsDto ToDto(StreakStats stats) => new(
        stats.CurrentStreak,
        stats.LongestStreak,
        stats.LastActivityAt,
        stats.ActiveToday,
        stats.FreezeCount,
        stats.Badges.Select(b => new BadgeDto(b.Kind.ToString(), b.AwardedAt)).ToList());

    private static StreakCalendarDto ToCalendarDto(int days, IReadOnlyList<DateOnly> activeDays) => new(
        Math.Clamp(days, 7, 366),
        activeDays.Select(d => d.ToString("yyyy-MM-dd")).ToList());
}
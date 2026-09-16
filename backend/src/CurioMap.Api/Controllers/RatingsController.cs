using System.ComponentModel.DataAnnotations;
using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Controllers;

/// <summary>
/// Reads the book record with rating stats joined. Mirrors BooksController.Get
/// shape but exposes AverageRating/RatingCount for the frontend Stars widget.
/// </summary>
public record BookDetailResult(BookDto Book, bool IsOwner);

[ApiController]
[Route("books")]
public class RatingsController(IRatingService ratingService, IStreakService streak, Auth.CurrentUser currentUser) : ControllerBase
{
    /// <summary>
    /// Read aggregate stats for a single book.
    /// Anonymous-safe (no personal data, just book id + 1–5 value).
    /// </summary>
    [HttpGet("{id:guid}/rating")]
    [AllowAnonymous]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<RatingStatsDto>> GetStats(Guid id)
    {
        var stats = await ratingService.GetStatsAsync(id);
        return stats is null
            ? Ok(new RatingStatsDto(Average: 0, Count: 0, RatedByCurrentUser: false))
            : Ok(new RatingStatsDto(stats.Average, stats.Count, false));
    }

    /// <summary>
    /// Upsert the signed-in user's rating for a book (1–5).
    /// </summary>
    [HttpPut("{id:guid}/rating")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<RatingStatsDto>> Rate(Guid id, [FromBody] RateBookRequest req)
    {
        var userId = currentUser.RequireUserId();
        await ratingService.RateAsync(userId, id, req.Value);

        try
        {
            await streak.RecordActivityAsync(userId, StreakActivity.Rating);
        }
        catch
        {
            // Gamification is best-effort; never fail the rating.
        }

        var stats = await ratingService.GetStatsAsync(id);
        return Ok(new RatingStatsDto(stats?.Average ?? 0, stats?.Count ?? 0, true));
    }
}

public record RateBookRequest([Required, Range(1, 5)] int Value);
public record RatingStatsDto(double Average, int Count, bool RatedByCurrentUser);

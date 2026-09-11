using CurioMap.Api.Contracts;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CurioMap.Api.Controllers;

/// <summary>
/// Yearly reading-challenge endpoint group.
/// Read is available to any authenticated reader; target updates use the "write" limiter.
/// </summary>
[ApiController]
[Route("me/challenge")]
[Authorize]
public class ChallengeController(IChallengeService challengeService, Auth.CurrentUser currentUser) : ControllerBase
{
    /// <summary>
    /// Current user's challenge stats for the given (or current) year.
    /// GET /me/challenge           → this year
    /// GET /me/challenge?year=2025 → specified year
    /// </summary>
    [HttpGet]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<ChallengeStatsDto>> Get([FromQuery] int? year = null)
    {
        var userId = currentUser.RequireUserId();
        var stats = await challengeService.GetStatsAsync(userId, year);
        return Ok(new ChallengeStatsDto(
            stats.Year, stats.Target, stats.Finished, stats.Average, stats.AheadOfPace, stats.Pct));
    }

    /// <summary>
    /// Upsert the target for the given (or current) year.
    /// PUT /me/challenge?year=2025  { target: 30 }
    /// </summary>
    [HttpPut]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<ChallengeStatsDto>> SetTarget(
        [FromQuery] int? year,
        [FromBody] SetChallengeTargetRequest request)
    {
        var userId = currentUser.RequireUserId();
        var stats = await challengeService.SetTargetAsync(userId, request.Target, year);
        return Ok(new ChallengeStatsDto(
            stats.Year, stats.Target, stats.Finished, stats.Average, stats.AheadOfPace, stats.Pct));
    }
}

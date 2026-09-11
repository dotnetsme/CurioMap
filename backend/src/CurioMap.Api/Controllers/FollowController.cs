using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CurioMap.Api.Controllers;

[ApiController]
public class FollowController(AppDbContext db, CurrentUser me) : ControllerBase
{
    [HttpPost("follow/{userId:guid}")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<FollowResultDto>> Follow(Guid userId)
    {
        var mineId = me.RequireUserId();
        if (userId == mineId)
        {
            throw new AppException(400, "You cannot follow yourself.");
        }
        if (!await db.Users.AnyAsync(u => u.Id == userId))
        {
            throw new AppException(404, "User not found.");
        }

        var exists = await db.Follows.AnyAsync(f => f.FollowerId == mineId && f.FollowedId == userId);
        if (!exists)
        {
            db.Follows.Add(new Follow { FollowerId = mineId, FollowedId = userId });
            await db.SaveChangesAsync();
        }

        return Ok(new FollowResultDto(true));
    }

    [HttpDelete("follow/{userId:guid}")]
    [Authorize]
    public async Task<ActionResult<FollowResultDto>> Unfollow(Guid userId)
    {
        var mineId = me.RequireUserId();
        var follow = await db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == mineId && f.FollowedId == userId);
        if (follow is not null)
        {
            db.Follows.Remove(follow);
            await db.SaveChangesAsync();
        }
        return Ok(new FollowResultDto(false));
    }

    [HttpGet("/users/{id:guid}/followers")]
    [AllowAnonymous]
    public async Task<ActionResult<FollowListDto>> Followers(Guid id, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(0, offset);

        if (!await db.Users.AnyAsync(u => u.Id == id))
        {
            throw new AppException(404, "User not found.");
        }

        var query = db.Follows.AsNoTracking().Include(f => f.Follower).Where(f => f.FollowedId == id);
        var total = await query.CountAsync();
        var page = await query.OrderBy(f => f.CreatedAt).Skip(offset).Take(limit).ToListAsync();

        var items = page
            .Where(f => f.Follower is not null)
            .Select(f => Mapping.ToStub(f.Follower!))
            .ToList();

        return Ok(new FollowListDto(items, total, limit, offset));
    }

    [HttpGet("/users/{id:guid}/following")]
    [AllowAnonymous]
    public async Task<ActionResult<FollowListDto>> Following(Guid id, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(0, offset);

        if (!await db.Users.AnyAsync(u => u.Id == id))
        {
            throw new AppException(404, "User not found.");
        }

        var query = db.Follows.AsNoTracking().Include(f => f.Followed).Where(f => f.FollowerId == id);
        var total = await query.CountAsync();
        var page = await query.OrderBy(f => f.CreatedAt).Skip(offset).Take(limit).ToListAsync();

        var items = page
            .Where(f => f.Followed is not null)
            .Select(f => Mapping.ToStub(f.Followed!))
            .ToList();

        return Ok(new FollowListDto(items, total, limit, offset));
    }
}

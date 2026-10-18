using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CurioMap.Api.Controllers;

[ApiController]
[Route("users")]
public class UsersController(AppDbContext db, CurrentUser me, ProfanityFilter profanity) : ControllerBase
{
    private static readonly Regex HandlePattern = new("^[a-z0-9][a-z0-9_]{2,39}$", RegexOptions.Compiled);

    /// <summary>Names that would let a reader pose as staff or the system.</summary>
    private static readonly HashSet<string> ReservedHandles = new(StringComparer.Ordinal)
    {
        "admin", "administrator", "root", "support", "help", "staff", "moderator", "mod",
        "system", "curiomap", "official", "security", "anonymous", "null", "undefined",
        AccountDeletionService.DeletedReaderHandle,
    };

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicProfileDto>> Profile(Guid id)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new AppException(404, "User not found.");

        var mine = me.UserId;
        var isSelf = mine == id;

        var shelf = db.BookshelfEntries.AsNoTracking().Where(b => b.UserId == id);
        if (!isSelf)
        {
            shelf = shelf.Where(b => b.Visibility == ShelfVisibility.Public);
        }

        var counts = await shelf
            .GroupBy(b => b.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var summary = new BookshelfSummaryDto(
            counts.FirstOrDefault(c => c.Status == BookStatus.Reading)?.Count ?? 0,
            counts.FirstOrDefault(c => c.Status == BookStatus.Finished)?.Count ?? 0,
            counts.FirstOrDefault(c => c.Status == BookStatus.Wishlist)?.Count ?? 0,
            counts.Sum(c => c.Count));

        var followers = await db.Follows.CountAsync(f => f.FollowedId == id);
        var following = await db.Follows.CountAsync(f => f.FollowerId == id);
        bool? isFollowing = mine is null
            ? null
            : await db.Follows.AnyAsync(f => f.FollowerId == mine && f.FollowedId == id);

        return Ok(new PublicProfileDto(
            user.Id,
            Mapping.ToPublicHandle(user, isSelf),
            user.AvatarId,
            user.DisplayNameMode.ToApi(),
            DisplayName.Resolve(user.DisplayNameMode, user.RealName, user.Handle),
            user.DisplayNameMode == DisplayMode.RealName ? user.RealName : null,
            user.Bio,
            user.IsAuthor,
            Mapping.ToPublicLocation(user),
            summary,
            followers,
            following,
            isFollowing));
    }

    [HttpPatch("me")]
    [Authorize]
    public async Task<ActionResult<AuthUserDto>> UpdateMe(UpdateProfileRequest request)
    {
        var user = await db.Users.Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");

        if (request.Handle is not null)
        {
            var handle = request.Handle.Trim().ToLowerInvariant();
            if (!HandlePattern.IsMatch(handle))
            {
                throw new AppException(400, "Handles must be 3–40 characters: lowercase letters, digits and underscores.");
            }
            if (ReservedHandles.Contains(handle))
            {
                throw new AppException(400, "That handle is reserved. Please choose another.");
            }
            if (profanity.ContainsProfanity(handle))
            {
                // AGENTS §2.4.1: handles are a public identity surface and MUST pass the
                // same filter as bios, real names, and circle descriptions.
                throw new AppException(400, "That handle was flagged by the auto-filter. Please choose another.");
            }
            if (await db.Users.AnyAsync(u => u.Handle.ToLower() == handle && u.Id != user.Id))
            {
                throw new AppException(409, "That handle is already taken.");
            }
            user.Handle = handle;
        }

        if (request.AvatarId is not null)
        {
            if (!CurioAvatars.Exists(request.AvatarId))
            {
                throw new AppException(400, "Unknown avatar id.");
            }
            user.AvatarId = request.AvatarId;
        }

        if (request.DisplayNameMode is not null)
        {
            if (!EnumStrings.TryParseEnum<DisplayMode>(request.DisplayNameMode, out var mode))
            {
                throw new AppException(400, "Unknown display mode. Use anonymous, pseudonymous or real_name.");
            }
            user.DisplayNameMode = mode;
        }

        if (request.RealName is not null)
        {
            var realName = string.IsNullOrWhiteSpace(request.RealName) ? null : request.RealName.Trim();
            if (realName is not null && profanity.ContainsProfanity(realName))
            {
                throw new AppException(400, "That name was flagged by the auto-filter. Please choose another.");
            }
            user.RealName = realName;
        }

        if (request.Bio is not null)
        {
            if (request.Bio.Length > 1000)
            {
                throw new AppException(400, "Bio must be 1000 characters or fewer.");
            }
            var bio = string.IsNullOrWhiteSpace(request.Bio) ? null : request.Bio.Trim();
            if (bio is not null && profanity.ContainsProfanity(bio))
            {
                throw new AppException(400, "Your bio was flagged by the auto-filter. Please rephrase.");
            }
            user.Bio = bio;
        }

        await db.SaveChangesAsync();
        return Ok(Mapping.ToAuthUser(user));
    }

    [HttpGet("me/settings")]
    [Authorize]
    public async Task<ActionResult<SettingsDto>> Settings()
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");
        return Ok(new SettingsDto(user.LocationVisibility.ToApi(), user.BookshelfVisibility.ToApi(), Mapping.ToSelfLocation(user)));
    }

    [HttpPatch("me/settings")]
    [Authorize]
    public async Task<ActionResult<SettingsDto>> UpdateSettings(UpdateSettingsRequest request)
    {
        var user = await db.Users.Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");

        if (request.LocationVisibility is not null)
        {
            if (!EnumStrings.TryParseEnum<LocationVisibility>(request.LocationVisibility, out var locationVisibility))
            {
                throw new AppException(400, "Unknown location visibility. Use hidden, country or region_city.");
            }
            user.LocationVisibility = locationVisibility;
        }

        if (request.BookshelfVisibility is not null)
        {
            if (!EnumStrings.TryParseEnum<ShelfVisibility>(request.BookshelfVisibility, out var shelfVisibility))
            {
                throw new AppException(400, "Unknown bookshelf visibility. Use public or private.");
            }
            user.BookshelfVisibility = shelfVisibility;
        }

        await db.SaveChangesAsync();
        return Ok(new SettingsDto(user.LocationVisibility.ToApi(), user.BookshelfVisibility.ToApi(), Mapping.ToSelfLocation(user)));
    }
}

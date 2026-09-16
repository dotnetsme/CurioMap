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

namespace CurioMap.Api.Controllers;

[ApiController]
[Route("bookshelf")]
public class BookshelfController(AppDbContext db, CurrentUser me, ActivityService activity, IStreakService streak) : ControllerBase
{
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<BookshelfEntryDto>>> MyShelf()
    {
        var entries = await db.BookshelfEntries.AsNoTracking()
            .Include(s => s.Book)
            .Where(s => s.UserId == me.RequireUserId())
            .OrderByDescending(s => s.UpdatedAt)
            .ToListAsync();
        return Ok(entries.Select(ToDto).ToList());
    }

    [HttpGet("/users/{userId:guid}/bookshelf")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<BookshelfEntryDto>>> PublicShelf(Guid userId)
    {
        var owner = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new AppException(404, "User not found.");

        var mine = me.UserId;
        var isSelf = mine == userId;
        if (owner.BookshelfVisibility == ShelfVisibility.Private && !isSelf)
        {
            throw new AppException(403, "This bookshelf is private.");
        }

        var query = db.BookshelfEntries.AsNoTracking()
            .Include(s => s.Book)
            .Where(s => s.UserId == userId);

        if (!isSelf)
        {
            query = query.Where(s => s.Visibility == ShelfVisibility.Public);
        }

        var entries = await query.OrderByDescending(s => s.CreatedAt).Take(50).ToListAsync();
        return Ok(entries.Select(ToDto).ToList());
    }

    [HttpPost]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<BookshelfEntryDto>> Add(AddBookshelfRequest? request)
    {
        if (request is null)
        {
            throw new AppException(400, "A book and status are required.");
        }
        if (!EnumStrings.TryParseEnum<BookStatus>(request.Status, out var status))
        {
            throw new AppException(400, "Unknown status. Use reading, finished or wishlist.");
        }

        var visibility = ShelfVisibility.Public;
        if (request.Visibility is not null && !EnumStrings.TryParseEnum<ShelfVisibility>(request.Visibility, out visibility))
        {
            throw new AppException(400, "Unknown visibility. Use public or private.");
        }

        var userId = me.RequireUserId();
        var book = await db.Books.FirstOrDefaultAsync(b => b.Id == request.BookId)
            ?? throw new AppException(404, "Book not found.");

        var entry = await db.BookshelfEntries
            .Include(s => s.Book)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.BookId == request.BookId);

        if (entry is null)
        {
            entry = new BookshelfEntry
            {
                UserId = userId,
                BookId = book.Id,
                Status = status,
                Visibility = visibility,
                StartedAt = status == BookStatus.Reading ? DateTime.UtcNow : null,
                FinishedAt = status == BookStatus.Finished ? DateTime.UtcNow : null,
            };
            db.BookshelfEntries.Add(entry);

            var actor = await db.Users.FirstAsync(u => u.Id == userId);
            activity.RecordBookshelfAdded(actor, book, status);
            await db.SaveChangesAsync();

            try
            {
                await streak.RecordActivityAsync(userId,
                    status == BookStatus.Finished ? StreakActivity.BookFinished : StreakActivity.BookAdded);
            }
            catch
            {
                // Gamification is best-effort; never fail the shelf update.
            }
        }
        else
        {
            entry.Status = status;
            entry.Visibility = visibility;
            ApplyTimestamps(entry);
            await db.SaveChangesAsync();
        }

        return Ok(ToDto(entry));
    }

    [HttpPatch("{entryId:guid}")]
    [Authorize]
    public async Task<ActionResult<BookshelfEntryDto>> Update(Guid entryId, UpdateBookshelfRequest request)
    {
        var entry = await db.BookshelfEntries
            .Include(s => s.Book)
            .FirstOrDefaultAsync(s => s.Id == entryId)
            ?? throw new AppException(404, "Bookshelf entry not found.");

        if (entry.UserId != me.RequireUserId())
        {
            throw new AppException(403, "Not your bookshelf entry.");
        }

        var previousStatus = entry.Status;

        if (request.Status is not null)
        {
            if (!EnumStrings.TryParseEnum<BookStatus>(request.Status, out var status))
            {
                throw new AppException(400, "Unknown status. Use reading, finished or wishlist.");
            }
            entry.Status = status;
        }

        if (request.Visibility is not null)
        {
            if (!EnumStrings.TryParseEnum<ShelfVisibility>(request.Visibility, out var visibility))
            {
                throw new AppException(400, "Unknown visibility. Use public or private.");
            }
            entry.Visibility = visibility;
        }

        if (request.StartedAt is not null)
        {
            entry.StartedAt = request.StartedAt;
        }
        if (request.FinishedAt is not null)
        {
            entry.FinishedAt = request.FinishedAt;
        }

        ApplyTimestamps(entry);
        await db.SaveChangesAsync();

        if (previousStatus != entry.Status && entry.Status == BookStatus.Finished)
        {
            try
            {
                await streak.RecordActivityAsync(entry.UserId, StreakActivity.BookFinished);
            }
            catch
            {
                // Gamification is best-effort; never fail the shelf update.
            }
        }

        return Ok(ToDto(entry));
    }

    [HttpDelete("{entryId:guid}")]
    [Authorize]
    public async Task<IActionResult> Remove(Guid entryId)
    {
        var entry = await db.BookshelfEntries.FirstOrDefaultAsync(s => s.Id == entryId)
            ?? throw new AppException(404, "Bookshelf entry not found.");

        if (entry.UserId != me.RequireUserId())
        {
            throw new AppException(403, "Not your bookshelf entry.");
        }

        db.BookshelfEntries.Remove(entry);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void ApplyTimestamps(BookshelfEntry entry)
    {
        if (entry.Status == BookStatus.Reading && entry.StartedAt is null)
        {
            entry.StartedAt = DateTime.UtcNow;
        }
        if (entry.Status == BookStatus.Finished && entry.FinishedAt is null)
        {
            entry.FinishedAt = DateTime.UtcNow;
        }
        if (entry.Status == BookStatus.Wishlist)
        {
            entry.StartedAt = null;
            entry.FinishedAt = null;
        }
    }

    private static BookshelfEntryDto ToDto(BookshelfEntry entry) => new(
        entry.Id,
        entry.BookId,
        entry.Book is null ? new BookStubDto(entry.BookId, "", "", null, null) : Mapping.ToStub(entry.Book),
        entry.Status.ToApi(),
        entry.Visibility.ToApi(),
        entry.StartedAt,
        entry.FinishedAt,
        entry.CreatedAt);
}

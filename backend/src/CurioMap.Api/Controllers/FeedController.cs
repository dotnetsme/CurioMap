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
[Route("feed")]
public class FeedController(AppDbContext db, CurrentUser me) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<FeedPage>> Feed([FromQuery] int limit = 30, [FromQuery] int offset = 0)
    {
        limit = PageBounds.ClampPageSize(limit);
        offset = PageBounds.ClampOffset(offset);
        var mineId = me.RequireUserId();

        var followed = await db.Follows.AsNoTracking()
            .Where(f => f.FollowerId == mineId)
            .Select(f => f.FollowedId)
            .ToListAsync();
        var actorIds = followed.Append(mineId).Distinct().ToList();

        var events = await db.ActivityEvents.AsNoTracking()
            .Include(e => e.Actor)
            .Where(e => actorIds.Contains(e.ActorId))
            // Privacy (AGENTS §2.2.4): a shelf event is shown only while its entry is
            // still public and its owner's bookshelf is still public. Legacy rows with
            // no snapshot fail closed, so a private entry can never leak here.
            .Where(e => e.Type != ActivityService.BookshelfAdded
                || (e.Visibility == ActivityService.PublicVisibility
                    && e.BookshelfEntryId != null
                    && db.BookshelfEntries.Any(s => s.Id == e.BookshelfEntryId
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public)))
            // Moderation (AGENTS §2.4.2): an excerpt of a muted/deleted message must not
            // resurface here after the thread stopped returning it.
            .Where(e => e.MessageId == null
                || db.Messages.Any(m => m.Id == e.MessageId && m.Status == MessageStatus.Visible))
            .OrderByDescending(e => e.CreatedAt)
            .Skip(offset)
            .Take(limit + 1)
            .ToListAsync();

        var hasNext = events.Count > limit;
        if (hasNext)
        {
            events.RemoveAt(events.Count - 1);
        }

        var items = events.Select(ToDto).ToList();
        return Ok(new FeedPage(items, hasNext ? offset + limit : null));
    }

    private static FeedEventDto ToDto(ActivityEvent e)
    {
        var bookId = e.BookId;
        var conversationId = e.ConversationId;
        // Payload is best-effort under SQLite tests (ignored) and jsonb in Postgres.
        var payload = e.Payload ?? new Dictionary<string, string>();
        return new FeedEventDto(
            e.Id,
            e.Type,
            e.Actor is null ? new UserStubDto(e.ActorId, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(e.Actor),
            bookId is null
                ? null
                : new FeedBookDto(bookId.Value, payload.GetValueOrDefault("book_title", ""), NullIfEmpty(payload.GetValueOrDefault("book_cover"))),
            conversationId is null
                ? null
                : new FeedConversationDto(conversationId.Value, payload.GetValueOrDefault("conversation_title", "")),
            NullIfEmpty(payload.GetValueOrDefault("message_excerpt")),
            NullIfEmpty(payload.GetValueOrDefault("status")),
            e.CreatedAt,
            NullIfEmpty(payload.GetValueOrDefault("badge_kind")));
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}

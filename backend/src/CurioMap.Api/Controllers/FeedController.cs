using CurioMap.Api.Auth;
using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
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
        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(0, offset);
        var mineId = me.RequireUserId();

        var followed = await db.Follows.AsNoTracking()
            .Where(f => f.FollowerId == mineId)
            .Select(f => f.FollowedId)
            .ToListAsync();
        var actorIds = followed.Append(mineId).Distinct().ToList();

        var events = await db.ActivityEvents.AsNoTracking()
            .Include(e => e.Actor)
            .Where(e => actorIds.Contains(e.ActorId))
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
        return new FeedEventDto(
            e.Id,
            e.Type,
            e.Actor is null ? new UserStubDto(e.ActorId, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(e.Actor),
            bookId is null
                ? null
                : new FeedBookDto(bookId.Value, e.Payload.GetValueOrDefault("book_title", ""), NullIfEmpty(e.Payload.GetValueOrDefault("book_cover"))),
            conversationId is null
                ? null
                : new FeedConversationDto(conversationId.Value, e.Payload.GetValueOrDefault("conversation_title", "")),
            NullIfEmpty(e.Payload.GetValueOrDefault("message_excerpt")),
            NullIfEmpty(e.Payload.GetValueOrDefault("status")),
            e.CreatedAt);
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}

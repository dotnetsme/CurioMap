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
public class ReadingCirclesController(
    AppDbContext db,
    CurrentUser me,
    ProfanityFilter profanity,
    IRedisRateLimiter limiter,
    IStreakService streak,
    ICircleStreakService circleStreaks) : ControllerBase
{
    private async Task<ReadingCircle?> LoadCircleAsync(string id)
    {
        if (Guid.TryParse(id, out var g))
        {
            return await db.ReadingCircles.Include(c => c.Creator).Include(c => c.Book).FirstOrDefaultAsync(c => c.Id == g);
        }
        return await db.ReadingCircles.Include(c => c.Creator).Include(c => c.Book).FirstOrDefaultAsync(c => c.Handle == id);
    }

    [HttpGet("/circles")]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<CircleDto>>> List(
        [FromQuery] string? q, [FromQuery] Guid? bookId,
        [FromQuery] string sort = "recent",
        [FromQuery] int limit = 30, [FromQuery] int offset = 0)
    {
        limit = PageBounds.ClampPageSize(limit);
        offset = PageBounds.ClampOffset(offset);
        var query = db.ReadingCircles.AsNoTracking().Include(c => c.Creator).Include(c => c.Book).Where(c => !c.IsArchived);
        if (!string.IsNullOrWhiteSpace(q))
        {
            // Portable case-insensitive substring (see Like.Needle).
            var lowered = q.Trim().ToLowerInvariant();
            query = query.Where(c => c.Name.ToLower().Contains(lowered) || c.Handle.ToLower().Contains(lowered));
        }
        if (bookId.HasValue) query = query.Where(c => c.BookId == bookId.Value);
        query = sort.ToLowerInvariant() switch
        {
            "members" => query.OrderByDescending(c => c.Members.Count),
            "streak" => query
                .OrderByDescending(c => c.Streak == null ? 0 : c.Streak.CurrentStreak)
                .ThenByDescending(c => c.LastActivityAt),
            _ => query.OrderByDescending(c => c.LastActivityAt),
        };
        var total = await query.CountAsync();
        var circles = await query.Skip(offset).Take(limit).ToListAsync();
        var ids = circles.Select(c => c.Id).ToList();
        var mc = await db.CircleMemberships.AsNoTracking().Where(m => ids.Contains(m.CircleId)).GroupBy(m => m.CircleId).Select(g => new { g.Key, C = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.C);
        var msgc = await db.CircleMessages.AsNoTracking().Where(m => ids.Contains(m.CircleId) && m.Status == MessageStatus.Visible).GroupBy(m => m.CircleId).Select(g => new { g.Key, C = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.C);
        var streaks = await db.CircleStreaks.AsNoTracking()
            .Where(s => ids.Contains(s.CircleId))
            .Select(s => new { s.CircleId, s.CurrentStreak, s.LongestStreak })
            .ToDictionaryAsync(s => s.CircleId, s => (s.CurrentStreak, s.LongestStreak));
        var items = circles.Select(c => new CircleDto(c.Id, c.Handle, c.Name, c.Description, c.Book is null ? null : Mapping.ToStub(c.Book), c.MaxMembers, c.NextMeetingAt, Mapping.ToStub(c.Creator!), mc.GetValueOrDefault(c.Id), msgc.GetValueOrDefault(c.Id), c.CreatedAt, c.LastActivityAt, streaks.GetValueOrDefault(c.Id).CurrentStreak, streaks.GetValueOrDefault(c.Id).LongestStreak)).ToList();
        return Ok(new PagedResult<CircleDto>(items, total, limit, offset));
    }

    [HttpGet("/circles/{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<CircleDetailDto>> Get(string id)
    {
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        if (circle.IsArchived) throw new AppException(404, "Circle not found.");
        var members = await db.CircleMemberships.AsNoTracking().Include(m => m.User).Where(m => m.CircleId == circle.Id).OrderBy(m => m.JoinedAt).ToListAsync();
        var md = members.Select(m => new CircleMemberDto(m.UserId, Mapping.ToStub(m.User!).Handle, m.User!.AvatarId, DisplayName.Resolve(m.User.DisplayNameMode, m.User.RealName, m.User.Handle), m.User.IsAuthor, m.Role.ToApi(), m.JoinedAt)).ToList();
        var recent = await db.CircleMessages.AsNoTracking().Include(m => m.Author).Where(m => m.CircleId == circle.Id && m.Status == MessageStatus.Visible).OrderByDescending(m => m.CreatedAt).Take(20).ToListAsync();
        var rids = recent.Select(m => m.Id).ToList();
        var reactions = rids.Count == 0 ? new List<CircleReaction>() : await db.CircleReactions.AsNoTracking().Where(r => rids.Contains(r.MessageId)).ToListAsync();
        var msgs = recent.Select(m => new CircleMessageDto(m.Id, m.CircleId, Mapping.ToStub(m.Author!), m.Content, m.Status.ToApi(), m.CreatedAt, ReactionsFor(reactions, m.Id, me.UserId))).ToList();
        var dto = new CircleDto(circle.Id, circle.Handle, circle.Name, circle.Description, circle.Book is null ? null : Mapping.ToStub(circle.Book), circle.MaxMembers, circle.NextMeetingAt, Mapping.ToStub(circle.Creator!), md.Count, msgs.Count, circle.CreatedAt, circle.LastActivityAt);
        return Ok(new CircleDetailDto(dto, md, msgs));
    }

    [HttpPost("/circles")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<CircleDto>> Create(CreateCircleRequest? request)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Name))
        {
            throw new AppException(400, "Circle name is required.");
        }
        var userId = me.RequireUserId();
        if (profanity.ContainsProfanity(request.Name) || (request.Description is not null && profanity.ContainsProfanity(request.Description)))
        {
            throw new AppException(400, "Circle name or description was flagged by the auto-filter. Please rephrase.");
        }
        if (request.BookId.HasValue && !await db.Books.AnyAsync(b => b.Id == request.BookId.Value)) throw new AppException(404, "Book not found.");
        var circle = new ReadingCircle { Handle = await GenerateHandleAsync(request.Name), Name = request.Name.Trim(), Description = request.Description?.Trim(), BookId = request.BookId, MaxMembers = request.MaxMembers, NextMeetingAt = request.NextMeetingAt, CreatedBy = userId };
        db.ReadingCircles.Add(circle);
        db.CircleMemberships.Add(new CircleMembership { CircleId = circle.Id, UserId = userId, Role = CircleRole.Moderator });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Two readers created a same-named circle concurrently: the loser
            // retries once with a suffixed handle instead of a 500.
            db.ChangeTracker.Clear();
            circle = new ReadingCircle { Handle = await GenerateHandleAsync($"{request.Name} {Guid.NewGuid():N}"[..Math.Min(request.Name.Length + 9, 80)]), Name = request.Name.Trim(), Description = request.Description?.Trim(), BookId = request.BookId, MaxMembers = request.MaxMembers, NextMeetingAt = request.NextMeetingAt, CreatedBy = userId };
            db.ReadingCircles.Add(circle);
            db.CircleMemberships.Add(new CircleMembership { CircleId = circle.Id, UserId = userId, Role = CircleRole.Moderator });
            await db.SaveChangesAsync();
        }

        try
        {
            await streak.RecordActivityAsync(userId, StreakActivity.CircleCreated);
        }
        catch
        {
            // Gamification is best-effort; never fail circle creation.
        }

        await db.Entry(circle).Reference(c => c.Creator).LoadAsync();
        if (circle.BookId.HasValue) await db.Entry(circle).Reference(c => c.Book).LoadAsync();
        var cs = circle.Creator is null ? new UserStubDto(userId, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(circle.Creator);
        var bs = circle.Book is null ? null : Mapping.ToStub(circle.Book);
        return CreatedAtAction(nameof(Get), new { id = circle.Handle }, new CircleDto(circle.Id, circle.Handle, circle.Name, circle.Description, bs, circle.MaxMembers, circle.NextMeetingAt, cs, 1, 0, circle.CreatedAt, circle.LastActivityAt));
    }

    [HttpPost("/circles/{id}/join")]
    [Authorize]
    public async Task<ActionResult> Join(string id)
    {
        var userId = me.RequireUserId();
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        if (circle.IsArchived) throw new AppException(410, "This circle is archived.");

        // Join is a count-then-insert: serialize per-circle on Postgres (SQLite
        // serializes writers itself, so tests need no lock) to stop two readers
        // racing past the MaxMembers gate.
        // The retrying execution strategy rejects user-initiated transactions unless the
        // whole transaction runs as one retriable unit.
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync();
            if (db.Database.IsNpgsql())
            {
                await db.Database.ExecuteSqlRawAsync("SELECT 1 FROM reading_circles WHERE id = {0} FOR UPDATE", circle.Id);
            }

            if (await db.CircleMemberships.AnyAsync(m => m.CircleId == circle.Id && m.UserId == userId))
            {
                await tx.RollbackAsync();
                return (ActionResult)Ok();
            }

            var count = await db.CircleMemberships.CountAsync(m => m.CircleId == circle.Id);
            if (circle.MaxMembers.HasValue && count >= circle.MaxMembers.Value)
            {
                await tx.RollbackAsync();
                throw new AppException(409, "This circle is full.");
            }

            db.CircleMemberships.Add(new CircleMembership { CircleId = circle.Id, UserId = userId });
            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok();
        });
    }

    [HttpPost("/circles/{id}/leave")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult> Leave(string id)
    {
        var userId = me.RequireUserId();
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        var m = await db.CircleMemberships.FirstOrDefaultAsync(x => x.CircleId == circle.Id && x.UserId == userId);
        if (m is null) return Ok();
        db.CircleMemberships.Remove(m);
        if (m.Role == CircleRole.Moderator)
        {
            var next = await db.CircleMemberships.Where(x => x.CircleId == circle.Id).OrderBy(x => x.JoinedAt).FirstOrDefaultAsync();
            if (next is not null) next.Role = CircleRole.Moderator;
        }
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("/circles/{id}/messages")]
    [AllowAnonymous]
    public async Task<ActionResult<MessagesPage<CircleMessageDto>>> ListMessages(string id, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        limit = PageBounds.ClampPageSize(limit);
        offset = PageBounds.ClampOffset(offset);
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        var query = db.CircleMessages.AsNoTracking().Where(m => m.CircleId == circle.Id && m.Status == MessageStatus.Visible);
        var total = await query.CountAsync();
        var page = await query.OrderBy(m => m.CreatedAt).Skip(offset).Take(limit).Include(m => m.Author).ToListAsync();
        var ids = page.Select(m => m.Id).ToList();
        var reactions = ids.Count == 0 ? new List<CircleReaction>() : await db.CircleReactions.AsNoTracking().Where(r => ids.Contains(r.MessageId)).ToListAsync();
        var msgs = page.Select(m => new CircleMessageDto(m.Id, m.CircleId, Mapping.ToStub(m.Author!), m.Content, m.Status.ToApi(), m.CreatedAt, ReactionsFor(reactions, m.Id, me.UserId))).ToList();
        return Ok(new MessagesPage<CircleMessageDto>(msgs, total, limit, offset));
    }

    [HttpPost("/circles/{id}/messages")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<CircleMessageDto>> PostMessage(string id, CreateCircleMessageRequest? request)
    {
        var circle = await db.ReadingCircles.Include(c => c.Members).FirstOrDefaultAsync(c => c.Handle == id || c.Id.ToString() == id) ?? throw new AppException(404, "Circle not found.");
        if (circle.IsArchived) throw new AppException(410, "This circle is archived.");
        var userId = me.RequireUserId();
        if (!circle.Members.Any(m => m.UserId == userId)) throw new AppException(403, "Join the circle before posting.");
        if (!await limiter.IsAllowedAsync("circle-messages", userId.ToString(), 15, TimeSpan.FromMinutes(1))) throw new AppException(429, "You're posting too fast. Take a breath.");
        if (request is null || string.IsNullOrWhiteSpace(request.Content)) throw new AppException(400, "Message cannot be empty.");
        var content = request.Content.Trim();
        if (profanity.ContainsProfanity(content)) throw new AppException(400, "Your message was flagged by the auto-filter. Please rephrase.");
        var author = await db.Users.FirstAsync(u => u.Id == userId);
        var message = new CircleMessage { CircleId = circle.Id, AuthorId = author.Id, Content = content, Status = MessageStatus.Visible };
        db.CircleMessages.Add(message);
        circle.LastActivityAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        try
        {
            await streak.RecordActivityAsync(userId, StreakActivity.CircleMessage);
        }
        catch
        {
            // Gamification is best-effort; never fail the message post.
        }

        try
        {
            await circleStreaks.RecordActivityAsync(circle.Id);
        }
        catch
        {
            // Gamification is best-effort; never fail the message post.
        }

        return Ok(new CircleMessageDto(message.Id, circle.Id, Mapping.ToStub(author), content, message.Status.ToApi(), message.CreatedAt, []));
    }

    [HttpGet("/circles/{id}/streak")]
    [AllowAnonymous]
    [EnableRateLimiting("search")]
    public async Task<ActionResult<CircleStreakStatsDto>> Streak(string id)
    {
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        if (circle.IsArchived) throw new AppException(404, "Circle not found.");
        var stats = await circleStreaks.GetStatsAsync(circle.Id);
        return Ok(new CircleStreakStatsDto(
            stats.CurrentStreak, stats.LongestStreak, stats.FreezeCount, stats.LastActivityAt, stats.ActiveToday));
    }

    [HttpPost("/circles/{id}/messages/{mid:guid}/react")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<ReactionResult>> React(string id, Guid mid, ReactRequest? request)
    {
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        var message = await db.CircleMessages.FirstOrDefaultAsync(m => m.Id == mid && m.CircleId == circle.Id) ?? throw new AppException(404, "Message not found.");
        if (message.Status != MessageStatus.Visible) throw new AppException(410, "This message is no longer available.");
        if (request is null || !EnumStrings.TryParseEnum<ReactionKind>(request.Kind, out var kind)) throw new AppException(400, $"Unknown reaction: {request?.Kind}");
        var userId = me.RequireUserId();
        var existing = await db.CircleReactions.FirstOrDefaultAsync(r => r.MessageId == mid && r.UserId == userId && r.Kind == kind);
        if (existing is not null) db.CircleReactions.Remove(existing);
        else db.CircleReactions.Add(new CircleReaction { MessageId = mid, UserId = userId, Kind = kind });
        await db.SaveChangesAsync();
        var reactions = await db.CircleReactions.AsNoTracking().Where(r => r.MessageId == mid).ToListAsync();
        return Ok(new ReactionResult(ReactionsFor(reactions, mid, userId)));
    }

    [HttpDelete("/circles/{id}")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult> Archive(string id)
    {
        var userId = me.RequireUserId();
        var circle = await db.ReadingCircles.Include(c => c.Members).FirstOrDefaultAsync(c => c.Handle == id || c.Id.ToString() == id) ?? throw new AppException(404, "Circle not found.");
        var membership = circle.Members.FirstOrDefault(m => m.UserId == userId);
        if (membership?.Role != CircleRole.Moderator) throw new AppException(403, "Only a moderator can archive this circle.");
        circle.IsArchived = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> GenerateHandleAsync(string name)
    {
        var slug = string.Join("-", name.ToLowerInvariant().Replace("'", "").Replace("\u2019", "").Split(' ', StringSplitOptions.RemoveEmptyEntries).Select(w => string.Concat(w.Where(char.IsLetterOrDigit))).Where(w => w.Length > 0).Take(4));
        if (slug.Length < 3) slug = "circle";
        var handle = slug;
        var i = 1;
        // Case-insensitive to match the DB's unique index on lower(handle):
        // a case-sensitive check would let "SciFi" slip past "scifi" and 500
        // on the unique violation at save time.
        while (await db.ReadingCircles.AnyAsync(c => c.Handle.ToLower() == handle))
        {
            i++;
            handle = $"{slug}-{i}";
        }
        return handle;
    }

    private static List<ReactionSummaryDto> ReactionsFor(List<CircleReaction> all, Guid messageId, Guid? mineId) =>
        all.Where(r => r.MessageId == messageId).GroupBy(r => r.Kind).Select(g => new ReactionSummaryDto(g.Key.ToApi(), g.Count(), mineId is not null && g.Any(x => x.UserId == mineId))).OrderBy(r => r.Kind).ToList();
}

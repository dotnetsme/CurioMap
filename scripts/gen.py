parts.append(r'''    [HttpGet("/circles/{id}/messages")]
    [AllowAnonymous]
    public async Task<ActionResult<MessagesPage>> ListMessages(
        string id, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 200);
        offset = Math.Max(0, offset);
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        var query = db.CircleMessages.AsNoTracking().Where(m => m.CircleId == circle.Id && m.Status == MessageStatus.Visible);
        var total = await query.CountAsync();
        var page = await query.OrderBy(m => m.CreatedAt).Skip(offset).Take(limit).Include(m => m.Author).ToListAsync();
        var ids = page.Select(m => m.Id).ToList();
        var reactions = ids.Count == 0 ? new List<CircleReaction>() : await db.CircleReactions.AsNoTracking().Where(r => ids.Contains(r.MessageId)).ToListAsync();
        var items = page.Select(m => new CircleMessageDto(m.Id, m.CircleId, Mapping.ToStub(m.Author!), m.Content, m.Status.ToApi(), m.CreatedAt, ReactionsFor(reactions, m.Id, me.UserId))).ToList();
        return Ok(new MessagesPage(items, total, limit, offset));
    }

    [HttpPost("/circles/{id}/messages")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<CircleMessageDto>> PostMessage(string id, CreateCircleMessageRequest request)
    {
        var circle = await db.ReadingCircles.Include(c => c.Members).FirstOrDefaultAsync(c => c.Handle == id || c.Id.ToString() == id)
            ?? throw new AppException(404, "Circle not found.");
        if (circle.IsArchived) throw new AppException(410, "This circle is archived.");
        var userId = me.RequireUserId();
        if (!circle.Members.Any(m => m.UserId == userId)) throw new AppException(403, "Join the circle before posting.");
        if (!await limiter.IsAllowedAsync("circle-messages", userId.ToString(), 15, TimeSpan.FromMinutes(1)))
            throw new AppException(429, "You're posting too fast. Take a breath.");
        var content = request.Content.Trim();
        if (profanity.ContainsProfanity(content)) throw new AppException(400, "Your message was flagged by the auto-filter. Please rephrase.");
        var author = await db.Users.FirstAsync(u => u.Id == userId);
        var message = new CircleMessage { CircleId = circle.Id, AuthorId = author.Id, Content = content, Status = MessageStatus.Visible };
        db.CircleMessages.Add(message);
        circle.LastActivityAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new CircleMessageDto(message.Id, circle.Id, Mapping.ToStub(author), content, message.Status.ToApi(), message.CreatedAt, []));
    }

    [HttpPost("/circles/{id}/messages/{mid:guid}/react")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<ReactionResult>> React(string id, Guid mid, ReactRequest request)
    {
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        var message = await db.CircleMessages.FirstOrDefaultAsync(m => m.Id == mid && m.CircleId == circle.Id)
            ?? throw new AppException(404, "Message not found.");
        if (!EnumStrings.TryParseEnum<ReactionKind>(request.Kind, out var kind))
            throw new AppException(400, $"Unknown reaction: {request.Kind}");
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
        var circle = await db.ReadingCircles.Include(c => c.Members).FirstOrDefaultAsync(c => c.Handle == id || c.Id.ToString() == id)
            ?? throw new AppException(404, "Circle not found.");
        var membership = circle.Members.FirstOrDefault(m => m.UserId == userId);
        if (membership?.Role != CircleRole.Moderator) throw new AppException(403, "Only a moderator can archive this circle.");
        circle.IsArchived = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> GenerateHandleAsync(string name)
    {
        var slug = string.Join("-", name.ToLowerInvariant().Replace("'", "").Replace("'", "")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => string.Concat(w.Where(char.IsLetterOrDigit)))
            .Where(w => w.Length > 0).Take(4));
        if (slug.Length < 3) slug = "circle";
        var handle = slug;
        var i = 1;
        while (await db.ReadingCircles.AnyAsync(c => c.Handle == handle)) { i++; handle = $"{slug}-{i}"; }
        return handle;
    }

    private static List<ReactionSummaryDto> ReactionsFor(List<CircleReaction> all, Guid messageId, Guid? mineId) =>
        all.Where(r => r.MessageId == messageId).GroupBy(r => r.Kind)
            .Select(g => new ReactionSummaryDto(g.Key.ToApi(), g.Count(), mineId is not null && g.Any(x => x.UserId == mineId)))
            .OrderBy(r => r.Kind).ToList();
}
''')

with open('backend/src/CurioMap.Api/Controllers/ReadingCirclesController.cs', 'w', encoding='utf-8') as f:
    f.write('\n'.join(parts))
print('written', len('\n'.join(parts)))

parts.append(r'''    [HttpGet("/circles/{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<CircleDetailDto>> Get(string id)
    {
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        if (circle.IsArchived) throw new AppException(404, "Circle not found.");
        var members = await db.CircleMemberships.AsNoTracking().Include(m => m.User).Where(m => m.CircleId == circle.Id).OrderBy(m => m.JoinedAt).ToListAsync();
        var memberDtos = members.Select(m => new CircleMemberDto(m.UserId, m.User!.Handle, m.User.AvatarId, DisplayName.Resolve(m.User.DisplayNameMode, m.User.RealName, m.User.Handle), m.User.IsAuthor, m.Role.ToString(), m.JoinedAt)).ToList();
        var recent = await db.CircleMessages.AsNoTracking().Include(m => m.Author).Where(m => m.CircleId == circle.Id && m.Status == MessageStatus.Visible).OrderByDescending(m => m.CreatedAt).Take(20).ToListAsync();
        var rids = recent.Select(m => m.Id).ToList();
        var reactions = rids.Count == 0 ? new List<CircleReaction>() : await db.CircleReactions.AsNoTracking().Where(r => rids.Contains(r.MessageId)).ToListAsync();
        var messageDtos = recent.Select(m => new CircleMessageDto(m.Id, m.CircleId, Mapping.ToStub(m.Author!), m.Content, m.Status.ToApi(), m.CreatedAt, ReactionsFor(reactions, m.Id, me.UserId))).ToList();
        var circleDto = new CircleDto(circle.Id, circle.Handle, circle.Name, circle.Description, circle.Book is null ? null : Mapping.ToStub(circle.Book), circle.MaxMembers, circle.NextMeetingAt, Mapping.ToStub(circle.Creator!), memberDtos.Count, messageDtos.Count, circle.CreatedAt, circle.LastActivityAt);
        return Ok(new CircleDetailDto(circleDto, memberDtos, messageDtos));
    }
''')

parts.append(r'''    [HttpPost("/circles")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<CircleDto>> Create(CreateCircleRequest request)
    {
        var userId = me.RequireUserId();
        if (request.BookId.HasValue && !await db.Books.AnyAsync(b => b.Id == request.BookId.Value))
            throw new AppException(404, "Book not found.");
        var circle = new ReadingCircle
        {
            Handle = await GenerateHandleAsync(request.Name),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            BookId = request.BookId,
            MaxMembers = request.MaxMembers,
            NextMeetingAt = request.NextMeetingAt,
            CreatedBy = userId,
        };
        db.ReadingCircles.Add(circle);
        db.CircleMemberships.Add(new CircleMembership { CircleId = circle.Id, UserId = userId, Role = CircleRole.Moderator });
        await db.SaveChangesAsync();
        await db.Entry(circle).Reference(c => c.Creator).LoadAsync();
        if (circle.BookId.HasValue) await db.Entry(circle).Reference(c => c.Book).LoadAsync();
        var cs = circle.Creator is null ? new UserStubDto(userId, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(circle.Creator);
        var bs = circle.Book is null ? null : Mapping.ToStub(circle.Book);
        return CreatedAtAction(nameof(Get), new { id = circle.Handle },
            new CircleDto(circle.Id, circle.Handle, circle.Name, circle.Description, bs, circle.MaxMembers, circle.NextMeetingAt, cs, 1, 0, circle.CreatedAt, circle.LastActivityAt));
    }

    [HttpPost("/circles/{id}/join")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult> Join(string id)
    {
        var userId = me.RequireUserId();
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        if (circle.IsArchived) throw new AppException(410, "This circle is archived.");
        if (await db.CircleMemberships.AnyAsync(m => m.CircleId == circle.Id && m.UserId == userId)) return Ok();
        var count = await db.CircleMemberships.CountAsync(m => m.CircleId == circle.Id);
        if (circle.MaxMembers.HasValue && count >= circle.MaxMembers.Value) throw new AppException(409, "This circle is full.");
        db.CircleMemberships.Add(new CircleMembership { CircleId = circle.Id, UserId = userId });
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("/circles/{id}/leave")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult> Leave(string id)
    {
        var userId = me.RequireUserId();
        var circle = await LoadCircleAsync(id) ?? throw new AppException(404, "Circle not found.");
        var membership = await db.CircleMemberships.FirstOrDefaultAsync(m => m.CircleId == circle.Id && m.UserId == userId);
        if (membership is null) return Ok();
        db.CircleMemberships.Remove(membership);
        if (membership.Role == CircleRole.Moderator)
        {
            var next = await db.CircleMemberships.Where(m => m.CircleId == circle.Id).OrderBy(m => m.JoinedAt).FirstOrDefaultAsync();
            if (next is not null) next.Role = CircleRole.Moderator;
        }
        await db.SaveChangesAsync();
        return Ok();
    }
''')

import os
os.makedirs('backend/src/CurioMap.Api/Controllers', exist_ok=True)
parts = []

parts.append(r'''using CurioMap.Api.Auth;
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
    IRedisRateLimiter limiter) : ControllerBase
{
    private async Task<ReadingCircle?> LoadCircleAsync(string id)
    {
        if (Guid.TryParse(id, out var guid))
        {
            return await db.ReadingCircles
                .Include(c => c.Creator).Include(c => c.Book)
                .FirstOrDefaultAsync(c => c.Id == guid);
        }
        return await db.ReadingCircles
            .Include(c => c.Creator).Include(c => c.Book)
            .FirstOrDefaultAsync(c => c.Handle == id);
    }

    [HttpGet("/circles")]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<CircleDto>>> List(
        [FromQuery] string? q, [FromQuery] Guid? bookId,
        [FromQuery] string sort = "recent",
        [FromQuery] int limit = 30, [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(0, offset);
        var query = db.ReadingCircles.AsNoTracking().Include(c => c.Creator).Include(c => c.Book).Where(c => !c.IsArchived);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = $"%{q.Trim().ToLower()}%";
            query = query.Where(c => EF.Functions.ILike(c.Name, needle) || EF.Functions.ILike(c.Handle, needle));
        }
        if (bookId.HasValue) query = query.Where(c => c.BookId == bookId.Value);
        query = sort.ToLowerInvariant() switch { "members" => query.OrderByDescending(c => c.Members.Count), _ => query.OrderByDescending(c => c.LastActivityAt) };
        var total = await query.CountAsync();
        var circles = await query.Skip(offset).Take(limit).ToListAsync();
        var ids = circles.Select(c => c.Id).ToList();
        var mc = await db.CircleMemberships.AsNoTracking().Where(m => ids.Contains(m.CircleId)).GroupBy(m => m.CircleId).Select(g => new { g.Key, C = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.C);
        var msgc = await db.CircleMessages.AsNoTracking().Where(m => ids.Contains(m.CircleId) && m.Status == MessageStatus.Visible).GroupBy(m => m.CircleId).Select(g => new { g.Key, C = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.C);
        var items = circles.Select(c => new CircleDto(c.Id, c.Handle, c.Name, c.Description, c.Book is null ? null : Mapping.ToStub(c.Book), c.MaxMembers, c.NextMeetingAt, Mapping.ToStub(c.Creator!), mc.GetValueOrDefault(c.Id), msgc.GetValueOrDefault(c.Id), c.CreatedAt, c.LastActivityAt)).ToList();
        return Ok(new PagedResult<CircleDto>(items, total, limit, offset));
    }
''')

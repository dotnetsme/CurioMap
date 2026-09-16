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

[ApiController]
public class ConversationsController(
    AppDbContext db,
    CurrentUser me,
    ProfanityFilter profanity,
    IRedisRateLimiter limiter,
    ActivityService activity,
    IStreakService streak,
    IOptions<ConversationOptions> conversationOptions) : ControllerBase
{
    private DateTime Cutoff => DateTime.UtcNow.AddDays(-conversationOptions.Value.AutoArchiveDays);

    [HttpGet("/books/{bookId:guid}/conversations")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<ConversationDto>>> ListForBook(
        Guid bookId,
        [FromQuery] bool includeArchived = false,
        [FromQuery] int limit = 30,
        [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 50);
        offset = Math.Max(0, offset);

        var book = await db.Books.AsNoTracking().FirstOrDefaultAsync(b => b.Id == bookId)
            ?? throw new AppException(404, "Book not found.");

        // Read-only: staleness is derived in memory (archived flag or past the
        // cutoff). Persistence happens on write paths + the hourly archiver.
        var query = db.Conversations.AsNoTracking()
            .Include(c => c.Creator)
            .Where(c => c.BookId == bookId && (includeArchived || !c.IsArchived));

        var total = await query.CountAsync();
        var conversations = await query
            .OrderByDescending(c => c.LastActivityAt)
            .Skip(offset).Take(limit)
            .ToListAsync();

        var ids = conversations.Select(c => c.Id).ToList();
        var counts = await db.Messages.AsNoTracking()
            .Where(m => ids.Contains(m.ConversationId) && m.Status == MessageStatus.Visible)
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ConversationId, x => x.Count);

        var cutoff = Cutoff;
        var items = conversations.Select(c => new ConversationDto(
            c.Id, c.BookId, c.DraftId,
            c.TopicType.ToApi(),
            c.Title,
            c.PromptKey,
            c.Creator is null ? new UserStubDto(c.CreatedBy, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(c.Creator),
            c.IsArchived || c.LastActivityAt < cutoff,
            counts.GetValueOrDefault(c.Id),
            c.CreatedAt,
            c.LastActivityAt,
            Mapping.ToStub(book))).ToList();

        return Ok(new PagedResult<ConversationDto>(items, total, limit, offset));
    }

    [HttpPost("/books/{bookId:guid}/conversations")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<ConversationDto>> CreateForBook(Guid bookId, CreateConversationRequest? request)
    {
        var book = await db.Books.FirstOrDefaultAsync(b => b.Id == bookId)
            ?? throw new AppException(404, "Book not found.");

        if (request is null)
        {
            throw new AppException(400, "A title and topic type are required.");
        }
        if (!EnumStrings.TryParseEnum<TopicType>(request.TopicType, out var topicType))
        {
            throw new AppException(400, "Unknown topic type. Use general, chapter, theme or question.");
        }
        if (request.PromptKey is not null && !Prompts.Exists(request.PromptKey))
        {
            throw new AppException(400, "Unknown prompt key.");
        }

        var title = request.Title.Trim();
        if (title.Length < 3 || title.Length > 200)
        {
            throw new AppException(400, "Title must be 3–200 characters.");
        }
        if (profanity.ContainsProfanity(title))
        {
            throw new AppException(400, "Conversation title was flagged by the auto-filter. Please rephrase.");
        }

        var userId = me.RequireUserId();
        var author = await db.Users.FirstAsync(u => u.Id == userId);

        var conversation = new Conversation
        {
            BookId = bookId,
            TopicType = topicType,
            Title = title,
            PromptKey = request.PromptKey,
            CreatedBy = author.Id,
        };
        db.Conversations.Add(conversation);
        activity.RecordConversationCreated(author, book, conversation);
        await db.SaveChangesAsync();

        return Ok(new ConversationDto(
            conversation.Id, bookId, null, topicType.ToApi(), title, request.PromptKey,
            Mapping.ToStub(author), false, 0, conversation.CreatedAt, conversation.LastActivityAt,
            Mapping.ToStub(book)));
    }

    [HttpGet("conversations/{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<ConversationDto>> Detail(Guid id)
    {
        var conversation = await db.Conversations.AsNoTracking()
            .Include(c => c.Book)
            .Include(c => c.Creator)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new AppException(404, "Conversation not found.");

        // Read-only: never persist here — staleness is derived for display.
        var archived = conversation.IsArchived || conversation.LastActivityAt < Cutoff;

        var count = await db.Messages.AsNoTracking()
            .CountAsync(m => m.ConversationId == id && m.Status == MessageStatus.Visible);

        return Ok(new ConversationDto(
            conversation.Id, conversation.BookId, conversation.DraftId,
            conversation.TopicType.ToApi(),
            conversation.Title,
            conversation.PromptKey,
            conversation.Creator is null ? new UserStubDto(conversation.CreatedBy, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(conversation.Creator),
            archived,
            count,
            conversation.CreatedAt,
            conversation.LastActivityAt,
            conversation.Book is null ? null : Mapping.ToStub(conversation.Book)));
    }

    [HttpGet("conversations/{id:guid}/messages")]
    [AllowAnonymous]
    public async Task<ActionResult<MessagesPage<MessageDto>>> Messages(
        Guid id,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        limit = Math.Clamp(limit, 1, 50);
        offset = Math.Max(0, offset);

        if (!await db.Conversations.AnyAsync(c => c.Id == id))
        {
            throw new AppException(404, "Conversation not found.");
        }

        // Moderation audit state: muted/deleted messages are excluded from the
        // public thread (AGENTS §2.4.2) — not merely blanked out.
        var query = db.Messages.AsNoTracking()
            .Where(m => m.ConversationId == id && m.Status == MessageStatus.Visible);
        var total = await query.CountAsync();
        var page = await query
            .OrderBy(m => m.CreatedAt)
            .Skip(offset).Take(limit)
            .Include(m => m.Author)
            .ToListAsync();

        var ids = page.Select(m => m.Id).ToList();
        var reactions = ids.Count == 0
            ? []
            : await db.MessageReactions.AsNoTracking().Where(r => ids.Contains(r.MessageId)).ToListAsync();
        var mineId = me.UserId;

        var items = page.Select(m => new MessageDto(
            m.Id,
            m.ConversationId,
            m.Author is null ? new UserStubDto(m.AuthorId, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(m.Author),
            m.Content,
            m.Status.ToApi(),
            m.CreatedAt,
            ReactionsFor(reactions, m.Id, mineId))).ToList();

        return Ok(new MessagesPage<MessageDto>(items, total, limit, offset));
    }

    [HttpPost("conversations/{id:guid}/messages")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<MessageDto>> PostMessage(Guid id, CreateMessageRequest? request)
    {
        var conversation = await db.Conversations
            .Include(c => c.Book)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new AppException(404, "Conversation not found.");

        var cutoff = Cutoff;
        if (conversation.IsArchived || conversation.LastActivityAt < cutoff)
        {
            throw new AppException(400, "This conversation is archived.");
        }

        if (request is null || string.IsNullOrWhiteSpace(request.Content))
        {
            throw new AppException(400, "Message cannot be empty.");
        }
        var content = request.Content.Trim();

        var userId = me.RequireUserId();
        if (!await limiter.IsAllowedAsync("messages", userId.ToString(), 15, TimeSpan.FromMinutes(1)))
        {
            throw new AppException(429, "You're posting too fast. Take a breath.");
        }

        if (profanity.ContainsProfanity(content))
        {
            throw new AppException(400, "Your message was flagged by the auto-filter. Please rephrase.");
        }

        var author = await db.Users.FirstAsync(u => u.Id == userId);
        var message = new Message
        {
            ConversationId = id,
            AuthorId = author.Id,
            Content = content,
            Status = MessageStatus.Visible,
        };
        db.Messages.Add(message);
        // Opportunistic persistence: posting revives the thread, and a stale-but-unflagged
        // thread that receives a post must not stay archived (covers the window before
        // the hourly archiver runs). Posting to a stale thread is already rejected above.
        conversation.IsArchived = false;
        conversation.LastActivityAt = DateTime.UtcNow;
        activity.RecordMessagePosted(author, conversation, conversation.Book, message);
        await db.SaveChangesAsync();

        try
        {
            await streak.RecordActivityAsync(userId, StreakActivity.DirectMessage);
        }
        catch
        {
            // Gamification is best-effort; never fail the message send.
        }

        return Ok(new MessageDto(
            message.Id, id, Mapping.ToStub(author), content, message.Status.ToApi(), message.CreatedAt, []));
    }

    private static List<ReactionSummaryDto> ReactionsFor(List<MessageReaction> all, Guid messageId, Guid? mineId) =>
        all.Where(r => r.MessageId == messageId)
            .GroupBy(r => r.Kind)
            .Select(g => new ReactionSummaryDto(
                g.Key.ToApi(),
                g.Count(),
                mineId is not null && g.Any(x => x.UserId == mineId)))
            .OrderBy(r => r.Kind)
            .ToList();
}

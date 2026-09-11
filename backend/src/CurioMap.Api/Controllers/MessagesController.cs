using System.ComponentModel.DataAnnotations;
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
[Route("messages")]
public class MessagesController(AppDbContext db, CurrentUser me) : ControllerBase
{
    [HttpPost("{id:guid}/report")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<ReportCreatedDto>> Report(Guid id, ReportRequest request)
    {
        if (!await db.Messages.AnyAsync(m => m.Id == id))
        {
            throw new AppException(404, "Message not found.");
        }

        var reporterId = me.RequireUserId();
        if (await db.MessageReports.AnyAsync(r => r.MessageId == id && r.ReporterId == reporterId))
        {
            throw new AppException(409, "You already reported this message.");
        }

        var report = new MessageReport
        {
            MessageId = id,
            ReporterId = reporterId,
            Reason = request.Reason.Trim(),
            Status = ReportStatus.Open,
        };
        db.MessageReports.Add(report);
        await db.SaveChangesAsync();

        return Ok(new ReportCreatedDto(report.Id, report.Status.ToApi()));
    }

    [HttpPatch("{id:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<MessageDto>> SetStatus(Guid id, SetMessageStatusRequest request)
    {
        if (!EnumStrings.TryParseEnum<MessageStatus>(request.Status, out var status))
        {
            throw new AppException(400, "Unknown status. Use visible, muted or deleted.");
        }

        var message = await db.Messages.AsNoTracking()
            .Include(m => m.Author)
            .FirstOrDefaultAsync(m => m.Id == id)
            ?? throw new AppException(404, "Message not found.");

        db.Messages.Where(m => m.Id == id).ExecuteUpdate(s =>
            s.SetProperty(m => m.Status, status));
        await db.SaveChangesAsync();

        return Ok(new MessageDto(
            message.Id,
            message.ConversationId,
            message.Author is null ? new UserStubDto(message.AuthorId, "unknown", "curio-01", "Reader", false) : Mapping.ToStub(message.Author),
            status == MessageStatus.Visible ? message.Content : "",
            status.ToApi(),
            message.CreatedAt,
            []));
    }

    [HttpPost("{id:guid}/reactions")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<ReactionResult>> React(Guid id, ReactRequest request)
    {
        if (!EnumStrings.TryParseEnum<ReactionKind>(request.Kind, out var kind))
        {
            throw new AppException(400, "Unknown reaction. Use insightful, funny or helpful.");
        }

        if (!await db.Messages.AnyAsync(m => m.Id == id))
        {
            throw new AppException(404, "Message not found.");
        }

        var userId = me.RequireUserId();
        var exists = await db.MessageReactions.AnyAsync(r => r.MessageId == id && r.UserId == userId && r.Kind == kind);
        if (!exists)
        {
            db.MessageReactions.Add(new MessageReaction { MessageId = id, UserId = userId, Kind = kind });
            await db.SaveChangesAsync();
        }

        return Ok(new ReactionResult(await Summarize(id, userId)));
    }

    [HttpDelete("{id:guid}/reactions")]
    [Authorize]
    public async Task<ActionResult<ReactionResult>> Unreact(Guid id, [FromQuery, Required, MaxLength(20)] string kind)
    {
        if (!EnumStrings.TryParseEnum<ReactionKind>(kind, out var parsed))
        {
            throw new AppException(400, "Unknown reaction. Use insightful, funny or helpful.");
        }

        var userId = me.RequireUserId();
        var reaction = await db.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == id && r.UserId == userId && r.Kind == parsed);
        if (reaction is not null)
        {
            db.MessageReactions.Remove(reaction);
            await db.SaveChangesAsync();
        }

        return Ok(new ReactionResult(await Summarize(id, userId)));
    }

    private async Task<List<ReactionSummaryDto>> Summarize(Guid messageId, Guid mineId)
    {
        var reactions = await db.MessageReactions.AsNoTracking()
            .Where(r => r.MessageId == messageId)
            .ToListAsync();
        return reactions
            .GroupBy(r => r.Kind)
            .Select(g => new ReactionSummaryDto(g.Key.ToApi(), g.Count(), g.Any(x => x.UserId == mineId)))
            .OrderBy(r => r.Kind)
            .ToList();
    }
}

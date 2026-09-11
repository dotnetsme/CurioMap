using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CurioMap.Api.Controllers;

/// <summary>MVP moderation console endpoints (wired to /admin in the web app).</summary>
[ApiController]
[Route("admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("reports")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<IReadOnlyList<AdminReportDto>>> Reports([FromQuery] string status = "open")
    {
        var query = db.MessageReports.AsNoTracking()
            .Include(r => r.Message)
            .ThenInclude(m => m!.Author)
            .Include(r => r.Reporter)
            .AsQueryable();

        List<MessageReport> reports;
        if (status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            reports = await query.OrderByDescending(r => r.CreatedAt).Take(100).ToListAsync();
        }
        else
        {
            if (!EnumStrings.TryParseEnum<ReportStatus>(status, out var parsed))
            {
                throw new AppException(400, "Unknown status. Use open, resolved_actioned, resolved_dismissed or all.");
            }
            reports = await query
                .Where(r => r.Status == parsed)
                .OrderByDescending(r => r.CreatedAt)
                .Take(100)
                .ToListAsync();
        }

        var items = reports.Select(r => new AdminReportDto(
            r.Id,
            r.MessageId,
            r.Message?.ConversationId ?? Guid.Empty,
            r.Message is null ? "(message removed)" : r.Message.Content,
            r.Message is null ? "deleted" : r.Message.Status.ToApi(),
            r.Message?.Author is null
                ? new UserStubDto(r.Message?.AuthorId ?? Guid.Empty, "unknown", "curio-01", "Reader", false)
                : Mapping.ToStub(r.Message.Author),
            r.Reporter is null
                ? new UserStubDto(r.ReporterId, "unknown", "curio-01", "Reader", false)
                : Mapping.ToStub(r.Reporter),
            r.Reason,
            r.Status.ToApi(),
            r.CreatedAt)).ToList();

        return Ok(items);
    }

    [HttpPost("reports/{reportId:guid}/resolve")]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<ResolveReportResult>> Resolve(Guid reportId, ResolveReportRequest request)
    {
        var report = await db.MessageReports
            .Include(r => r.Message)
            .FirstOrDefaultAsync(r => r.Id == reportId)
            ?? throw new AppException(404, "Report not found.");

        switch (request.Action.Trim().ToLowerInvariant())
        {
            case "dismiss":
                report.Status = ReportStatus.ResolvedDismissed;
                break;
            case "remove_message":
                if (report.Message is not null)
                {
                    report.Message.Status = MessageStatus.Deleted;
                }
                report.Status = ReportStatus.ResolvedActioned;
                break;
            case "mute_message":
                if (report.Message is not null)
                {
                    report.Message.Status = MessageStatus.Muted;
                }
                report.Status = ReportStatus.ResolvedActioned;
                break;
            default:
                throw new AppException(400, "Unknown action. Use dismiss, remove_message or mute_message.");
        }

        await db.SaveChangesAsync();
        return Ok(new ResolveReportResult(true, report.Status.ToApi()));
    }
}

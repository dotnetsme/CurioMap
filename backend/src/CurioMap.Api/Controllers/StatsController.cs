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
[Route("stats")]
public class StatsController(AppDbContext db, ICacheService cache) : ControllerBase
{
    [HttpGet("summary")]
    [AllowAnonymous]
    public Task<StatsSummaryDto> Summary() =>
        cache.GetOrSetAsync("stats:summary", TimeSpan.FromMinutes(5), ComputeAsync);

    private async Task<StatsSummaryDto> ComputeAsync()
    {
        var readers = await db.Users.CountAsync();
        var books = await db.Books.CountAsync();
        var conversations = await db.Conversations.CountAsync(c => !c.IsArchived);
        var messages = await db.Messages.CountAsync(m => m.Status == MessageStatus.Visible);
        var activeRegions = await db.Users
            .Where(u => u.LocationId != null && u.LocationVisibility != LocationVisibility.Hidden)
            .Select(u => new { u.Location!.Country, u.Location!.Region })
            .Distinct()
            .CountAsync();

        var topRows = await db.BookshelfEntries.AsNoTracking()
            .Where(s => s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public
                        && s.User!.LocationVisibility != LocationVisibility.Hidden)
            .GroupBy(s => new { s.BookId, s.Book!.Title, s.Book!.Author, s.Book!.Isbn, s.Book!.CoverUrl })
            .Select(g => new { g.Key.BookId, g.Key.Title, g.Key.Author, g.Key.Isbn, g.Key.CoverUrl, ReaderCount = g.Count() })
            .ToListAsync();

        var top = topRows
            .OrderByDescending(r => r.ReaderCount)
            .ThenBy(r => r.Title)
            .Take(8)
            .Select(r => new TopBookDto(r.BookId, r.Title, r.Author, r.Isbn, r.CoverUrl, r.ReaderCount))
            .ToList();

        return new StatsSummaryDto(readers, books, conversations, messages, activeRegions, top);
    }
}

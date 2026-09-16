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
[Route("discover")]
public class DiscoverController(AppDbContext db, CurrentUser me, ICacheService cache) : ControllerBase
{
    [HttpGet("global")]
    [AllowAnonymous]
    public Task<GlobalDiscoveryDto> Global() =>
        cache.GetOrSetAsync("discover:global", TimeSpan.FromMinutes(5), ComputeGlobalAsync);

    [HttpGet("top-books")]
    [AllowAnonymous]
    public async Task<ActionResult<TopBooksDto>> TopBooks([FromQuery] string? country, [FromQuery] string? region)
    {
        country = country?.Trim();
        region = region?.Trim();

        if (string.IsNullOrEmpty(country) && string.IsNullOrEmpty(region))
        {
            var global = await cache.GetOrSetAsync("discover:global", TimeSpan.FromMinutes(5), ComputeGlobalAsync);
            var flat = global.Regions
                .SelectMany(r => r.TopBooks.Select(b => new { Book = b, r.ActiveReaders }))
                .GroupBy(x => x.Book.Id)
                .Select(g => new TopBookDto(g.First().Book.Id, g.First().Book.Title, g.First().Book.Author, g.First().Book.Isbn, g.First().Book.CoverUrl, g.Sum(x => x.ActiveReaders)))
                .OrderByDescending(b => b.ReaderCount)
                .Take(20)
                .ToList();
            return Ok(new TopBooksDto(null, null, flat));
        }

        var key = $"discover:top-books:{(country ?? "-").ToLowerInvariant()}:{(region ?? "-").ToLowerInvariant()}";
        var books = await cache.GetOrSetAsync(key, TimeSpan.FromMinutes(10),
            () => ComputeTopBooksAsync(country, region, 20));
        return Ok(new TopBooksDto(country, region, books));
    }

    /// <summary>
    /// Anonymous drill-down layer: individual readers at fuzzed (~15 km grid)
    /// coordinates for the on-map heat map. Honors location + shelf privacy and
    /// only ever returns users with a public "currently reading" book.
    /// </summary>
    [HttpGet("map-readers")]
    [AllowAnonymous]
    public Task<MapReadersDto> MapReaders(
        [FromQuery] string? country,
        [FromQuery] string? region,
        [FromQuery] int limit = 50)
    {
        limit = Math.Clamp(limit, 1, 50);
        country = country?.Trim();
        region = region?.Trim();

        var key = $"discover:map-readers:{(country ?? "-").ToLowerInvariant()}:"
                  + $"{(region ?? "-").ToLowerInvariant()}:{limit}";
        return cache.GetOrSetAsync(key, TimeSpan.FromMinutes(2),
            () => ComputeMapReadersAsync(country, region, limit));
    }

    [HttpGet("nearby")]
    [Authorize]
    public async Task<ActionResult<NearbyDto>> Nearby([FromQuery] int limit = 30)
    {
        limit = Math.Clamp(limit, 1, 50);
        var mine = await db.Users.AsNoTracking().Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId());

        if (mine?.Location is null)
        {
            throw new AppException(400, "Set your location in settings to discover readers near you.");
        }
        if (mine.LocationVisibility == LocationVisibility.Hidden)
        {
            throw new AppException(400, "Location discovery is disabled in your privacy settings.");
        }

        var loc = mine.Location;
        var scope = "country";

        IQueryable<User> Candidates() => db.Users.AsNoTracking()
            .Include(u => u.Location)
            .Where(u => u.Id != mine.Id
                        && u.LocationId != null
                        && u.LocationVisibility != LocationVisibility.Hidden
                        && u.BookshelfVisibility == ShelfVisibility.Public);

        List<User> found = [];
        if (loc.City != null)
        {
            found = await Candidates()
                .Where(u => u.Location!.City == loc.City && u.Location!.Country == loc.Country)
                .OrderBy(u => u.Handle)
                .Take(limit)
                .ToListAsync();
            if (found.Count > 0)
            {
                scope = "city";
            }
        }

        if (found.Count == 0 && loc.Region != null)
        {
            found = await Candidates()
                .Where(u => u.Location!.Region == loc.Region && u.Location!.Country == loc.Country)
                .OrderBy(u => u.Handle)
                .Take(limit)
                .ToListAsync();
            if (found.Count > 0)
            {
                scope = "region";
            }
        }

        if (found.Count == 0 && loc.Country != null)
        {
            found = await Candidates()
                .Where(u => u.Location!.Country == loc.Country)
                .OrderBy(u => u.Handle)
                .Take(limit)
                .ToListAsync();
        }

        var readerIds = found.Select(u => u.Id).ToList();
        var shelves = await db.BookshelfEntries.AsNoTracking()
            .Include(s => s.Book)
            .Where(s => readerIds.Contains(s.UserId)
                        && s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public)
            .ToListAsync();

        var readers = found
            .Select(u => (User: u, Location: Mapping.ToPublicLocation(u)))
            .Where(x => x.Location is not null)
            .Select(x => new NearbyReaderDto(
            Mapping.ToStub(x.User),
            x.Location!,
            shelves.Where(s => s.UserId == x.User.Id && s.Book != null).Select(s => Mapping.ToStub(s.Book!)).ToList()
        )).ToList();

        return Ok(new NearbyDto(scope, readers));
    }


    private async Task<MapReadersDto> ComputeMapReadersAsync(string? country, string? region, int limit)
    {
        var readersQuery = db.Users.AsNoTracking()
            .Where(u => u.LocationId != null
                        && u.LocationVisibility != LocationVisibility.Hidden
                        && u.BookshelfVisibility == ShelfVisibility.Public
                        && u.Location!.LatFuzzed != null
                        && u.Location!.LngFuzzed != null
                        && u.BookshelfEntries.Any(s => s.Status == BookStatus.Reading
                                                       && s.Visibility == ShelfVisibility.Public));

        if (!string.IsNullOrEmpty(country))
        {
            readersQuery = readersQuery.Where(u => u.Location!.Country == country);
        }
        if (!string.IsNullOrEmpty(region))
        {
            readersQuery = readersQuery.Where(u => u.Location!.Region == region);
        }

        var rows = await readersQuery
            .OrderBy(u => u.Handle)
            .Take(limit)
            .Select(u => new
            {
                u.Id,
                u.Handle,
                u.AvatarId,
                u.DisplayNameMode,
                u.RealName,
                u.IsAuthor,
                u.LocationVisibility,
                Country = u.Location!.Country,
                Region = u.Location!.Region,
                City = u.Location!.City,
                Lat = u.Location!.LatFuzzed!.Value,
                Lng = u.Location!.LngFuzzed!.Value,
            })
            .ToListAsync();

        var ids = rows.Select(r => r.Id).ToList();
        var shelves = await db.BookshelfEntries.AsNoTracking()
            .Include(s => s.Book)
            .Where(s => ids.Contains(s.UserId)
                        && s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public)
            .ToListAsync();

        var bookGroups = shelves
            .Where(s => s.Book != null)
            .GroupBy(s => s.UserId)
            .ToDictionary(g => g.Key, g => g.Select(s => Mapping.ToStub(s.Book!)).ToList());

        var readers = rows
            .Where(r => bookGroups.ContainsKey(r.Id))
            .Select(r =>
            {
                var handle = r.DisplayNameMode == DisplayMode.Anonymous ? "anonymous" : r.Handle;
                var region = r.LocationVisibility == LocationVisibility.Country ? null : r.Region;
                var city = r.LocationVisibility == LocationVisibility.Country ? null : r.City;
                return new MapReaderDto(
                new UserStubDto(r.Id, handle, r.AvatarId,
                    DisplayName.Resolve(r.DisplayNameMode, r.RealName, r.Handle), r.IsAuthor),
                r.Country,
                region,
                city,
                r.Lat,
                r.Lng,
                bookGroups.GetValueOrDefault(r.Id, []));
            })
            .ToList();

        return new MapReadersDto(country, region, readers.Count, readers);
    }


    private async Task<GlobalDiscoveryDto> ComputeGlobalAsync()
    {
        var readerRows = await db.Users.AsNoTracking()
            .Where(u => u.LocationId != null
                        && u.LocationVisibility != LocationVisibility.Hidden
                        && u.BookshelfVisibility == ShelfVisibility.Public)
            .Select(u => new
            {
                Country = u.Location!.Country ?? "",
                u.LocationVisibility,
                Region = u.Location!.Region ?? "",
                u.Location!.LatFuzzed,
                u.Location!.LngFuzzed,
            })
            .ToListAsync();

        var shelfRows = await db.BookshelfEntries.AsNoTracking()
            .Where(s => s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.LocationId != null
                        && s.User!.LocationVisibility != LocationVisibility.Hidden
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public)
            .Select(s => new
            {
                s.BookId,
                s.Book!.Title,
                s.Book!.Author,
                s.Book!.Isbn,
                s.Book!.CoverUrl,
                Country = s.User!.Location!.Country ?? "",
                s.User!.LocationVisibility,
                Region = s.User!.Location!.Region ?? "",
            })
            .ToListAsync();

        // Country-only visibility must never surface a region name: bucket those
        // readers under an empty region so aggregation cannot leak it.
        static string Redact(string region, LocationVisibility visibility) =>
            visibility == LocationVisibility.Country ? "" : region;

        var topBooksByRegion = shelfRows
            .GroupBy(r => (r.Country, Region: Redact(r.Region, r.LocationVisibility)))
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(x => x.BookId)
                    .Select(bg => new TopBookDto(
                        bg.Key,
                        bg.First().Title,
                        bg.First().Author,
                        bg.First().Isbn,
                        bg.First().CoverUrl,
                        bg.Count()))
                    .OrderByDescending(b => b.ReaderCount)
                    .ThenBy(b => b.Title)
                    .Take(5)
                    .Select(b => new BookStubDto(b.Id, b.Title, b.Author, b.Isbn, b.CoverUrl))
                    .ToList());

        var regions = readerRows
            .GroupBy(r => (r.Country, Region: Redact(r.Region, r.LocationVisibility)))
            .Select(g => new RegionStatDto(
                g.Key.Country,
                g.Key.Region,
                g.Count(),
                Avg(g.Select(x => x.LatFuzzed)),
                Avg(g.Select(x => x.LngFuzzed)),
                topBooksByRegion.GetValueOrDefault(g.Key, [])))
            .OrderByDescending(r => r.ActiveReaders)
            .ThenBy(r => r.Country)
            .ToList();

        return new GlobalDiscoveryDto(regions, regions.Count, DateTime.UtcNow);
    }

    private async Task<List<TopBookDto>> ComputeTopBooksAsync(string? country, string? region, int take)
    {
        take = Math.Clamp(take, 1, 50);
        var query = db.BookshelfEntries.AsNoTracking()
            .Where(s => s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public
                        && s.User!.LocationVisibility != LocationVisibility.Hidden);

        if (!string.IsNullOrEmpty(country))
        {
            query = query.Where(s => s.User!.Location!.Country == country);
        }
        if (!string.IsNullOrEmpty(region))
        {
            query = query.Where(s => s.User!.Location!.Region == region);
        }

        var rows = await query
            .GroupBy(s => new { s.BookId, s.Book!.Title, s.Book!.Author, s.Book!.Isbn, s.Book!.CoverUrl })
            .Select(g => new { g.Key.BookId, g.Key.Title, g.Key.Author, g.Key.Isbn, g.Key.CoverUrl, ReaderCount = g.Count() })
            .ToListAsync();

        return rows
            .OrderByDescending(r => r.ReaderCount)
            .ThenBy(r => r.Title)
            .Take(take)
            .Select(r => new TopBookDto(r.BookId, r.Title, r.Author, r.Isbn, r.CoverUrl, r.ReaderCount))
            .ToList();
    }

    private static double? Avg(IEnumerable<double?> values)
    {
        var list = values.Where(v => v.HasValue).Select(v => v.GetValueOrDefault()).ToList();
        return list.Count == 0 ? null : Math.Round(list.Average(), 2);
    }
}

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
    [HttpGet("topics")]
    [AllowAnonymous]
    public Task<IReadOnlyList<TopicStatDto>> Topics() =>
        cache.GetOrSetAsync("discover:topics", TimeSpan.FromMinutes(5), ComputeTopicsAsync);

    [HttpGet("global")]
    [AllowAnonymous]
    public Task<GlobalDiscoveryDto> Global([FromQuery] string? topic)
    {
        topic = topic?.Trim();
        var key = $"discover:global:{(string.IsNullOrEmpty(topic) ? "-" : topic.ToLowerInvariant())}";
        return cache.GetOrSetAsync(key, TimeSpan.FromMinutes(5), () => ComputeGlobalAsync(topic));
    }

    [HttpGet("top-books")]
    [AllowAnonymous]
    public async Task<ActionResult<TopBooksDto>> TopBooks(
        [FromQuery] string? country,
        [FromQuery] string? region,
        [FromQuery] string? topic)
    {
        country = country?.Trim();
        region = region?.Trim();
        topic = topic?.Trim();

        if (string.IsNullOrEmpty(country) && string.IsNullOrEmpty(region))
        {
            var global = await cache.GetOrSetAsync(
                $"discover:global:{(string.IsNullOrEmpty(topic) ? "-" : topic.ToLowerInvariant())}",
                TimeSpan.FromMinutes(5),
                () => ComputeGlobalAsync(topic));

            var flat = global.Regions
                .SelectMany(r => r.TopBooks.Select(b => new { Book = b, r.ActiveReaders }))
                .GroupBy(x => x.Book.Id)
                .Select(g => new TopBookDto(
                    g.First().Book.Id,
                    g.First().Book.Title,
                    g.First().Book.Author,
                    g.First().Book.Isbn,
                    g.First().Book.CoverUrl,
                    g.Sum(x => x.ActiveReaders),
                    g.First().Book.Topic))
                .OrderByDescending(b => b.ReaderCount)
                .Take(20)
                .ToList();
            return Ok(new TopBooksDto(null, null, flat));
        }

        var key = $"discover:top-books:{(country ?? "-").ToLowerInvariant()}:"
                  + $"{(region ?? "-").ToLowerInvariant()}:"
                  + $"{(topic ?? "-").ToLowerInvariant()}";
        var books = await cache.GetOrSetAsync(key, TimeSpan.FromMinutes(10),
            () => ComputeTopBooksAsync(country, region, topic, 20));
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
        [FromQuery] string? topic,
        [FromQuery] int limit = 50)
    {
        limit = PageBounds.ClampPageSize(limit);
        country = country?.Trim();
        region = region?.Trim();
        topic = topic?.Trim();

        var key = $"discover:map-readers:{(country ?? "-").ToLowerInvariant()}:"
                  + $"{(region ?? "-").ToLowerInvariant()}:"
                  + $"{(topic ?? "-").ToLowerInvariant()}:{limit}";
        return cache.GetOrSetAsync(key, TimeSpan.FromMinutes(2),
            () => ComputeMapReadersAsync(country, region, topic, limit));
    }

    [HttpGet("nearby")]
    [Authorize]
    public async Task<ActionResult<NearbyDto>> Nearby([FromQuery] int limit = 30)
    {
        limit = PageBounds.ClampPageSize(limit);
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


    private async Task<IReadOnlyList<TopicStatDto>> ComputeTopicsAsync()
    {
        var rows = await db.BookshelfEntries.AsNoTracking()
            .Where(s => s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public
                        && s.User!.LocationVisibility != LocationVisibility.Hidden
                        && s.Book!.Topic != null)
            .GroupBy(s => s.Book!.Topic!)
            .Select(g => new { Topic = g.Key, ReaderCount = g.Count() })
            .OrderByDescending(t => t.ReaderCount)
            .ThenBy(t => t.Topic)
            .ToListAsync();

        return rows
            .Select(r => new TopicStatDto(r.Topic, r.ReaderCount))
            .ToList();
    }

    private async Task<MapReadersDto> ComputeMapReadersAsync(string? country, string? region, string? topic, int limit)
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
        if (!string.IsNullOrEmpty(topic))
        {
            var loweredTopic = topic.ToLower();
            readersQuery = readersQuery.Where(u => u.BookshelfEntries.Any(s =>
                s.Status == BookStatus.Reading
                && s.Visibility == ShelfVisibility.Public
                && s.Book!.Topic != null
                && s.Book.Topic.ToLower() == loweredTopic));
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
        var shelfQuery = db.BookshelfEntries.AsNoTracking()
            .Include(s => s.Book)
            .Where(s => ids.Contains(s.UserId)
                        && s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public);

        if (!string.IsNullOrEmpty(topic))
        {
            var loweredTopic = topic.ToLower();
            shelfQuery = shelfQuery.Where(s => s.Book!.Topic != null && s.Book.Topic.ToLower() == loweredTopic);
        }

        var shelves = await shelfQuery.ToListAsync();

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


    private async Task<GlobalDiscoveryDto> ComputeGlobalAsync(string? topic)
    {
        var usersQuery = db.Users.AsNoTracking()
            .Where(u => u.LocationId != null
                        && u.LocationVisibility != LocationVisibility.Hidden
                        && u.BookshelfVisibility == ShelfVisibility.Public);

        var shelfQuery = db.BookshelfEntries.AsNoTracking()
            .Where(s => s.Status == BookStatus.Reading
                        && s.Visibility == ShelfVisibility.Public
                        && s.User!.LocationId != null
                        && s.User!.LocationVisibility != LocationVisibility.Hidden
                        && s.User!.BookshelfVisibility == ShelfVisibility.Public);

        if (!string.IsNullOrEmpty(topic))
        {
            var loweredTopic = topic.ToLower();
            usersQuery = usersQuery.Where(u => u.BookshelfEntries.Any(s =>
                s.Status == BookStatus.Reading
                && s.Visibility == ShelfVisibility.Public
                && s.Book!.Topic != null
                && s.Book.Topic.ToLower() == loweredTopic));

            shelfQuery = shelfQuery.Where(s => s.Book!.Topic != null && s.Book.Topic.ToLower() == loweredTopic);
        }

        var regionGroups = await usersQuery
            .GroupBy(u => new
            {
                Country = u.Location!.Country ?? "",
                Region = u.LocationVisibility == LocationVisibility.Country ? "" : (u.Location!.Region ?? "")
            })
            .Select(g => new
            {
                g.Key.Country,
                g.Key.Region,
                ActiveReaders = g.Count(),
                AvgLat = g.Average(u => u.Location!.LatFuzzed),
                AvgLng = g.Average(u => u.Location!.LngFuzzed)
            })
            .OrderByDescending(r => r.ActiveReaders)
            .ThenBy(r => r.Country)
            .ToListAsync();

        var topBookRows = await shelfQuery
            .GroupBy(s => new
            {
                Country = s.User!.Location!.Country ?? "",
                Region = s.User!.LocationVisibility == LocationVisibility.Country ? "" : (s.User!.Location!.Region ?? ""),
                s.BookId,
                s.Book!.Title,
                s.Book!.Author,
                s.Book!.Isbn,
                s.Book!.CoverUrl,
                s.Book!.Topic
            })
            .Select(g => new
            {
                g.Key.Country,
                g.Key.Region,
                g.Key.BookId,
                g.Key.Title,
                g.Key.Author,
                g.Key.Isbn,
                g.Key.CoverUrl,
                g.Key.Topic,
                ReaderCount = g.Count()
            })
            .OrderByDescending(x => x.ReaderCount)
            .ThenBy(x => x.Title)
            .ToListAsync();

        var topBooksByRegion = topBookRows
            .GroupBy(r => (r.Country, r.Region))
            .ToDictionary(
                g => g.Key,
                g => g.Take(5)
                    .Select(b => new BookStubDto(b.BookId, b.Title, b.Author, b.Isbn, b.CoverUrl, b.Topic))
                    .ToList());

        var regions = regionGroups
            .Select(g => new RegionStatDto(
                g.Country,
                g.Region,
                g.ActiveReaders,
                g.AvgLat.HasValue ? Math.Round(g.AvgLat.Value, 2) : null,
                g.AvgLng.HasValue ? Math.Round(g.AvgLng.Value, 2) : null,
                topBooksByRegion.GetValueOrDefault((g.Country, g.Region), [])))
            .ToList();

        return new GlobalDiscoveryDto(regions, regions.Count, DateTime.UtcNow);
    }

    private async Task<List<TopBookDto>> ComputeTopBooksAsync(string? country, string? region, string? topic, int take)
    {
        take = PageBounds.ClampPageSize(take);
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
        if (!string.IsNullOrEmpty(topic))
        {
            var loweredTopic = topic.ToLower();
            query = query.Where(s => s.Book!.Topic != null && s.Book.Topic.ToLower() == loweredTopic);
        }

        var rows = await query
            .GroupBy(s => new { s.BookId, s.Book!.Title, s.Book!.Author, s.Book!.Isbn, s.Book!.CoverUrl, s.Book!.Topic })
            .Select(g => new { g.Key.BookId, g.Key.Title, g.Key.Author, g.Key.Isbn, g.Key.CoverUrl, g.Key.Topic, ReaderCount = g.Count() })
            .OrderByDescending(r => r.ReaderCount)
            .ThenBy(r => r.Title)
            .Take(take)
            .ToListAsync();

        return rows
            .Select(r => new TopBookDto(r.BookId, r.Title, r.Author, r.Isbn, r.CoverUrl, r.ReaderCount, r.Topic))
            .ToList();
    }
}

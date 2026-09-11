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

namespace CurioMap.Api.Controllers;

[ApiController]
[Route("geo")]
public class GeoController(AppDbContext db, CurrentUser me, GeoResolveService geoResolver) : ControllerBase
{
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<LocationDto>> MyLocation()
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");
        return Ok(Mapping.ToSelfLocation(user));
    }

    [HttpPatch("me")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<LocationDto>> UpdateLocation(UpdateLocationRequest request)
    {
        var user = await db.Users.Include(u => u.Location)
            .FirstOrDefaultAsync(u => u.Id == me.RequireUserId())
            ?? throw new AppException(404, "User not found.");

        var country = NullIfEmpty(request.Country);
        var region = NullIfEmpty(request.Region);
        var city = NullIfEmpty(request.City);

        if (country is null && region is null && city is null)
        {
            user.LocationId = null;
            user.Location = null;
            await db.SaveChangesAsync();
            return Ok(null);
        }

        // Best-effort coordinate resolution → immediately fuzzed. Exact coords are discarded.
        (double Lat, double Lng)? coords = null;
        if (city is not null)
        {
            coords = await geoResolver.ResolveCityAsync(country, region, city);
        }

        (double? latFuzzed, double? lngFuzzed) = (null, null);
        if (coords is { } resolved)
        {
            var fuzzed = GeoFuzz.Fuzz(resolved.Lat, resolved.Lng);
            latFuzzed = fuzzed.Lat;
            lngFuzzed = fuzzed.Lng;
        }

        var location = await db.Locations.FirstOrDefaultAsync(l =>
            (l.Country ?? "") == (country ?? "")
            && (l.Region ?? "") == (region ?? "")
            && (l.City ?? "") == (city ?? ""));

        if (location is null)
        {
            location = new Location
            {
                Country = country,
                Region = region,
                City = city,
                LatFuzzed = latFuzzed,
                LngFuzzed = lngFuzzed,
            };
            db.Locations.Add(location);
        }
        else if (coords is not null && location.LatFuzzed is null)
        {
            location.LatFuzzed = latFuzzed;
            location.LngFuzzed = lngFuzzed;
        }

        user.Location = location;
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Concurrent first-resident race on the unique tuple — reload and attach.
            await db.Entry(user).ReloadAsync();
            location = await db.Locations.FirstAsync(l =>
                (l.Country ?? "") == (country ?? "")
                && (l.Region ?? "") == (region ?? "")
                && (l.City ?? "") == (city ?? ""));
            user = await db.Users.FirstAsync(u => u.Id == user.Id);
            user.LocationId = location.Id;
            await db.SaveChangesAsync();
        }

        return Ok(new LocationDto(location.Country, location.Region, location.City, location.LatFuzzed, location.LngFuzzed));
    }

    [HttpGet("ip")]
    [AllowAnonymous]
    public ActionResult<IpGeoDto> IpCountry()
    {
        var headers = Request.Headers;
        string? country = null;
        string source = "none";

        if (headers.ContainsKey("cf-ipcountry"))
        {
            country = headers["cf-ipcountry"].ToString();
            source = "cf-ipcountry";
        }
        else if (headers.ContainsKey("x-vercel-ip-country"))
        {
            country = headers["x-vercel-ip-country"].ToString();
            source = "x-vercel-ip-country";
        }
        else if (headers.ContainsKey("x-geo-country"))
        {
            country = headers["x-geo-country"].ToString();
            source = "x-geo-country";
        }

        return Ok(new IpGeoDto(string.IsNullOrWhiteSpace(country) ? null : country, source));
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

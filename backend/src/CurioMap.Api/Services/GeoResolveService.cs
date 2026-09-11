using System.Text.Json;

namespace CurioMap.Api.Services;

/// <summary>
/// Resolves city names to representative coordinates via the free Open-Meteo
/// geocoding API (no key required). Results are cached in Redis for 30 days.
/// Best-effort only: failures leave coordinates null.
/// </summary>
public class GeoResolveService(HttpClient http, ICacheService cache, ILogger<GeoResolveService> logger)
{
    public async Task<(double Lat, double Lng)?> ResolveCityAsync(string? country, string? region, string city)
    {
        var key = $"geo:city:{Slug(country)}:{Slug(region)}:{Slug(city)}";
        var cached = await cache.GetAsync<double[]>(key);
        if (cached is { Length: 2 })
        {
            return (cached[0], cached[1]);
        }

        try
        {
            var url = $"/v1/search?name={Uri.EscapeDataString(city)}&count=1&language=en&format=json";
            using var doc = JsonDocument.Parse(await http.GetStringAsync(url));
            var first = doc.RootElement.GetProperty("results")[0];
            var lat = first.GetProperty("latitude").GetDouble();
            var lng = first.GetProperty("longitude").GetDouble();
            await cache.SetAsync(key, new[] { lat, lng }, TimeSpan.FromDays(30));
            return (lat, lng);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "City geocoding failed for {City}", city);
            return null;
        }
    }

    private static string Slug(string? value) => value?.Trim().ToLowerInvariant().Replace(' ', '-') ?? "-";
}

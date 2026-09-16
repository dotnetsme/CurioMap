using System.Text.Json;

namespace CurioMap.Api.Services;

/// <summary>
/// Resolves city names to representative coordinates via the free Open-Meteo
/// geocoding API (no key required). Results are cached in Redis for 30 days.
/// Best-effort only: failures leave coordinates null.
/// </summary>
public class GeoResolveService(HttpClient http, ICacheService cache, ILogger<GeoResolveService> logger)
{
    public async Task<(double Lat, double Lng)?> ResolveCityAsync(string? country, string? region, string city, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(city) || city.Trim().Length > 120)
        {
            return null;
        }
        city = city.Trim();

        // SSRF guard: pinned geocoding host only.
        if (http.BaseAddress is null
            || !http.BaseAddress.Host.Equals("geocoding-api.open-meteo.com", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("GeoResolveService misconfigured: unexpected BaseAddress {Base}", http.BaseAddress);
            return null;
        }

        var key = $"geo:city:{Slug(country)}:{Slug(region)}:{Slug(city)}";
        var cached = await cache.GetAsync<double[]>(key);
        if (cached is { Length: 2 })
        {
            return (cached[0], cached[1]);
        }

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(4));
            var url = $"/v1/search?name={Uri.EscapeDataString(city)}&count=5&language=en&format=json";
            using var doc = JsonDocument.Parse(await http.GetStringAsync(url, cts.Token));
            if (!doc.RootElement.TryGetProperty("results", out var results)
                || results.ValueKind != JsonValueKind.Array
                || results.GetArrayLength() == 0)
            {
                return null;
            }

            // Prefer a result in the requested country/region — plain city names collide worldwide.
            var first = PickBest(results, country, region);
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

    private static JsonElement PickBest(JsonElement results, string? country, string? region)
    {
        var best = results[0];
        var bestScore = -1;
        foreach (var r in results.EnumerateArray())
        {
            var score = 0;
            if (country is not null
                && r.TryGetProperty("country", out var c)
                && c.GetString()?.Equals(country, StringComparison.OrdinalIgnoreCase) == true)
            {
                score += 2;
            }
            if (region is not null
                && r.TryGetProperty("admin1", out var a)
                && a.GetString()?.Contains(region, StringComparison.OrdinalIgnoreCase) == true)
            {
                score += 1;
            }
            if (score > bestScore)
            {
                best = r;
                bestScore = score;
            }
        }
        return best;
    }

    private static string Slug(string? value) => value?.Trim().ToLowerInvariant().Replace(' ', '-') ?? "-";
}

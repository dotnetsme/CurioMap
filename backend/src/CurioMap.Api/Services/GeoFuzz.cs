namespace CurioMap.Api.Services;

/// <summary>
/// Coarsens coordinates to a ~15km grid. Exact positions are never stored —
/// this is the only transformation the API accepts.
/// </summary>
public static class GeoFuzz
{
    private const double Grid = 0.15; // degrees, ≈ 16.6km at the equator

    public static (double Lat, double Lng) Fuzz(double lat, double lng)
    {
        var latFuzzed = Math.Clamp(Math.Round(lat / Grid) * Grid, -89.85, 89.85);
        var lngFuzzed = Math.Clamp(Math.Round(lng / Grid) * Grid, -179.85, 179.85);
        return (Math.Round(latFuzzed, 2), Math.Round(lngFuzzed, 2));
    }
}

using CurioMap.Api.Services;

namespace CurioMap.Api.Tests;

public class GeoFuzzTests
{
    [Fact]
    public void Nearby_Points_Collapse_To_The_Same_Grid_Cell()
    {
        var a = GeoFuzz.Fuzz(52.5200, 13.4050); // Berlin center
        var b = GeoFuzz.Fuzz(52.5310, 13.4180); // ~1.5km away
        Assert.Equal(a, b);
    }

    [Fact]
    public void Distant_Points_Land_In_Different_Cells()
    {
        var berlin = GeoFuzz.Fuzz(52.5200, 13.4050);
        var munich = GeoFuzz.Fuzz(48.1351, 11.5820);
        Assert.NotEqual(berlin, munich);
    }

    [Fact]
    public void Fuzzed_Values_Are_Clamped_And_Rounded()
    {
        var (lat, lng) = GeoFuzz.Fuzz(89.9999, 200.0);
        Assert.True(Math.Abs(lat) <= 90);
        Assert.True(Math.Abs(lng) <= 180);
        Assert.Equal(lat, Math.Round(lat, 2));
        Assert.Equal(lng, Math.Round(lng, 2));
    }

    [Fact]
    public void Fuzz_Is_Deterministic()
    {
        Assert.Equal(GeoFuzz.Fuzz(40.7128, -74.0060), GeoFuzz.Fuzz(40.7128, -74.0060));
    }
}

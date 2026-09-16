using CurioMap.Api.Common;
using CurioMap.Api.Contracts;
using CurioMap.Api.Domain;
using CurioMap.Api.Services;

namespace CurioMap.Api.Tests;

/// <summary>
/// Privacy-invariant unit tests for the shared projection helpers
/// (AGENTS §2.2.2 public location redaction, §2.2.6 identity separation)
/// plus the coordinate-fuzzing primitive (§2.2.1).
/// </summary>
public class PrivacyMappingTests
{
    private static User Reader(
        DisplayMode mode = DisplayMode.Anonymous,
        string? realName = null,
        LocationVisibility locationVisibility = LocationVisibility.RegionCity)
    {
        return new User
        {
            Email = "reader@curiomap.local",
            PasswordHash = "hash",
            Handle = "curious_otter_412",
            DisplayNameMode = mode,
            RealName = realName,
            LocationVisibility = locationVisibility,
            Location = new Location
            {
                Country = "United States",
                Region = "Virginia",
                City = "Arlington",
                LatFuzzed = 38.85,
                LngFuzzed = -77.1,
            },
        };
    }

    [Fact]
    public void ToStub_Anonymous_Redacts_Handle_But_Keeps_Avatar_And_Id()
    {
        var user = Reader();

        var stub = Mapping.ToStub(user);

        Assert.Equal(user.Id, stub.Id);
        Assert.Equal("anonymous", stub.Handle);
        Assert.Equal("Anonymous Reader", stub.DisplayName);
        Assert.Equal(user.AvatarId, stub.AvatarId);
    }

    [Fact]
    public void ToStub_Pseudonymous_Uses_Handle_For_Both_Fields()
    {
        var stub = Mapping.ToStub(Reader(DisplayMode.Pseudonymous));

        Assert.Equal("curious_otter_412", stub.Handle);
        Assert.Equal("curious_otter_412", stub.DisplayName);
    }

    [Fact]
    public void ToStub_RealName_Prefers_Real_Name_But_Keeps_Handle()
    {
        var stub = Mapping.ToStub(Reader(DisplayMode.RealName, "Ada Lovelace"));

        Assert.Equal("curious_otter_412", stub.Handle);
        Assert.Equal("Ada Lovelace", stub.DisplayName);
    }

    [Fact]
    public void ToStub_RealName_Without_Real_Name_Falls_Back_To_Handle()
    {
        var stub = Mapping.ToStub(Reader(DisplayMode.RealName, realName: "  "));

        Assert.Equal("curious_otter_412", stub.DisplayName);
    }

    [Fact]
    public void ToPublicLocation_Hidden_Returns_Null()
    {
        Assert.Null(Mapping.ToPublicLocation(Reader(locationVisibility: LocationVisibility.Hidden)));
    }

    [Fact]
    public void ToPublicLocation_Country_Strips_Region_And_City()
    {
        var location = Mapping.ToPublicLocation(Reader(locationVisibility: LocationVisibility.Country));

        Assert.NotNull(location);
        Assert.Equal("United States", location!.Country);
        Assert.Null(location.Region);
        Assert.Null(location.City);
        Assert.Null(location.LatFuzzed);
        Assert.Null(location.LngFuzzed);
    }

    [Fact]
    public void ToPublicLocation_RegionCity_Still_Never_Exposes_Coordinates()
    {
        var location = Mapping.ToPublicLocation(Reader());

        Assert.NotNull(location);
        Assert.Equal("Virginia", location!.Region);
        Assert.Equal("Arlington", location.City);
        Assert.Null(location.LatFuzzed);
        Assert.Null(location.LngFuzzed);
    }

    [Fact]
    public void ToPublicHandle_Redacts_For_Others_But_Not_For_Self()
    {
        var anonymous = Reader();

        Assert.Equal("anonymous", Mapping.ToPublicHandle(anonymous, isSelf: false));
        Assert.Equal("curious_otter_412", Mapping.ToPublicHandle(anonymous, isSelf: true));

        var pseudonymous = Reader(DisplayMode.Pseudonymous);
        Assert.Equal("curious_otter_412", Mapping.ToPublicHandle(pseudonymous, isSelf: false));
    }

    [Fact]
    public void ToAdminStub_Preserves_Handle_For_Moderation_Lookup()
    {
        // /admin is not a public surface; moderators need the generated handle.
        var admin = Mapping.ToAdminStub(Reader());
        Assert.Equal("curious_otter_412", admin.Handle);
        Assert.Equal("Anonymous Reader", admin.DisplayName);

        var publicStub = Mapping.ToStub(Reader());
        Assert.Equal("anonymous", publicStub.Handle);
        Assert.Equal("curious_otter_412", admin.Handle);
    }

    [Fact]
    public void GeoFuzz_Snaps_To_Fifteen_Kilometre_Grid()
    {
        var (lat, lng) = GeoFuzz.Fuzz(38.8816, -77.0910);

        Assert.Equal(38.85, lat, 6);
        Assert.Equal(-77.1, lng, 6);
        // A fuzzed value is always an exact multiple of the 0.15° grid step.
        Assert.Equal(0, Math.Round(lat / 0.15) * 0.15 - lat, 6);
        Assert.Equal(0, Math.Round(lng / 0.15) * 0.15 - lng, 6);
    }

    [Fact]
    public void GeoFuzz_Collapses_Nearby_Exact_Coordinates_To_The_Same_Cell()
    {
        var a = GeoFuzz.Fuzz(38.8801, -77.0901);
        var b = GeoFuzz.Fuzz(38.8899, -77.0802);

        Assert.Equal(a, b);
    }

    [Theory]
    [InlineData(89.99, 179.99)]
    [InlineData(-89.99, -179.99)]
    public void GeoFuzz_Clamps_Polar_And_Antimeridian_Inputs(double lat, double lng)
    {
        var (fuzzedLat, fuzzedLng) = GeoFuzz.Fuzz(lat, lng);

        Assert.InRange(fuzzedLat, -89.85, 89.85);
        Assert.InRange(fuzzedLng, -179.85, 179.85);
    }

    [Fact]
    public void Like_Escape_Neutralises_Wildcards()
    {
        // Both LIKE metacharacters are escaped, plus the escape character itself.
        Assert.Equal("100\\%\\_x", Like.Escape("100%_x"));
        Assert.Equal("a\\\\b", Like.Escape("a\\b"));
        Assert.Equal("plain", Like.Escape("plain"));
        Assert.Equal(string.Empty, Like.Escape(string.Empty));
    }
}
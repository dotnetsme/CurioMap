using CurioMap.Api.Common;
using CurioMap.Api.Domain;

namespace CurioMap.Api.Tests;

public class CommonTests
{
    [Theory]
    [InlineData(DisplayMode.Anonymous, "Sasha Lovell", "curious_otter_412", "Anonymous Reader")]
    [InlineData(DisplayMode.Pseudonymous, "Sasha Lovell", "curious_otter_412", "curious_otter_412")]
    [InlineData(DisplayMode.RealName, "Sasha Lovell", "curious_otter_412", "Sasha Lovell")]
    [InlineData(DisplayMode.RealName, null, "curious_otter_412", "curious_otter_412")]
    public void DisplayName_Resolves_By_Mode(DisplayMode mode, string? realName, string handle, string expected)
    {
        Assert.Equal(expected, DisplayName.Resolve(mode, realName, handle));
    }

    [Theory]
    [InlineData(DisplayMode.RealName, "real_name")]
    [InlineData(LocationVisibility.RegionCity, "region_city")]
    [InlineData(ReactionKind.Insightful, "insightful")]
    [InlineData(BookStatus.Wishlist, "wishlist")]
    public void EnumStrings_ToApi_Uses_Snake_Case<TEnum>(TEnum value, string expected) where TEnum : struct, Enum
    {
        Assert.Equal(expected, value.ToApi());
    }

    [Fact]
    public void EnumStrings_Parse_Accepts_Api_And_Raw_Names()
    {
        Assert.True(EnumStrings.TryParseEnum<ShelfVisibility>("public", out var a));
        Assert.Equal(ShelfVisibility.Public, a);
        Assert.True(EnumStrings.TryParseEnum<ShelfVisibility>("Private", out var b));
        Assert.Equal(ShelfVisibility.Private, b);
        Assert.False(EnumStrings.TryParseEnum<ShelfVisibility>("secret", out _));
    }

    [Fact]
    public void CurioAvatars_Contains_24_Curated_Ids()
    {
        Assert.Equal(24, CurioAvatars.Ids.Length);
        Assert.True(CurioAvatars.Exists("curio-01"));
        Assert.True(CurioAvatars.Exists("curio-24"));
        Assert.False(CurioAvatars.Exists("curio-25"));
        Assert.False(CurioAvatars.Exists(null));
    }

    [Fact]
    public void Prompts_Are_Unique_By_Key()
    {
        var keys = Prompts.All.Select(p => p.Key).ToList();
        Assert.Equal(keys.Count, keys.Distinct().Count());
        Assert.True(Prompts.Exists("what_confused_you"));
        Assert.False(Prompts.Exists("does_not_exist"));
    }

    [Fact]
    public void DbUrl_Converts_Postgres_Url_To_Npgsql_Config()
    {
        var config = DbUrl.ToNpgsql("postgres://reader:s3cret@ep-cool-pooler.eu-central-1.aws.neon.tech/curiomap");
        Assert.Contains("Host=ep-cool-pooler.eu-central-1.aws.neon.tech", config);
        Assert.Contains("Database=curiomap", config);
        Assert.Contains("Username=reader", config);
        Assert.Contains("Password=s3cret", config);
        Assert.Contains("SSL Mode=Require", config);
    }

    [Fact]
    public void DbUrl_Passes_Through_KeyValue_Connection_Strings()
    {
        var config = "Host=localhost;Database=curiomap";
        Assert.Equal(config, DbUrl.ToNpgsql(config));
    }
}

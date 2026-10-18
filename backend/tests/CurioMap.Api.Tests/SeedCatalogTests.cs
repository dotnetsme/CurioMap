using System.Reflection;
using System.Text.RegularExpressions;
using CurioMap.Api.Data;

namespace CurioMap.Api.Tests;

public class SeedCatalogTests
{
    // Must match the category chips in the discovery UI (the filter compares case-insensitively).
    private static readonly HashSet<string> Categories = new(StringComparer.OrdinalIgnoreCase)
    {
        "Philosophy", "Psychology", "Science & Nature", "History & Society",
        "Technology", "Sci-Fi", "Speculative & Magical", "Literary Fiction",
    };

    private static string ReadSeed(string fileName)
    {
        var assembly = typeof(DbInitializer).Assembly;
        var name = $"CurioMap.Api.Data.Migrations.{fileName}";
        using var stream = assembly.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException($"Embedded seed {name} not found.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    [Fact]
    public void Book_Topic_Seed_Only_Uses_Known_Categories()
    {
        var sql = ReadSeed("0015_seed_book_topics.sql");

        var pairs = Regex.Matches(sql, @"\('(?<isbn>\d{10,13})',\s*'(?<topic>[^']+)'\)");

        Assert.True(pairs.Count >= 40, $"Expected the curated catalog to be mapped, found {pairs.Count}.");
        foreach (Match pair in pairs)
        {
            Assert.True(Categories.Contains(pair.Groups["topic"].Value),
                $"Unknown category '{pair.Groups["topic"].Value}' for ISBN {pair.Groups["isbn"].Value}.");
        }
        Assert.Equal(pairs.Count, pairs.Select(p => p.Groups["isbn"].Value).Distinct().Count());
    }

    [Fact]
    public void Seed_Scripts_Keep_Accented_Characters_As_Utf8()
    {
        var sql = ReadSeed("0012_seed_books_3.sql");

        Assert.Contains("García Márquez", sql);
        Assert.DoesNotContain("Garc??a", sql);
    }

    [Theory]
    [InlineData("reading", "Reading")]
    [InlineData("finished", "Finished")]
    [InlineData("wishlist", "Wishlist")]
    [InlineData("public", "Public")]
    [InlineData("private", "Private")]
    [InlineData("anonymous", "Anonymous")]
    [InlineData("pseudonymous", "Pseudonymous")]
    [InlineData("real_name", "RealName")]
    [InlineData("hidden", "Hidden")]
    [InlineData("country", "Country")]
    [InlineData("region_city", "RegionCity")]
    public void Enum_Normalisation_Seed_Covers_The_Lowercase_Forms_The_Demo_Seeds_Write(string lower, string member)
    {
        var sql = ReadSeed("0016_seed_normalize_enum_values.sql");

        Assert.Contains($"WHEN '{lower}'", sql);
        Assert.Contains($"THEN '{member}'", sql);

        // ...and the member name really is what the EF model stores.
        var enums = new[] { typeof(CurioMap.Api.Domain.BookStatus), typeof(CurioMap.Api.Domain.ShelfVisibility),
            typeof(CurioMap.Api.Domain.DisplayMode), typeof(CurioMap.Api.Domain.LocationVisibility) };
        Assert.Contains(enums, e => Enum.GetNames(e).Contains(member));
    }
}

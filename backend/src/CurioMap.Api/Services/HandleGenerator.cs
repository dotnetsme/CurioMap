using CurioMap.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CurioMap.Api.Services;

/// <summary>Generates unique, non-identifiable handles like "curious_otter_412".</summary>
public class HandleGenerator(AppDbContext db)
{
    private static readonly string[] Adjectives =
    [
        "curious", "wandering", "quiet", "bright", "brave", "calm", "clever",
        "gentle", "nimble", "sunny", "hidden", "cosmic", "silent", "rapid", "lucid",
    ];

    private static readonly string[] Nouns =
    [
        "reader", "otter", "comet", "fox", "owl", "heron", "ember", "willow",
        "falcon", "pixel", "sage", "raven", "lantern", "orbit", "quill",
    ];

    public async Task<string> GenerateUniqueHandleAsync(CancellationToken ct = default)
    {
        for (var attempt = 0; attempt < 25; attempt++)
        {
            var candidate = NextCandidate();
            var exists = await db.Users.AnyAsync(u => u.Handle == candidate, ct);
            if (!exists)
            {
                return candidate;
            }
        }

        return $"curious_reader_{Guid.NewGuid().ToString("N")[..8]}";
    }

    /// <summary>Pure candidate composer (unit-testable).</summary>
    public static string NextCandidate() =>
        $"{Adjectives[Random.Shared.Next(Adjectives.Length)]}" +
        $"_{Nouns[Random.Shared.Next(Nouns.Length)]}" +
        $"_{Random.Shared.Next(100, 1000)}";
}

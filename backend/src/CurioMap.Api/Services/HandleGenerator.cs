using CurioMap.Api.Data;
using System.Security.Cryptography;
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

        return FallbackHandle();
    }

    public static string NextCandidate() =>
        $"{Adjectives[Random.Shared.Next(Adjectives.Length)]}" +
        $"_{Nouns[Random.Shared.Next(Nouns.Length)]}" +
        $"_{RandomNumberGenerator.GetInt32(100, 1000)}";

    /// <summary>Crypto-backed fallback handle (matches the ^[a-z]+_[a-z]+_\d{3,4}$ contract).</summary>
    public static string FallbackHandle() =>
        $"curious_reader_{RandomNumberGenerator.GetInt32(100, 1000)}";
}

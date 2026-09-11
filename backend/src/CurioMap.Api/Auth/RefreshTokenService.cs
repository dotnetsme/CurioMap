using System.Security.Cryptography;
using System.Text;
using CurioMap.Api.Common;
using CurioMap.Api.Data;
using CurioMap.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Auth;

/// <summary>
/// Rotating refresh tokens: only the SHA-256 hash is persisted; each refresh
/// revokes the previous token and issues a new one (reuse detection = invalid).
/// </summary>
public class RefreshTokenService(AppDbContext db, IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public (RefreshToken Token, string Raw) Issue(User user)
    {
        var raw = ToUrlSafe(Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)));
        var token = new RefreshToken
        {
            UserId = user.Id,
            User = user,
            TokenHash = Hash(raw),
            ExpiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays),
        };
        return (token, raw);
    }

    public async Task<(User User, RefreshToken NewToken, string Raw)?> ValidateAndRotateAsync(string? raw, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var hash = Hash(raw);
        var token = await db.RefreshTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (token?.User is null || token.RevokedAt is not null || token.ExpiresAt < DateTime.UtcNow)
        {
            return null;
        }

        // Rotation must be atomic: concurrent use of the same token must not mint two sessions.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        token.RevokedAt = DateTime.UtcNow;
        var (fresh, newRaw) = Issue(token.User);
        db.RefreshTokens.Add(fresh);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return (token.User, fresh, newRaw);
    }

    public async Task RevokeAsync(string? raw, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return;
        }

        var token = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == Hash(raw), ct);
        if (token is { RevokedAt: null })
        {
            token.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public static string Hash(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();

    private static string ToUrlSafe(string base64) =>
        base64.Replace('+', '-').Replace('/', '_').TrimEnd('=');
}

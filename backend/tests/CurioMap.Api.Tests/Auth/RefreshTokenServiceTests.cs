using System.Text.RegularExpressions;
using CurioMap.Api.Auth;
using CurioMap.Api.Domain;

namespace CurioMap.Api.Tests;

public class RefreshTokenServiceTests
{
    [Fact]
    public void Hash_Is_Deterministic_Sha256_Hex()
    {
        Assert.Equal(RefreshTokenService.Hash("abc"), RefreshTokenService.Hash("abc"));
        Assert.NotEqual(RefreshTokenService.Hash("abc"), RefreshTokenService.Hash("abd"));
        Assert.Matches("^[0-9a-f]{64}$", RefreshTokenService.Hash("abc"));
    }

    [Fact]
    public void Issue_Generates_UrlSafe_Token_With_Matching_Hash()
    {
        var service = new RefreshTokenServiceInstance();
        var user = new User { Id = Guid.NewGuid(), Email = "a@b.co", Handle = "curious_owl_111", PasswordHash = "x" };
        var (token, raw) = service.Issue(user);

        Assert.False(string.IsNullOrEmpty(raw));
        Assert.DoesNotContain("+", raw);
        Assert.DoesNotContain("/", raw);
        Assert.DoesNotContain("=", raw);
        Assert.Equal(RefreshTokenService.Hash(raw), token.TokenHash);
        Assert.True(token.ExpiresAt > DateTime.UtcNow.AddDays(29));
        Assert.Equal(user.Id, token.UserId);
    }

    /// <summary>Issue() is persistence-free, so the service can be exercised without a DB.</summary>
    private sealed class RefreshTokenServiceInstance : RefreshTokenService
    {
        public RefreshTokenServiceInstance() : base(null!, Microsoft.Extensions.Options.Options.Create(new CurioMap.Api.Common.JwtOptions()))
        {
        }
    }
}

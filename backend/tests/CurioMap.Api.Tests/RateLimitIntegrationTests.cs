using System.Net;
using System.Net.Http.Json;
using CurioMap.Api.Contracts;

namespace CurioMap.Api.Tests;

/// <summary>
/// Keeps the production fixed-window rate-limit policies live, unlike the default
/// hermetic factory. Rate limiting is a production behavior that deserves a real 429
/// assertion instead of being neutralized everywhere (AGENTS §4 test parity).
/// </summary>
public class RateLimitedTestFactory : CurioMapTestFactory
{
    protected override bool NeutralizeRateLimits => false;
}

public class RateLimitIntegrationTests : IClassFixture<RateLimitedTestFactory>
{
    private readonly RateLimitedTestFactory _factory;

    public RateLimitIntegrationTests(RateLimitedTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Auth_Policy_Returns_429_Once_The_Window_Budget_Is_Exhausted()
    {
        var client = _factory.CreateClient();
        var statuses = new List<HttpStatusCode>();

        // The `auth` policy permits 20 requests per minute per partition, so the 21st
        // registration in the same window must be rejected.
        for (var attempt = 0; attempt < 21; attempt++)
        {
            var response = await client.PostAsJsonAsync("/auth/register",
                new RegisterRequest($"rate_{Guid.NewGuid():N}@curiomap.local", "Password123!", true));
            statuses.Add(response.StatusCode);
        }

        Assert.Equal(HttpStatusCode.OK, statuses[0]);
        Assert.Equal(HttpStatusCode.TooManyRequests, statuses[^1]);
    }

    [Fact]
    public async Task Session_Refresh_Does_Not_Spend_The_Sign_In_Budget()
    {
        var client = _factory.CreateClient();

        // Anonymous page loads call /auth/refresh (401, no cookie). A burst of them must not
        // starve /auth/login or /auth/register, which share nothing with it any more.
        for (var attempt = 0; attempt < 25; attempt++)
        {
            await client.PostAsJsonAsync("/auth/refresh", new { });
        }

        var register = await client.PostAsJsonAsync("/auth/register",
            new RegisterRequest($"rate_{Guid.NewGuid():N}@curiomap.local", "Password123!", true));

        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
    }
}

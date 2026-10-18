using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CurioMap.Api.Contracts;

namespace CurioMap.Api.Tests;

public class RegistrationHardeningTests : IClassFixture<CurioMapTestFactory>
{
    private readonly CurioMapTestFactory _factory;

    public RegistrationHardeningTests(CurioMapTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Register_Without_Explicit_Consent_Is_Rejected()
    {
        var client = _factory.CreateClient();

        // Raw payload: the field is omitted on the wire, not defaulted by a C# record.
        var response = await client.PostAsJsonAsync("/auth/register", new
        {
            email = $"noconsent_{Guid.NewGuid():N}@curiomap.local",
            password = "Password123!",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("admin")]
    [InlineData("Support")]
    [InlineData("curiomap")]
    public async Task Reserved_Handles_Cannot_Be_Claimed(string handle)
    {
        var client = _factory.CreateClient();
        var reg = await client.PostAsJsonAsync(
            "/auth/register",
            new RegisterRequest($"reserved_{Guid.NewGuid():N}@curiomap.local", "Password123!", true));
        var auth = await reg.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        var response = await client.PatchAsJsonAsync("/users/me", new { handle });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_Rotates_The_Token_Without_Server_Error()
    {
        var client = _factory.CreateClient();
        var reg = await client.PostAsJsonAsync(
            "/auth/register",
            new RegisterRequest($"refresh_{Guid.NewGuid():N}@curiomap.local", "Password123!", true));
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
        var cookie = reg.Headers.GetValues("Set-Cookie").First(c => c.StartsWith("curio_rt=")).Split(';')[0];

        var request = new HttpRequestMessage(HttpMethod.Post, "/auth/refresh") { Content = JsonContent.Create(new { }) };
        request.Headers.Add("Cookie", cookie);
        var first = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Contains(first.Headers.GetValues("Set-Cookie"), c => c.StartsWith("curio_rt=") && !c.StartsWith(cookie));
    }
}

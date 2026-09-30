using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace CurioMap.Api.Tests;

/// <summary>
/// Boots the real pipeline with the Production environment: the development JWT
/// fallback and the OpenAPI/docs surface must not exist there (AGENTS §5.5, §5.8).
/// </summary>
public class ProductionApiTestFactory : CurioMapTestFactory
{
    protected override string TestEnvironment => Environments.Production;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // The minimal-hosting shim applies UseEnvironment before Program.cs runs, but it
        // does NOT apply ConfigureAppConfiguration in time for Program's eager
        // JWT__SECRET read. Production gets its secret through the environment on Fly,
        // so the test does the same. (Any valid secret boots every factory in this
        // process identically; no test asserts token material across factories.)
        Environment.SetEnvironmentVariable(
            "JWT__SECRET", "production-test-secret-0123456789abcdef0123456789abcdef");
        base.ConfigureWebHost(builder);
    }
}

public class ProductionEnvironmentTests : IClassFixture<ProductionApiTestFactory>
{
    private readonly ProductionApiTestFactory _factory;

    public ProductionEnvironmentTests(ProductionApiTestFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task OpenApi_Document_Is_Not_Exposed_Outside_Development()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Docs_Viewer_Is_Not_Served_Outside_Development()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/docs");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Security_Headers_Including_HSTS_Are_Present_In_Production()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Strict-Transport-Security", out var hsts));
        Assert.Contains("max-age=31536000", hsts.First());
        Assert.True(response.Headers.TryGetValues("X-Content-Type-Options", out var nosniff));
        Assert.Equal("nosniff", nosniff.First());
        Assert.True(response.Headers.TryGetValues("Content-Security-Policy", out var csp));
        Assert.Contains("default-src 'none'", csp.First());
    }
}
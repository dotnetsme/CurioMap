using Microsoft.AspNetCore.Hosting;

namespace CurioMap.Api.Common;

/// <summary>
/// Baseline security headers on every API response (AGENTS §5.22). The JSON API is
/// hard-locked (<c>default-src 'none'</c>); the only HTML surface, the development-only
/// /docs Scalar viewer, keeps the CDN-based policy it needs to boot.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
{
    private const string ApiCsp = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

    private const string DocsCsp =
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; " +
        "connect-src 'self'; font-src 'self' data: https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'none'";

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Content-Security-Policy"] =
            context.Request.Path.StartsWithSegments("/docs") ? DocsCsp : ApiCsp;

        // HSTS only outside Development: the plaintext dev loop would never honor it
        // anyway, and asserting its absence in the dev factory pins that behavior.
        if (!environment.IsDevelopment())
        {
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        }

        await next(context);
    }
}
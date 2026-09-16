using CurioMap.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;

namespace CurioMap.Api.Controllers;

[ApiController]
[Route("health")]
public class HealthController(AppDbContext db, IConnectionMultiplexer? redis = null) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Health()
    {
        bool database;
        try
        {
            database = await db.Database.CanConnectAsync();
        }
        catch
        {
            database = false;
        }

        // Redis is a best-effort tier: distinguish configured-but-down from
        // never-configured (tests / local boots without Redis). Only a real
        // outage degrades the status; absent Redis still reports healthy.
        string cache;
        try
        {
            if (redis is null)
            {
                cache = "disabled";
            }
            else if (!redis.IsConnected)
            {
                cache = "down";
            }
            else
            {
                await redis.GetDatabase().PingAsync();
                cache = "up";
            }
        }
        catch
        {
            cache = "down";
        }

        var version = typeof(HealthController).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
        var status = !database ? "unhealthy" : cache == "down" ? "degraded" : "healthy";
        var body = new
        {
            status,
            version,
            service = "curiomap-api",
            tagline = "live map of human curiosity",
            checks = new { database = database ? "up" : "down", cache },
        };

        return database ? Ok(body) : StatusCode(StatusCodes.Status503ServiceUnavailable, body);
    }
}

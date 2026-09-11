using CurioMap.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;

namespace CurioMap.Api.Controllers;

[ApiController]
[Route("health")]
public class HealthController(AppDbContext db, IConnectionMultiplexer redis) : ControllerBase
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

        bool cache;
        try
        {
            cache = redis.IsConnected;
            if (cache)
            {
                await redis.GetDatabase().PingAsync();
            }
        }
        catch
        {
            cache = false;
        }

        var version = typeof(HealthController).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
        var status = database ? (cache ? "healthy" : "degraded") : "unhealthy";
        var body = new
        {
            status,
            version,
            service = "curiomap-api",
            tagline = "live map of human curiosity",
            checks = new { database = database ? "up" : "down", cache = cache ? "up" : "down" },
        };

        return database ? Ok(body) : StatusCode(StatusCodes.Status503ServiceUnavailable, body);
    }
}

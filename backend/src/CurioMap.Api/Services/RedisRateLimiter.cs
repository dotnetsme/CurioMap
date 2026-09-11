using StackExchange.Redis;

namespace CurioMap.Api.Services;

public interface IRedisRateLimiter
{
    Task<bool> IsAllowedAsync(string bucket, string identity, int limit, TimeSpan window);
}

/// <summary>
/// Distributed fixed-window limiter backed by Redis INCR+EXPIRE —
/// works across multiple Fly machine instances.
/// </summary>
public class RedisRateLimiter(IConnectionMultiplexer redis, ILogger<RedisRateLimiter> logger) : IRedisRateLimiter
{
    public async Task<bool> IsAllowedAsync(string bucket, string identity, int limit, TimeSpan window)
    {
        try
        {
            var db = redis.GetDatabase();
            var windowId = DateTimeOffset.UtcNow.UtcTicks / window.Ticks;
            var key = $"curiomap:rl:{bucket}:{identity}:{windowId}";
            var count = await db.StringIncrementAsync(key);
            if (count == 1)
            {
                await db.KeyExpireAsync(key, window + TimeSpan.FromSeconds(1));
            }
            return count <= limit;
        }
        catch (Exception ex)
        {
            // Fail open: Redis outage must not take down posting entirely.
            logger.LogWarning(ex, "Redis rate limiter failed for {Bucket}", bucket);
            return true;
        }
    }
}

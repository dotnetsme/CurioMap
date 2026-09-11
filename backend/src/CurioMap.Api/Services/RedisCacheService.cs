using System.Text.Json;
using System.Text.Json.Serialization;
using StackExchange.Redis;

namespace CurioMap.Api.Services;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan ttl);
    Task RemoveAsync(string key);
    Task<T> GetOrSetAsync<T>(string key, TimeSpan ttl, Func<Task<T>> factory);
}

/// <summary>
/// JSON string cache over Redis. Cache failures never break requests —
/// the factory result is used as fallback.
/// </summary>
public class RedisCacheService(IConnectionMultiplexer redis, ILogger<RedisCacheService> logger) : ICacheService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private IDatabase Db => redis.GetDatabase();

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var raw = await Db.StringGetAsync(Key(key));
            return raw.IsNull ? default : JsonSerializer.Deserialize<T>(raw.ToString(), JsonOptions);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis GET failed for {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl)
    {
        try
        {
            var json = JsonSerializer.Serialize(value, JsonOptions);
            await Db.StringSetAsync(Key(key), json, ttl);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis SET failed for {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            await Db.KeyDeleteAsync(Key(key));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis DEL failed for {Key}", key);
        }
    }

    public async Task<T> GetOrSetAsync<T>(string key, TimeSpan ttl, Func<Task<T>> factory)
    {
        var cached = await GetAsync<T>(key);
        if (cached is not null)
        {
            return cached;
        }

        var value = await factory();
        await SetAsync(key, value, ttl);
        return value;
    }

    private static string Key(string key) => $"curiomap:{key}";
}

/// <summary>Accepts redis:// or rediss:// URLs (Fly/Upstash) and plain host:port configs.</summary>
public static class RedisUrl
{
    public static string Normalize(string urlOrConfig)
    {
        if (!urlOrConfig.Contains("://", StringComparison.Ordinal))
        {
            return urlOrConfig;
        }

        var uri = new Uri(urlOrConfig);
        var config = uri.Host + (uri.Port > 0 ? $":{uri.Port}" : "");
        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var parts = uri.UserInfo.Split(':', 2);
            if (parts.Length > 1 && parts[1].Length > 0)
            {
                config += $",password={Uri.UnescapeDataString(parts[1])}";
            }
        }
        if (uri.Scheme.Equals("rediss", StringComparison.OrdinalIgnoreCase))
        {
            config += ",ssl=true";
        }
        return config;
    }
}

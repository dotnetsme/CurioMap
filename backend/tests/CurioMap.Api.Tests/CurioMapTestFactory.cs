using CurioMap.Api.Data;
using CurioMap.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace CurioMap.Api.Tests;

/// <summary>
/// In-memory WebApplicationFactory for integration testing.
/// Configures an isolated SQLite in-memory database and in-memory cache/mock services,
/// enabling full HTTP pipeline testing without external dependencies.
/// </summary>
public class CurioMapTestFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            // Remove existing AppDbContext and Npgsql configuration
            var toRemove = services.Where(d =>
                d.ServiceType == typeof(DbContextOptions) ||
                d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                d.ServiceType == typeof(AppDbContext) ||
                d.ServiceType.FullName?.StartsWith("Microsoft.EntityFrameworkCore") == true ||
                d.ServiceType.FullName?.StartsWith("Npgsql.EntityFrameworkCore") == true
            ).ToList();

            foreach (var descriptor in toRemove)
            {
                services.Remove(descriptor);
            }

            var connDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IConnectionMultiplexer));
            if (connDescriptor != null)
            {
                services.Remove(connDescriptor);
            }

            // Create and open isolated SQLite connection for this test factory
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            services.AddDbContext<AppDbContext>((sp, options) =>
            {
                options.UseSqlite(_connection);
                options.UseSnakeCaseNamingConvention();
            });

            // Replace Redis rate limiter with test in-memory rate limiter
            var limiterDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IRedisRateLimiter));
            if (limiterDescriptor != null)
            {
                services.Remove(limiterDescriptor);
            }
            services.AddScoped<IRedisRateLimiter, TestRateLimiter>();

            // Replace Redis caching with an in-memory test cache
            var cacheDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ICacheService));
            if (cacheDescriptor != null)
            {
                services.Remove(cacheDescriptor);
            }
            services.AddScoped<ICacheService, InMemoryTestCacheService>();

            // Build schema
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection?.Dispose();
        }
    }
}

public class InMemoryTestCacheService : ICacheService
{
    private readonly Dictionary<string, (object Value, DateTime ExpiresAt)> _store = new();

    public Task<T?> GetAsync<T>(string key)
    {
        if (_store.TryGetValue(key, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
        {
            return Task.FromResult<T?>((T)entry.Value);
        }
        return Task.FromResult<T?>(default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl)
    {
        _store[key] = (value!, DateTime.UtcNow.Add(ttl));
        return Task.CompletedTask;
    }

    public async Task<T> GetOrSetAsync<T>(string key, TimeSpan ttl, Func<Task<T>> factory)
    {
        var existing = await GetAsync<T>(key);
        if (existing is not null)
        {
            return existing;
        }
        var created = await factory();
        await SetAsync(key, created, ttl);
        return created;
    }

    public Task RemoveAsync(string key)
    {
        _store.Remove(key);
        return Task.CompletedTask;
    }
}

public class TestRateLimiter : IRedisRateLimiter
{
    public Task<bool> IsAllowedAsync(string bucket, string identity, int limit, TimeSpan window)
    {
        return Task.FromResult(true);
    }
}

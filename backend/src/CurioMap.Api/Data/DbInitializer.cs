using System.Reflection;
using CurioMap.Api.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace CurioMap.Api.Data;

/// <summary>
/// Applies ordered embedded SQL migrations at startup, tracked in schema_migrations.
/// Uses a Postgres advisory lock so concurrent instances (Fly multi-machine) are safe.
/// Simple, reviewable SQL — no design-time tooling required, Neon compatible.
///
/// Seed gating: scripts whose filename contains "_seed_demo_" or that live in the
/// demo range (0013-0014) are SKIPPED unless Seed:DemoReaders is true. The book
/// catalog (0010-0012) always applies — books are product data, demo readers are
/// fake accounts that must never exist in production.
/// </summary>
public static class DbInitializer
{
    private const string ResourcePrefix = "CurioMap.Api.Data.Migrations.";

    /// <summary>True for demo-reader seed scripts (gated) vs schema/catalog (always).</summary>
    public static bool IsDemoSeedScript(string resourceName)
    {
        var id = resourceName.StartsWith(ResourcePrefix, StringComparison.Ordinal)
            ? resourceName[ResourcePrefix.Length..]
            : resourceName;
        if (id.Contains("_seed_demo_", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        // Legacy names without the marker: 0013/0014 are the demo-reader scripts.
        return id.StartsWith("0013_", StringComparison.Ordinal)
            || id.StartsWith("0014_", StringComparison.Ordinal);
    }

    public static async Task InitializeAsync(IServiceProvider services, ILogger logger)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var seedDemoReaders = scope.ServiceProvider
            .GetRequiredService<IOptions<SeedOptions>>().Value.DemoReaders;
        var assembly = Assembly.GetExecutingAssembly();

        var scripts = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal) && n.EndsWith(".sql", StringComparison.Ordinal))
            .Where(n => seedDemoReaders || !IsDemoSeedScript(n))
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToList();

        if (!seedDemoReaders)
        {
            logger.LogInformation("Seed:DemoReaders=false — skipping demo-reader seed scripts.");
        }

        await db.Database.OpenConnectionAsync();
        if (!db.Database.IsNpgsql())
        {
            await db.Database.EnsureCreatedAsync();
            await db.Database.CloseConnectionAsync();
            return;
        }
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();

        await using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id text PRIMARY KEY,
                    applied_at timestamptz NOT NULL DEFAULT now()
                );
                SELECT pg_advisory_xact_lock(742019);
                """;
            await cmd.ExecuteNonQueryAsync();
        }

        foreach (var script in scripts)
        {
            var id = script[ResourcePrefix.Length..].Replace(".sql", "", StringComparison.Ordinal);

            // Each migration runs in its own transaction that also holds the
            // transaction-scoped advisory lock, so concurrent Fly machines
            // serialize on the lock and the lock is always released on commit.
            await using var tx = await connection.BeginTransactionAsync();
            try
            {
                bool applied;
                await using (var lockCmd = connection.CreateCommand())
                {
                    // Re-acquire inside the tx: blocks until any concurrent applier commits.
                    lockCmd.Transaction = (NpgsqlTransaction)tx;
                    lockCmd.CommandText = "SELECT pg_advisory_xact_lock(742019)";
                    await lockCmd.ExecuteNonQueryAsync();
                }
                await using (var check = connection.CreateCommand())
                {
                    check.Transaction = (NpgsqlTransaction)tx;
                    check.CommandText = "SELECT 1 FROM schema_migrations WHERE id = @id";
                    check.Parameters.AddWithValue("id", id);
                    applied = await check.ExecuteScalarAsync() is not null;
                }

                if (!applied)
                {
                    var sql = await new StreamReader(assembly.GetManifestResourceStream(script)!).ReadToEndAsync();

                    await using (var apply = connection.CreateCommand())
                    {
                        apply.Transaction = (NpgsqlTransaction)tx;
                        apply.CommandText = sql;
                        await apply.ExecuteNonQueryAsync();
                    }

                    await using (var record = connection.CreateCommand())
                    {
                        record.Transaction = (NpgsqlTransaction)tx;
                        record.CommandText = "INSERT INTO schema_migrations (id) VALUES (@id)";
                        record.Parameters.AddWithValue("id", id);
                        await record.ExecuteNonQueryAsync();
                    }

                    logger.LogInformation("Applied migration {Migration}", id);
                }

                await tx.CommitAsync();
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        await db.Database.CloseConnectionAsync();
    }
}

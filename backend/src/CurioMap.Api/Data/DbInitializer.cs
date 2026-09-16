using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CurioMap.Api.Data;

/// <summary>
/// Applies ordered embedded SQL migrations at startup, tracked in schema_migrations.
/// Uses a Postgres advisory lock so concurrent instances (Fly multi-machine) are safe.
/// Simple, reviewable SQL — no design-time tooling required, Neon compatible.
/// </summary>
public static class DbInitializer
{
    private const string LockKey = "742019"; // arbitrary curiomap lock id
    private const string ResourcePrefix = "CurioMap.Api.Data.Migrations.";

    public static async Task InitializeAsync(IServiceProvider services, ILogger logger)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var assembly = Assembly.GetExecutingAssembly();

        var scripts = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal) && n.EndsWith(".sql", StringComparison.Ordinal))
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToList();

        await db.Database.OpenConnectionAsync();
        if (!db.Database.IsNpgsql())
        {
            await db.Database.EnsureCreatedAsync();
            return;
        }
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();

        await using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = $"""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id text PRIMARY KEY,
                    applied_at timestamptz NOT NULL DEFAULT now()
                );
                SELECT pg_advisory_lock({LockKey});
                """;
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            foreach (var script in scripts)
            {
                var id = script[ResourcePrefix.Length..].Replace(".sql", "", StringComparison.Ordinal);

                bool applied;
                await using (var check = connection.CreateCommand())
                {
                    check.CommandText = "SELECT 1 FROM schema_migrations WHERE id = @id";
                    check.Parameters.AddWithValue("id", id);
                    applied = await check.ExecuteScalarAsync() is not null;
                }

                if (applied)
                {
                    continue;
                }

                var sql = await new StreamReader(assembly.GetManifestResourceStream(script)!).ReadToEndAsync();

                await using var tx = await connection.BeginTransactionAsync();
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

                await tx.CommitAsync();
                logger.LogInformation("Applied migration {Migration}", id);
            }
        }
        finally
        {
            await using (var unlock = connection.CreateCommand())
            {
                unlock.CommandText = $"SELECT pg_advisory_unlock({LockKey});";
                await unlock.ExecuteNonQueryAsync();
            }
        }
    }
}

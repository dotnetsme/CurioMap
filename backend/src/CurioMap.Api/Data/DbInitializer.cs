using System.Reflection;
using CurioMap.Api.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CurioMap.Api.Data;

/// <summary>
/// Applies EF Core migrations and initial catalog/demo seed data at startup.
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

        if (!db.Database.IsNpgsql())
        {
            await db.Database.EnsureCreatedAsync();
            return;
        }

        await BaselineExistingDatabaseIfNecessaryAsync(db, logger);

        logger.LogInformation("Applying pending EF Core database migrations...");
        await db.Database.MigrateAsync();
        logger.LogInformation("EF Core migrations applied successfully.");

        // Check if initial book seed is needed
        var hasBooks = await db.Books.AnyAsync();
        if (!hasBooks)
        {
            logger.LogInformation("No books detected. Seeding initial catalog...");
            await ApplySeedScriptsAsync(db, seedDemoReaders, logger);
        }
    }

    private static async Task BaselineExistingDatabaseIfNecessaryAsync(AppDbContext db, ILogger logger)
    {
        var connection = (Npgsql.NpgsqlConnection)db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync();
        }

        // Check if books table already exists from legacy raw SQL scripts
        await using var checkCmd = connection.CreateCommand();
        checkCmd.CommandText = """
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'books';
            """;
        var booksExist = await checkCmd.ExecuteScalarAsync() is not null;

        if (booksExist)
        {
            // Ensure topic column exists on books and conversations if baselining legacy database
            await using var syncColumnsCmd = connection.CreateCommand();
            syncColumnsCmd.CommandText = """
                ALTER TABLE books ADD COLUMN IF NOT EXISTS topic text;
                ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topic text;
                CREATE INDEX IF NOT EXISTS ix_books_topic_lower ON books (lower(topic));
                CREATE INDEX IF NOT EXISTS ix_conversations_topic_lower ON conversations (lower(topic), last_activity_at DESC);
                """;
            await syncColumnsCmd.ExecuteNonQueryAsync();

            // Create __EFMigrationsHistory if it doesn't exist (using snake_case convention)
            await using var initHistoryCmd = connection.CreateCommand();
            initHistoryCmd.CommandText = """
                CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                    migration_id character varying(150) NOT NULL,
                    product_version character varying(32) NOT NULL,
                    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY (migration_id)
                );
                """;
            await initHistoryCmd.ExecuteNonQueryAsync();

            // Record InitialCreate in __EFMigrationsHistory so EF Core doesn't try to re-create existing tables
            await using var insertCmd = connection.CreateCommand();
            insertCmd.CommandText = """
                INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
                VALUES ('20261010000943_InitialCreate', '10.0.3')
                ON CONFLICT (migration_id) DO NOTHING;
                """;
            var inserted = await insertCmd.ExecuteNonQueryAsync();
            if (inserted > 0)
            {
                logger.LogInformation("Baselined existing database schema into __EFMigrationsHistory for InitialCreate.");
            }
        }
    }

    public static async Task ApplySeedScriptsAsync(AppDbContext db, bool seedDemoReaders, ILogger logger)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var scripts = assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal) && n.EndsWith(".sql", StringComparison.Ordinal))
            .Where(n => n.Contains("_seed_"))
            .Where(n => seedDemoReaders || !IsDemoSeedScript(n))
            .OrderBy(n => n, StringComparer.Ordinal)
            .ToList();

        if (!seedDemoReaders)
        {
            logger.LogInformation("Seed:DemoReaders=false — skipping demo-reader seed scripts.");
        }

        foreach (var script in scripts)
        {
            await using var stream = assembly.GetManifestResourceStream(script);
            if (stream == null) continue;

            using var reader = new StreamReader(stream);
            var sql = await reader.ReadToEndAsync();

            await db.Database.ExecuteSqlRawAsync(sql);
            var id = script[ResourcePrefix.Length..].Replace(".sql", "", StringComparison.Ordinal);
            logger.LogInformation("Applied seed script {SeedScript}", id);
        }
    }
}

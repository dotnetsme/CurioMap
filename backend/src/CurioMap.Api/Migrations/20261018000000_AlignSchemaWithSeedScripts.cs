using CurioMap.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurioMap.Api.Migrations
{
    /// <summary>
    /// The SQL seed scripts (Data/Migrations/*_seed_*.sql) were written against the legacy raw-SQL schema:
    /// they upsert with <c>ON CONFLICT (lower(isbn))</c> / <c>(lower(email))</c> and omit ids and timestamps,
    /// relying on column defaults. InitialCreate (client-generated ids, no defaults) lacks both, so seeding a
    /// fresh database failed (42P10, then 23502). This restores exactly what the seeds need. Idempotent, so
    /// databases created from the legacy scripts (which already have all of it) are unaffected.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261018000000_AlignSchemaWithSeedScripts")]
    public partial class AlignSchemaWithSeedScripts : Migration
    {
        private static readonly string[] Defaults =
        [
            "books ALTER COLUMN id SET DEFAULT gen_random_uuid()",
            "books ALTER COLUMN created_at SET DEFAULT now()",
            "books ALTER COLUMN affiliate_links SET DEFAULT '{}'::jsonb",
            "books ALTER COLUMN metadata SET DEFAULT '{}'::jsonb",
            "locations ALTER COLUMN id SET DEFAULT gen_random_uuid()",
            "locations ALTER COLUMN created_at SET DEFAULT now()",
            "users ALTER COLUMN id SET DEFAULT gen_random_uuid()",
            "users ALTER COLUMN created_at SET DEFAULT now()",
            "users ALTER COLUMN updated_at SET DEFAULT now()",
            "users ALTER COLUMN avatar_id SET DEFAULT 'curio-01'",
            "users ALTER COLUMN display_name_mode SET DEFAULT 'Anonymous'",
            "users ALTER COLUMN location_visibility SET DEFAULT 'RegionCity'",
            "users ALTER COLUMN bookshelf_visibility SET DEFAULT 'Public'",
            "users ALTER COLUMN is_admin SET DEFAULT false",
            "users ALTER COLUMN is_author SET DEFAULT false",
            "bookshelf_entries ALTER COLUMN id SET DEFAULT gen_random_uuid()",
            "bookshelf_entries ALTER COLUMN created_at SET DEFAULT now()",
            "bookshelf_entries ALTER COLUMN updated_at SET DEFAULT now()",
            "bookshelf_entries ALTER COLUMN visibility SET DEFAULT 'Public'",
            "ratings ALTER COLUMN created_at SET DEFAULT now()",
            "ratings ALTER COLUMN updated_at SET DEFAULT now()",
            "challenges ALTER COLUMN created_at SET DEFAULT now()",
            "challenges ALTER COLUMN updated_at SET DEFAULT now()",
            "challenges ALTER COLUMN target SET DEFAULT 50",
            "challenges ALTER COLUMN year SET DEFAULT (EXTRACT(year FROM now()))::integer",
        ];

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider != "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                return;
            }

            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS ux_books_isbn ON books (lower(isbn));");
            migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (lower(email));");
            foreach (var statement in Defaults)
            {
                migrationBuilder.Sql($"ALTER TABLE {statement};");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally a no-op: legacy databases rely on these defaults and indexes, so rolling this
            // migration back must not remove them.
        }
    }
}

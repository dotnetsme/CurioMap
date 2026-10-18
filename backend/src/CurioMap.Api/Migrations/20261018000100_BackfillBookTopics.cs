using System.Reflection;
using CurioMap.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurioMap.Api.Migrations
{
    /// <summary>
    /// Existing databases were seeded before the catalog carried topics, so the map's category filter
    /// matched nothing. Runs the same embedded seed script fresh databases get
    /// (Data/Migrations/0015_seed_book_topics.sql), so the mapping lives in one place.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261018000100_BackfillBookTopics")]
    public partial class BackfillBookTopics : Migration
    {
        private const string Script = "CurioMap.Api.Data.Migrations.0015_seed_book_topics.sql";

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider != "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                return;
            }

            using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(Script)
                ?? throw new InvalidOperationException($"Embedded script {Script} not found.");
            using var reader = new StreamReader(stream);
            migrationBuilder.Sql(reader.ReadToEnd());
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data backfill; nothing to undo.
        }
    }
}

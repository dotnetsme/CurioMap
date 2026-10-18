using System.Reflection;
using CurioMap.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CurioMap.Api.Migrations
{
    /// <summary>
    /// Existing databases may hold demo readers whose enum columns use the lowercase form the seed scripts
    /// wrote, which EF never matches. Runs the same embedded script fresh databases get
    /// (Data/Migrations/0016_seed_normalize_enum_values.sql).
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261018000200_NormalizeSeededEnumValues")]
    public partial class NormalizeSeededEnumValues : Migration
    {
        private const string Script = "CurioMap.Api.Data.Migrations.0016_seed_normalize_enum_values.sql";

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
            // Data normalisation; nothing to undo.
        }
    }
}

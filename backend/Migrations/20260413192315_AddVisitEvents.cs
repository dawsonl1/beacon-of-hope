using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddVisitEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "visit_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    visitor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    fingerprint_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ip_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    is_new_visitor = table.Column<bool>(type: "boolean", nullable: false),
                    path = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    referrer = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    user_agent = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    language = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    timezone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    verdict = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    bot_signals = table.Column<string>(type: "jsonb", nullable: true),
                    cf_bot_score = table.Column<int>(type: "integer", nullable: true),
                    interaction_ms = table.Column<int>(type: "integer", nullable: false),
                    scroll_depth_pct = table.Column<int>(type: "integer", nullable: false),
                    country = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    city = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    region = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    asn = table.Column<long>(type: "bigint", nullable: true),
                    asn_org = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("visit_events_pkey", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_visit_events_fingerprint",
                table: "visit_events",
                column: "fingerprint_hash");

            migrationBuilder.CreateIndex(
                name: "idx_visit_events_timestamp",
                table: "visit_events",
                column: "timestamp");

            migrationBuilder.CreateIndex(
                name: "idx_visit_events_verdict",
                table: "visit_events",
                column: "verdict");

            migrationBuilder.CreateIndex(
                name: "idx_visit_events_visitor",
                table: "visit_events",
                column: "visitor_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "visit_events");
        }
    }
}

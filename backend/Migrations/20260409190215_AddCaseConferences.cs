using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseConferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // All social media tables (awareness_dates, content_facts, content_fact_candidates,
            // content_talking_points, cta_configs, graphic_templates, hashtag_sets, media_library,
            // milestone_rules, social_media_settings, voice_guide, generated_graphics,
            // automated_posts) and SourceCalendarEventId column already exist in the database
            // from prior work applied outside EF migration tracking.
            // This migration only creates the two NEW case conference tables.

            migrationBuilder.CreateTable(
                name: "case_conferences",
                columns: table => new
                {
                    conference_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    scheduled_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("case_conferences_pkey", x => x.conference_id);
                    table.ForeignKey(
                        name: "case_conferences_safehouse_id_fkey",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "case_conference_residents",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    conference_id = table.Column<int>(type: "integer", nullable: false),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false),
                    discussed = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    added_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("case_conference_residents_pkey", x => x.id);
                    table.ForeignKey(
                        name: "case_conference_residents_conference_id_fkey",
                        column: x => x.conference_id,
                        principalTable: "case_conferences",
                        principalColumn: "conference_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "case_conference_residents_resident_id_fkey",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "case_conference_residents_unique",
                table: "case_conference_residents",
                columns: new[] { "conference_id", "resident_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_case_conference_residents_resident_id",
                table: "case_conference_residents",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "case_conferences_safehouse_id_idx",
                table: "case_conferences",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "case_conferences_scheduled_date_idx",
                table: "case_conferences",
                column: "scheduled_date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "case_conference_residents");

            migrationBuilder.DropTable(
                name: "case_conferences");
        }
    }
}

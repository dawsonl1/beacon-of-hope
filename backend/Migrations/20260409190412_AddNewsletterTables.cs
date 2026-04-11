using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsletterTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Social media tables (awareness_dates, content_facts, etc.) and
            // SourceCalendarEventId column are already created by earlier migrations
            // (AddSocialMediaAutomationTables and AddRecordingSourceCalendarEvent).
            // This migration only creates the two newsletter tables.

            migrationBuilder.CreateTable(
                name: "newsletter_subscribers",
                columns: table => new
                {
                    newsletter_subscriber_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    email = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    subscribed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    unsubscribe_token = table.Column<string>(type: "text", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("newsletter_subscribers_pkey", x => x.newsletter_subscriber_id);
                });

            migrationBuilder.CreateTable(
                name: "newsletters",
                columns: table => new
                {
                    newsletter_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    subject = table.Column<string>(type: "text", nullable: true),
                    html_content = table.Column<string>(type: "text", nullable: true),
                    plain_text = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    approved_by = table.Column<string>(type: "text", nullable: true),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    recipient_count = table.Column<int>(type: "integer", nullable: false),
                    month_year = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("newsletters_pkey", x => x.newsletter_id);
                });

            migrationBuilder.CreateIndex(
                name: "newsletter_subscribers_active_idx",
                table: "newsletter_subscribers",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "newsletter_subscribers_email_idx",
                table: "newsletter_subscribers",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "newsletters_month_year_idx",
                table: "newsletters",
                column: "month_year",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "newsletters_status_idx",
                table: "newsletters",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "newsletter_subscribers");

            migrationBuilder.DropTable(
                name: "newsletters");
        }
    }
}

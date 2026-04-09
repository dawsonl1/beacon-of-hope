using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordingFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "donation_allocations_donation_id_fkey",
                table: "donation_allocations");

            migrationBuilder.DropForeignKey(
                name: "education_records_resident_id_fkey",
                table: "education_records");

            migrationBuilder.DropForeignKey(
                name: "health_wellbeing_records_resident_id_fkey",
                table: "health_wellbeing_records");

            migrationBuilder.DropForeignKey(
                name: "home_visitations_resident_id_fkey",
                table: "home_visitations");

            migrationBuilder.DropForeignKey(
                name: "in_kind_donation_items_donation_id_fkey",
                table: "in_kind_donation_items");

            migrationBuilder.DropForeignKey(
                name: "intervention_plans_resident_id_fkey",
                table: "intervention_plans");

            migrationBuilder.DropForeignKey(
                name: "process_recordings_resident_id_fkey",
                table: "process_recordings");

            migrationBuilder.AlterColumn<decimal>(
                name: "estimated_donation_value_php",
                table: "social_media_posts",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "boost_budget_php",
                table: "social_media_posts",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NeedsCaseConference",
                table: "process_recordings",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ReadyForReintegration",
                table: "process_recordings",
                type: "boolean",
                nullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "estimated_unit_value",
                table: "in_kind_donation_items",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "estimated_value",
                table: "donations",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "amount",
                table: "donations",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "amount_allocated",
                table: "donation_allocations",
                type: "numeric(12,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "staff_tasks",
                columns: table => new
                {
                    staff_task_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    staff_user_id = table.Column<string>(type: "text", nullable: false),
                    resident_id = table.Column<int>(type: "integer", nullable: true),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    task_type = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    context_json = table.Column<string>(type: "jsonb", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    snooze_until = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    due_trigger_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    source_entity_type = table.Column<string>(type: "text", nullable: true),
                    source_entity_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("staff_tasks_pkey", x => x.staff_task_id);
                    table.ForeignKey(
                        name: "staff_tasks_resident_id_fkey",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "staff_tasks_safehouse_id_fkey",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "staff_tasks_staff_user_id_fkey",
                        column: x => x.staff_user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_safehouses",
                columns: table => new
                {
                    user_safehouse_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("user_safehouses_pkey", x => x.user_safehouse_id);
                    table.ForeignKey(
                        name: "user_safehouses_safehouse_id_fkey",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "user_safehouses_user_id_fkey",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "calendar_events",
                columns: table => new
                {
                    calendar_event_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    staff_user_id = table.Column<string>(type: "text", nullable: false),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    resident_id = table.Column<int>(type: "integer", nullable: true),
                    event_type = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    event_date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    end_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    recurrence_rule = table.Column<string>(type: "text", nullable: true),
                    source_task_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("calendar_events_pkey", x => x.calendar_event_id);
                    table.ForeignKey(
                        name: "calendar_events_resident_id_fkey",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "calendar_events_safehouse_id_fkey",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "calendar_events_source_task_id_fkey",
                        column: x => x.source_task_id,
                        principalTable: "staff_tasks",
                        principalColumn: "staff_task_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "calendar_events_staff_user_id_fkey",
                        column: x => x.staff_user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_SupporterId",
                table: "AspNetUsers",
                column: "SupporterId");

            migrationBuilder.CreateIndex(
                name: "calendar_events_safehouse_id_idx",
                table: "calendar_events",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "calendar_events_staff_user_id_idx",
                table: "calendar_events",
                column: "staff_user_id");

            migrationBuilder.CreateIndex(
                name: "calendar_events_user_date_idx",
                table: "calendar_events",
                columns: new[] { "staff_user_id", "event_date" });

            migrationBuilder.CreateIndex(
                name: "IX_calendar_events_resident_id",
                table: "calendar_events",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_calendar_events_source_task_id",
                table: "calendar_events",
                column: "source_task_id");

            migrationBuilder.CreateIndex(
                name: "IX_staff_tasks_resident_id",
                table: "staff_tasks",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "staff_tasks_safehouse_id_idx",
                table: "staff_tasks",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "staff_tasks_staff_user_id_idx",
                table: "staff_tasks",
                column: "staff_user_id");

            migrationBuilder.CreateIndex(
                name: "staff_tasks_user_status_idx",
                table: "staff_tasks",
                columns: new[] { "staff_user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_user_safehouses_safehouse_id",
                table: "user_safehouses",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "user_safehouses_user_safehouse_idx",
                table: "user_safehouses",
                columns: new[] { "user_id", "safehouse_id" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_supporters_SupporterId",
                table: "AspNetUsers",
                column: "SupporterId",
                principalTable: "supporters",
                principalColumn: "supporter_id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "donation_allocations_donation_id_fkey",
                table: "donation_allocations",
                column: "donation_id",
                principalTable: "donations",
                principalColumn: "donation_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "education_records_resident_id_fkey",
                table: "education_records",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "health_wellbeing_records_resident_id_fkey",
                table: "health_wellbeing_records",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "home_visitations_resident_id_fkey",
                table: "home_visitations",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "in_kind_donation_items_donation_id_fkey",
                table: "in_kind_donation_items",
                column: "donation_id",
                principalTable: "donations",
                principalColumn: "donation_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "intervention_plans_resident_id_fkey",
                table: "intervention_plans",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "process_recordings_resident_id_fkey",
                table: "process_recordings",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_supporters_SupporterId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "donation_allocations_donation_id_fkey",
                table: "donation_allocations");

            migrationBuilder.DropForeignKey(
                name: "education_records_resident_id_fkey",
                table: "education_records");

            migrationBuilder.DropForeignKey(
                name: "health_wellbeing_records_resident_id_fkey",
                table: "health_wellbeing_records");

            migrationBuilder.DropForeignKey(
                name: "home_visitations_resident_id_fkey",
                table: "home_visitations");

            migrationBuilder.DropForeignKey(
                name: "in_kind_donation_items_donation_id_fkey",
                table: "in_kind_donation_items");

            migrationBuilder.DropForeignKey(
                name: "intervention_plans_resident_id_fkey",
                table: "intervention_plans");

            migrationBuilder.DropForeignKey(
                name: "process_recordings_resident_id_fkey",
                table: "process_recordings");

            migrationBuilder.DropTable(
                name: "calendar_events");

            migrationBuilder.DropTable(
                name: "user_safehouses");

            migrationBuilder.DropTable(
                name: "staff_tasks");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_SupporterId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "NeedsCaseConference",
                table: "process_recordings");

            migrationBuilder.DropColumn(
                name: "ReadyForReintegration",
                table: "process_recordings");

            migrationBuilder.AlterColumn<decimal>(
                name: "estimated_donation_value_php",
                table: "social_media_posts",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "boost_budget_php",
                table: "social_media_posts",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "estimated_unit_value",
                table: "in_kind_donation_items",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "estimated_value",
                table: "donations",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "amount",
                table: "donations",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "amount_allocated",
                table: "donation_allocations",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(12,2)",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "donation_allocations_donation_id_fkey",
                table: "donation_allocations",
                column: "donation_id",
                principalTable: "donations",
                principalColumn: "donation_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "education_records_resident_id_fkey",
                table: "education_records",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "health_wellbeing_records_resident_id_fkey",
                table: "health_wellbeing_records",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "home_visitations_resident_id_fkey",
                table: "home_visitations",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "in_kind_donation_items_donation_id_fkey",
                table: "in_kind_donation_items",
                column: "donation_id",
                principalTable: "donations",
                principalColumn: "donation_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "intervention_plans_resident_id_fkey",
                table: "intervention_plans",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "process_recordings_resident_id_fkey",
                table: "process_recordings",
                column: "resident_id",
                principalTable: "residents",
                principalColumn: "resident_id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

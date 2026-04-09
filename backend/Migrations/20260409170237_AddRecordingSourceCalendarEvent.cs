using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddRecordingSourceCalendarEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SourceCalendarEventId",
                table: "process_recordings",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_process_recordings_SourceCalendarEventId",
                table: "process_recordings",
                column: "SourceCalendarEventId");

            migrationBuilder.AddForeignKey(
                name: "FK_process_recordings_calendar_events_SourceCalendarEventId",
                table: "process_recordings",
                column: "SourceCalendarEventId",
                principalTable: "calendar_events",
                principalColumn: "calendar_event_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_process_recordings_calendar_events_SourceCalendarEventId",
                table: "process_recordings");

            migrationBuilder.DropIndex(
                name: "IX_process_recordings_SourceCalendarEventId",
                table: "process_recordings");

            migrationBuilder.DropColumn(
                name: "SourceCalendarEventId",
                table: "process_recordings");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class DropNewsletterMonthYearUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "newsletters_month_year_idx",
                table: "newsletters");

            migrationBuilder.CreateIndex(
                name: "newsletters_month_year_idx",
                table: "newsletters",
                column: "month_year");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "newsletters_month_year_idx",
                table: "newsletters");

            migrationBuilder.CreateIndex(
                name: "newsletters_month_year_idx",
                table: "newsletters",
                column: "month_year",
                unique: true);
        }
    }
}

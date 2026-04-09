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

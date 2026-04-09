using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixResidentNameColumnMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Columns may already be snake_case (created via ALTER TABLE).
            // Only rename if the PascalCase columns still exist.
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='FirstName') THEN
                        ALTER TABLE residents RENAME COLUMN "FirstName" TO first_name;
                    END IF;
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='LastName') THEN
                        ALTER TABLE residents RENAME COLUMN "LastName" TO last_name;
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE residents RENAME COLUMN first_name TO "FirstName";
                ALTER TABLE residents RENAME COLUMN last_name TO "LastName";
                """);
        }
    }
}

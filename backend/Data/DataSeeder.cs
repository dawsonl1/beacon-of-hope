using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace backend.Data;

/// <summary>
/// Seeds all domain data from CSV files in backend/seed/.
/// Uses PostgreSQL COPY for fast bulk import. Skips if data already exists.
/// </summary>
public static class DataSeeder
{
    // Import order respects foreign key dependencies.
    // Tables with email-based user references are imported last via a separate path.
    private static readonly string[] DirectCopyTables =
    [
        "safehouses",
        "partners",
        "partner_assignments",
        "residents",
        "supporters",
        "donations",
        "donation_allocations",
        "incident_reports",
        "intervention_plans",
        "education_records",
        "health_wellbeing_records",
        "process_recordings",
        "home_visitations",
        "social_media_posts",
        "safehouse_monthly_metrics",
        "in_kind_donation_items",
        "public_impact_snapshots",
        "case_conferences",
        "case_conference_residents",
        "donor_outreaches",
        "media_library",
        "newsletters",
        "newsletter_subscribers",
        "content_facts",
        "content_talking_points",
        "social_media_settings",
        "app_settings",
        "automated_posts",
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Skip if data already exists
        if (await db.Safehouses.AnyAsync()) return;

        var seedDir = FindSeedDirectory();
        if (seedDir == null)
        {
            Console.WriteLine("Seed directory not found — skipping data seed.");
            return;
        }

        Console.WriteLine($"Seeding from {seedDir}...");
        var connString = db.Database.GetConnectionString()!;

        // 1. Bulk-import all direct-copy tables via COPY FROM STDIN
        // Each table gets its own connection to isolate failures
        foreach (var table in DirectCopyTables)
        {
            var csvPath = Path.Combine(seedDir, $"{table}.csv");
            if (!File.Exists(csvPath)) continue;

            try
            {
                await using var conn = new NpgsqlConnection(connString);
                await conn.OpenAsync();

                // Disable FK checks (requires superuser, granted by reset-demo.sh)
                try { await new NpgsqlCommand("SET session_replication_role = 'replica'", conn).ExecuteNonQueryAsync(); }
                catch { /* non-superuser fallback */ }

                var rawHeaders = (await File.ReadAllLinesAsync(csvPath))[0];
                var quotedHeaders = string.Join(",", rawHeaders.Split(',').Select(h => $"\"{h.Trim()}\""));
                await using var writer = await conn.BeginTextImportAsync(
                    $"COPY {table} ({quotedHeaders}) FROM STDIN WITH (FORMAT csv, HEADER true)");
                await writer.WriteAsync(await File.ReadAllTextAsync(csvPath));

                var lineCount = (await File.ReadAllLinesAsync(csvPath)).Length - 1;
                Console.WriteLine($"  {table}: {lineCount} rows");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  {table}: SKIPPED ({ex.Message.Split('\n')[0]})");
            }
        }

        // 2. Import user-linked tables via temp table + COPY (email → user ID resolution in SQL)
        await ImportViaTemp(connString, seedDir, "user_safehouses",
            "user_safehouse_id int, user_email text, safehouse_id int",
            @"INSERT INTO user_safehouses (user_safehouse_id, user_id, safehouse_id)
              SELECT t.user_safehouse_id, u.""Id"", t.safehouse_id
              FROM _tmp t JOIN ""AspNetUsers"" u ON u.""NormalizedEmail"" = upper(t.user_email)");

        await ImportViaTemp(connString, seedDir, "staff_tasks",
            @"staff_task_id int, staff_email text, resident_id int, safehouse_id int, task_type text,
              title text, description text, context_json jsonb, status text,
              snooze_until timestamptz, due_trigger_date timestamptz, created_at timestamptz,
              completed_at timestamptz, source_entity_type text, source_entity_id int",
            @"INSERT INTO staff_tasks (staff_task_id, staff_user_id, resident_id, safehouse_id, task_type,
                  title, description, context_json, status, snooze_until, due_trigger_date,
                  created_at, completed_at, source_entity_type, source_entity_id)
              SELECT t.staff_task_id, u.""Id"", t.resident_id, t.safehouse_id, t.task_type,
                  t.title, t.description, t.context_json, t.status, t.snooze_until, t.due_trigger_date,
                  t.created_at, t.completed_at, t.source_entity_type, t.source_entity_id
              FROM _tmp t JOIN ""AspNetUsers"" u ON u.""NormalizedEmail"" = upper(t.staff_email)");

        await ImportViaTemp(connString, seedDir, "calendar_events",
            @"calendar_event_id int, staff_email text, safehouse_id int, resident_id int,
              event_type text, title text, description text, event_date date,
              start_time time, end_time time, recurrence_rule text, source_task_id int,
              status text, created_at timestamptz",
            @"INSERT INTO calendar_events (calendar_event_id, staff_user_id, safehouse_id, resident_id,
                  event_type, title, description, event_date, start_time, end_time,
                  recurrence_rule, source_task_id, status, created_at)
              SELECT t.calendar_event_id, u.""Id"", t.safehouse_id, t.resident_id,
                  t.event_type, t.title, t.description, t.event_date, t.start_time, t.end_time,
                  t.recurrence_rule, t.source_task_id, t.status, t.created_at
              FROM _tmp t JOIN ""AspNetUsers"" u ON u.""NormalizedEmail"" = upper(t.staff_email)");

        // 3. Reset all sequences to match imported data
        await ResetSequencesAsync(db);

        Console.WriteLine("Seed complete.");
    }

    /// <summary>
    /// Imports a CSV with an email column into a table that expects a user ID.
    /// Uses COPY into a temp table (handles all CSV quoting natively in PostgreSQL),
    /// then INSERT...SELECT with a JOIN to resolve emails to user IDs.
    /// </summary>
    private static async Task ImportViaTemp(string connString, string seedDir,
        string table, string tempColumns, string insertSelect)
    {
        var csvPath = Path.Combine(seedDir, $"{table}.csv");
        if (!File.Exists(csvPath)) return;

        try
        {
            await using var conn = new NpgsqlConnection(connString);
            await conn.OpenAsync();

            await new NpgsqlCommand($"CREATE TEMP TABLE _tmp ({tempColumns})", conn).ExecuteNonQueryAsync();

            // COPY into temp table — writer must be disposed before running INSERT
            using (var writer = await conn.BeginTextImportAsync(
                "COPY _tmp FROM STDIN WITH (FORMAT csv, HEADER true)"))
            {
                await writer.WriteAsync(await File.ReadAllTextAsync(csvPath));
            }

            var rows = await new NpgsqlCommand(insertSelect, conn).ExecuteNonQueryAsync();
            await new NpgsqlCommand("DROP TABLE _tmp", conn).ExecuteNonQueryAsync();

            Console.WriteLine($"  {table}: {rows} rows");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  {table}: SKIPPED ({ex.Message.Split('\n')[0]})");
        }
    }

    public static async Task ResetSequencesAsync(AppDbContext db)
    {
        // Dynamically find and reset all identity sequences
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                DO $$
                DECLARE r RECORD;
                BEGIN
                    FOR r IN
                        SELECT c.table_name, c.column_name,
                               pg_get_serial_sequence(c.table_name, c.column_name) as seq
                        FROM information_schema.columns c
                        WHERE c.table_schema = 'public'
                          AND c.column_default LIKE 'generated%'
                          AND pg_get_serial_sequence(c.table_name, c.column_name) IS NOT NULL
                    LOOP
                        EXECUTE format(
                            'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 0))',
                            r.seq, r.column_name, r.table_name
                        );
                    END LOOP;
                END $$;
            ");
        }
        catch { /* non-PostgreSQL database */ }
    }

    private static string? FindSeedDirectory()
    {
        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var dir = start;
            for (int depth = 0; depth < 8 && dir != null; depth++)
            {
                var candidate = Path.Combine(dir, "backend", "seed");
                if (Directory.Exists(candidate) && Directory.GetFiles(candidate, "*.csv").Length > 0)
                    return candidate;
                // Also check if seed/ is a sibling (when running from backend/)
                candidate = Path.Combine(dir, "seed");
                if (Directory.Exists(candidate) && Directory.GetFiles(candidate, "*.csv").Length > 0)
                    return candidate;
                dir = Directory.GetParent(dir)?.FullName;
            }
        }
        return null;
    }

}

using Microsoft.AspNetCore.Identity;
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
        await using var conn = new NpgsqlConnection(connString);
        await conn.OpenAsync();

        foreach (var table in DirectCopyTables)
        {
            var csvPath = Path.Combine(seedDir, $"{table}.csv");
            if (!File.Exists(csvPath)) continue;

            var headers = (await File.ReadAllLinesAsync(csvPath))[0];
            await using var writer = await conn.BeginTextImportAsync(
                $"COPY {table} ({headers}) FROM STDIN WITH (FORMAT csv, HEADER true)");
            await writer.WriteAsync(await File.ReadAllTextAsync(csvPath));

            var lineCount = (await File.ReadAllLinesAsync(csvPath)).Length - 1;
            Console.WriteLine($"  {table}: {lineCount} rows");
        }

        // 2. Import user-linked tables (CSV has email, DB needs user ID)
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<backend.Models.ApplicationUser>>();
        await ImportUserSafehousesAsync(conn, seedDir, userManager);
        await ImportStaffTasksAsync(conn, seedDir, userManager);
        await ImportCalendarEventsAsync(conn, seedDir, userManager);

        await conn.CloseAsync();

        // 3. Reset all sequences to match imported data
        await ResetSequencesAsync(db);

        Console.WriteLine("Seed complete.");
    }

    private static async Task ImportUserSafehousesAsync(NpgsqlConnection conn, string seedDir,
        UserManager<backend.Models.ApplicationUser> userManager)
    {
        var csvPath = Path.Combine(seedDir, "user_safehouses.csv");
        if (!File.Exists(csvPath)) return;

        var lines = await File.ReadAllLinesAsync(csvPath);
        var count = 0;
        for (int i = 1; i < lines.Length; i++)
        {
            var cols = lines[i].Split(',');
            if (cols.Length < 3) continue;
            var user = await userManager.FindByEmailAsync(cols[1]);
            if (user == null) continue;

            await using var cmd = new NpgsqlCommand(
                "INSERT INTO user_safehouses (user_safehouse_id, user_id, safehouse_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", conn);
            cmd.Parameters.AddWithValue(int.Parse(cols[0]));
            cmd.Parameters.AddWithValue(user.Id);
            cmd.Parameters.AddWithValue(int.Parse(cols[2]));
            await cmd.ExecuteNonQueryAsync();
            count++;
        }
        Console.WriteLine($"  user_safehouses: {count} rows");
    }

    private static async Task ImportStaffTasksAsync(NpgsqlConnection conn, string seedDir,
        UserManager<backend.Models.ApplicationUser> userManager)
    {
        var csvPath = Path.Combine(seedDir, "staff_tasks.csv");
        if (!File.Exists(csvPath)) return;

        var lines = await File.ReadAllLinesAsync(csvPath);
        var headers = lines[0];
        var count = 0;

        // Build email → userId lookup
        var emailCache = new Dictionary<string, string>();

        for (int i = 1; i < lines.Length; i++)
        {
            var cols = ParseCsvLine(lines[i]);
            if (cols.Length < 15) continue;

            var email = cols[1];
            if (!emailCache.TryGetValue(email, out var userId))
            {
                var user = await userManager.FindByEmailAsync(email);
                if (user == null) continue;
                userId = user.Id;
                emailCache[email] = userId;
            }

            await using var cmd = new NpgsqlCommand(@"
                INSERT INTO staff_tasks (staff_task_id, staff_user_id, resident_id, safehouse_id, task_type,
                    title, description, context_json, status, snooze_until, due_trigger_date,
                    created_at, completed_at, source_entity_type, source_entity_id)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15)
                ON CONFLICT DO NOTHING", conn);

            cmd.Parameters.AddWithValue(int.Parse(cols[0]));
            cmd.Parameters.AddWithValue(userId);
            cmd.Parameters.AddWithValue(ParseNullableInt(cols[2]));
            cmd.Parameters.AddWithValue(int.Parse(cols[3]));
            cmd.Parameters.AddWithValue(cols[4]);
            cmd.Parameters.AddWithValue(cols[5]);
            cmd.Parameters.AddWithValue(ParseNullableString(cols[6]));
            cmd.Parameters.AddWithValue(ParseNullableString(cols[7]));
            cmd.Parameters.AddWithValue(cols[8]);
            cmd.Parameters.AddWithValue(ParseNullableTimestamp(cols[9]));
            cmd.Parameters.AddWithValue(ParseNullableTimestamp(cols[10]));
            cmd.Parameters.AddWithValue(DateTime.Parse(cols[11]).ToUniversalTime());
            cmd.Parameters.AddWithValue(ParseNullableTimestamp(cols[12]));
            cmd.Parameters.AddWithValue(ParseNullableString(cols[13]));
            cmd.Parameters.AddWithValue(ParseNullableInt(cols[14]));
            await cmd.ExecuteNonQueryAsync();
            count++;
        }
        Console.WriteLine($"  staff_tasks: {count} rows");
    }

    private static async Task ImportCalendarEventsAsync(NpgsqlConnection conn, string seedDir,
        UserManager<backend.Models.ApplicationUser> userManager)
    {
        var csvPath = Path.Combine(seedDir, "calendar_events.csv");
        if (!File.Exists(csvPath)) return;

        var lines = await File.ReadAllLinesAsync(csvPath);
        var count = 0;
        var emailCache = new Dictionary<string, string>();

        for (int i = 1; i < lines.Length; i++)
        {
            var cols = ParseCsvLine(lines[i]);
            if (cols.Length < 14) continue;

            var email = cols[1];
            if (!emailCache.TryGetValue(email, out var userId))
            {
                var user = await userManager.FindByEmailAsync(email);
                if (user == null) continue;
                userId = user.Id;
                emailCache[email] = userId;
            }

            await using var cmd = new NpgsqlCommand(@"
                INSERT INTO calendar_events (calendar_event_id, staff_user_id, safehouse_id, resident_id,
                    event_type, title, description, event_date, start_time, end_time,
                    recurrence_rule, source_task_id, status, created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                ON CONFLICT DO NOTHING", conn);

            cmd.Parameters.AddWithValue(int.Parse(cols[0]));
            cmd.Parameters.AddWithValue(userId);
            cmd.Parameters.AddWithValue(int.Parse(cols[2]));
            cmd.Parameters.AddWithValue(ParseNullableInt(cols[3]));
            cmd.Parameters.AddWithValue(cols[4]);
            cmd.Parameters.AddWithValue(cols[5]);
            cmd.Parameters.AddWithValue(ParseNullableString(cols[6]));
            cmd.Parameters.AddWithValue(DateOnly.Parse(cols[7]));
            cmd.Parameters.AddWithValue(ParseNullableTime(cols[8]));
            cmd.Parameters.AddWithValue(ParseNullableTime(cols[9]));
            cmd.Parameters.AddWithValue(ParseNullableString(cols[10]));
            cmd.Parameters.AddWithValue(ParseNullableInt(cols[11]));
            cmd.Parameters.AddWithValue(cols[12]);
            cmd.Parameters.AddWithValue(DateTime.Parse(cols[13]).ToUniversalTime());
            await cmd.ExecuteNonQueryAsync();
            count++;
        }
        Console.WriteLine($"  calendar_events: {count} rows");
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

    // Simple CSV line parser that handles quoted fields with commas
    private static string[] ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var current = "";
        var inQuotes = false;
        for (int i = 0; i < line.Length; i++)
        {
            if (line[i] == '"')
                inQuotes = !inQuotes;
            else if (line[i] == ',' && !inQuotes)
            {
                fields.Add(current);
                current = "";
            }
            else
                current += line[i];
        }
        fields.Add(current);
        return fields.ToArray();
    }

    private static object ParseNullableInt(string val) =>
        string.IsNullOrEmpty(val) ? DBNull.Value : (object)int.Parse(val);

    private static object ParseNullableString(string val) =>
        string.IsNullOrEmpty(val) ? DBNull.Value : (object)val;

    private static object ParseNullableTimestamp(string val) =>
        string.IsNullOrEmpty(val) ? DBNull.Value : (object)DateTime.Parse(val).ToUniversalTime();

    private static object ParseNullableTime(string val) =>
        string.IsNullOrEmpty(val) ? DBNull.Value : (object)TimeOnly.Parse(val);
}

using backend.Data;
using backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class PublicEndpoints
{
    public static void MapPublicEndpoints(this WebApplication app)
    {
        // ── Health endpoint ─────────────────────────────────────────

        app.MapGet("/api/health", async (AppDbContext db) =>
        {
            // NOTE: Use a normal EF Core query to verify connectivity.
            var canConnect = false;
            try
            {
                await db.Safehouses.Select(s => s.SafehouseId).FirstOrDefaultAsync();
                canConnect = true;
            }
            catch { }

            return new
            {
                status = canConnect ? "ok" : "degraded",
                database = canConnect ? "connected" : "unreachable",
                timestamp = DateTime.UtcNow.ToString("o")
            };
        });

        // ── Public Impact endpoints ──────────────────────────────

        app.MapGet("/api/impact/summary", async (AppDbContext db) =>
        {
            var r = await db.Residents
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    total = g.Count(),
                    active = g.Count(r => r.CaseStatus == "Active"),
                    completed = g.Count(r => r.ReintegrationStatus == "Completed")
                })
                .FirstOrDefaultAsync() ?? new { total = 0, active = 0, completed = 0 };

            var activeSafehouses = await db.Safehouses.CountAsync(s => s.Status == "Active");
            var totalDonations = await db.Donations
                .Where(d => d.DonationDate <= AppConstants.DataCutoff)
                .SumAsync(d => (decimal?)d.Amount ?? 0);

            return new
            {
                totalResidents = r.total,
                activeResidents = r.active,
                activeSafehouses,
                totalDonations,
                completedReintegrations = r.completed,
                reintegrationRate = r.total > 0 ? Math.Round((double)r.completed / r.total * 100) : 0
            };
        });

        app.MapGet("/api/impact/donations-by-month", async (AppDbContext db) =>
        {
            var data = await db.Donations
                .Where(d => d.DonationDate != null && d.Amount != null && d.DonationDate <= AppConstants.DataCutoff)
                .GroupBy(d => new { d.DonationDate!.Value.Year, d.DonationDate!.Value.Month })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    total = g.Sum(d => (decimal?)d.Amount ?? 0),
                    count = g.Count()
                })
                .OrderBy(x => x.year).ThenBy(x => x.month)
                .ToListAsync();

            return data;
        });

        app.MapGet("/api/impact/allocations-by-program", async (AppDbContext db) =>
        {
            var data = await db.DonationAllocations
                .Where(a => a.ProgramArea != null && (a.AllocationDate == null || a.AllocationDate <= AppConstants.DataCutoff))
                .GroupBy(a => a.ProgramArea)
                .Select(g => new
                {
                    area = g.Key,
                    amount = g.Sum(a => (decimal?)a.AmountAllocated ?? 0)
                })
                .OrderByDescending(x => x.amount)
                .ToListAsync();

            return data;
        });

        app.MapGet("/api/impact/education-trends", async (AppDbContext db) =>
        {
            var data = await db.EducationRecords
                .Where(e => e.RecordDate != null && e.ProgressPercent != null && e.RecordDate <= AppConstants.DataCutoff)
                .GroupBy(e => new { e.RecordDate!.Value.Year, e.RecordDate!.Value.Month })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    avgProgress = Math.Round(g.Average(e => (double?)e.ProgressPercent ?? 0), 1),
                    avgAttendance = Math.Round(g.Average(e => (double?)e.AttendanceRate ?? 0), 1)
                })
                .OrderBy(x => x.year).ThenBy(x => x.month)
                .ToListAsync();

            return data;
        });

        app.MapGet("/api/impact/education-summary", async (AppDbContext db) =>
        {
            var enrollmentBreakdown = await db.EducationRecords
                .Where(e => e.EnrollmentStatus != null)
                .GroupBy(e => e.EnrollmentStatus)
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToListAsync();
            var completionBreakdown = await db.EducationRecords
                .Where(e => e.CompletionStatus != null)
                .GroupBy(e => e.CompletionStatus)
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToListAsync();
            return new { enrollmentBreakdown, completionBreakdown };
        });

        app.MapGet("/api/impact/health-trends", async (AppDbContext db) =>
        {
            var data = await db.HealthWellbeingRecords
                .Where(h => h.RecordDate != null && h.GeneralHealthScore != null && h.RecordDate <= AppConstants.DataCutoff)
                .GroupBy(h => new { h.RecordDate!.Value.Year, h.RecordDate!.Value.Month })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    avgHealth = Math.Round(g.Average(h => (double?)h.GeneralHealthScore ?? 0), 2),
                    avgNutrition = Math.Round(g.Average(h => (double?)h.NutritionScore ?? 0), 2),
                    avgSleep = Math.Round(g.Average(h => (double?)h.SleepQualityScore ?? 0), 2),
                    avgEnergy = Math.Round(g.Average(h => (double?)h.EnergyLevelScore ?? 0), 2)
                })
                .OrderBy(x => x.year).ThenBy(x => x.month)
                .ToListAsync();

            return data;
        });

        app.MapGet("/api/impact/safehouses", async (AppDbContext db) =>
        {
            var data = await db.Safehouses
                .Select(s => new
                {
                    s.SafehouseId,
                    s.SafehouseCode,
                    s.Name,
                    s.Region,
                    s.City,
                    s.Status,
                    s.CapacityGirls,
                    s.CurrentOccupancy
                })
                .ToListAsync();

            return data;
        });

        app.MapGet("/api/impact/snapshots", async (AppDbContext db) =>
        {
            var data = await db.PublicImpactSnapshots
                .Where(s => s.IsPublished == true)
                .OrderByDescending(s => s.SnapshotDate)
                .Take(12)
                .Select(s => new
                {
                    s.SnapshotDate,
                    s.Headline,
                    s.SummaryText,
                    s.MetricPayloadJson
                })
                .ToListAsync();

            return data;
        });

        // ── Donation monthly progress (public) ──────────────────

        app.MapGet("/api/donate/monthly-progress", async (AppDbContext db) =>
        {
            var startOfMonth = new DateOnly(AppConstants.DataCutoff.Year, AppConstants.DataCutoff.Month, 1);
            var raised = await db.Donations
                .Where(d => d.DonationDate >= startOfMonth && d.DonationDate <= AppConstants.DataCutoff)
                .SumAsync(d => (decimal?)d.Amount ?? 0);
            var goal = 15000m;
            var donorCount = await db.Donations
                .Where(d => d.DonationDate >= startOfMonth && d.DonationDate <= AppConstants.DataCutoff)
                .CountAsync();

            return new { raised, goal, donorCount };
        });

        // ── Volunteer sign-up (public) ──────────────────────────

        app.MapPost("/api/volunteer", async (AppDbContext db, HttpContext httpContext) =>
        {
            try
            {
                var body = await httpContext.Request.ReadFromJsonAsync<VolunteerSignupRequest>();
                if (body == null) return Results.BadRequest(new { error = "Request body is required." });

                var firstName = body.FirstName?.Trim() ?? "";
                var lastName = body.LastName?.Trim() ?? "";
                var email = body.Email?.Trim() ?? "";
                var region = body.Region?.Trim() ?? "";

                if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName))
                    return Results.BadRequest(new { error = "First and last name are required." });
                if (string.IsNullOrEmpty(email))
                    return Results.BadRequest(new { error = "Email is required." });
                if (string.IsNullOrEmpty(region))
                    return Results.BadRequest(new { error = "Region is required." });

                // Check if this email is already registered as a volunteer
                var existing = await db.Supporters
                    .AnyAsync(s => s.Email == email && s.SupporterType == "Volunteer");
                if (existing)
                    return Results.Ok(new { message = "You're already signed up. We'll be in touch!" });

                // Ensure the identity sequence is in sync (seed data uses explicit IDs)
                await db.Database.ExecuteSqlRawAsync(
                    "SELECT setval(pg_get_serial_sequence('supporters', 'supporter_id'), (SELECT COALESCE(MAX(supporter_id), 0) FROM supporters))");

                var supporter = new backend.Models.Supporter
                {
                    SupporterType = "Volunteer",
                    FirstName = firstName,
                    LastName = lastName,
                    DisplayName = $"{firstName} {lastName}",
                    Email = email,
                    Region = region,
                    Country = "Guam",
                    Status = "Prospective",
                    AcquisitionChannel = "Direct",
                    CreatedAt = DateTime.UtcNow,
                };

                db.Supporters.Add(supporter);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Thank you for your interest!" });
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("VolunteerEndpoint");
                logger.LogError(ex, "Volunteer signup failed");
                var inner = ex.InnerException?.Message ?? "no inner exception";
                return Results.Problem($"Volunteer signup failed: {ex.Message} | Inner: {inner}");
            }
        });

        // ── Partner sign-up (public) ────────────────────────────

        app.MapPost("/api/partner", async (AppDbContext db, HttpContext httpContext) =>
        {
            try
            {
                var body = await httpContext.Request.ReadFromJsonAsync<PartnerSignupRequest>();
                if (body == null) return Results.BadRequest(new { error = "Request body is required." });

                var partnerName = body.PartnerName?.Trim() ?? "";
                var contactName = body.ContactName?.Trim() ?? "";
                var email = body.Email?.Trim() ?? "";

                if (string.IsNullOrEmpty(contactName))
                    return Results.BadRequest(new { error = "Contact name is required." });
                if (string.IsNullOrEmpty(email))
                    return Results.BadRequest(new { error = "Email is required." });

                // Check if this email is already registered as a partner
                var existing = await db.Partners
                    .AnyAsync(p => p.Email == email);
                if (existing)
                    return Results.Ok(new { message = "You're already registered. We'll be in touch!" });

                // Reset sequence to avoid duplicate key issues (same as volunteer endpoint)
                await db.Database.ExecuteSqlRawAsync(
                    "SELECT setval(pg_get_serial_sequence('partners', 'partner_id'), (SELECT COALESCE(MAX(partner_id), 0) FROM partners))");

                var partner = new backend.Models.Partner
                {
                    PartnerName = string.IsNullOrEmpty(partnerName) ? contactName : partnerName,
                    PartnerType = body.PartnerType?.Trim() ?? "Organization",
                    RoleType = "Prospective",
                    ContactName = contactName,
                    Email = email,
                    Phone = body.Phone?.Trim(),
                    Status = "Prospective",
                    StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    Notes = body.Notes?.Trim(),
                };

                db.Partners.Add(partner);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Thank you for your interest in partnering!" });
            }
            catch (Exception ex)
            {
                var logger = httpContext.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("PartnerEndpoint");
                logger.LogError(ex, "Partner signup failed");
                var inner = ex.InnerException?.Message ?? "no inner exception";
                return Results.Problem($"Partner signup failed: {ex.Message} | Inner: {inner}");
            }
        });
    }
}

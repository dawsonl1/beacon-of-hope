using Microsoft.EntityFrameworkCore;
using backend.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "https://intex2-1.vercel.app",
                "https://intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
logger.LogInformation("Environment: {env}", app.Environment.EnvironmentName);
logger.LogInformation("Connection string present: {present}", !string.IsNullOrEmpty(builder.Configuration.GetConnectionString("DefaultConnection")));

// Test DB connection on startup
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.CanConnectAsync();
    logger.LogInformation("Database connection: OK");
}
catch (Exception ex)
{
    logger.LogError(ex, "Database connection: FAILED");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();

app.MapGet("/api/health", async (AppDbContext db) =>
{
    var canConnect = false;
    try { canConnect = await db.Database.CanConnectAsync(); } catch { }
    return new
    {
        status = canConnect ? "ok" : "degraded",
        database = canConnect ? "connected" : "unreachable",
        environment = app.Environment.EnvironmentName
    };
});

// ── Public endpoints (Impact page, Home page) ──────────────

app.MapGet("/api/impact/summary", async (AppDbContext db) =>
{
    var residentStatsTask = db.Residents
        .GroupBy(_ => 1)
        .Select(g => new
        {
            total = g.Count(),
            active = g.Count(r => r.CaseStatus == "Active"),
            completed = g.Count(r => r.ReintegrationStatus == "Completed")
        })
        .FirstOrDefaultAsync();

    var safehouseTask = db.Safehouses.CountAsync(s => s.Status == "Active");
    var donationsTask = db.Donations.SumAsync(d => (decimal?)d.Amount ?? 0);

    await Task.WhenAll(residentStatsTask, safehouseTask, donationsTask);

    var r = residentStatsTask.Result ?? new { total = 0, active = 0, completed = 0 };

    return new
    {
        totalResidents = r.total,
        activeResidents = r.active,
        activeSafehouses = safehouseTask.Result,
        totalDonations = donationsTask.Result,
        completedReintegrations = r.completed,
        reintegrationRate = r.total > 0 ? Math.Round((double)r.completed / r.total * 100) : 0
    };
});

app.MapGet("/api/impact/donations-by-month", async (AppDbContext db) =>
{
    var data = await db.Donations
        .Where(d => d.DonationDate != null && d.Amount != null)
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
        .Where(a => a.ProgramArea != null)
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
        .Where(e => e.RecordDate != null && e.ProgressPercent != null)
        .GroupBy(e => new { e.RecordDate!.Value.Year, e.RecordDate!.Value.Month })
        .Select(g => new
        {
            year = g.Key.Year,
            month = g.Key.Month,
            avgProgress = Math.Round(g.Average(e => (double?)e.ProgressPercent ?? 0), 1)
        })
        .OrderBy(x => x.year).ThenBy(x => x.month)
        .ToListAsync();

    return data;
});

app.MapGet("/api/impact/health-trends", async (AppDbContext db) =>
{
    var data = await db.HealthWellbeingRecords
        .Where(h => h.RecordDate != null && h.GeneralHealthScore != null)
        .GroupBy(h => new { h.RecordDate!.Value.Year, h.RecordDate!.Value.Month })
        .Select(g => new
        {
            year = g.Key.Year,
            month = g.Key.Month,
            avgHealth = Math.Round(g.Average(h => (double?)h.GeneralHealthScore ?? 0), 2)
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

// ── Admin endpoints ────────────────────────────────────────

app.MapGet("/api/admin/metrics", async (AppDbContext db) =>
{
    var now = DateTime.UtcNow;
    var startOfMonth = new DateOnly(now.Year, now.Month, 1);
    var startOfLastMonth = startOfMonth.AddMonths(-1);

    var activeResidentsTask = db.Residents.CountAsync(r => r.CaseStatus == "Active");

    var incidentStatsTask = db.IncidentReports
        .Where(i => i.Resolved != true)
        .GroupBy(_ => 1)
        .Select(g => new
        {
            total = g.Count(),
            critical = g.Count(i => i.Severity == "Critical"),
            high = g.Count(i => i.Severity == "High")
        })
        .FirstOrDefaultAsync();

    var currentMonthTask = db.Donations
        .Where(d => d.DonationDate >= startOfMonth)
        .GroupBy(_ => 1)
        .Select(g => new
        {
            total = g.Sum(d => (decimal?)d.Amount ?? 0),
            count = g.Count()
        })
        .FirstOrDefaultAsync();

    var lastMonthTask = db.Donations
        .Where(d => d.DonationDate >= startOfLastMonth && d.DonationDate < startOfMonth)
        .SumAsync(d => (decimal?)d.Amount ?? 0);

    var nextConferenceTask = db.InterventionPlans
        .Where(p => p.CaseConferenceDate > DateOnly.FromDateTime(now))
        .OrderBy(p => p.CaseConferenceDate)
        .Select(p => new { p.CaseConferenceDate })
        .FirstOrDefaultAsync();

    var conferenceCountTask = db.InterventionPlans
        .CountAsync(p => p.CaseConferenceDate > DateOnly.FromDateTime(now));

    await Task.WhenAll(activeResidentsTask, incidentStatsTask, currentMonthTask, lastMonthTask, nextConferenceTask, conferenceCountTask);

    var incidents = incidentStatsTask.Result ?? new { total = 0, critical = 0, high = 0 };
    var currentMonth = currentMonthTask.Result ?? new { total = 0m, count = 0 };
    var lastMonthDonations = lastMonthTask.Result;

    var donationChange = lastMonthDonations > 0
        ? Math.Round((double)(currentMonth.total - lastMonthDonations) / (double)lastMonthDonations * 100, 1)
        : 0;

    var activeResidents = activeResidentsTask.Result;
    var openIncidents = incidents.total;
    var criticalIncidents = incidents.critical;
    var highIncidents = incidents.high;
    var monthlyDonations = currentMonth.total;
    var monthlyDonationCount = currentMonth.count;
    var upcomingConferences = conferenceCountTask.Result;
    var nextConference = nextConferenceTask.Result?.CaseConferenceDate;

    return new
    {
        activeResidents,
        openIncidents,
        criticalIncidents,
        highIncidents,
        monthlyDonations,
        monthlyDonationCount,
        donationChange,
        upcomingConferences,
        nextConference
    };
});

app.MapGet("/api/admin/residents", async (AppDbContext db) =>
{
    var data = await db.Residents
        .Where(r => r.CaseStatus == "Active")
        .OrderByDescending(r => r.CurrentRiskLevel == "Critical" ? 0 :
                                r.CurrentRiskLevel == "High" ? 1 :
                                r.CurrentRiskLevel == "Medium" ? 2 : 3)
        .ThenByDescending(r => r.DateOfAdmission)
        .Take(20)
        .Select(r => new
        {
            r.InternalCode,
            safehouse = db.Safehouses
                .Where(s => s.SafehouseId == r.SafehouseId)
                .Select(s => s.SafehouseCode + " " + s.City)
                .FirstOrDefault(),
            r.CaseCategory,
            r.CurrentRiskLevel,
            r.DateOfAdmission,
            r.AssignedSocialWorker,
            lastSession = db.ProcessRecordings
                .Where(p => p.ResidentId == r.ResidentId)
                .OrderByDescending(p => p.SessionDate)
                .Select(p => p.SessionDate)
                .FirstOrDefault()
        })
        .ToListAsync();

    return data;
});

app.MapGet("/api/admin/recent-donations", async (AppDbContext db) =>
{
    var data = await db.Donations
        .OrderByDescending(d => d.DonationDate)
        .Take(5)
        .Select(d => new
        {
            supporter = db.Supporters
                .Where(s => s.SupporterId == d.SupporterId)
                .Select(s => s.DisplayName)
                .FirstOrDefault(),
            d.DonationType,
            d.Amount,
            d.EstimatedValue,
            d.DonationDate,
            d.CampaignName
        })
        .ToListAsync();

    return data;
});

app.MapGet("/api/admin/donations-by-channel", async (AppDbContext db) =>
{
    var data = await db.Supporters
        .Where(s => s.AcquisitionChannel != null)
        .GroupBy(s => s.AcquisitionChannel)
        .Select(g => new
        {
            channel = g.Key,
            count = g.Count()
        })
        .OrderByDescending(x => x.count)
        .ToListAsync();

    return data;
});

app.MapGet("/api/admin/active-residents-trend", async (AppDbContext db) =>
{
    var data = await db.SafehouseMonthlyMetrics
        .Where(m => m.MonthStart != null)
        .GroupBy(m => new { m.MonthStart!.Value.Year, m.MonthStart!.Value.Month })
        .Select(g => new
        {
            year = g.Key.Year,
            month = g.Key.Month,
            count = g.Sum(m => (int?)m.ActiveResidents ?? 0)
        })
        .OrderBy(x => x.year).ThenBy(x => x.month)
        .ToListAsync();

    return data;
});

app.MapGet("/api/admin/flagged-cases-trend", async (AppDbContext db) =>
{
    var data = await db.SafehouseMonthlyMetrics
        .Where(m => m.MonthStart != null)
        .GroupBy(m => new { m.MonthStart!.Value.Year, m.MonthStart!.Value.Month })
        .Select(g => new
        {
            year = g.Key.Year,
            month = g.Key.Month,
            count = g.Sum(m => (int?)m.IncidentCount ?? 0)
        })
        .OrderBy(x => x.year).ThenBy(x => x.month)
        .ToListAsync();

    return data;
});

app.Run();

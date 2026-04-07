using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── ASP.NET Identity ────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(opts =>
{
    opts.Password.RequiredLength = 12;
    opts.Password.RequireUppercase = false;
    opts.Password.RequireLowercase = false;
    opts.Password.RequireDigit = true;
    opts.Password.RequireNonAlphanumeric = true;

    opts.Lockout.MaxFailedAccessAttempts = 5;
    opts.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    opts.Lockout.AllowedForNewUsers = true;

    opts.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(opts =>
{
    opts.Cookie.HttpOnly = true;
    opts.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    opts.Cookie.SameSite = SameSiteMode.Lax;
    opts.Cookie.Name = "BeaconAuth";
    opts.ExpireTimeSpan = TimeSpan.FromHours(8);
    opts.SlidingExpiration = true;

    opts.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
    opts.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = 403;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "https://intex2-1.vercel.app",
                "https://intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// ── Seed Identity roles and test accounts ───────────────────
using (var scope = app.Services.CreateScope())
{
    await IdentitySeeder.SeedAsync(scope.ServiceProvider);
    await DataSeeder.SeedAsync(scope.ServiceProvider);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseHsts();
app.UseCors("AllowFrontend");

// ── Security headers ────────────────────────────────────────
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://www.google-analytics.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "frame-ancestors 'none'; " +
        "form-action 'self'; " +
        "base-uri 'self'"
    );
    context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

// ── Cache-control for auth endpoints ────────────────────────
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/auth"))
    {
        context.Response.Headers.Append("Cache-Control", "no-store, no-cache, must-revalidate");
        context.Response.Headers.Append("Pragma", "no-cache");
    }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

// ── Auth endpoints ──────────────────────────────────────────

app.MapPost("/api/auth/login", async (
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager,
    HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<LoginRequest>();
    if (body == null || string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
        return Results.BadRequest(new { error = "Email and password are required." });

    var user = await userManager.FindByEmailAsync(body.Email);
    if (user == null)
        return Results.BadRequest(new { error = "Invalid email or password." });

    if (await userManager.IsLockedOutAsync(user))
    {
        var lockoutEnd = await userManager.GetLockoutEndDateAsync(user);
        return Results.Json(new
        {
            error = "Account temporarily locked. Try again later.",
            lockoutEnd = lockoutEnd?.UtcDateTime.ToString("o")
        }, statusCode: 423);
    }

    var result = await signInManager.PasswordSignInAsync(user, body.Password, body.RememberMe, lockoutOnFailure: true);
    if (!result.Succeeded)
    {
        if (result.IsLockedOut)
            return Results.Json(new { error = "Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes." }, statusCode: 423);
        return Results.BadRequest(new { error = "Invalid email or password." });
    }

    var roles = await userManager.GetRolesAsync(user);
    return Results.Ok(new
    {
        email = user.Email,
        firstName = user.FirstName,
        lastName = user.LastName,
        roles
    });
});

app.MapPost("/api/auth/logout", async (SignInManager<ApplicationUser> signInManager) =>
{
    await signInManager.SignOutAsync();
    return Results.Ok(new { message = "Logged out" });
}).RequireAuthorization();

app.MapGet("/api/auth/me", async (
    HttpContext httpContext,
    UserManager<ApplicationUser> userManager) =>
{
    if (httpContext.User.Identity?.IsAuthenticated != true)
        return Results.Ok(new { isAuthenticated = false });

    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null)
        return Results.Ok(new { isAuthenticated = false });

    var roles = await userManager.GetRolesAsync(user);
    return Results.Ok(new
    {
        isAuthenticated = true,
        email = user.Email,
        firstName = user.FirstName,
        lastName = user.LastName,
        roles,
        supporterId = user.SupporterId
    });
});

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

    var assembly = System.Reflection.Assembly.GetExecutingAssembly();
    var buildDate = System.IO.File.GetLastWriteTimeUtc(assembly.Location).ToString("yyyy-MM-dd HH:mm:ss UTC");

    return new
    {
        status = canConnect ? "ok" : "degraded",
        database = canConnect ? "connected" : "unreachable",
        environment = app.Environment.EnvironmentName,
        version = assembly.GetName().Version?.ToString() ?? "unknown",
        buildDate,
        endpoints = new[] {
            "/api/health",
            "/api/auth/login",
            "/api/auth/logout",
            "/api/auth/me",
            "/api/impact/summary",
            "/api/impact/donations-by-month",
            "/api/impact/allocations-by-program",
            "/api/impact/education-trends",
            "/api/impact/health-trends",
            "/api/impact/safehouses",
            "/api/impact/snapshots",
            "/api/admin/metrics",
            "/api/admin/residents",
            "/api/admin/residents/{id}",
            "/api/admin/residents/filter-options",
            "/api/admin/recent-donations",
            "/api/admin/donations-by-channel",
            "/api/admin/active-residents-trend",
            "/api/admin/flagged-cases-trend"
        }
    };
});

// ── IMPORTANT: DbContext is NOT thread-safe. ──────────────
// Do NOT use Task.WhenAll() with multiple queries on the same DbContext.
// Always await queries sequentially (one at a time).
//
// var x = await db.Table1.CountAsync();
//    var y = await db.Table2.CountAsync();

// ── Public endpoints (Impact page, Home page) ──────────────

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
    var totalDonations = await db.Donations.SumAsync(d => (decimal?)d.Amount ?? 0);

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

// ── Admin endpoints ────────────────────────────────────────

app.MapGet("/api/admin/metrics", async (AppDbContext db) =>
{
    var now = DateTime.UtcNow;
    var startOfMonth = new DateOnly(now.Year, now.Month, 1);
    var startOfLastMonth = startOfMonth.AddMonths(-1);

    var activeResidents = await db.Residents.CountAsync(r => r.CaseStatus == "Active");

    var incidents = await db.IncidentReports
        .Where(i => i.Resolved != true)
        .GroupBy(_ => 1)
        .Select(g => new
        {
            total = g.Count(),
            critical = g.Count(i => i.Severity == "Critical"),
            high = g.Count(i => i.Severity == "High")
        })
        .FirstOrDefaultAsync() ?? new { total = 0, critical = 0, high = 0 };

    var currentMonth = await db.Donations
        .Where(d => d.DonationDate >= startOfMonth)
        .GroupBy(_ => 1)
        .Select(g => new
        {
            total = g.Sum(d => (decimal?)d.Amount ?? 0),
            count = g.Count()
        })
        .FirstOrDefaultAsync() ?? new { total = 0m, count = 0 };

    var lastMonthDonations = await db.Donations
        .Where(d => d.DonationDate >= startOfLastMonth && d.DonationDate < startOfMonth)
        .SumAsync(d => (decimal?)d.Amount ?? 0);

    var nextConference = await db.InterventionPlans
        .Where(p => p.CaseConferenceDate > DateOnly.FromDateTime(now))
        .OrderBy(p => p.CaseConferenceDate)
        .Select(p => p.CaseConferenceDate)
        .FirstOrDefaultAsync();

    var upcomingConferences = await db.InterventionPlans
        .CountAsync(p => p.CaseConferenceDate > DateOnly.FromDateTime(now));

    var donationChange = lastMonthDonations > 0
        ? Math.Round((double)(currentMonth.total - lastMonthDonations) / (double)lastMonthDonations * 100, 1)
        : 0;

    var openIncidents = incidents.total;
    var criticalIncidents = incidents.critical;
    var highIncidents = incidents.high;
    var monthlyDonations = currentMonth.total;
    var monthlyDonationCount = currentMonth.count;

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
}).RequireAuthorization();

app.MapGet("/api/admin/residents", async (
    AppDbContext db,
    int page = 1,
    int pageSize = 20,
    string? search = null,
    string? caseStatus = null,
    int? safehouseId = null,
    string? caseCategory = null,
    string? riskLevel = null,
    string? sortBy = null,
    string? sortDir = null) =>
{
    var query = db.Residents.AsQueryable();

    if (!string.IsNullOrWhiteSpace(search))
    {
        var s = search.Trim().ToLower();
        query = query.Where(r =>
            (r.InternalCode != null && r.InternalCode.ToLower().Contains(s)) ||
            (r.CaseControlNo != null && r.CaseControlNo.ToLower().Contains(s)) ||
            (r.AssignedSocialWorker != null && r.AssignedSocialWorker.ToLower().Contains(s)));
    }
    if (!string.IsNullOrWhiteSpace(caseStatus))
        query = query.Where(r => r.CaseStatus == caseStatus);
    if (safehouseId.HasValue)
        query = query.Where(r => r.SafehouseId == safehouseId.Value);
    if (!string.IsNullOrWhiteSpace(caseCategory))
        query = query.Where(r => r.CaseCategory == caseCategory);
    if (!string.IsNullOrWhiteSpace(riskLevel))
        query = query.Where(r => r.CurrentRiskLevel == riskLevel);

    var totalCount = await query.CountAsync();

    var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
    query = sortBy?.ToLower() switch
    {
        "internalcode" => desc ? query.OrderByDescending(r => r.InternalCode) : query.OrderBy(r => r.InternalCode),
        "casecontrolno" => desc ? query.OrderByDescending(r => r.CaseControlNo) : query.OrderBy(r => r.CaseControlNo),
        "casestatus" => desc ? query.OrderByDescending(r => r.CaseStatus) : query.OrderBy(r => r.CaseStatus),
        "casecategory" => desc ? query.OrderByDescending(r => r.CaseCategory) : query.OrderBy(r => r.CaseCategory),
        "risklevel" => desc ? query.OrderByDescending(r => r.CurrentRiskLevel) : query.OrderBy(r => r.CurrentRiskLevel),
        "dateofadmission" => desc ? query.OrderByDescending(r => r.DateOfAdmission) : query.OrderBy(r => r.DateOfAdmission),
        "socialworker" => desc ? query.OrderByDescending(r => r.AssignedSocialWorker) : query.OrderBy(r => r.AssignedSocialWorker),
        _ => query.OrderByDescending(r => r.DateOfAdmission)
    };

    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = 20;
    if (pageSize > 100) pageSize = 100;

    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(r => new
        {
            r.ResidentId,
            r.InternalCode,
            r.CaseControlNo,
            r.SafehouseId,
            safehouse = db.Safehouses
                .Where(s => s.SafehouseId == r.SafehouseId)
                .Select(s => s.SafehouseCode + " " + s.City)
                .FirstOrDefault(),
            r.CaseStatus,
            r.CaseCategory,
            r.CurrentRiskLevel,
            r.DateOfAdmission,
            r.AssignedSocialWorker,
            r.Sex,
            r.PresentAge
        })
        .ToListAsync();

    return new { items, totalCount, page, pageSize };
}).RequireAuthorization();

app.MapGet("/api/admin/residents/filter-options", async (AppDbContext db) =>
{
    var caseStatuses = await db.Residents
        .Where(r => r.CaseStatus != null)
        .Select(r => r.CaseStatus!)
        .Distinct().OrderBy(x => x).ToListAsync();

    var safehouses = await db.Safehouses
        .Select(s => new { s.SafehouseId, label = s.SafehouseCode + " " + s.City })
        .OrderBy(s => s.label)
        .ToListAsync();

    var categories = await db.Residents
        .Where(r => r.CaseCategory != null)
        .Select(r => r.CaseCategory!)
        .Distinct().OrderBy(x => x).ToListAsync();

    var riskLevels = await db.Residents
        .Where(r => r.CurrentRiskLevel != null)
        .Select(r => r.CurrentRiskLevel!)
        .Distinct().OrderBy(x => x).ToListAsync();

    var socialWorkers = await db.Residents
        .Where(r => r.AssignedSocialWorker != null)
        .Select(r => r.AssignedSocialWorker!)
        .Distinct().OrderBy(x => x).ToListAsync();

    return new { caseStatuses, safehouses, categories, riskLevels, socialWorkers };
}).RequireAuthorization();

app.MapGet("/api/admin/residents/{id:int}", async (int id, AppDbContext db) =>
{
    var r = await db.Residents
        .Where(r => r.ResidentId == id)
        .Select(r => new
        {
            r.ResidentId, r.CaseControlNo, r.InternalCode, r.SafehouseId,
            safehouse = db.Safehouses
                .Where(s => s.SafehouseId == r.SafehouseId)
                .Select(s => s.SafehouseCode + " " + s.City)
                .FirstOrDefault(),
            r.CaseStatus, r.Sex, r.DateOfBirth, r.BirthStatus, r.PlaceOfBirth, r.Religion,
            r.CaseCategory,
            r.SubCatOrphaned, r.SubCatTrafficked, r.SubCatChildLabor,
            r.SubCatPhysicalAbuse, r.SubCatSexualAbuse, r.SubCatOsaec,
            r.SubCatCicl, r.SubCatAtRisk, r.SubCatStreetChild, r.SubCatChildWithHiv,
            r.IsPwd, r.PwdType, r.HasSpecialNeeds, r.SpecialNeedsDiagnosis,
            r.FamilyIs4ps, r.FamilySoloParent, r.FamilyIndigenous,
            r.FamilyParentPwd, r.FamilyInformalSettler,
            r.DateOfAdmission, r.AgeUponAdmission, r.PresentAge, r.LengthOfStay,
            r.ReferralSource, r.ReferringAgencyPerson,
            r.DateColbRegistered, r.DateColbObtained,
            r.AssignedSocialWorker, r.InitialCaseAssessment, r.DateCaseStudyPrepared,
            r.ReintegrationType, r.ReintegrationStatus,
            r.InitialRiskLevel, r.CurrentRiskLevel,
            r.DateEnrolled, r.DateClosed, r.CreatedAt, r.NotesRestricted
        })
        .FirstOrDefaultAsync();

    return r is null ? Results.NotFound(new { error = "Resident not found." }) : Results.Ok(r);
}).RequireAuthorization();

app.MapPost("/api/admin/residents", async (HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<ResidentRequest>();
    if (body == null)
        return Results.BadRequest(new { error = "Request body is required." });

    var resident = new Resident { CreatedAt = DateTime.UtcNow };
    EntityMapper.MapResident(resident, body);

    db.Residents.Add(resident);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/residents/{resident.ResidentId}", new { resident.ResidentId });
}).RequireAuthorization("AdminOnly");

app.MapPut("/api/admin/residents/{id:int}", async (int id, HttpContext httpContext, AppDbContext db) =>
{
    var resident = await db.Residents.FindAsync(id);
    if (resident == null)
        return Results.NotFound(new { error = "Resident not found." });

    var body = await httpContext.Request.ReadFromJsonAsync<ResidentRequest>();
    if (body == null)
        return Results.BadRequest(new { error = "Request body is required." });

    EntityMapper.MapResident(resident, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { resident.ResidentId });
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/admin/residents/{id:int}", async (int id, AppDbContext db) =>
{
    var resident = await db.Residents.FindAsync(id);
    if (resident == null)
        return Results.NotFound(new { error = "Resident not found." });

    db.Residents.Remove(resident);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Resident deleted." });
}).RequireAuthorization("AdminOnly");

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
}).RequireAuthorization();

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
}).RequireAuthorization();

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
}).RequireAuthorization();

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
}).RequireAuthorization();

// ── Visitations endpoints ─────────────────────────────────

app.MapGet("/api/admin/visitations", async (
    AppDbContext db,
    int? residentId,
    string? visitType,
    bool? safetyOnly,
    int page = 1,
    int pageSize = 20) =>
{
    var query = db.HomeVisitations.AsQueryable();

    if (residentId.HasValue)
        query = query.Where(v => v.ResidentId == residentId.Value);
    if (!string.IsNullOrWhiteSpace(visitType))
        query = query.Where(v => v.VisitType == visitType);
    if (safetyOnly == true)
        query = query.Where(v => v.SafetyConcernsNoted == true);

    var totalCount = await query.CountAsync();

    var items = await query
        .OrderByDescending(v => v.VisitDate)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(v => new
        {
            v.VisitationId,
            v.ResidentId,
            residentCode = db.Residents
                .Where(r => r.ResidentId == v.ResidentId)
                .Select(r => r.InternalCode)
                .FirstOrDefault(),
            v.VisitDate,
            v.SocialWorker,
            v.VisitType,
            v.LocationVisited,
            v.SafetyConcernsNoted,
            v.FollowUpNeeded,
            v.VisitOutcome,
            v.FamilyCooperationLevel
        })
        .ToListAsync();

    return new { items, totalCount, page, pageSize };
}).RequireAuthorization();

app.MapGet("/api/admin/visitations/{id}", async (AppDbContext db, int id) =>
{
    var v = await db.HomeVisitations
        .Where(v => v.VisitationId == id)
        .Select(v => new
        {
            v.VisitationId,
            v.ResidentId,
            residentCode = db.Residents
                .Where(r => r.ResidentId == v.ResidentId)
                .Select(r => r.InternalCode)
                .FirstOrDefault(),
            v.VisitDate,
            v.SocialWorker,
            v.VisitType,
            v.LocationVisited,
            v.FamilyMembersPresent,
            v.Purpose,
            v.Observations,
            v.FamilyCooperationLevel,
            v.SafetyConcernsNoted,
            v.FollowUpNeeded,
            v.FollowUpNotes,
            v.VisitOutcome
        })
        .FirstOrDefaultAsync();

    return v is null ? Results.NotFound() : Results.Ok(v);
}).RequireAuthorization();

app.MapPost("/api/admin/visitations", async (AppDbContext db, HomeVisitation body) =>
{
    db.HomeVisitations.Add(body);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/visitations/{body.VisitationId}", new { body.VisitationId });
}).RequireAuthorization();

app.MapPut("/api/admin/visitations/{id}", async (AppDbContext db, int id, HomeVisitation body) =>
{
    var existing = await db.HomeVisitations.FindAsync(id);
    if (existing is null) return Results.NotFound();

    EntityMapper.MapVisitation(existing, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { id });
}).RequireAuthorization();

app.MapDelete("/api/admin/visitations/{id}", async (AppDbContext db, int id) =>
{
    var existing = await db.HomeVisitations.FindAsync(id);
    if (existing is null) return Results.NotFound();

    db.HomeVisitations.Remove(existing);
    await db.SaveChangesAsync();
    return Results.Ok(new { deleted = true });
}).RequireAuthorization("AdminOnly");

app.MapGet("/api/admin/conferences", async (AppDbContext db) =>
{
    var now = DateOnly.FromDateTime(DateTime.UtcNow);

    var upcoming = await db.InterventionPlans
        .Where(p => p.CaseConferenceDate != null && p.CaseConferenceDate > now)
        .OrderBy(p => p.CaseConferenceDate)
        .Select(p => new
        {
            p.PlanId,
            p.ResidentId,
            residentCode = db.Residents
                .Where(r => r.ResidentId == p.ResidentId)
                .Select(r => r.InternalCode)
                .FirstOrDefault(),
            p.PlanCategory,
            p.PlanDescription,
            p.CaseConferenceDate,
            p.Status
        })
        .ToListAsync();

    var past = await db.InterventionPlans
        .Where(p => p.CaseConferenceDate != null && p.CaseConferenceDate <= now)
        .OrderByDescending(p => p.CaseConferenceDate)
        .Take(50)
        .Select(p => new
        {
            p.PlanId,
            p.ResidentId,
            residentCode = db.Residents
                .Where(r => r.ResidentId == p.ResidentId)
                .Select(r => r.InternalCode)
                .FirstOrDefault(),
            p.PlanCategory,
            p.PlanDescription,
            p.CaseConferenceDate,
            p.Status
        })
        .ToListAsync();

    return new { upcoming, past };
}).RequireAuthorization();

app.MapGet("/api/admin/residents-list", async (AppDbContext db) =>
{
    var data = await db.Residents
        .OrderBy(r => r.InternalCode)
        .Select(r => new
        {
            r.ResidentId,
            r.InternalCode,
            r.CaseStatus
        })
        .ToListAsync();

    return data;
}).RequireAuthorization();

// ── Reports & Analytics endpoints ──────────────────────


app.MapGet("/api/admin/reports/donations-by-source", async (AppDbContext db) =>
{
    var data = await db.Donations
        .Where(d => d.ChannelSource != null && d.Amount != null)
        .GroupBy(d => d.ChannelSource)
        .Select(g => new
        {
            source = g.Key,
            total = g.Sum(d => (decimal?)d.Amount ?? 0),
            count = g.Count()
        })
        .OrderByDescending(x => x.total)
        .ToListAsync();

    return data;
}).RequireAuthorization();

app.MapGet("/api/admin/reports/donations-by-campaign", async (AppDbContext db) =>
{
    var data = await db.Donations
        .Where(d => d.CampaignName != null && d.Amount != null)
        .GroupBy(d => d.CampaignName)
        .Select(g => new
        {
            campaign = g.Key,
            total = g.Sum(d => (decimal?)d.Amount ?? 0),
            count = g.Count()
        })
        .OrderByDescending(x => x.total)
        .ToListAsync();

    return data;
}).RequireAuthorization();

app.MapGet("/api/admin/reports/resident-outcomes", async (AppDbContext db) =>
{
    var total = await db.Residents.CountAsync();

    var byType = await db.Residents
        .Where(r => r.ReintegrationStatus == "Completed" && r.ReintegrationType != null)
        .GroupBy(r => r.ReintegrationType)
        .Select(g => new
        {
            type = g.Key,
            count = g.Count()
        })
        .OrderByDescending(x => x.count)
        .ToListAsync();

    var completedTotal = byType.Sum(b => b.count);
    var successRate = total > 0 ? Math.Round((double)completedTotal / total * 100, 1) : 0;

    var avgLengthOfStay = await db.Residents
        .Where(r => r.ReintegrationStatus == "Completed"
            && r.DateOfAdmission != null && r.DateClosed != null)
        .Select(r => (double)(r.DateClosed!.Value.DayNumber - r.DateOfAdmission!.Value.DayNumber))
        .DefaultIfEmpty(0)
        .AverageAsync();

    return new
    {
        totalResidents = total,
        completedReintegrations = completedTotal,
        successRate,
        avgLengthOfStayDays = Math.Round(avgLengthOfStay, 0),
        byType
    };
}).RequireAuthorization();


app.MapGet("/api/admin/reports/safehouse-comparison", async (AppDbContext db) =>
{
    var safehouses = await db.Safehouses
        .Select(s => new
        {
            s.SafehouseId,
            s.SafehouseCode,
            s.Name,
            s.City,
            s.Status,
            s.CapacityGirls,
            s.CurrentOccupancy
        })
        .ToListAsync();

    var activeResidentsBySafehouse = await db.Residents
        .Where(r => r.CaseStatus == "Active" && r.SafehouseId != null)
        .GroupBy(r => r.SafehouseId)
        .Select(g => new { safehouseId = g.Key, count = g.Count() })
        .ToListAsync();

    var incidentsBySafehouse = await db.IncidentReports
        .Where(i => i.SafehouseId != null)
        .GroupBy(i => i.SafehouseId)
        .Select(g => new { safehouseId = g.Key, count = g.Count() })
        .ToListAsync();

    var recordingsBySafehouse = await db.ProcessRecordings
        .Join(db.Residents, p => p.ResidentId, r => r.ResidentId, (p, r) => new { p, r })
        .Where(x => x.r.SafehouseId != null)
        .GroupBy(x => x.r.SafehouseId)
        .Select(g => new { safehouseId = g.Key, count = g.Count() })
        .ToListAsync();

    var educationBySafehouse = await db.EducationRecords
        .Where(e => e.ProgressPercent != null)
        .Join(db.Residents, e => e.ResidentId, r => r.ResidentId, (e, r) => new { e, r })
        .Where(x => x.r.SafehouseId != null)
        .GroupBy(x => x.r.SafehouseId)
        .Select(g => new { safehouseId = g.Key, avgEducation = Math.Round(g.Average(x => (double?)x.e.ProgressPercent ?? 0), 1) })
        .ToListAsync();

    var healthBySafehouse = await db.HealthWellbeingRecords
        .Where(h => h.GeneralHealthScore != null)
        .Join(db.Residents, h => h.ResidentId, r => r.ResidentId, (h, r) => new { h, r })
        .Where(x => x.r.SafehouseId != null)
        .GroupBy(x => x.r.SafehouseId)
        .Select(g => new { safehouseId = g.Key, avgHealth = Math.Round(g.Average(x => (double?)x.h.GeneralHealthScore ?? 0), 2) })
        .ToListAsync();

    var result = safehouses.Select(s =>
    {
        var active = activeResidentsBySafehouse.FirstOrDefault(a => a.safehouseId == s.SafehouseId);
        var incidents = incidentsBySafehouse.FirstOrDefault(i => i.safehouseId == s.SafehouseId);
        var recordings = recordingsBySafehouse.FirstOrDefault(r => r.safehouseId == s.SafehouseId);
        var education = educationBySafehouse.FirstOrDefault(e => e.safehouseId == s.SafehouseId);
        var health = healthBySafehouse.FirstOrDefault(h => h.safehouseId == s.SafehouseId);
        var occupancyPct = s.CapacityGirls > 0 ? Math.Round((double)(s.CurrentOccupancy ?? 0) / s.CapacityGirls.Value * 100, 1) : 0;

        return new
        {
            s.SafehouseId,
            s.SafehouseCode,
            s.Name,
            s.City,
            s.Status,
            s.CapacityGirls,
            s.CurrentOccupancy,
            occupancyPct,
            activeResidents = active?.count ?? 0,
            incidents = incidents?.count ?? 0,
            recordings = recordings?.count ?? 0,
            avgEducation = education?.avgEducation ?? 0,
            avgHealth = health?.avgHealth ?? 0
        };
    }).ToList();

    return result;
}).RequireAuthorization();

app.MapGet("/api/admin/reports/reintegration-rates", async (AppDbContext db) =>
{
    var byTypeAndSafehouse = await db.Residents
        .Where(r => r.ReintegrationStatus == "Completed"
            && r.ReintegrationType != null && r.SafehouseId != null)
        .Join(db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => new { r, s })
        .GroupBy(x => new { x.r.ReintegrationType, x.s.SafehouseCode })
        .Select(g => new
        {
            type = g.Key.ReintegrationType,
            safehouse = g.Key.SafehouseCode,
            count = g.Count()
        })
        .OrderBy(x => x.safehouse).ThenByDescending(x => x.count)
        .ToListAsync();

    var totalBySafehouse = await db.Residents
        .Where(r => r.SafehouseId != null)
        .Join(db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => new { r, s })
        .GroupBy(x => x.s.SafehouseCode)
        .Select(g => new
        {
            safehouse = g.Key,
            total = g.Count(),
            completed = g.Count(x => x.r.ReintegrationStatus == "Completed")
        })
        .ToListAsync();

    return new { byTypeAndSafehouse, totalBySafehouse };
}).RequireAuthorization();

// ── Process Recordings endpoints ──────────────────────────

app.MapGet("/api/admin/recordings", async (
    AppDbContext db,
    int? residentId,
    int page,
    int pageSize,
    string? sortBy) =>
{
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 20;

    var query = db.ProcessRecordings.AsQueryable();

    if (residentId.HasValue)
        query = query.Where(r => r.ResidentId == residentId.Value);

    query = (sortBy ?? "date_desc") switch
    {
        "date_asc" => query.OrderBy(r => r.SessionDate),
        "worker" => query.OrderBy(r => r.SocialWorker).ThenByDescending(r => r.SessionDate),
        _ => query.OrderByDescending(r => r.SessionDate),
    };

    var totalCount = await query.CountAsync();

    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(r => new
        {
            r.RecordingId,
            r.ResidentId,
            residentCode = db.Residents
                .Where(res => res.ResidentId == r.ResidentId)
                .Select(res => res.InternalCode)
                .FirstOrDefault(),
            r.SessionDate,
            r.SocialWorker,
            r.SessionType,
            r.SessionDurationMinutes,
            r.EmotionalStateObserved,
            r.EmotionalStateEnd,
            narrativePreview = r.SessionNarrative != null
                ? r.SessionNarrative.Substring(0, Math.Min(r.SessionNarrative.Length, 120))
                : null,
            r.ProgressNoted,
            r.ConcernsFlagged,
            r.ReferralMade
        })
        .ToListAsync();

    return new { items, totalCount, page, pageSize };
}).RequireAuthorization();

app.MapGet("/api/admin/recordings/emotional-trends", async (int residentId, AppDbContext db) =>
{
    var data = await db.ProcessRecordings
        .Where(r => r.ResidentId == residentId && r.SessionDate != null)
        .OrderBy(r => r.SessionDate)
        .Select(r => new
        {
            r.SessionDate,
            r.SessionType,
            r.EmotionalStateObserved,
            r.EmotionalStateEnd
        })
        .ToListAsync();

    return data;
}).RequireAuthorization();

app.MapGet("/api/admin/recordings/{id:int}", async (int id, AppDbContext db) =>
{
    var r = await db.ProcessRecordings
        .Where(p => p.RecordingId == id)
        .Select(p => new
        {
            p.RecordingId,
            p.ResidentId,
            residentCode = db.Residents
                .Where(res => res.ResidentId == p.ResidentId)
                .Select(res => res.InternalCode)
                .FirstOrDefault(),
            p.SessionDate,
            p.SocialWorker,
            p.SessionType,
            p.SessionDurationMinutes,
            p.EmotionalStateObserved,
            p.EmotionalStateEnd,
            p.SessionNarrative,
            p.InterventionsApplied,
            p.FollowUpActions,
            p.ProgressNoted,
            p.ConcernsFlagged,
            p.ReferralMade,
            p.NotesRestricted
        })
        .FirstOrDefaultAsync();

    return r is null ? Results.NotFound(new { error = "Recording not found." }) : Results.Ok(r);
}).RequireAuthorization();

app.MapPost("/api/admin/recordings", async (HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<RecordingRequest>();
    if (body == null || body.ResidentId <= 0)
        return Results.BadRequest(new { error = "Resident is required." });

    var resident = await db.Residents.AnyAsync(r => r.ResidentId == body.ResidentId);
    if (!resident)
        return Results.BadRequest(new { error = "Resident not found." });

    var recording = new ProcessRecording();
    EntityMapper.MapRecording(recording, body);

    db.ProcessRecordings.Add(recording);
    await db.SaveChangesAsync();

    return Results.Created($"/api/admin/recordings/{recording.RecordingId}", new { recording.RecordingId });
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Staff"));

app.MapPut("/api/admin/recordings/{id:int}", async (int id, HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<RecordingRequest>();
    if (body == null)
        return Results.BadRequest(new { error = "Request body is required." });

    var recording = await db.ProcessRecordings.FindAsync(id);
    if (recording == null)
        return Results.NotFound(new { error = "Recording not found." });

    EntityMapper.MapRecording(recording, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { recording.RecordingId });
}).RequireAuthorization();

app.MapDelete("/api/admin/recordings/{id:int}", async (int id, AppDbContext db) =>
{
    var recording = await db.ProcessRecordings.FindAsync(id);
    if (recording == null)
        return Results.NotFound(new { error = "Recording not found." });

    db.ProcessRecordings.Remove(recording);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Recording deleted." });
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

// ── Supporters CRUD ─────────────────────────────────────────

app.MapGet("/api/admin/supporters", async (
    AppDbContext db,
    string? supporterType,
    string? status,
    string? acquisitionChannel,
    string? search,
    int page = 1,
    int pageSize = 20) =>
{
    var q = db.Supporters.AsQueryable();

    if (!string.IsNullOrWhiteSpace(supporterType))
        q = q.Where(s => s.SupporterType == supporterType);
    if (!string.IsNullOrWhiteSpace(status))
        q = q.Where(s => s.Status == status);
    if (!string.IsNullOrWhiteSpace(acquisitionChannel))
        q = q.Where(s => s.AcquisitionChannel == acquisitionChannel);
    if (!string.IsNullOrWhiteSpace(search))
    {
        var term = search.ToLower();
        q = q.Where(s =>
            (s.DisplayName != null && s.DisplayName.ToLower().Contains(term)) ||
            (s.FirstName != null && s.FirstName.ToLower().Contains(term)) ||
            (s.LastName != null && s.LastName.ToLower().Contains(term)) ||
            (s.OrganizationName != null && s.OrganizationName.ToLower().Contains(term)) ||
            (s.Email != null && s.Email.ToLower().Contains(term)));
    }

    var totalCount = await q.CountAsync();
    var items = await q
        .OrderByDescending(s => s.CreatedAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(s => new
        {
            s.SupporterId,
            s.SupporterType,
            s.DisplayName,
            s.OrganizationName,
            s.FirstName,
            s.LastName,
            s.Email,
            s.Phone,
            s.Region,
            s.Country,
            s.Status,
            s.AcquisitionChannel,
            s.FirstDonationDate,
            s.CreatedAt,
            totalDonated = db.Donations
                .Where(d => d.SupporterId == s.SupporterId && d.Amount != null)
                .Sum(d => (decimal?)d.Amount ?? 0),
            lastDonationDate = db.Donations
                .Where(d => d.SupporterId == s.SupporterId)
                .OrderByDescending(d => d.DonationDate)
                .Select(d => d.DonationDate)
                .FirstOrDefault()
        })
        .ToListAsync();

    return new { totalCount, page, pageSize, items };
}).RequireAuthorization();

app.MapGet("/api/admin/supporters/{id:int}", async (int id, AppDbContext db) =>
{
    var s = await db.Supporters
        .Where(s => s.SupporterId == id)
        .Select(s => new
        {
            s.SupporterId,
            s.SupporterType,
            s.DisplayName,
            s.OrganizationName,
            s.FirstName,
            s.LastName,
            s.RelationshipType,
            s.Email,
            s.Phone,
            s.Region,
            s.Country,
            s.Status,
            s.AcquisitionChannel,
            s.FirstDonationDate,
            s.CreatedAt,
            totalDonated = db.Donations
                .Where(d => d.SupporterId == id && d.Amount != null)
                .Sum(d => (decimal?)d.Amount ?? 0)
        })
        .FirstOrDefaultAsync();

    if (s == null) return Results.NotFound();

    var donations = await db.Donations
        .Where(d => d.SupporterId == id)
        .OrderByDescending(d => d.DonationDate)
        .Select(d => new
        {
            d.DonationId,
            d.DonationType,
            d.DonationDate,
            d.Amount,
            d.EstimatedValue,
            d.CurrencyCode,
            d.ImpactUnit,
            d.IsRecurring,
            d.CampaignName,
            d.Notes
        })
        .ToListAsync();

    return Results.Ok(new { supporter = s, donations });
}).RequireAuthorization();

app.MapPost("/api/admin/supporters", async (AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<SupporterRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });

    var supporter = new backend.Models.Supporter { CreatedAt = DateTime.UtcNow };
    EntityMapper.MapSupporter(supporter, body);
    supporter.Status ??= "Active";

    db.Supporters.Add(supporter);
    await db.SaveChangesAsync();
    return Results.Ok(new { supporter.SupporterId });
}).RequireAuthorization("AdminOnly");

app.MapPut("/api/admin/supporters/{id:int}", async (int id, AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<SupporterRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });

    var supporter = await db.Supporters.FindAsync(id);
    if (supporter == null) return Results.NotFound();

    EntityMapper.MapSupporter(supporter, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { supporter.SupporterId });
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/admin/supporters/{id:int}", async (int id, AppDbContext db) =>
{
    var supporter = await db.Supporters.FindAsync(id);
    if (supporter == null) return Results.NotFound();

    db.Supporters.Remove(supporter);
    await db.SaveChangesAsync();
    return Results.Ok(new { deleted = true });
}).RequireAuthorization("AdminOnly");

// ── Donations CRUD ──────────────────────────────────────────

app.MapGet("/api/admin/donations", async (
    AppDbContext db,
    int? supporterId,
    string? donationType,
    DateOnly? dateFrom,
    DateOnly? dateTo,
    int page = 1,
    int pageSize = 20) =>
{
    var q = db.Donations.AsQueryable();

    if (supporterId.HasValue)
        q = q.Where(d => d.SupporterId == supporterId.Value);
    if (!string.IsNullOrWhiteSpace(donationType))
        q = q.Where(d => d.DonationType == donationType);
    if (dateFrom.HasValue)
        q = q.Where(d => d.DonationDate >= dateFrom.Value);
    if (dateTo.HasValue)
        q = q.Where(d => d.DonationDate <= dateTo.Value);

    var totalCount = await q.CountAsync();
    var items = await q
        .OrderByDescending(d => d.DonationDate)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(d => new
        {
            d.DonationId,
            d.SupporterId,
            supporterName = db.Supporters
                .Where(s => s.SupporterId == d.SupporterId)
                .Select(s => s.DisplayName)
                .FirstOrDefault(),
            d.DonationType,
            d.DonationDate,
            d.Amount,
            d.EstimatedValue,
            d.CurrencyCode,
            d.ImpactUnit,
            d.IsRecurring,
            d.CampaignName,
            d.Notes
        })
        .ToListAsync();

    return new { totalCount, page, pageSize, items };
}).RequireAuthorization();

app.MapPost("/api/admin/donations", async (AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<DonationRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });

    var donation = new backend.Models.Donation();
    EntityMapper.MapDonation(donation, body);

    db.Donations.Add(donation);
    await db.SaveChangesAsync();
    return Results.Ok(new { donation.DonationId });
}).RequireAuthorization("AdminOnly");

app.MapPut("/api/admin/donations/{id:int}", async (int id, AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<DonationRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });

    var donation = await db.Donations.FindAsync(id);
    if (donation == null) return Results.NotFound();

    EntityMapper.MapDonation(donation, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { donation.DonationId });
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/admin/donations/{id:int}", async (int id, AppDbContext db) =>
{
    var donation = await db.Donations.FindAsync(id);
    if (donation == null) return Results.NotFound();

    db.Donations.Remove(donation);
    await db.SaveChangesAsync();
    return Results.Ok(new { deleted = true });
}).RequireAuthorization("AdminOnly");

// ── Allocation reports ──────────────────────────────────────

app.MapGet("/api/admin/allocations/by-program", async (AppDbContext db) =>
{
    var data = await db.DonationAllocations
        .Where(a => a.ProgramArea != null)
        .GroupBy(a => a.ProgramArea)
        .Select(g => new
        {
            programArea = g.Key,
            totalAllocated = g.Sum(a => (decimal?)a.AmountAllocated ?? 0),
            count = g.Count()
        })
        .OrderByDescending(x => x.totalAllocated)
        .ToListAsync();

    return data;
}).RequireAuthorization();

app.MapGet("/api/admin/allocations/by-safehouse", async (AppDbContext db) =>
{
    var data = await db.DonationAllocations
        .Where(a => a.SafehouseId != null)
        .GroupBy(a => a.SafehouseId)
        .Select(g => new
        {
            safehouseId = g.Key,
            safehouseName = db.Safehouses
                .Where(s => s.SafehouseId == g.Key)
                .Select(s => s.Name ?? s.SafehouseCode)
                .FirstOrDefault(),
            totalAllocated = g.Sum(a => (decimal?)a.AmountAllocated ?? 0),
            count = g.Count()
        })
        .OrderByDescending(x => x.totalAllocated)
        .ToListAsync();

    return data;
}).RequireAuthorization();

// ── Donor portal endpoints ──────────────────────────────────
app.MapGet("/api/donor/my-donations", async (
    HttpContext httpContext,
    UserManager<ApplicationUser> userManager,
    AppDbContext db) =>
{
    var appUser = await userManager.GetUserAsync(httpContext.User);
    if (appUser?.SupporterId == null)
        return Results.Ok(new { supporter = (object?)null, donations = Array.Empty<object>(), allocations = Array.Empty<object>() });

    var sid = appUser.SupporterId.Value;

    var supporter = await db.Supporters
        .Where(s => s.SupporterId == sid)
        .Select(s => new
        {
            s.SupporterId,
            s.DisplayName,
            s.FirstName,
            s.LastName,
            s.SupporterType,
            s.Status,
            s.FirstDonationDate,
        })
        .FirstOrDefaultAsync();

    var donations = await db.Donations
        .Where(d => d.SupporterId == sid)
        .OrderByDescending(d => d.DonationDate)
        .Select(d => new
        {
            d.DonationId,
            d.DonationType,
            d.DonationDate,
            d.Amount,
            d.EstimatedValue,
            d.CurrencyCode,
            d.IsRecurring,
            d.CampaignName,
            d.ChannelSource,
        })
        .ToListAsync();

    var donationIds = donations.Select(d => d.DonationId).ToList();

    var allocations = await db.DonationAllocations
        .Where(a => donationIds.Contains(a.DonationId))
        .Select(a => new
        {
            a.DonationId,
            a.ProgramArea,
            a.AmountAllocated,
            safehouseName = db.Safehouses
                .Where(s => s.SafehouseId == a.SafehouseId)
                .Select(s => s.Name ?? s.SafehouseCode)
                .FirstOrDefault()
        })
        .ToListAsync();

    return Results.Ok(new { supporter, donations, allocations });
}).RequireAuthorization();

app.Run();

// ── Entity mapping helpers ─────────────────────────────────

public static class EntityMapper
{
    public static void MapResident(Resident entity, ResidentRequest body)
    {
        entity.CaseControlNo = body.CaseControlNo;
        entity.InternalCode = body.InternalCode;
        entity.SafehouseId = body.SafehouseId;
        entity.CaseStatus = body.CaseStatus;
        entity.Sex = body.Sex;
        entity.DateOfBirth = body.DateOfBirth;
        entity.BirthStatus = body.BirthStatus;
        entity.PlaceOfBirth = body.PlaceOfBirth;
        entity.Religion = body.Religion;
        entity.CaseCategory = body.CaseCategory;
        entity.SubCatOrphaned = body.SubCatOrphaned;
        entity.SubCatTrafficked = body.SubCatTrafficked;
        entity.SubCatChildLabor = body.SubCatChildLabor;
        entity.SubCatPhysicalAbuse = body.SubCatPhysicalAbuse;
        entity.SubCatSexualAbuse = body.SubCatSexualAbuse;
        entity.SubCatOsaec = body.SubCatOsaec;
        entity.SubCatCicl = body.SubCatCicl;
        entity.SubCatAtRisk = body.SubCatAtRisk;
        entity.SubCatStreetChild = body.SubCatStreetChild;
        entity.SubCatChildWithHiv = body.SubCatChildWithHiv;
        entity.IsPwd = body.IsPwd;
        entity.PwdType = body.PwdType;
        entity.HasSpecialNeeds = body.HasSpecialNeeds;
        entity.SpecialNeedsDiagnosis = body.SpecialNeedsDiagnosis;
        entity.FamilyIs4ps = body.FamilyIs4ps;
        entity.FamilySoloParent = body.FamilySoloParent;
        entity.FamilyIndigenous = body.FamilyIndigenous;
        entity.FamilyParentPwd = body.FamilyParentPwd;
        entity.FamilyInformalSettler = body.FamilyInformalSettler;
        entity.DateOfAdmission = body.DateOfAdmission;
        entity.AgeUponAdmission = body.AgeUponAdmission;
        entity.PresentAge = body.PresentAge;
        entity.LengthOfStay = body.LengthOfStay;
        entity.ReferralSource = body.ReferralSource;
        entity.ReferringAgencyPerson = body.ReferringAgencyPerson;
        entity.DateColbRegistered = body.DateColbRegistered;
        entity.DateColbObtained = body.DateColbObtained;
        entity.AssignedSocialWorker = body.AssignedSocialWorker;
        entity.InitialCaseAssessment = body.InitialCaseAssessment;
        entity.DateCaseStudyPrepared = body.DateCaseStudyPrepared;
        entity.ReintegrationType = body.ReintegrationType;
        entity.ReintegrationStatus = body.ReintegrationStatus;
        entity.InitialRiskLevel = body.InitialRiskLevel;
        entity.CurrentRiskLevel = body.CurrentRiskLevel;
        entity.DateEnrolled = body.DateEnrolled;
        entity.DateClosed = body.DateClosed;
        entity.NotesRestricted = body.NotesRestricted;
    }

    public static void MapRecording(ProcessRecording entity, RecordingRequest body)
    {
        entity.ResidentId = body.ResidentId;
        entity.SessionDate = body.SessionDate;
        entity.SocialWorker = body.SocialWorker;
        entity.SessionType = body.SessionType;
        entity.SessionDurationMinutes = body.SessionDurationMinutes;
        entity.EmotionalStateObserved = body.EmotionalStateObserved;
        entity.EmotionalStateEnd = body.EmotionalStateEnd;
        entity.SessionNarrative = body.SessionNarrative;
        entity.InterventionsApplied = body.InterventionsApplied;
        entity.FollowUpActions = body.FollowUpActions;
        entity.ProgressNoted = body.ProgressNoted;
        entity.ConcernsFlagged = body.ConcernsFlagged;
        entity.ReferralMade = body.ReferralMade;
        entity.NotesRestricted = body.NotesRestricted;
    }

    public static void MapSupporter(backend.Models.Supporter entity, SupporterRequest body)
    {
        entity.SupporterType = body.SupporterType;
        entity.DisplayName = body.DisplayName;
        entity.OrganizationName = body.OrganizationName;
        entity.FirstName = body.FirstName;
        entity.LastName = body.LastName;
        entity.RelationshipType = body.RelationshipType;
        entity.Email = body.Email;
        entity.Phone = body.Phone;
        entity.Region = body.Region;
        entity.Country = body.Country;
        entity.Status = body.Status;
        entity.AcquisitionChannel = body.AcquisitionChannel;
    }

    public static void MapDonation(backend.Models.Donation entity, DonationRequest body)
    {
        entity.SupporterId = body.SupporterId;
        entity.DonationType = body.DonationType;
        entity.DonationDate = body.DonationDate;
        entity.ChannelSource = body.ChannelSource;
        entity.CurrencyCode = body.CurrencyCode;
        entity.Amount = body.Amount;
        entity.EstimatedValue = body.EstimatedValue;
        entity.ImpactUnit = body.ImpactUnit;
        entity.IsRecurring = body.IsRecurring;
        entity.CampaignName = body.CampaignName;
        entity.Notes = body.Notes;
    }

    public static void MapVisitation(HomeVisitation entity, HomeVisitation body)
    {
        entity.ResidentId = body.ResidentId;
        entity.VisitDate = body.VisitDate;
        entity.SocialWorker = body.SocialWorker;
        entity.VisitType = body.VisitType;
        entity.LocationVisited = body.LocationVisited;
        entity.FamilyMembersPresent = body.FamilyMembersPresent;
        entity.Purpose = body.Purpose;
        entity.Observations = body.Observations;
        entity.FamilyCooperationLevel = body.FamilyCooperationLevel;
        entity.SafetyConcernsNoted = body.SafetyConcernsNoted;
        entity.FollowUpNeeded = body.FollowUpNeeded;
        entity.FollowUpNotes = body.FollowUpNotes;
        entity.VisitOutcome = body.VisitOutcome;
    }
}

// ── Request DTOs ────────────────────────────────────────────

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class RecordingRequest
{
    public int ResidentId { get; set; }
    public DateOnly? SessionDate { get; set; }
    public string? SocialWorker { get; set; }
    public string? SessionType { get; set; }
    public int? SessionDurationMinutes { get; set; }
    public string? EmotionalStateObserved { get; set; }
    public string? EmotionalStateEnd { get; set; }
    public string? SessionNarrative { get; set; }
    public string? InterventionsApplied { get; set; }
    public string? FollowUpActions { get; set; }
    public bool? ProgressNoted { get; set; }
    public bool? ConcernsFlagged { get; set; }
    public bool? ReferralMade { get; set; }
    public string? NotesRestricted { get; set; }
}

public class ResidentRequest
{
    public string? CaseControlNo { get; set; }
    public string? InternalCode { get; set; }
    public int? SafehouseId { get; set; }
    public string? CaseStatus { get; set; }
    public string? Sex { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? BirthStatus { get; set; }
    public string? PlaceOfBirth { get; set; }
    public string? Religion { get; set; }
    public string? CaseCategory { get; set; }
    public bool? SubCatOrphaned { get; set; }
    public bool? SubCatTrafficked { get; set; }
    public bool? SubCatChildLabor { get; set; }
    public bool? SubCatPhysicalAbuse { get; set; }
    public bool? SubCatSexualAbuse { get; set; }
    public bool? SubCatOsaec { get; set; }
    public bool? SubCatCicl { get; set; }
    public bool? SubCatAtRisk { get; set; }
    public bool? SubCatStreetChild { get; set; }
    public bool? SubCatChildWithHiv { get; set; }
    public bool? IsPwd { get; set; }
    public string? PwdType { get; set; }
    public bool? HasSpecialNeeds { get; set; }
    public string? SpecialNeedsDiagnosis { get; set; }
    public bool? FamilyIs4ps { get; set; }
    public bool? FamilySoloParent { get; set; }
    public bool? FamilyIndigenous { get; set; }
    public bool? FamilyParentPwd { get; set; }
    public bool? FamilyInformalSettler { get; set; }
    public DateOnly? DateOfAdmission { get; set; }
    public string? AgeUponAdmission { get; set; }
    public string? PresentAge { get; set; }
    public string? LengthOfStay { get; set; }
    public string? ReferralSource { get; set; }
    public string? ReferringAgencyPerson { get; set; }
    public DateOnly? DateColbRegistered { get; set; }
    public DateOnly? DateColbObtained { get; set; }
    public string? AssignedSocialWorker { get; set; }
    public string? InitialCaseAssessment { get; set; }
    public DateOnly? DateCaseStudyPrepared { get; set; }
    public string? ReintegrationType { get; set; }
    public string? ReintegrationStatus { get; set; }
    public string? InitialRiskLevel { get; set; }
    public string? CurrentRiskLevel { get; set; }
    public DateOnly? DateEnrolled { get; set; }
    public DateOnly? DateClosed { get; set; }
    public string? NotesRestricted { get; set; }
}

public class SupporterRequest
{
    public string? SupporterType { get; set; }
    public string? DisplayName { get; set; }
    public string? OrganizationName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? RelationshipType { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public string? Status { get; set; }
    public string? AcquisitionChannel { get; set; }
}

public class DonationRequest
{
    public int? SupporterId { get; set; }
    public string? DonationType { get; set; }
    public DateOnly? DonationDate { get; set; }
    public string? ChannelSource { get; set; }
    public string? CurrencyCode { get; set; }
    public decimal? Amount { get; set; }
    public decimal? EstimatedValue { get; set; }
    public string? ImpactUnit { get; set; }
    public bool? IsRecurring { get; set; }
    public string? CampaignName { get; set; }
    public string? Notes { get; set; }
}

public partial class Program { }

using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using backend.Data;
using backend.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

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
    opts.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    opts.Cookie.SameSite = SameSiteMode.None;
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

StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"];

var app = builder.Build();

// ── Apply pending migrations & seed Identity ───────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.ProviderName?.Contains("Sqlite") == true)
        await db.Database.EnsureCreatedAsync();
    else
        await db.Database.MigrateAsync();
    await IdentitySeeder.SeedAsync(scope.ServiceProvider);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseHsts();
app.UseCors("AllowFrontend");

// ── Global error handler (ensures CORS headers on errors) ──
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("GlobalErrorHandler");
        logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
        await context.Response.WriteAsJsonAsync(new { error = "An internal error occurred." });
    }
});

// ── Security headers ────────────────────────────────────────
app.Use(async (context, next) =>
{
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://www.google-analytics.com https://generativelanguage.googleapis.com; " +
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

app.MapPost("/api/auth/register", async (
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    AppDbContext db,
    HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<RegisterRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

    var existing = await userManager.FindByEmailAsync(body.Email);
    if (existing != null)
        return Results.BadRequest(new { error = "An account with this email already exists. Please log in instead." });

    // Create supporter record
    var supporter = new backend.Models.Supporter
    {
        FirstName = body.FirstName,
        LastName = body.LastName,
        Email = body.Email,
        DisplayName = $"{body.FirstName} {body.LastName}",
        SupporterType = "Individual",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
    };
    db.Supporters.Add(supporter);
    await db.SaveChangesAsync();

    // Create user account linked to supporter
    var user = new ApplicationUser
    {
        UserName = body.Email,
        Email = body.Email,
        FirstName = body.FirstName,
        LastName = body.LastName,
        SupporterId = supporter.SupporterId,
        EmailConfirmed = true,
    };

    var result = await userManager.CreateAsync(user, body.Password);
    if (!result.Succeeded)
    {
        db.Supporters.Remove(supporter);
        await db.SaveChangesAsync();
        var errors = string.Join("; ", result.Errors.Select(e => e.Description));
        return Results.BadRequest(new { error = errors });
    }

    await userManager.AddToRoleAsync(user, "Donor");
    await signInManager.SignInAsync(user, isPersistent: false);

    return Results.Ok(new
    {
        email = user.Email,
        firstName = user.FirstName,
        lastName = user.LastName,
        roles = new[] { "Donor" },
        supporterId = supporter.SupporterId,
    });
});

app.MapGet("/api/auth/me", async (
    HttpContext httpContext,
    UserManager<ApplicationUser> userManager,
    AppDbContext db) =>
{
    if (httpContext.User.Identity?.IsAuthenticated != true)
        return Results.Ok(new { isAuthenticated = false });

    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null)
        return Results.Ok(new { isAuthenticated = false });

    var roles = await userManager.GetRolesAsync(user);
    var safehouses = await db.UserSafehouses
        .Where(us => us.UserId == user.Id)
        .Join(db.Safehouses, us => us.SafehouseId, s => s.SafehouseId,
            (us, s) => new { s.SafehouseId, s.SafehouseCode, s.Name })
        .ToListAsync();

    return Results.Ok(new
    {
        isAuthenticated = true,
        email = user.Email,
        firstName = user.FirstName,
        lastName = user.LastName,
        roles,
        supporterId = user.SupporterId,
        safehouses
    });
});

// ── User Safehouse Management ───────────────────────────────

app.MapPut("/api/admin/users/{id}/safehouses", async (string id, AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<UpdateSafehousesRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var existing = await db.UserSafehouses.Where(us => us.UserId == id).ToListAsync();
    db.UserSafehouses.RemoveRange(existing);
    if (body.SafehouseIds != null)
        foreach (var sid in body.SafehouseIds)
            db.UserSafehouses.Add(new UserSafehouse { UserId = id, SafehouseId = sid });
    await db.SaveChangesAsync();
    return Results.Ok(new { updated = true });
}).RequireAuthorization("AdminOnly");

// ── Staff Tasks (To-Do System) ─────────────────────────────

app.MapGet("/api/staff/tasks", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db, int? safehouseId) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var now = DateTime.UtcNow;
    var query = db.StaffTasks
        .Where(t => t.StaffUserId == user.Id)
        .Where(t => t.Status == "Pending" || t.Status == "Snoozed")
        .Where(t => t.Status != "Snoozed" || t.SnoozeUntil == null || t.SnoozeUntil <= now);
    if (safehouseId.HasValue) query = query.Where(t => t.SafehouseId == safehouseId.Value);
    var tasks = await query.OrderByDescending(t => t.CreatedAt)
        .Select(t => new { t.StaffTaskId, t.StaffUserId, t.ResidentId, residentCode = t.Resident != null ? t.Resident.InternalCode : null, t.SafehouseId, t.TaskType, t.Title, t.Description, t.ContextJson, t.Status, t.SnoozeUntil, t.DueTriggerDate, t.CreatedAt, t.SourceEntityType, t.SourceEntityId })
        .ToListAsync();
    return Results.Ok(tasks);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/staff/tasks", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var body = await httpContext.Request.ReadFromJsonAsync<CreateStaffTaskRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var task = new StaffTask { StaffUserId = user.Id, ResidentId = body.ResidentId, SafehouseId = body.SafehouseId, TaskType = body.TaskType ?? "Manual", Title = body.Title ?? "", Description = body.Description, ContextJson = body.ContextJson, Status = "Pending" };
    db.StaffTasks.Add(task);
    await db.SaveChangesAsync();
    return Results.Ok(new { task.StaffTaskId });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPut("/api/staff/tasks/{id}", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var task = await db.StaffTasks.FirstOrDefaultAsync(t => t.StaffTaskId == id && t.StaffUserId == user.Id);
    if (task == null) return Results.NotFound();
    var body = await httpContext.Request.ReadFromJsonAsync<UpdateStaffTaskRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    if (!string.IsNullOrEmpty(body.Status)) { task.Status = body.Status; if (body.Status == "Completed" || body.Status == "Dismissed") task.CompletedAt = DateTime.UtcNow; }
    if (body.SnoozeUntil.HasValue) { task.SnoozeUntil = body.SnoozeUntil.Value; task.Status = "Snoozed"; }
    await db.SaveChangesAsync();
    return Results.Ok(new { updated = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Calendar Events ─────────────────────────────────────────

app.MapGet("/api/staff/calendar", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db, DateOnly? date, DateOnly? weekStart, int? safehouseId) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var query = db.CalendarEvents.Where(e => e.StaffUserId == user.Id).Where(e => e.Status != "Cancelled");
    if (safehouseId.HasValue) query = query.Where(e => e.SafehouseId == safehouseId.Value);
    if (date.HasValue) query = query.Where(e => e.EventDate == date.Value);
    else if (weekStart.HasValue) { var weekEnd = weekStart.Value.AddDays(7); query = query.Where(e => e.EventDate >= weekStart.Value && e.EventDate < weekEnd); }
    var events = await query.OrderBy(e => e.EventDate).ThenBy(e => e.StartTime)
        .Select(e => new { e.CalendarEventId, e.StaffUserId, e.SafehouseId, e.ResidentId, residentCode = e.Resident != null ? e.Resident.InternalCode : null, e.EventType, e.Title, e.Description, eventDate = e.EventDate.ToString("yyyy-MM-dd"), startTime = e.StartTime.HasValue ? e.StartTime.Value.ToString("HH:mm") : null, endTime = e.EndTime.HasValue ? e.EndTime.Value.ToString("HH:mm") : null, e.RecurrenceRule, e.SourceTaskId, e.Status, e.CreatedAt })
        .ToListAsync();
    return Results.Ok(events);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/staff/calendar", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var body = await httpContext.Request.ReadFromJsonAsync<CreateCalendarEventRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var evt = new CalendarEvent { StaffUserId = user.Id, SafehouseId = body.SafehouseId, ResidentId = body.ResidentId, EventType = body.EventType ?? "Other", Title = body.Title ?? "", Description = body.Description, EventDate = DateOnly.Parse(body.EventDate), StartTime = !string.IsNullOrEmpty(body.StartTime) ? TimeOnly.Parse(body.StartTime) : null, EndTime = !string.IsNullOrEmpty(body.EndTime) ? TimeOnly.Parse(body.EndTime) : null, RecurrenceRule = body.RecurrenceRule, SourceTaskId = body.SourceTaskId, Status = "Scheduled" };
    db.CalendarEvents.Add(evt);
    if (body.SourceTaskId.HasValue) { var task = await db.StaffTasks.FirstOrDefaultAsync(t => t.StaffTaskId == body.SourceTaskId.Value); if (task != null) { task.Status = "Completed"; task.CompletedAt = DateTime.UtcNow; } }
    await db.SaveChangesAsync();
    return Results.Ok(new { evt.CalendarEventId });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPut("/api/staff/calendar/{id}", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var evt = await db.CalendarEvents.FirstOrDefaultAsync(e => e.CalendarEventId == id && e.StaffUserId == user.Id);
    if (evt == null) return Results.NotFound();
    var body = await httpContext.Request.ReadFromJsonAsync<UpdateCalendarEventRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    if (!string.IsNullOrEmpty(body.Status)) evt.Status = body.Status;
    if (!string.IsNullOrEmpty(body.StartTime)) evt.StartTime = TimeOnly.Parse(body.StartTime);
    if (!string.IsNullOrEmpty(body.EndTime)) evt.EndTime = TimeOnly.Parse(body.EndTime);
    if (!string.IsNullOrEmpty(body.EventDate)) evt.EventDate = DateOnly.Parse(body.EventDate);
    if (body.Title != null) evt.Title = body.Title;
    if (body.Description != null) evt.Description = body.Description;
    await db.SaveChangesAsync();
    return Results.Ok(new { updated = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapDelete("/api/staff/calendar/{id}", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var evt = await db.CalendarEvents.FirstOrDefaultAsync(e => e.CalendarEventId == id && e.StaffUserId == user.Id);
    if (evt == null) return Results.NotFound();
    evt.Status = "Cancelled";
    await db.SaveChangesAsync();
    return Results.Ok(new { cancelled = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Incident Management ─────────────────────────────────────

app.MapGet("/api/admin/incidents", async (AppDbContext db, int? safehouseId, int? residentId, string? severity, bool? resolved, int page = 1, int pageSize = 20) =>
{
    var query = db.IncidentReports.AsQueryable();
    if (safehouseId.HasValue) query = query.Where(i => i.SafehouseId == safehouseId.Value);
    if (residentId.HasValue) query = query.Where(i => i.ResidentId == residentId.Value);
    if (!string.IsNullOrEmpty(severity)) query = query.Where(i => i.Severity == severity);
    if (resolved.HasValue) query = query.Where(i => i.Resolved == resolved.Value);
    var total = await query.CountAsync();
    var items = await query.OrderByDescending(i => i.IncidentDate).Skip((page - 1) * pageSize).Take(pageSize)
        .Select(i => new { i.IncidentId, i.ResidentId, residentCode = i.Resident != null ? i.Resident.InternalCode : null, i.SafehouseId, i.IncidentDate, i.IncidentType, i.Severity, i.Description, i.ResponseTaken, i.ReportedBy, i.Resolved, i.ResolutionDate, i.FollowUpRequired })
        .ToListAsync();
    return Results.Ok(new { total, page, pageSize, items });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/incidents/{id}", async (int id, AppDbContext db) =>
{
    var i = await db.IncidentReports.Where(x => x.IncidentId == id)
        .Select(x => new { x.IncidentId, x.ResidentId, residentCode = x.Resident != null ? x.Resident.InternalCode : null, x.SafehouseId, x.IncidentDate, x.IncidentType, x.Severity, x.Description, x.ResponseTaken, x.ReportedBy, x.Resolved, x.ResolutionDate, x.FollowUpRequired })
        .FirstOrDefaultAsync();
    return i == null ? Results.NotFound() : Results.Ok(i);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/incidents", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<IncidentRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var incident = new IncidentReport { ResidentId = body.ResidentId, SafehouseId = body.SafehouseId, IncidentDate = body.IncidentDate, IncidentType = body.IncidentType, Severity = body.Severity, Description = body.Description, ResponseTaken = body.ResponseTaken, ReportedBy = body.ReportedBy, Resolved = body.Resolved ?? false, ResolutionDate = body.ResolutionDate, FollowUpRequired = body.FollowUpRequired ?? false };
    db.IncidentReports.Add(incident);
    await db.SaveChangesAsync();
    if (incident.FollowUpRequired == true && incident.ResidentId.HasValue)
    {
        var resident = await db.Residents.FindAsync(incident.ResidentId.Value);
        if (resident != null)
        {
            var assignedUser = await db.UserSafehouses.Where(us => us.SafehouseId == (incident.SafehouseId ?? resident.SafehouseId ?? 0)).Select(us => us.UserId).FirstOrDefaultAsync();
            if (assignedUser != null)
            {
                db.StaffTasks.Add(new StaffTask { StaffUserId = assignedUser, ResidentId = incident.ResidentId, SafehouseId = incident.SafehouseId ?? resident.SafehouseId ?? 0, TaskType = "IncidentFollowUp", Title = $"Follow up on incident for {resident.InternalCode}", Description = $"Incident: {incident.IncidentType} ({incident.Severity}) - {incident.Description}", SourceEntityType = "IncidentReport", SourceEntityId = incident.IncidentId });
                await db.SaveChangesAsync();
            }
        }
    }
    return Results.Ok(new { incident.IncidentId });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPut("/api/admin/incidents/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
{
    var incident = await db.IncidentReports.FindAsync(id);
    if (incident == null) return Results.NotFound();
    var body = await httpContext.Request.ReadFromJsonAsync<IncidentRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    incident.ResidentId = body.ResidentId; incident.SafehouseId = body.SafehouseId; incident.IncidentDate = body.IncidentDate; incident.IncidentType = body.IncidentType; incident.Severity = body.Severity; incident.Description = body.Description; incident.ResponseTaken = body.ResponseTaken; incident.ReportedBy = body.ReportedBy; incident.Resolved = body.Resolved ?? incident.Resolved; incident.ResolutionDate = body.ResolutionDate; incident.FollowUpRequired = body.FollowUpRequired ?? incident.FollowUpRequired;
    await db.SaveChangesAsync();
    return Results.Ok(new { updated = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapDelete("/api/admin/incidents/{id}", async (int id, AppDbContext db) =>
{
    var incident = await db.IncidentReports.FindAsync(id);
    if (incident == null) return Results.NotFound();
    db.IncidentReports.Remove(incident);
    await db.SaveChangesAsync();
    return Results.Ok(new { deleted = true });
}).RequireAuthorization("AdminOnly");

// ── ML Predictions ──────────────────────────────────────────

app.MapGet("/api/ml/predictions/{entityType}/{entityId}", async (string entityType, int entityId, AppDbContext db) =>
{
    var predictions = await db.MlPredictions.Where(p => p.EntityType == entityType && p.EntityId == entityId)
        .Select(p => new { p.Id, p.EntityType, p.EntityId, p.ModelName, p.ModelVersion, p.Score, p.ScoreLabel, p.PredictedAt, p.Metadata })
        .ToListAsync();
    return Results.Ok(predictions);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/ml/predictions/{entityType}/{entityId}/history", async (string entityType, int entityId, string? model, AppDbContext db) =>
{
    var query = db.MlPredictionHistory.Where(p => p.EntityType == entityType && p.EntityId == entityId);
    if (!string.IsNullOrEmpty(model)) query = query.Where(p => p.ModelName == model);
    var history = await query.OrderByDescending(p => p.PredictedAt).Take(50)
        .Select(p => new { p.Id, p.ModelName, p.Score, p.ScoreLabel, p.PredictedAt })
        .ToListAsync();
    return Results.Ok(history);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Case Claiming ───────────────────────────────────────────

app.MapPost("/api/admin/residents/{id}/claim", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var user = await userManager.GetUserAsync(httpContext.User);
    if (user == null) return Results.Unauthorized();
    var resident = await db.Residents.FindAsync(id);
    if (resident == null) return Results.NotFound();
    resident.AssignedSocialWorker = $"{user.FirstName} {user.LastName}";
    await db.SaveChangesAsync();
    // Auto-generate initial home visit to-do
    db.StaffTasks.Add(new StaffTask { StaffUserId = user.Id, ResidentId = id, SafehouseId = resident.SafehouseId ?? 1, TaskType = "ScheduleHomeVisit", Title = $"Schedule initial home visit for {resident.InternalCode}", Description = "Initial assessment visit after claiming case", Status = "Pending" });
    await db.SaveChangesAsync();
    return Results.Ok(new { claimed = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/residents/unclaimed", async (AppDbContext db, int? safehouseId) =>
{
    var query = db.Residents.Where(r => r.AssignedSocialWorker == null || r.AssignedSocialWorker == "").Where(r => r.CaseStatus == "Active");
    if (safehouseId.HasValue) query = query.Where(r => r.SafehouseId == safehouseId.Value);
    var items = await query.OrderByDescending(r => r.DateOfAdmission)
        .Select(r => new { r.ResidentId, r.InternalCode, r.CaseControlNo, r.SafehouseId, safehouse = r.Safehouse != null ? r.Safehouse.Name : null, r.CaseCategory, r.CurrentRiskLevel, r.DateOfAdmission })
        .ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Education Records ───────────────────────────────────────

app.MapGet("/api/admin/education-records", async (AppDbContext db, int? residentId) =>
{
    var query = db.EducationRecords.AsQueryable();
    if (residentId.HasValue) query = query.Where(e => e.ResidentId == residentId.Value);
    var items = await query.OrderByDescending(e => e.RecordDate)
        .Select(e => new { e.EducationRecordId, e.ResidentId, residentCode = e.Resident.InternalCode, e.RecordDate, e.EducationLevel, e.AttendanceRate, e.ProgressPercent, e.CompletionStatus, e.Notes, e.SchoolName, e.EnrollmentStatus })
        .ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/education-records", async (HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<EducationRecordRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var record = new EducationRecord { ResidentId = body.ResidentId, RecordDate = body.RecordDate, EducationLevel = body.EducationLevel, AttendanceRate = body.AttendanceRate, ProgressPercent = body.ProgressPercent, CompletionStatus = body.CompletionStatus, Notes = body.Notes, SchoolName = body.SchoolName, EnrollmentStatus = body.EnrollmentStatus };
    db.EducationRecords.Add(record);
    await db.SaveChangesAsync();
    return Results.Ok(new { record.EducationRecordId });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPut("/api/admin/education-records/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
{
    var record = await db.EducationRecords.FindAsync(id);
    if (record == null) return Results.NotFound();
    var body = await httpContext.Request.ReadFromJsonAsync<EducationRecordRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    record.RecordDate = body.RecordDate; record.EducationLevel = body.EducationLevel; record.AttendanceRate = body.AttendanceRate; record.ProgressPercent = body.ProgressPercent; record.CompletionStatus = body.CompletionStatus; record.Notes = body.Notes; record.SchoolName = body.SchoolName; record.EnrollmentStatus = body.EnrollmentStatus;
    await db.SaveChangesAsync();
    return Results.Ok(new { updated = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Health Records ──────────────────────────────────────────

app.MapGet("/api/admin/health-records", async (AppDbContext db, int? residentId) =>
{
    var query = db.HealthWellbeingRecords.AsQueryable();
    if (residentId.HasValue) query = query.Where(h => h.ResidentId == residentId.Value);
    var items = await query.OrderByDescending(h => h.RecordDate)
        .Select(h => new { h.HealthRecordId, h.ResidentId, residentCode = h.Resident.InternalCode, h.RecordDate, h.WeightKg, h.HeightCm, h.Bmi, h.NutritionScore, h.SleepQualityScore, h.EnergyLevelScore, h.GeneralHealthScore, h.MedicalCheckupDone, h.DentalCheckupDone, h.PsychologicalCheckupDone, h.Notes })
        .ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/health-records", async (HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<HealthRecordRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var record = new HealthWellbeingRecord { ResidentId = body.ResidentId, RecordDate = body.RecordDate, WeightKg = body.WeightKg, HeightCm = body.HeightCm, Bmi = body.Bmi, NutritionScore = body.NutritionScore, SleepQualityScore = body.SleepQualityScore, EnergyLevelScore = body.EnergyLevelScore, GeneralHealthScore = body.GeneralHealthScore, MedicalCheckupDone = body.MedicalCheckupDone, DentalCheckupDone = body.DentalCheckupDone, PsychologicalCheckupDone = body.PsychologicalCheckupDone, Notes = body.Notes };
    db.HealthWellbeingRecords.Add(record);
    await db.SaveChangesAsync();
    return Results.Ok(new { record.HealthRecordId });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPut("/api/admin/health-records/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
{
    var record = await db.HealthWellbeingRecords.FindAsync(id);
    if (record == null) return Results.NotFound();
    var body = await httpContext.Request.ReadFromJsonAsync<HealthRecordRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    record.RecordDate = body.RecordDate; record.WeightKg = body.WeightKg; record.HeightCm = body.HeightCm; record.Bmi = body.Bmi; record.NutritionScore = body.NutritionScore; record.SleepQualityScore = body.SleepQualityScore; record.EnergyLevelScore = body.EnergyLevelScore; record.GeneralHealthScore = body.GeneralHealthScore; record.MedicalCheckupDone = body.MedicalCheckupDone; record.DentalCheckupDone = body.DentalCheckupDone; record.PsychologicalCheckupDone = body.PsychologicalCheckupDone; record.Notes = body.Notes;
    await db.SaveChangesAsync();
    return Results.Ok(new { updated = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Intervention Plans ──────────────────────────────────────

app.MapGet("/api/admin/intervention-plans", async (AppDbContext db, int? residentId) =>
{
    var query = db.InterventionPlans.AsQueryable();
    if (residentId.HasValue) query = query.Where(p => p.ResidentId == residentId.Value);
    var items = await query.OrderByDescending(p => p.CreatedAt)
        .Select(p => new { p.PlanId, p.ResidentId, residentCode = p.Resident.InternalCode, p.PlanCategory, p.PlanDescription, p.ServicesProvided, p.TargetValue, p.TargetDate, p.Status, p.CaseConferenceDate, p.CreatedAt, p.UpdatedAt })
        .ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/intervention-plans", async (HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<InterventionPlanRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var plan = new InterventionPlan { ResidentId = body.ResidentId, PlanCategory = body.PlanCategory, PlanDescription = body.PlanDescription, ServicesProvided = body.ServicesProvided, TargetValue = body.TargetValue, TargetDate = body.TargetDate, Status = body.Status ?? "Open", CaseConferenceDate = body.CaseConferenceDate, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
    db.InterventionPlans.Add(plan);
    await db.SaveChangesAsync();
    return Results.Ok(new { plan.PlanId });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPut("/api/admin/intervention-plans/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
{
    var plan = await db.InterventionPlans.FindAsync(id);
    if (plan == null) return Results.NotFound();
    var body = await httpContext.Request.ReadFromJsonAsync<InterventionPlanRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    plan.PlanCategory = body.PlanCategory; plan.PlanDescription = body.PlanDescription; plan.ServicesProvided = body.ServicesProvided; plan.TargetValue = body.TargetValue; plan.TargetDate = body.TargetDate; plan.Status = body.Status ?? plan.Status; plan.CaseConferenceDate = body.CaseConferenceDate; plan.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(new { updated = true });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapDelete("/api/admin/intervention-plans/{id}", async (int id, AppDbContext db) =>
{
    var plan = await db.InterventionPlans.FindAsync(id);
    if (plan == null) return Results.NotFound();
    db.InterventionPlans.Remove(plan);
    await db.SaveChangesAsync();
    return Results.Ok(new { deleted = true });
}).RequireAuthorization("AdminOnly");

// ── Post-Placement Monitoring ────────────────────────────────

app.MapGet("/api/admin/post-placement", async (AppDbContext db, int? safehouseId) =>
{
    var query = db.Residents.Where(r => r.ReintegrationStatus == "Completed" || r.CaseStatus == "Closed" || r.CaseStatus == "Discharged");
    if (safehouseId.HasValue) query = query.Where(r => r.SafehouseId == safehouseId.Value);

    var residents = await query.OrderByDescending(r => r.DateClosed)
        .Select(r => new
        {
            r.ResidentId,
            r.InternalCode,
            r.CaseControlNo,
            r.SafehouseId,
            safehouse = r.Safehouse != null ? r.Safehouse.Name : null,
            r.CaseStatus,
            r.ReintegrationType,
            r.ReintegrationStatus,
            r.DateClosed,
            r.AssignedSocialWorker,
            r.CurrentRiskLevel,
            lastVisit = r.HomeVisitations
                .Where(v => v.VisitType == "Post-Placement Monitoring")
                .OrderByDescending(v => v.VisitDate)
                .Select(v => v.VisitDate)
                .FirstOrDefault(),
            totalVisits = r.HomeVisitations.Count(v => v.VisitType == "Post-Placement Monitoring"),
        })
        .ToListAsync();

    return Results.Ok(residents);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/post-placement/summary", async (AppDbContext db, int? safehouseId) =>
{
    var query = db.Residents.Where(r => r.ReintegrationStatus == "Completed" || r.CaseStatus == "Closed" || r.CaseStatus == "Discharged");
    if (safehouseId.HasValue) query = query.Where(r => r.SafehouseId == safehouseId.Value);

    var total = await query.CountAsync();
    var byType = await query.GroupBy(r => r.ReintegrationType).Select(g => new { type = g.Key, count = g.Count() }).ToListAsync();
    var byStatus = await query.GroupBy(r => r.CaseStatus).Select(g => new { status = g.Key, count = g.Count() }).ToListAsync();

    return Results.Ok(new { total, byType, byStatus });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Seed Workflow Data (one-time, admin-only) ───────────────

app.MapPost("/api/admin/seed-workflow-data", async (
    UserManager<ApplicationUser> userManager,
    AppDbContext db) =>
{
    var results = new List<string>();
    // "Today" is February 16, 2026 — matching DATA_CUTOFF
    var today = new DateOnly(2026, 2, 16);
    var todayDt = new DateTime(2026, 2, 16, 0, 0, 0, DateTimeKind.Utc);

    // ── 0. Clear old seeded workflow data so we can re-seed ──
    var oldTasks = await db.StaffTasks.ToListAsync();
    if (oldTasks.Count > 0) { db.StaffTasks.RemoveRange(oldTasks); await db.SaveChangesAsync(); results.Add($"Cleared {oldTasks.Count} old tasks"); }
    var oldEvents = await db.CalendarEvents.ToListAsync();
    if (oldEvents.Count > 0) { db.CalendarEvents.RemoveRange(oldEvents); await db.SaveChangesAsync(); results.Add($"Cleared {oldEvents.Count} old events"); }

    // ── 1. Create staff user accounts (SW-01 through SW-20) ──
    var staffNames = new Dictionary<string, (string first, string last)>
    {
        ["SW-01"] = ("Maria", "Santos"), ["SW-02"] = ("Elena", "Cruz"),
        ["SW-03"] = ("Rosa", "Garcia"), ["SW-04"] = ("Ana", "Reyes"),
        ["SW-05"] = ("Carmen", "Bautista"), ["SW-06"] = ("Linda", "Perez"),
        ["SW-07"] = ("Grace", "Flores"), ["SW-08"] = ("Joy", "Rivera"),
        ["SW-09"] = ("Faith", "Torres"), ["SW-10"] = ("Hope", "Ramos"),
        ["SW-11"] = ("Liza", "Mendoza"), ["SW-13"] = ("Diana", "Castro"),
        ["SW-14"] = ("Sarah", "Aquino"), ["SW-15"] = ("Ruth", "Villanueva"),
        ["SW-16"] = ("Esther", "Soriano"), ["SW-17"] = ("Mercy", "Dela Cruz"),
        ["SW-19"] = ("Alma", "Pascual"), ["SW-20"] = ("Nina", "Cortez"),
    };

    // Map SW codes to safehouse IDs (roughly 2 staff per safehouse)
    var swToSafehouse = new Dictionary<string, int[]>
    {
        ["SW-01"] = new[] { 1, 2 }, ["SW-02"] = new[] { 1 },
        ["SW-03"] = new[] { 2 }, ["SW-04"] = new[] { 3 },
        ["SW-05"] = new[] { 3, 4 }, ["SW-06"] = new[] { 4 },
        ["SW-07"] = new[] { 5, 6 }, ["SW-08"] = new[] { 1 },
        ["SW-09"] = new[] { 5 }, ["SW-10"] = new[] { 6 },
        ["SW-11"] = new[] { 7 }, ["SW-13"] = new[] { 7, 8 },
        ["SW-14"] = new[] { 8 }, ["SW-15"] = new[] { 9 },
        ["SW-16"] = new[] { 2, 7 }, ["SW-17"] = new[] { 7, 8 },
        ["SW-19"] = new[] { 9 }, ["SW-20"] = new[] { 1, 3 },
    };

    var staffUserIds = new Dictionary<string, string>(); // SW code → userId

    foreach (var (sw, names) in staffNames)
    {
        var email = $"{sw.ToLower().Replace("-", "")}@beaconofhope.org";
        var existing = await userManager.FindByEmailAsync(email);
        if (existing != null)
        {
            staffUserIds[sw] = existing.Id;
            results.Add($"User {sw} already exists");
            continue;
        }
        var user = new ApplicationUser
        {
            UserName = email, Email = email,
            FirstName = names.first, LastName = names.last,
            EmailConfirmed = true
        };
        var createResult = await userManager.CreateAsync(user, "Test1234!@#$");
        if (createResult.Succeeded)
        {
            await userManager.AddToRoleAsync(user, "Staff");
            staffUserIds[sw] = user.Id;
            results.Add($"Created user {sw}: {email}");
        }
        else
        {
            results.Add($"Failed to create {sw}: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
        }
    }

    // ── 2. Assign safehouses to staff users ──
    foreach (var (sw, safehouseIds) in swToSafehouse)
    {
        if (!staffUserIds.ContainsKey(sw)) continue;
        var userId = staffUserIds[sw];
        var existingAssignments = await db.UserSafehouses.Where(us => us.UserId == userId).ToListAsync();
        if (existingAssignments.Count > 0) continue; // already assigned

        foreach (var shId in safehouseIds)
        {
            db.UserSafehouses.Add(new UserSafehouse { UserId = userId, SafehouseId = shId });
        }
        results.Add($"Assigned {sw} to safehouses: {string.Join(", ", safehouseIds)}");
    }

    // Assign admin to ALL safehouses
    var adminUser = await userManager.FindByEmailAsync("admin@beaconofhope.org");
    if (adminUser != null)
    {
        var adminAssignments = await db.UserSafehouses.Where(us => us.UserId == adminUser.Id).ToListAsync();
        if (adminAssignments.Count == 0)
        {
            for (int i = 1; i <= 9; i++)
                db.UserSafehouses.Add(new UserSafehouse { UserId = adminUser.Id, SafehouseId = i });
            results.Add("Assigned admin to all 9 safehouses");
        }
    }

    // Assign existing staff user to safehouses 1 and 2
    var staffUser = await userManager.FindByEmailAsync("staff@beaconofhope.org");
    if (staffUser != null)
    {
        var existStaff = await db.UserSafehouses.Where(us => us.UserId == staffUser.Id).ToListAsync();
        if (existStaff.Count == 0)
        {
            db.UserSafehouses.Add(new UserSafehouse { UserId = staffUser.Id, SafehouseId = 1 });
            db.UserSafehouses.Add(new UserSafehouse { UserId = staffUser.Id, SafehouseId = 2 });
            results.Add("Assigned staff@beaconofhope.org to safehouses 1, 2");
        }
    }

    await db.SaveChangesAsync();

    // ── 3. Create dense to-do tasks for active residents ──
    var activeResidents = await db.Residents
        .Where(r => r.CaseStatus == "Active")
        .Select(r => new { r.ResidentId, r.InternalCode, r.AssignedSocialWorker, r.SafehouseId })
        .ToListAsync();

    var taskCount = 0;
    var random = new Random(42);

    foreach (var r in activeResidents)
    {
        var sw = r.AssignedSocialWorker ?? "SW-01";
        if (!staffUserIds.ContainsKey(sw)) continue;
        var userId = staffUserIds[sw];
        var shId = r.SafehouseId ?? 1;

        // Monthly doctor appointment
        db.StaffTasks.Add(new StaffTask
        {
            StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
            TaskType = "ScheduleDoctor", Title = $"Schedule doctor appointment for {r.InternalCode}",
            Description = "Monthly medical checkup — due this week",
            ContextJson = $"{{\"lastDoctorVisit\": \"{today.AddDays(-random.Next(28, 45)):yyyy-MM-dd}\"}}",
            Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 3))
        });
        taskCount++;

        // Monthly dentist appointment
        db.StaffTasks.Add(new StaffTask
        {
            StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
            TaskType = "ScheduleDentist", Title = $"Schedule dentist appointment for {r.InternalCode}",
            Description = "Monthly dental checkup — due this week",
            ContextJson = $"{{\"lastDentistVisit\": \"{today.AddDays(-random.Next(30, 60)):yyyy-MM-dd}\"}}",
            Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 4))
        });
        taskCount++;

        // Update education records
        db.StaffTasks.Add(new StaffTask
        {
            StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
            TaskType = "UpdateEducation", Title = $"Update education records for {r.InternalCode}",
            Description = "Monthly education progress update",
            Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 5))
        });
        taskCount++;

        // Input health records (post-appointment)
        if (random.Next(3) == 0)
        {
            db.StaffTasks.Add(new StaffTask
            {
                StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                TaskType = "InputHealthRecords", Title = $"Input health records for {r.InternalCode}",
                Description = "Record data from recent medical appointment",
                Status = "Pending", CreatedAt = todayDt.AddDays(-1)
            });
            taskCount++;
        }

        // Incident follow-up (for some residents)
        if (random.Next(4) == 0)
        {
            db.StaffTasks.Add(new StaffTask
            {
                StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                TaskType = "IncidentFollowUp", Title = $"Follow up on incident for {r.InternalCode}",
                Description = $"Incident: Behavioral ({(random.Next(2) == 0 ? "Medium" : "High")}) — Review and determine next steps",
                SourceEntityType = "IncidentReport",
                Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 2))
            });
            taskCount++;
        }

        // Schedule home visit
        if (random.Next(3) == 0)
        {
            db.StaffTasks.Add(new StaffTask
            {
                StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                TaskType = "ScheduleHomeVisit", Title = $"Schedule home visit for {r.InternalCode}",
                Description = "Routine follow-up home visit due",
                Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 3))
            });
            taskCount++;
        }
    }
    await db.SaveChangesAsync();
    results.Add($"Created {taskCount} to-do tasks");

    // ── 4. Create dense calendar events around Feb 16 ──
    var eventCount = 0;
    var eventTypes = new[] { "Counseling", "Counseling", "Counseling", "HomeVisit", "DoctorApt", "DentistApt", "GroupTherapy" };
    var timeSlots = new[] { "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00" };

    foreach (var r in activeResidents)
    {
        var sw = r.AssignedSocialWorker ?? "SW-01";
        if (!staffUserIds.ContainsKey(sw)) continue;
        var userId = staffUserIds[sw];
        var shId = r.SafehouseId ?? 1;

        // 4-8 events per resident over 2 weeks around Feb 16
        var numEvents = random.Next(4, 9);
        for (int i = 0; i < numEvents; i++)
        {
            // Spread from Feb 10 (Tue) to Feb 27 (Fri), biased toward Feb 16-20
            var daysOffset = random.Next(-4, 12);
            // Bias: 40% chance of being on today (Feb 16) or tomorrow
            if (random.Next(5) < 2) daysOffset = random.Next(0, 2);
            var eventDate = today.AddDays(daysOffset);
            if (eventDate.DayOfWeek == DayOfWeek.Saturday || eventDate.DayOfWeek == DayOfWeek.Sunday) continue;

            var eventType = eventTypes[random.Next(eventTypes.Length)];
            // 70% have a time, 30% unscheduled (shows in parking lot)
            var hasTime = random.Next(10) < 7;
            var timeSlot = hasTime ? timeSlots[random.Next(timeSlots.Length)] : null;

            var title = eventType switch
            {
                "Counseling" => $"Counseling — {r.InternalCode}",
                "HomeVisit" => $"Home visit — {r.InternalCode}",
                "DoctorApt" => $"Doctor appt — {r.InternalCode}",
                "DentistApt" => $"Dentist appt — {r.InternalCode}",
                "GroupTherapy" => $"Group therapy — {r.InternalCode}",
                _ => $"Event — {r.InternalCode}"
            };

            db.CalendarEvents.Add(new CalendarEvent
            {
                StaffUserId = userId, SafehouseId = shId, ResidentId = r.ResidentId,
                EventType = eventType, Title = title,
                EventDate = eventDate,
                StartTime = timeSlot != null ? TimeOnly.Parse(timeSlot) : null,
                EndTime = timeSlot != null ? TimeOnly.Parse(timeSlot).AddMinutes(random.Next(2, 4) * 30) : null,
                Status = daysOffset < 0 ? "Completed" : "Scheduled",
                CreatedAt = todayDt.AddDays(daysOffset - 3)
            });
            eventCount++;
        }
    }

    // Monday case conferences — Feb 16 is DATA_CUTOFF and a Monday
    var confMonday = today; // 2026-02-16
    for (int shId = 1; shId <= 9; shId++)
    {
        var shStaff = swToSafehouse.FirstOrDefault(kv => kv.Value.Contains(shId));
        if (shStaff.Key == null || !staffUserIds.ContainsKey(shStaff.Key)) continue;
        // All staff at this safehouse get the conference
        foreach (var (swCode, shIds) in swToSafehouse.Where(kv => kv.Value.Contains(shId)))
        {
            if (!staffUserIds.ContainsKey(swCode)) continue;
            db.CalendarEvents.Add(new CalendarEvent
            {
                StaffUserId = staffUserIds[swCode], SafehouseId = shId,
                EventType = "CaseConference", Title = $"Case Conference — SH{shId:D2}",
                EventDate = confMonday, StartTime = TimeOnly.Parse("09:00"), EndTime = TimeOnly.Parse("10:00"),
                Status = "Scheduled", CreatedAt = todayDt.AddDays(-1)
            });
            eventCount++;
        }
    }

    await db.SaveChangesAsync();
    results.Add($"Created {eventCount} calendar events");

    // ── 5. Clear social worker from a few residents to make unclaimed queue ──
    var unclaimedCount = await db.Residents.CountAsync(r => (r.AssignedSocialWorker == null || r.AssignedSocialWorker == "") && r.CaseStatus == "Active");
    if (unclaimedCount == 0)
    {
        var toUnclaim = await db.Residents
            .Where(r => r.CaseStatus == "Active")
            .OrderBy(r => r.ResidentId)
            .Take(5)
            .ToListAsync();
        foreach (var r in toUnclaim)
        {
            r.AssignedSocialWorker = null;
        }
        await db.SaveChangesAsync();
        results.Add($"Cleared social worker from {toUnclaim.Count} residents for queue");
    }

    return Results.Ok(new { results });
}).RequireAuthorization("AdminOnly");

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

// ── IMPORTANT: DbContext is NOT thread-safe. ──────────────
// Do NOT use Task.WhenAll() with multiple queries on the same DbContext.
// Always await queries sequentially (one at a time).
//
// var x = await db.Table1.CountAsync();
//    var y = await db.Table2.CountAsync();

// ── User Management (Admin only) ────────────────────────────

app.MapGet("/api/admin/users", async (UserManager<ApplicationUser> userManager, AppDbContext db) =>
{
    var users = userManager.Users.ToList();
    var allAssignments = await db.UserSafehouses
        .Join(db.Safehouses, us => us.SafehouseId, s => s.SafehouseId,
            (us, s) => new { us.UserId, s.SafehouseId, s.SafehouseCode, s.Name })
        .ToListAsync();
    var result = new List<object>();
    foreach (var u in users)
    {
        var roles = await userManager.GetRolesAsync(u);
        var safehouses = allAssignments.Where(a => a.UserId == u.Id)
            .Select(a => new { a.SafehouseId, a.SafehouseCode, a.Name }).ToList();
        result.Add(new
        {
            id = u.Id,
            email = u.Email,
            firstName = u.FirstName,
            lastName = u.LastName,
            roles = roles.ToList(),
            supporterId = u.SupporterId,
            safehouses
        });
    }
    return result;
}).RequireAuthorization("AdminOnly");

app.MapPost("/api/admin/users", async (
    UserManager<ApplicationUser> userManager,
    AppDbContext db,
    HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<CreateUserRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
        return Results.BadRequest(new { error = "Email and password are required." });
    if (string.IsNullOrWhiteSpace(body.Role))
        return Results.BadRequest(new { error = "Role is required." });

    var existing = await userManager.FindByEmailAsync(body.Email);
    if (existing != null)
        return Results.BadRequest(new { error = "A user with this email already exists." });

    var user = new ApplicationUser
    {
        UserName = body.Email,
        Email = body.Email,
        FirstName = body.FirstName ?? "",
        LastName = body.LastName ?? "",
        EmailConfirmed = true,
    };
    var result = await userManager.CreateAsync(user, body.Password);
    if (!result.Succeeded)
        return Results.BadRequest(new { error = string.Join("; ", result.Errors.Select(e => e.Description)) });

    await userManager.AddToRoleAsync(user, body.Role);

    if (body.SafehouseIds != null && body.SafehouseIds.Count > 0)
    {
        foreach (var sid in body.SafehouseIds)
            db.UserSafehouses.Add(new UserSafehouse { UserId = user.Id, SafehouseId = sid });
        await db.SaveChangesAsync();
    }

    return Results.Ok(new { id = user.Id, email = user.Email, role = body.Role });
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/admin/users/{id}", async (
    string id,
    HttpContext context,
    UserManager<ApplicationUser> userManager) =>
{
    var currentUserId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (id == currentUserId)
        return Results.BadRequest(new { error = "Cannot delete your own account." });

    var user = await userManager.FindByIdAsync(id);
    if (user == null) return Results.NotFound();
    await userManager.DeleteAsync(user);
    return Results.Ok(new { deleted = true });
}).RequireAuthorization("AdminOnly");

// ── Global data reference date ──────────────────────────────
// All queries should treat this as "today" so dashboards are consistent
var DATA_CUTOFF = new DateOnly(2026, 2, 16);

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
    var totalDonations = await db.Donations
        .Where(d => d.DonationDate <= DATA_CUTOFF)
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

app.MapGet("/api/donate/monthly-progress", async (AppDbContext db) =>
{
    var startOfMonth = new DateOnly(DATA_CUTOFF.Year, DATA_CUTOFF.Month, 1);
    var raised = await db.Donations
        .Where(d => d.DonationDate >= startOfMonth && d.DonationDate <= DATA_CUTOFF)
        .SumAsync(d => (decimal?)d.Amount ?? 0);
    var goal = 15000m;
    var donorCount = await db.Donations
        .Where(d => d.DonationDate >= startOfMonth && d.DonationDate <= DATA_CUTOFF)
        .CountAsync();

    return new { raised, goal, donorCount };
});

app.MapGet("/api/impact/donations-by-month", async (AppDbContext db) =>
{
    var data = await db.Donations
        .Where(d => d.DonationDate != null && d.Amount != null && d.DonationDate <= DATA_CUTOFF)
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
        .Where(a => a.ProgramArea != null && (a.AllocationDate == null || a.AllocationDate <= DATA_CUTOFF))
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
        .Where(e => e.RecordDate != null && e.ProgressPercent != null && e.RecordDate <= DATA_CUTOFF)
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
        .Where(h => h.RecordDate != null && h.GeneralHealthScore != null && h.RecordDate <= DATA_CUTOFF)
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

// ── Volunteer sign-up (public) ─────────────────────────────

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

// ── Partner sign-up (public) ──────────────────────────────

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
            RoleType = body.RoleType?.Trim() ?? "Prospective",
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

// ── Admin partners list ───────────────────────────────────

app.MapGet("/api/admin/partners", async (AppDbContext db, string? search, string? status, string? partnerType, int page = 1, int pageSize = 20) =>
{
    if (pageSize > 100) pageSize = 100;
    var q = db.Partners.AsQueryable();

    if (!string.IsNullOrWhiteSpace(search))
    {
        var s = search.Trim().ToLower();
        q = q.Where(p =>
            (p.PartnerName != null && p.PartnerName.ToLower().Contains(s)) ||
            (p.ContactName != null && p.ContactName.ToLower().Contains(s)) ||
            (p.Email != null && p.Email.ToLower().Contains(s)));
    }
    if (!string.IsNullOrWhiteSpace(status))
        q = q.Where(p => p.Status == status);
    if (!string.IsNullOrWhiteSpace(partnerType))
        q = q.Where(p => p.PartnerType == partnerType);

    var totalCount = await q.CountAsync();
    var items = await q
        .OrderByDescending(p => p.StartDate)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(p => new
        {
            p.PartnerId,
            p.PartnerName,
            p.PartnerType,
            p.RoleType,
            p.ContactName,
            p.Email,
            p.Phone,
            p.Region,
            p.Status,
            p.StartDate,
            p.Notes
        })
        .ToListAsync();

    return new { items, totalCount, page, pageSize };
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/partners/{id:int}", async (int id, AppDbContext db) =>
{
    var p = await db.Partners.FindAsync(id);
    if (p == null) return Results.NotFound();
    return Results.Ok(new
    {
        p.PartnerId,
        p.PartnerName,
        p.PartnerType,
        p.RoleType,
        p.ContactName,
        p.Email,
        p.Phone,
        p.Region,
        p.Status,
        p.StartDate,
        p.EndDate,
        p.Notes
    });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/partners", async (AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<PartnerAdminRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });

    if (string.IsNullOrWhiteSpace(body.PartnerName) && string.IsNullOrWhiteSpace(body.ContactName))
        return Results.BadRequest(new { error = "Partner name or contact name is required." });

    await db.Database.ExecuteSqlRawAsync(
        "SELECT setval(pg_get_serial_sequence('partners', 'partner_id'), (SELECT COALESCE(MAX(partner_id), 0) FROM partners))");

    var partner = new backend.Models.Partner
    {
        PartnerName = body.PartnerName?.Trim() ?? body.ContactName?.Trim(),
        PartnerType = body.PartnerType?.Trim() ?? "Organization",
        RoleType = body.RoleType?.Trim(),
        ContactName = body.ContactName?.Trim(),
        Email = body.Email?.Trim(),
        Phone = body.Phone?.Trim(),
        Region = body.Region?.Trim(),
        Status = body.Status?.Trim() ?? "Prospective",
        StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
        Notes = body.Notes?.Trim(),
    };

    db.Partners.Add(partner);
    await db.SaveChangesAsync();
    return Results.Ok(new { partner.PartnerId });
}).RequireAuthorization("AdminOnly");

app.MapPut("/api/admin/partners/{id:int}", async (int id, AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<PartnerAdminRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });

    var partner = await db.Partners.FindAsync(id);
    if (partner == null) return Results.NotFound();

    partner.PartnerName = body.PartnerName?.Trim() ?? partner.PartnerName;
    partner.PartnerType = body.PartnerType?.Trim() ?? partner.PartnerType;
    partner.RoleType = body.RoleType?.Trim();
    partner.ContactName = body.ContactName?.Trim();
    partner.Email = body.Email?.Trim();
    partner.Phone = body.Phone?.Trim();
    partner.Region = body.Region?.Trim();
    partner.Status = body.Status?.Trim() ?? partner.Status;
    partner.Notes = body.Notes?.Trim();

    await db.SaveChangesAsync();
    return Results.Ok(new { partner.PartnerId });
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/admin/partners/{id:int}", async (int id, AppDbContext db) =>
{
    var partner = await db.Partners.FindAsync(id);
    if (partner == null) return Results.NotFound();

    db.Partners.Remove(partner);
    await db.SaveChangesAsync();
    return Results.Ok(new { deleted = true });
}).RequireAuthorization("AdminOnly");

// ── Admin endpoints ────────────────────────────────────────

app.MapGet("/api/admin/metrics", async (AppDbContext db, int? safehouseId) =>
{
    var refDate = DATA_CUTOFF;
    var startOfMonth = new DateOnly(refDate.Year, refDate.Month, 1);
    var startOfLastMonth = startOfMonth.AddMonths(-1);

    var residentsQuery = db.Residents.Where(r => r.CaseStatus == "Active");
    if (safehouseId.HasValue) residentsQuery = residentsQuery.Where(r => r.SafehouseId == safehouseId.Value);
    var activeResidents = await residentsQuery.CountAsync();

    var incidentsQuery = db.IncidentReports.Where(i => i.Resolved != true);
    if (safehouseId.HasValue) incidentsQuery = incidentsQuery.Where(i => i.SafehouseId == safehouseId.Value);
    var incidents = await incidentsQuery
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

    var conferencesQuery = db.InterventionPlans.AsQueryable();
    if (safehouseId.HasValue)
        conferencesQuery = conferencesQuery.Where(p => db.Residents.Any(r => r.ResidentId == p.ResidentId && r.SafehouseId == safehouseId.Value));

    var nextConference = await conferencesQuery
        .Where(p => p.CaseConferenceDate > refDate)
        .OrderBy(p => p.CaseConferenceDate)
        .Select(p => p.CaseConferenceDate)
        .FirstOrDefaultAsync();

    var upcomingConferences = await conferencesQuery
        .CountAsync(p => p.CaseConferenceDate > refDate);

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
        nextConference,
        dataAsOf = refDate.ToString("MMMM d, yyyy")
    };
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/residents", async (HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<ResidentRequest>();
    if (body == null)
        return Results.BadRequest(new { error = "Request body is required." });
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

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
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

    EntityMapper.MapResident(resident, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { resident.ResidentId });
}).RequireAuthorization("AdminOnly");

app.MapDelete("/api/admin/residents/{id:int}", async (int id, AppDbContext db) =>
{
    var resident = await db.Residents.FindAsync(id);
    if (resident == null)
        return Results.NotFound(new { error = "Resident not found." });

    try
    {
        db.Residents.Remove(resident);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Resident deleted." });
    }
    catch (Microsoft.EntityFrameworkCore.DbUpdateException)
    {
        return Results.Conflict(new { error = "Cannot delete this resident because they have associated records (education, visitations, recordings, etc.). Remove those records first." });
    }
}).RequireAuthorization("AdminOnly");

app.MapGet("/api/admin/recent-donations", async (AppDbContext db) =>
{
    var data = await db.Donations
        .Where(d => d.DonationDate <= DATA_CUTOFF)
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/active-residents-trend", async (AppDbContext db, int? safehouseId) =>
{
    var query = db.SafehouseMonthlyMetrics.Where(m => m.MonthStart != null && m.MonthStart <= DATA_CUTOFF);
    if (safehouseId.HasValue) query = query.Where(m => m.SafehouseId == safehouseId.Value);

    var data = await query
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/flagged-cases-trend", async (AppDbContext db, int? safehouseId) =>
{
    var query = db.SafehouseMonthlyMetrics.Where(m => m.MonthStart != null && m.MonthStart <= DATA_CUTOFF);
    if (safehouseId.HasValue) query = query.Where(m => m.SafehouseId == safehouseId.Value);

    var data = await query
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Visitations endpoints ─────────────────────────────────

app.MapGet("/api/admin/visitations", async (
    AppDbContext db,
    int? residentId,
    string? visitType,
    bool? safetyOnly,
    int page = 1,
    int pageSize = 20) =>
{
    if (pageSize > 100) pageSize = 100;

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/visitations", async (AppDbContext db, HomeVisitation body) =>
{
    body.VisitationId = 0;
    db.HomeVisitations.Add(body);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/visitations/{body.VisitationId}", new { body.VisitationId });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPut("/api/admin/visitations/{id}", async (AppDbContext db, int id, HomeVisitation body) =>
{
    var existing = await db.HomeVisitations.FindAsync(id);
    if (existing is null) return Results.NotFound();

    EntityMapper.MapVisitation(existing, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { id });
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
    var now = DATA_CUTOFF;

    var upcoming = await db.InterventionPlans
        .Where(p => p.CaseConferenceDate != null && p.CaseConferenceDate > now)
        .OrderBy(p => p.CaseConferenceDate)
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

// ── Reports & Analytics endpoints ──────────────────────


app.MapGet("/api/admin/reports/donations-by-source", async (AppDbContext db) =>
{
    var data = await db.Donations
        .Where(d => d.ChannelSource != null && d.Amount != null && d.DonationDate <= DATA_CUTOFF)
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/reports/donations-by-campaign", async (AppDbContext db) =>
{
    var data = await db.Donations
        .Where(d => d.CampaignName != null && d.Amount != null && d.DonationDate <= DATA_CUTOFF)
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));


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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/recordings", async (HttpContext httpContext, AppDbContext db) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<RecordingRequest>();
    if (body == null || body.ResidentId <= 0)
        return Results.BadRequest(new { error = "Resident is required." });
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

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
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

    var recording = await db.ProcessRecordings.FindAsync(id);
    if (recording == null)
        return Results.NotFound(new { error = "Recording not found." });

    EntityMapper.MapRecording(recording, body);

    await db.SaveChangesAsync();
    return Results.Ok(new { recording.RecordingId });
}).RequireAuthorization(policy => policy.RequireRole("Admin", "Staff"));

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
    if (pageSize > 100) pageSize = 100;

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/supporters", async (AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<SupporterRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

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
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

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
    if (pageSize > 100) pageSize = 100;

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
            d.Notes,
            channelSource = d.ChannelSource
        })
        .ToListAsync();

    return new { totalCount, page, pageSize, items };
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapPost("/api/admin/donations", async (AppDbContext db, HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<DonationRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

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
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

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

    try
    {
        db.Donations.Remove(donation);
        await db.SaveChangesAsync();
        return Results.Ok(new { deleted = true });
    }
    catch (Microsoft.EntityFrameworkCore.DbUpdateException)
    {
        return Results.Conflict(new { error = "Cannot delete this donation because it has associated allocations or in-kind items. Remove those records first." });
    }
}).RequireAuthorization("AdminOnly");

// ── Allocation reports ──────────────────────────────────────

app.MapGet("/api/admin/allocations/by-program", async (AppDbContext db) =>
{
    var data = await db.DonationAllocations
        .Where(a => a.ProgramArea != null && (a.AllocationDate == null || a.AllocationDate <= DATA_CUTOFF))
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

app.MapGet("/api/admin/allocations/by-safehouse", async (AppDbContext db) =>
{
    var data = await db.DonationAllocations
        .Where(a => a.SafehouseId != null && (a.AllocationDate == null || a.AllocationDate <= DATA_CUTOFF))
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
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

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

// ── Stripe donation endpoints ──────────────────────────────

app.MapPost("/api/donate/create-checkout-session", async (HttpContext httpContext) =>
{
    var body = await httpContext.Request.ReadFromJsonAsync<CreateCheckoutRequest>();
    if (body == null) return Results.BadRequest(new { error = "Request body is required." });
    var (valid, err) = DtoValidator.Validate(body);
    if (!valid) return Results.BadRequest(new { error = err });

    var origin = httpContext.Request.Headers.Origin.FirstOrDefault()
              ?? "https://intex2-1.vercel.app";

    var options = new SessionCreateOptions
    {
        SuccessUrl = $"{origin}/donate/success?session_id={{CHECKOUT_SESSION_ID}}",
        CancelUrl = $"{origin}/donate",
        CustomerEmail = body.DonorEmail,
    };

    if (body.Mode == "one-time")
    {
        options.Mode = "payment";
        options.LineItems = new List<SessionLineItemOptions>
        {
            new()
            {
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency = "usd",
                    UnitAmount = body.AmountCents,
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name = "One-Time Donation to Beacon of Hope"
                    }
                },
                Quantity = 1
            }
        };
    }
    else
    {
        var interval = body.Cadence switch
        {
            "quarterly" => "month",
            "yearly" => "year",
            _ => "month"
        };
        var intervalCount = body.Cadence == "quarterly" ? 3L : 1L;

        options.Mode = "subscription";
        options.LineItems = new List<SessionLineItemOptions>
        {
            new()
            {
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency = "usd",
                    UnitAmount = body.AmountCents,
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name = "Recurring Donation to Beacon of Hope"
                    },
                    Recurring = new SessionLineItemPriceDataRecurringOptions
                    {
                        Interval = interval,
                        IntervalCount = intervalCount
                    }
                },
                Quantity = 1
            }
        };
    }

    var service = new SessionService();
    var session = await service.CreateAsync(options);

    return Results.Ok(new { url = session.Url });
});

app.MapGet("/api/donate/success", async (string session_id, AppDbContext db) =>
{
    var service = new SessionService();
    var session = await service.GetAsync(session_id);

    if (session.PaymentStatus != "paid" && session.Status != "complete")
        return Results.BadRequest(new { error = "Payment not completed." });

    // Idempotency: don't double-record
    var existing = await db.Donations.AnyAsync(d => d.Notes != null && d.Notes.Contains(session_id));
    if (!existing)
    {
        var donation = new backend.Models.Donation
        {
            DonationType = "Monetary",
            DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ChannelSource = "Stripe",
            CurrencyCode = "USD",
            Amount = (session.AmountTotal ?? 0) / 100m,
            IsRecurring = session.Mode == "subscription",
            Notes = $"Stripe Session: {session_id}"
        };
        db.Donations.Add(donation);
        await db.SaveChangesAsync();
    }

    return Results.Ok(new
    {
        amount = (session.AmountTotal ?? 0) / 100m,
        currency = session.Currency?.ToUpper(),
        isRecurring = session.Mode == "subscription",
        email = session.CustomerEmail
    });
});

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

public static class DtoValidator
{
    public static (bool IsValid, string? Error) Validate<T>(T obj)
    {
        var results = new List<ValidationResult>();
        var context = new ValidationContext(obj!);
        if (Validator.TryValidateObject(obj!, context, results, validateAllProperties: true))
            return (true, null);
        return (false, string.Join("; ", results.Select(r => r.ErrorMessage)));
    }
}

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(12)]
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class RecordingRequest
{
    [Required, Range(1, int.MaxValue, ErrorMessage = "ResidentId is required.")]
    public int ResidentId { get; set; }
    public DateOnly? SessionDate { get; set; }
    [StringLength(200)]
    public string? SocialWorker { get; set; }
    [StringLength(100)]
    public string? SessionType { get; set; }
    [Range(0, 1440, ErrorMessage = "Duration must be between 0 and 1440 minutes.")]
    public int? SessionDurationMinutes { get; set; }
    [StringLength(100)]
    public string? EmotionalStateObserved { get; set; }
    [StringLength(100)]
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
    [StringLength(50)]
    public string? CaseControlNo { get; set; }
    [StringLength(50)]
    public string? InternalCode { get; set; }
    public int? SafehouseId { get; set; }
    [StringLength(50)]
    public string? CaseStatus { get; set; }
    [StringLength(20)]
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
    [StringLength(50)]
    public string? SupporterType { get; set; }
    [StringLength(200)]
    public string? DisplayName { get; set; }
    [StringLength(200)]
    public string? OrganizationName { get; set; }
    [StringLength(100)]
    public string? FirstName { get; set; }
    [StringLength(100)]
    public string? LastName { get; set; }
    [StringLength(50)]
    public string? RelationshipType { get; set; }
    [EmailAddress]
    public string? Email { get; set; }
    [Phone]
    public string? Phone { get; set; }
    [StringLength(100)]
    public string? Region { get; set; }
    [StringLength(100)]
    public string? Country { get; set; }
    [StringLength(50)]
    public string? Status { get; set; }
    [StringLength(100)]
    public string? AcquisitionChannel { get; set; }
}

public class DonationRequest
{
    public int? SupporterId { get; set; }
    [StringLength(50)]
    public string? DonationType { get; set; }
    public DateOnly? DonationDate { get; set; }
    [StringLength(100)]
    public string? ChannelSource { get; set; }
    [StringLength(10)]
    public string? CurrencyCode { get; set; }
    [Range(0, 100_000_000, ErrorMessage = "Amount must be non-negative.")]
    public decimal? Amount { get; set; }
    [Range(0, 100_000_000, ErrorMessage = "Estimated value must be non-negative.")]
    public decimal? EstimatedValue { get; set; }
    [StringLength(100)]
    public string? ImpactUnit { get; set; }
    public bool? IsRecurring { get; set; }
    [StringLength(200)]
    public string? CampaignName { get; set; }
    public string? Notes { get; set; }
}

public class RegisterRequest
{
    [Required, StringLength(100)]
    public string FirstName { get; set; } = string.Empty;
    [Required, StringLength(100)]
    public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(12)]
    public string Password { get; set; } = string.Empty;
}

public class CreateCheckoutRequest
{
    [Required, RegularExpression("one-time|recurring", ErrorMessage = "Mode must be 'one-time' or 'recurring'.")]
    public string Mode { get; set; } = "one-time";
    [RegularExpression("monthly|quarterly|yearly", ErrorMessage = "Cadence must be 'monthly', 'quarterly', or 'yearly'.")]
    public string? Cadence { get; set; }
    [Required, Range(100, 100_000_000, ErrorMessage = "Amount must be at least 100 cents ($1).")]
    public long? AmountCents { get; set; }
    [EmailAddress]
    public string? DonorEmail { get; set; }
}

public class CreateUserRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = "";
    [Required]
    public string Password { get; set; } = "";
    [Required]
    public string Role { get; set; } = "Staff";
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public List<int>? SafehouseIds { get; set; }
}

public class UpdateSafehousesRequest { public List<int>? SafehouseIds { get; set; } }

public class CreateStaffTaskRequest { public int? ResidentId { get; set; } public int SafehouseId { get; set; } public string? TaskType { get; set; } public string? Title { get; set; } public string? Description { get; set; } public string? ContextJson { get; set; } }

public class UpdateStaffTaskRequest { public string? Status { get; set; } public DateTime? SnoozeUntil { get; set; } }

public class CreateCalendarEventRequest { public int SafehouseId { get; set; } public int? ResidentId { get; set; } public string? EventType { get; set; } public string? Title { get; set; } public string? Description { get; set; } public string EventDate { get; set; } = ""; public string? StartTime { get; set; } public string? EndTime { get; set; } public string? RecurrenceRule { get; set; } public int? SourceTaskId { get; set; } }

public class UpdateCalendarEventRequest { public string? Status { get; set; } public string? StartTime { get; set; } public string? EndTime { get; set; } public string? EventDate { get; set; } public string? Title { get; set; } public string? Description { get; set; } }

public class IncidentRequest { public int? ResidentId { get; set; } public int? SafehouseId { get; set; } public DateOnly? IncidentDate { get; set; } public string? IncidentType { get; set; } public string? Severity { get; set; } public string? Description { get; set; } public string? ResponseTaken { get; set; } public string? ReportedBy { get; set; } public bool? Resolved { get; set; } public DateOnly? ResolutionDate { get; set; } public bool? FollowUpRequired { get; set; } }

public class EducationRecordRequest { public int ResidentId { get; set; } public DateOnly? RecordDate { get; set; } public string? EducationLevel { get; set; } public decimal? AttendanceRate { get; set; } public decimal? ProgressPercent { get; set; } public string? CompletionStatus { get; set; } public string? Notes { get; set; } public string? SchoolName { get; set; } public string? EnrollmentStatus { get; set; } }

public class HealthRecordRequest { public int ResidentId { get; set; } public DateOnly? RecordDate { get; set; } public decimal? WeightKg { get; set; } public decimal? HeightCm { get; set; } public decimal? Bmi { get; set; } public decimal? NutritionScore { get; set; } public decimal? SleepQualityScore { get; set; } public decimal? EnergyLevelScore { get; set; } public decimal? GeneralHealthScore { get; set; } public bool? MedicalCheckupDone { get; set; } public bool? DentalCheckupDone { get; set; } public bool? PsychologicalCheckupDone { get; set; } public string? Notes { get; set; } }

public class InterventionPlanRequest { public int ResidentId { get; set; } public string? PlanCategory { get; set; } public string? PlanDescription { get; set; } public string? ServicesProvided { get; set; } public decimal? TargetValue { get; set; } public DateOnly? TargetDate { get; set; } public string? Status { get; set; } public DateOnly? CaseConferenceDate { get; set; } }

public class VolunteerSignupRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Region { get; set; }
}

public class PartnerSignupRequest
{
    public string? PartnerType { get; set; }
    public string? PartnerName { get; set; }
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? RoleType { get; set; }
    public string? Notes { get; set; }
}

public class PartnerAdminRequest
{
    public string? PartnerName { get; set; }
    public string? PartnerType { get; set; }
    public string? RoleType { get; set; }
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Region { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
}

public partial class Program { }

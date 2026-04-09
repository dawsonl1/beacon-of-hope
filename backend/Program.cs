using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using Azure.Storage.Blobs;
using backend.Data;
using backend.DTOs;
using backend.Endpoints;
using backend.Mapping;
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
    opts.Password.RequireUppercase = true;
    opts.Password.RequireLowercase = true;
    opts.Password.RequireDigit = true;
    opts.Password.RequireNonAlphanumeric = true;

    opts.Lockout.MaxFailedAccessAttempts = 5;
    opts.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    opts.Lockout.AllowedForNewUsers = true;

    opts.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "dp-keys")))
    .SetApplicationName("BeaconOfHope");

builder.Services.ConfigureApplicationCookie(opts =>
{
    opts.Cookie.HttpOnly = true;
    if (builder.Environment.IsDevelopment())
    {
        opts.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        opts.Cookie.SameSite = SameSiteMode.Lax;
    }
    else
    {
        opts.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        opts.Cookie.SameSite = SameSiteMode.None;
    }
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
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:5176",
                "https://intex2-1.vercel.app",
                "https://intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"];

// Register social media services and background jobs
builder.Services.AddSingleton<backend.Services.IEmailNotificationService, backend.Services.EmailNotificationService>();
builder.Services.AddHostedService<backend.Services.ContentGenerationJob>();
builder.Services.AddHostedService<backend.Services.PostReadinessJob>();
builder.Services.AddHostedService<backend.Services.MilestoneEvaluationJob>();
builder.Services.AddHostedService<backend.Services.DataRetentionJob>();

var app = builder.Build();

// ── Apply pending migrations & seed Identity ───────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.ProviderName?.Contains("Sqlite") == true)
        await db.Database.EnsureCreatedAsync();
    else
        await db.Database.MigrateAsync();
    try { await IdentitySeeder.SeedAsync(scope.ServiceProvider); }
    catch (Exception ex) { Console.WriteLine($"Seeder skipped (data already exists): {ex.Message}"); }

    // Always reset sequences so inserts don't collide with seeded data
    try { await DataSeeder.ResetSequencesAsync(db); }
    catch (Exception ex) { Console.WriteLine($"Sequence reset skipped: {ex.Message}"); }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseHsts();
app.UseCors("AllowFrontend");
app.UseStaticFiles();

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
    // HSTS is handled by app.UseHsts() — no duplicate header needed
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

// ── Map all endpoint groups ─────────────────────────────────
app.MapAuthEndpoints();
app.MapStaffEndpoints();
app.MapIncidentEndpoints();
app.MapResidentEndpoints();
app.MapPublicEndpoints();
app.MapAdminEndpoints();
app.MapVisitationEndpoints();
app.MapReportEndpoints();
app.MapRecordingEndpoints();
app.MapCaseConferenceEndpoints();
app.MapSupporterEndpoints();
app.MapDonationEndpoints();
app.MapDonorPortalEndpoints();
app.MapSeedEndpoints();

// ── Social Media Automation Endpoints ──────────────────────

// Settings (Admin only)
app.MapGet("/api/admin/social/settings", async (AppDbContext db) =>
{
    var settings = await db.SocialMediaSettings.FirstOrDefaultAsync();
    if (settings == null)
    {
        settings = new backend.Models.SocialMedia.SocialMediaSettings();
        db.SocialMediaSettings.Add(settings);
        await db.SaveChangesAsync();
    }
    return Results.Ok(settings);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/settings", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var settings = await db.SocialMediaSettings.FirstOrDefaultAsync();
    if (settings == null) { settings = new backend.Models.SocialMedia.SocialMediaSettings(); db.SocialMediaSettings.Add(settings); }
    if (body.TryGetProperty("postsPerWeek", out var pw)) settings.PostsPerWeek = pw.GetInt32();
    if (body.TryGetProperty("platformsActive", out var pa)) settings.PlatformsActive = pa.GetString();
    if (body.TryGetProperty("timezone", out var tz)) settings.Timezone = tz.GetString();
    if (body.TryGetProperty("recyclingEnabled", out var re)) settings.RecyclingEnabled = re.GetBoolean();
    if (body.TryGetProperty("dailyGenerationTime", out var dgt)) settings.DailyGenerationTime = dgt.GetString();
    if (body.TryGetProperty("notificationMethod", out var nm)) settings.NotificationMethod = nm.GetString();
    if (body.TryGetProperty("notificationEmail", out var ne)) settings.NotificationEmail = ne.GetString();
    settings.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(settings);
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Voice Guide (Admin only)
app.MapGet("/api/admin/social/voice-guide", async (AppDbContext db) =>
{
    var guide = await db.VoiceGuides.FirstOrDefaultAsync();
    if (guide == null) return Results.Ok(new { });
    return Results.Ok(guide);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/voice-guide", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var guide = await db.VoiceGuides.FirstOrDefaultAsync();
    if (guide == null) { guide = new backend.Models.SocialMedia.VoiceGuide(); db.VoiceGuides.Add(guide); }
    if (body.TryGetProperty("orgDescription", out var od)) guide.OrgDescription = od.GetString();
    if (body.TryGetProperty("toneDescription", out var td)) guide.ToneDescription = td.GetString();
    if (body.TryGetProperty("preferredTerms", out var pt)) guide.PreferredTerms = pt.GetString();
    if (body.TryGetProperty("avoidedTerms", out var at2)) guide.AvoidedTerms = at2.GetString();
    if (body.TryGetProperty("structuralRules", out var sr)) guide.StructuralRules = sr.GetString();
    if (body.TryGetProperty("visualRules", out var vr)) guide.VisualRules = vr.GetString();
    guide.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(guide);
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Content Facts (Admin + Social Media Manager)
app.MapGet("/api/admin/social/facts", async (AppDbContext db) =>
{
    var facts = await db.ContentFacts.Where(f => f.IsActive).OrderByDescending(f => f.AddedAt).ToListAsync();
    return Results.Ok(facts);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapGet("/api/admin/social/facts/{id}", async (int id, AppDbContext db) =>
{
    var fact = await db.ContentFacts.FindAsync(id);
    return fact == null ? Results.NotFound() : Results.Ok(fact);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/social/facts", async (HttpContext ctx, AppDbContext db, UserManager<ApplicationUser> userManager) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var user = await userManager.GetUserAsync(ctx.User);
    var fact = new backend.Models.SocialMedia.ContentFact
    {
        FactText = body.TryGetProperty("factText", out var ft) ? ft.GetString() : null,
        SourceName = body.TryGetProperty("sourceName", out var sn) ? sn.GetString() : null,
        SourceUrl = body.TryGetProperty("sourceUrl", out var su) ? su.GetString() : null,
        Category = body.TryGetProperty("category", out var c) ? c.GetString() : null,
        Pillar = body.TryGetProperty("pillar", out var p) ? p.GetString() : null,
        AddedBy = user?.Email,
        AddedAt = DateTime.UtcNow
    };
    db.ContentFacts.Add(fact);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/facts/{fact.ContentFactId}", fact);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/facts/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var fact = await db.ContentFacts.FindAsync(id);
    if (fact == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("factText", out var ft)) fact.FactText = ft.GetString();
    if (body.TryGetProperty("sourceName", out var sn)) fact.SourceName = sn.GetString();
    if (body.TryGetProperty("sourceUrl", out var su)) fact.SourceUrl = su.GetString();
    if (body.TryGetProperty("category", out var c)) fact.Category = c.GetString();
    if (body.TryGetProperty("pillar", out var p)) fact.Pillar = p.GetString();
    await db.SaveChangesAsync();
    return Results.Ok(fact);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/facts/{id}", async (int id, AppDbContext db) =>
{
    var fact = await db.ContentFacts.FindAsync(id);
    if (fact == null) return Results.NotFound();
    db.ContentFacts.Remove(fact);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Talking Points (Admin only)
app.MapGet("/api/admin/social/talking-points", async (AppDbContext db) =>
{
    var points = await db.ContentTalkingPoints.Where(t => t.IsActive).OrderByDescending(t => t.CreatedAt).ToListAsync();
    return Results.Ok(points);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/social/talking-points", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var point = new backend.Models.SocialMedia.ContentTalkingPoint
    {
        Text = body.TryGetProperty("text", out var t) ? t.GetString() : null,
        Topic = body.TryGetProperty("topic", out var tp) ? tp.GetString() : null,
        CreatedAt = DateTime.UtcNow
    };
    db.ContentTalkingPoints.Add(point);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/talking-points/{point.ContentTalkingPointId}", point);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/talking-points/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var point = await db.ContentTalkingPoints.FindAsync(id);
    if (point == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("text", out var t)) point.Text = t.GetString();
    if (body.TryGetProperty("topic", out var tp)) point.Topic = tp.GetString();
    point.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(point);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/talking-points/{id}", async (int id, AppDbContext db) =>
{
    var point = await db.ContentTalkingPoints.FindAsync(id);
    if (point == null) return Results.NotFound();
    db.ContentTalkingPoints.Remove(point);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Hashtag Sets (Admin only)
app.MapGet("/api/admin/social/hashtag-sets", async (string? pillar, string? platform, AppDbContext db) =>
{
    var query = db.HashtagSets.AsQueryable();
    if (!string.IsNullOrEmpty(pillar)) query = query.Where(h => h.Pillar == pillar);
    if (!string.IsNullOrEmpty(platform)) query = query.Where(h => h.Platform == platform);
    var sets = await query.OrderBy(h => h.Name).ToListAsync();
    return Results.Ok(sets);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/social/hashtag-sets", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var set = new backend.Models.SocialMedia.HashtagSet
    {
        Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
        Category = body.TryGetProperty("category", out var c) ? c.GetString() : null,
        Pillar = body.TryGetProperty("pillar", out var p) ? p.GetString() : null,
        Platform = body.TryGetProperty("platform", out var pl) ? pl.GetString() : null,
        Hashtags = body.TryGetProperty("hashtags", out var h) ? h.GetString() : null,
        CreatedAt = DateTime.UtcNow
    };
    db.HashtagSets.Add(set);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/hashtag-sets/{set.HashtagSetId}", set);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/hashtag-sets/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var set = await db.HashtagSets.FindAsync(id);
    if (set == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("name", out var n)) set.Name = n.GetString();
    if (body.TryGetProperty("category", out var c)) set.Category = c.GetString();
    if (body.TryGetProperty("pillar", out var p)) set.Pillar = p.GetString();
    if (body.TryGetProperty("platform", out var pl)) set.Platform = pl.GetString();
    if (body.TryGetProperty("hashtags", out var h)) set.Hashtags = h.GetString();
    set.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(set);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/hashtag-sets/{id}", async (int id, AppDbContext db) =>
{
    var set = await db.HashtagSets.FindAsync(id);
    if (set == null) return Results.NotFound();
    db.HashtagSets.Remove(set);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Automated Posts (Admin only for now — Social Media Manager role added later)
app.MapGet("/api/admin/social/posts", async (string? status, string? pillar, string? platform, int page = 1, int pageSize = 50, AppDbContext db = null!) =>
{
    var query = db.AutomatedPosts.Include(p => p.Media).AsQueryable();
    if (!string.IsNullOrEmpty(status)) query = query.Where(p => p.Status == status);
    if (!string.IsNullOrEmpty(pillar)) query = query.Where(p => p.ContentPillar == pillar);
    if (!string.IsNullOrEmpty(platform)) query = query.Where(p => p.Platform == platform);
    var total = await query.CountAsync();
    var posts = await query.OrderByDescending(p => p.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize)
        .Select(p => new {
            p.AutomatedPostId, p.Content, p.OriginalContent, p.ContentPillar, p.Source, p.Status,
            p.Platform, p.MediaId, p.ScheduledAt, p.ApprovedBy, p.ApprovedAt, p.RejectionReason,
            p.EngagementLikes, p.EngagementShares, p.EngagementComments, p.EngagementDonations,
            p.CreatedAt, p.UpdatedAt, p.SnoozedUntil, p.MilestoneRuleId, p.FactId, p.TalkingPointId,
            MediaPath = p.Media != null ? p.Media.FilePath : null,
            MediaThumbPath = p.Media != null ? p.Media.ThumbnailPath : null,
        }).ToListAsync();
    return Results.Ok(posts);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapGet("/api/admin/social/posts/{id}", async (int id, AppDbContext db) =>
{
    var post = await db.AutomatedPosts.Include(p => p.Media).Where(p => p.AutomatedPostId == id)
        .Select(p => new {
            p.AutomatedPostId, p.Content, p.OriginalContent, p.ContentPillar, p.Source, p.Status,
            p.Platform, p.MediaId, p.ScheduledAt, p.ApprovedBy, p.ApprovedAt, p.RejectionReason,
            p.EngagementLikes, p.EngagementShares, p.EngagementComments, p.EngagementDonations,
            p.CreatedAt, p.UpdatedAt, p.SnoozedUntil, p.MilestoneRuleId, p.FactId, p.TalkingPointId,
            MediaPath = p.Media != null ? p.Media.FilePath : null,
            MediaThumbPath = p.Media != null ? p.Media.ThumbnailPath : null,
        }).FirstOrDefaultAsync();
    return post == null ? Results.NotFound() : Results.Ok(post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPost("/api/admin/social/posts", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var post = new backend.Models.SocialMedia.AutomatedPost
    {
        Content = body.TryGetProperty("content", out var c) ? c.GetString() : null,
        ContentPillar = body.TryGetProperty("contentPillar", out var cp) ? cp.GetString() : null,
        Source = body.TryGetProperty("source", out var s) ? s.GetString() : null,
        Status = body.TryGetProperty("status", out var st) ? st.GetString() : "draft",
        Platform = body.TryGetProperty("platform", out var pl) ? pl.GetString() : null,
        CreatedAt = DateTime.UtcNow
    };
    db.AutomatedPosts.Add(post);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/posts/{post.AutomatedPostId}", post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPut("/api/admin/social/posts/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var post = await db.AutomatedPosts.FindAsync(id);
    if (post == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("content", out var c)) post.Content = c.GetString();
    if (body.TryGetProperty("mediaId", out var mid) && mid.ValueKind == JsonValueKind.Number) post.MediaId = mid.GetInt32();
    post.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPatch("/api/admin/social/posts/{id}/approve", async (int id, HttpContext ctx, AppDbContext db, UserManager<ApplicationUser> userManager) =>
{
    var post = await db.AutomatedPosts.FindAsync(id);
    if (post == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    // Optimistic concurrency: if client sends updatedAt, verify it matches
    if (body.ValueKind != JsonValueKind.Undefined && body.TryGetProperty("updatedAt", out var ua))
    {
        var expected = DateTime.Parse(ua.GetString()!, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);
        if (post.UpdatedAt != null && Math.Abs((post.UpdatedAt.Value - expected).TotalSeconds) > 1)
            return Results.Conflict(new { error = "Post was modified by another user. Please refresh." });
    }
    var user = await userManager.GetUserAsync(ctx.User);
    if (body.ValueKind != JsonValueKind.Undefined && body.TryGetProperty("content", out var edited))
    {
        post.OriginalContent = post.Content;
        post.Content = edited.GetString();
    }
    post.Status = "scheduled";
    post.ApprovedBy = user?.Email;
    post.ApprovedAt = DateTime.UtcNow;
    post.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPatch("/api/admin/social/posts/{id}/reject", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var post = await db.AutomatedPosts.FindAsync(id);
    if (post == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind != JsonValueKind.Undefined && body.TryGetProperty("updatedAt", out var ua))
    {
        var expected = DateTime.Parse(ua.GetString()!, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);
        if (post.UpdatedAt != null && Math.Abs((post.UpdatedAt.Value - expected).TotalSeconds) > 1)
            return Results.Conflict(new { error = "Post was modified by another user. Please refresh." });
    }
    post.Status = "rejected";
    if (body.ValueKind != JsonValueKind.Undefined && body.TryGetProperty("rejectionReason", out var reason))
        post.RejectionReason = reason.GetString();
    post.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPatch("/api/admin/social/posts/{id}/snooze", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var post = await db.AutomatedPosts.FindAsync(id);
    if (post == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("updatedAt", out var ua))
    {
        var expected = DateTime.Parse(ua.GetString()!, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);
        if (post.UpdatedAt != null && Math.Abs((post.UpdatedAt.Value - expected).TotalSeconds) > 1)
            return Results.Conflict(new { error = "Post was modified by another user. Please refresh." });
    }
    post.Status = "snoozed";
    if (body.TryGetProperty("snoozedUntil", out var su)) post.SnoozedUntil = DateTime.Parse(su.GetString()!, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);
    post.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPatch("/api/admin/social/posts/{id}/publish", async (int id, AppDbContext db) =>
{
    var post = await db.AutomatedPosts.FindAsync(id);
    if (post == null) return Results.NotFound();
    post.Status = "published";
    post.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPatch("/api/admin/social/posts/{id}/engagement", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var post = await db.AutomatedPosts.FindAsync(id);
    if (post == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("engagementLikes", out var el)) post.EngagementLikes = el.GetInt32();
    if (body.TryGetProperty("engagementShares", out var es)) post.EngagementShares = es.GetInt32();
    if (body.TryGetProperty("engagementComments", out var ec)) post.EngagementComments = ec.GetInt32();
    if (body.TryGetProperty("engagementDonations", out var ed)) post.EngagementDonations = ed.GetDecimal();
    post.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(post);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

// Awareness Dates (Admin only)
app.MapGet("/api/admin/social/awareness-dates", async (AppDbContext db) =>
{
    var dates = await db.AwarenessDates.Where(d => d.IsActive).OrderBy(d => d.DateStart).ToListAsync();
    return Results.Ok(dates);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/social/awareness-dates", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var date = new backend.Models.SocialMedia.AwarenessDate
    {
        Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
        DateStart = body.TryGetProperty("dateStart", out var ds) ? DateOnly.Parse(ds.GetString()!) : null,
        DateEnd = body.TryGetProperty("dateEnd", out var de) ? DateOnly.Parse(de.GetString()!) : null,
        Recurrence = body.TryGetProperty("recurrence", out var r) ? r.GetString() : null,
        PillarEmphasis = body.TryGetProperty("pillarEmphasis", out var pe) ? pe.GetString() : null,
        Description = body.TryGetProperty("description", out var d) ? d.GetString() : null,
        CreatedAt = DateTime.UtcNow
    };
    db.AwarenessDates.Add(date);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/awareness-dates/{date.AwarenessDateId}", date);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/awareness-dates/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var date = await db.AwarenessDates.FindAsync(id);
    if (date == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("name", out var n)) date.Name = n.GetString();
    if (body.TryGetProperty("dateStart", out var ds)) date.DateStart = DateOnly.Parse(ds.GetString()!);
    if (body.TryGetProperty("dateEnd", out var de)) date.DateEnd = DateOnly.Parse(de.GetString()!);
    if (body.TryGetProperty("recurrence", out var r)) date.Recurrence = r.GetString();
    if (body.TryGetProperty("pillarEmphasis", out var pe)) date.PillarEmphasis = pe.GetString();
    if (body.TryGetProperty("description", out var d)) date.Description = d.GetString();
    await db.SaveChangesAsync();
    return Results.Ok(date);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/awareness-dates/{id}", async (int id, AppDbContext db) =>
{
    var date = await db.AwarenessDates.FindAsync(id);
    if (date == null) return Results.NotFound();
    db.AwarenessDates.Remove(date);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// CTA Config (Admin only)
app.MapGet("/api/admin/social/cta", async (AppDbContext db) =>
{
    var ctas = await db.CtaConfigs.Where(c => c.IsActive).OrderBy(c => c.Priority).ToListAsync();
    return Results.Ok(ctas);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/social/cta", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var cta = new backend.Models.SocialMedia.CtaConfig
    {
        Title = body.TryGetProperty("title", out var t) ? t.GetString() : null,
        Description = body.TryGetProperty("description", out var d) ? d.GetString() : null,
        GoalAmount = body.TryGetProperty("goalAmount", out var ga) ? ga.GetDecimal() : null,
        CurrentAmount = body.TryGetProperty("currentAmount", out var ca) ? ca.GetDecimal() : null,
        Url = body.TryGetProperty("url", out var u) ? u.GetString() : null,
        Priority = body.TryGetProperty("priority", out var p) ? p.GetInt32() : 0,
        CreatedAt = DateTime.UtcNow
    };
    db.CtaConfigs.Add(cta);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/cta/{cta.CtaConfigId}", cta);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/cta/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var cta = await db.CtaConfigs.FindAsync(id);
    if (cta == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("title", out var t)) cta.Title = t.GetString();
    if (body.TryGetProperty("description", out var d)) cta.Description = d.GetString();
    if (body.TryGetProperty("goalAmount", out var ga)) cta.GoalAmount = ga.GetDecimal();
    if (body.TryGetProperty("currentAmount", out var ca)) cta.CurrentAmount = ca.GetDecimal();
    if (body.TryGetProperty("url", out var u)) cta.Url = u.GetString();
    if (body.TryGetProperty("priority", out var p)) cta.Priority = p.GetInt32();
    if (body.TryGetProperty("isActive", out var ia)) cta.IsActive = ia.GetBoolean();
    cta.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(cta);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/cta/{id}", async (int id, AppDbContext db) =>
{
    var cta = await db.CtaConfigs.FindAsync(id);
    if (cta == null) return Results.NotFound();
    db.CtaConfigs.Remove(cta);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Graphic Templates (Admin only)
app.MapGet("/api/admin/social/graphic-templates", async (AppDbContext db) =>
{
    var templates = await db.GraphicTemplates.OrderBy(t => t.Name).ToListAsync();
    return Results.Ok(templates);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/social/graphic-templates", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var template = new backend.Models.SocialMedia.GraphicTemplate
    {
        Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
        FilePath = body.TryGetProperty("filePath", out var fp) ? fp.GetString() : null,
        TextColor = body.TryGetProperty("textColor", out var tc) ? tc.GetString() : null,
        TextPosition = body.TryGetProperty("textPosition", out var tp) ? tp.GetString() : null,
        SuitableFor = body.TryGetProperty("suitableFor", out var sf) ? sf.GetString() : null,
        CreatedAt = DateTime.UtcNow
    };
    db.GraphicTemplates.Add(template);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/graphic-templates/{template.GraphicTemplateId}", template);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/graphic-templates/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var template = await db.GraphicTemplates.FindAsync(id);
    if (template == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("name", out var n)) template.Name = n.GetString();
    if (body.TryGetProperty("filePath", out var fp)) template.FilePath = fp.GetString();
    if (body.TryGetProperty("textColor", out var tc)) template.TextColor = tc.GetString();
    if (body.TryGetProperty("textPosition", out var tp)) template.TextPosition = tp.GetString();
    if (body.TryGetProperty("suitableFor", out var sf)) template.SuitableFor = sf.GetString();
    await db.SaveChangesAsync();
    return Results.Ok(template);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/graphic-templates/{id}", async (int id, AppDbContext db) =>
{
    var template = await db.GraphicTemplates.FindAsync(id);
    if (template == null) return Results.NotFound();
    db.GraphicTemplates.Remove(template);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Milestone Rules (Admin only)
app.MapGet("/api/admin/social/milestone-rules", async (AppDbContext db) =>
{
    var rules = await db.MilestoneRules.OrderBy(r => r.Name).ToListAsync();
    return Results.Ok(rules);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/social/milestone-rules", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var rule = new backend.Models.SocialMedia.MilestoneRule
    {
        Name = body.TryGetProperty("name", out var n) ? n.GetString() : null,
        MetricName = body.TryGetProperty("metricName", out var mn) ? mn.GetString() : null,
        ThresholdType = body.TryGetProperty("thresholdType", out var tt) ? tt.GetString() : null,
        ThresholdValue = body.TryGetProperty("thresholdValue", out var tv) ? tv.GetDecimal() : null,
        CooldownDays = body.TryGetProperty("cooldownDays", out var cd) ? cd.GetInt32() : 7,
        PostTemplate = body.TryGetProperty("postTemplate", out var pt) ? pt.GetString() : null,
        CreatedAt = DateTime.UtcNow
    };
    db.MilestoneRules.Add(rule);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/milestone-rules/{rule.MilestoneRuleId}", rule);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPut("/api/admin/social/milestone-rules/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
{
    var rule = await db.MilestoneRules.FindAsync(id);
    if (rule == null) return Results.NotFound();
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    if (body.TryGetProperty("name", out var n)) rule.Name = n.GetString();
    if (body.TryGetProperty("metricName", out var mn)) rule.MetricName = mn.GetString();
    if (body.TryGetProperty("thresholdType", out var tt)) rule.ThresholdType = tt.GetString();
    if (body.TryGetProperty("thresholdValue", out var tv)) rule.ThresholdValue = tv.GetDecimal();
    if (body.TryGetProperty("cooldownDays", out var cd)) rule.CooldownDays = cd.GetInt32();
    if (body.TryGetProperty("postTemplate", out var pt)) rule.PostTemplate = pt.GetString();
    if (body.TryGetProperty("isActive", out var ia)) rule.IsActive = ia.GetBoolean();
    rule.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(rule);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/milestone-rules/{id}", async (int id, AppDbContext db) =>
{
    var rule = await db.MilestoneRules.FindAsync(id);
    if (rule == null) return Results.NotFound();
    db.MilestoneRules.Remove(rule);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Media Library (Admin can browse/delete, Staff can upload)
app.MapGet("/api/admin/social/media", async (string? activityType, int page = 1, int pageSize = 50, AppDbContext db = null!) =>
{
    var query = db.MediaLibraryItems.Where(m => m.ConsentConfirmed);
    if (!string.IsNullOrEmpty(activityType)) query = query.Where(m => m.ActivityType == activityType);
    var items = await query.OrderByDescending(m => m.UploadedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPost("/api/admin/social/media", async (HttpContext ctx, AppDbContext db, UserManager<ApplicationUser> userManager) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    bool consent = body.TryGetProperty("consentConfirmed", out var cc) && cc.GetBoolean();
    if (!consent) return Results.BadRequest(new { error = "Consent confirmation is required." });
    var user = await userManager.GetUserAsync(ctx.User);
    var item = new backend.Models.SocialMedia.MediaLibraryItem
    {
        FilePath = body.TryGetProperty("filePath", out var fp) ? fp.GetString() : null,
        ThumbnailPath = body.TryGetProperty("thumbnailPath", out var tp) ? tp.GetString() : null,
        Caption = body.TryGetProperty("caption", out var cap) ? cap.GetString() : null,
        ActivityType = body.TryGetProperty("activityType", out var at2) ? at2.GetString() : null,
        ConsentConfirmed = true,
        UploadedBy = user?.Email,
        UploadedAt = DateTime.UtcNow
    };
    db.MediaLibraryItems.Add(item);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/media/{item.MediaLibraryItemId}", item);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/social/media/{id}", async (int id, AppDbContext db) =>
{
    var item = await db.MediaLibraryItems.FindAsync(id);
    if (item == null) return Results.NotFound();
    db.MediaLibraryItems.Remove(item);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

// Staff photo upload — accepts multipart form OR JSON (for backwards compat with tests)
app.MapPost("/api/social/media/upload", async (HttpContext ctx, AppDbContext db, UserManager<ApplicationUser> userManager, IWebHostEnvironment env) =>
{
    var user = await userManager.GetUserAsync(ctx.User);
    string? caption = null;
    string? activityType = null;
    bool consent = false;
    string? filePath = null;
    string? thumbnailPath = null;

    if (ctx.Request.HasFormContentType)
    {
        // Multipart form upload (real file)
        var form = await ctx.Request.ReadFormAsync();
        consent = form["consentConfirmed"].ToString().Equals("true", StringComparison.OrdinalIgnoreCase);
        if (!consent) return Results.BadRequest(new { error = "Consent confirmation is required." });

        caption = form["caption"].ToString();
        activityType = form["activityType"].ToString();
        var file = form.Files.GetFile("photo");
        if (file == null || file.Length == 0) return Results.BadRequest(new { error = "Photo file is required." });
        if (file.Length > 10 * 1024 * 1024) return Results.BadRequest(new { error = "Photo must be under 10MB." });

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLowerInvariant()))
            return Results.BadRequest(new { error = "Only JPEG, PNG, WebP, and GIF images are allowed." });

        // Save and compress
        var fileName = $"{Guid.NewGuid()}.jpg";
        var thumbName = $"thumb_{fileName}";
        var blobConnStr = builder.Configuration["AzureStorage:ConnectionString"] ?? "";
        var blobContainer = builder.Configuration["AzureStorage:ContainerName"] ?? "media";

        using var image = await SixLabors.ImageSharp.Image.LoadAsync(file.OpenReadStream());

        // Compress to max 1920px wide
        if (image.Width > 1920)
            image.Mutate(x => x.Resize(new SixLabors.ImageSharp.Processing.ResizeOptions
            {
                Size = new SixLabors.ImageSharp.Size(1920, 0),
                Mode = SixLabors.ImageSharp.Processing.ResizeMode.Max
            }));

        if (!string.IsNullOrEmpty(blobConnStr))
        {
            // Production: upload to Azure Blob Storage
            var blobService = new BlobServiceClient(blobConnStr);
            var container = blobService.GetBlobContainerClient(blobContainer);

            // Upload full image
            using var fullStream = new MemoryStream();
            await image.SaveAsJpegAsync(fullStream, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 80 });
            fullStream.Position = 0;
            var fullBlob = container.GetBlobClient($"library/{fileName}");
            await fullBlob.UploadAsync(fullStream, new Azure.Storage.Blobs.Models.BlobHttpHeaders { ContentType = "image/jpeg" });

            // Upload thumbnail
            image.Mutate(x => x.Resize(new SixLabors.ImageSharp.Processing.ResizeOptions
            {
                Size = new SixLabors.ImageSharp.Size(400, 0),
                Mode = SixLabors.ImageSharp.Processing.ResizeMode.Max
            }));
            using var thumbStream = new MemoryStream();
            await image.SaveAsJpegAsync(thumbStream, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 75 });
            thumbStream.Position = 0;
            var thumbBlob = container.GetBlobClient($"library/{thumbName}");
            await thumbBlob.UploadAsync(thumbStream, new Azure.Storage.Blobs.Models.BlobHttpHeaders { ContentType = "image/jpeg" });

            filePath = fullBlob.Uri.ToString();
            thumbnailPath = thumbBlob.Uri.ToString();
        }
        else
        {
            // Dev: save to local disk
            var mediaDir = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "media", "library");
            Directory.CreateDirectory(mediaDir);
            var fullPath = Path.Combine(mediaDir, fileName);
            var thumbPath = Path.Combine(mediaDir, thumbName);

            await image.SaveAsJpegAsync(fullPath, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 80 });

            image.Mutate(x => x.Resize(new SixLabors.ImageSharp.Processing.ResizeOptions
            {
                Size = new SixLabors.ImageSharp.Size(400, 0),
                Mode = SixLabors.ImageSharp.Processing.ResizeMode.Max
            }));
            await image.SaveAsJpegAsync(thumbPath, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 75 });

            filePath = $"/media/library/{fileName}";
            thumbnailPath = $"/media/library/{thumbName}";
        }
    }
    else
    {
        // JSON upload (for tests and backwards compat)
        var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
        if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
        consent = body.TryGetProperty("consentConfirmed", out var cc) && cc.GetBoolean();
        if (!consent) return Results.BadRequest(new { error = "Consent confirmation is required." });
        filePath = body.TryGetProperty("filePath", out var fp) ? fp.GetString() : null;
        thumbnailPath = body.TryGetProperty("thumbnailPath", out var tp) ? tp.GetString() : null;
        caption = body.TryGetProperty("caption", out var capJ) ? capJ.GetString() : null;
        activityType = body.TryGetProperty("activityType", out var atJ) ? atJ.GetString() : null;
    }

    var item = new backend.Models.SocialMedia.MediaLibraryItem
    {
        FilePath = filePath,
        ThumbnailPath = thumbnailPath,
        Caption = caption,
        ActivityType = activityType,
        ConsentConfirmed = true,
        UploadedBy = user?.Email,
        UploadedAt = DateTime.UtcNow
    };
    db.MediaLibraryItems.Add(item);
    await db.SaveChangesAsync();
    return Results.Created($"/api/social/media/upload/{item.MediaLibraryItemId}", item);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff", "SocialMediaManager")).DisableAntiforgery();

// Staff media browse — scoped to their assigned safehouses
app.MapGet("/api/social/media", async (string? activityType, HttpContext ctx, AppDbContext db, UserManager<ApplicationUser> userManager) =>
{
    var user = await userManager.GetUserAsync(ctx.User);
    if (user == null) return Results.Unauthorized();
    var roles = await userManager.GetRolesAsync(user);
    var query = db.MediaLibraryItems.Where(m => m.ConsentConfirmed);
    if (!roles.Contains("Admin") && !roles.Contains("SocialMediaManager"))
    {
        var safehouseIds = await db.UserSafehouses.Where(us => us.UserId == user.Id).Select(us => us.SafehouseId).ToListAsync();
        query = query.Where(m => m.SafehouseId == null || safehouseIds.Contains(m.SafehouseId.Value));
    }
    if (!string.IsNullOrEmpty(activityType)) query = query.Where(m => m.ActivityType == activityType);
    var items = await query.OrderByDescending(m => m.UploadedAt).Take(100).ToListAsync();
    return Results.Ok(items);
}).RequireAuthorization(p => p.RequireRole("Admin", "Staff", "SocialMediaManager"));

// Content Fact Candidates
app.MapGet("/api/admin/social/fact-candidates", async (string? status, AppDbContext db) =>
{
    var query = db.ContentFactCandidates.AsQueryable();
    if (!string.IsNullOrEmpty(status)) query = query.Where(c => c.Status == status);
    var candidates = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
    return Results.Ok(candidates);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapGet("/api/admin/social/fact-candidates/{id}", async (int id, AppDbContext db) =>
{
    var candidate = await db.ContentFactCandidates.FindAsync(id);
    return candidate == null ? Results.NotFound() : Results.Ok(candidate);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPost("/api/admin/social/fact-candidates", async (HttpContext ctx, AppDbContext db) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();
    var candidate = new backend.Models.SocialMedia.ContentFactCandidate
    {
        FactText = body.TryGetProperty("factText", out var ft) ? ft.GetString() : null,
        SourceName = body.TryGetProperty("sourceName", out var sn) ? sn.GetString() : null,
        SourceUrl = body.TryGetProperty("sourceUrl", out var su) ? su.GetString() : null,
        Category = body.TryGetProperty("category", out var c) ? c.GetString() : null,
        SearchQuery = body.TryGetProperty("searchQuery", out var sq) ? sq.GetString() : null,
        Status = "pending",
        CreatedAt = DateTime.UtcNow
    };
    db.ContentFactCandidates.Add(candidate);
    await db.SaveChangesAsync();
    return Results.Created($"/api/admin/social/fact-candidates/{candidate.ContentFactCandidateId}", candidate);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPatch("/api/admin/social/fact-candidates/{id}/approve", async (int id, HttpContext ctx, AppDbContext db, UserManager<ApplicationUser> userManager) =>
{
    var candidate = await db.ContentFactCandidates.FindAsync(id);
    if (candidate == null) return Results.NotFound();
    var user = await userManager.GetUserAsync(ctx.User);
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    string? pillar = body.ValueKind != JsonValueKind.Undefined && body.TryGetProperty("pillar", out var p) ? p.GetString() : "the_problem";
    candidate.Status = "approved";
    candidate.ReviewedBy = user?.Email;
    candidate.ReviewedAt = DateTime.UtcNow;
    // Create a new content fact from the approved candidate
    var fact = new backend.Models.SocialMedia.ContentFact
    {
        FactText = candidate.FactText,
        SourceName = candidate.SourceName,
        SourceUrl = candidate.SourceUrl,
        Category = candidate.Category,
        Pillar = pillar,
        AddedBy = user?.Email,
        AddedAt = DateTime.UtcNow
    };
    db.ContentFacts.Add(fact);
    await db.SaveChangesAsync();
    return Results.Ok(candidate);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

app.MapPatch("/api/admin/social/fact-candidates/{id}/reject", async (int id, HttpContext ctx, AppDbContext db, UserManager<ApplicationUser> userManager) =>
{
    var candidate = await db.ContentFactCandidates.FindAsync(id);
    if (candidate == null) return Results.NotFound();
    var user = await userManager.GetUserAsync(ctx.User);
    candidate.Status = "rejected";
    candidate.ReviewedBy = user?.Email;
    candidate.ReviewedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(candidate);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

// Research refresh — proxies to AI harness and saves candidates
app.MapPost("/api/admin/social/research-refresh", async (HttpContext ctx, AppDbContext db, IConfiguration config, UserManager<ApplicationUser> userManager) =>
{
    var harnessUrl = config["AiHarness:Url"] ?? "http://localhost:8001";
    var harnessKey = config["AiHarness:ApiKey"] ?? "";

    using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(300) };
    if (!string.IsNullOrEmpty(harnessKey))
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {harnessKey}");

    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    var categories = new[] { "trafficking_stats", "rehabilitation", "regional" };
    if (body.ValueKind != JsonValueKind.Undefined && body.TryGetProperty("categories", out var cats))
    {
        categories = cats.EnumerateArray().Select(c => c.GetString()!).ToArray();
    }

    try
    {
        var resp = await httpClient.PostAsJsonAsync($"{harnessUrl}/refresh-facts", new { categories });
        if (!resp.IsSuccessStatusCode)
            return Results.StatusCode(503);

        var result = await resp.Content.ReadFromJsonAsync<JsonElement>();
        if (!result.TryGetProperty("candidates", out var candidatesArr))
            return Results.Ok(new { saved = 0 });

        var user = await userManager.GetUserAsync(ctx.User);
        int saved = 0;
        foreach (var c in candidatesArr.EnumerateArray())
        {
            var candidate = new backend.Models.SocialMedia.ContentFactCandidate
            {
                FactText = c.TryGetProperty("fact_text", out var ft) ? ft.GetString() : null,
                SourceName = c.TryGetProperty("source_name", out var sn) ? sn.GetString() : null,
                SourceUrl = c.TryGetProperty("source_url", out var su) ? su.GetString() : null,
                Category = c.TryGetProperty("category", out var cat) ? cat.GetString() : null,
                SearchQuery = "research_refresh",
                Status = "pending",
                CreatedAt = DateTime.UtcNow
            };
            db.ContentFactCandidates.Add(candidate);
            saved++;
        }
        await db.SaveChangesAsync();
        return Results.Ok(new { saved });
    }
    catch (HttpRequestException)
    {
        return Results.StatusCode(503);
    }
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

// Calendar view — returns scheduled + ready_to_publish posts ordered by scheduled time
app.MapGet("/api/admin/social/calendar", async (AppDbContext db) =>
{
    var posts = await db.AutomatedPosts.Include(p => p.Media)
        .Where(p => p.Status == "scheduled" || p.Status == "ready_to_publish" || p.Status == "published")
        .OrderBy(p => p.ScheduledAt)
        .Select(p => new {
            p.AutomatedPostId, p.Content, p.ContentPillar, p.Status, p.Platform,
            p.MediaId, p.ScheduledAt, p.EngagementLikes, p.EngagementShares, p.EngagementComments,
            p.CreatedAt, p.UpdatedAt,
            MediaPath = p.Media != null ? p.Media.FilePath : null,
            MediaThumbPath = p.Media != null ? p.Media.ThumbnailPath : null,
        }).ToListAsync();
    return Results.Ok(posts);
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

// Queue count — for the nav badge
app.MapGet("/api/admin/social/queue-count", async (AppDbContext db) =>
{
    var draftCount = await db.AutomatedPosts.CountAsync(p => p.Status == "draft");
    var readyCount = await db.AutomatedPosts.CountAsync(p => p.Status == "ready_to_publish");
    return Results.Ok(new { draftCount, readyCount });
}).RequireAuthorization(p => p.RequireRole("Admin", "SocialMediaManager"));

// Trigger content generation — calls the Python AI harness
app.MapPost("/api/admin/social/generate", async (HttpContext ctx, AppDbContext db, IConfiguration config) =>
{
    var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    int maxPosts = 4;
    if (body.ValueKind != JsonValueKind.Undefined && body.TryGetProperty("maxPosts", out var mp))
        maxPosts = mp.GetInt32();

    var harnessUrl = config["AiHarness:Url"] ?? "http://localhost:8001";
    var harnessKey = config["AiHarness:ApiKey"] ?? "";

    using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(300) };
    if (!string.IsNullOrEmpty(harnessKey))
        httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {harnessKey}");

    try
    {
        // Step 1: Get the plan from the harness
        var planResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/plan-content", new { max_posts = maxPosts });
        if (!planResp.IsSuccessStatusCode)
            return Results.StatusCode(503);

        var planJson = await planResp.Content.ReadFromJsonAsync<JsonElement>();
        var plan = planJson.GetProperty("plan");

        var created = new List<object>();

        // Step 2: Generate each post
        foreach (var item in plan.EnumerateArray())
        {
            var pillar = item.GetProperty("pillar").GetString();
            var platform = item.GetProperty("platform").GetString();
            int? photoId = item.TryGetProperty("photo_id", out var pid) && pid.ValueKind == JsonValueKind.Number ? pid.GetInt32() : null;
            int? factId = item.TryGetProperty("fact_id", out var fid) && fid.ValueKind == JsonValueKind.Number ? fid.GetInt32() : null;
            int? tpId = item.TryGetProperty("talking_point_id", out var tid) && tid.ValueKind == JsonValueKind.Number ? tid.GetInt32() : null;

            // If no photo assigned but pillar could use one, ask harness to select
            if (photoId == null && pillar != "the_problem" && pillar != "call_to_action")
            {
                try
                {
                    var selectResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/select-photo", new
                    {
                        pillar,
                        platform,
                        post_description = item.TryGetProperty("reasoning", out var r) ? r.GetString() : ""
                    });
                    if (selectResp.IsSuccessStatusCode)
                    {
                        var selectJson = await selectResp.Content.ReadFromJsonAsync<JsonElement>();
                        if (selectJson.TryGetProperty("photo_id", out var selId) && selId.ValueKind == JsonValueKind.Number)
                            photoId = selId.GetInt32();
                    }
                }
                catch { /* photo selection is optional */ }
            }

            // Generate the post
            var genResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/generate-post", new
            {
                pillar,
                platform,
                photo_id = photoId,
                fact_id = factId,
                talking_point_id = tpId
            });
            if (!genResp.IsSuccessStatusCode) continue;

            var genJson = await genResp.Content.ReadFromJsonAsync<JsonElement>();
            var content = genJson.TryGetProperty("content", out var c) ? c.GetString() : null;
            if (string.IsNullOrEmpty(content)) continue;

            // Get optimal schedule time
            DateTime? scheduledAt = null;
            try
            {
                var schedResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/predict-schedule", new { pillar, platform });
                if (schedResp.IsSuccessStatusCode)
                {
                    var schedJson = await schedResp.Content.ReadFromJsonAsync<JsonElement>();
                    if (schedJson.TryGetProperty("scheduled_at", out var sa))
                        scheduledAt = DateTime.Parse(sa.GetString()!, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);
                }
            }
            catch { /* scheduling is optional, post will just not have a suggested time */ }

            // Save as draft
            var post = new backend.Models.SocialMedia.AutomatedPost
            {
                Content = content,
                ContentPillar = pillar,
                Source = "auto_generated",
                Status = "draft",
                Platform = platform,
                MediaId = photoId,
                FactId = factId,
                TalkingPointId = tpId,
                ScheduledAt = scheduledAt,
                CreatedAt = DateTime.UtcNow
            };
            db.AutomatedPosts.Add(post);
            await db.SaveChangesAsync();

            created.Add(new { post.AutomatedPostId, pillar, platform });
        }

        return Results.Ok(new { generated = created.Count, posts = created });
    }
    catch (HttpRequestException)
    {
        return Results.StatusCode(503);
    }
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.Run();


public partial class Program { }

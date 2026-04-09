using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
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
app.MapSupporterEndpoints();
app.MapDonationEndpoints();
app.MapDonorPortalEndpoints();
app.MapSeedEndpoints();

app.Run();


public partial class Program { }

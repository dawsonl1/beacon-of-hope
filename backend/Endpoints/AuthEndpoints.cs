using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

// [SECURITY-3] Auth — Username/password authentication: Login, register, and session
// management endpoints. Login and register correctly do NOT require auth. Logout requires auth.
// [SECURITY-5] Auth — Pages/API require auth: /api/auth/login, /api/auth/register, and
// /api/auth/me are intentionally public. All other endpoints in the app require authentication.
public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        // [SECURITY-3] Login endpoint — no auth required (correct)
        app.MapPost("/api/auth/login", async (
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager,
            AppDbContext db,
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
            var safehouses = await db.UserSafehouses
                .Where(us => us.UserId == user.Id)
                .Join(db.Safehouses, us => us.SafehouseId, s => s.SafehouseId,
                    (us, s) => new { s.SafehouseId, s.SafehouseCode, s.Name })
                .ToListAsync();
            return Results.Ok(new
            {
                email = user.Email,
                firstName = user.FirstName,
                lastName = user.LastName,
                roles,
                safehouses
            });
        });

        // [SECURITY-5] Logout endpoint — requires auth (correct: only authenticated users can log out)
        app.MapPost("/api/auth/logout", async (SignInManager<ApplicationUser> signInManager) =>
        {
            await signInManager.SignOutAsync();
            return Results.Ok(new { message = "Logged out" });
        }).RequireAuthorization();

        // [SECURITY-3] Register endpoint — no auth required (correct: new users need to register)
        // [SECURITY-6] New users are assigned the "Donor" role by default (least privilege)
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
                CreatedAt = AppConstants.DataCutoffUtc,
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

        // [SECURITY-5] Me endpoint — no auth required (correct: returns isAuthenticated=false for guests)
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
    }
}

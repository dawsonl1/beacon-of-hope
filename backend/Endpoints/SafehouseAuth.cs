using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

/// <summary>
/// [SECURITY-6] Auth — RBAC (safehouse scoping): Shared helpers for enforcing per-user
/// safehouse access restrictions. Admins see everything; staff see only data from their
/// assigned safehouses. This provides data-level authorization beyond just role checks.
/// </summary>
public static class SafehouseAuth
{
    /// <summary>
    /// Returns the safehouse IDs a staff user is allowed to see,
    /// or null for admins (meaning no restriction).
    /// </summary>
    public static async Task<List<int>?> GetAllowedSafehouseIds(HttpContext httpContext, AppDbContext db)
    {
        if (httpContext.User.IsInRole("Admin")) return null;

        var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return new List<int>();

        return await db.UserSafehouses
            .Where(us => us.UserId == userId)
            .Select(us => us.SafehouseId)
            .ToListAsync();
    }

    /// <summary>
    /// Applies safehouse restriction to a resident query.
    /// </summary>
    public static IQueryable<Resident> ApplyResidentFilter(
        IQueryable<Resident> query, List<int>? allowed, int? safehouseId)
    {
        if (allowed == null)
        {
            if (safehouseId.HasValue)
                query = query.Where(r => r.SafehouseId == safehouseId.Value);
        }
        else
        {
            if (safehouseId.HasValue && allowed.Contains(safehouseId.Value))
                query = query.Where(r => r.SafehouseId == safehouseId.Value);
            else
                query = query.Where(r => r.SafehouseId.HasValue && allowed.Contains(r.SafehouseId.Value));
        }
        return query;
    }

    /// <summary>
    /// Applies safehouse restriction to an incident query.
    /// </summary>
    public static IQueryable<IncidentReport> ApplyIncidentFilter(
        IQueryable<IncidentReport> query, List<int>? allowed, int? safehouseId)
    {
        if (allowed == null)
        {
            if (safehouseId.HasValue)
                query = query.Where(i => i.SafehouseId == safehouseId.Value);
        }
        else
        {
            if (safehouseId.HasValue && allowed.Contains(safehouseId.Value))
                query = query.Where(i => i.SafehouseId == safehouseId.Value);
            else
                query = query.Where(i => i.SafehouseId.HasValue && allowed.Contains(i.SafehouseId.Value));
        }
        return query;
    }

    /// <summary>
    /// Validates that a resident belongs to the user's assigned safehouses.
    /// Returns null if allowed, or an error IResult if not.
    /// </summary>
    public static async Task<IResult?> ValidateResidentAccess(
        HttpContext httpContext, AppDbContext db, int residentId)
    {
        var allowed = await GetAllowedSafehouseIds(httpContext, db);
        if (allowed == null) return null;

        var safehouseId = await db.Residents
            .Where(r => r.ResidentId == residentId)
            .Select(r => r.SafehouseId)
            .FirstOrDefaultAsync();

        if (!safehouseId.HasValue || !allowed.Contains(safehouseId.Value))
            return Results.BadRequest(new { error = "Resident is not in your assigned safehouses." });

        return null;
    }
}

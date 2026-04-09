using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

/// <summary>
/// Shared helpers for enforcing per-user safehouse access restrictions.
/// Admins see everything; staff see only their assigned safehouses.
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
}

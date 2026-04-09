using backend.Data;
using backend.DTOs;
using backend.Mapping;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class DonationEndpoints
{
    public static void MapDonationEndpoints(this WebApplication app)
    {
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
                .Where(a => a.ProgramArea != null && (a.AllocationDate == null || a.AllocationDate <= AppConstants.DataCutoff))
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
                .Where(a => a.SafehouseId != null && (a.AllocationDate == null || a.AllocationDate <= AppConstants.DataCutoff))
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
    }
}

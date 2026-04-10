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
            var currentYear = AppConstants.DataCutoff.Year;
            var data = await db.DonationAllocations
                .Where(a => a.ProgramArea != null && (a.AllocationDate == null || a.AllocationDate <= AppConstants.DataCutoff))
                .GroupBy(a => a.ProgramArea)
                .Select(g => new
                {
                    programArea = g.Key,
                    totalAllocatedThisYear = g
                        .Where(a => a.AllocationDate != null && a.AllocationDate.Value.Year == currentYear)
                        .Sum(a => (decimal?)a.AmountAllocated ?? 0),
                    totalAllocated = g.Sum(a => (decimal?)a.AmountAllocated ?? 0),
                    count = g.Count()
                })
                .OrderByDescending(x => x.totalAllocated)
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/allocations/by-safehouse", async (AppDbContext db) =>
        {
            var currentYear = AppConstants.DataCutoff.Year;
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
                    totalAllocatedThisYear = g
                        .Where(a => a.AllocationDate != null && a.AllocationDate.Value.Year == currentYear)
                        .Sum(a => (decimal?)a.AmountAllocated ?? 0),
                    totalAllocated = g.Sum(a => (decimal?)a.AmountAllocated ?? 0),
                    count = g.Count()
                })
                .OrderByDescending(x => x.totalAllocated)
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Allocation summary (total donated vs allocated) ────────

        app.MapGet("/api/admin/allocations/summary", async (AppDbContext db) =>
        {
            var totalDonated = await db.Donations
                .Where(d => d.DonationDate == null || d.DonationDate <= AppConstants.DataCutoff)
                .SumAsync(d => (decimal?)d.Amount ?? 0);

            var totalAllocated = await db.DonationAllocations
                .Where(a => a.AllocationDate == null || a.AllocationDate <= AppConstants.DataCutoff)
                .SumAsync(a => (decimal?)a.AmountAllocated ?? 0);

            var currentYear = AppConstants.DataCutoff.Year;
            var donatedThisYear = await db.Donations
                .Where(d => d.DonationDate != null && d.DonationDate.Value.Year == currentYear
                    && d.DonationDate <= AppConstants.DataCutoff)
                .SumAsync(d => (decimal?)d.Amount ?? 0);

            var allocatedThisYear = await db.DonationAllocations
                .Where(a => a.AllocationDate != null && a.AllocationDate.Value.Year == currentYear
                    && a.AllocationDate <= AppConstants.DataCutoff)
                .SumAsync(a => (decimal?)a.AmountAllocated ?? 0);

            return new
            {
                totalDonated,
                totalAllocated,
                unallocated = totalDonated - totalAllocated,
                donatedThisYear,
                allocatedThisYear,
                unallocatedThisYear = donatedThisYear - allocatedThisYear
            };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Recent allocations list ────────────────────────────────

        app.MapGet("/api/admin/allocations", async (AppDbContext db, int page = 1, int pageSize = 20) =>
        {
            if (pageSize > 100) pageSize = 100;

            var q = db.DonationAllocations
                .Where(a => a.AllocationDate == null || a.AllocationDate <= AppConstants.DataCutoff);

            var totalCount = await q.CountAsync();
            var items = await q
                .OrderByDescending(a => a.AllocationDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.AllocationId,
                    safehouseName = a.SafehouseId != null
                        ? db.Safehouses
                            .Where(s => s.SafehouseId == a.SafehouseId)
                            .Select(s => s.Name ?? s.SafehouseCode)
                            .FirstOrDefault()
                        : null,
                    a.ProgramArea,
                    a.AmountAllocated,
                    a.AllocationDate,
                    a.AllocationNotes
                })
                .ToListAsync();

            return new { totalCount, page, pageSize, items };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Create allocation (from the general fund pool) ─────────

        app.MapPost("/api/admin/allocations", async (AppDbContext db, HttpContext httpContext) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<CreateAllocationRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });

            if (body.SafehouseId.HasValue)
            {
                var safehouse = await db.Safehouses.FindAsync(body.SafehouseId.Value);
                if (safehouse == null) return Results.BadRequest(new { error = "Safehouse not found." });
            }

            if (body.AmountAllocated <= 0)
                return Results.BadRequest(new { error = "Amount must be greater than zero." });

            if (!body.AllocationDate.HasValue)
                return Results.BadRequest(new { error = "Date is required." });

            // DonationId is required by the DB schema, so link to the most recent donation
            var latestDonationId = await db.Donations
                .OrderByDescending(d => d.DonationId)
                .Select(d => d.DonationId)
                .FirstOrDefaultAsync();
            if (latestDonationId == 0)
                return Results.BadRequest(new { error = "No donations exist to allocate from." });

            var allocation = new DonationAllocation
            {
                DonationId = latestDonationId,
                SafehouseId = body.SafehouseId,
                ProgramArea = body.ProgramArea,
                AmountAllocated = body.AmountAllocated,
                AllocationDate = body.AllocationDate ?? AppConstants.DataCutoff,
                AllocationNotes = body.AllocationNotes
            };

            db.DonationAllocations.Add(allocation);
            await db.SaveChangesAsync();
            return Results.Ok(new { allocation.AllocationId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

public class CreateAllocationRequest
{
    public int? SafehouseId { get; set; }
    public string? ProgramArea { get; set; }
    public decimal AmountAllocated { get; set; }
    public DateOnly? AllocationDate { get; set; }
    public string? AllocationNotes { get; set; }
}

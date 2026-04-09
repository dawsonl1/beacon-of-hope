using backend.Data;
using backend.DTOs;
using backend.Mapping;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class SupporterEndpoints
{
    public static void MapSupporterEndpoints(this WebApplication app)
    {
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
    }
}

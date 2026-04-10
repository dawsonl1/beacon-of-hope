using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class OutreachEndpoints
{
    public static void MapOutreachEndpoints(this WebApplication app)
    {
        app.MapGet("/api/admin/supporters/{id:int}/outreach", async (int id, AppDbContext db) =>
        {
            var records = await db.DonorOutreaches
                .Where(o => o.SupporterId == id)
                .OrderByDescending(o => o.CreatedAt)
                .ThenByDescending(o => o.Id)
                .Select(o => new
                {
                    o.Id,
                    o.StaffEmail,
                    o.StaffName,
                    o.OutreachType,
                    o.Note,
                    o.CreatedAt,
                })
                .ToListAsync();
            return Results.Ok(records);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/supporters/{id:int}/outreach", async (
            int id,
            HttpContext httpContext,
            UserManager<ApplicationUser> userManager,
            AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<CreateOutreachRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });

            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });

            var supporter = await db.Supporters.FindAsync(id);
            if (supporter == null) return Results.NotFound(new { error = "Supporter not found." });

            var currentUser = await userManager.GetUserAsync(httpContext.User);
            if (currentUser == null) return Results.Unauthorized();

            var outreach = new DonorOutreach
            {
                SupporterId = id,
                StaffEmail = currentUser.Email!,
                StaffName = $"{currentUser.FirstName} {currentUser.LastName}",
                OutreachType = body.OutreachType,
                Note = body.Note,
                CreatedAt = AppConstants.DataCutoffUtc,
            };

            db.DonorOutreaches.Add(outreach);
            await db.SaveChangesAsync();
            return Results.Ok(new { outreach.Id });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/outreach/{outreachId:int}", async (
            int outreachId,
            HttpContext httpContext,
            AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<UpdateOutreachRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });

            var outreach = await db.DonorOutreaches.FindAsync(outreachId);
            if (outreach == null) return Results.NotFound(new { error = "Outreach record not found." });

            outreach.Note = body.Note;
            await db.SaveChangesAsync();
            return Results.Ok(new { outreach.Id });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapDelete("/api/admin/outreach/{outreachId:int}", async (int outreachId, AppDbContext db) =>
        {
            var outreach = await db.DonorOutreaches.FindAsync(outreachId);
            if (outreach == null) return Results.NotFound(new { error = "Outreach record not found." });

            db.DonorOutreaches.Remove(outreach);
            await db.SaveChangesAsync();
            return Results.Ok(new { deleted = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

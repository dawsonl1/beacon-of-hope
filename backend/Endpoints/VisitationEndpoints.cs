using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class VisitationEndpoints
{
    public static void MapVisitationEndpoints(this WebApplication app)
    {
        app.MapGet("/api/admin/visitations", async (
            HttpContext httpContext,
            AppDbContext db,
            int? residentId,
            int? safehouseId,
            string? visitType,
            bool? safetyOnly,
            int page = 1,
            int pageSize = 20) =>
        {
            if (pageSize > 100) pageSize = 100;

            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var query = db.HomeVisitations.AsQueryable();

            if (allowed != null)
                query = query.Where(v => db.Residents.Any(r => r.ResidentId == v.ResidentId && r.SafehouseId.HasValue && allowed.Contains(r.SafehouseId.Value)));

            if (safehouseId.HasValue)
                query = query.Where(v => db.Residents.Any(r => r.ResidentId == v.ResidentId && r.SafehouseId == safehouseId.Value));

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

        app.MapPost("/api/admin/visitations", async (HttpContext httpContext, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<VisitationRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            var denied = await SafehouseAuth.ValidateResidentAccess(httpContext, db, body.ResidentId);
            if (denied != null) return denied;
            var visitation = new HomeVisitation { ResidentId = body.ResidentId, VisitDate = body.VisitDate, SocialWorker = body.SocialWorker, VisitType = body.VisitType, LocationVisited = body.LocationVisited, FamilyMembersPresent = body.FamilyMembersPresent, Purpose = body.Purpose, Observations = body.Observations, FamilyCooperationLevel = body.FamilyCooperationLevel, SafetyConcernsNoted = body.SafetyConcernsNoted, FollowUpNeeded = body.FollowUpNeeded, FollowUpNotes = body.FollowUpNotes, VisitOutcome = body.VisitOutcome };
            db.HomeVisitations.Add(visitation);
            await db.SaveChangesAsync();

            // Auto-create follow-up task when follow-up is needed
            if (body.FollowUpNeeded == true)
            {
                var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                var resident = await db.Residents.FindAsync(body.ResidentId);
                var safehouseId = resident?.SafehouseId ?? 0;
                if (userId != null)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId,
                        ResidentId = body.ResidentId,
                        SafehouseId = safehouseId,
                        TaskType = "VisitationFollowUp",
                        Title = "Visitation Follow-Up",
                        Description = $"{body.VisitType} visit on {body.VisitDate} — {body.FollowUpNotes ?? "Follow-up needed"}",
                        SourceEntityType = "HomeVisitation",
                        SourceEntityId = visitation.VisitationId,
                        Status = "Pending"
                    });
                    await db.SaveChangesAsync();
                }
            }

            return Results.Created($"/api/admin/visitations/{visitation.VisitationId}", new { visitation.VisitationId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/visitations/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var existing = await db.HomeVisitations.FindAsync(id);
            if (existing is null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<VisitationRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            existing.ResidentId = body.ResidentId; existing.VisitDate = body.VisitDate; existing.SocialWorker = body.SocialWorker; existing.VisitType = body.VisitType; existing.LocationVisited = body.LocationVisited; existing.FamilyMembersPresent = body.FamilyMembersPresent; existing.Purpose = body.Purpose; existing.Observations = body.Observations; existing.FamilyCooperationLevel = body.FamilyCooperationLevel; existing.SafetyConcernsNoted = body.SafetyConcernsNoted; existing.FollowUpNeeded = body.FollowUpNeeded; existing.FollowUpNotes = body.FollowUpNotes; existing.VisitOutcome = body.VisitOutcome;
            await db.SaveChangesAsync();
            return Results.Ok(new { id });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Visitation Follow-Up Tasks ────────────────────────────────

        app.MapGet("/api/admin/visitations/{id}/tasks", async (int id, AppDbContext db) =>
        {
            var visitation = await db.HomeVisitations.FindAsync(id);
            if (visitation == null) return Results.NotFound();
            var tasks = await db.StaffTasks
                .Where(t => t.SourceEntityType == "HomeVisitation" && t.SourceEntityId == id)
                .Select(t => new { t.StaffTaskId, t.TaskType, t.Title, t.Description, t.Status, t.CreatedAt, t.CompletedAt, assignedTo = t.StaffUser.FirstName + " " + t.StaffUser.LastName })
                .ToListAsync();
            return Results.Ok(tasks);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/visitations/{id}/create-task", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var visitation = await db.HomeVisitations.FindAsync(id);
            if (visitation == null) return Results.NotFound();
            if (visitation.FollowUpNeeded != true) return Results.BadRequest(new { error = "This visitation does not require follow-up." });
            var existing = await db.StaffTasks.AnyAsync(t => t.SourceEntityType == "HomeVisitation" && t.SourceEntityId == id);
            if (existing) return Results.BadRequest(new { error = "A follow-up task already exists for this visitation." });
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Results.Unauthorized();
            var resident = await db.Residents.FindAsync(visitation.ResidentId);
            var safehouseId = resident?.SafehouseId ?? 0;
            var task = new StaffTask
            {
                StaffUserId = userId,
                ResidentId = visitation.ResidentId,
                SafehouseId = safehouseId,
                TaskType = "VisitationFollowUp",
                Title = "Visitation Follow-Up",
                Description = $"{visitation.VisitType} visit on {visitation.VisitDate} — {visitation.FollowUpNotes ?? "Follow-up needed"}",
                SourceEntityType = "HomeVisitation",
                SourceEntityId = visitation.VisitationId,
                Status = "Pending"
            };
            db.StaffTasks.Add(task);
            await db.SaveChangesAsync();
            return Results.Ok(new { task.StaffTaskId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapDelete("/api/admin/visitations/{id}", async (AppDbContext db, int id) =>
        {
            var existing = await db.HomeVisitations.FindAsync(id);
            if (existing is null) return Results.NotFound();

            db.HomeVisitations.Remove(existing);
            await db.SaveChangesAsync();
            return Results.Ok(new { deleted = true });
        }).RequireAuthorization("AdminOnly");

        // ── Conferences ──────────────────────────────────────────

        app.MapGet("/api/admin/conferences", async (HttpContext httpContext, AppDbContext db) =>
        {
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var now = AppConstants.DataCutoff;

            var plansQuery = db.InterventionPlans.AsQueryable();
            if (allowed != null)
                plansQuery = plansQuery.Where(p => db.Residents.Any(r => r.ResidentId == p.ResidentId && r.SafehouseId.HasValue && allowed.Contains(r.SafehouseId.Value)));

            var upcoming = await plansQuery
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

            var past = await plansQuery
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
    }
}

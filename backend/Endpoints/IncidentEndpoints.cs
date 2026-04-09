using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class IncidentEndpoints
{
    public static void MapIncidentEndpoints(this WebApplication app)
    {
        // ── Incident Management ─────────────────────────────────────

        app.MapGet("/api/admin/incidents", async (AppDbContext db, int? safehouseId, int? residentId, string? severity, bool? resolved, int page = 1, int pageSize = 20) =>
        {
            var query = db.IncidentReports.AsQueryable();
            if (safehouseId.HasValue) query = query.Where(i => i.SafehouseId == safehouseId.Value);
            if (residentId.HasValue) query = query.Where(i => i.ResidentId == residentId.Value);
            if (!string.IsNullOrEmpty(severity)) query = query.Where(i => i.Severity == severity);
            if (resolved.HasValue) query = query.Where(i => i.Resolved == resolved.Value);
            var total = await query.CountAsync();
            var items = await query.OrderByDescending(i => i.IncidentDate).Skip((page - 1) * pageSize).Take(pageSize)
                .Select(i => new { i.IncidentId, i.ResidentId, residentCode = i.Resident != null ? i.Resident.InternalCode : null, i.SafehouseId, i.IncidentDate, i.IncidentType, i.Severity, i.Description, i.ResponseTaken, i.ReportedBy, i.Resolved, i.ResolutionDate, i.FollowUpRequired })
                .ToListAsync();
            return Results.Ok(new { total, page, pageSize, items });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/incidents/{id}", async (int id, AppDbContext db) =>
        {
            var i = await db.IncidentReports.Where(x => x.IncidentId == id)
                .Select(x => new { x.IncidentId, x.ResidentId, residentCode = x.Resident != null ? x.Resident.InternalCode : null, x.SafehouseId, x.IncidentDate, x.IncidentType, x.Severity, x.Description, x.ResponseTaken, x.ReportedBy, x.Resolved, x.ResolutionDate, x.FollowUpRequired })
                .FirstOrDefaultAsync();
            return i == null ? Results.NotFound() : Results.Ok(i);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/incidents", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<IncidentRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            var incident = new IncidentReport { ResidentId = body.ResidentId, SafehouseId = body.SafehouseId, IncidentDate = body.IncidentDate, IncidentType = body.IncidentType, Severity = body.Severity, Description = body.Description, ResponseTaken = body.ResponseTaken, ReportedBy = body.ReportedBy, Resolved = body.Resolved ?? false, ResolutionDate = body.ResolutionDate, FollowUpRequired = body.FollowUpRequired ?? false };
            db.IncidentReports.Add(incident);
            await db.SaveChangesAsync();
            if (incident.FollowUpRequired == true && incident.ResidentId.HasValue)
            {
                var resident = await db.Residents.FindAsync(incident.ResidentId.Value);
                if (resident != null)
                {
                    var assignedUser = await db.UserSafehouses.Where(us => us.SafehouseId == (incident.SafehouseId ?? resident.SafehouseId ?? 0)).Select(us => us.UserId).FirstOrDefaultAsync();
                    if (assignedUser != null)
                    {
                        db.StaffTasks.Add(new StaffTask { StaffUserId = assignedUser, ResidentId = incident.ResidentId, SafehouseId = incident.SafehouseId ?? resident.SafehouseId ?? 0, TaskType = "IncidentFollowUp", Title = $"Follow up on incident for {resident.InternalCode}", Description = $"Incident: {incident.IncidentType} ({incident.Severity}) - {incident.Description}", SourceEntityType = "IncidentReport", SourceEntityId = incident.IncidentId });
                        await db.SaveChangesAsync();
                    }
                }
            }
            return Results.Ok(new { incident.IncidentId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/incidents/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var incident = await db.IncidentReports.FindAsync(id);
            if (incident == null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<IncidentRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            incident.ResidentId = body.ResidentId; incident.SafehouseId = body.SafehouseId; incident.IncidentDate = body.IncidentDate; incident.IncidentType = body.IncidentType; incident.Severity = body.Severity; incident.Description = body.Description; incident.ResponseTaken = body.ResponseTaken; incident.ReportedBy = body.ReportedBy; incident.Resolved = body.Resolved ?? incident.Resolved; incident.ResolutionDate = body.ResolutionDate; incident.FollowUpRequired = body.FollowUpRequired ?? incident.FollowUpRequired;
            await db.SaveChangesAsync();
            return Results.Ok(new { updated = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapDelete("/api/admin/incidents/{id}", async (int id, AppDbContext db) =>
        {
            var incident = await db.IncidentReports.FindAsync(id);
            if (incident == null) return Results.NotFound();
            db.IncidentReports.Remove(incident);
            await db.SaveChangesAsync();
            return Results.Ok(new { deleted = true });
        }).RequireAuthorization("AdminOnly");

        // ── ML Predictions ──────────────────────────────────────────

        app.MapGet("/api/ml/predictions/{entityType}/{entityId}", async (string entityType, int entityId, AppDbContext db) =>
        {
            var predictions = await db.MlPredictions.Where(p => p.EntityType == entityType && p.EntityId == entityId)
                .Select(p => new { p.Id, p.EntityType, p.EntityId, p.ModelName, p.ModelVersion, p.Score, p.ScoreLabel, p.PredictedAt, p.Metadata })
                .ToListAsync();
            return Results.Ok(predictions);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/ml/predictions/{entityType}/{entityId}/history", async (string entityType, int entityId, string? model, AppDbContext db) =>
        {
            var query = db.MlPredictionHistory.Where(p => p.EntityType == entityType && p.EntityId == entityId);
            if (!string.IsNullOrEmpty(model)) query = query.Where(p => p.ModelName == model);
            var history = await query.OrderByDescending(p => p.PredictedAt).Take(50)
                .Select(p => new { p.Id, p.ModelName, p.Score, p.ScoreLabel, p.PredictedAt })
                .ToListAsync();
            return Results.Ok(history);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Case Claiming ───────────────────────────────────────────

        app.MapPost("/api/admin/residents/{id}/claim", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var resident = await db.Residents.FindAsync(id);
            if (resident == null) return Results.NotFound();
            resident.AssignedSocialWorker = $"{user.FirstName} {user.LastName}";
            await db.SaveChangesAsync();
            // Auto-generate initial home visit to-do
            db.StaffTasks.Add(new StaffTask { StaffUserId = user.Id, ResidentId = id, SafehouseId = resident.SafehouseId ?? 1, TaskType = "ScheduleHomeVisit", Title = $"Schedule initial home visit for {resident.InternalCode}", Description = "Initial assessment visit after claiming case", Status = "Pending" });
            await db.SaveChangesAsync();
            return Results.Ok(new { claimed = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/residents/unclaimed", async (AppDbContext db, int? safehouseId) =>
        {
            var query = db.Residents.Where(r => r.AssignedSocialWorker == null || r.AssignedSocialWorker == "").Where(r => r.CaseStatus == "Active");
            if (safehouseId.HasValue) query = query.Where(r => r.SafehouseId == safehouseId.Value);
            var items = await query.OrderByDescending(r => r.DateOfAdmission)
                .Select(r => new { r.ResidentId, r.InternalCode, r.CaseControlNo, r.SafehouseId, safehouse = r.Safehouse != null ? r.Safehouse.Name : null, r.CaseCategory, r.CurrentRiskLevel, r.DateOfAdmission })
                .ToListAsync();
            return Results.Ok(items);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

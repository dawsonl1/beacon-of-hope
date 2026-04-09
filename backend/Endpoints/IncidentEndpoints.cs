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

        app.MapGet("/api/admin/incidents", async (HttpContext httpContext, AppDbContext db, int? safehouseId, int? residentId, string? severity, bool? resolved, string? sortBy = null, string? sortDir = null, int page = 1, int pageSize = 20) =>
        {
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var query = db.IncidentReports.AsQueryable();
            query = SafehouseAuth.ApplyIncidentFilter(query, allowed, safehouseId);
            if (residentId.HasValue) query = query.Where(i => i.ResidentId == residentId.Value);
            if (!string.IsNullOrEmpty(severity)) query = query.Where(i => i.Severity == severity);
            if (resolved.HasValue) query = query.Where(i => i.Resolved == resolved.Value);
            var total = await query.CountAsync();
            var descending = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase) ? false : true;
            IOrderedQueryable<IncidentReport> ordered = sortBy?.ToLower() switch
            {
                "type" => descending ? query.OrderByDescending(i => i.IncidentType) : query.OrderBy(i => i.IncidentType),
                "severity" => descending
                    ? query.OrderByDescending(i => i.Severity == "Critical" ? 3 : i.Severity == "High" ? 2 : i.Severity == "Medium" ? 1 : 0)
                    : query.OrderBy(i => i.Severity == "Critical" ? 3 : i.Severity == "High" ? 2 : i.Severity == "Medium" ? 1 : 0),
                "reportedby" => descending ? query.OrderByDescending(i => i.ReportedBy) : query.OrderBy(i => i.ReportedBy),
                "status" => descending ? query.OrderByDescending(i => i.Resolved) : query.OrderBy(i => i.Resolved),
                _ => descending ? query.OrderByDescending(i => i.IncidentDate) : query.OrderBy(i => i.IncidentDate),
            };
            var items = await ordered.Skip((page - 1) * pageSize).Take(pageSize)
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
            if (body.ResidentId.HasValue)
            {
                var denied = await SafehouseAuth.ValidateResidentAccess(httpContext, db, body.ResidentId.Value);
                if (denied != null) return denied;
            }
            var incident = new IncidentReport { ResidentId = body.ResidentId, SafehouseId = body.SafehouseId, IncidentDate = body.IncidentDate, IncidentType = body.IncidentType, Severity = body.Severity, Description = body.Description, ResponseTaken = body.ResponseTaken, ReportedBy = body.ReportedBy, Resolved = body.Resolved ?? false, ResolutionDate = body.ResolutionDate, FollowUpRequired = body.FollowUpRequired ?? false };
            db.IncidentReports.Add(incident);
            try
            {
                await db.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return Results.Json(new { error = ex.InnerException?.Message ?? ex.Message }, statusCode: 500);
            }
            if (incident.FollowUpRequired == true && incident.ResidentId.HasValue)
            {
                var resident = await db.Residents.FindAsync(incident.ResidentId.Value);
                if (resident != null)
                {
                    var safehouseId = incident.SafehouseId ?? resident.SafehouseId ?? 0;
                    // Assign to the resident's assigned social worker
                    string? assignedUserId = null;
                    if (!string.IsNullOrEmpty(resident.AssignedSocialWorker))
                    {
                        assignedUserId = await db.Users
                            .Where(u => (u.FirstName + " " + u.LastName) == resident.AssignedSocialWorker)
                            .Select(u => u.Id)
                            .FirstOrDefaultAsync();
                    }
                    // Fallback: first staff member assigned to the safehouse
                    assignedUserId ??= await db.UserSafehouses.Where(us => us.SafehouseId == safehouseId).Select(us => us.UserId).FirstOrDefaultAsync();
                    if (assignedUserId != null)
                    {
                        db.StaffTasks.Add(new StaffTask { StaffUserId = assignedUserId, ResidentId = incident.ResidentId, SafehouseId = safehouseId, TaskType = "IncidentFollowUp", Title = "Incident Follow-Up", Description = $"{incident.IncidentType} ({incident.Severity}) — {incident.Description}", SourceEntityType = "IncidentReport", SourceEntityId = incident.IncidentId });
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

        // ── Incident Follow-Up Tasks ────────────────────────────────

        app.MapGet("/api/admin/incidents/{id}/tasks", async (int id, AppDbContext db) =>
        {
            var incident = await db.IncidentReports.FindAsync(id);
            if (incident == null) return Results.NotFound();
            var tasks = await db.StaffTasks
                .Where(t => t.SourceEntityType == "IncidentReport" && t.SourceEntityId == id)
                .Select(t => new { t.StaffTaskId, t.TaskType, t.Title, t.Description, t.Status, t.CreatedAt, t.CompletedAt, assignedTo = t.StaffUser.FirstName + " " + t.StaffUser.LastName })
                .ToListAsync();
            // For each task, check if there's a linked calendar event
            var taskIds = tasks.Select(t => t.StaffTaskId).ToList();
            var events = await db.CalendarEvents
                .Where(e => e.SourceTaskId != null && taskIds.Contains(e.SourceTaskId.Value))
                .Select(e => new { e.CalendarEventId, e.SourceTaskId, e.Title, e.EventDate, e.StartTime, e.EndTime, e.Status, e.EventType })
                .ToListAsync();
            var result = tasks.Select(t => new
            {
                t.StaffTaskId, t.TaskType, t.Title, t.Description, t.Status, t.CreatedAt, t.CompletedAt, t.assignedTo,
                calendarEvent = events.FirstOrDefault(e => e.SourceTaskId == t.StaffTaskId)
            });
            return Results.Ok(result);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/incidents/{id}/create-task", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var incident = await db.IncidentReports.Include(i => i.Resident).FirstOrDefaultAsync(i => i.IncidentId == id);
            if (incident == null) return Results.NotFound();
            if (incident.FollowUpRequired != true) return Results.BadRequest(new { error = "This incident does not require follow-up." });
            // Check if a task already exists
            var existing = await db.StaffTasks.AnyAsync(t => t.SourceEntityType == "IncidentReport" && t.SourceEntityId == id);
            if (existing) return Results.BadRequest(new { error = "A follow-up task already exists for this incident." });
            // Assign to the resident's assigned social worker, fallback to current user
            var currentUser = await userManager.GetUserAsync(httpContext.User);
            if (currentUser == null) return Results.Unauthorized();
            var safehouseId = incident.SafehouseId ?? incident.Resident?.SafehouseId ?? 0;
            string? assignedUserId = null;
            if (!string.IsNullOrEmpty(incident.Resident?.AssignedSocialWorker))
            {
                assignedUserId = await db.Users
                    .Where(u => (u.FirstName + " " + u.LastName) == incident.Resident.AssignedSocialWorker)
                    .Select(u => u.Id)
                    .FirstOrDefaultAsync();
            }
            assignedUserId ??= currentUser.Id;
            var task = new StaffTask
            {
                StaffUserId = assignedUserId,
                ResidentId = incident.ResidentId,
                SafehouseId = safehouseId,
                TaskType = "IncidentFollowUp",
                Title = "Incident Follow-Up",
                Description = $"{incident.IncidentType} ({incident.Severity}) — {incident.Description}",
                SourceEntityType = "IncidentReport",
                SourceEntityId = incident.IncidentId,
                Status = "Pending"
            };
            db.StaffTasks.Add(task);
            await db.SaveChangesAsync();
            return Results.Ok(new { task.StaffTaskId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/tasks/{taskId}/status", async (int taskId, AppDbContext db, HttpContext httpContext) =>
        {
            var task = await db.StaffTasks.FindAsync(taskId);
            if (task == null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<Dictionary<string, string>>();
            var status = body?.GetValueOrDefault("status");
            if (string.IsNullOrEmpty(status)) return Results.BadRequest(new { error = "Status is required." });
            task.Status = status;
            if (status == "Completed" || status == "Dismissed") task.CompletedAt = DateTime.UtcNow;
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

        // ── ML Org-Level Insights (entity_id is null) ───────────────

        app.MapGet("/api/ml/insights", async (AppDbContext db) =>
        {
            var insights = await db.MlPredictions.Where(p => p.EntityId == null)
                .Select(p => new { p.Id, p.EntityType, p.EntityId, p.ModelName, p.ModelVersion, p.Score, p.ScoreLabel, p.PredictedAt, p.Metadata })
                .ToListAsync();
            return Results.Ok(insights);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── ML Prediction Summary by Entity Type ───────────────────

        app.MapGet("/api/ml/predictions/{entityType}/summary", async (string entityType, AppDbContext db) =>
        {
            var summary = await db.MlPredictions.Where(p => p.EntityType == entityType)
                .Select(p => new { p.EntityId, p.ModelName, p.Score, p.ScoreLabel })
                .ToListAsync();
            return Results.Ok(summary);
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
            db.StaffTasks.Add(new StaffTask { StaffUserId = user.Id, ResidentId = id, SafehouseId = resident.SafehouseId ?? 1, TaskType = "ScheduleHomeVisit", Title = "Schedule Initial Home Visit", Description = "Initial assessment visit after claiming case", Status = "Pending" });
            await db.SaveChangesAsync();
            return Results.Ok(new { claimed = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/residents/unclaimed", async (HttpContext httpContext, AppDbContext db, int? safehouseId) =>
        {
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var query = db.Residents.Where(r => r.AssignedSocialWorker == null || r.AssignedSocialWorker == "").Where(r => r.CaseStatus == "Active");
            query = SafehouseAuth.ApplyResidentFilter(query, allowed, safehouseId);
            var items = await query.OrderByDescending(r => r.DateOfAdmission)
                .Select(r => new { r.ResidentId, r.InternalCode, r.CaseControlNo, r.SafehouseId, safehouse = r.Safehouse != null ? r.Safehouse.Name : null, r.CaseCategory, r.CurrentRiskLevel, r.DateOfAdmission })
                .ToListAsync();
            return Results.Ok(items);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/residents/my-claimed", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db, int? safehouseId) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var fullName = $"{user.FirstName} {user.LastName}";
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var query = db.Residents.Where(r => r.AssignedSocialWorker == fullName && r.CaseStatus == "Active");
            query = SafehouseAuth.ApplyResidentFilter(query, allowed, safehouseId);
            var items = await query.OrderByDescending(r => r.DateOfAdmission)
                .Select(r => new { r.ResidentId, r.InternalCode, r.CaseControlNo, r.SafehouseId, safehouse = r.Safehouse != null ? r.Safehouse.Name : null, r.CaseCategory, r.CurrentRiskLevel, r.DateOfAdmission })
                .ToListAsync();
            return Results.Ok(items);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

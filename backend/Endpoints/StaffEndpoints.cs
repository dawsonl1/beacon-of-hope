using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class StaffEndpoints
{
    public static void MapStaffEndpoints(this WebApplication app)
    {
        // ── User Safehouse Management ───────────────────────────────

        app.MapPut("/api/admin/users/{id}/safehouses", async (string id, AppDbContext db, HttpContext httpContext) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<UpdateSafehousesRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var existing = await db.UserSafehouses.Where(us => us.UserId == id).ToListAsync();
            db.UserSafehouses.RemoveRange(existing);
            if (body.SafehouseIds != null)
                foreach (var sid in body.SafehouseIds)
                    db.UserSafehouses.Add(new UserSafehouse { UserId = id, SafehouseId = sid });
            await db.SaveChangesAsync();
            return Results.Ok(new { updated = true });
        }).RequireAuthorization("AdminOnly");

        // ── Staff Tasks (To-Do System) ─────────────────────────────

        app.MapGet("/api/staff/tasks", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db, int? safehouseId) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var now = DateTime.UtcNow;
            var query = db.StaffTasks
                .Where(t => t.StaffUserId == user.Id)
                .Where(t => t.Status == "Pending" || t.Status == "Snoozed")
                .Where(t => t.Status != "Snoozed" || t.SnoozeUntil == null || t.SnoozeUntil <= now);
            if (safehouseId.HasValue) query = query.Where(t => t.SafehouseId == safehouseId.Value);
            var tasks = await query.OrderByDescending(t => t.CreatedAt)
                .Select(t => new { t.StaffTaskId, t.StaffUserId, t.ResidentId, residentCode = t.Resident != null ? t.Resident.InternalCode : null, t.SafehouseId, t.TaskType, t.Title, t.Description, t.ContextJson, t.Status, t.SnoozeUntil, t.DueTriggerDate, t.CreatedAt, t.SourceEntityType, t.SourceEntityId })
                .ToListAsync();
            return Results.Ok(tasks);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/staff/tasks", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var body = await httpContext.Request.ReadFromJsonAsync<CreateStaffTaskRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            var task = new StaffTask { StaffUserId = user.Id, ResidentId = body.ResidentId, SafehouseId = body.SafehouseId, TaskType = body.TaskType ?? "Manual", Title = body.Title ?? "", Description = body.Description, ContextJson = body.ContextJson, Status = "Pending" };
            db.StaffTasks.Add(task);
            await db.SaveChangesAsync();
            return Results.Ok(new { task.StaffTaskId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/staff/tasks/{id}", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var task = await db.StaffTasks.FirstOrDefaultAsync(t => t.StaffTaskId == id && t.StaffUserId == user.Id);
            if (task == null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<UpdateStaffTaskRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            if (!string.IsNullOrEmpty(body.Status)) { task.Status = body.Status; if (body.Status == "Completed" || body.Status == "Dismissed") task.CompletedAt = DateTime.UtcNow; }
            if (body.SnoozeUntil.HasValue) { task.SnoozeUntil = body.SnoozeUntil.Value; task.Status = "Snoozed"; }
            await db.SaveChangesAsync();
            return Results.Ok(new { updated = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Calendar Events ─────────────────────────────────────────

        app.MapGet("/api/staff/calendar", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db, DateOnly? date, DateOnly? weekStart, int? safehouseId) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var query = db.CalendarEvents.Where(e => e.StaffUserId == user.Id).Where(e => e.Status != "Cancelled");
            if (safehouseId.HasValue) query = query.Where(e => e.SafehouseId == safehouseId.Value);
            if (date.HasValue) query = query.Where(e => e.EventDate == date.Value);
            else if (weekStart.HasValue) { var weekEnd = weekStart.Value.AddDays(7); query = query.Where(e => e.EventDate >= weekStart.Value && e.EventDate < weekEnd); }
            var events = await query.OrderBy(e => e.EventDate).ThenBy(e => e.StartTime)
                .Select(e => new { e.CalendarEventId, e.StaffUserId, e.SafehouseId, e.ResidentId, residentCode = e.Resident != null ? e.Resident.InternalCode : null, e.EventType, e.Title, e.Description, eventDate = e.EventDate.ToString("yyyy-MM-dd"), startTime = e.StartTime.HasValue ? e.StartTime.Value.ToString("HH:mm") : null, endTime = e.EndTime.HasValue ? e.EndTime.Value.ToString("HH:mm") : null, e.RecurrenceRule, e.SourceTaskId, e.Status, e.CreatedAt })
                .ToListAsync();
            return Results.Ok(events);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/staff/calendar", async (HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var body = await httpContext.Request.ReadFromJsonAsync<CreateCalendarEventRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            var evt = new CalendarEvent { StaffUserId = user.Id, SafehouseId = body.SafehouseId, ResidentId = body.ResidentId, EventType = body.EventType ?? "Other", Title = body.Title ?? "", Description = body.Description, EventDate = DateOnly.Parse(body.EventDate), StartTime = !string.IsNullOrEmpty(body.StartTime) ? TimeOnly.Parse(body.StartTime) : null, EndTime = !string.IsNullOrEmpty(body.EndTime) ? TimeOnly.Parse(body.EndTime) : null, RecurrenceRule = body.RecurrenceRule, SourceTaskId = body.SourceTaskId, Status = "Scheduled" };
            db.CalendarEvents.Add(evt);
            if (body.SourceTaskId.HasValue) { var task = await db.StaffTasks.FirstOrDefaultAsync(t => t.StaffTaskId == body.SourceTaskId.Value); if (task != null) { task.Status = "Completed"; task.CompletedAt = DateTime.UtcNow; } }
            await db.SaveChangesAsync();
            return Results.Ok(new { evt.CalendarEventId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/staff/calendar/{id}", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var evt = await db.CalendarEvents.FirstOrDefaultAsync(e => e.CalendarEventId == id && e.StaffUserId == user.Id);
            if (evt == null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<UpdateCalendarEventRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            if (!string.IsNullOrEmpty(body.Status)) evt.Status = body.Status;
            if (!string.IsNullOrEmpty(body.StartTime)) evt.StartTime = TimeOnly.Parse(body.StartTime);
            if (!string.IsNullOrEmpty(body.EndTime)) evt.EndTime = TimeOnly.Parse(body.EndTime);
            if (!string.IsNullOrEmpty(body.EventDate)) evt.EventDate = DateOnly.Parse(body.EventDate);
            if (body.Title != null) evt.Title = body.Title;
            if (body.Description != null) evt.Description = body.Description;
            await db.SaveChangesAsync();
            return Results.Ok(new { updated = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapDelete("/api/staff/calendar/{id}", async (int id, HttpContext httpContext, UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var user = await userManager.GetUserAsync(httpContext.User);
            if (user == null) return Results.Unauthorized();
            var evt = await db.CalendarEvents.FirstOrDefaultAsync(e => e.CalendarEventId == id && e.StaffUserId == user.Id);
            if (evt == null) return Results.NotFound();
            evt.Status = "Cancelled";
            await db.SaveChangesAsync();
            return Results.Ok(new { cancelled = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

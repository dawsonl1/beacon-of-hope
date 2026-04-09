using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class CaseConferenceEndpoints
{
    public static void MapCaseConferenceEndpoints(this WebApplication app)
    {
        // ── List conferences ─────────────────────────
        app.MapGet("/api/admin/case-conferences", async (AppDbContext db, int? safehouseId) =>
        {
            var query = db.CaseConferences
                .Include(c => c.Residents).ThenInclude(cr => cr.Resident)
                .Include(c => c.Safehouse)
                .AsQueryable();

            if (safehouseId.HasValue)
                query = query.Where(c => c.SafehouseId == safehouseId.Value);

            var conferences = await query
                .OrderByDescending(c => c.ScheduledDate)
                .Select(c => new
                {
                    c.ConferenceId,
                    c.SafehouseId,
                    safehouseName = c.Safehouse.Name,
                    c.ScheduledDate,
                    c.Status,
                    c.Notes,
                    c.CreatedAt,
                    residentCount = c.Residents.Count,
                    discussedCount = c.Residents.Count(r => r.Discussed),
                    residents = c.Residents.Select(cr => new
                    {
                        cr.Id,
                        cr.ResidentId,
                        residentCode = cr.Resident.InternalCode,
                        cr.Source,
                        cr.Discussed,
                        cr.Notes,
                        cr.AddedAt
                    })
                })
                .ToListAsync();

            return conferences;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Get single conference with residents ─────
        app.MapGet("/api/admin/case-conferences/{id:int}", async (int id, AppDbContext db) =>
        {
            var conf = await db.CaseConferences
                .Include(c => c.Residents).ThenInclude(cr => cr.Resident)
                .Include(c => c.Safehouse)
                .Where(c => c.ConferenceId == id)
                .Select(c => new
                {
                    c.ConferenceId,
                    c.SafehouseId,
                    safehouseName = c.Safehouse.Name,
                    c.ScheduledDate,
                    c.Status,
                    c.Notes,
                    c.CreatedAt,
                    residents = c.Residents.Select(cr => new
                    {
                        cr.Id,
                        cr.ResidentId,
                        residentCode = cr.Resident.InternalCode,
                        currentRiskLevel = cr.Resident.CurrentRiskLevel,
                        assignedSocialWorker = cr.Resident.AssignedSocialWorker,
                        cr.Source,
                        cr.Discussed,
                        cr.Notes,
                        cr.AddedAt
                    })
                })
                .FirstOrDefaultAsync();

            return conf is null ? Results.NotFound(new { error = "Conference not found." }) : Results.Ok(conf);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Create conference ────────────────────────
        app.MapPost("/api/admin/case-conferences", async (HttpContext ctx, AppDbContext db) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<CreateConferenceRequest>();
            if (body == null || body.SafehouseId <= 0)
                return Results.BadRequest(new { error = "SafehouseId is required." });

            var conf = new CaseConference
            {
                SafehouseId = body.SafehouseId,
                ScheduledDate = body.ScheduledDate,
                Status = "Scheduled",
                Notes = body.Notes,
            };

            db.CaseConferences.Add(conf);
            await db.SaveChangesAsync();

            return Results.Created($"/api/admin/case-conferences/{conf.ConferenceId}", new { conf.ConferenceId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Update conference status/notes ───────────
        app.MapPut("/api/admin/case-conferences/{id:int}", async (int id, HttpContext ctx, AppDbContext db) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<UpdateConferenceRequest>();
            var conf = await db.CaseConferences.FindAsync(id);
            if (conf == null) return Results.NotFound(new { error = "Conference not found." });

            if (body?.Status != null) conf.Status = body.Status;
            if (body?.Notes != null) conf.Notes = body.Notes;

            await db.SaveChangesAsync();
            return Results.Ok(new { conf.ConferenceId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Delete conference ────────────────────────
        app.MapDelete("/api/admin/case-conferences/{id:int}", async (int id, AppDbContext db) =>
        {
            var conf = await db.CaseConferences.FindAsync(id);
            if (conf == null) return Results.NotFound(new { error = "Conference not found." });

            db.CaseConferences.Remove(conf);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Conference deleted." });
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ── Add resident(s) to conference ────────────
        app.MapPost("/api/admin/case-conferences/{id:int}/residents", async (int id, HttpContext ctx, AppDbContext db) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<AddResidentsRequest>();
            if (body == null || body.ResidentIds == null || body.ResidentIds.Length == 0)
                return Results.BadRequest(new { error = "At least one residentId is required." });

            var conf = await db.CaseConferences.FindAsync(id);
            if (conf == null) return Results.NotFound(new { error = "Conference not found." });

            var existing = await db.CaseConferenceResidents
                .Where(cr => cr.ConferenceId == id)
                .Select(cr => cr.ResidentId)
                .ToListAsync();

            var added = 0;
            foreach (var rid in body.ResidentIds)
            {
                if (existing.Contains(rid)) continue;
                db.CaseConferenceResidents.Add(new CaseConferenceResident
                {
                    ConferenceId = id,
                    ResidentId = rid,
                    Source = body.Source ?? "Manual",
                });
                added++;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { added });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Remove resident from conference ──────────
        app.MapDelete("/api/admin/case-conferences/{confId:int}/residents/{residentId:int}", async (int confId, int residentId, AppDbContext db) =>
        {
            var cr = await db.CaseConferenceResidents
                .FirstOrDefaultAsync(x => x.ConferenceId == confId && x.ResidentId == residentId);
            if (cr == null) return Results.NotFound(new { error = "Resident not in this conference." });

            db.CaseConferenceResidents.Remove(cr);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Resident removed." });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Mark resident as discussed ───────────────
        app.MapPut("/api/admin/case-conferences/{confId:int}/residents/{residentId:int}", async (int confId, int residentId, HttpContext ctx, AppDbContext db) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<UpdateConferenceResidentRequest>();
            var cr = await db.CaseConferenceResidents
                .FirstOrDefaultAsync(x => x.ConferenceId == confId && x.ResidentId == residentId);
            if (cr == null) return Results.NotFound(new { error = "Resident not in this conference." });

            if (body?.Discussed != null) cr.Discussed = body.Discussed.Value;
            if (body?.Notes != null) cr.Notes = body.Notes;

            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Updated." });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── ML Alerts: residents needing conference ──
        app.MapGet("/api/admin/case-conferences/alerts", async (AppDbContext db) =>
        {
            var threeWeeksAgo = DateTime.UtcNow.AddDays(-21);

            // 1. Residents flagged via process recordings (needsCaseConference=true)
            //    who are NOT already in an upcoming conference
            var upcomingConferenceResidentIds = await db.CaseConferenceResidents
                .Where(cr => cr.Conference.ScheduledDate >= DateOnly.FromDateTime(DateTime.UtcNow))
                .Select(cr => cr.ResidentId)
                .Distinct()
                .ToListAsync();

            var flaggedResidents = await db.ProcessRecordings
                .Where(r => r.NeedsCaseConference == true)
                .Where(r => r.SessionDate != null)
                .OrderByDescending(r => r.SessionDate)
                .Select(r => new { r.ResidentId, r.SessionDate })
                .ToListAsync();

            // Get the most recent flagging per resident
            var flaggedByRecording = flaggedResidents
                .GroupBy(r => r.ResidentId)
                .Select(g => g.First())
                .Where(r => !upcomingConferenceResidentIds.Contains(r.ResidentId))
                .Select(r => r.ResidentId)
                .ToList();

            // 2. ML-flagged: residents whose reintegration readiness score hasn't improved by 0.04 in 3 weeks
            var mlAlertResidentIds = new List<int>();
            var reintegrationPredictions = await db.MlPredictionHistory
                .Where(p => p.EntityType == "Resident" && p.ModelName == "reintegration-readiness")
                .Where(p => p.PredictedAt >= threeWeeksAgo)
                .OrderBy(p => p.PredictedAt)
                .ToListAsync();

            var grouped = reintegrationPredictions.GroupBy(p => p.EntityId);
            foreach (var group in grouped)
            {
                if (group.Key == null) continue;
                var records = group.OrderBy(p => p.PredictedAt).ToList();
                if (records.Count < 2) continue;

                var oldest = records.First().Score ?? 0;
                var newest = records.Last().Score ?? 0;
                var improvement = newest - oldest;

                if (improvement < 4m && !upcomingConferenceResidentIds.Contains(group.Key.Value))
                {
                    mlAlertResidentIds.Add(group.Key.Value);
                }
            }

            // Combine and fetch resident details
            var allAlertIds = flaggedByRecording.Union(mlAlertResidentIds).Distinct().ToList();

            var residents = await db.Residents
                .Where(r => allAlertIds.Contains(r.ResidentId) && r.CaseStatus == "Active")
                .Select(r => new
                {
                    r.ResidentId,
                    r.InternalCode,
                    r.CurrentRiskLevel,
                    r.AssignedSocialWorker,
                    r.SafehouseId,
                    source = flaggedByRecording.Contains(r.ResidentId) && mlAlertResidentIds.Contains(r.ResidentId)
                        ? "Both"
                        : flaggedByRecording.Contains(r.ResidentId)
                            ? "NeedsConference"
                            : "MlAlert",
                })
                .ToListAsync();

            return residents;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Get or create next Monday conference for safehouse ──
        app.MapPost("/api/admin/case-conferences/ensure-next", async (HttpContext ctx, AppDbContext db) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<EnsureNextRequest>();
            if (body == null || body.SafehouseId <= 0)
                return Results.BadRequest(new { error = "SafehouseId is required." });

            var nextMonday = GetNextMonday();

            var existing = await db.CaseConferences
                .FirstOrDefaultAsync(c => c.SafehouseId == body.SafehouseId && c.ScheduledDate == nextMonday && c.Status == "Scheduled");

            if (existing != null)
                return Results.Ok(new { existing.ConferenceId, existing.ScheduledDate, created = false });

            var conf = new CaseConference
            {
                SafehouseId = body.SafehouseId,
                ScheduledDate = nextMonday,
                Status = "Scheduled",
            };
            db.CaseConferences.Add(conf);
            await db.SaveChangesAsync();

            return Results.Ok(new { conf.ConferenceId, conf.ScheduledDate, created = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }

    public static DateOnly GetNextMonday()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysUntilMonday = ((int)DayOfWeek.Monday - (int)today.DayOfWeek + 7) % 7;
        if (daysUntilMonday == 0) daysUntilMonday = 7; // If today is Monday, next Monday
        return today.AddDays(daysUntilMonday);
    }
}

// ── DTOs ─────────────────────────────────────────
public record CreateConferenceRequest(int SafehouseId, DateOnly ScheduledDate, string? Notes);
public record UpdateConferenceRequest(string? Status, string? Notes);
public record AddResidentsRequest(int[] ResidentIds, string? Source);
public record UpdateConferenceResidentRequest(bool? Discussed, string? Notes);
public record EnsureNextRequest(int SafehouseId);

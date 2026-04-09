using backend.Data;
using backend.DTOs;
using backend.Mapping;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using backend.Endpoints;

namespace backend.Endpoints;

public static class RecordingEndpoints
{
    public static void MapRecordingEndpoints(this WebApplication app)
    {
        app.MapGet("/api/admin/recordings", async (
            AppDbContext db,
            int? residentId,
            int page,
            int pageSize,
            string? sortBy) =>
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var query = db.ProcessRecordings.AsQueryable();

            if (residentId.HasValue)
                query = query.Where(r => r.ResidentId == residentId.Value);

            query = (sortBy ?? "date_desc") switch
            {
                "date_asc" => query.OrderBy(r => r.SessionDate),
                "worker" => query.OrderBy(r => r.SocialWorker).ThenByDescending(r => r.SessionDate),
                _ => query.OrderByDescending(r => r.SessionDate),
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.RecordingId,
                    r.ResidentId,
                    residentCode = db.Residents
                        .Where(res => res.ResidentId == r.ResidentId)
                        .Select(res => res.InternalCode)
                        .FirstOrDefault(),
                    r.SessionDate,
                    r.SocialWorker,
                    r.SessionType,
                    r.SessionDurationMinutes,
                    r.EmotionalStateObserved,
                    r.EmotionalStateEnd,
                    narrativePreview = r.SessionNarrative != null
                        ? r.SessionNarrative.Substring(0, Math.Min(r.SessionNarrative.Length, 120))
                        : null,
                    r.ProgressNoted,
                    r.ConcernsFlagged,
                    r.ReferralMade
                })
                .ToListAsync();

            return new { items, totalCount, page, pageSize };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/recordings/emotional-trends", async (int residentId, AppDbContext db) =>
        {
            var data = await db.ProcessRecordings
                .Where(r => r.ResidentId == residentId && r.SessionDate != null)
                .OrderBy(r => r.SessionDate)
                .Select(r => new
                {
                    r.SessionDate,
                    r.SessionType,
                    r.EmotionalStateObserved,
                    r.EmotionalStateEnd
                })
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/recordings/{id:int}", async (int id, AppDbContext db) =>
        {
            var r = await db.ProcessRecordings
                .Where(p => p.RecordingId == id)
                .Select(p => new
                {
                    p.RecordingId,
                    p.ResidentId,
                    residentCode = db.Residents
                        .Where(res => res.ResidentId == p.ResidentId)
                        .Select(res => res.InternalCode)
                        .FirstOrDefault(),
                    p.SessionDate,
                    p.SocialWorker,
                    p.SessionType,
                    p.SessionDurationMinutes,
                    p.EmotionalStateObserved,
                    p.EmotionalStateEnd,
                    p.SessionNarrative,
                    p.InterventionsApplied,
                    p.FollowUpActions,
                    p.ProgressNoted,
                    p.ConcernsFlagged,
                    p.ReferralMade,
                    p.NotesRestricted,
                    p.NeedsCaseConference,
                    p.ReadyForReintegration
                })
                .FirstOrDefaultAsync();

            return r is null ? Results.NotFound(new { error = "Recording not found." }) : Results.Ok(r);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/recordings", async (HttpContext httpContext, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<RecordingRequest>();
            if (body == null || body.ResidentId <= 0)
                return Results.BadRequest(new { error = "Resident is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });

            var resident = await db.Residents.AnyAsync(r => r.ResidentId == body.ResidentId);
            if (!resident)
                return Results.BadRequest(new { error = "Resident not found." });
            var denied = await SafehouseAuth.ValidateResidentAccess(httpContext, db, body.ResidentId);
            if (denied != null) return denied;

            var recording = new ProcessRecording();
            EntityMapper.MapRecording(recording, body);

            db.ProcessRecordings.Add(recording);

            if (!string.IsNullOrWhiteSpace(body.UpdatedRiskLevel))
            {
                var res = await db.Residents.FindAsync(body.ResidentId);
                if (res != null) res.CurrentRiskLevel = body.UpdatedRiskLevel;
            }

            await db.SaveChangesAsync();

            // Auto-add resident to next Monday's case conference if flagged
            if (body.NeedsCaseConference == true)
            {
                var resEntity = await db.Residents.FindAsync(body.ResidentId);
                if (resEntity?.SafehouseId != null)
                {
                    var nextMonday = CaseConferenceEndpoints.GetNextMonday();
                    var conf = await db.CaseConferences
                        .FirstOrDefaultAsync(c => c.SafehouseId == resEntity.SafehouseId && c.ScheduledDate == nextMonday && c.Status == "Scheduled");
                    if (conf == null)
                    {
                        conf = new CaseConference { SafehouseId = resEntity.SafehouseId.Value, ScheduledDate = nextMonday, Status = "Scheduled" };
                        db.CaseConferences.Add(conf);
                        await db.SaveChangesAsync();
                    }
                    var alreadyAdded = await db.CaseConferenceResidents
                        .AnyAsync(cr => cr.ConferenceId == conf.ConferenceId && cr.ResidentId == body.ResidentId);
                    if (!alreadyAdded)
                    {
                        db.CaseConferenceResidents.Add(new CaseConferenceResident
                        {
                            ConferenceId = conf.ConferenceId,
                            ResidentId = body.ResidentId,
                            Source = "NeedsConference",
                        });
                        await db.SaveChangesAsync();
                    }
                }
            }

            return Results.Created($"/api/admin/recordings/{recording.RecordingId}", new { recording.RecordingId });
        }).RequireAuthorization(policy => policy.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/recordings/{id:int}", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<RecordingRequest>();
            if (body == null)
                return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });

            var recording = await db.ProcessRecordings.FindAsync(id);
            if (recording == null)
                return Results.NotFound(new { error = "Recording not found." });

            EntityMapper.MapRecording(recording, body);

            if (!string.IsNullOrWhiteSpace(body.UpdatedRiskLevel))
            {
                var res = await db.Residents.FindAsync(recording.ResidentId);
                if (res != null) res.CurrentRiskLevel = body.UpdatedRiskLevel;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { recording.RecordingId });
        }).RequireAuthorization(policy => policy.RequireRole("Admin", "Staff"));

        app.MapDelete("/api/admin/recordings/{id:int}", async (int id, AppDbContext db) =>
        {
            var recording = await db.ProcessRecordings.FindAsync(id);
            if (recording == null)
                return Results.NotFound(new { error = "Recording not found." });

            db.ProcessRecordings.Remove(recording);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Recording deleted." });
        }).RequireAuthorization(policy => policy.RequireRole("Admin"));
    }
}

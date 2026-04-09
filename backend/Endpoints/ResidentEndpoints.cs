using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class ResidentEndpoints
{
    public static void MapResidentEndpoints(this WebApplication app)
    {
        // ── Education Records ───────────────────────────────────────

        app.MapGet("/api/admin/education-records", async (AppDbContext db, int? residentId) =>
        {
            var query = db.EducationRecords.AsQueryable();
            if (residentId.HasValue) query = query.Where(e => e.ResidentId == residentId.Value);
            var items = await query.OrderByDescending(e => e.RecordDate)
                .Select(e => new { e.EducationRecordId, e.ResidentId, residentCode = e.Resident.InternalCode, e.RecordDate, e.EducationLevel, e.AttendanceRate, e.ProgressPercent, e.CompletionStatus, e.Notes, e.SchoolName, e.EnrollmentStatus })
                .ToListAsync();
            return Results.Ok(items);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/education-records", async (HttpContext httpContext, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<EducationRecordRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            var record = new EducationRecord { ResidentId = body.ResidentId, RecordDate = body.RecordDate, EducationLevel = body.EducationLevel, AttendanceRate = body.AttendanceRate, ProgressPercent = body.ProgressPercent, CompletionStatus = body.CompletionStatus, Notes = body.Notes, SchoolName = body.SchoolName, EnrollmentStatus = body.EnrollmentStatus };
            db.EducationRecords.Add(record);
            await db.SaveChangesAsync();
            return Results.Ok(new { record.EducationRecordId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/education-records/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var record = await db.EducationRecords.FindAsync(id);
            if (record == null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<EducationRecordRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            record.RecordDate = body.RecordDate; record.EducationLevel = body.EducationLevel; record.AttendanceRate = body.AttendanceRate; record.ProgressPercent = body.ProgressPercent; record.CompletionStatus = body.CompletionStatus; record.Notes = body.Notes; record.SchoolName = body.SchoolName; record.EnrollmentStatus = body.EnrollmentStatus;
            await db.SaveChangesAsync();
            return Results.Ok(new { updated = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Health Records ──────────────────────────────────────────

        app.MapGet("/api/admin/health-records", async (AppDbContext db, int? residentId) =>
        {
            var query = db.HealthWellbeingRecords.AsQueryable();
            if (residentId.HasValue) query = query.Where(h => h.ResidentId == residentId.Value);
            var items = await query.OrderByDescending(h => h.RecordDate)
                .Select(h => new { h.HealthRecordId, h.ResidentId, residentCode = h.Resident.InternalCode, h.RecordDate, h.WeightKg, h.HeightCm, h.Bmi, h.NutritionScore, h.SleepQualityScore, h.EnergyLevelScore, h.GeneralHealthScore, h.MedicalCheckupDone, h.DentalCheckupDone, h.PsychologicalCheckupDone, h.Notes })
                .ToListAsync();
            return Results.Ok(items);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/health-records", async (HttpContext httpContext, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<HealthRecordRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            var record = new HealthWellbeingRecord { ResidentId = body.ResidentId, RecordDate = body.RecordDate, WeightKg = body.WeightKg, HeightCm = body.HeightCm, Bmi = body.Bmi, NutritionScore = body.NutritionScore, SleepQualityScore = body.SleepQualityScore, EnergyLevelScore = body.EnergyLevelScore, GeneralHealthScore = body.GeneralHealthScore, MedicalCheckupDone = body.MedicalCheckupDone, DentalCheckupDone = body.DentalCheckupDone, PsychologicalCheckupDone = body.PsychologicalCheckupDone, Notes = body.Notes };
            db.HealthWellbeingRecords.Add(record);
            await db.SaveChangesAsync();
            return Results.Ok(new { record.HealthRecordId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/health-records/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var record = await db.HealthWellbeingRecords.FindAsync(id);
            if (record == null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<HealthRecordRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            record.RecordDate = body.RecordDate; record.WeightKg = body.WeightKg; record.HeightCm = body.HeightCm; record.Bmi = body.Bmi; record.NutritionScore = body.NutritionScore; record.SleepQualityScore = body.SleepQualityScore; record.EnergyLevelScore = body.EnergyLevelScore; record.GeneralHealthScore = body.GeneralHealthScore; record.MedicalCheckupDone = body.MedicalCheckupDone; record.DentalCheckupDone = body.DentalCheckupDone; record.PsychologicalCheckupDone = body.PsychologicalCheckupDone; record.Notes = body.Notes;
            await db.SaveChangesAsync();
            return Results.Ok(new { updated = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Intervention Plans ──────────────────────────────────────

        app.MapGet("/api/admin/intervention-plans", async (HttpContext httpContext, AppDbContext db, int? residentId) =>
        {
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var query = db.InterventionPlans.AsQueryable();
            if (allowed != null)
                query = query.Where(p => db.Residents.Any(r => r.ResidentId == p.ResidentId && r.SafehouseId.HasValue && allowed.Contains(r.SafehouseId.Value)));
            if (residentId.HasValue) query = query.Where(p => p.ResidentId == residentId.Value);
            var items = await query.OrderByDescending(p => p.CreatedAt)
                .Select(p => new { p.PlanId, p.ResidentId, residentCode = p.Resident.InternalCode, p.PlanCategory, p.PlanDescription, p.ServicesProvided, p.TargetValue, p.TargetDate, p.Status, p.CaseConferenceDate, p.CreatedAt, p.UpdatedAt })
                .ToListAsync();
            return Results.Ok(items);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/intervention-plans", async (HttpContext httpContext, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<InterventionPlanRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            var plan = new InterventionPlan { ResidentId = body.ResidentId, PlanCategory = body.PlanCategory, PlanDescription = body.PlanDescription, ServicesProvided = body.ServicesProvided, TargetValue = body.TargetValue, TargetDate = body.TargetDate, Status = body.Status ?? "Open", CaseConferenceDate = body.CaseConferenceDate, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            db.InterventionPlans.Add(plan);
            await db.SaveChangesAsync();
            return Results.Ok(new { plan.PlanId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/intervention-plans/{id}", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var plan = await db.InterventionPlans.FindAsync(id);
            if (plan == null) return Results.NotFound();
            var body = await httpContext.Request.ReadFromJsonAsync<InterventionPlanRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });
            plan.PlanCategory = body.PlanCategory; plan.PlanDescription = body.PlanDescription; plan.ServicesProvided = body.ServicesProvided; plan.TargetValue = body.TargetValue; plan.TargetDate = body.TargetDate; plan.Status = body.Status ?? plan.Status; plan.CaseConferenceDate = body.CaseConferenceDate; plan.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { updated = true });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapDelete("/api/admin/intervention-plans/{id}", async (int id, AppDbContext db) =>
        {
            var plan = await db.InterventionPlans.FindAsync(id);
            if (plan == null) return Results.NotFound();
            db.InterventionPlans.Remove(plan);
            await db.SaveChangesAsync();
            return Results.Ok(new { deleted = true });
        }).RequireAuthorization("AdminOnly");

        // ── Post-Placement Monitoring ────────────────────────────────

        app.MapGet("/api/admin/post-placement", async (HttpContext httpContext, AppDbContext db, int? safehouseId) =>
        {
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var query = db.Residents.Where(r => r.ReintegrationStatus == "Completed" || r.CaseStatus == "Closed" || r.CaseStatus == "Discharged");
            query = SafehouseAuth.ApplyResidentFilter(query, allowed, safehouseId);

            var residents = await query.OrderByDescending(r => r.DateClosed)
                .Select(r => new
                {
                    r.ResidentId,
                    r.InternalCode,
                    r.CaseControlNo,
                    r.SafehouseId,
                    safehouse = r.Safehouse != null ? r.Safehouse.Name : null,
                    r.CaseStatus,
                    r.ReintegrationType,
                    r.ReintegrationStatus,
                    r.DateClosed,
                    r.AssignedSocialWorker,
                    r.CurrentRiskLevel,
                    lastVisit = r.HomeVisitations
                        .Where(v => v.VisitType == "Post-Placement Monitoring")
                        .OrderByDescending(v => v.VisitDate)
                        .Select(v => v.VisitDate)
                        .FirstOrDefault(),
                    totalVisits = r.HomeVisitations.Count(v => v.VisitType == "Post-Placement Monitoring"),
                })
                .ToListAsync();

            return Results.Ok(residents);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/post-placement/summary", async (AppDbContext db, int? safehouseId) =>
        {
            var query = db.Residents.Where(r => r.ReintegrationStatus == "Completed" || r.CaseStatus == "Closed" || r.CaseStatus == "Discharged");
            if (safehouseId.HasValue) query = query.Where(r => r.SafehouseId == safehouseId.Value);

            var total = await query.CountAsync();
            var byType = await query.GroupBy(r => r.ReintegrationType).Select(g => new { type = g.Key, count = g.Count() }).ToListAsync();
            var byStatus = await query.GroupBy(r => r.CaseStatus).Select(g => new { status = g.Key, count = g.Count() }).ToListAsync();

            return Results.Ok(new { total, byType, byStatus });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

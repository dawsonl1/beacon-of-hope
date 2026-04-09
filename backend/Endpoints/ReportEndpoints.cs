using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class ReportEndpoints
{
    public static void MapReportEndpoints(this WebApplication app)
    {
        app.MapGet("/api/admin/reports/donations-by-source", async (AppDbContext db) =>
        {
            var data = await db.Donations
                .Where(d => d.ChannelSource != null && d.Amount != null && d.DonationDate <= AppConstants.DataCutoff)
                .GroupBy(d => d.ChannelSource)
                .Select(g => new
                {
                    source = g.Key,
                    total = g.Sum(d => (decimal?)d.Amount ?? 0),
                    count = g.Count()
                })
                .OrderByDescending(x => x.total)
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/reports/donations-by-campaign", async (AppDbContext db) =>
        {
            var data = await db.Donations
                .Where(d => d.CampaignName != null && d.Amount != null && d.DonationDate <= AppConstants.DataCutoff)
                .GroupBy(d => d.CampaignName)
                .Select(g => new
                {
                    campaign = g.Key,
                    total = g.Sum(d => (decimal?)d.Amount ?? 0),
                    count = g.Count()
                })
                .OrderByDescending(x => x.total)
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/reports/resident-outcomes", async (AppDbContext db) =>
        {
            var total = await db.Residents.CountAsync();

            var byType = await db.Residents
                .Where(r => r.ReintegrationStatus == "Completed" && r.ReintegrationType != null)
                .GroupBy(r => r.ReintegrationType)
                .Select(g => new
                {
                    type = g.Key,
                    count = g.Count()
                })
                .OrderByDescending(x => x.count)
                .ToListAsync();

            var completedTotal = byType.Sum(b => b.count);
            var successRate = total > 0 ? Math.Round((double)completedTotal / total * 100, 1) : 0;

            var avgLengthOfStay = await db.Residents
                .Where(r => r.ReintegrationStatus == "Completed"
                    && r.DateOfAdmission != null && r.DateClosed != null)
                .Select(r => (double)(r.DateClosed!.Value.DayNumber - r.DateOfAdmission!.Value.DayNumber))
                .DefaultIfEmpty(0)
                .AverageAsync();

            return new
            {
                totalResidents = total,
                completedReintegrations = completedTotal,
                successRate,
                avgLengthOfStayDays = Math.Round(avgLengthOfStay, 0),
                byType
            };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/reports/safehouse-comparison", async (AppDbContext db) =>
        {
            var safehouses = await db.Safehouses
                .Select(s => new
                {
                    s.SafehouseId,
                    s.SafehouseCode,
                    s.Name,
                    s.City,
                    s.Status,
                    s.CapacityGirls,
                    s.CurrentOccupancy
                })
                .ToListAsync();

            var activeResidentsBySafehouse = await db.Residents
                .Where(r => r.CaseStatus == "Active" && r.SafehouseId != null)
                .GroupBy(r => r.SafehouseId)
                .Select(g => new { safehouseId = g.Key, count = g.Count() })
                .ToListAsync();

            var incidentsBySafehouse = await db.IncidentReports
                .Where(i => i.SafehouseId != null)
                .GroupBy(i => i.SafehouseId)
                .Select(g => new { safehouseId = g.Key, count = g.Count() })
                .ToListAsync();

            var recordingsBySafehouse = await db.ProcessRecordings
                .Join(db.Residents, p => p.ResidentId, r => r.ResidentId, (p, r) => new { p, r })
                .Where(x => x.r.SafehouseId != null)
                .GroupBy(x => x.r.SafehouseId)
                .Select(g => new { safehouseId = g.Key, count = g.Count() })
                .ToListAsync();

            var educationBySafehouse = await db.EducationRecords
                .Where(e => e.ProgressPercent != null)
                .Join(db.Residents, e => e.ResidentId, r => r.ResidentId, (e, r) => new { e, r })
                .Where(x => x.r.SafehouseId != null)
                .GroupBy(x => x.r.SafehouseId)
                .Select(g => new { safehouseId = g.Key, avgEducation = Math.Round(g.Average(x => (double?)x.e.ProgressPercent ?? 0), 1) })
                .ToListAsync();

            var healthBySafehouse = await db.HealthWellbeingRecords
                .Where(h => h.GeneralHealthScore != null)
                .Join(db.Residents, h => h.ResidentId, r => r.ResidentId, (h, r) => new { h, r })
                .Where(x => x.r.SafehouseId != null)
                .GroupBy(x => x.r.SafehouseId)
                .Select(g => new { safehouseId = g.Key, avgHealth = Math.Round(g.Average(x => (double?)x.h.GeneralHealthScore ?? 0), 2) })
                .ToListAsync();

            var result = safehouses.Select(s =>
            {
                var active = activeResidentsBySafehouse.FirstOrDefault(a => a.safehouseId == s.SafehouseId);
                var incidents = incidentsBySafehouse.FirstOrDefault(i => i.safehouseId == s.SafehouseId);
                var recordings = recordingsBySafehouse.FirstOrDefault(r => r.safehouseId == s.SafehouseId);
                var education = educationBySafehouse.FirstOrDefault(e => e.safehouseId == s.SafehouseId);
                var health = healthBySafehouse.FirstOrDefault(h => h.safehouseId == s.SafehouseId);
                var occupancyPct = s.CapacityGirls > 0 ? Math.Round((double)(s.CurrentOccupancy ?? 0) / s.CapacityGirls.Value * 100, 1) : 0;

                return new
                {
                    s.SafehouseId,
                    s.SafehouseCode,
                    s.Name,
                    s.City,
                    s.Status,
                    s.CapacityGirls,
                    s.CurrentOccupancy,
                    occupancyPct,
                    activeResidents = active?.count ?? 0,
                    incidents = incidents?.count ?? 0,
                    recordings = recordings?.count ?? 0,
                    avgEducation = education?.avgEducation ?? 0,
                    avgHealth = health?.avgHealth ?? 0
                };
            }).ToList();

            return result;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/reports/reintegration-rates", async (AppDbContext db) =>
        {
            var byTypeAndSafehouse = await db.Residents
                .Where(r => r.ReintegrationStatus == "Completed"
                    && r.ReintegrationType != null && r.SafehouseId != null)
                .Join(db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => new { r, s })
                .GroupBy(x => new { x.r.ReintegrationType, x.s.SafehouseCode })
                .Select(g => new
                {
                    type = g.Key.ReintegrationType,
                    safehouse = g.Key.SafehouseCode,
                    count = g.Count()
                })
                .OrderBy(x => x.safehouse).ThenByDescending(x => x.count)
                .ToListAsync();

            var totalBySafehouse = await db.Residents
                .Where(r => r.SafehouseId != null)
                .Join(db.Safehouses, r => r.SafehouseId, s => s.SafehouseId, (r, s) => new { r, s })
                .GroupBy(x => x.s.SafehouseCode)
                .Select(g => new
                {
                    safehouse = g.Key,
                    total = g.Count(),
                    completed = g.Count(x => x.r.ReintegrationStatus == "Completed")
                })
                .ToListAsync();

            return new { byTypeAndSafehouse, totalBySafehouse };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/reports/safehouse-trends", async (AppDbContext db) =>
        {
            var cutoff = AppConstants.DataCutoff.AddMonths(-6);
            var incidents = await db.IncidentReports
                .Where(i => i.SafehouseId != null && i.IncidentDate != null && i.IncidentDate >= cutoff && i.IncidentDate <= AppConstants.DataCutoff)
                .GroupBy(i => new { i.SafehouseId, i.IncidentDate!.Value.Year, i.IncidentDate!.Value.Month })
                .Select(g => new { safehouseId = g.Key.SafehouseId, year = g.Key.Year, month = g.Key.Month, incidents = g.Count() })
                .ToListAsync();
            var codes = await db.Safehouses.Select(s => new { s.SafehouseId, s.SafehouseCode }).ToListAsync();
            var result = incidents.Select(i => new
            {
                safehouseCode = codes.FirstOrDefault(c => c.SafehouseId == i.safehouseId)?.SafehouseCode ?? "Unknown",
                i.year, i.month, i.incidents
            }).OrderBy(x => x.year).ThenBy(x => x.month).ToList();
            return result;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── AAR Summary ──────────────────────────────────────────

        app.MapGet("/api/admin/reports/aar-summary", async (AppDbContext db) =>
        {
            // Caring: health/wellbeing records + intervention plans (shelter, nutrition, basic needs)
            var caringHealthCount = await db.HealthWellbeingRecords.CountAsync();
            var caringHealthBeneficiaries = await db.HealthWellbeingRecords.Select(h => h.ResidentId).Distinct().CountAsync();
            var caringPlanCount = await db.InterventionPlans.CountAsync();
            var caringPlanBeneficiaries = await db.InterventionPlans.Select(p => p.ResidentId).Distinct().CountAsync();
            var caringBeneficiaries = await db.HealthWellbeingRecords.Select(h => h.ResidentId)
                .Union(db.InterventionPlans.Select(p => p.ResidentId))
                .Distinct().CountAsync();

            // Healing: process recordings (counseling sessions)
            var healingCount = await db.ProcessRecordings.CountAsync();
            var healingBeneficiaries = await db.ProcessRecordings.Select(r => r.ResidentId).Distinct().CountAsync();

            // Teaching: education records
            var teachingCount = await db.EducationRecords.CountAsync();
            var teachingBeneficiaries = await db.EducationRecords.Select(e => e.ResidentId).Distinct().CountAsync();

            // Total unique beneficiaries across all services
            var totalBeneficiaries = await db.HealthWellbeingRecords.Select(h => h.ResidentId)
                .Union(db.InterventionPlans.Select(p => p.ResidentId))
                .Union(db.ProcessRecordings.Select(r => r.ResidentId))
                .Union(db.EducationRecords.Select(e => e.ResidentId))
                .Distinct().CountAsync();

            var categories = new[]
            {
                new {
                    category = "Caring",
                    serviceCount = caringHealthCount + caringPlanCount,
                    beneficiaryCount = caringBeneficiaries,
                    services = new[]
                    {
                        new { service = "Health & Wellbeing Records", count = caringHealthCount, beneficiaries = caringHealthBeneficiaries },
                        new { service = "Intervention Plans", count = caringPlanCount, beneficiaries = caringPlanBeneficiaries },
                    }
                },
                new {
                    category = "Healing",
                    serviceCount = healingCount,
                    beneficiaryCount = healingBeneficiaries,
                    services = new[]
                    {
                        new { service = "Counseling Sessions", count = healingCount, beneficiaries = healingBeneficiaries },
                    }
                },
                new {
                    category = "Teaching",
                    serviceCount = teachingCount,
                    beneficiaryCount = teachingBeneficiaries,
                    services = new[]
                    {
                        new { service = "Education Records", count = teachingCount, beneficiaries = teachingBeneficiaries },
                    }
                },
            };

            return new { categories, totalBeneficiaries };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

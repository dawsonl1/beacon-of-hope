using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Mapping;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        // ── User Management (Admin only) ────────────────────────────

        app.MapGet("/api/admin/users", async (UserManager<ApplicationUser> userManager, AppDbContext db) =>
        {
            var users = userManager.Users.ToList();
            var allAssignments = await db.UserSafehouses
                .Join(db.Safehouses, us => us.SafehouseId, s => s.SafehouseId,
                    (us, s) => new { us.UserId, s.SafehouseId, s.SafehouseCode, s.Name })
                .ToListAsync();
            var result = new List<object>();
            foreach (var u in users)
            {
                var roles = await userManager.GetRolesAsync(u);
                var safehouses = allAssignments.Where(a => a.UserId == u.Id)
                    .Select(a => new { a.SafehouseId, a.SafehouseCode, a.Name }).ToList();
                result.Add(new
                {
                    id = u.Id,
                    email = u.Email,
                    firstName = u.FirstName,
                    lastName = u.LastName,
                    roles = roles.ToList(),
                    supporterId = u.SupporterId,
                    safehouses
                });
            }
            return result;
        }).RequireAuthorization("AdminOnly");

        app.MapPost("/api/admin/users", async (
            UserManager<ApplicationUser> userManager,
            AppDbContext db,
            HttpContext httpContext) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<CreateUserRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
                return Results.BadRequest(new { error = "Email and password are required." });
            if (string.IsNullOrWhiteSpace(body.Role))
                return Results.BadRequest(new { error = "Role is required." });

            var existing = await userManager.FindByEmailAsync(body.Email);
            if (existing != null)
                return Results.BadRequest(new { error = "A user with this email already exists." });

            var user = new ApplicationUser
            {
                UserName = body.Email,
                Email = body.Email,
                FirstName = body.FirstName ?? "",
                LastName = body.LastName ?? "",
                EmailConfirmed = true,
            };
            var result = await userManager.CreateAsync(user, body.Password);
            if (!result.Succeeded)
                return Results.BadRequest(new { error = string.Join("; ", result.Errors.Select(e => e.Description)) });

            await userManager.AddToRoleAsync(user, body.Role);

            if (body.SafehouseIds != null && body.SafehouseIds.Count > 0)
            {
                foreach (var sid in body.SafehouseIds)
                    db.UserSafehouses.Add(new UserSafehouse { UserId = user.Id, SafehouseId = sid });
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { id = user.Id, email = user.Email, role = body.Role });
        }).RequireAuthorization("AdminOnly");

        app.MapDelete("/api/admin/users/{id}", async (
            string id,
            HttpContext context,
            UserManager<ApplicationUser> userManager) =>
        {
            var currentUserId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (id == currentUserId)
                return Results.BadRequest(new { error = "Cannot delete your own account." });

            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound();
            await userManager.DeleteAsync(user);
            return Results.Ok(new { deleted = true });
        }).RequireAuthorization("AdminOnly");

        app.MapPut("/api/admin/users/{id}", async (
            string id,
            UserManager<ApplicationUser> userManager,
            AppDbContext db,
            HttpContext httpContext) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<UpdateUserRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });

            var user = await userManager.FindByIdAsync(id);
            if (user == null) return Results.NotFound();

            if (body.FirstName != null) user.FirstName = body.FirstName;
            if (body.LastName != null) user.LastName = body.LastName;

            if (!string.IsNullOrWhiteSpace(body.Email) && body.Email != user.Email)
            {
                var existing = await userManager.FindByEmailAsync(body.Email);
                if (existing != null && existing.Id != id)
                    return Results.BadRequest(new { error = "A user with this email already exists." });
                user.Email = body.Email;
                user.UserName = body.Email;
            }

            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
                return Results.BadRequest(new { error = string.Join("; ", updateResult.Errors.Select(e => e.Description)) });

            if (!string.IsNullOrWhiteSpace(body.Role))
            {
                var currentRoles = await userManager.GetRolesAsync(user);
                if (!currentRoles.Contains(body.Role))
                {
                    await userManager.RemoveFromRolesAsync(user, currentRoles);
                    await userManager.AddToRoleAsync(user, body.Role);
                }
            }

            if (body.SafehouseIds != null)
            {
                var existingAssignments = await db.UserSafehouses.Where(us => us.UserId == id).ToListAsync();
                db.UserSafehouses.RemoveRange(existingAssignments);
                foreach (var sid in body.SafehouseIds)
                    db.UserSafehouses.Add(new UserSafehouse { UserId = id, SafehouseId = sid });
                await db.SaveChangesAsync();
            }

            return Results.Ok(new { updated = true });
        }).RequireAuthorization("AdminOnly");

        // ── Admin partners list ─────────────────────────────────

        app.MapGet("/api/admin/partners", async (AppDbContext db, string? search, string? status, string? partnerType, int page = 1, int pageSize = 20) =>
        {
            if (pageSize > 100) pageSize = 100;
            var q = db.Partners.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(p =>
                    (p.PartnerName != null && p.PartnerName.ToLower().Contains(s)) ||
                    (p.ContactName != null && p.ContactName.ToLower().Contains(s)) ||
                    (p.Email != null && p.Email.ToLower().Contains(s)));
            }
            if (!string.IsNullOrWhiteSpace(status))
                q = q.Where(p => p.Status == status);
            if (!string.IsNullOrWhiteSpace(partnerType))
                q = q.Where(p => p.PartnerType == partnerType);

            var totalCount = await q.CountAsync();
            var items = await q
                .OrderByDescending(p => p.StartDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.PartnerId,
                    p.PartnerName,
                    p.PartnerType,
                    p.RoleType,
                    p.ContactName,
                    p.Email,
                    p.Phone,
                    p.Region,
                    p.Status,
                    p.StartDate,
                    p.Notes
                })
                .ToListAsync();

            return new { items, totalCount, page, pageSize };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/partners/{id:int}", async (int id, AppDbContext db) =>
        {
            var p = await db.Partners.FindAsync(id);
            if (p == null) return Results.NotFound();
            return Results.Ok(new
            {
                p.PartnerId, p.PartnerName, p.PartnerType, p.RoleType,
                p.ContactName, p.Email, p.Phone, p.Region, p.Status,
                p.StartDate, p.EndDate, p.Notes
            });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/partners", async (AppDbContext db, HttpContext httpContext) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<PartnerAdminRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            if (string.IsNullOrWhiteSpace(body.PartnerName) && string.IsNullOrWhiteSpace(body.ContactName))
                return Results.BadRequest(new { error = "Partner name or contact name is required." });
            await db.Database.ExecuteSqlRawAsync(
                "SELECT setval(pg_get_serial_sequence('partners', 'partner_id'), (SELECT COALESCE(MAX(partner_id), 0) FROM partners))");
            var partner = new backend.Models.Partner
            {
                PartnerName = body.PartnerName?.Trim() ?? body.ContactName?.Trim(),
                PartnerType = body.PartnerType?.Trim() ?? "Organization",
                RoleType = body.RoleType?.Trim(),
                ContactName = body.ContactName?.Trim(),
                Email = body.Email?.Trim(),
                Phone = body.Phone?.Trim(),
                Region = body.Region?.Trim(),
                Status = body.Status?.Trim() ?? "Prospective",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Notes = body.Notes?.Trim(),
            };
            db.Partners.Add(partner);
            await db.SaveChangesAsync();
            return Results.Ok(new { partner.PartnerId });
        }).RequireAuthorization("AdminOnly");

        app.MapPut("/api/admin/partners/{id:int}", async (int id, AppDbContext db, HttpContext httpContext) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<PartnerAdminRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var partner = await db.Partners.FindAsync(id);
            if (partner == null) return Results.NotFound();
            partner.PartnerName = body.PartnerName?.Trim() ?? partner.PartnerName;
            partner.PartnerType = body.PartnerType?.Trim() ?? partner.PartnerType;
            partner.RoleType = body.RoleType?.Trim();
            partner.ContactName = body.ContactName?.Trim();
            partner.Email = body.Email?.Trim();
            partner.Phone = body.Phone?.Trim();
            partner.Region = body.Region?.Trim();
            partner.Status = body.Status?.Trim() ?? partner.Status;
            partner.Notes = body.Notes?.Trim();
            await db.SaveChangesAsync();
            return Results.Ok(new { partner.PartnerId });
        }).RequireAuthorization("AdminOnly");

        app.MapDelete("/api/admin/partners/{id:int}", async (int id, AppDbContext db) =>
        {
            var partner = await db.Partners.FindAsync(id);
            if (partner == null) return Results.NotFound();
            db.Partners.Remove(partner);
            await db.SaveChangesAsync();
            return Results.Ok(new { deleted = true });
        }).RequireAuthorization("AdminOnly");

        // ── Admin metrics ──────────────────────────────────────────

        app.MapGet("/api/admin/metrics", async (AppDbContext db, int? safehouseId) =>
        {
            var refDate = AppConstants.DataCutoff;
            var startOfMonth = new DateOnly(refDate.Year, refDate.Month, 1);
            var startOfLastMonth = startOfMonth.AddMonths(-1);

            var residentsQuery = db.Residents.Where(r => r.CaseStatus == "Active");
            if (safehouseId.HasValue) residentsQuery = residentsQuery.Where(r => r.SafehouseId == safehouseId.Value);
            var activeResidents = await residentsQuery.CountAsync();

            var incidentsQuery = db.IncidentReports.Where(i => i.Resolved != true);
            if (safehouseId.HasValue) incidentsQuery = incidentsQuery.Where(i => i.SafehouseId == safehouseId.Value);
            var incidents = await incidentsQuery
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    total = g.Count(),
                    critical = g.Count(i => i.Severity == "Critical"),
                    high = g.Count(i => i.Severity == "High")
                })
                .FirstOrDefaultAsync() ?? new { total = 0, critical = 0, high = 0 };

            var currentMonth = await db.Donations
                .Where(d => d.DonationDate >= startOfMonth)
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    total = g.Sum(d => (decimal?)d.Amount ?? 0),
                    count = g.Count()
                })
                .FirstOrDefaultAsync() ?? new { total = 0m, count = 0 };

            var lastMonthDonations = await db.Donations
                .Where(d => d.DonationDate >= startOfLastMonth && d.DonationDate < startOfMonth)
                .SumAsync(d => (decimal?)d.Amount ?? 0);

            var conferencesQuery = db.InterventionPlans.AsQueryable();
            if (safehouseId.HasValue)
                conferencesQuery = conferencesQuery.Where(p => db.Residents.Any(r => r.ResidentId == p.ResidentId && r.SafehouseId == safehouseId.Value));

            var nextConference = await conferencesQuery
                .Where(p => p.CaseConferenceDate > refDate)
                .OrderBy(p => p.CaseConferenceDate)
                .Select(p => p.CaseConferenceDate)
                .FirstOrDefaultAsync();

            var upcomingConferences = await conferencesQuery
                .CountAsync(p => p.CaseConferenceDate > refDate);

            var donationChange = lastMonthDonations > 0
                ? Math.Round((double)(currentMonth.total - lastMonthDonations) / (double)lastMonthDonations * 100, 1)
                : 0;

            var openIncidents = incidents.total;
            var criticalIncidents = incidents.critical;
            var highIncidents = incidents.high;
            var monthlyDonations = currentMonth.total;
            var monthlyDonationCount = currentMonth.count;

            return new
            {
                activeResidents,
                openIncidents,
                criticalIncidents,
                highIncidents,
                monthlyDonations,
                monthlyDonationCount,
                donationChange,
                upcomingConferences,
                nextConference,
                dataAsOf = refDate.ToString("MMMM d, yyyy")
            };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Residents CRUD ──────────────────────────────────────────

        app.MapGet("/api/admin/residents", async (
            AppDbContext db,
            int page = 1,
            int pageSize = 20,
            string? search = null,
            string? caseStatus = null,
            int? safehouseId = null,
            string? caseCategory = null,
            string? riskLevel = null,
            string? sortBy = null,
            string? sortDir = null) =>
        {
            var query = db.Residents.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(r =>
                    (r.InternalCode != null && r.InternalCode.ToLower().Contains(s)) ||
                    (r.CaseControlNo != null && r.CaseControlNo.ToLower().Contains(s)) ||
                    (r.AssignedSocialWorker != null && r.AssignedSocialWorker.ToLower().Contains(s)));
            }
            if (!string.IsNullOrWhiteSpace(caseStatus))
                query = query.Where(r => r.CaseStatus == caseStatus);
            if (safehouseId.HasValue)
                query = query.Where(r => r.SafehouseId == safehouseId.Value);
            if (!string.IsNullOrWhiteSpace(caseCategory))
                query = query.Where(r => r.CaseCategory == caseCategory);
            if (!string.IsNullOrWhiteSpace(riskLevel))
                query = query.Where(r => r.CurrentRiskLevel == riskLevel);

            var totalCount = await query.CountAsync();

            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            query = sortBy?.ToLower() switch
            {
                "internalcode" => desc ? query.OrderByDescending(r => r.InternalCode) : query.OrderBy(r => r.InternalCode),
                "casecontrolno" => desc ? query.OrderByDescending(r => r.CaseControlNo) : query.OrderBy(r => r.CaseControlNo),
                "casestatus" => desc ? query.OrderByDescending(r => r.CaseStatus) : query.OrderBy(r => r.CaseStatus),
                "casecategory" => desc ? query.OrderByDescending(r => r.CaseCategory) : query.OrderBy(r => r.CaseCategory),
                "risklevel" => desc
                    ? query.OrderByDescending(r => r.CurrentRiskLevel == "Critical" ? 0 : r.CurrentRiskLevel == "High" ? 1 : r.CurrentRiskLevel == "Medium" ? 2 : r.CurrentRiskLevel == "Low" ? 3 : 4)
                    : query.OrderBy(r => r.CurrentRiskLevel == "Critical" ? 0 : r.CurrentRiskLevel == "High" ? 1 : r.CurrentRiskLevel == "Medium" ? 2 : r.CurrentRiskLevel == "Low" ? 3 : 4),
                "dateofadmission" => desc ? query.OrderByDescending(r => r.DateOfAdmission) : query.OrderBy(r => r.DateOfAdmission),
                "socialworker" => desc ? query.OrderByDescending(r => r.AssignedSocialWorker) : query.OrderBy(r => r.AssignedSocialWorker),
                _ => query.OrderByDescending(r => r.DateOfAdmission)
            };

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            if (pageSize > 100) pageSize = 100;

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.ResidentId,
                    r.InternalCode,
                    r.CaseControlNo,
                    r.SafehouseId,
                    safehouse = db.Safehouses
                        .Where(s => s.SafehouseId == r.SafehouseId)
                        .Select(s => s.SafehouseCode + " " + s.City)
                        .FirstOrDefault(),
                    r.CaseStatus,
                    r.CaseCategory,
                    r.CurrentRiskLevel,
                    r.DateOfAdmission,
                    r.AssignedSocialWorker,
                    r.Sex,
                    r.PresentAge
                })
                .ToListAsync();

            return new { items, totalCount, page, pageSize };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/residents/filter-options", async (AppDbContext db) =>
        {
            var caseStatuses = await db.Residents
                .Where(r => r.CaseStatus != null)
                .Select(r => r.CaseStatus!)
                .Distinct().OrderBy(x => x).ToListAsync();

            var safehouses = await db.Safehouses
                .Select(s => new { s.SafehouseId, s.SafehouseCode, s.Name })
                .OrderBy(s => s.Name)
                .ToListAsync();

            var categories = await db.Residents
                .Where(r => r.CaseCategory != null)
                .Select(r => r.CaseCategory!)
                .Distinct().OrderBy(x => x).ToListAsync();

            var riskOrder = new[] { "Critical", "High", "Medium", "Low" };
            var riskLevelsRaw = await db.Residents
                .Where(r => r.CurrentRiskLevel != null)
                .Select(r => r.CurrentRiskLevel!)
                .Distinct().ToListAsync();
            var riskLevels = riskOrder
                .Where(r => riskLevelsRaw.Contains(r))
                .Concat(riskLevelsRaw.Where(r => !riskOrder.Contains(r)).OrderBy(r => r))
                .ToList();

            var socialWorkers = await db.Residents
                .Where(r => r.AssignedSocialWorker != null)
                .Select(r => r.AssignedSocialWorker!)
                .Distinct().OrderBy(x => x).ToListAsync();

            return new { caseStatuses, safehouses, categories, riskLevels, socialWorkers };
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // List all safehouses (for dropdowns)
        app.MapGet("/api/admin/safehouses", async (AppDbContext db) =>
        {
            return await db.Safehouses
                .OrderBy(s => s.Name)
                .Select(s => new { s.SafehouseId, s.Name })
                .ToListAsync();
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // Returns staff members assigned to a specific safehouse
        app.MapGet("/api/admin/safehouses/{safehouseId:int}/staff", async (int safehouseId, AppDbContext db, UserManager<ApplicationUser> userManager) =>
        {
            var staffUsers = await db.UserSafehouses
                .Where(us => us.SafehouseId == safehouseId)
                .Join(db.Users, us => us.UserId, u => u.Id,
                    (us, u) => new { u.Id, u.FirstName, u.LastName })
                .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
                .ToListAsync();

            var result = new List<object>();
            foreach (var u in staffUsers)
            {
                var user = await userManager.FindByIdAsync(u.Id);
                if (user != null)
                {
                    var roles = await userManager.GetRolesAsync(user);
                    if (roles.Contains("Staff") || roles.Contains("Admin"))
                        result.Add(new { name = $"{u.FirstName} {u.LastName}" });
                }
            }
            return Results.Ok(result);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/residents/{id:int}", async (int id, AppDbContext db) =>
        {
            var r = await db.Residents
                .Where(r => r.ResidentId == id)
                .Select(r => new
                {
                    r.ResidentId, r.CaseControlNo, r.InternalCode, r.SafehouseId,
                    safehouse = db.Safehouses
                        .Where(s => s.SafehouseId == r.SafehouseId)
                        .Select(s => s.SafehouseCode + " " + s.City)
                        .FirstOrDefault(),
                    r.CaseStatus, r.Sex, r.DateOfBirth, r.BirthStatus, r.PlaceOfBirth, r.Religion,
                    r.CaseCategory,
                    r.SubCatOrphaned, r.SubCatTrafficked, r.SubCatChildLabor,
                    r.SubCatPhysicalAbuse, r.SubCatSexualAbuse, r.SubCatOsaec,
                    r.SubCatCicl, r.SubCatAtRisk, r.SubCatStreetChild, r.SubCatChildWithHiv,
                    r.IsPwd, r.PwdType, r.HasSpecialNeeds, r.SpecialNeedsDiagnosis,
                    r.FamilyIs4ps, r.FamilySoloParent, r.FamilyIndigenous,
                    r.FamilyParentPwd, r.FamilyInformalSettler,
                    r.DateOfAdmission, r.AgeUponAdmission, r.PresentAge, r.LengthOfStay,
                    r.ReferralSource, r.ReferringAgencyPerson,
                    r.DateColbRegistered, r.DateColbObtained,
                    r.AssignedSocialWorker, r.InitialCaseAssessment, r.DateCaseStudyPrepared,
                    r.ReintegrationType, r.ReintegrationStatus,
                    r.InitialRiskLevel, r.CurrentRiskLevel,
                    r.DateEnrolled, r.DateClosed, r.CreatedAt, r.NotesRestricted
                })
                .FirstOrDefaultAsync();

            return r is null ? Results.NotFound(new { error = "Resident not found." }) : Results.Ok(r);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPost("/api/admin/residents", async (HttpContext httpContext, AppDbContext db) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<ResidentRequest>();
            if (body == null)
                return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });

            var resident = new Resident { CreatedAt = DateTime.UtcNow };
            EntityMapper.MapResident(resident, body);

            db.Residents.Add(resident);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/residents/{resident.ResidentId}", new { resident.ResidentId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapPut("/api/admin/residents/{id:int}", async (int id, HttpContext httpContext, AppDbContext db) =>
        {
            var resident = await db.Residents.FindAsync(id);
            if (resident == null)
                return Results.NotFound(new { error = "Resident not found." });

            // Staff can only edit residents in their assigned safehouses
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            if (allowed != null && (!resident.SafehouseId.HasValue || !allowed.Contains(resident.SafehouseId.Value)))
                return Results.Forbid();

            var body = await httpContext.Request.ReadFromJsonAsync<ResidentRequest>();
            if (body == null)
                return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });

            EntityMapper.MapResident(resident, body);

            await db.SaveChangesAsync();
            return Results.Ok(new { resident.ResidentId });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapDelete("/api/admin/residents/{id:int}", async (int id, AppDbContext db) =>
        {
            var resident = await db.Residents.FindAsync(id);
            if (resident == null)
                return Results.NotFound(new { error = "Resident not found." });

            try
            {
                db.Residents.Remove(resident);
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Resident deleted." });
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException)
            {
                return Results.Conflict(new { error = "Cannot delete this resident because they have associated records (education, visitations, recordings, etc.). Remove those records first." });
            }
        }).RequireAuthorization("AdminOnly");

        // ── Admin dashboard data ──────────────────────────────────

        app.MapGet("/api/admin/recent-donations", async (AppDbContext db) =>
        {
            var data = await db.Donations
                .Where(d => d.DonationDate <= AppConstants.DataCutoff)
                .OrderByDescending(d => d.DonationDate)
                .Take(5)
                .Select(d => new
                {
                    supporter = db.Supporters
                        .Where(s => s.SupporterId == d.SupporterId)
                        .Select(s => s.DisplayName)
                        .FirstOrDefault(),
                    d.DonationType,
                    d.Amount,
                    d.EstimatedValue,
                    d.DonationDate,
                    d.CampaignName
                })
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/donations-by-channel", async (AppDbContext db) =>
        {
            var data = await db.Supporters
                .Where(s => s.AcquisitionChannel != null)
                .GroupBy(s => s.AcquisitionChannel)
                .Select(g => new
                {
                    channel = g.Key,
                    count = g.Count()
                })
                .OrderByDescending(x => x.count)
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/active-residents-trend", async (AppDbContext db, int? safehouseId) =>
        {
            var query = db.SafehouseMonthlyMetrics.Where(m => m.MonthStart != null && m.MonthStart <= AppConstants.DataCutoff);
            if (safehouseId.HasValue) query = query.Where(m => m.SafehouseId == safehouseId.Value);

            var data = await query
                .GroupBy(m => new { m.MonthStart!.Value.Year, m.MonthStart!.Value.Month })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    count = g.Sum(m => (int?)m.ActiveResidents ?? 0)
                })
                .OrderBy(x => x.year).ThenBy(x => x.month)
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        app.MapGet("/api/admin/flagged-cases-trend", async (AppDbContext db, int? safehouseId) =>
        {
            var query = db.SafehouseMonthlyMetrics.Where(m => m.MonthStart != null && m.MonthStart <= AppConstants.DataCutoff);
            if (safehouseId.HasValue) query = query.Where(m => m.SafehouseId == safehouseId.Value);

            var data = await query
                .GroupBy(m => new { m.MonthStart!.Value.Year, m.MonthStart!.Value.Month })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    count = g.Sum(m => (int?)m.IncidentCount ?? 0)
                })
                .OrderBy(x => x.year).ThenBy(x => x.month)
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Safehouses & Residents list ──────────────────────────

        app.MapGet("/api/admin/residents-list", async (HttpContext httpContext, AppDbContext db) =>
        {
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(httpContext, db);
            var query = db.Residents.AsQueryable();
            if (allowed != null)
                query = query.Where(r => r.SafehouseId.HasValue && allowed.Contains(r.SafehouseId.Value));

            var data = await query
                .OrderBy(r => r.InternalCode)
                .Select(r => new
                {
                    r.ResidentId,
                    r.InternalCode,
                    r.CaseStatus
                })
                .ToListAsync();

            return data;
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}

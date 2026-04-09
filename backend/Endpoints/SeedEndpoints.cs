using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class SeedEndpoints
{
    public static void MapSeedEndpoints(this WebApplication app)
    {
        app.MapPost("/api/admin/seed-workflow-data", async (
            UserManager<ApplicationUser> userManager,
            AppDbContext db) =>
        {
            var results = new List<string>();
            // "Today" is February 16, 2026 — matching DATA_CUTOFF
            var today = new DateOnly(2026, 2, 16);
            var todayDt = new DateTime(2026, 2, 16, 0, 0, 0, DateTimeKind.Utc);

            // ── 0. Clear old seeded workflow data so we can re-seed ──
            var oldTasks = await db.StaffTasks.ToListAsync();
            if (oldTasks.Count > 0) { db.StaffTasks.RemoveRange(oldTasks); await db.SaveChangesAsync(); results.Add($"Cleared {oldTasks.Count} old tasks"); }
            var oldEvents = await db.CalendarEvents.ToListAsync();
            if (oldEvents.Count > 0) { db.CalendarEvents.RemoveRange(oldEvents); await db.SaveChangesAsync(); results.Add($"Cleared {oldEvents.Count} old events"); }

            // ── 1. Create staff user accounts (SW-01 through SW-20) ──
            var staffNames = new Dictionary<string, (string first, string last)>
            {
                ["SW-01"] = ("Maria", "Santos"), ["SW-02"] = ("Elena", "Cruz"),
                ["SW-03"] = ("Rosa", "Garcia"), ["SW-04"] = ("Ana", "Reyes"),
                ["SW-05"] = ("Carmen", "Bautista"), ["SW-06"] = ("Linda", "Perez"),
                ["SW-07"] = ("Grace", "Flores"), ["SW-08"] = ("Joy", "Rivera"),
                ["SW-09"] = ("Faith", "Torres"), ["SW-10"] = ("Hope", "Ramos"),
                ["SW-11"] = ("Liza", "Mendoza"), ["SW-13"] = ("Diana", "Castro"),
                ["SW-14"] = ("Sarah", "Aquino"), ["SW-15"] = ("Ruth", "Villanueva"),
                ["SW-16"] = ("Esther", "Soriano"), ["SW-17"] = ("Mercy", "Dela Cruz"),
                ["SW-19"] = ("Alma", "Pascual"), ["SW-20"] = ("Nina", "Cortez"),
            };

            // Map SW codes to safehouse IDs (roughly 2 staff per safehouse)
            var swToSafehouse = new Dictionary<string, int[]>
            {
                ["SW-01"] = new[] { 1, 2 }, ["SW-02"] = new[] { 1 },
                ["SW-03"] = new[] { 2 }, ["SW-04"] = new[] { 3 },
                ["SW-05"] = new[] { 3, 4 }, ["SW-06"] = new[] { 4 },
                ["SW-07"] = new[] { 5, 6 }, ["SW-08"] = new[] { 1 },
                ["SW-09"] = new[] { 5 }, ["SW-10"] = new[] { 6 },
                ["SW-11"] = new[] { 7 }, ["SW-13"] = new[] { 7, 8 },
                ["SW-14"] = new[] { 8 }, ["SW-15"] = new[] { 9 },
                ["SW-16"] = new[] { 2, 7 }, ["SW-17"] = new[] { 7, 8 },
                ["SW-19"] = new[] { 9 }, ["SW-20"] = new[] { 1, 3 },
            };

            var staffUserIds = new Dictionary<string, string>(); // SW code → userId

            foreach (var (sw, names) in staffNames)
            {
                var email = $"{sw.ToLower().Replace("-", "")}@beaconofhope.org";
                var existing = await userManager.FindByEmailAsync(email);
                if (existing != null)
                {
                    staffUserIds[sw] = existing.Id;
                    results.Add($"User {sw} already exists");
                    continue;
                }
                var user = new ApplicationUser
                {
                    UserName = email, Email = email,
                    FirstName = names.first, LastName = names.last,
                    EmailConfirmed = true
                };
                var createResult = await userManager.CreateAsync(user, "Test1234!@#$");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, "Staff");
                    staffUserIds[sw] = user.Id;
                    results.Add($"Created user {sw}: {email}");
                }
                else
                {
                    results.Add($"Failed to create {sw}: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
                }
            }

            // ── 2. Assign safehouses to staff users ──
            foreach (var (sw, safehouseIds) in swToSafehouse)
            {
                if (!staffUserIds.ContainsKey(sw)) continue;
                var userId = staffUserIds[sw];
                var existingAssignments = await db.UserSafehouses.Where(us => us.UserId == userId).ToListAsync();
                if (existingAssignments.Count > 0) continue; // already assigned

                foreach (var shId in safehouseIds)
                {
                    db.UserSafehouses.Add(new UserSafehouse { UserId = userId, SafehouseId = shId });
                }
                results.Add($"Assigned {sw} to safehouses: {string.Join(", ", safehouseIds)}");
            }

            // Assign admin to ALL safehouses
            var adminUser = await userManager.FindByEmailAsync("admin@beaconofhope.org");
            if (adminUser != null)
            {
                var adminAssignments = await db.UserSafehouses.Where(us => us.UserId == adminUser.Id).ToListAsync();
                if (adminAssignments.Count == 0)
                {
                    for (int i = 1; i <= 9; i++)
                        db.UserSafehouses.Add(new UserSafehouse { UserId = adminUser.Id, SafehouseId = i });
                    results.Add("Assigned admin to all 9 safehouses");
                }
            }

            // Assign existing staff user to safehouses 1 and 2
            var staffUser = await userManager.FindByEmailAsync("staff@beaconofhope.org");
            if (staffUser != null)
            {
                var existStaff = await db.UserSafehouses.Where(us => us.UserId == staffUser.Id).ToListAsync();
                if (existStaff.Count == 0)
                {
                    db.UserSafehouses.Add(new UserSafehouse { UserId = staffUser.Id, SafehouseId = 1 });
                    db.UserSafehouses.Add(new UserSafehouse { UserId = staffUser.Id, SafehouseId = 2 });
                    results.Add("Assigned staff@beaconofhope.org to safehouses 1, 2");
                }
            }

            await db.SaveChangesAsync();

            // ── 3. Create dense to-do tasks for active residents ──
            var activeResidents = await db.Residents
                .Where(r => r.CaseStatus == "Active")
                .Select(r => new { r.ResidentId, r.InternalCode, r.AssignedSocialWorker, r.SafehouseId })
                .ToListAsync();

            var taskCount = 0;
            var random = new Random(42);

            foreach (var r in activeResidents)
            {
                var sw = r.AssignedSocialWorker ?? "SW-01";
                if (!staffUserIds.ContainsKey(sw)) continue;
                var userId = staffUserIds[sw];
                var shId = r.SafehouseId ?? 1;

                // Monthly doctor appointment
                db.StaffTasks.Add(new StaffTask
                {
                    StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                    TaskType = "ScheduleDoctor", Title = $"Schedule doctor appointment for {r.InternalCode}",
                    Description = "Monthly medical checkup — due this week",
                    ContextJson = $"{{\"lastDoctorVisit\": \"{today.AddDays(-random.Next(28, 45)):yyyy-MM-dd}\"}}",
                    Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 3))
                });
                taskCount++;

                // Monthly dentist appointment
                db.StaffTasks.Add(new StaffTask
                {
                    StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                    TaskType = "ScheduleDentist", Title = $"Schedule dentist appointment for {r.InternalCode}",
                    Description = "Monthly dental checkup — due this week",
                    ContextJson = $"{{\"lastDentistVisit\": \"{today.AddDays(-random.Next(30, 60)):yyyy-MM-dd}\"}}",
                    Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 4))
                });
                taskCount++;

                // Update education records
                db.StaffTasks.Add(new StaffTask
                {
                    StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                    TaskType = "UpdateEducation", Title = $"Update education records for {r.InternalCode}",
                    Description = "Monthly education progress update",
                    Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 5))
                });
                taskCount++;

                // Input health records (post-appointment)
                if (random.Next(3) == 0)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "InputHealthRecords", Title = $"Input health records for {r.InternalCode}",
                        Description = "Record data from recent medical appointment",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-1)
                    });
                    taskCount++;
                }

                // Incident follow-up (for some residents)
                if (random.Next(4) == 0)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "IncidentFollowUp", Title = $"Follow up on incident for {r.InternalCode}",
                        Description = $"Incident: Behavioral ({(random.Next(2) == 0 ? "Medium" : "High")}) — Review and determine next steps",
                        SourceEntityType = "IncidentReport",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 2))
                    });
                    taskCount++;
                }

                // Schedule home visit
                if (random.Next(3) == 0)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "ScheduleHomeVisit", Title = $"Schedule home visit for {r.InternalCode}",
                        Description = "Routine follow-up home visit due",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 3))
                    });
                    taskCount++;
                }
            }
            await db.SaveChangesAsync();
            results.Add($"Created {taskCount} to-do tasks");

            // ── 4. Create dense calendar events around Feb 16 ──
            var eventCount = 0;
            var eventTypes = new[] { "Counseling", "Counseling", "Counseling", "HomeVisit", "DoctorApt", "DentistApt", "GroupTherapy" };
            var timeSlots = new[] { "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00" };

            foreach (var r in activeResidents)
            {
                var sw = r.AssignedSocialWorker ?? "SW-01";
                if (!staffUserIds.ContainsKey(sw)) continue;
                var userId = staffUserIds[sw];
                var shId = r.SafehouseId ?? 1;

                // 4-8 events per resident over 2 weeks around Feb 16
                var numEvents = random.Next(4, 9);
                for (int i = 0; i < numEvents; i++)
                {
                    // Spread from Feb 10 (Tue) to Feb 27 (Fri), biased toward Feb 16-20
                    var daysOffset = random.Next(-4, 12);
                    // Bias: 40% chance of being on today (Feb 16) or tomorrow
                    if (random.Next(5) < 2) daysOffset = random.Next(0, 2);
                    var eventDate = today.AddDays(daysOffset);
                    if (eventDate.DayOfWeek == DayOfWeek.Saturday || eventDate.DayOfWeek == DayOfWeek.Sunday) continue;

                    var eventType = eventTypes[random.Next(eventTypes.Length)];
                    // 70% have a time, 30% unscheduled (shows in parking lot)
                    var hasTime = random.Next(10) < 7;
                    var timeSlot = hasTime ? timeSlots[random.Next(timeSlots.Length)] : null;

                    var title = eventType switch
                    {
                        "Counseling" => $"Counseling — {r.InternalCode}",
                        "HomeVisit" => $"Home visit — {r.InternalCode}",
                        "DoctorApt" => $"Doctor appt — {r.InternalCode}",
                        "DentistApt" => $"Dentist appt — {r.InternalCode}",
                        "GroupTherapy" => $"Group therapy — {r.InternalCode}",
                        _ => $"Event — {r.InternalCode}"
                    };

                    db.CalendarEvents.Add(new CalendarEvent
                    {
                        StaffUserId = userId, SafehouseId = shId, ResidentId = r.ResidentId,
                        EventType = eventType, Title = title,
                        EventDate = eventDate,
                        StartTime = timeSlot != null ? TimeOnly.Parse(timeSlot) : null,
                        EndTime = timeSlot != null ? TimeOnly.Parse(timeSlot).AddMinutes(random.Next(2, 4) * 30) : null,
                        Status = daysOffset < 0 ? "Completed" : "Scheduled",
                        CreatedAt = todayDt.AddDays(daysOffset - 3)
                    });
                    eventCount++;
                }
            }

            // Monday case conferences — Feb 16 is DATA_CUTOFF and a Monday
            var confMonday = today; // 2026-02-16
            for (int shId = 1; shId <= 9; shId++)
            {
                var shStaff = swToSafehouse.FirstOrDefault(kv => kv.Value.Contains(shId));
                if (shStaff.Key == null || !staffUserIds.ContainsKey(shStaff.Key)) continue;
                // All staff at this safehouse get the conference
                foreach (var (swCode, shIds) in swToSafehouse.Where(kv => kv.Value.Contains(shId)))
                {
                    if (!staffUserIds.ContainsKey(swCode)) continue;
                    db.CalendarEvents.Add(new CalendarEvent
                    {
                        StaffUserId = staffUserIds[swCode], SafehouseId = shId,
                        EventType = "CaseConference", Title = $"Case Conference — SH{shId:D2}",
                        EventDate = confMonday, StartTime = TimeOnly.Parse("09:00"), EndTime = TimeOnly.Parse("10:00"),
                        Status = "Scheduled", CreatedAt = todayDt.AddDays(-1)
                    });
                    eventCount++;
                }
            }

            await db.SaveChangesAsync();
            results.Add($"Created {eventCount} calendar events");

            // ── 5. Clear social worker from a few residents to make unclaimed queue ──
            var unclaimedCount = await db.Residents.CountAsync(r => (r.AssignedSocialWorker == null || r.AssignedSocialWorker == "") && r.CaseStatus == "Active");
            if (unclaimedCount == 0)
            {
                var toUnclaim = await db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .OrderBy(r => r.ResidentId)
                    .Take(5)
                    .ToListAsync();
                foreach (var r in toUnclaim)
                {
                    r.AssignedSocialWorker = null;
                }
                await db.SaveChangesAsync();
                results.Add($"Cleared social worker from {toUnclaim.Count} residents for queue");
            }

            return Results.Ok(new { results });
        }).RequireAuthorization("AdminOnly");
    }
}

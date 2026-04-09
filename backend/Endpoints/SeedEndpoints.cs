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

            var swToSafehouse = new Dictionary<string, int[]>
            {
                ["SW-01"] = [1, 2], ["SW-02"] = [1],
                ["SW-03"] = [2], ["SW-04"] = [3],
                ["SW-05"] = [3, 4], ["SW-06"] = [4],
                ["SW-07"] = [5, 6], ["SW-08"] = [1],
                ["SW-09"] = [5], ["SW-10"] = [6],
                ["SW-11"] = [7], ["SW-13"] = [7, 8],
                ["SW-14"] = [8], ["SW-15"] = [9],
                ["SW-16"] = [2, 7], ["SW-17"] = [7, 8],
                ["SW-19"] = [9], ["SW-20"] = [1, 3],
            };

            var staffUserIds = new Dictionary<string, string>();

            foreach (var (sw, names) in staffNames)
            {
                var email = $"{sw.ToLower().Replace("-", "")}@beaconofhope.org";
                var existing = await userManager.FindByEmailAsync(email);
                if (existing != null)
                {
                    staffUserIds[sw] = existing.Id;
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
            }

            // ── 2. Assign safehouses ──
            foreach (var (sw, safehouseIds) in swToSafehouse)
            {
                if (!staffUserIds.ContainsKey(sw)) continue;
                var userId = staffUserIds[sw];
                var existing = await db.UserSafehouses.Where(us => us.UserId == userId).ToListAsync();
                if (existing.Count > 0) continue;
                foreach (var shId in safehouseIds)
                    db.UserSafehouses.Add(new UserSafehouse { UserId = userId, SafehouseId = shId });
            }

            var adminUser = await userManager.FindByEmailAsync("admin@beaconofhope.org");
            if (adminUser != null)
            {
                var aa = await db.UserSafehouses.Where(us => us.UserId == adminUser.Id).ToListAsync();
                if (aa.Count == 0)
                    for (int i = 1; i <= 9; i++)
                        db.UserSafehouses.Add(new UserSafehouse { UserId = adminUser.Id, SafehouseId = i });
            }

            var staffUser = await userManager.FindByEmailAsync("staff@beaconofhope.org");
            if (staffUser != null)
            {
                var sa = await db.UserSafehouses.Where(us => us.UserId == staffUser.Id).ToListAsync();
                if (sa.Count == 0)
                {
                    db.UserSafehouses.Add(new UserSafehouse { UserId = staffUser.Id, SafehouseId = 1 });
                    db.UserSafehouses.Add(new UserSafehouse { UserId = staffUser.Id, SafehouseId = 2 });
                }
            }
            await db.SaveChangesAsync();

            // ── 3. Load active residents ──
            var activeResidents = await db.Residents
                .Where(r => r.CaseStatus == "Active")
                .Select(r => new { r.ResidentId, r.InternalCode, r.AssignedSocialWorker, r.SafehouseId })
                .ToListAsync();
            results.Add($"Found {activeResidents.Count} active residents");

            var random = new Random(42);
            var taskCount = 0;
            var eventCount = 0;

            // ── Helper: pick a random time slot weighted toward working hours ──
            string[] morningSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
            string[] afternoonSlots = ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
            string[] allSlots = [..morningSlots, ..afternoonSlots];

            string PickTime() => allSlots[random.Next(allSlots.Length)];
            int PickDuration(string eventType) => eventType switch
            {
                "Counseling" => random.Next(2) == 0 ? 60 : 45,
                "GroupTherapy" => random.Next(2) == 0 ? 90 : 60,
                "DoctorApt" => 30,
                "DentistApt" => 30,
                "HomeVisit" => random.Next(2) == 0 ? 120 : 90,
                "CaseConference" => 60,
                "ReintegrationVisit" => random.Next(2) == 0 ? 90 : 60,
                "PostPlacementVisit" => 60,
                _ => 60,
            };

            // ── 4. Create 4 weeks of PAST calendar events (Jan 19 – Feb 15) ──
            //    These give the calendar realistic history when scrolling back.
            //    All are Completed. Each staff member gets a unique workload pattern.

            // Build a per-staff-user → resident list lookup
            var staffResidents = new Dictionary<string, List<(int residentId, string code, int shId)>>();
            foreach (var r in activeResidents)
            {
                var sw = r.AssignedSocialWorker ?? "SW-01";
                if (!staffUserIds.ContainsKey(sw)) continue;
                var uid = staffUserIds[sw];
                if (!staffResidents.ContainsKey(uid)) staffResidents[uid] = new();
                staffResidents[uid].Add((r.ResidentId, r.InternalCode ?? $"R-{r.ResidentId}", r.SafehouseId ?? 1));
            }

            // Past 4 weeks: Jan 19 – Feb 15 (weekdays only)
            for (var d = today.AddDays(-28); d < today; d = d.AddDays(1))
            {
                if (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
                var dayDt = d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

                foreach (var (userId, residents) in staffResidents)
                {
                    // Each staff member has 3-6 events per workday
                    var dailyCount = random.Next(3, 7);
                    var usedTimes = new HashSet<string>();

                    for (int i = 0; i < dailyCount; i++)
                    {
                        var resident = residents[random.Next(residents.Count)];

                        // Weighted event type distribution: heavy on counseling
                        var roll = random.Next(100);
                        var eventType = roll switch
                        {
                            < 35 => "Counseling",
                            < 50 => "HomeVisit",
                            < 60 => "DoctorApt",
                            < 68 => "DentistApt",
                            < 80 => "GroupTherapy",
                            < 88 => "ReintegrationVisit",
                            < 94 => "PostPlacementVisit",
                            _ => "Other",
                        };

                        var time = PickTime();
                        // Avoid double-booking same time
                        var attempts = 0;
                        while (usedTimes.Contains(time) && attempts++ < 10) time = PickTime();
                        usedTimes.Add(time);

                        var dur = PickDuration(eventType);
                        var startTime = TimeOnly.Parse(time);
                        var title = eventType switch
                        {
                            "Counseling" => $"Counseling — {resident.code}",
                            "HomeVisit" => $"Home visit — {resident.code}",
                            "DoctorApt" => $"Doctor appt — {resident.code}",
                            "DentistApt" => $"Dentist appt — {resident.code}",
                            "GroupTherapy" => $"Group therapy — {resident.code}",
                            "ReintegrationVisit" => $"Reintegration visit — {resident.code}",
                            "PostPlacementVisit" => $"Post-placement visit — {resident.code}",
                            _ => $"Meeting — {resident.code}",
                        };

                        db.CalendarEvents.Add(new CalendarEvent
                        {
                            StaffUserId = userId, SafehouseId = resident.shId,
                            ResidentId = resident.residentId,
                            EventType = eventType, Title = title,
                            EventDate = d,
                            StartTime = startTime,
                            EndTime = startTime.AddMinutes(dur),
                            Status = "Completed",
                            CreatedAt = dayDt.AddDays(-2)
                        });
                        eventCount++;
                    }
                }

                // Monday case conferences (past)
                if (d.DayOfWeek == DayOfWeek.Monday)
                {
                    for (int shId = 1; shId <= 9; shId++)
                    {
                        foreach (var (swCode, shIds) in swToSafehouse.Where(kv => kv.Value.Contains(shId)))
                        {
                            if (!staffUserIds.ContainsKey(swCode)) continue;
                            db.CalendarEvents.Add(new CalendarEvent
                            {
                                StaffUserId = staffUserIds[swCode], SafehouseId = shId,
                                EventType = "CaseConference",
                                Title = $"Case Conference — SH{shId:D2}",
                                EventDate = d,
                                StartTime = TimeOnly.Parse("09:00"),
                                EndTime = TimeOnly.Parse("10:00"),
                                Status = "Completed",
                                CreatedAt = dayDt.AddDays(-3)
                            });
                            eventCount++;
                        }
                    }
                }
            }
            await db.SaveChangesAsync();
            results.Add($"Created {eventCount} past calendar events (4 weeks)");

            // ── 5. Create CURRENT + FUTURE events (Feb 16 – Feb 27) ──
            //    Mix of:
            //    a) Already-scheduled events (have times set)
            //    b) Recurring unscheduled sessions (counseling, group therapy, etc.)
            //       that appear in the all-day/parking-lot row waiting to be dragged to a time
            var futureStart = eventCount;
            for (var d = today; d <= today.AddDays(11); d = d.AddDays(1))
            {
                if (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
                var dayDt = d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

                foreach (var (userId, residents) in staffResidents)
                {
                    // 2-4 already-scheduled events per day
                    var scheduledCount = random.Next(2, 5);
                    var usedTimes = new HashSet<string>();

                    for (int i = 0; i < scheduledCount; i++)
                    {
                        var resident = residents[random.Next(residents.Count)];
                        var roll = random.Next(100);
                        var eventType = roll switch
                        {
                            < 30 => "Counseling",
                            < 45 => "HomeVisit",
                            < 55 => "DoctorApt",
                            < 63 => "DentistApt",
                            < 75 => "GroupTherapy",
                            < 85 => "ReintegrationVisit",
                            < 93 => "PostPlacementVisit",
                            _ => "Other",
                        };

                        var time = PickTime();
                        var attempts = 0;
                        while (usedTimes.Contains(time) && attempts++ < 10) time = PickTime();
                        usedTimes.Add(time);

                        var dur = PickDuration(eventType);
                        var title = eventType switch
                        {
                            "Counseling" => $"Counseling — {resident.code}",
                            "HomeVisit" => $"Home visit — {resident.code}",
                            "DoctorApt" => $"Doctor appt — {resident.code}",
                            "DentistApt" => $"Dentist appt — {resident.code}",
                            "GroupTherapy" => $"Group therapy — {resident.code}",
                            "ReintegrationVisit" => $"Reintegration visit — {resident.code}",
                            "PostPlacementVisit" => $"Post-placement visit — {resident.code}",
                            _ => $"Meeting — {resident.code}",
                        };

                        db.CalendarEvents.Add(new CalendarEvent
                        {
                            StaffUserId = userId, SafehouseId = resident.shId,
                            ResidentId = resident.residentId,
                            EventType = eventType, Title = title,
                            EventDate = d,
                            StartTime = TimeOnly.Parse(time),
                            EndTime = TimeOnly.Parse(time).AddMinutes(dur),
                            Status = "Scheduled",
                            CreatedAt = dayDt.AddDays(-random.Next(1, 5))
                        });
                        eventCount++;
                    }

                    // Recurring UNSCHEDULED sessions (no time — parking lot)
                    // Each staff member has 2-4 recurring sessions per day that need
                    // to be dragged to a specific time slot on the calendar
                    var unschedCount = random.Next(2, 5);
                    for (int i = 0; i < unschedCount; i++)
                    {
                        var resident = residents[random.Next(residents.Count)];
                        // Recurring types: mostly counseling and group therapy
                        var recurRoll = random.Next(100);
                        var eventType = recurRoll switch
                        {
                            < 50 => "Counseling",
                            < 75 => "GroupTherapy",
                            < 90 => "HomeVisit",
                            _ => "ReintegrationVisit",
                        };
                        var title = eventType switch
                        {
                            "Counseling" => $"Counseling — {resident.code}",
                            "GroupTherapy" => $"Group therapy — {resident.code}",
                            "HomeVisit" => $"Home visit — {resident.code}",
                            _ => $"Reintegration visit — {resident.code}",
                        };

                        db.CalendarEvents.Add(new CalendarEvent
                        {
                            StaffUserId = userId, SafehouseId = resident.shId,
                            ResidentId = resident.residentId,
                            EventType = eventType, Title = title,
                            EventDate = d,
                            StartTime = null,  // No time — sits in parking lot
                            EndTime = null,
                            RecurrenceRule = "weekly",
                            Status = "Scheduled",
                            CreatedAt = dayDt.AddDays(-7)
                        });
                        eventCount++;
                    }
                }

                // Monday case conferences (always scheduled with time)
                if (d.DayOfWeek == DayOfWeek.Monday)
                {
                    for (int shId = 1; shId <= 9; shId++)
                    {
                        foreach (var (swCode, shIds) in swToSafehouse.Where(kv => kv.Value.Contains(shId)))
                        {
                            if (!staffUserIds.ContainsKey(swCode)) continue;
                            db.CalendarEvents.Add(new CalendarEvent
                            {
                                StaffUserId = staffUserIds[swCode], SafehouseId = shId,
                                EventType = "CaseConference",
                                Title = $"Case Conference — SH{shId:D2}",
                                EventDate = d,
                                StartTime = TimeOnly.Parse("09:00"),
                                EndTime = TimeOnly.Parse("10:00"),
                                Status = "Scheduled",
                                CreatedAt = dayDt.AddDays(-3)
                            });
                            eventCount++;
                        }
                    }
                }
            }
            await db.SaveChangesAsync();
            results.Add($"Created {eventCount - futureStart} current/future events (incl. unscheduled recurring)");

            // ── 6. Create PAST completed tasks (gives history) + CURRENT pending tasks ──

            // Past completed tasks: 3 weeks of completed work per staff
            var pastTaskStart = taskCount;
            foreach (var r in activeResidents)
            {
                var sw = r.AssignedSocialWorker ?? "SW-01";
                if (!staffUserIds.ContainsKey(sw)) continue;
                var userId = staffUserIds[sw];
                var shId = r.SafehouseId ?? 1;

                // 2-4 completed tasks per resident over the last 3 weeks
                var numPast = random.Next(2, 5);
                for (int i = 0; i < numPast; i++)
                {
                    var daysAgo = random.Next(3, 21);
                    var createdDt = todayDt.AddDays(-daysAgo);
                    var completedDt = createdDt.AddDays(random.Next(1, 3));

                    var taskRoll = random.Next(100);
                    var (taskType, title, desc) = taskRoll switch
                    {
                        < 25 => ("ScheduleDoctor", "Schedule Doctor Appointment",
                                 $"Monthly medical checkup — last visit {today.AddDays(-daysAgo - 30):MMM d}"),
                        < 40 => ("ScheduleDentist", "Schedule Dentist Appointment",
                                 $"Monthly dental checkup — last visit {today.AddDays(-daysAgo - 35):MMM d}"),
                        < 55 => ("UpdateEducation", "Update Education Records",
                                 "Monthly education progress update"),
                        < 70 => ("InputHealthRecords", "Input Health Records",
                                 "Record data from recent medical appointment"),
                        < 82 => ("ScheduleHomeVisit", "Schedule Home Visit",
                                 "Routine follow-up home visit due"),
                        < 92 => ("IncidentFollowUp", "Incident Follow-Up",
                                 $"Behavioral incident ({(random.Next(2) == 0 ? "Medium" : "Low")}) — review and determine next steps"),
                        _ => ("ScheduleReintegration", "Schedule Reintegration Visit",
                              "Family reintegration progress visit due"),
                    };

                    // 80% completed, 15% dismissed, 5% snoozed-then-completed
                    var statusRoll = random.Next(100);
                    var status = statusRoll < 80 ? "Completed" : statusRoll < 95 ? "Dismissed" : "Completed";

                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = taskType, Title = title,
                        Description = desc,
                        Status = status,
                        CreatedAt = createdDt,
                        CompletedAt = completedDt,
                        SourceEntityType = taskType == "IncidentFollowUp" ? "IncidentReport" : null,
                    });
                    taskCount++;
                }
            }
            await db.SaveChangesAsync();
            results.Add($"Created {taskCount - pastTaskStart} past completed tasks");

            // Current pending tasks: realistic active to-do list
            var pendingStart = taskCount;
            foreach (var r in activeResidents)
            {
                var sw = r.AssignedSocialWorker ?? "SW-01";
                if (!staffUserIds.ContainsKey(sw)) continue;
                var userId = staffUserIds[sw];
                var shId = r.SafehouseId ?? 1;

                // Each resident gets 2-4 pending tasks (not all task types — realistic mix)
                var residentSeed = r.ResidentId + 42;

                // Monthly doctor appointment — ~60% of residents
                if ((residentSeed * 7) % 10 < 6)
                {
                    var lastDoc = today.AddDays(-random.Next(28, 50));
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "ScheduleDoctor", Title = "Schedule Doctor Appointment",
                        Description = $"Monthly medical checkup — last visit {lastDoc:MMM d}",
                        ContextJson = $"{{\"lastVisit\": \"{lastDoc:yyyy-MM-dd}\", \"type\": \"Doctor\"}}",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 4))
                    });
                    taskCount++;
                }

                // Monthly dentist — ~40%
                if ((residentSeed * 13) % 10 < 4)
                {
                    var lastDent = today.AddDays(-random.Next(30, 65));
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "ScheduleDentist", Title = "Schedule Dentist Appointment",
                        Description = $"Monthly dental checkup — last visit {lastDent:MMM d}",
                        ContextJson = $"{{\"lastVisit\": \"{lastDent:yyyy-MM-dd}\", \"type\": \"Dentist\"}}",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 5))
                    });
                    taskCount++;
                }

                // Update education records — ~50%
                if ((residentSeed * 3) % 10 < 5)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "UpdateEducation", Title = "Update Education Records",
                        Description = "Monthly education progress update",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 6))
                    });
                    taskCount++;
                }

                // Input health records — ~25%
                if ((residentSeed * 17) % 100 < 25)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "InputHealthRecords", Title = "Input Health Records",
                        Description = "Record data from recent medical appointment",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 2))
                    });
                    taskCount++;
                }

                // Incident follow-up — ~15%
                if ((residentSeed * 11) % 100 < 15)
                {
                    var severity = random.Next(3) == 0 ? "High" : random.Next(2) == 0 ? "Medium" : "Low";
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "IncidentFollowUp", Title = "Incident Follow-Up",
                        Description = $"Behavioral incident ({severity}) — review and determine next steps",
                        SourceEntityType = "IncidentReport",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 3))
                    });
                    taskCount++;
                }

                // Schedule home visit — ~30%
                if ((residentSeed * 23) % 100 < 30)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "ScheduleHomeVisit", Title = "Schedule Home Visit",
                        Description = "Routine follow-up home visit due",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 4))
                    });
                    taskCount++;
                }

                // Schedule reintegration visit — ~10%
                if ((residentSeed * 29) % 100 < 10)
                {
                    db.StaffTasks.Add(new StaffTask
                    {
                        StaffUserId = userId, ResidentId = r.ResidentId, SafehouseId = shId,
                        TaskType = "ScheduleReintegration", Title = "Schedule Reintegration Visit",
                        Description = "Family reintegration progress visit due",
                        Status = "Pending", CreatedAt = todayDt.AddDays(-random.Next(0, 5))
                    });
                    taskCount++;
                }
            }
            await db.SaveChangesAsync();
            results.Add($"Created {taskCount - pendingStart} pending tasks");

            // ── 7. Clear social worker from a few residents to make unclaimed queue ──
            var unclaimedCount = await db.Residents.CountAsync(r =>
                (r.AssignedSocialWorker == null || r.AssignedSocialWorker == "") && r.CaseStatus == "Active");
            if (unclaimedCount == 0)
            {
                var toUnclaim = await db.Residents
                    .Where(r => r.CaseStatus == "Active")
                    .OrderBy(r => r.ResidentId)
                    .Take(5)
                    .ToListAsync();
                foreach (var r in toUnclaim)
                    r.AssignedSocialWorker = null;
                await db.SaveChangesAsync();
                results.Add($"Cleared social worker from {toUnclaim.Count} residents for queue");
            }

            results.Add($"TOTAL: {eventCount} events, {taskCount} tasks");
            return Results.Ok(new { results });
        }).RequireAuthorization("AdminOnly");
    }
}

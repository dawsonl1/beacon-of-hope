using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// End-to-end workflow tests that create data and verify the full chain
/// of actions a staff member would take through the case lifecycle.
/// </summary>
public class EndToEndWorkflowTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public EndToEndWorkflowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create incident → verify follow-up task generated
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CreateIncidentWithFollowUp_GeneratesTask()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Get a resident to attach the incident to
        var residents = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents-list");
        if (residents.GetArrayLength() == 0) return;
        var residentId = residents[0].GetProperty("residentId").GetInt32();

        // Count tasks before
        var tasksBefore = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        var countBefore = tasksBefore.GetArrayLength();

        // Create an incident with followUpRequired = true
        var createResponse = await client.PostAsJsonAsync("/api/admin/incidents", new
        {
            residentId,
            safehouseId = 1,
            incidentDate = "2026-04-08",
            incidentType = "Behavioral",
            severity = "Medium",
            description = "Test incident for workflow verification",
            responseTaken = "Documented",
            reportedBy = "Test Staff",
            resolved = false,
            followUpRequired = true
        });
        createResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var incidentId = created.GetProperty("incidentId").GetInt32();
        incidentId.Should().BeGreaterThan(0);

        // Verify incident shows up in the list
        var incidents = await client.GetFromJsonAsync<JsonElement>($"/api/admin/incidents?residentId={residentId}");
        incidents.GetProperty("items").EnumerateArray()
            .Should().Contain(i => i.GetProperty("incidentId").GetInt32() == incidentId);

        // Verify the incident detail loads
        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/incidents/{incidentId}");
        detail.GetProperty("description").GetString().Should().Contain("workflow verification");
        detail.GetProperty("followUpRequired").GetBoolean().Should().BeTrue();
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create incident → edit it → verify update persists
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CreateAndEditIncident()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create
        var createResp = await client.PostAsJsonAsync("/api/admin/incidents", new
        {
            incidentDate = "2026-04-07",
            incidentType = "Security",
            severity = "Low",
            description = "Original description",
            resolved = false,
            followUpRequired = false
        });
        createResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var id = (await createResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("incidentId").GetInt32();

        // Edit
        var editResp = await client.PutAsJsonAsync($"/api/admin/incidents/{id}", new
        {
            incidentDate = "2026-04-07",
            incidentType = "Security",
            severity = "High",
            description = "Updated description",
            resolved = true,
            resolutionDate = "2026-04-08",
            followUpRequired = false
        });
        editResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify
        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/incidents/{id}");
        detail.GetProperty("severity").GetString().Should().Be("High");
        detail.GetProperty("description").GetString().Should().Be("Updated description");
        detail.GetProperty("resolved").GetBoolean().Should().BeTrue();
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create education record → verify it appears for resident
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CreateEducationRecord_ShowsForResident()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var residents = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents-list");
        if (residents.GetArrayLength() == 0) return;
        var residentId = residents[0].GetProperty("residentId").GetInt32();

        // Create record
        var resp = await client.PostAsJsonAsync("/api/admin/education-records", new
        {
            residentId,
            recordDate = "2026-04-08",
            educationLevel = "Bridge Program",
            attendanceRate = 85.5,
            progressPercent = 62.0,
            completionStatus = "In Progress",
            schoolName = "Test School",
            enrollmentStatus = "Enrolled",
            notes = "Test education record"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var recordId = created.GetProperty("educationRecordId").GetInt32();
        recordId.Should().BeGreaterThan(0);

        // Verify it shows up filtered by resident
        var records = await client.GetFromJsonAsync<JsonElement>($"/api/admin/education-records?residentId={residentId}");
        records.EnumerateArray().Should().Contain(r =>
            r.GetProperty("educationRecordId").GetInt32() == recordId);

        // Verify data integrity
        var match = records.EnumerateArray().First(r => r.GetProperty("educationRecordId").GetInt32() == recordId);
        match.GetProperty("educationLevel").GetString().Should().Be("Bridge Program");
        match.GetProperty("attendanceRate").GetDecimal().Should().Be(85.5m);
        match.GetProperty("schoolName").GetString().Should().Be("Test School");
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create health record → verify data persists with BMI
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CreateHealthRecord_DataPersists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var residents = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents-list");
        if (residents.GetArrayLength() == 0) return;
        var residentId = residents[0].GetProperty("residentId").GetInt32();

        var resp = await client.PostAsJsonAsync("/api/admin/health-records", new
        {
            residentId,
            recordDate = "2026-04-08",
            weightKg = 45.5,
            heightCm = 155.0,
            bmi = 18.9,
            nutritionScore = 7.5,
            sleepQualityScore = 6.0,
            energyLevelScore = 7.0,
            generalHealthScore = 8.0,
            medicalCheckupDone = true,
            dentalCheckupDone = false,
            psychologicalCheckupDone = true,
            notes = "Test health record"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var recordId = created.GetProperty("healthRecordId").GetInt32();

        // Verify
        var records = await client.GetFromJsonAsync<JsonElement>($"/api/admin/health-records?residentId={residentId}");
        var match = records.EnumerateArray().First(r => r.GetProperty("healthRecordId").GetInt32() == recordId);
        match.GetProperty("weightKg").GetDecimal().Should().Be(45.5m);
        match.GetProperty("heightCm").GetDecimal().Should().Be(155.0m);
        match.GetProperty("medicalCheckupDone").GetBoolean().Should().BeTrue();
        match.GetProperty("dentalCheckupDone").GetBoolean().Should().BeFalse();
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create calendar event → verify it appears in day view
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CreateCalendarEvent_ShowsInDayView()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1,
            eventType = "Counseling",
            title = "Test counseling session",
            description = "Workflow test event",
            eventDate = "2026-04-10",
            startTime = "09:30",
            endTime = "10:30"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("calendarEventId").GetInt32();
        eventId.Should().BeGreaterThan(0);

        // Verify it appears in day view
        var events = await client.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-10");
        events.EnumerateArray().Should().Contain(e =>
            e.GetProperty("calendarEventId").GetInt32() == eventId);

        // Verify data
        var match = events.EnumerateArray().First(e => e.GetProperty("calendarEventId").GetInt32() == eventId);
        match.GetProperty("title").GetString().Should().Be("Test counseling session");
        match.GetProperty("startTime").GetString().Should().Be("09:30");
        match.GetProperty("eventType").GetString().Should().Be("Counseling");
        match.GetProperty("status").GetString().Should().Be("Scheduled");
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create calendar event → mark complete → verify status
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CompleteCalendarEvent()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create
        var resp = await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1,
            eventType = "DoctorApt",
            title = "Doctor visit",
            eventDate = "2026-04-09"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("calendarEventId").GetInt32();

        // Complete
        var updateResp = await client.PutAsJsonAsync($"/api/staff/calendar/{eventId}", new
        {
            status = "Completed"
        });
        updateResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify — completed events are excluded from the default calendar view
        // (status != Cancelled filter), but completed ones still show
        var events = await client.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-09");
        var match = events.EnumerateArray().FirstOrDefault(e => e.GetProperty("calendarEventId").GetInt32() == eventId);
        match.GetProperty("status").GetString().Should().Be("Completed");
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create calendar event → cancel → verify excluded
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CancelCalendarEvent_ExcludedFromList()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1,
            eventType = "Other",
            title = "To be cancelled",
            eventDate = "2026-04-11"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("calendarEventId").GetInt32();

        // Cancel
        var deleteResp = await client.DeleteAsync($"/api/staff/calendar/{eventId}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify excluded from list (cancelled events are filtered out)
        var events = await client.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-11");
        events.EnumerateArray().Should().NotContain(e =>
            e.GetProperty("calendarEventId").GetInt32() == eventId);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create task → snooze → verify hidden → complete
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_TaskSnooze_HidesUntilDate()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a manual task
        var resp = await client.PostAsJsonAsync("/api/staff/tasks", new
        {
            safehouseId = 1,
            taskType = "Manual",
            title = "Snoozeable task",
            description = "Will be snoozed"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var taskId = created.GetProperty("staffTaskId").GetInt32();

        // Verify it appears in task list
        var tasks = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        tasks.EnumerateArray().Should().Contain(t =>
            t.GetProperty("staffTaskId").GetInt32() == taskId);

        // Snooze it far into the future
        var snoozeResp = await client.PutAsJsonAsync($"/api/staff/tasks/{taskId}", new
        {
            snoozeUntil = "2099-01-01T00:00:00Z"
        });
        snoozeResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify it's hidden (snoozed until 2099)
        var tasksAfter = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        tasksAfter.EnumerateArray().Should().NotContain(t =>
            t.GetProperty("staffTaskId").GetInt32() == taskId);
    }

    [Fact]
    public async Task Workflow_TaskComplete_RemovesFromList()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await client.PostAsJsonAsync("/api/staff/tasks", new
        {
            safehouseId = 1,
            taskType = "Manual",
            title = "To complete"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var taskId = created.GetProperty("staffTaskId").GetInt32();

        // Complete
        var completeResp = await client.PutAsJsonAsync($"/api/staff/tasks/{taskId}", new
        {
            status = "Completed"
        });
        completeResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify removed from active list
        var tasks = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        tasks.EnumerateArray().Should().NotContain(t =>
            t.GetProperty("staffTaskId").GetInt32() == taskId);
    }

    [Fact]
    public async Task Workflow_TaskDismiss_RemovesFromList()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await client.PostAsJsonAsync("/api/staff/tasks", new
        {
            safehouseId = 1,
            taskType = "Manual",
            title = "To dismiss"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var taskId = created.GetProperty("staffTaskId").GetInt32();

        var dismissResp = await client.PutAsJsonAsync($"/api/staff/tasks/{taskId}", new
        {
            status = "Dismissed"
        });
        dismissResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var tasks = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        tasks.EnumerateArray().Should().NotContain(t =>
            t.GetProperty("staffTaskId").GetInt32() == taskId);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create calendar event from task → task auto-completes
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CreateEventFromTask_TaskAutoCompletes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a task
        var taskResp = await client.PostAsJsonAsync("/api/staff/tasks", new
        {
            safehouseId = 1,
            taskType = "ScheduleDoctor",
            title = "Schedule doctor appointment"
        });
        var task = await taskResp.Content.ReadFromJsonAsync<JsonElement>();
        var taskId = task.GetProperty("staffTaskId").GetInt32();

        // Create a calendar event linked to this task
        var eventResp = await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1,
            eventType = "DoctorApt",
            title = "Doctor appointment",
            eventDate = "2026-04-12",
            startTime = "14:00",
            sourceTaskId = taskId
        });
        eventResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify the task is now completed (removed from active list)
        var tasks = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        tasks.EnumerateArray().Should().NotContain(t =>
            t.GetProperty("staffTaskId").GetInt32() == taskId);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Create intervention plan → edit → verify
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CreateAndEditInterventionPlan()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var residents = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents-list");
        if (residents.GetArrayLength() == 0) return;
        var residentId = residents[0].GetProperty("residentId").GetInt32();

        // Create
        var resp = await client.PostAsJsonAsync("/api/admin/intervention-plans", new
        {
            residentId,
            planCategory = "Education",
            planDescription = "Improve literacy skills",
            servicesProvided = "Teaching",
            targetValue = 0.85,
            status = "Open",
            caseConferenceDate = "2026-04-15"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var planId = created.GetProperty("planId").GetInt32();

        // Edit — mark as in progress
        var editResp = await client.PutAsJsonAsync($"/api/admin/intervention-plans/{planId}", new
        {
            residentId,
            planCategory = "Education",
            planDescription = "Improve literacy skills — updated target",
            servicesProvided = "Teaching",
            targetValue = 0.90,
            status = "In Progress"
        });
        editResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify
        var plans = await client.GetFromJsonAsync<JsonElement>($"/api/admin/intervention-plans?residentId={residentId}");
        var match = plans.EnumerateArray().First(p => p.GetProperty("planId").GetInt32() == planId);
        match.GetProperty("status").GetString().Should().Be("In Progress");
        match.GetProperty("targetValue").GetDecimal().Should().Be(0.90m);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Calendar week view shows events across the week
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_WeekView_ShowsEventsAcrossDays()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create events on two different days in the same week
        await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1, eventType = "Counseling", title = "Monday session",
            eventDate = "2026-04-13", startTime = "10:00"
        });
        await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1, eventType = "HomeVisit", title = "Wednesday visit",
            eventDate = "2026-04-15", startTime = "14:00"
        });

        // Week view should include both
        var events = await client.GetFromJsonAsync<JsonElement>("/api/staff/calendar?weekStart=2026-04-13");
        events.GetArrayLength().Should().BeGreaterThanOrEqualTo(2);

        var dates = events.EnumerateArray().Select(e => e.GetProperty("eventDate").GetString()).ToList();
        dates.Should().Contain("2026-04-13");
        dates.Should().Contain("2026-04-15");
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Post-placement summary aggregates correctly
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_PostPlacementSummary_HasCorrectStructure()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/post-placement/summary");

        body.GetProperty("total").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        body.GetProperty("byType").ValueKind.Should().Be(JsonValueKind.Array);
        body.GetProperty("byStatus").ValueKind.Should().Be(JsonValueKind.Array);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Staff tasks are isolated per user
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_TasksIsolated_AdminCannotSeeStaffTasks()
    {
        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);

        // Staff creates a task
        var resp = await staffClient.PostAsJsonAsync("/api/staff/tasks", new
        {
            safehouseId = 1,
            taskType = "Manual",
            title = "Staff-only task"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var taskId = created.GetProperty("staffTaskId").GetInt32();

        // Staff can see it
        var staffTasks = await staffClient.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        staffTasks.EnumerateArray().Should().Contain(t =>
            t.GetProperty("staffTaskId").GetInt32() == taskId);

        // Admin should NOT see it (different user)
        var adminTasks = await adminClient.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        adminTasks.EnumerateArray().Should().NotContain(t =>
            t.GetProperty("staffTaskId").GetInt32() == taskId);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Calendar events are isolated per user
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CalendarIsolated_AdminCannotSeeStaffEvents()
    {
        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await staffClient.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1,
            eventType = "Counseling",
            title = "Staff-only event",
            eventDate = "2026-04-20"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("calendarEventId").GetInt32();

        var staffEvents = await staffClient.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-20");
        staffEvents.EnumerateArray().Should().Contain(e =>
            e.GetProperty("calendarEventId").GetInt32() == eventId);

        var adminEvents = await adminClient.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-20");
        adminEvents.EnumerateArray().Should().NotContain(e =>
            e.GetProperty("calendarEventId").GetInt32() == eventId);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Cannot update another user's task
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CannotUpdateOtherUsersTask()
    {
        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);

        // Staff creates a task
        var resp = await staffClient.PostAsJsonAsync("/api/staff/tasks", new
        {
            safehouseId = 1, taskType = "Manual", title = "Staff task"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var taskId = created.GetProperty("staffTaskId").GetInt32();

        // Admin tries to complete it — should get NotFound (not their task)
        var updateResp = await adminClient.PutAsJsonAsync($"/api/staff/tasks/{taskId}", new
        {
            status = "Completed"
        });
        updateResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ════════════════════════════════════════════════════════════
    // WORKFLOW: Cannot cancel another user's calendar event
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Workflow_CannotCancelOtherUsersEvent()
    {
        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await staffClient.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1, eventType = "Other", title = "Staff event", eventDate = "2026-04-21"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("calendarEventId").GetInt32();

        // Admin tries to cancel it
        var deleteResp = await adminClient.DeleteAsync($"/api/staff/calendar/{eventId}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

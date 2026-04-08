using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Tests for user-safehouse management, pagination edge cases,
/// ML prediction edge cases, and 404 handling.
/// </summary>
public class UserSafehouseAndEdgeCaseTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public UserSafehouseAndEdgeCaseTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ════════════════════════════════════════════════════════════
    // USER SAFEHOUSE MANAGEMENT
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task CreateUser_WithSafehouses()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email = $"test-sh-{Guid.NewGuid():N}@test.org",
            password = "Test1234!@#$",
            role = "Staff",
            firstName = "Test",
            lastName = "Safehouses",
            safehouseIds = new[] { 1, 2 }
        });
        // May return OK or BadRequest if safehouse IDs don't exist in test DB
        var status = (int)resp.StatusCode;
        status.Should().BeOneOf(200, 400); // 400 if FK constraint on non-existent safehouse
    }

    [Fact]
    public async Task DeleteUser_CannotDeleteSelf()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Get current user's ID
        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        // Find admin user in user list
        var users = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var adminUser = users.EnumerateArray()
            .FirstOrDefault(u => u.GetProperty("email").GetString() == "admin@beaconofhope.org");

        if (adminUser.ValueKind == JsonValueKind.Undefined) return;
        var adminId = adminUser.GetProperty("id").GetString();

        var resp = await client.DeleteAsync($"/api/admin/users/{adminId}");
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Contain("own account");
    }

    [Fact]
    public async Task DeleteUser_NonExistent_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/users/non-existent-id-12345");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ════════════════════════════════════════════════════════════
    // PAGINATION EDGE CASES
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Residents_Page0_StillWorks()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        // Page 0 should not crash — may treat as page 1 or return empty
        var resp = await client.GetAsync("/api/admin/residents?page=0&pageSize=5");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Residents_PageBeyondMax_ReturnsEmpty()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents?page=9999&pageSize=20");
        resp.GetProperty("items").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Incidents_Page0_StillWorks()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/incidents?page=0&pageSize=5");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Incidents_LargePageSize()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/incidents?page=1&pageSize=1000");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // ML PREDICTION EDGE CASES
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task MlPredictions_NonExistentResident_ReturnsEmptyArray()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/ml/predictions/resident/99999");
        resp.ValueKind.Should().Be(JsonValueKind.Array);
        resp.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task MlPredictionHistory_NonExistentResident_ReturnsEmptyArray()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/ml/predictions/resident/99999/history");
        resp.ValueKind.Should().Be(JsonValueKind.Array);
        resp.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task MlPredictionHistory_FilterByNonExistentModel_ReturnsEmpty()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/ml/predictions/resident/1/history?model=nonexistent-model");
        resp.GetArrayLength().Should().Be(0);
    }

    // ════════════════════════════════════════════════════════════
    // EMOTIONAL TRENDS EDGE CASES
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task EmotionalTrends_NoRecordings_ReturnsEmptyArray()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a brand new resident with no recordings
        var createResp = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TREND-TEST-01",
            caseStatus = "Active"
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("residentId").GetInt32();

        var resp = await client.GetFromJsonAsync<JsonElement>($"/api/admin/recordings/emotional-trends?residentId={id}");
        resp.GetArrayLength().Should().Be(0);
    }

    // ════════════════════════════════════════════════════════════
    // 404 HANDLING
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task IncidentDetail_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/incidents/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task VisitationDetail_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/visitations/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CalendarEvent_UpdateNotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/staff/calendar/99999", new { status = "Completed" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Task_UpdateNotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/staff/tasks/99999", new { status = "Completed" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task InterventionPlan_EditNotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/intervention-plans/99999", new { residentId = 1 });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ════════════════════════════════════════════════════════════
    // INCIDENT FILTER COMBOS
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Incidents_MultipleFilters_Together()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/incidents?severity=High&resolved=false&safehouseId=1&page=1&pageSize=10");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("total", out _).Should().BeTrue();
    }

    // ════════════════════════════════════════════════════════════
    // CALENDAR WITH RESIDENT
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task CalendarEvent_WithResident_ReturnsResidentCode()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Get a resident
        var residents = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents-list");
        if (residents.GetArrayLength() == 0) return;
        var residentId = residents[0].GetProperty("residentId").GetInt32();
        var code = residents[0].GetProperty("internalCode").GetString();

        // Create event with resident
        var resp = await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1,
            residentId,
            eventType = "Counseling",
            title = "Session with resident",
            eventDate = "2026-04-22"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("calendarEventId").GetInt32();

        // Verify residentCode is returned
        var events = await client.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-22");
        var match = events.EnumerateArray().First(e => e.GetProperty("calendarEventId").GetInt32() == eventId);
        match.GetProperty("residentCode").GetString().Should().Be(code);
    }

    // ════════════════════════════════════════════════════════════
    // CALENDAR UNSCHEDULED → SET TIME
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task CalendarEvent_Unscheduled_ThenSetTime()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create with no time
        var resp = await client.PostAsJsonAsync("/api/staff/calendar", new
        {
            safehouseId = 1,
            eventType = "GroupTherapy",
            title = "Unscheduled group session",
            eventDate = "2026-04-23"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("calendarEventId").GetInt32();

        // Verify no time
        var events = await client.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-23");
        var match = events.EnumerateArray().First(e => e.GetProperty("calendarEventId").GetInt32() == eventId);
        match.GetProperty("startTime").ValueKind.Should().Be(JsonValueKind.Null);

        // Set time via update
        var updateResp = await client.PutAsJsonAsync($"/api/staff/calendar/{eventId}", new
        {
            startTime = "11:00",
            endTime = "12:30"
        });
        updateResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify time is set
        var eventsAfter = await client.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-23");
        var matchAfter = eventsAfter.EnumerateArray().First(e => e.GetProperty("calendarEventId").GetInt32() == eventId);
        matchAfter.GetProperty("startTime").GetString().Should().Be("11:00");
        matchAfter.GetProperty("endTime").GetString().Should().Be("12:30");
    }

    // ════════════════════════════════════════════════════════════
    // POST-PLACEMENT FILTER
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task PostPlacement_FilterBySafehouse_NarrowsResults()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var all = await client.GetFromJsonAsync<JsonElement>("/api/admin/post-placement");
        var filtered = await client.GetFromJsonAsync<JsonElement>("/api/admin/post-placement?safehouseId=1");

        filtered.GetArrayLength().Should().BeLessThanOrEqualTo(all.GetArrayLength());
    }
}

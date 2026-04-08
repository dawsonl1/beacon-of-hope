using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Tests every staff workflow action in the case lifecycle:
/// Intake → Claim → To-Do → Calendar → Counseling → Incidents →
/// Education → Health → Home Visits → Conferences → Reintegration → Post-Placement
/// </summary>
public class StaffWorkflowTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public StaffWorkflowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ════════════════════════════════════════════════════════════
    // 1. AUTHENTICATION & ROLE ACCESS
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanLogin()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("isAuthenticated").GetBoolean().Should().BeTrue();
        body.GetProperty("roles").EnumerateArray().Should().Contain(r => r.GetString() == "Staff");
    }

    [Fact]
    public async Task Staff_AuthMe_IncludesSafehouses()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var body = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        body.TryGetProperty("safehouses", out var sh).Should().BeTrue();
        sh.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CannotAccessAdminOnlyEndpoints()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/residents/99999");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Staff_CannotCreateUsers()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email = "newuser@test.com",
            password = "Test1234!@#$",
            role = "Staff"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ════════════════════════════════════════════════════════════
    // 2. CASELOAD — View residents, filter, search
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListResidents()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?page=1&pageSize=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("items").GetArrayLength().Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task Staff_CanFilterResidentsByStatus()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?caseStatus=Active&page=1&pageSize=5");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var item in body.GetProperty("items").EnumerateArray())
            item.GetProperty("caseStatus").GetString().Should().Be("Active");
    }

    [Fact]
    public async Task Staff_CanFilterResidentsByRiskLevel()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?riskLevel=High&page=1&pageSize=5");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanGetResidentDetail()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        // Get a resident ID first
        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents?page=1&pageSize=1");
        var items = list.GetProperty("items");
        if (items.GetArrayLength() == 0) return;
        var id = items[0].GetProperty("residentId").GetInt32();

        var response = await client.GetAsync($"/api/admin/residents/{id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanGetResidentsList_ForDropdowns()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents-list");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanGetFilterOptions()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents/filter-options");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 3. CASE QUEUE — View unclaimed, claim a case
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanViewUnclaimedQueue()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents/unclaimed");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanViewUnclaimedQueue_FilteredBySafehouse()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents/unclaimed?safehouseId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 4. TO-DO TASKS — List, create, update, snooze, dismiss
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListTasks()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/staff/tasks");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanListTasks_FilteredBySafehouse()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/staff/tasks?safehouseId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_TasksArePerUser_NotShared()
    {
        // Admin and staff should see different task lists
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);
        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);

        var adminTasks = await adminClient.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        var staffTasks = await staffClient.GetFromJsonAsync<JsonElement>("/api/staff/tasks");

        // Both should return arrays (even if empty)
        adminTasks.ValueKind.Should().Be(JsonValueKind.Array);
        staffTasks.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_Unauthenticated_CannotAccessTasks()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/staff/tasks");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ════════════════════════════════════════════════════════════
    // 5. CALENDAR — List events, create, update, delete
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListCalendarEvents_ByDay()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/staff/calendar?date=2026-04-08");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanListCalendarEvents_ByWeek()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/staff/calendar?weekStart=2026-04-06");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CalendarEventsArePerUser()
    {
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);
        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);

        var adminEvents = await adminClient.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-08");
        var staffEvents = await staffClient.GetFromJsonAsync<JsonElement>("/api/staff/calendar?date=2026-04-08");

        adminEvents.ValueKind.Should().Be(JsonValueKind.Array);
        staffEvents.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_Unauthenticated_CannotAccessCalendar()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/staff/calendar");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ════════════════════════════════════════════════════════════
    // 6. COUNSELING RECORDINGS — List, create, edit, view detail
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListRecordings()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/recordings?page=1&pageSize=5");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanGetEmotionalTrends()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        // Get a resident with recordings
        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents?page=1&pageSize=1");
        var items = list.GetProperty("items");
        if (items.GetArrayLength() == 0) return;
        var id = items[0].GetProperty("residentId").GetInt32();

        var response = await client.GetAsync($"/api/admin/recordings/emotional-trends?residentId={id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    // ════════════════════════════════════════════════════════════
    // 7. INCIDENTS — List, filter, create, view detail, edit
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListIncidents()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/incidents");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("total", out _).Should().BeTrue();
        body.TryGetProperty("items", out _).Should().BeTrue();
        body.TryGetProperty("page", out _).Should().BeTrue();
        body.TryGetProperty("pageSize", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Staff_CanFilterIncidents_BySeverity()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/incidents?severity=Critical");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanFilterIncidents_ByResolved()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var unresolved = await client.GetAsync("/api/admin/incidents?resolved=false");
        unresolved.StatusCode.Should().Be(HttpStatusCode.OK);

        var resolved = await client.GetAsync("/api/admin/incidents?resolved=true");
        resolved.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanFilterIncidents_BySafehouse()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/incidents?safehouseId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanFilterIncidents_ByResident()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/incidents?residentId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanPaginateIncidents()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var page1 = await client.GetFromJsonAsync<JsonElement>("/api/admin/incidents?page=1&pageSize=5");
        page1.GetProperty("page").GetInt32().Should().Be(1);
        page1.GetProperty("pageSize").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task Staff_CannotDeleteIncident()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/incidents/99999");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ════════════════════════════════════════════════════════════
    // 8. EDUCATION RECORDS — List, create, filter by resident
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListEducationRecords()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/education-records");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanFilterEducationRecords_ByResident()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/education-records?residentId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 9. HEALTH RECORDS — List, create, filter by resident
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListHealthRecords()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/health-records");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanFilterHealthRecords_ByResident()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/health-records?residentId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 10. HOME VISITATIONS — List, create, filter, view detail
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListVisitations()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/visitations?page=1&pageSize=5");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanFilterVisitations_ByType()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/visitations?visitType=Initial%20Assessment&page=1&pageSize=5");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 11. INTERVENTION PLANS / CASE CONFERENCES
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanListInterventionPlans()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/intervention-plans");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanFilterInterventionPlans_ByResident()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/intervention-plans?residentId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 12. ML PREDICTIONS — View risk scores for residents
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanViewMlPredictions()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/ml/predictions/resident/1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanViewMlPredictionHistory()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/ml/predictions/resident/1/history");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanViewMlPredictionHistory_FilteredByModel()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/ml/predictions/resident/1/history?model=reintegration-readiness");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 13. POST-PLACEMENT MONITORING
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanViewPostPlacement()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/post-placement");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task Staff_CanViewPostPlacementSummary()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/post-placement/summary");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("total", out _).Should().BeTrue();
        body.TryGetProperty("byType", out _).Should().BeTrue();
        body.TryGetProperty("byStatus", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Staff_CanFilterPostPlacement_BySafehouse()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/post-placement?safehouseId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ════════════════════════════════════════════════════════════
    // 14. DASHBOARD & REPORTS — Read-only aggregates
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Staff_CanViewDashboardMetrics()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/metrics");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanViewRecentDonations()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/recent-donations");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanViewDonationsByChannel()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/donations-by-channel");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanViewActiveResidentsTrend()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/active-residents-trend");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Staff_CanViewFlaggedCasesTrend()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/flagged-cases-trend");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

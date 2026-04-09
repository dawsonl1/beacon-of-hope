using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class ValidationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ValidationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<int> GetFirstResidentIdAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/admin/residents-list");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var arr = body.EnumerateArray().ToArray();
        return arr.Length > 0 ? arr[0].GetProperty("residentId").GetInt32() : 0;
    }

    private async Task<int> GetFirstSafehouseIdAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/admin/safehouses");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var arr = body.EnumerateArray().ToArray();
        return arr.Length > 0 ? arr[0].GetProperty("safehouseId").GetInt32() : 0;
    }

    // ── Incidents ──────────────────────────────────────────────

    [Fact]
    public async Task CreateIncident_MissingResidentId_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/incidents", new
        {
            incidentDate = "2026-01-15",
            incidentType = "Behavioral",
            severity = "Low"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateIncident_MissingIncidentType_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/incidents", new
        {
            residentId,
            incidentDate = "2026-01-15",
            severity = "Low"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateIncident_MissingSeverity_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/incidents", new
        {
            residentId,
            incidentDate = "2026-01-15",
            incidentType = "Behavioral"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateIncident_ValidPayload_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/incidents", new
        {
            residentId,
            safehouseId = (int?)null,
            incidentDate = "2026-01-15",
            incidentType = "Behavioral",
            severity = "Low",
            description = "Test incident"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Education Records ──────────────────────────────────────

    [Fact]
    public async Task CreateEducationRecord_ZeroResidentId_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/education-records", new
        {
            residentId = 0,
            recordDate = "2026-01-15",
            educationLevel = "Elementary"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateEducationRecord_AttendanceOutOfRange_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/education-records", new
        {
            residentId,
            attendanceRate = 150
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateEducationRecord_ProgressOutOfRange_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/education-records", new
        {
            residentId,
            progressPercent = -5
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateEducationRecord_ValidPayload_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/education-records", new
        {
            residentId,
            recordDate = "2026-01-15",
            educationLevel = "Elementary",
            attendanceRate = 85,
            progressPercent = 70
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Health Records ─────────────────────────────────────────

    [Fact]
    public async Task CreateHealthRecord_ZeroResidentId_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/health-records", new
        {
            residentId = 0,
            recordDate = "2026-01-15"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateHealthRecord_NegativeNutritionScore_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/health-records", new
        {
            residentId,
            nutritionScore = -1
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateHealthRecord_ScoreOver100_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/health-records", new
        {
            residentId,
            generalHealthScore = 101
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateHealthRecord_ValidPayload_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/health-records", new
        {
            residentId,
            recordDate = "2026-01-15",
            nutritionScore = 75,
            generalHealthScore = 80
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Intervention Plans ─────────────────────────────────────

    [Fact]
    public async Task CreateInterventionPlan_ZeroResidentId_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/intervention-plans", new
        {
            residentId = 0,
            planCategory = "Health"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateInterventionPlan_ValidPayload_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/intervention-plans", new
        {
            residentId,
            planCategory = "Health",
            planDescription = "Regular checkups",
            caseConferenceDate = "2026-03-15"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Visitations ────────────────────────────────────────────

    [Fact]
    public async Task CreateVisitation_ZeroResidentId_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId = 0,
            visitDate = "2026-01-15",
            visitType = "Routine Follow-Up"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateVisitation_ValidPayload_ReturnsCreated()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId,
            visitDate = "2026-01-15",
            visitType = "Routine Follow-Up",
            observations = "Home is clean and safe"
        });
        // Accept either 200 or 201 Created
        ((int)response.StatusCode).Should().BeOneOf(200, 201);
    }
}

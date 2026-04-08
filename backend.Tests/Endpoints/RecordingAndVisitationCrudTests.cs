using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Full CRUD tests for recordings, visitations, education/health record edits,
/// and user safehouse management.
/// </summary>
public class RecordingAndVisitationCrudTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public RecordingAndVisitationCrudTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // Helper: get first resident ID
    private async Task<int> GetAnyResidentId(HttpClient client)
    {
        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/residents-list");
        return list.GetArrayLength() > 0 ? list[0].GetProperty("residentId").GetInt32() : 0;
    }

    // ════════════════════════════════════════════════════════════
    // RECORDINGS CRUD
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task CreateRecording_AllFields_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetAnyResidentId(client);
        if (residentId == 0) return;

        var resp = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2026-04-08",
            socialWorker = "SW-Test",
            sessionType = "Individual Counseling",
            sessionDurationMinutes = 45,
            emotionalStateObserved = "Struggling",
            emotionalStateEnd = "Coping",
            sessionNarrative = "Test session narrative for verification",
            interventionsApplied = "CBT, Grounding",
            followUpActions = "Schedule follow-up in 2 weeks",
            progressNoted = true,
            concernsFlagged = false,
            referralMade = false,
            notesRestricted = "Confidential test note"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("recordingId").GetInt32();

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/recordings/{id}");
        detail.GetProperty("sessionType").GetString().Should().Be("Individual Counseling");
        detail.GetProperty("sessionDurationMinutes").GetInt32().Should().Be(45);
        detail.GetProperty("emotionalStateObserved").GetString().Should().Be("Struggling");
        detail.GetProperty("emotionalStateEnd").GetString().Should().Be("Coping");
        detail.GetProperty("progressNoted").GetBoolean().Should().BeTrue();
        detail.GetProperty("notesRestricted").GetString().Should().Be("Confidential test note");
    }

    [Fact]
    public async Task EditRecording_UpdatesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetAnyResidentId(client);
        if (residentId == 0) return;

        // Create
        var createResp = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2026-04-07",
            sessionType = "Assessment",
            emotionalStateObserved = "Neutral",
            emotionalStateEnd = "Neutral"
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("recordingId").GetInt32();

        // Edit
        var editResp = await client.PutAsJsonAsync($"/api/admin/recordings/{id}", new
        {
            residentId,
            sessionDate = "2026-04-07",
            sessionType = "Crisis Intervention",
            emotionalStateObserved = "Distressed",
            emotionalStateEnd = "Stable",
            sessionNarrative = "Updated narrative",
            concernsFlagged = true
        });
        editResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/recordings/{id}");
        detail.GetProperty("sessionType").GetString().Should().Be("Crisis Intervention");
        detail.GetProperty("emotionalStateEnd").GetString().Should().Be("Stable");
        detail.GetProperty("concernsFlagged").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task GetRecording_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/recordings/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ════════════════════════════════════════════════════════════
    // VISITATIONS CRUD
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task CreateVisitation_AllFields_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetAnyResidentId(client);
        if (residentId == 0) return;

        var resp = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId,
            visitDate = "2026-04-08",
            socialWorker = "SW-Test",
            visitType = "Initial Assessment",
            locationVisited = "Family home, Dededo",
            familyMembersPresent = "Mother, grandmother",
            purpose = "Initial assessment of home environment",
            observations = "Clean and safe environment observed",
            familyCooperationLevel = "Cooperative",
            safetyConcernsNoted = false,
            followUpNeeded = true,
            followUpNotes = "Schedule routine follow-up in 30 days",
            visitOutcome = "Favorable"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("visitationId").GetInt32();

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/visitations/{id}");
        detail.GetProperty("visitType").GetString().Should().Be("Initial Assessment");
        detail.GetProperty("familyCooperationLevel").GetString().Should().Be("Cooperative");
        detail.GetProperty("followUpNeeded").GetBoolean().Should().BeTrue();
        detail.GetProperty("visitOutcome").GetString().Should().Be("Favorable");
    }

    [Fact]
    public async Task EditVisitation_UpdatesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetAnyResidentId(client);
        if (residentId == 0) return;

        var createResp = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId,
            visitDate = "2026-04-06",
            visitType = "Routine Follow-Up",
            familyCooperationLevel = "Cooperative"
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("visitationId").GetInt32();

        var editResp = await client.PutAsJsonAsync($"/api/admin/visitations/{id}", new
        {
            residentId,
            visitDate = "2026-04-06",
            visitType = "Routine Follow-Up",
            familyCooperationLevel = "Partially Cooperative",
            safetyConcernsNoted = true,
            observations = "Some concerns noted about overcrowding"
        });
        editResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/visitations/{id}");
        detail.GetProperty("familyCooperationLevel").GetString().Should().Be("Partially Cooperative");
        detail.GetProperty("safetyConcernsNoted").GetBoolean().Should().BeTrue();
    }

    // ════════════════════════════════════════════════════════════
    // EDUCATION RECORD EDIT
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task EditEducationRecord_UpdatesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetAnyResidentId(client);
        if (residentId == 0) return;

        // Create
        var createResp = await client.PostAsJsonAsync("/api/admin/education-records", new
        {
            residentId,
            recordDate = "2026-04-05",
            educationLevel = "Elementary",
            attendanceRate = 70.0,
            progressPercent = 40.0,
            completionStatus = "In Progress"
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("educationRecordId").GetInt32();

        // Edit
        var editResp = await client.PutAsJsonAsync($"/api/admin/education-records/{id}", new
        {
            residentId,
            recordDate = "2026-04-05",
            educationLevel = "Elementary",
            attendanceRate = 92.0,
            progressPercent = 75.0,
            completionStatus = "In Progress",
            notes = "Significant improvement this month"
        });
        editResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify by fetching records for the resident
        var records = await client.GetFromJsonAsync<JsonElement>($"/api/admin/education-records?residentId={residentId}");
        var match = records.EnumerateArray().First(r => r.GetProperty("educationRecordId").GetInt32() == id);
        match.GetProperty("attendanceRate").GetDecimal().Should().Be(92.0m);
        match.GetProperty("progressPercent").GetDecimal().Should().Be(75.0m);
    }

    [Fact]
    public async Task EditEducationRecord_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/education-records/99999", new
        {
            residentId = 1, recordDate = "2026-01-01"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ════════════════════════════════════════════════════════════
    // HEALTH RECORD EDIT
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task EditHealthRecord_UpdatesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetAnyResidentId(client);
        if (residentId == 0) return;

        var createResp = await client.PostAsJsonAsync("/api/admin/health-records", new
        {
            residentId,
            recordDate = "2026-04-05",
            weightKg = 40.0,
            heightCm = 150.0,
            generalHealthScore = 6.0,
            medicalCheckupDone = false,
            dentalCheckupDone = false
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("healthRecordId").GetInt32();

        var editResp = await client.PutAsJsonAsync($"/api/admin/health-records/{id}", new
        {
            residentId,
            recordDate = "2026-04-05",
            weightKg = 42.0,
            heightCm = 151.0,
            generalHealthScore = 8.0,
            medicalCheckupDone = true,
            dentalCheckupDone = true,
            notes = "Post-checkup update"
        });
        editResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var records = await client.GetFromJsonAsync<JsonElement>($"/api/admin/health-records?residentId={residentId}");
        var match = records.EnumerateArray().First(r => r.GetProperty("healthRecordId").GetInt32() == id);
        match.GetProperty("weightKg").GetDecimal().Should().Be(42.0m);
        match.GetProperty("medicalCheckupDone").GetBoolean().Should().BeTrue();
        match.GetProperty("dentalCheckupDone").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task EditHealthRecord_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/health-records/99999", new
        {
            residentId = 1, recordDate = "2026-01-01"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

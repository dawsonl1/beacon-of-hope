using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Tests for case claiming, resident CRUD, and the full intake workflow.
/// </summary>
public class ClaimAndResidentTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ClaimAndResidentTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ════════════════════════════════════════════════════════════
    // CLAIM WORKFLOW
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Claim_SetsAssignedSocialWorker()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a resident with no social worker
        var createResp = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "CLAIM-TEST-01",
            caseControlNo = "CT001",
            caseStatus = "Active",
            safehouseId = (int?)null
        });
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var residentId = created.GetProperty("residentId").GetInt32();

        // Claim the case
        var claimResp = await client.PostAsync($"/api/admin/residents/{residentId}/claim", null);
        claimResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify the resident now has an assigned social worker
        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/residents/{residentId}");
        detail.GetProperty("assignedSocialWorker").GetString().Should().NotBeNullOrEmpty();
        detail.GetProperty("assignedSocialWorker").GetString().Should().Contain("Director");
    }

    [Fact]
    public async Task Claim_GeneratesInitialHomeVisitTask()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var createResp = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "CLAIM-TEST-02",
            caseControlNo = "CT002",
            caseStatus = "Active"
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var residentId = created.GetProperty("residentId").GetInt32();

        // Get tasks before
        var tasksBefore = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        var countBefore = tasksBefore.GetArrayLength();

        // Claim
        await client.PostAsync($"/api/admin/residents/{residentId}/claim", null);

        // Get tasks after — should have one more
        var tasksAfter = await client.GetFromJsonAsync<JsonElement>("/api/staff/tasks");
        tasksAfter.GetArrayLength().Should().BeGreaterThan(countBefore);

        // The new task should be a home visit task for this resident
        tasksAfter.EnumerateArray().Should().Contain(t =>
            t.GetProperty("taskType").GetString() == "ScheduleHomeVisit" &&
            t.GetProperty("residentId").GetInt32() == residentId);
    }

    [Fact]
    public async Task Claim_NonExistentResident_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsync("/api/admin/residents/99999/claim", null);
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ════════════════════════════════════════════════════════════
    // RESIDENT CRUD
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task CreateResident_AllFields_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "FULL-TEST-01",
            caseControlNo = "CFT001",
            caseStatus = "Active",
            sex = "Female",
            dateOfBirth = "2015-03-15",
            placeOfBirth = "Dededo",
            religion = "Catholic",
            caseCategory = "Neglected",
            currentRiskLevel = "High",
            initialRiskLevel = "Critical",
            referralSource = "Government",
            assignedSocialWorker = "SW-Test",
            isPwd = false,
            hasSpecialNeeds = false,
            familyIs4ps = true,
            familySoloParent = false,
            subCatOrphaned = false,
            subCatTrafficked = false,
            subCatChildLabor = false,
            subCatPhysicalAbuse = true,
            subCatSexualAbuse = false,
            subCatOsaec = false,
            subCatCicl = false,
            subCatAtRisk = true,
            subCatStreetChild = false,
            subCatChildWithHiv = false
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("residentId").GetInt32();

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/residents/{id}");
        detail.GetProperty("internalCode").GetString().Should().Be("FULL-TEST-01");
        detail.GetProperty("caseStatus").GetString().Should().Be("Active");
        detail.GetProperty("sex").GetString().Should().Be("Female");
        detail.GetProperty("currentRiskLevel").GetString().Should().Be("High");
        detail.GetProperty("caseCategory").GetString().Should().Be("Neglected");
        detail.GetProperty("familyIs4ps").GetBoolean().Should().BeTrue();
        detail.GetProperty("subCatPhysicalAbuse").GetBoolean().Should().BeTrue();
        detail.GetProperty("subCatAtRisk").GetBoolean().Should().BeTrue();
        detail.GetProperty("subCatOrphaned").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task EditResident_UpdatesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create
        var createResp = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "EDIT-TEST-01",
            caseStatus = "Active",
            currentRiskLevel = "Low"
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("residentId").GetInt32();

        // Edit
        var editResp = await client.PutAsJsonAsync($"/api/admin/residents/{id}", new
        {
            internalCode = "EDIT-TEST-01",
            caseStatus = "Closed",
            currentRiskLevel = "High",
            reintegrationType = "Family Reunification",
            reintegrationStatus = "Completed"
        });
        editResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify
        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/admin/residents/{id}");
        detail.GetProperty("caseStatus").GetString().Should().Be("Closed");
        detail.GetProperty("currentRiskLevel").GetString().Should().Be("High");
        detail.GetProperty("reintegrationType").GetString().Should().Be("Family Reunification");
    }

    [Fact]
    public async Task GetResident_NotFound_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/residents/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteResident_NotFound_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/residents/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Staff_CannotDeleteResident()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/residents/1");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

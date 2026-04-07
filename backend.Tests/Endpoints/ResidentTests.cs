using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class ResidentTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ResidentTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ListResidents_DefaultPagination()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("items", out _).Should().BeTrue();
        body.TryGetProperty("totalCount", out _).Should().BeTrue();
        body.GetProperty("page").GetInt32().Should().Be(1);
        body.GetProperty("pageSize").GetInt32().Should().Be(20);
    }

    [Fact]
    public async Task ListResidents_PaginationMetadata()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?page=1&pageSize=5");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        body.GetProperty("page").GetInt32().Should().Be(1);
        body.GetProperty("pageSize").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task ListResidents_SearchByCode()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // First get any resident code from the list
        var allResponse = await client.GetAsync("/api/admin/residents?page=1&pageSize=1");
        var allBody = await allResponse.Content.ReadFromJsonAsync<JsonElement>();
        var items = allBody.GetProperty("items");
        if (items.GetArrayLength() == 0) return;

        var code = items[0].GetProperty("internalCode").GetString();
        if (string.IsNullOrEmpty(code)) return;

        var response = await client.GetAsync($"/api/admin/residents?search={code}&page=1&pageSize=20");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task ListResidents_FilterByCaseStatus()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?caseStatus=Active&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        foreach (var item in body.GetProperty("items").EnumerateArray())
        {
            item.GetProperty("caseStatus").GetString().Should().Be("Active");
        }
    }

    [Fact]
    public async Task ListResidents_FilterBySafehouse()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?safehouseId=1&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        foreach (var item in body.GetProperty("items").EnumerateArray())
        {
            item.GetProperty("safehouseId").GetInt32().Should().Be(1);
        }
    }

    [Fact]
    public async Task ListResidents_FilterByCategory()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?caseCategory=Neglected&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        // Just verify it returns 200 and has the expected shape
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("items", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ListResidents_FilterByRiskLevel()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?riskLevel=Critical&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("items", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ListResidents_MultipleFilters()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?caseStatus=Active&riskLevel=Critical&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListResidents_SortByAdmission()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents?sortBy=dateofadmission&sortDir=desc&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetResident_InvalidId_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents/99999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateResident_ValidData_ReturnsCreated()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-CR-001",
            caseStatus = "Active",
            caseCategory = "Neglected",
            sex = "F",
            currentRiskLevel = "Medium"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("residentId").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateResident_NullBody_ReturnsBadRequest()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsync("/api/admin/residents",
            new StringContent("null", Encoding.UTF8, "application/json"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateResident_ValidData_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create first
        var createResponse = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-UPD-001",
            caseStatus = "Active"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("residentId").GetInt32();

        // Update
        var updateResponse = await client.PutAsJsonAsync($"/api/admin/residents/{id}", new
        {
            internalCode = "TEST-UPD-001",
            caseStatus = "Closed"
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateResident_InvalidId_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PutAsJsonAsync("/api/admin/residents/99999", new
        {
            internalCode = "TEST-UPD-INVALID",
            caseStatus = "Active"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteResident_ValidId_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create first
        var createResponse = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-DEL-001",
            caseStatus = "Active"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("residentId").GetInt32();

        // Delete
        var deleteResponse = await client.DeleteAsync($"/api/admin/residents/{id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetResident_ValidId_ReturnsAllFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a full resident
        var createResponse = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-GET-001",
            caseStatus = "Active",
            caseCategory = "Neglected",
            sex = "F",
            currentRiskLevel = "Medium",
            assignedSocialWorker = "Test Worker"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("residentId").GetInt32();

        var response = await client.GetAsync($"/api/admin/residents/{id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        body.GetProperty("residentId").GetInt32().Should().Be(id);
        body.TryGetProperty("caseStatus", out _).Should().BeTrue();
        body.TryGetProperty("caseCategory", out _).Should().BeTrue();
        body.TryGetProperty("sex", out _).Should().BeTrue();
        body.TryGetProperty("currentRiskLevel", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateResident_MalformedJson_ReturnsError()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var content = new StringContent("{invalid json", Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/admin/residents", content);

        // Malformed JSON causes a deserialization error; the framework returns 400 or 500
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task FilterOptions_ReturnsDistinctValues()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/residents/filter-options");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("caseStatuses", out _).Should().BeTrue();
        body.TryGetProperty("safehouses", out _).Should().BeTrue();
        body.TryGetProperty("categories", out _).Should().BeTrue();
        body.TryGetProperty("riskLevels", out _).Should().BeTrue();
        body.TryGetProperty("socialWorkers", out _).Should().BeTrue();
    }
}

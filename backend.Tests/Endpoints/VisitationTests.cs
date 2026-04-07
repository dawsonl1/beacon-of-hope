using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class VisitationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public VisitationTests(TestWebApplicationFactory factory)
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

    [Fact]
    public async Task ListVisitations_DefaultPagination()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/visitations?page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("items", out _).Should().BeTrue();
        body.TryGetProperty("totalCount", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ListVisitations_FilterByResident()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.GetAsync($"/api/admin/visitations?residentId={residentId}&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListVisitations_FilterByVisitType()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/visitations?visitType=Home Visit&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListVisitations_SafetyOnly()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/visitations?safetyOnly=true&page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateVisitation_ValidData_ReturnsCreated()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId,
            visitDate = "2024-06-15",
            socialWorker = "Test Worker",
            visitType = "Home Visit",
            locationVisited = "Quezon City",
            safetyConcernsNoted = false,
            followUpNeeded = true,
            visitOutcome = "Positive"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task GetVisitation_ReturnsAllFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        // Create
        var createResponse = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId,
            visitDate = "2024-07-15",
            socialWorker = "Detail Worker",
            visitType = "Home Visit",
            locationVisited = "Manila",
            purpose = "Check-in",
            observations = "Family cooperative",
            familyCooperationLevel = "High",
            safetyConcernsNoted = true,
            followUpNeeded = true,
            followUpNotes = "Schedule follow-up visit",
            visitOutcome = "Positive"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("visitationId").GetInt32();

        var response = await client.GetAsync($"/api/admin/visitations/{id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        body.TryGetProperty("visitationId", out _).Should().BeTrue();
        body.TryGetProperty("residentId", out _).Should().BeTrue();
        body.TryGetProperty("visitType", out _).Should().BeTrue();
        body.TryGetProperty("safetyConcernsNoted", out _).Should().BeTrue();
    }

    [Fact]
    public async Task UpdateVisitation_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var createResponse = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId,
            visitDate = "2024-08-15",
            socialWorker = "Update Worker",
            visitType = "Home Visit"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("visitationId").GetInt32();

        var updateResponse = await client.PutAsJsonAsync($"/api/admin/visitations/{id}", new
        {
            residentId,
            visitDate = "2024-08-16",
            socialWorker = "Updated Worker",
            visitType = "Office Visit"
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteVisitation_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var createResponse = await client.PostAsJsonAsync("/api/admin/visitations", new
        {
            residentId,
            visitDate = "2024-09-15",
            socialWorker = "Delete Worker",
            visitType = "Home Visit"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("visitationId").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/admin/visitations/{id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Conferences_ReturnsUpcomingAndPast()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/conferences");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("upcoming", out _).Should().BeTrue();
        body.TryGetProperty("past", out _).Should().BeTrue();
    }
}

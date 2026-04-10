using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class OutreachTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public OutreachTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<int> CreateSupporter(HttpClient client)
    {
        var resp = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Test Donor",
            firstName = "Test",
            lastName = "Donor",
            email = "testdonor@example.com",
            status = "Active"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("supporterId").GetInt32();
    }

    [Fact]
    public async Task CreateOutreach_Email_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(client);

        var response = await client.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Email"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("id", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateOutreach_Note_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(client);

        var response = await client.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Note",
            note = "Called donor to discuss renewal"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("id", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateOutreach_InvalidType_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(client);

        var response = await client.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Phone"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateOutreach_NonexistentSupporter_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var response = await client.PostAsJsonAsync("/api/admin/supporters/999999/outreach", new
        {
            outreachType = "Email"
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListOutreach_EmptyInitially()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(client);

        var response = await client.GetAsync($"/api/admin/supporters/{supporterId}/outreach");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task ListOutreach_ReturnsCreatedRecords()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(client);

        await client.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Email"
        });
        await client.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Note",
            note = "Follow-up call"
        });

        var response = await client.GetAsync($"/api/admin/supporters/{supporterId}/outreach");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().Be(2);

        // Verify fields are present on first record
        var first = body[0];
        first.TryGetProperty("id", out _).Should().BeTrue();
        first.TryGetProperty("staffEmail", out _).Should().BeTrue();
        first.TryGetProperty("staffName", out _).Should().BeTrue();
        first.TryGetProperty("outreachType", out _).Should().BeTrue();
        first.TryGetProperty("createdAt", out _).Should().BeTrue();
    }

    [Fact]
    public async Task StaffCanAccessOutreach()
    {
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(adminClient);

        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);

        // Staff can create
        var postResp = await staffClient.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Email"
        });
        postResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Staff can list
        var getResp = await staffClient.GetAsync($"/api/admin/supporters/{supporterId}/outreach");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateOutreach_Note_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(client);

        var createResp = await client.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Note",
            note = "Original note"
        });
        var createBody = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var outreachId = createBody.GetProperty("id").GetInt32();

        var updateResp = await client.PutAsJsonAsync($"/api/admin/outreach/{outreachId}", new
        {
            note = "Updated note"
        });
        updateResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify the note was updated
        var listResp = await client.GetAsync($"/api/admin/supporters/{supporterId}/outreach");
        var list = await listResp.Content.ReadFromJsonAsync<JsonElement>();
        list[0].GetProperty("note").GetString().Should().Be("Updated note");
    }

    [Fact]
    public async Task UpdateOutreach_NonexistentId_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await client.PutAsJsonAsync("/api/admin/outreach/999999", new { note = "test" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteOutreach_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var supporterId = await CreateSupporter(client);

        var createResp = await client.PostAsJsonAsync($"/api/admin/supporters/{supporterId}/outreach", new
        {
            outreachType = "Email"
        });
        var createBody = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var outreachId = createBody.GetProperty("id").GetInt32();

        var deleteResp = await client.DeleteAsync($"/api/admin/outreach/{outreachId}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify it's gone
        var listResp = await client.GetAsync($"/api/admin/supporters/{supporterId}/outreach");
        var list = await listResp.Content.ReadFromJsonAsync<JsonElement>();
        list.GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task DeleteOutreach_NonexistentId_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var resp = await client.DeleteAsync("/api/admin/outreach/999999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UnauthenticatedReturns401()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);

        var postResp = await client.PostAsJsonAsync("/api/admin/supporters/1/outreach", new
        {
            outreachType = "Email"
        });
        postResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var getResp = await client.GetAsync("/api/admin/supporters/1/outreach");
        getResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

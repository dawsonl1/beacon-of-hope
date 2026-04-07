using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class SupporterDonationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SupporterDonationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── Supporters ────────────────────────────────────────────

    [Fact]
    public async Task ListSupporters_DefaultPagination()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/supporters?page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("items", out _).Should().BeTrue();
        body.TryGetProperty("totalCount", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ListSupporters_FilterByType()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/supporters?supporterType=Individual&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListSupporters_FilterByStatus()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/supporters?status=Active&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListSupporters_Search()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/supporters?search=test&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateSupporter_ValidData_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Test Supporter",
            firstName = "Test",
            lastName = "Supporter",
            email = "testsupporter@example.com",
            country = "PH"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("supporterId").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateSupporter_NullBody_ReturnsBadRequest()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsync("/api/admin/supporters",
            new StringContent("null", Encoding.UTF8, "application/json"));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetSupporter_IncludesDonationHistory()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create supporter
        var createResponse = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Donor History Test"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var supporterId = created.GetProperty("supporterId").GetInt32();

        var response = await client.GetAsync($"/api/admin/supporters/{supporterId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        body.TryGetProperty("supporter", out _).Should().BeTrue();
        body.TryGetProperty("donations", out _).Should().BeTrue();
    }

    [Fact]
    public async Task UpdateSupporter_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var createResponse = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Update Test"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("supporterId").GetInt32();

        var updateResponse = await client.PutAsJsonAsync($"/api/admin/supporters/{id}", new
        {
            supporterType = "Organization",
            displayName = "Updated Test",
            organizationName = "Test Org"
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteSupporter_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var createResponse = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Delete Test"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("supporterId").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/admin/supporters/{id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Donations ─────────────────────────────────────────────

    [Fact]
    public async Task ListDonations_DefaultPagination()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/donations?page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("items", out _).Should().BeTrue();
        body.TryGetProperty("totalCount", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ListDonations_FilterByType()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/donations?donationType=Monetary&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListDonations_FilterByDateRange()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/donations?dateFrom=2024-01-01&dateTo=2024-12-31&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateDonation_ValidData_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a supporter first
        var supporterResponse = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Donation Test Supporter"
        });
        var supporter = await supporterResponse.Content.ReadFromJsonAsync<JsonElement>();
        var supporterId = supporter.GetProperty("supporterId").GetInt32();

        var response = await client.PostAsJsonAsync("/api/admin/donations", new
        {
            supporterId,
            donationType = "Monetary",
            donationDate = "2024-06-15",
            amount = 5000.00,
            currencyCode = "PHP",
            campaignName = "Test Campaign"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("donationId").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateDonation_NullBody_ReturnsBadRequest()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsync("/api/admin/donations",
            new StringContent("null", Encoding.UTF8, "application/json"));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateDonation_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var supporterResponse = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Donation Update Test"
        });
        var supporter = await supporterResponse.Content.ReadFromJsonAsync<JsonElement>();
        var supporterId = supporter.GetProperty("supporterId").GetInt32();

        var createResponse = await client.PostAsJsonAsync("/api/admin/donations", new
        {
            supporterId,
            donationType = "Monetary",
            amount = 1000.00,
            donationDate = "2024-07-01"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("donationId").GetInt32();

        var updateResponse = await client.PutAsJsonAsync($"/api/admin/donations/{id}", new
        {
            supporterId,
            donationType = "Monetary",
            amount = 2000.00,
            donationDate = "2024-07-02"
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteDonation_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var supporterResponse = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Donation Delete Test"
        });
        var supporter = await supporterResponse.Content.ReadFromJsonAsync<JsonElement>();
        var supporterId = supporter.GetProperty("supporterId").GetInt32();

        var createResponse = await client.PostAsJsonAsync("/api/admin/donations", new
        {
            supporterId,
            donationType = "Monetary",
            amount = 500.00,
            donationDate = "2024-08-01"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("donationId").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/admin/donations/{id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListDonations_FilterBySupporterId()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create supporter and donation
        var supporterResponse = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            supporterType = "Individual",
            displayName = "Filter Test Supporter"
        });
        var supporter = await supporterResponse.Content.ReadFromJsonAsync<JsonElement>();
        var supporterId = supporter.GetProperty("supporterId").GetInt32();

        await client.PostAsJsonAsync("/api/admin/donations", new
        {
            supporterId,
            donationType = "Monetary",
            amount = 100.00,
            donationDate = "2024-09-01"
        });

        var response = await client.GetAsync($"/api/admin/donations?supporterId={supporterId}&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }

    // ── Coverage gap: recent-donations and donations-by-channel ──

    [Fact]
    public async Task RecentDonations_ReturnsData()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/recent-donations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
        body.GetArrayLength().Should().BeLessThanOrEqualTo(5);
    }

    [Fact]
    public async Task DonationsByChannel_ReturnsData()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/donations-by-channel");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }
}

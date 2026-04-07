using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Auth;

public class RBACTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public RBACTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── Public endpoints accessible without auth ──────────────

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/impact/summary")]
    [InlineData("/api/impact/donations-by-month")]
    [InlineData("/api/impact/allocations-by-program")]
    [InlineData("/api/impact/education-trends")]
    [InlineData("/api/impact/health-trends")]
    [InlineData("/api/impact/safehouses")]
    [InlineData("/api/impact/snapshots")]
    public async Task PublicEndpoints_NoAuth_Returns200(string url)
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Admin read endpoints require auth ─────────────────────

    [Theory]
    [InlineData("/api/admin/metrics")]
    [InlineData("/api/admin/residents?page=1&pageSize=5")]
    [InlineData("/api/admin/residents/filter-options")]
    [InlineData("/api/admin/recent-donations")]
    [InlineData("/api/admin/donations-by-channel")]
    [InlineData("/api/admin/active-residents-trend")]
    [InlineData("/api/admin/flagged-cases-trend")]
    [InlineData("/api/admin/recordings?page=1&pageSize=5")]
    [InlineData("/api/admin/visitations?page=1&pageSize=5")]
    [InlineData("/api/admin/supporters?page=1&pageSize=5")]
    [InlineData("/api/admin/donations?page=1&pageSize=5")]
    [InlineData("/api/admin/allocations/by-program")]
    [InlineData("/api/admin/allocations/by-safehouse")]
    [InlineData("/api/admin/residents-list")]
    public async Task AdminReadEndpoints_NoAuth_Returns401(string url)
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("/api/admin/metrics")]
    [InlineData("/api/admin/residents?page=1&pageSize=5")]
    [InlineData("/api/admin/residents/filter-options")]
    [InlineData("/api/admin/recent-donations")]
    [InlineData("/api/admin/donations-by-channel")]
    [InlineData("/api/admin/recordings?page=1&pageSize=5")]
    [InlineData("/api/admin/visitations?page=1&pageSize=5")]
    [InlineData("/api/admin/supporters?page=1&pageSize=5")]
    [InlineData("/api/admin/donations?page=1&pageSize=5")]
    [InlineData("/api/admin/allocations/by-program")]
    [InlineData("/api/admin/allocations/by-safehouse")]
    [InlineData("/api/admin/residents-list")]
    public async Task AdminReadEndpoints_StaffRole_Returns200(string url)
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("/api/admin/metrics")]
    [InlineData("/api/admin/residents?page=1&pageSize=5")]
    [InlineData("/api/admin/residents/filter-options")]
    [InlineData("/api/admin/recent-donations")]
    [InlineData("/api/admin/donations-by-channel")]
    [InlineData("/api/admin/recordings?page=1&pageSize=5")]
    [InlineData("/api/admin/visitations?page=1&pageSize=5")]
    [InlineData("/api/admin/supporters?page=1&pageSize=5")]
    [InlineData("/api/admin/donations?page=1&pageSize=5")]
    [InlineData("/api/admin/allocations/by-program")]
    [InlineData("/api/admin/allocations/by-safehouse")]
    [InlineData("/api/admin/residents-list")]
    public async Task AdminReadEndpoints_DonorRole_Returns200(string url)
    {
        // Donor has RequireAuthorization() (authenticated) for read endpoints.
        // The app uses RequireAuthorization() (not RequireRole) for read endpoints,
        // so any authenticated user can read.
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Admin CUD (Create/Update/Delete) endpoints — AdminOnly ──

    [Fact]
    public async Task CreateResident_AdminRole_ReturnsCreated()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-RBAC-001",
            caseStatus = "Active",
            caseCategory = "Neglected"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateResident_StaffRole_Returns403()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-RBAC-STAFF",
            caseStatus = "Active"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateResident_DonorRole_Returns403()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-RBAC-DONOR",
            caseStatus = "Active"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateResident_Unauthenticated_Returns401()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-RBAC-ANON",
            caseStatus = "Active"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateRecording_StaffRole_ReturnsSuccess()
    {
        // Staff CAN create recordings (RequireRole("Admin", "Staff"))
        // First get a valid residentId
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var listResponse = await client.GetAsync("/api/admin/residents-list");
        var listBody = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        var residents = listBody.EnumerateArray().ToArray();
        if (residents.Length == 0) return; // skip if no residents

        var residentId = residents[0].GetProperty("residentId").GetInt32();

        var response = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2024-01-15",
            socialWorker = "Test Worker",
            sessionType = "Individual"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task DeleteRecording_StaffRole_Returns403()
    {
        // Staff cannot delete recordings (RequireRole("Admin"))
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/recordings/99999");

        // Either 403 (role check) or 404 (not found after role check)
        // Since the policy is RequireRole("Admin"), staff should get 403
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteResident_AdminOnly_Succeeds()
    {
        // Create a resident first, then delete it
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var createResponse = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = "TEST-DEL-ADMIN",
            caseStatus = "Active"
        });
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = createBody.GetProperty("residentId").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/admin/residents/{id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteSupporter_AdminOnly_Returns403ForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/supporters/99999");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteDonation_AdminOnly_Returns403ForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/donations/99999");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteVisitation_AdminOnly_Returns403ForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/visitations/99999");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateSupporter_DonorRole_Returns403()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/supporters", new
        {
            displayName = "Test Donor Create",
            supporterType = "Individual"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateDonation_DonorRole_Returns403()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/donations", new
        {
            donationType = "Monetary",
            amount = 100.00
        });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Security headers ──────────────────────────────────────

    [Fact]
    public async Task CspHeader_Present_OnEveryResponse()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/health");

        response.Headers.Contains("Content-Security-Policy")
            .Should().BeTrue("CSP header should be present");
        response.Headers.Contains("X-Content-Type-Options")
            .Should().BeTrue("X-Content-Type-Options should be present");
        response.Headers.Contains("X-Frame-Options")
            .Should().BeTrue("X-Frame-Options should be present");
    }
}

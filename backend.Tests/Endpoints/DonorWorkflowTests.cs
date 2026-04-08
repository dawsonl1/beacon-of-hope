using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Tests donor role access — donors should only see public endpoints
/// and their own donation portal. All admin endpoints should be forbidden.
/// </summary>
public class DonorWorkflowTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public DonorWorkflowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Donor_CanLogin()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var body = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        body.GetProperty("isAuthenticated").GetBoolean().Should().BeTrue();
        body.GetProperty("roles").EnumerateArray().Should().Contain(r => r.GetString() == "Donor");
    }

    // ── Public endpoints (should work for everyone) ─────────────

    [Theory]
    [InlineData("/api/impact/summary")]
    [InlineData("/api/impact/donations-by-month")]
    [InlineData("/api/impact/allocations-by-program")]
    [InlineData("/api/impact/education-trends")]
    [InlineData("/api/impact/health-trends")]
    [InlineData("/api/impact/safehouses")]
    [InlineData("/api/health")]
    public async Task Donor_CanAccessPublicEndpoints(string url)
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Donor portal ────────────────────────────────────────────

    [Fact]
    public async Task Donor_CanAccessMyDonations()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.GetAsync("/api/donor/my-donations");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Admin endpoints (should be FORBIDDEN for donor) ─────────

    [Theory]
    [InlineData("/api/admin/residents?page=1&pageSize=5")]
    [InlineData("/api/admin/incidents")]
    [InlineData("/api/admin/education-records")]
    [InlineData("/api/admin/health-records")]
    [InlineData("/api/admin/intervention-plans")]
    [InlineData("/api/admin/post-placement")]
    [InlineData("/api/admin/post-placement/summary")]
    [InlineData("/api/admin/residents/unclaimed")]
    public async Task Donor_CannotAccessAdminEndpoints(string url)
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Staff-only endpoints (should be FORBIDDEN for donor) ────

    [Fact]
    public async Task Donor_CannotAccessStaffTasks()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.GetAsync("/api/staff/tasks");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Donor_CannotAccessCalendar()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.GetAsync("/api/staff/calendar?date=2026-04-08");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Write operations (should all be FORBIDDEN) ──────────────

    [Fact]
    public async Task Donor_CannotCreateResident()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/residents", new { internalCode = "TEST" });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Donor_CannotCreateIncident()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/incidents", new { incidentType = "Test" });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Donor_CannotDeleteAnything()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/residents/1");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

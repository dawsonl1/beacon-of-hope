using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Tests admin-specific workflows — user management, delete operations,
/// safehouse assignment, and full CRUD access.
/// </summary>
public class AdminWorkflowTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AdminWorkflowTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Admin_CanLogin()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var body = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        body.GetProperty("roles").EnumerateArray().Should().Contain(r => r.GetString() == "Admin");
    }

    // ── User Management (Admin-only) ────────────────────────────

    [Fact]
    public async Task Admin_CanListUsers()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/users");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Admin_UsersIncludeSafehouses()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        body[0].TryGetProperty("safehouses", out _).Should().BeTrue();
    }

    // ── Delete Operations (Admin-only) ──────────────────────────

    [Fact]
    public async Task Admin_CanDeleteIncident_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/incidents/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Admin_CanDeleteResident_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/residents/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Admin_CanDeleteInterventionPlan_NotFound()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.DeleteAsync("/api/admin/intervention-plans/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── All read endpoints accessible ───────────────────────────

    [Theory]
    [InlineData("/api/admin/residents?page=1&pageSize=5")]
    [InlineData("/api/admin/incidents")]
    [InlineData("/api/admin/education-records")]
    [InlineData("/api/admin/health-records")]
    [InlineData("/api/admin/intervention-plans")]
    [InlineData("/api/admin/post-placement")]
    [InlineData("/api/admin/post-placement/summary")]
    [InlineData("/api/admin/residents/unclaimed")]
    [InlineData("/api/admin/metrics")]
    [InlineData("/api/admin/users")]
    [InlineData("/api/staff/tasks")]
    [InlineData("/api/staff/calendar?date=2026-04-08")]
    [InlineData("/api/ml/predictions/resident/1")]
    public async Task Admin_CanAccessAllEndpoints(string url)
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

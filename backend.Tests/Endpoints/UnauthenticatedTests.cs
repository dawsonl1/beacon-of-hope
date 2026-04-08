using System.Net;
using System.Net.Http.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Verifies that all protected endpoints return 401 for unauthenticated requests.
/// Public endpoints should return 200.
/// </summary>
public class UnauthenticatedTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public UnauthenticatedTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    // ── Public endpoints (should return 200) ────────────────────

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/impact/summary")]
    [InlineData("/api/impact/donations-by-month")]
    [InlineData("/api/impact/allocations-by-program")]
    [InlineData("/api/impact/education-trends")]
    [InlineData("/api/impact/health-trends")]
    [InlineData("/api/impact/safehouses")]
    [InlineData("/api/impact/snapshots")]
    public async Task Public_EndpointsAccessible(string url)
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Protected endpoints (should return 401) ─────────────────

    [Theory]
    [InlineData("/api/staff/tasks")]
    [InlineData("/api/staff/calendar")]
    [InlineData("/api/admin/incidents")]
    [InlineData("/api/admin/education-records")]
    [InlineData("/api/admin/health-records")]
    [InlineData("/api/admin/intervention-plans")]
    [InlineData("/api/admin/post-placement")]
    [InlineData("/api/admin/post-placement/summary")]
    [InlineData("/api/admin/residents/unclaimed")]
    [InlineData("/api/ml/predictions/resident/1")]
    [InlineData("/api/ml/predictions/resident/1/history")]
    [InlineData("/api/admin/users")]
    [InlineData("/api/donor/my-donations")]
    public async Task Protected_EndpointsReturn401(string url)
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Write operations (should return 401) ────────────────────

    [Fact]
    public async Task Unauthenticated_CannotCreateTask()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/staff/tasks", new { title = "test" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Unauthenticated_CannotCreateCalendarEvent()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/staff/calendar", new { title = "test" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Unauthenticated_CannotCreateIncident()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/incidents", new { type = "test" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

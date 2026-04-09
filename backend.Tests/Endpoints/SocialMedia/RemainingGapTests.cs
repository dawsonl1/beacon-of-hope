using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class RemainingGapTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public RemainingGapTests(TestWebApplicationFactory factory) => _factory = factory;

    // ── Safehouse-Scoped Media Browse ──────────────────────────

    [Fact]
    public async Task StaffMediaBrowse_ReturnsOk()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/social/media");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task StaffMediaBrowse_WithFilter_ReturnsOk()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/social/media?activityType=art_therapy");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminMediaBrowse_SeesAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        // Create a media item first
        await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/test/scoped.jpg",
            caption = "Scoped test",
            activityType = "daily_life",
            consentConfirmed = true
        });
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/social/media");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    // ── Optimistic Concurrency ─────────────────────────────────

    [Fact]
    public async Task ApproveWithStaleUpdatedAt_Returns409()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Concurrency test",
            contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        // First, approve it (sets updatedAt)
        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });

        // Now try to reject with a stale updatedAt
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/reject", new
        {
            updatedAt = "2020-01-01T00:00:00Z",
            rejectionReason = "Stale attempt"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ApproveWithoutUpdatedAt_SkipsConcurrencyCheck()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "No concurrency check",
            contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        // Approve without sending updatedAt — should succeed
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SnoozeWithStaleUpdatedAt_Returns409()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Snooze concurrency test",
            contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        // Approve it first to set updatedAt
        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });

        // Try to snooze with stale updatedAt
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/snooze", new
        {
            snoozedUntil = DateTime.UtcNow.AddHours(4).ToString("o"),
            updatedAt = "2020-01-01T00:00:00Z"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── Pagination ─────────────────────────────────────────────

    [Fact]
    public async Task PostsList_Pagination_RespectsPageSize()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        // Create several posts
        for (int i = 0; i < 3; i++)
        {
            await client.PostAsJsonAsync("/api/admin/social/posts", new
            {
                content = $"Pagination test {i}",
                contentPillar = "safehouse_life",
                source = "manual", status = "draft", platform = "instagram"
            });
        }

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/posts?status=draft&pageSize=2");
        resp.GetArrayLength().Should().BeLessThanOrEqualTo(2);
    }

    [Fact]
    public async Task MediaList_Pagination_RespectsPageSize()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/media?pageSize=1");
        resp.GetArrayLength().Should().BeLessThanOrEqualTo(1);
    }

    // ── Research Refresh Endpoint ──────────────────────────────

    [Fact]
    public async Task ResearchRefresh_ReturnsOkOrServiceUnavailable()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/research-refresh", new
        {
            categories = new[] { "trafficking_stats" }
        });
        // 503 if harness is not running, OK if it is — both are valid
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task ResearchRefresh_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/research-refresh", new
        {
            categories = new[] { "trafficking_stats" }
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

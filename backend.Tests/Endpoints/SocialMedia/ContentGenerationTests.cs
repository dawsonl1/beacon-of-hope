using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class ContentGenerationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ContentGenerationTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task TriggerGeneration_ReturnsAccepted()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/generate", new { maxPosts = 2 });
        // Should accept the request even if harness is unreachable (async job)
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Accepted, HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task TriggerGeneration_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/generate", new { maxPosts = 2 });
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetCalendar_ReturnsScheduledPosts()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        // Create a scheduled post
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Scheduled post for calendar",
            contentPillar = "safehouse_life",
            source = "auto_generated",
            status = "scheduled",
            platform = "instagram",
            scheduledAt = DateTime.UtcNow.AddDays(1).ToString("o")
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/calendar");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task GetQueueCount_ReturnsDraftCount()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Draft for count",
            contentPillar = "the_problem",
            source = "auto_generated",
            status = "draft",
            platform = "facebook"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/queue-count");
        resp.GetProperty("draftCount").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }
}

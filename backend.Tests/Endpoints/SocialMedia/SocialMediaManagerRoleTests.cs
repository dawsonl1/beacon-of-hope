using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class SocialMediaManagerRoleTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SocialMediaManagerRoleTests(TestWebApplicationFactory factory) => _factory = factory;

    // ── SocialMediaManager CAN access these ────────────────────

    [Fact]
    public async Task SocialMediaManager_CanListPosts()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/posts?status=draft");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SocialMediaManager_CanApprovePost()
    {
        var admin = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await admin.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "SMM approve test",
            contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("automatedPostId").GetInt32();

        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SocialMediaManager_CanViewCalendar()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/calendar");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SocialMediaManager_CanViewQueueCount()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/queue-count");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SocialMediaManager_CanListFacts()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/facts");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SocialMediaManager_CanListFactCandidates()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/fact-candidates?status=pending");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SocialMediaManager_CanBrowseMedia()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/media");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SocialMediaManager_CanLogEngagement()
    {
        var admin = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await admin.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "SMM engagement test",
            contentPillar = "safehouse_life",
            source = "manual", status = "published", platform = "instagram"
        });
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("automatedPostId").GetInt32();

        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/engagement", new { engagementLikes = 100 });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── SocialMediaManager CANNOT access these ─────────────────

    [Fact]
    public async Task SocialMediaManager_CannotAccessSettings()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/settings");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SocialMediaManager_CannotAccessVoiceGuide()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/voice-guide");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SocialMediaManager_CannotAccessTalkingPoints()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/talking-points");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SocialMediaManager_CannotAccessHashtagSets()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/hashtag-sets");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SocialMediaManager_CannotAccessMilestoneRules()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/milestone-rules");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SocialMediaManager_CannotDeleteMedia()
    {
        var client = await AuthHelper.GetSocialMediaManagerClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/social/media/1");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

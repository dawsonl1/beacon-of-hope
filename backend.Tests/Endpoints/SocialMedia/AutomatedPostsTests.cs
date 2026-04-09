using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class AutomatedPostsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AutomatedPostsTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task ListDrafts_ReturnsDraftPosts()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a draft post manually
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Test draft post",
            contentPillar = "safehouse_life",
            source = "manual",
            status = "draft",
            platform = "instagram"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/posts?status=draft");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task ApprovePost_MovesToScheduled()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Post to approve",
            contentPillar = "the_problem",
            source = "auto_generated",
            status = "draft",
            platform = "facebook"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("scheduled");
        get.GetProperty("approvedBy").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task RejectPost_SetsStatusAndReason()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Post to reject",
            contentPillar = "donor_impact",
            source = "auto_generated",
            status = "draft",
            platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/reject", new
        {
            rejectionReason = "Tone was off"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("rejected");
        get.GetProperty("rejectionReason").GetString().Should().Be("Tone was off");
    }

    [Fact]
    public async Task EditAndApprove_SavesOriginalContent()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Original text from AI",
            contentPillar = "safehouse_life",
            source = "auto_generated",
            status = "draft",
            platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new
        {
            content = "Edited text by staff"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("content").GetString().Should().Be("Edited text by staff");
        get.GetProperty("originalContent").GetString().Should().Be("Original text from AI");
    }

    [Fact]
    public async Task SnoozePost_SetsSnoozedUntil()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Post to snooze",
            contentPillar = "call_to_action",
            source = "auto_generated",
            status = "draft",
            platform = "facebook"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var snoozedUntil = DateTime.UtcNow.AddHours(4).ToString("o");
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/snooze", new
        {
            snoozedUntil
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("snoozed");
    }

    [Fact]
    public async Task MarkPublished_SetsStatus()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Ready post",
            contentPillar = "safehouse_life",
            source = "manual",
            status = "ready_to_publish",
            platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/publish", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("published");
    }

    [Fact]
    public async Task LogEngagement_PersistsMetrics()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Published post",
            contentPillar = "the_problem",
            source = "manual",
            status = "published",
            platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/engagement", new
        {
            engagementLikes = 150,
            engagementShares = 30,
            engagementComments = 12,
            engagementDonations = 250.00
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("engagementLikes").GetInt32().Should().Be(150);
        get.GetProperty("engagementShares").GetInt32().Should().Be(30);
        get.GetProperty("engagementDonations").GetDecimal().Should().Be(250.00m);
    }

    [Fact]
    public async Task Posts_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/posts?status=draft");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

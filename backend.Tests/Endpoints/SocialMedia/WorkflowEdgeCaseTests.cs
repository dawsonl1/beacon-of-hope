using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class WorkflowEdgeCaseTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public WorkflowEdgeCaseTests(TestWebApplicationFactory factory) => _factory = factory;

    private async Task<int> CreateDraftPost(HttpClient client, string content = "Test post")
    {
        var resp = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content,
            contentPillar = "safehouse_life",
            source = "auto_generated",
            status = "draft",
            platform = "instagram"
        });
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        return created.GetProperty("automatedPostId").GetInt32();
    }

    [Fact]
    public async Task ApproveAlreadyApproved_StillOk()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var id = await CreateDraftPost(client, "Double approve test");

        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RejectAlreadyRejected_StillOk()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var id = await CreateDraftPost(client, "Double reject test");

        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/reject", new { rejectionReason = "First" });
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/reject", new { rejectionReason = "Second" });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("rejectionReason").GetString().Should().Be("Second");
    }

    [Fact]
    public async Task ApproveNonexistentPost_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PatchAsJsonAsync("/api/admin/social/posts/99999/approve", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PublishNonReadyPost_StillMovesToPublished()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var id = await CreateDraftPost(client, "Publish from draft");

        // Publish directly from draft (staff might skip the queue in edge cases)
        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/publish", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("published");
    }

    [Fact]
    public async Task EngagementOnNonPublished_StillPersists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var id = await CreateDraftPost(client, "Engagement on draft");

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/engagement", new
        {
            engagementLikes = 10,
            engagementShares = 2,
            engagementComments = 1
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("engagementLikes").GetInt32().Should().Be(10);
    }

    [Fact]
    public async Task EditApprove_PreservesOriginalContent()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var id = await CreateDraftPost(client, "Original AI-generated content here");

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new
        {
            content = "Staff-edited version of the content"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("content").GetString().Should().Be("Staff-edited version of the content");
        get.GetProperty("originalContent").GetString().Should().Be("Original AI-generated content here");
        get.GetProperty("status").GetString().Should().Be("scheduled");
    }

    [Fact]
    public async Task ApproveWithoutEdit_NoOriginalContent()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var id = await CreateDraftPost(client, "Approve without editing");

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/approve", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("content").GetString().Should().Be("Approve without editing");
        get.GetProperty("originalContent").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task SnoozeWithFutureDate_SetsSnoozedStatus()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var id = await CreateDraftPost(client, "Snooze test");
        var futureTime = DateTime.UtcNow.AddHours(4).ToString("o");

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/snooze", new { snoozedUntil = futureTime });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("snoozed");
        get.GetProperty("snoozedUntil").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ListDrafts_ExcludesSnoozed()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var draftId = await CreateDraftPost(client, "Visible draft");
        var snoozedId = await CreateDraftPost(client, "Snoozed post");
        await client.PatchAsJsonAsync($"/api/admin/social/posts/{snoozedId}/snooze", new
        {
            snoozedUntil = DateTime.UtcNow.AddHours(4).ToString("o")
        });

        var drafts = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/posts?status=draft");
        var draftIds = drafts.EnumerateArray().Select(p => p.GetProperty("automatedPostId").GetInt32()).ToList();
        draftIds.Should().Contain(draftId);
        draftIds.Should().NotContain(snoozedId);
    }

    [Fact]
    public async Task ConsentRequired_MediaUploadRejectedWithoutIt()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/test/no_consent.jpg",
            caption = "No consent",
            activityType = "daily_life",
            consentConfirmed = false
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Contain("Consent");
    }

    [Fact]
    public async Task FilterPostsByPillar_ReturnsCorrectSubset()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Problem post",
            contentPillar = "the_problem",
            source = "manual",
            status = "draft",
            platform = "instagram"
        });
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "CTA post",
            contentPillar = "call_to_action",
            source = "manual",
            status = "draft",
            platform = "instagram"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/posts?pillar=the_problem");
        foreach (var post in resp.EnumerateArray())
        {
            post.GetProperty("contentPillar").GetString().Should().Be("the_problem");
        }
    }
}

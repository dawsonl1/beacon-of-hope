using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class FinalCoverageTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public FinalCoverageTests(TestWebApplicationFactory factory) => _factory = factory;

    // ── Graphic Template Update ────────────────────────────────

    [Fact]
    public async Task UpdateGraphicTemplate_ChangesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/graphic-templates", new
        {
            name = "Original template",
            filePath = "/templates/orig.png",
            textColor = "#FFFFFF",
            textPosition = "center"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("graphicTemplateId").GetInt32();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/graphic-templates/{id}", new
        {
            name = "Updated template",
            textColor = "#000000"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await resp.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("name").GetString().Should().Be("Updated template");
        updated.GetProperty("textColor").GetString().Should().Be("#000000");
    }

    [Fact]
    public async Task UpdateGraphicTemplate_Nonexistent_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/graphic-templates/99999", new { name = "nope" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Hashtag Set Update ─────────────────────────────────────

    [Fact]
    public async Task UpdateHashtagSet_ChangesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/hashtag-sets", new
        {
            name = "Updatable set",
            category = "cause",
            pillar = "all",
            platform = "instagram",
            hashtags = "[\"#original\"]"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("hashtagSetId").GetInt32();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/hashtag-sets/{id}", new
        {
            name = "Updated set",
            hashtags = "[\"#updated\",\"#newtag\"]"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await resp.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("name").GetString().Should().Be("Updated set");
    }

    [Fact]
    public async Task UpdateHashtagSet_Nonexistent_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/hashtag-sets/99999", new { name = "nope" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Partial Engagement Update ──────────────────────────────

    [Fact]
    public async Task LogEngagement_PartialUpdate_OnlyChangesProvidedFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Partial engagement test",
            contentPillar = "safehouse_life",
            source = "manual", status = "published", platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        // First update: only likes
        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/engagement", new
        {
            engagementLikes = 50
        });

        // Second update: only shares
        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/engagement", new
        {
            engagementShares = 10
        });

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("engagementLikes").GetInt32().Should().Be(50);
        get.GetProperty("engagementShares").GetInt32().Should().Be(10);
    }

    // ── Voice Guide Update Existing ────────────────────────────

    [Fact]
    public async Task UpdateVoiceGuide_TwiceUpdatesExisting()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // First update creates
        await client.PutAsJsonAsync("/api/admin/social/voice-guide", new
        {
            orgDescription = "First version",
            toneDescription = "Warm"
        });

        // Second update modifies existing
        var resp = await client.PutAsJsonAsync("/api/admin/social/voice-guide", new
        {
            orgDescription = "Second version"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/voice-guide");
        get.GetProperty("orgDescription").GetString().Should().Be("Second version");
        // toneDescription should still be "Warm" from first update
        get.GetProperty("toneDescription").GetString().Should().Be("Warm");
    }

    // ── Media Upload Missing ConsentConfirmed Field ────────────

    [Fact]
    public async Task MediaUpload_MissingConsentField_Rejected()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/test/no_field.jpg",
            caption = "Missing consent field",
            activityType = "daily_life"
            // consentConfirmed not provided at all
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── CTA IsActive Toggle ────────────────────────────────────

    [Fact]
    public async Task UpdateCta_ToggleIsActive()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/cta", new
        {
            title = "Toggle test CTA",
            description = "Test",
            priority = 10
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("ctaConfigId").GetInt32();
        created.GetProperty("isActive").GetBoolean().Should().BeTrue();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/cta/{id}", new { isActive = false });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await resp.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("isActive").GetBoolean().Should().BeFalse();
    }

    // ── Update Nonexistent Entities Return 404 ─────────────────

    [Fact]
    public async Task UpdateNonexistentFact_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/facts/99999", new { factText = "nope" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateNonexistentTalkingPoint_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/talking-points/99999", new { text = "nope" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateNonexistentAwarenessDate_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/awareness-dates/99999", new { name = "nope" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateNonexistentCta_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/cta/99999", new { title = "nope" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateNonexistentMilestoneRule_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/milestone-rules/99999", new { name = "nope" });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Reject/Snooze/Publish Nonexistent Posts ────────────────

    [Fact]
    public async Task RejectNonexistentPost_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PatchAsJsonAsync("/api/admin/social/posts/99999/reject", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SnoozeNonexistentPost_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PatchAsJsonAsync("/api/admin/social/posts/99999/snooze", new { snoozedUntil = DateTime.UtcNow.AddHours(1).ToString("o") });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PublishNonexistentPost_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PatchAsJsonAsync("/api/admin/social/posts/99999/publish", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task EngagementNonexistentPost_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PatchAsJsonAsync("/api/admin/social/posts/99999/engagement", new { engagementLikes = 10 });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Awareness Date With Null DateEnd ────────────────────────

    [Fact]
    public async Task CreateAwarenessDate_NullDateEnd_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/awareness-dates", new
        {
            name = "Single day event",
            dateStart = "2026-07-30",
            recurrence = "annual",
            pillarEmphasis = "the_problem"
            // dateEnd intentionally omitted
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}

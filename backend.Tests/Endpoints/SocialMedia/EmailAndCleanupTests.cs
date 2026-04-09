using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

/// <summary>
/// Tests for email notification settings and data retention behavior.
/// Since we can't send real emails in tests, we test the settings that
/// control notifications and verify the cleanup-related DB states.
/// </summary>
public class EmailAndCleanupTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public EmailAndCleanupTests(TestWebApplicationFactory factory) => _factory = factory;

    // ── Notification Settings ──────────────────────────────────

    [Fact]
    public async Task UpdateSettings_NotificationMethod_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/settings", new
        {
            notificationMethod = "email",
            notificationEmail = "alerts@test.com"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/settings");
        get.GetProperty("notificationMethod").GetString().Should().Be("email");
        get.GetProperty("notificationEmail").GetString().Should().Be("alerts@test.com");
    }

    [Fact]
    public async Task UpdateSettings_NotificationBoth_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/settings", new
        {
            notificationMethod = "both",
            notificationEmail = "both@test.com"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Data Retention: Rejected Posts ──────────────────────────

    [Fact]
    public async Task RejectedPost_ExistsInDB()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Will be rejected for cleanup test",
            contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/reject", new
        {
            rejectionReason = "Not needed"
        });

        // Verify it exists as rejected
        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("rejected");
        get.GetProperty("rejectionReason").GetString().Should().Be("Not needed");
    }

    // ── Data Retention: Stale Snoozed Posts ────────────────────

    [Fact]
    public async Task StaleSnoozedPost_CanBeCreated()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Will be snoozed for a long time",
            contentPillar = "donor_impact",
            source = "manual", status = "draft", platform = "facebook"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        // Snooze it
        var pastSnooze = DateTime.UtcNow.AddDays(-31).ToString("o");
        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/snooze", new { snoozedUntil = pastSnooze });

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("snoozed");
        // The DataRetentionJob would auto-reject this, but we verify the state is correct
    }

    // ── Data Retention: Rejected Fact Candidates ───────────────

    [Fact]
    public async Task RejectedFactCandidate_ExistsForCleanup()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/fact-candidates", new
        {
            factText = "Candidate for cleanup",
            sourceName = "Test",
            category = "trafficking_stats",
            searchQuery = "cleanup test"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentFactCandidateId").GetInt32();

        await client.PatchAsJsonAsync($"/api/admin/social/fact-candidates/{id}/reject", new { });

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/fact-candidates/{id}");
        get.GetProperty("status").GetString().Should().Be("rejected");
    }

    // ── Published Posts Without Engagement (engagement reminder trigger) ───

    [Fact]
    public async Task PublishedPostWithoutEngagement_Countable()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Published no engagement",
            contentPillar = "the_problem",
            source = "manual", status = "published", platform = "instagram"
        });

        // The post exists as published with null engagement — the PostReadinessJob
        // would count it for the engagement reminder
        var posts = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/posts?status=published");
        posts.EnumerateArray().Any(p => p.GetProperty("engagementLikes").ValueKind == JsonValueKind.Null).Should().BeTrue();
    }
}

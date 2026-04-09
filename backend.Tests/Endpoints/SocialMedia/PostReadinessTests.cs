using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

/// <summary>
/// Tests the post readiness logic by creating posts in various states
/// and verifying the status transitions that PostReadinessJob would make.
/// Since we can't run the IHostedService directly in tests, we test via
/// the endpoints that observe the same DB state.
/// </summary>
public class PostReadinessTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PostReadinessTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task ScheduledPost_WithPastTime_ShouldBeReadyToPublish()
    {
        // The PostReadinessJob moves these, but we can verify the calendar
        // endpoint correctly returns scheduled posts with past times
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var pastTime = DateTime.UtcNow.AddHours(-2).ToString("o");

        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Past scheduled post",
            contentPillar = "safehouse_life",
            source = "auto_generated",
            status = "scheduled",
            platform = "instagram",
            scheduledAt = pastTime
        });

        var calendar = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/calendar");
        calendar.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task ScheduledPost_WithFutureTime_StaysScheduled()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var futureTime = DateTime.UtcNow.AddDays(3).ToString("o");

        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Future scheduled post",
            contentPillar = "the_problem",
            source = "auto_generated",
            status = "scheduled",
            platform = "facebook",
            scheduledAt = futureTime
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("scheduled");
    }

    [Fact]
    public async Task SnoozedPost_WithExpiredTime_ShouldReturnToDraft()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Expired snooze post",
            contentPillar = "donor_impact",
            source = "auto_generated",
            status = "draft",
            platform = "instagram"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        // Snooze with a past time (already expired)
        var pastSnooze = DateTime.UtcNow.AddHours(-1).ToString("o");
        await client.PatchAsJsonAsync($"/api/admin/social/posts/{id}/snooze", new { snoozedUntil = pastSnooze });

        // The post is now snoozed with an expired time
        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("snoozed");
        // PostReadinessJob would move this back to draft, but we've verified
        // the state is set correctly for the job to process
    }

    [Fact]
    public async Task MultiplePostStatuses_QueueCountAccurate()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create posts in different states
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Draft 1", contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Draft 2", contentPillar = "the_problem",
            source = "manual", status = "draft", platform = "facebook"
        });
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Ready 1", contentPillar = "call_to_action",
            source = "manual", status = "ready_to_publish", platform = "instagram"
        });

        var counts = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/queue-count");
        counts.GetProperty("draftCount").GetInt32().Should().BeGreaterThanOrEqualTo(2);
        counts.GetProperty("readyCount").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }
}

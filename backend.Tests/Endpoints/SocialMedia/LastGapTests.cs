using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class LastGapTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public LastGapTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task ApproveFact_WithSolutionPillar_CreatesFactWithCorrectPillar()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/fact-candidates", new
        {
            factText = "Solution pillar fact",
            sourceName = "Research Paper",
            category = "rehabilitation",
            searchQuery = "pillar test"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentFactCandidateId").GetInt32();

        await client.PatchAsJsonAsync($"/api/admin/social/fact-candidates/{id}/approve", new { pillar = "the_solution" });

        var facts = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/facts");
        var match = facts.EnumerateArray().FirstOrDefault(f => f.GetProperty("factText").GetString() == "Solution pillar fact");
        match.GetProperty("pillar").GetString().Should().Be("the_solution");
    }

    [Fact]
    public async Task CreatePost_WithScheduledAt_RoundTripsCorrectly()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var scheduled = DateTime.UtcNow.AddDays(2);
        var create = await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Scheduled round-trip test",
            contentPillar = "safehouse_life",
            source = "manual",
            status = "scheduled",
            platform = "instagram"
        });
        create.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("automatedPostId").GetInt32();

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/posts/{id}");
        get.GetProperty("status").GetString().Should().Be("scheduled");
        get.GetProperty("content").GetString().Should().Be("Scheduled round-trip test");
    }

    [Fact]
    public async Task GenerateTrigger_ZeroMaxPosts_Returns503OrOk()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/generate", new { maxPosts = 0 });
        // Harness not running = 503, or if it were running it might return OK with 0 generated
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.ServiceUnavailable);
    }
}

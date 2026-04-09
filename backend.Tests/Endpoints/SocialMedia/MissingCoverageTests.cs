using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class MissingCoverageTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public MissingCoverageTests(TestWebApplicationFactory factory) => _factory = factory;

    // ── Graphic Templates ──────────────────────────────────────

    [Fact]
    public async Task CreateGraphicTemplate_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/graphic-templates", new
        {
            name = "Dark blue with logo",
            filePath = "/templates/dark_blue.png",
            textColor = "#FFFFFF",
            textPosition = "center",
            suitableFor = "[\"the_problem\",\"donor_impact\"]"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("name").GetString().Should().Be("Dark blue with logo");
    }

    [Fact]
    public async Task ListGraphicTemplates_ReturnsAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/graphic-templates", new
        {
            name = "Template A",
            filePath = "/templates/a.png",
            textColor = "#000000",
            textPosition = "bottom_left"
        });
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/graphic-templates");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task DeleteGraphicTemplate_Removes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/graphic-templates", new
        {
            name = "Delete me",
            filePath = "/templates/delete.png"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("graphicTemplateId").GetInt32();
        var resp = await client.DeleteAsync($"/api/admin/social/graphic-templates/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GraphicTemplates_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/graphic-templates");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── RBAC: Staff denied on all admin-only endpoints ─────────

    [Fact]
    public async Task CtaConfig_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/cta");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ContentFacts_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/facts");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task TalkingPoints_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/talking-points");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task HashtagSets_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/hashtag-sets");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task FactCandidates_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/fact-candidates?status=pending");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Calendar_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/calendar");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task QueueCount_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/queue-count");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task MediaLibrary_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/media");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ── Hashtag Set Update ─────────────────────────────────────

    // UpdateHashtagSet test moved to FinalCoverageTests now that the endpoint exists

    // ── Fact Candidate by ID ───────────────────────────────────

    [Fact]
    public async Task GetFactCandidate_ById_ReturnsCorrect()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/fact-candidates", new
        {
            factText = "Specific candidate",
            sourceName = "Source",
            category = "trafficking_stats",
            searchQuery = "test"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentFactCandidateId").GetInt32();

        var resp = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/fact-candidates/{id}");
        resp.GetProperty("factText").GetString().Should().Be("Specific candidate");
    }

    [Fact]
    public async Task GetFactCandidate_NonExistent_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/fact-candidates/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── Calendar returns scheduled posts ────────────────────────

    [Fact]
    public async Task Calendar_ReturnsOnlyScheduledAndPublished()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        // Create posts with different statuses
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Draft post", contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Scheduled post", contentPillar = "the_problem",
            source = "manual", status = "scheduled", platform = "facebook"
        });

        var calendar = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/calendar");
        foreach (var post in calendar.EnumerateArray())
        {
            var status = post.GetProperty("status").GetString();
            status.Should().BeOneOf("scheduled", "ready_to_publish", "published");
        }
    }

    // ── Posts filter by platform ─────────────────────────────────

    [Fact]
    public async Task FilterPostsByPlatform_ReturnsCorrectSubset()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Instagram post", contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Facebook post", contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "facebook"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/posts?platform=instagram");
        foreach (var post in resp.EnumerateArray())
        {
            post.GetProperty("platform").GetString().Should().Be("instagram");
        }
    }

    // ── Delete nonexistent entities returns 404 ─────────────────

    [Fact]
    public async Task DeleteNonexistentFact_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/social/facts/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteNonexistentMedia_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/social/media/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteNonexistentMilestoneRule_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/social/milestone-rules/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteNonexistentAwarenessDate_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.DeleteAsync("/api/admin/social/awareness-dates/99999");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

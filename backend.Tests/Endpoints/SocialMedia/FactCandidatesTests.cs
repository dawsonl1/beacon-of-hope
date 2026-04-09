using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class FactCandidatesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public FactCandidatesTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task ListCandidates_ReturnsPending()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        // Create a candidate directly
        await client.PostAsJsonAsync("/api/admin/social/fact-candidates", new
        {
            factText = "Test candidate fact",
            sourceName = "Test Source",
            sourceUrl = "https://example.com",
            category = "trafficking_stats",
            searchQuery = "trafficking statistics 2026"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/fact-candidates?status=pending");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task ApproveCandidate_MovesToContentFacts()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/fact-candidates", new
        {
            factText = "Approved candidate fact",
            sourceName = "Good Source",
            sourceUrl = "https://example.com/good",
            category = "rehabilitation",
            searchQuery = "rehabilitation outcomes"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentFactCandidateId").GetInt32();

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/fact-candidates/{id}/approve", new { pillar = "the_solution" });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify candidate status changed
        var candidate = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/fact-candidates/{id}");
        candidate.GetProperty("status").GetString().Should().Be("approved");

        // Verify a new content fact was created
        var facts = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/facts");
        facts.EnumerateArray().Any(f => f.GetProperty("factText").GetString() == "Approved candidate fact").Should().BeTrue();
    }

    [Fact]
    public async Task RejectCandidate_SetsStatus()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/fact-candidates", new
        {
            factText = "Reject this one",
            sourceName = "Bad Source",
            category = "trafficking_stats",
            searchQuery = "test"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentFactCandidateId").GetInt32();

        var resp = await client.PatchAsJsonAsync($"/api/admin/social/fact-candidates/{id}/reject", new { });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var candidate = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/fact-candidates/{id}");
        candidate.GetProperty("status").GetString().Should().Be("rejected");
    }
}

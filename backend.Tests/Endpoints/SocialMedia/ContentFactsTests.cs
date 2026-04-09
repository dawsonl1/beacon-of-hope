using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class ContentFactsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ContentFactsTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateFact_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/facts", new
        {
            factText = "79% of trafficking victims are exploited before age 18",
            sourceName = "UNICEF",
            sourceUrl = "https://unicef.org/stats",
            category = "trafficking_stats",
            pillar = "the_problem"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("contentFactId").GetInt32().Should().BeGreaterThan(0);
        created.GetProperty("factText").GetString().Should().Contain("79%");
    }

    [Fact]
    public async Task ListFacts_ReturnsAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/facts", new
        {
            factText = "Test fact 1",
            sourceName = "Source1",
            category = "trafficking_stats",
            pillar = "the_problem"
        });
        await client.PostAsJsonAsync("/api/admin/social/facts", new
        {
            factText = "Test fact 2",
            sourceName = "Source2",
            category = "rehabilitation",
            pillar = "the_solution"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/facts");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task UpdateFact_ChangesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/facts", new
        {
            factText = "Original fact",
            sourceName = "OldSource",
            category = "trafficking_stats",
            pillar = "the_problem"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentFactId").GetInt32();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/facts/{id}", new
        {
            factText = "Updated fact",
            sourceName = "NewSource",
            category = "rehabilitation",
            pillar = "the_solution"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>($"/api/admin/social/facts/{id}");
        get.GetProperty("factText").GetString().Should().Be("Updated fact");
        get.GetProperty("sourceName").GetString().Should().Be("NewSource");
    }

    [Fact]
    public async Task DeleteFact_Removes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/facts", new
        {
            factText = "Fact to delete",
            sourceName = "Source",
            category = "trafficking_stats",
            pillar = "the_problem"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentFactId").GetInt32();

        var resp = await client.DeleteAsync($"/api/admin/social/facts/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get = await client.GetAsync($"/api/admin/social/facts/{id}");
        get.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

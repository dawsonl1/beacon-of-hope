using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class HashtagSetsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public HashtagSetsTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateHashtagSet_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/hashtag-sets", new
        {
            name = "Cause hashtags",
            category = "cause",
            pillar = "all",
            platform = "instagram",
            hashtags = "[\"#endtrafficking\",\"#childprotection\"]"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("name").GetString().Should().Be("Cause hashtags");
    }

    [Fact]
    public async Task ListHashtagSets_FiltersByPillar()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/hashtag-sets", new
        {
            name = "Safehouse tags",
            category = "pillar_specific",
            pillar = "safehouse_life",
            platform = "instagram",
            hashtags = "[\"#safehouselife\"]"
        });
        await client.PostAsJsonAsync("/api/admin/social/hashtag-sets", new
        {
            name = "Problem tags",
            category = "pillar_specific",
            pillar = "the_problem",
            platform = "instagram",
            hashtags = "[\"#awareness\"]"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/hashtag-sets?pillar=safehouse_life");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task DeleteHashtagSet_Removes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/hashtag-sets", new
        {
            name = "To delete",
            category = "cause",
            platform = "all",
            hashtags = "[\"#test\"]"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("hashtagSetId").GetInt32();

        var resp = await client.DeleteAsync($"/api/admin/social/hashtag-sets/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}

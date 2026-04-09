using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class TalkingPointsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public TalkingPointsTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateTalkingPoint_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/talking-points", new
        {
            text = "Our safehouse model provides 24/7 care",
            topic = "safehouse_model"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("text").GetString().Should().Contain("24/7");
    }

    [Fact]
    public async Task ListTalkingPoints_ReturnsAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/talking-points", new { text = "Point A", topic = "counseling" });
        await client.PostAsJsonAsync("/api/admin/social/talking-points", new { text = "Point B", topic = "education" });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/talking-points");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task UpdateTalkingPoint_ChangesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/talking-points", new
        {
            text = "Original point",
            topic = "counseling"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentTalkingPointId").GetInt32();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/talking-points/{id}", new
        {
            text = "Updated point",
            topic = "education"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteTalkingPoint_Removes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/talking-points", new
        {
            text = "To delete",
            topic = "general"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("contentTalkingPointId").GetInt32();

        var resp = await client.DeleteAsync($"/api/admin/social/talking-points/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}

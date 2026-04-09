using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class SettingsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public SettingsTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task GetSettings_ReturnsOk()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/settings");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("postsPerWeek", out _).Should().BeTrue();
    }

    [Fact]
    public async Task UpdateSettings_PersistsChanges()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/settings", new
        {
            postsPerWeek = 15,
            platformsActive = "[\"instagram\",\"facebook\"]",
            timezone = "Asia/Manila",
            recyclingEnabled = false
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/settings");
        get.GetProperty("postsPerWeek").GetInt32().Should().Be(15);
        get.GetProperty("timezone").GetString().Should().Be("Asia/Manila");
        get.GetProperty("recyclingEnabled").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task GetSettings_DeniedForNonAdmin()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/settings");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class VoiceGuideTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public VoiceGuideTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task GetVoiceGuide_ReturnsEmptyWhenNoneExist()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/voice-guide");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateVoiceGuide_CreatesAndPersists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PutAsJsonAsync("/api/admin/social/voice-guide", new
        {
            orgDescription = "A nonprofit protecting abuse survivors",
            toneDescription = "Warm, hopeful, direct",
            preferredTerms = "{\"residents\": \"not victims\"}",
            avoidedTerms = "{\"guilt language\": true}",
            structuralRules = "Always end awareness posts with hope",
            visualRules = "No identifiable faces without consent"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var get = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/voice-guide");
        get.GetProperty("orgDescription").GetString().Should().Be("A nonprofit protecting abuse survivors");
        get.GetProperty("toneDescription").GetString().Should().Be("Warm, hopeful, direct");
    }

    [Fact]
    public async Task VoiceGuide_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/voice-guide");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

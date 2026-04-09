using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class AARReportTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AARReportTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task AARSummary_Admin_Returns200WithCategories()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var response = await client.GetAsync("/api/admin/reports/aar-summary");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("categories", out var categories).Should().BeTrue();

        var cats = categories.EnumerateArray().ToArray();
        cats.Should().HaveCount(3);

        var catNames = cats.Select(c => c.GetProperty("category").GetString()).ToList();
        catNames.Should().Contain("Caring");
        catNames.Should().Contain("Healing");
        catNames.Should().Contain("Teaching");

        // Each category should have serviceCount and beneficiaryCount
        foreach (var cat in cats)
        {
            cat.TryGetProperty("serviceCount", out _).Should().BeTrue();
            cat.TryGetProperty("beneficiaryCount", out _).Should().BeTrue();
        }

        body.TryGetProperty("totalBeneficiaries", out _).Should().BeTrue();
    }

    [Fact]
    public async Task AARSummary_Unauthenticated_Returns401()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);

        var response = await client.GetAsync("/api/admin/reports/aar-summary");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AARSummary_DonorRole_Returns403()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);

        var response = await client.GetAsync("/api/admin/reports/aar-summary");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

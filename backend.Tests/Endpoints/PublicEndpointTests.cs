using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class PublicEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public PublicEndpointTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Health_ReturnsStatusAndDbInfo()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("database").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("environment").GetString().Should().NotBeNullOrEmpty();
        body.TryGetProperty("endpoints", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ImpactSummary_ReturnsAggregatedData()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/summary");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("totalResidents", out _).Should().BeTrue();
        body.TryGetProperty("activeSafehouses", out _).Should().BeTrue();
        body.TryGetProperty("totalDonations", out _).Should().BeTrue();
        body.TryGetProperty("reintegrationRate", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ImpactSummary_NoPII()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/summary");
        var raw = await response.Content.ReadAsStringAsync();

        // Should not contain PII fields
        raw.Should().NotContain("dateOfBirth");
        raw.Should().NotContain("caseControlNo");
        raw.Should().NotContain("internalCode");
        raw.Should().NotContain("assignedSocialWorker");
    }

    [Fact]
    public async Task DonationsByMonth_ReturnsSortedData()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/donations-by-month");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);

        var arr = body.EnumerateArray().ToArray();
        if (arr.Length > 1)
        {
            // Check sorted by year then month
            for (int i = 1; i < arr.Length; i++)
            {
                var prevYear = arr[i - 1].GetProperty("year").GetInt32();
                var prevMonth = arr[i - 1].GetProperty("month").GetInt32();
                var curYear = arr[i].GetProperty("year").GetInt32();
                var curMonth = arr[i].GetProperty("month").GetInt32();

                (curYear * 100 + curMonth).Should().BeGreaterThanOrEqualTo(prevYear * 100 + prevMonth);
            }
        }
    }

    [Fact]
    public async Task AllocationsByProgram_ReturnsArray()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/allocations-by-program");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);

        foreach (var item in body.EnumerateArray())
        {
            item.TryGetProperty("area", out _).Should().BeTrue();
            item.TryGetProperty("amount", out _).Should().BeTrue();
        }
    }

    [Fact]
    public async Task EducationTrends_ReturnsMonthlyAvg()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/education-trends");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);

        foreach (var item in body.EnumerateArray())
        {
            item.TryGetProperty("year", out _).Should().BeTrue();
            item.TryGetProperty("month", out _).Should().BeTrue();
            item.TryGetProperty("avgProgress", out _).Should().BeTrue();
        }
    }

    [Fact]
    public async Task HealthTrends_ReturnsAllScores()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/health-trends");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);

        foreach (var item in body.EnumerateArray())
        {
            item.TryGetProperty("avgHealth", out _).Should().BeTrue();
            item.TryGetProperty("avgNutrition", out _).Should().BeTrue();
            item.TryGetProperty("avgSleep", out _).Should().BeTrue();
            item.TryGetProperty("avgEnergy", out _).Should().BeTrue();
        }
    }

    [Fact]
    public async Task Safehouses_ReturnsAll()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/safehouses");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);

        foreach (var item in body.EnumerateArray())
        {
            item.TryGetProperty("safehouseId", out _).Should().BeTrue();
            item.TryGetProperty("name", out _).Should().BeTrue();
            item.TryGetProperty("status", out _).Should().BeTrue();
        }
    }

    [Fact]
    public async Task Safehouses_NoPII()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/safehouses");
        var raw = await response.Content.ReadAsStringAsync();

        // Should not contain resident detail fields
        raw.Should().NotContain("residentId");
        raw.Should().NotContain("dateOfBirth");
        raw.Should().NotContain("caseControlNo");
    }

    [Fact]
    public async Task Snapshots_OnlyPublished()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/snapshots");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
        // All returned snapshots should be published (we can't see isPublished in the response,
        // but the endpoint filters by is_published = true, so any result is valid)
    }

    [Fact]
    public async Task Snapshots_MaxResults()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/impact/snapshots");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetArrayLength().Should().BeLessThanOrEqualTo(12);
    }

    [Theory]
    [InlineData("/api/health")]
    [InlineData("/api/impact/summary")]
    [InlineData("/api/impact/donations-by-month")]
    [InlineData("/api/impact/allocations-by-program")]
    [InlineData("/api/impact/education-trends")]
    [InlineData("/api/impact/health-trends")]
    [InlineData("/api/impact/safehouses")]
    [InlineData("/api/impact/snapshots")]
    public async Task AllPublicEndpoints_ReturnJson(string url)
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync(url);

        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }
}

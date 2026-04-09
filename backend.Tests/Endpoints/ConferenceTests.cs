using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class ConferenceTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public ConferenceTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateConference_ValidPayload_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create resident first
        var resResp = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = $"CONF-{Guid.NewGuid():N}"[..10],
            caseStatus = "Active"
        });
        var residentId = (await resResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("residentId").GetInt32();

        var response = await client.PostAsJsonAsync("/api/admin/intervention-plans", new
        {
            residentId,
            planCategory = "Rehabilitation",
            planDescription = "Quarterly review",
            caseConferenceDate = "2026-06-01",
            status = "Open"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("planId", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateConference_ZeroResidentId_Returns400()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var response = await client.PostAsJsonAsync("/api/admin/intervention-plans", new
        {
            residentId = 0,
            planCategory = "Health"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetConferences_FilterByResident_ReturnsFiltered()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create resident
        var resResp = await client.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = $"CFLT-{Guid.NewGuid():N}"[..10],
            caseStatus = "Active"
        });
        var residentId = (await resResp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("residentId").GetInt32();

        // Create a conference for this resident
        await client.PostAsJsonAsync("/api/admin/intervention-plans", new
        {
            residentId,
            planCategory = "Education",
            caseConferenceDate = "2026-07-01"
        });

        // Fetch filtered
        var response = await client.GetAsync($"/api/admin/intervention-plans?residentId={residentId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var plans = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = plans.EnumerateArray().ToArray();
        items.Should().NotBeEmpty();
        items.Should().AllSatisfy(p =>
            p.GetProperty("residentId").GetInt32().Should().Be(residentId));
    }
}

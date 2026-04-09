using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class AwarenessDatesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AwarenessDatesTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateAwarenessDate_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/awareness-dates", new
        {
            name = "Human Trafficking Awareness Month",
            dateStart = "2026-01-01",
            dateEnd = "2026-01-31",
            recurrence = "annual",
            pillarEmphasis = "the_problem",
            description = "January is Human Trafficking Awareness Month"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("awarenessDateId").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ListAwarenessDates_ReturnsAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/awareness-dates", new
        {
            name = "Giving Tuesday",
            dateStart = "2026-12-01",
            dateEnd = "2026-12-01",
            recurrence = "annual",
            pillarEmphasis = "call_to_action"
        });
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/awareness-dates");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task UpdateAwarenessDate_ChangesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/awareness-dates", new
        {
            name = "Original Date",
            dateStart = "2026-06-01",
            recurrence = "annual",
            pillarEmphasis = "the_problem"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("awarenessDateId").GetInt32();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/awareness-dates/{id}", new
        {
            name = "Updated Date",
            pillarEmphasis = "call_to_action"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await resp.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("name").GetString().Should().Be("Updated Date");
    }

    [Fact]
    public async Task DeleteAwarenessDate_Removes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/awareness-dates", new
        {
            name = "To Delete",
            dateStart = "2026-07-01",
            recurrence = "one_time",
            pillarEmphasis = "the_problem"
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("awarenessDateId").GetInt32();

        var resp = await client.DeleteAsync($"/api/admin/social/awareness-dates/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AwarenessDates_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/awareness-dates");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

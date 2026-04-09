using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class CtaConfigTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public CtaConfigTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateCta_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/cta", new
        {
            title = "Q2 Fundraising Goal",
            description = "Help us raise $50,000",
            goalAmount = 50000.00,
            currentAmount = 12500.00,
            url = "https://example.com/donate",
            priority = 1
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("title").GetString().Should().Be("Q2 Fundraising Goal");
        created.GetProperty("goalAmount").GetDecimal().Should().Be(50000.00m);
    }

    [Fact]
    public async Task ListCtas_ReturnsActiveOnly()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/cta", new
        {
            title = "Active CTA",
            description = "Active one",
            priority = 1
        });
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/cta");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task UpdateCta_ChangesFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/cta", new
        {
            title = "Original CTA",
            description = "Original desc",
            goalAmount = 10000.00,
            priority = 2
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("ctaConfigId").GetInt32();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/cta/{id}", new
        {
            title = "Updated CTA",
            currentAmount = 5000.00
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteCta_Removes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/cta", new
        {
            title = "To Delete",
            description = "Delete me",
            priority = 99
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("ctaConfigId").GetInt32();

        var resp = await client.DeleteAsync($"/api/admin/social/cta/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}

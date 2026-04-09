using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class MilestoneRulesTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public MilestoneRulesTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateMilestoneRule_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/milestone-rules", new
        {
            name = "Monthly donation milestone",
            metricName = "monthly_donation_total",
            thresholdType = "increment",
            thresholdValue = 5000.00,
            cooldownDays = 7,
            postTemplate = "We just crossed ${value} in donations this month!"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("name").GetString().Should().Contain("donation");
        created.GetProperty("isActive").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task ListMilestoneRules_ReturnsAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/milestone-rules", new
        {
            name = "New donor count",
            metricName = "new_donor_count_monthly",
            thresholdType = "increment",
            thresholdValue = 10,
            cooldownDays = 30
        });
        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/milestone-rules");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public async Task ToggleMilestoneRule_ChangesActive()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/milestone-rules", new
        {
            name = "Toggle test",
            metricName = "monthly_donation_total",
            thresholdType = "absolute",
            thresholdValue = 1000,
            cooldownDays = 1
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("milestoneRuleId").GetInt32();

        var resp = await client.PutAsJsonAsync($"/api/admin/social/milestone-rules/{id}", new
        {
            isActive = false
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await resp.Content.ReadFromJsonAsync<JsonElement>();
        updated.GetProperty("isActive").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task DeleteMilestoneRule_Removes()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/milestone-rules", new
        {
            name = "To delete",
            metricName = "active_resident_count",
            thresholdType = "absolute",
            thresholdValue = 50,
            cooldownDays = 7
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("milestoneRuleId").GetInt32();

        var resp = await client.DeleteAsync($"/api/admin/social/milestone-rules/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task MilestoneRules_DeniedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.GetAsync("/api/admin/social/milestone-rules");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Tests that the admin users endpoint returns donor accounts and
/// that the seeder correctly creates the development donor user.
/// </summary>
public class DonorAccountSeedTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public DonorAccountSeedTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task AdminUsers_IncludesDonorRole()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var users = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");

        users.ValueKind.Should().Be(JsonValueKind.Array);

        var donorUsers = users.EnumerateArray()
            .Where(u => u.GetProperty("roles").EnumerateArray()
                .Any(r => r.GetString() == "Donor"))
            .ToList();

        donorUsers.Should().NotBeEmpty("the seeder should create at least one Donor account");
    }

    [Fact]
    public async Task SeededDonor_HasCorrectFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var users = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");

        var donor = users.EnumerateArray()
            .FirstOrDefault(u => u.GetProperty("email").GetString() == "donor@beaconofhope.org");

        donor.ValueKind.Should().NotBe(JsonValueKind.Undefined, "donor@beaconofhope.org should exist");
        donor.GetProperty("firstName").GetString().Should().Be("Maria");
        donor.GetProperty("lastName").GetString().Should().Be("Chen");
        donor.GetProperty("supporterId").GetInt32().Should().Be(1);
        donor.GetProperty("roles").EnumerateArray()
            .Should().Contain(r => r.GetString() == "Donor");
    }

    [Fact]
    public async Task SeededDonor_CanLogin()
    {
        var client = await AuthHelper.GetDonorClientAsync(_factory);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        me.GetProperty("isAuthenticated").GetBoolean().Should().BeTrue();
    }
}

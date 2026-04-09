using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class EditUserTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public EditUserTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Admin_CanUpdateUserName()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Get the staff user's ID
        var users = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var staff = users.EnumerateArray()
            .First(u => u.GetProperty("email").GetString() == "staff@beaconofhope.org");
        var staffId = staff.GetProperty("id").GetString();

        var response = await client.PutAsJsonAsync($"/api/admin/users/{staffId}", new
        {
            firstName = "Updated",
            lastName = "Name"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify the change persisted
        var updatedUsers = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var updated = updatedUsers.EnumerateArray()
            .First(u => u.GetProperty("id").GetString() == staffId);
        updated.GetProperty("firstName").GetString().Should().Be("Updated");
        updated.GetProperty("lastName").GetString().Should().Be("Name");
    }

    [Fact]
    public async Task Admin_CanUpdateUserRole()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Get the donor user's ID
        var users = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var donor = users.EnumerateArray()
            .First(u => u.GetProperty("email").GetString() == "donor@beaconofhope.org");
        var donorId = donor.GetProperty("id").GetString();

        var response = await client.PutAsJsonAsync($"/api/admin/users/{donorId}", new
        {
            role = "Staff"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify role changed
        var updatedUsers = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var updated = updatedUsers.EnumerateArray()
            .First(u => u.GetProperty("id").GetString() == donorId);
        updated.GetProperty("roles").EnumerateArray()
            .Should().Contain(r => r.GetString() == "Staff");
    }

    [Fact]
    public async Task Admin_CannotUpdateToExistingEmail()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        var users = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var staff = users.EnumerateArray()
            .First(u => u.GetProperty("email").GetString() == "staff@beaconofhope.org");
        var staffId = staff.GetProperty("id").GetString();

        var response = await client.PutAsJsonAsync($"/api/admin/users/{staffId}", new
        {
            email = "admin@beaconofhope.org" // already taken
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task NonAdmin_CannotEditUser()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var response = await client.PutAsJsonAsync("/api/admin/users/some-id", new
        {
            firstName = "Hacker"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task EditNonExistentUser_Returns404()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PutAsJsonAsync("/api/admin/users/nonexistent-id", new
        {
            firstName = "Ghost"
        });
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Auth;

public class LoginTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public LoginTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsUserInfo()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@beaconofhope.org",
            password = "Test1234!@#$",
            rememberMe = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("email").GetString().Should().Be("admin@beaconofhope.org");
        body.GetProperty("roles").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Login_InvalidPassword_ReturnsBadRequest()
    {
        // Use a nonexistent user to avoid incrementing lockout counter on real accounts
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "nobody_wrong_pw@beaconofhope.org",
            password = "WrongPassword123!@#$",
            rememberMe = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_NonexistentUser_ReturnsBadRequest()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "nonexistent@example.com",
            password = "Test1234!@#$",
            rememberMe = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("error").GetString().Should().Be("Invalid email or password.");
    }

    [Fact]
    public async Task Login_MissingEmail_ReturnsBadRequest()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "",
            password = "Test1234!@#$",
            rememberMe = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_MissingPassword_ReturnsBadRequest()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@beaconofhope.org",
            password = "",
            rememberMe = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_SetsAuthCookie()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@beaconofhope.org",
            password = "Test1234!@#$",
            rememberMe = false
        });

        response.Headers.Contains("Set-Cookie").Should().BeTrue();
    }

    [Fact]
    public async Task Logout_Authenticated_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsync("/api/auth/logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Logout_Unauthenticated_Returns401()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsync("/api/auth/logout", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_Authenticated_ReturnsUserInfo()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("isAuthenticated").GetBoolean().Should().BeTrue();
        body.GetProperty("email").GetString().Should().Be("admin@beaconofhope.org");
        body.GetProperty("roles").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task Me_Unauthenticated_ReturnsNotAuthenticated()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("isAuthenticated").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Login_StaffCredentials_ReturnsStaffRole()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "staff@beaconofhope.org",
            password = "Test1234!@#$",
            rememberMe = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var roles = body.GetProperty("roles");
        roles.EnumerateArray().Should().Contain(r => r.GetString() == "Staff");
    }

    [Fact]
    public async Task Login_DonorCredentials_ReturnsDonorRole()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "donor@beaconofhope.org",
            password = "Test1234!@#$",
            rememberMe = false
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var roles = body.GetProperty("roles");
        roles.EnumerateArray().Should().Contain(r => r.GetString() == "Donor");
    }
}

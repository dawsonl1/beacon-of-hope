using System.Net.Http.Json;

namespace backend.Tests.Helpers;

public static class AuthHelper
{
    private const string AdminEmail = "admin@beaconofhope.org";
    private const string StaffEmail = "staff@beaconofhope.org";
    private const string DonorEmail = "donor@beaconofhope.org";
    private const string Password = "Test1234!@#$";

    public static HttpClient GetAnonymousClient(TestWebApplicationFactory factory)
    {
        var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false
        });
        return client;
    }

    public static async Task<HttpClient> GetAdminClientAsync(TestWebApplicationFactory factory)
    {
        return await GetAuthenticatedClientAsync(factory, AdminEmail, Password);
    }

    public static async Task<HttpClient> GetStaffClientAsync(TestWebApplicationFactory factory)
    {
        return await GetAuthenticatedClientAsync(factory, StaffEmail, Password);
    }

    public static async Task<HttpClient> GetDonorClientAsync(TestWebApplicationFactory factory)
    {
        return await GetAuthenticatedClientAsync(factory, DonorEmail, Password);
    }

    private static async Task<HttpClient> GetAuthenticatedClientAsync(
        TestWebApplicationFactory factory, string email, string password)
    {
        var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false
        });

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password,
            rememberMe = false
        });

        response.EnsureSuccessStatusCode();
        return client;
    }
}

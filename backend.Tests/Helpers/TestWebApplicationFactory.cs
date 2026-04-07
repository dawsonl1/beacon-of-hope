using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace backend.Tests.Helpers;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            // The app already reads the connection string from appsettings.Development.json,
            // which points to local Supabase (127.0.0.1:54322).
            // IdentitySeeder runs on startup and seeds Admin, Staff, Donor accounts.
            // No service overrides needed for integration tests against local Supabase.
        });
    }
}

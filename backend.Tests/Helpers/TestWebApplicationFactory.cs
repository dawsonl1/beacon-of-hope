using backend.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace backend.Tests.Helpers;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            // Remove ALL DbContext-related registrations
            services.RemoveAll(typeof(DbContextOptions<AppDbContext>));
            services.RemoveAll(typeof(DbContextOptions));
            var dbContextDescriptors = services
                .Where(d => d.ServiceType == typeof(AppDbContext)
                         || d.ServiceType.FullName?.Contains("EntityFrameworkCore") == true)
                .ToList();
            foreach (var d in dbContextDescriptors)
                services.Remove(d);

            // Persistent in-memory SQLite connection
            _connection = new SqliteConnection("Data Source=:memory:");
            _connection.Open();

            // Disable FK enforcement — SQLite doesn't handle all PG FK patterns
            using (var cmd = _connection.CreateCommand())
            {
                cmd.CommandText = "PRAGMA foreign_keys = OFF;";
                cmd.ExecuteNonQuery();
            }

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlite(_connection);
                options.ConfigureWarnings(w =>
                    w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
            });

            // Override cookie policy so the test client (HTTP) can send Secure cookies
            services.PostConfigure<Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationOptions>(
                Microsoft.AspNetCore.Identity.IdentityConstants.ApplicationScheme,
                opts =>
                {
                    opts.Cookie.SecurePolicy = CookieSecurePolicy.None;
                });

            // Program.cs startup will detect SQLite and call EnsureCreated + IdentitySeeder
            // automatically, so we don't need to do it here.
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection?.Close();
            _connection?.Dispose();
        }
    }
}

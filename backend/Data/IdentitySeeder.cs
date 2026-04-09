using backend.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace backend.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var env = services.GetRequiredService<IWebHostEnvironment>();

        string[] roles = { "Admin", "Staff", "Donor" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        if (env.IsDevelopment())
        {
            await CreateUserIfNotExists(userManager, "admin@beaconofhope.org", "Admin",
                "Director", "Reyes", "Test1234!@#$", null);
            await CreateUserIfNotExists(userManager, "staff@beaconofhope.org", "Staff",
                "Elena", "Reyes", "Test1234!@#$", null);
            await CreateUserIfNotExists(userManager, "donor@beaconofhope.org", "Donor",
                "Maria", "Chen", "Test1234!@#$", 1);
        }

        await SeedDonorAccountsAsync(services, userManager);
    }

    /// <summary>
    /// One-time seed: creates a Donor account for every Supporter who has
    /// at least one Donation but does not yet have a linked ApplicationUser.
    /// </summary>
    private static async Task SeedDonorAccountsAsync(
        IServiceProvider services,
        UserManager<ApplicationUser> userManager)
    {
        var db = services.GetRequiredService<AppDbContext>();

        // SupporterIds that already have a user account
        var linkedSupporterIds = await db.Users
            .Where(u => u.SupporterId != null)
            .Select(u => u.SupporterId!.Value)
            .ToListAsync();

        // Supporters with at least one donation, an email, and no linked user
        var unlinkedDonors = await db.Supporters
            .Where(s => s.Email != null
                && s.Donations.Any()
                && !linkedSupporterIds.Contains(s.SupporterId))
            .ToListAsync();

        foreach (var supporter in unlinkedDonors)
        {
            // Skip if an account with this email already exists
            if (await userManager.FindByEmailAsync(supporter.Email!) != null)
                continue;

            await CreateUserIfNotExists(
                userManager,
                supporter.Email!,
                "Donor",
                supporter.FirstName ?? "",
                supporter.LastName ?? "",
                "Test1234!@#$",
                supporter.SupporterId);
        }
    }

    private static async Task CreateUserIfNotExists(
        UserManager<ApplicationUser> userManager,
        string email, string role, string firstName, string lastName,
        string password, int? supporterId)
    {
        if (await userManager.FindByEmailAsync(email) == null)
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                EmailConfirmed = true,
                SupporterId = supporterId
            };
            var result = await userManager.CreateAsync(user, password);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, role);
        }
    }
}

using backend.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
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

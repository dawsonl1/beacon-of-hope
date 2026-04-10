using backend.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace backend.Data;

// [SECURITY-6] Auth — RBAC: Defines and seeds the four application roles (Admin, Staff,
// Donor, SocialMediaManager). Admin can CUD all data, Staff is scoped to assigned safehouses,
// Donor can only view their own donation history, SocialMediaManager manages social content.
public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var env = services.GetRequiredService<IWebHostEnvironment>();

        // [SECURITY-6] Role definitions — these roles control access throughout the app
        string[] roles = { "Admin", "Staff", "Donor", "SocialMediaManager" };
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
            await CreateUserIfNotExists(userManager, "social@beaconofhope.org", "SocialMediaManager",
                "Rosa", "Santos", "Test1234!@#$", null);

            // Deletable test donor
            await SeedDeleteTestDonorAsync(services, userManager);
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

    private static async Task SeedDeleteTestDonorAsync(
        IServiceProvider services,
        UserManager<ApplicationUser> userManager)
    {
        if (await userManager.FindByEmailAsync("delete@gmail.com") != null)
            return;

        var db = services.GetRequiredService<AppDbContext>();

        // Create Supporter record
        var supporter = new Supporter
        {
            SupporterType = "Individual",
            DisplayName = "Delete Me",
            FirstName = "Delete",
            LastName = "Me",
            Email = "delete@gmail.com",
            Phone = "555-000-0000",
            Region = "North America",
            Country = "United States",
            RelationshipType = "One-Time Donor",
            Status = "Active",
            AcquisitionChannel = "Website",
            FirstDonationDate = new DateOnly(2025, 11, 3),
            CreatedAt = new DateTime(2025, 11, 3, 14, 22, 0, DateTimeKind.Utc)
        };
        db.Supporters.Add(supporter);
        await db.SaveChangesAsync();

        // Create a donation linked to this supporter
        db.Donations.Add(new Donation
        {
            SupporterId = supporter.SupporterId,
            DonationType = "Monetary",
            DonationDate = new DateOnly(2025, 11, 3),
            ChannelSource = "Website",
            CurrencyCode = "USD",
            Amount = 75.00m,
            IsRecurring = false,
            CampaignName = "Year-End Giving",
            Notes = "Test donor for deletion practice"
        });
        await db.SaveChangesAsync();

        // Create user account linked to supporter
        await CreateUserIfNotExists(
            userManager, "delete@gmail.com", "Donor",
            "Delete", "Me", "Test1234!@#$", supporter.SupporterId);
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

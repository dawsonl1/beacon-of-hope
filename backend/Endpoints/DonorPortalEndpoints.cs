using System.Security.Cryptography;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class DonorPortalEndpoints
{
    public static void MapDonorPortalEndpoints(this WebApplication app)
    {
        app.MapGet("/api/donor/my-donations", async (
            HttpContext httpContext,
            UserManager<ApplicationUser> userManager,
            AppDbContext db) =>
        {
            var appUser = await userManager.GetUserAsync(httpContext.User);
            if (appUser?.SupporterId == null)
                return Results.Ok(new { supporter = (object?)null, donations = Array.Empty<object>(), allocations = Array.Empty<object>() });

            var sid = appUser.SupporterId.Value;

            var supporter = await db.Supporters
                .Where(s => s.SupporterId == sid)
                .Select(s => new
                {
                    s.SupporterId,
                    s.DisplayName,
                    s.FirstName,
                    s.LastName,
                    s.SupporterType,
                    s.Status,
                    s.FirstDonationDate,
                })
                .FirstOrDefaultAsync();

            var donations = await db.Donations
                .Where(d => d.SupporterId == sid)
                .OrderByDescending(d => d.DonationDate)
                .Select(d => new
                {
                    d.DonationId,
                    d.DonationType,
                    d.DonationDate,
                    d.Amount,
                    d.EstimatedValue,
                    d.CurrencyCode,
                    d.IsRecurring,
                    d.CampaignName,
                    d.ChannelSource,
                })
                .ToListAsync();

            var donationIds = donations.Select(d => d.DonationId).ToList();

            var allocations = await db.DonationAllocations
                .Where(a => donationIds.Contains(a.DonationId))
                .Select(a => new
                {
                    a.DonationId,
                    a.ProgramArea,
                    a.AmountAllocated,
                    safehouseName = db.Safehouses
                        .Where(s => s.SafehouseId == a.SafehouseId)
                        .Select(s => s.Name ?? s.SafehouseCode)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Results.Ok(new { supporter, donations, allocations });
        }).RequireAuthorization();

        // ── Donation processing ──────────────────────────────────

        app.MapPost("/api/donate/process", async (
            HttpContext httpContext,
            AppDbContext db,
            UserManager<ApplicationUser> userManager,
            IEmailNotificationService emailService,
            IConfiguration config,
            ILoggerFactory loggerFactory) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<CreateCheckoutRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });

            var email = body.DonorEmail?.Trim().ToLowerInvariant() ?? "";
            var firstName = body.DonorFirstName?.Trim() ?? "";
            var lastName = body.DonorLastName?.Trim() ?? "";
            int? supporterId = null;

            // Check if this donor already has an account
            var existingUser = await userManager.FindByEmailAsync(email);
            if (existingUser != null)
            {
                supporterId = existingUser.SupporterId;
            }
            else if (!string.IsNullOrEmpty(email))
            {
                // First-time donor: create Supporter + User account
                var displayName = !string.IsNullOrEmpty(firstName) ? $"{firstName} {lastName}".Trim() : email;
                var supporter = new Supporter
                {
                    FirstName = !string.IsNullOrEmpty(firstName) ? firstName : "Donor",
                    LastName = lastName,
                    Email = email,
                    DisplayName = displayName,
                    SupporterType = "Individual",
                    Status = "Active",
                    FirstDonationDate = AppConstants.DataCutoff,
                    CreatedAt = AppConstants.DataCutoffUtc
                };
                db.Supporters.Add(supporter);
                await db.SaveChangesAsync();
                supporterId = supporter.SupporterId;

                // Generate a secure random password
                var password = GeneratePassword();

                var newUser = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    FirstName = !string.IsNullOrEmpty(firstName) ? firstName : "Donor",
                    LastName = lastName,
                    EmailConfirmed = true,
                    SupporterId = supporterId
                };
                var createResult = await userManager.CreateAsync(newUser, password);
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(newUser, "Donor");

                    // Send login credentials email
                    var baseUrl = config["App:BaseUrl"] ?? "https://beaconofhope.dawsonsprojects.com";
                    var log = loggerFactory.CreateLogger("DonorPortal");
                    log.LogInformation("Sending welcome email to {Email}", email);
                    await emailService.SendDonorWelcomeEmail(email, password, baseUrl);
                    log.LogInformation("Welcome email sent to {Email}", email);
                }
                else
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    loggerFactory.CreateLogger("DonorPortal").LogError("Failed to create donor account for {Email}: {Errors}", email, errors);
                }
            }

            var donation = new backend.Models.Donation
            {
                SupporterId = supporterId,
                DonationType = "Monetary",
                DonationDate = AppConstants.DataCutoff,
                ChannelSource = "Online",
                CurrencyCode = "USD",
                Amount = (body.AmountCents ?? 0) / 100m,
                IsRecurring = body.Mode == "recurring",
                Notes = $"Online donation: {body.Mode}" + (body.Cadence != null ? $" ({body.Cadence})" : "")
            };
            db.Donations.Add(donation);
            await db.SaveChangesAsync();

            // Auto-subscribe to newsletter if opted in
            if (body.Newsletter && !string.IsNullOrEmpty(email))
            {
                var existingSub = await db.NewsletterSubscribers
                    .FirstOrDefaultAsync(s => s.Email == email);
                if (existingSub != null)
                {
                    existingSub.IsActive = true;
                }
                else
                {
                    db.NewsletterSubscribers.Add(new backend.Models.NewsletterSubscriber
                    {
                        Email = email,
                        SubscribedAt = AppConstants.DataCutoffUtc,
                        IsActive = true
                    });
                }
                await db.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                amount = (body.AmountCents ?? 0) / 100m,
                isRecurring = body.Mode == "recurring",
                email
            });
        });
    }

    private static string GeneratePassword()
    {
        const string upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lower = "abcdefghijklmnopqrstuvwxyz";
        const string digits = "0123456789";
        const string special = "!@#$%^&*";
        var all = upper + lower + digits + special;

        var password = new char[16];
        password[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        password[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        password[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        password[3] = special[RandomNumberGenerator.GetInt32(special.Length)];

        for (int i = 4; i < password.Length; i++)
            password[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

        // Shuffle
        for (int i = password.Length - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(i + 1);
            (password[i], password[j]) = (password[j], password[i]);
        }

        return new string(password);
    }
}

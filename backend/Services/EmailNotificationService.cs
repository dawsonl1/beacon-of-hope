using Microsoft.EntityFrameworkCore;
using SendGrid;
using SendGrid.Helpers.Mail;
using backend.Data;

namespace backend.Services;

public interface IEmailNotificationService
{
    Task SendPostReadyNotification(int readyCount);
    Task SendGenerationFailedNotification(string error);
    Task SendEngagementReminder(int postsNeedingData);
    Task SendDonorWelcomeEmail(string donorEmail, string password, string baseUrl);
}

public class EmailNotificationService : IEmailNotificationService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<EmailNotificationService> _logger;

    public EmailNotificationService(IServiceProvider services, IConfiguration config, ILogger<EmailNotificationService> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    public async Task SendPostReadyNotification(int readyCount)
    {
        var (enabled, email) = await GetEmailConfig();
        if (!enabled || string.IsNullOrEmpty(email)) return;

        await SendEmail(
            email,
            $"[Social Media] {readyCount} posts ready to publish",
            $"You have {readyCount} social media post(s) ready to publish.\n\n" +
            "Log in to the admin panel to review and copy them to your social media platforms.\n\n" +
            "— Social Media Automation System"
        );
    }

    public async Task SendGenerationFailedNotification(string error)
    {
        var (enabled, email) = await GetEmailConfig();
        if (!enabled || string.IsNullOrEmpty(email)) return;

        await SendEmail(
            email,
            "[Social Media] Content generation failed",
            $"The daily content generation job failed:\n\n{error}\n\n" +
            "The queue may be empty today. You can trigger manual generation from the admin panel, " +
            "or the job will retry tomorrow.\n\n" +
            "— Social Media Automation System"
        );
    }

    public async Task SendEngagementReminder(int postsNeedingData)
    {
        var (enabled, email) = await GetEmailConfig();
        if (!enabled || string.IsNullOrEmpty(email)) return;

        await SendEmail(
            email,
            $"[Social Media] {postsNeedingData} posts need engagement data",
            $"You have {postsNeedingData} published post(s) that haven't had engagement data logged yet.\n\n" +
            "Logging likes, shares, and comments helps the AI learn what content works best.\n\n" +
            "— Social Media Automation System"
        );
    }

    public async Task SendDonorWelcomeEmail(string donorEmail, string password, string baseUrl)
    {
        var subject = "Welcome to Beacon of Hope — Your Donor Account";
        var body = $"Thank you for your generous donation to Beacon of Hope!\n\n" +
                   $"We've created a donor portal account so you can track your impact " +
                   $"and manage your giving.\n\n" +
                   $"Your login details:\n" +
                   $"  Email: {donorEmail}\n" +
                   $"  Password: {password}\n\n" +
                   $"Log in at: {baseUrl}/login\n\n" +
                   $"We recommend changing your password after your first login.\n\n" +
                   $"Thank you for making a difference.\n" +
                   $"— The Beacon of Hope Team";

        await SendEmail(donorEmail, subject, body);
    }

    private async Task<(bool enabled, string? email)> GetEmailConfig()
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var settings = await db.SocialMediaSettings.FirstOrDefaultAsync();
        if (settings == null) return (false, null);

        var method = settings.NotificationMethod;
        var enabled = method == "email" || method == "both";
        return (enabled, settings.NotificationEmail);
    }

    private async Task SendEmail(string to, string subject, string body)
    {
        var apiKey = _config["SendGrid:ApiKey"];
        var fromEmail = _config["SendGrid:FromEmail"] ?? "noreply@beaconofhope.org";
        var fromName = _config["SendGrid:FromName"] ?? "Beacon of Hope";

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogWarning("SendGrid API key not configured. Email skipped: {Subject}", subject);
            return;
        }

        try
        {
            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, fromName);
            var toAddr = new EmailAddress(to);
            var msg = MailHelper.CreateSingleEmail(from, toAddr, subject, body, null);
            var response = await client.SendEmailAsync(msg);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
            }
            else
            {
                var responseBody = await response.Body.ReadAsStringAsync();
                _logger.LogError("SendGrid returned {StatusCode} for {To}: {Body}", response.StatusCode, to, responseBody);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}: {Subject}", to, subject);
        }
    }
}

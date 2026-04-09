using System.Net;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Services;

public interface IEmailNotificationService
{
    Task SendPostReadyNotification(int readyCount);
    Task SendGenerationFailedNotification(string error);
    Task SendEngagementReminder(int postsNeedingData);
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
            $"{readyCount} posts ready to publish",
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
            "Content generation failed",
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
            $"{postsNeedingData} posts need engagement data",
            $"You have {postsNeedingData} published post(s) that haven't had engagement data logged yet.\n\n" +
            "Logging likes, shares, and comments helps the AI learn what content works best.\n\n" +
            "— Social Media Automation System"
        );
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
        var smtpHost = _config["Smtp:Host"];
        var smtpPort = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
        var smtpUser = _config["Smtp:Username"];
        var smtpPass = _config["Smtp:Password"];
        var fromEmail = _config["Smtp:From"] ?? "noreply@beaconofhope.org";

        if (string.IsNullOrEmpty(smtpHost))
        {
            _logger.LogWarning("SMTP not configured. Email notification skipped: {Subject}", subject);
            return;
        }

        try
        {
            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = !string.IsNullOrEmpty(smtpUser)
                    ? new NetworkCredential(smtpUser, smtpPass)
                    : null,
                EnableSsl = true,
            };

            var message = new MailMessage(fromEmail, to, $"[Social Media] {subject}", body);
            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}: {Subject}", to, subject);
        }
    }
}

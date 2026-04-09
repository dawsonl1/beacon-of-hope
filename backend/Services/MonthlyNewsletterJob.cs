using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Services;

public class MonthlyNewsletterJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<MonthlyNewsletterJob> _logger;

    public MonthlyNewsletterJob(IServiceProvider services, IConfiguration config, ILogger<MonthlyNewsletterJob> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MonthlyNewsletterJob started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var nextRun = GetNextRunTime();
                var delay = nextRun - DateTime.UtcNow;
                if (delay > TimeSpan.Zero)
                {
                    _logger.LogInformation("Next newsletter generation at {NextRun}", nextRun);
                    await Task.Delay(delay, stoppingToken);
                }

                await GenerateNewsletter(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Newsletter generation failed. Will retry next cycle.");
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }

    private static DateTime GetNextRunTime()
    {
        // Run on the 1st of each month at 08:00 UTC
        var now = DateTime.UtcNow;
        var next = new DateTime(now.Year, now.Month, 1, 8, 0, 0, DateTimeKind.Utc);
        if (next <= now)
            next = next.AddMonths(1);
        return next;
    }

    private async Task GenerateNewsletter(CancellationToken ct)
    {
        var now = AppConstants.DataCutoffUtc;
        var monthYear = now.Year * 100 + now.Month;

        // Check if already generated this month
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var exists = await db.Newsletters.AnyAsync(n => n.MonthYear == monthYear, ct);
        if (exists)
        {
            _logger.LogInformation("Newsletter for {MonthYear} already exists. Skipping.", monthYear);
            return;
        }

        var harnessUrl = _config["AiHarness:Url"] ?? "http://localhost:8001";
        var harnessKey = _config["AiHarness:ApiKey"] ?? "";

        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(120) };
        if (!string.IsNullOrEmpty(harnessKey))
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {harnessKey}");

        var genResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/generate-newsletter",
            new { year = now.Year, month = now.Month }, ct);

        if (!genResp.IsSuccessStatusCode)
        {
            _logger.LogWarning("AI harness newsletter generation failed: {Status}", genResp.StatusCode);
            return;
        }

        var genJson = await genResp.Content.ReadFromJsonAsync<JsonElement>(ct);

        var newsletter = new Newsletter
        {
            Subject = genJson.TryGetProperty("subject", out var s) ? s.GetString() : $"Beacon of Hope — {now:MMMM yyyy}",
            HtmlContent = genJson.TryGetProperty("html_content", out var h) ? h.GetString() : null,
            PlainText = genJson.TryGetProperty("plain_text", out var p) ? p.GetString() : null,
            Status = "draft",
            GeneratedAt = AppConstants.DataCutoffUtc,
            MonthYear = monthYear
        };

        db.Newsletters.Add(newsletter);
        await db.SaveChangesAsync(ct);
        _logger.LogInformation("Newsletter draft generated for {MonthYear}: {Id}", monthYear, newsletter.NewsletterId);

        // Notify admins
        try
        {
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
            await emailService.SendPostReadyNotification(0); // Reuse existing notification
        }
        catch { /* notification failure shouldn't prevent newsletter creation */ }
    }
}

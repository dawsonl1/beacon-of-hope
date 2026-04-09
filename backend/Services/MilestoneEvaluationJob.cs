using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models.SocialMedia;

namespace backend.Services;

public class MilestoneEvaluationJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<MilestoneEvaluationJob> _logger;

    public MilestoneEvaluationJob(IServiceProvider services, IConfiguration config, ILogger<MilestoneEvaluationJob> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait a bit on startup to let things settle
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await EvaluateMilestones(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Milestone evaluation failed.");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task EvaluateMilestones(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var rules = await db.MilestoneRules
            .Where(r => r.IsActive)
            .ToListAsync(ct);

        if (rules.Count == 0) return;

        foreach (var rule in rules)
        {
            // Check cooldown
            if (rule.LastTriggeredAt != null &&
                (DateTime.UtcNow - rule.LastTriggeredAt.Value).TotalDays < rule.CooldownDays)
                continue;

            var currentValue = await GetMetricValue(db, rule.MetricName, ct);
            if (currentValue == null) continue;

            bool shouldTrigger = rule.ThresholdType switch
            {
                "absolute" => currentValue >= rule.ThresholdValue,
                "increment" => rule.ThresholdValue > 0 && currentValue % rule.ThresholdValue < (rule.ThresholdValue * 0.1m),
                _ => false,
            };

            if (!shouldTrigger) continue;

            _logger.LogInformation("Milestone triggered: {Name} (value: {Value})", rule.Name, currentValue);

            // Generate a milestone post via the harness
            var harnessUrl = _config["AiHarness:Url"] ?? "http://localhost:8001";
            var harnessKey = _config["AiHarness:ApiKey"] ?? "";

            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
            if (!string.IsNullOrEmpty(harnessKey))
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {harnessKey}");

            try
            {
                var genResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/generate-post", new
                {
                    pillar = "donor_impact",
                    platform = "instagram",
                    milestone_data = new { metric = rule.MetricName, value = currentValue, template = rule.PostTemplate }
                }, ct);

                if (genResp.IsSuccessStatusCode)
                {
                    var genJson = await genResp.Content.ReadFromJsonAsync<JsonElement>(ct);
                    var content = genJson.TryGetProperty("content", out var c) ? c.GetString() : null;

                    if (!string.IsNullOrEmpty(content))
                    {
                        var post = new AutomatedPost
                        {
                            Content = content,
                            ContentPillar = "donor_impact",
                            Source = "milestone_trigger",
                            Status = "draft",
                            Platform = "instagram",
                            MilestoneRuleId = rule.MilestoneRuleId,
                            CreatedAt = DateTime.UtcNow
                        };
                        db.AutomatedPosts.Add(post);
                        rule.LastTriggeredAt = DateTime.UtcNow;
                        rule.UpdatedAt = DateTime.UtcNow;
                        await db.SaveChangesAsync(ct);
                        _logger.LogInformation("Milestone post created: {Id}", post.AutomatedPostId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate milestone post for rule {Name}", rule.Name);
            }
        }
    }

    private async Task<decimal?> GetMetricValue(AppDbContext db, string? metricName, CancellationToken ct)
    {
        return metricName switch
        {
            "monthly_donation_total" => await db.Donations
                .Where(d => d.DonationDate != null && d.DonationDate.Value.Month == DateTime.UtcNow.Month && d.DonationDate.Value.Year == DateTime.UtcNow.Year)
                .SumAsync(d => d.Amount ?? 0, ct),

            "yearly_donation_total" => await db.Donations
                .Where(d => d.DonationDate != null && d.DonationDate.Value.Year == DateTime.UtcNow.Year)
                .SumAsync(d => d.Amount ?? 0, ct),

            "new_donor_count_monthly" => await db.Supporters
                .Where(s => s.CreatedAt != null && s.CreatedAt.Value.Month == DateTime.UtcNow.Month && s.CreatedAt.Value.Year == DateTime.UtcNow.Year)
                .CountAsync(ct),

            "active_resident_count" => await db.Residents
                .Where(r => r.CaseStatus == "Active")
                .CountAsync(ct),

            _ => null,
        };
    }
}

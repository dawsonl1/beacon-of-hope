using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models.SocialMedia;

namespace backend.Services;

public class ContentGenerationJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<ContentGenerationJob> _logger;

    public ContentGenerationJob(IServiceProvider services, IConfiguration config, ILogger<ContentGenerationJob> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ContentGenerationJob started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var nextRun = GetNextRunTime();
                var delay = nextRun - DateTime.UtcNow;
                if (delay > TimeSpan.Zero)
                {
                    _logger.LogInformation("Next content generation at {NextRun} (in {Delay})", nextRun, delay);
                    await Task.Delay(delay, stoppingToken);
                }

                await RunGeneration(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Content generation failed. Will retry next cycle.");
                try
                {
                    using var scope = _services.CreateScope();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
                    await emailService.SendGenerationFailedNotification(ex.Message);
                }
                catch { /* email failure shouldn't prevent retry */ }
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }
    }

    private DateTime GetNextRunTime()
    {
        // Default: run at 6:00 UTC daily. Can be overridden by settings.
        var now = DateTime.UtcNow;
        var runHour = 6;

        // Try to read from DB settings
        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var settings = db.SocialMediaSettings.FirstOrDefault();
            if (settings?.DailyGenerationTime != null && TimeOnly.TryParse(settings.DailyGenerationTime, out var parsed))
            {
                runHour = parsed.Hour;
            }
        }
        catch { /* use default */ }

        var next = now.Date.AddHours(runHour);
        if (next <= now) next = next.AddDays(1);
        return next;
    }

    private async Task RunGeneration(CancellationToken ct)
    {
        _logger.LogInformation("Starting daily content generation...");

        var harnessUrl = _config["AiHarness:Url"] ?? "http://localhost:8001";
        var harnessKey = _config["AiHarness:ApiKey"] ?? "";

        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(120) };
        if (!string.IsNullOrEmpty(harnessKey))
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {harnessKey}");

        // Health check
        try
        {
            var health = await httpClient.GetAsync($"{harnessUrl}/health", ct);
            if (!health.IsSuccessStatusCode)
            {
                _logger.LogWarning("AI harness health check failed. Skipping generation.");
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI harness unreachable. Skipping generation.");
            return;
        }

        // Get max batch size from settings
        int maxPosts = 10;
        using (var scope = _services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var settings = await db.SocialMediaSettings.FirstOrDefaultAsync(ct);
            if (settings != null) maxPosts = settings.MaxBatchSize;
        }

        // Plan content
        var planResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/plan-content", new { max_posts = maxPosts }, ct);
        if (!planResp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Content planning failed with status {Status}", planResp.StatusCode);
            return;
        }

        var planJson = await planResp.Content.ReadFromJsonAsync<JsonElement>(ct);
        if (!planJson.TryGetProperty("plan", out var plan) || plan.GetArrayLength() == 0)
        {
            _logger.LogInformation("Planner returned empty plan. Nothing to generate.");
            return;
        }

        _logger.LogInformation("Plan has {Count} posts to generate.", plan.GetArrayLength());

        int generated = 0;
        foreach (var item in plan.EnumerateArray())
        {
            try
            {
                var pillar = item.GetProperty("pillar").GetString();
                var platform = item.GetProperty("platform").GetString();
                int? photoId = item.TryGetProperty("photo_id", out var pid) && pid.ValueKind == JsonValueKind.Number ? pid.GetInt32() : null;
                int? factId = item.TryGetProperty("fact_id", out var fid) && fid.ValueKind == JsonValueKind.Number ? fid.GetInt32() : null;
                int? tpId = item.TryGetProperty("talking_point_id", out var tid) && tid.ValueKind == JsonValueKind.Number ? tid.GetInt32() : null;

                // Select photo if needed
                if (photoId == null && pillar != "the_problem" && pillar != "call_to_action")
                {
                    try
                    {
                        var selectResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/select-photo", new
                        {
                            pillar, platform,
                            post_description = item.TryGetProperty("reasoning", out var r) ? r.GetString() : ""
                        }, ct);
                        if (selectResp.IsSuccessStatusCode)
                        {
                            var selectJson = await selectResp.Content.ReadFromJsonAsync<JsonElement>(ct);
                            if (selectJson.TryGetProperty("photo_id", out var selId) && selId.ValueKind == JsonValueKind.Number)
                                photoId = selId.GetInt32();
                        }
                    }
                    catch { /* optional */ }
                }

                // Generate post
                var genResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/generate-post", new
                {
                    pillar, platform, photo_id = photoId, fact_id = factId, talking_point_id = tpId
                }, ct);
                if (!genResp.IsSuccessStatusCode) continue;

                var genJson = await genResp.Content.ReadFromJsonAsync<JsonElement>(ct);
                var content = genJson.TryGetProperty("content", out var c) ? c.GetString() : null;
                if (string.IsNullOrEmpty(content)) continue;

                // Get schedule time
                DateTime? scheduledAt = null;
                try
                {
                    var schedResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/predict-schedule", new { pillar, platform }, ct);
                    if (schedResp.IsSuccessStatusCode)
                    {
                        var schedJson = await schedResp.Content.ReadFromJsonAsync<JsonElement>(ct);
                        if (schedJson.TryGetProperty("scheduled_at", out var sa))
                            scheduledAt = DateTime.Parse(sa.GetString()!, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);
                    }
                }
                catch { /* optional */ }

                // Save draft
                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var post = new AutomatedPost
                {
                    Content = content,
                    ContentPillar = pillar,
                    Source = "auto_generated",
                    Status = "draft",
                    Platform = platform,
                    MediaId = photoId,
                    FactId = factId,
                    TalkingPointId = tpId,
                    ScheduledAt = scheduledAt,
                    CreatedAt = AppConstants.DataCutoffUtc
                };
                db.AutomatedPosts.Add(post);
                await db.SaveChangesAsync(ct);
                generated++;
                _logger.LogInformation("Generated post {Id}: {Pillar}/{Platform}", post.AutomatedPostId, pillar, platform);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate one post. Continuing with batch.");
            }
        }

        _logger.LogInformation("Daily generation complete. {Count} posts created.", generated);
    }
}

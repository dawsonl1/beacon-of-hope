using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Services;

/// <summary>
/// Monthly cleanup job that enforces data retention policies.
///
/// Retention tiers:
/// - Keep forever: published posts with engagement, approved facts, voice guide
/// - 12 months then delete: rejected posts, visit events
/// - 90 days then delete: rejected fact candidates
/// - 30 days then auto-reject: stale snoozed posts
/// - Immediately: orphaned generated graphics from deleted posts
/// </summary>
public class DataRetentionJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DataRetentionJob> _logger;

    public DataRetentionJob(IServiceProvider services, ILogger<DataRetentionJob> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run once on startup after a delay, then monthly
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCleanup(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Data retention cleanup failed.");
            }

            // Run monthly (30 days)
            await Task.Delay(TimeSpan.FromDays(30), stoppingToken);
        }
    }

    private async Task RunCleanup(CancellationToken ct)
    {
        _logger.LogInformation("Starting data retention cleanup...");
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = AppConstants.DataCutoffUtc;
        int totalCleaned = 0;

        // 1. Delete rejected posts older than 12 months
        var oldRejected = await db.AutomatedPosts
            .Where(p => p.Status == "rejected" && p.UpdatedAt != null && p.UpdatedAt < now.AddMonths(-12))
            .ToListAsync(ct);
        if (oldRejected.Count > 0)
        {
            db.AutomatedPosts.RemoveRange(oldRejected);
            totalCleaned += oldRejected.Count;
            _logger.LogInformation("Deleted {Count} rejected posts older than 12 months.", oldRejected.Count);
        }

        // 2. Delete rejected fact candidates older than 90 days
        var oldCandidates = await db.ContentFactCandidates
            .Where(c => c.Status == "rejected" && c.ReviewedAt != null && c.ReviewedAt < now.AddDays(-90))
            .ToListAsync(ct);
        if (oldCandidates.Count > 0)
        {
            db.ContentFactCandidates.RemoveRange(oldCandidates);
            totalCleaned += oldCandidates.Count;
            _logger.LogInformation("Deleted {Count} rejected fact candidates older than 90 days.", oldCandidates.Count);
        }

        // 3. Auto-reject snoozed posts older than 30 days (abandoned)
        var staleSnoozed = await db.AutomatedPosts
            .Where(p => p.Status == "snoozed" && p.UpdatedAt != null && p.UpdatedAt < now.AddDays(-30))
            .ToListAsync(ct);
        foreach (var post in staleSnoozed)
        {
            post.Status = "rejected";
            post.RejectionReason = "Auto-rejected: snoozed for over 30 days";
            post.UpdatedAt = now;
        }
        if (staleSnoozed.Count > 0)
        {
            totalCleaned += staleSnoozed.Count;
            _logger.LogInformation("Auto-rejected {Count} stale snoozed posts (>30 days).", staleSnoozed.Count);
        }

        // 4. Clean orphaned generated graphics (not referenced by any post)
        var usedGraphicIds = await db.AutomatedPosts
            .Where(p => p.GeneratedGraphicId != null)
            .Select(p => p.GeneratedGraphicId!.Value)
            .Distinct()
            .ToListAsync(ct);
        var orphanedGraphics = await db.GeneratedGraphics
            .Where(g => !usedGraphicIds.Contains(g.GeneratedGraphicId))
            .Where(g => g.CreatedAt != null && g.CreatedAt < now.AddDays(-7)) // Grace period
            .ToListAsync(ct);
        if (orphanedGraphics.Count > 0)
        {
            // Delete files from disk
            foreach (var graphic in orphanedGraphics)
            {
                if (!string.IsNullOrEmpty(graphic.FilePath))
                {
                    var absPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", graphic.FilePath.TrimStart('/'));
                    if (File.Exists(absPath))
                    {
                        try { File.Delete(absPath); }
                        catch (Exception ex) { _logger.LogWarning(ex, "Failed to delete graphic file: {Path}", absPath); }
                    }
                }
            }
            db.GeneratedGraphics.RemoveRange(orphanedGraphics);
            totalCleaned += orphanedGraphics.Count;
            _logger.LogInformation("Deleted {Count} orphaned generated graphics.", orphanedGraphics.Count);
        }

        // 5. Delete visit events older than 12 months — visitor-tracking data
        // is kept only long enough for the monthly report. Uses wall-clock UTC
        // (not DataCutoffUtc) because visit_events are real-time operational
        // records, not demo-frozen business data.
        var oldVisits = await db.VisitEvents
            .Where(v => v.Timestamp < DateTime.UtcNow.AddMonths(-12))
            .ExecuteDeleteAsync(ct);
        if (oldVisits > 0)
        {
            totalCleaned += oldVisits;
            _logger.LogInformation("Deleted {Count} visit events older than 12 months.", oldVisits);
        }

        if (totalCleaned > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        _logger.LogInformation("Data retention cleanup complete. {Total} items processed.", totalCleaned);
    }
}

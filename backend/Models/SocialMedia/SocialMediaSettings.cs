using System;

namespace backend.Models.SocialMedia;

public class SocialMediaSettings
{
    public int SocialMediaSettingsId { get; set; }
    public int PostsPerWeek { get; set; } = 10;
    public string? PlatformsActive { get; set; }
    public string? Timezone { get; set; }
    public bool RecyclingEnabled { get; set; } = true;
    public string? DailyGenerationTime { get; set; }
    public decimal DailySpendCapUsd { get; set; } = 5.00m;
    public int MaxBatchSize { get; set; } = 10;
    public string? NotificationMethod { get; set; }
    public string? NotificationEmail { get; set; }
    public int PillarRatioSafehouseLife { get; set; } = 30;
    public int PillarRatioTheProblem { get; set; } = 25;
    public int PillarRatioTheSolution { get; set; } = 20;
    public int PillarRatioDonorImpact { get; set; } = 15;
    public int PillarRatioCallToAction { get; set; } = 10;
    public int RecyclingCooldownDays { get; set; } = 90;
    public int RecyclingMinEngagement { get; set; } = 20;
    public DateTime? UpdatedAt { get; set; }
}

using System;

namespace backend.Models.SocialMedia;

public class CtaConfig
{
    public int CtaConfigId { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public decimal? GoalAmount { get; set; }
    public decimal? CurrentAmount { get; set; }
    public string? Url { get; set; }
    public bool IsActive { get; set; } = true;
    public int Priority { get; set; } = 0;
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

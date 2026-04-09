using System;
using System.Collections.Generic;

namespace backend.Models.SocialMedia;

public class MilestoneRule
{
    public int MilestoneRuleId { get; set; }
    public string? Name { get; set; }
    public string? MetricName { get; set; }
    public string? ThresholdType { get; set; }
    public decimal? ThresholdValue { get; set; }
    public int CooldownDays { get; set; } = 7;
    public string? PostTemplate { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<AutomatedPost> AutomatedPosts { get; set; } = new List<AutomatedPost>();
}

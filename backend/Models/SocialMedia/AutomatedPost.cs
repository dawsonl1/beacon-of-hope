using System;

namespace backend.Models.SocialMedia;

public class AutomatedPost
{
    public int AutomatedPostId { get; set; }
    public string? Content { get; set; }
    public string? OriginalContent { get; set; }
    public string? ContentPillar { get; set; }
    public string? Source { get; set; }
    public string? Status { get; set; }
    public DateTime? SnoozedUntil { get; set; }
    public string? Platform { get; set; }
    public int? MediaId { get; set; }
    public int? GeneratedGraphicId { get; set; }
    public int? FactId { get; set; }
    public int? TalkingPointId { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }
    public int? MilestoneRuleId { get; set; }
    public int? RecycledFromId { get; set; }
    public int? EngagementLikes { get; set; }
    public int? EngagementShares { get; set; }
    public int? EngagementComments { get; set; }
    public decimal? EngagementDonations { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public virtual MediaLibraryItem? Media { get; set; }
    public virtual GeneratedGraphic? GeneratedGraphic { get; set; }
    public virtual ContentFact? Fact { get; set; }
    public virtual ContentTalkingPoint? TalkingPoint { get; set; }
    public virtual MilestoneRule? MilestoneRule { get; set; }
    public virtual AutomatedPost? RecycledFrom { get; set; }
}

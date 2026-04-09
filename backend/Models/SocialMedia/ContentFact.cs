using System;
using System.Collections.Generic;

namespace backend.Models.SocialMedia;

public class ContentFact
{
    public int ContentFactId { get; set; }
    public string? FactText { get; set; }
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? Category { get; set; }
    public string? Pillar { get; set; }
    public int UsageCount { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public string? AddedBy { get; set; }
    public DateTime? AddedAt { get; set; }

    public virtual ICollection<AutomatedPost> AutomatedPosts { get; set; } = new List<AutomatedPost>();
}

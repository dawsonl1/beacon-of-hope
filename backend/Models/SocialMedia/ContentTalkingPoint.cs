using System;
using System.Collections.Generic;

namespace backend.Models.SocialMedia;

public class ContentTalkingPoint
{
    public int ContentTalkingPointId { get; set; }
    public string? Text { get; set; }
    public string? Topic { get; set; }
    public int UsageCount { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<AutomatedPost> AutomatedPosts { get; set; } = new List<AutomatedPost>();
}

using System;
using System.Collections.Generic;

namespace backend.Models.SocialMedia;

public class GeneratedGraphic
{
    public int GeneratedGraphicId { get; set; }
    public string? FilePath { get; set; }
    public int? TemplateId { get; set; }
    public string? OverlayText { get; set; }
    public DateTime? CreatedAt { get; set; }

    public virtual GraphicTemplate? Template { get; set; }
    public virtual ICollection<AutomatedPost> AutomatedPosts { get; set; } = new List<AutomatedPost>();
}

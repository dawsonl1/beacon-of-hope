using System;
using System.Collections.Generic;

namespace backend.Models.SocialMedia;

public class GraphicTemplate
{
    public int GraphicTemplateId { get; set; }
    public string? Name { get; set; }
    public string? FilePath { get; set; }
    public string? TextColor { get; set; }
    public string? TextPosition { get; set; }
    public string? SuitableFor { get; set; }
    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<GeneratedGraphic> GeneratedGraphics { get; set; } = new List<GeneratedGraphic>();
}

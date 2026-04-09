using System;

namespace backend.Models.SocialMedia;

public class AwarenessDate
{
    public int AwarenessDateId { get; set; }
    public string? Name { get; set; }
    public DateOnly? DateStart { get; set; }
    public DateOnly? DateEnd { get; set; }
    public string? Recurrence { get; set; }
    public string? PillarEmphasis { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? CreatedAt { get; set; }
}

using System;

namespace backend.Models.SocialMedia;

public class VoiceGuide
{
    public int VoiceGuideId { get; set; }
    public string? OrgDescription { get; set; }
    public string? ToneDescription { get; set; }
    public string? PreferredTerms { get; set; }
    public string? AvoidedTerms { get; set; }
    public string? StructuralRules { get; set; }
    public string? VisualRules { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

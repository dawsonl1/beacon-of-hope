using System;

namespace backend.Models.SocialMedia;

public class ContentFactCandidate
{
    public int ContentFactCandidateId { get; set; }
    public string? FactText { get; set; }
    public string? SourceName { get; set; }
    public string? SourceUrl { get; set; }
    public string? Category { get; set; }
    public string? SearchQuery { get; set; }
    public string? Status { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
}

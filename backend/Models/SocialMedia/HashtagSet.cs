using System;

namespace backend.Models.SocialMedia;

public class HashtagSet
{
    public int HashtagSetId { get; set; }
    public string? Name { get; set; }
    public string? Category { get; set; }
    public string? Pillar { get; set; }
    public string? Platform { get; set; }
    public string? Hashtags { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

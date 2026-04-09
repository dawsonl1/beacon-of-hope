using System;
using System.Collections.Generic;

namespace backend.Models.SocialMedia;

public class MediaLibraryItem
{
    public int MediaLibraryItemId { get; set; }
    public string? FilePath { get; set; }
    public string? ThumbnailPath { get; set; }
    public string? Caption { get; set; }
    public string? ActivityType { get; set; }
    public int? SafehouseId { get; set; }
    public string? UploadedBy { get; set; }
    public bool ConsentConfirmed { get; set; }
    public int UsedCount { get; set; } = 0;
    public DateTime? UploadedAt { get; set; }

    public virtual Safehouse? Safehouse { get; set; }
    public virtual ICollection<AutomatedPost> AutomatedPosts { get; set; } = new List<AutomatedPost>();
}

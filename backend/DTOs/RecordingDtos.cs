using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class RecordingRequest
{
    [Required, Range(1, int.MaxValue, ErrorMessage = "ResidentId is required.")]
    public int ResidentId { get; set; }
    public DateOnly? SessionDate { get; set; }
    [StringLength(200)]
    public string? SocialWorker { get; set; }
    [StringLength(100)]
    public string? SessionType { get; set; }
    [Range(0, 1440, ErrorMessage = "Duration must be between 0 and 1440 minutes.")]
    public int? SessionDurationMinutes { get; set; }
    [StringLength(100)]
    public string? EmotionalStateObserved { get; set; }
    [StringLength(100)]
    public string? EmotionalStateEnd { get; set; }
    public string? SessionNarrative { get; set; }
    public string? InterventionsApplied { get; set; }
    public string? FollowUpActions { get; set; }
    public bool? ProgressNoted { get; set; }
    public bool? ConcernsFlagged { get; set; }
    public bool? ReferralMade { get; set; }
    public string? NotesRestricted { get; set; }
    public bool? NeedsCaseConference { get; set; }
    public bool? ReadyForReintegration { get; set; }
}

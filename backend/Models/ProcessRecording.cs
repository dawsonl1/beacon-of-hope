using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class ProcessRecording
{
    public int RecordingId { get; set; }

    public int ResidentId { get; set; }

    public DateOnly? SessionDate { get; set; }

    public string? SocialWorker { get; set; }

    public string? SessionType { get; set; }

    public int? SessionDurationMinutes { get; set; }

    public string? EmotionalStateObserved { get; set; }

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

    public int? SourceCalendarEventId { get; set; }

    public virtual Resident Resident { get; set; } = null!;
    public virtual CalendarEvent? SourceCalendarEvent { get; set; }
}

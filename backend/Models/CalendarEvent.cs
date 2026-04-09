namespace backend.Models;

public class CalendarEvent
{
    public int CalendarEventId { get; set; }
    public string StaffUserId { get; set; } = string.Empty;
    public int SafehouseId { get; set; }
    public int? ResidentId { get; set; }
    public string EventType { get; set; } = string.Empty; // Counseling, DoctorApt, DentistApt, HomeVisit, CaseConference, ReintegrationVisit, PostPlacementVisit, GroupTherapy, Other
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly EventDate { get; set; }
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public string? RecurrenceRule { get; set; }
    public int? SourceTaskId { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Cancelled
    public DateTime CreatedAt { get; set; } = AppConstants.DataCutoffUtc; // Frozen date — do not replace with DateTime.UtcNow

    public virtual ApplicationUser StaffUser { get; set; } = null!;
    public virtual Safehouse Safehouse { get; set; } = null!;
    public virtual Resident? Resident { get; set; }
    public virtual StaffTask? SourceTask { get; set; }
}

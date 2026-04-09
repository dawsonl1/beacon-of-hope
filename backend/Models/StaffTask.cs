namespace backend.Models;

public class StaffTask
{
    public int StaffTaskId { get; set; }
    public string StaffUserId { get; set; } = string.Empty;
    public int? ResidentId { get; set; }
    public int SafehouseId { get; set; }
    public string TaskType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContextJson { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Snoozed, Completed, Dismissed
    public DateTime? SnoozeUntil { get; set; }
    public DateTime? DueTriggerDate { get; set; }
    public DateTime CreatedAt { get; set; } = AppConstants.DataCutoffUtc; // Frozen date — do not replace with DateTime.UtcNow
    public DateTime? CompletedAt { get; set; }
    public string? SourceEntityType { get; set; }
    public int? SourceEntityId { get; set; }

    public virtual ApplicationUser StaffUser { get; set; } = null!;
    public virtual Resident? Resident { get; set; }
    public virtual Safehouse Safehouse { get; set; } = null!;
}

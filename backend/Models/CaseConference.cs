namespace backend.Models;

public class CaseConference
{
    public int ConferenceId { get; set; }
    public int SafehouseId { get; set; }
    public DateOnly ScheduledDate { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Cancelled
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Safehouse Safehouse { get; set; } = null!;
    public virtual ICollection<CaseConferenceResident> Residents { get; set; } = new List<CaseConferenceResident>();
}

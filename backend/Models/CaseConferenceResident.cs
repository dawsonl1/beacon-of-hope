namespace backend.Models;

public class CaseConferenceResident
{
    public int Id { get; set; }
    public int ConferenceId { get; set; }
    public int ResidentId { get; set; }
    public string Source { get; set; } = "Manual"; // Manual, NeedsConference, MlAlert
    public bool Discussed { get; set; } = false;
    public string? Notes { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public virtual CaseConference Conference { get; set; } = null!;
    public virtual Resident Resident { get; set; } = null!;
}

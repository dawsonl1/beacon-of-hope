namespace backend.Models;

public class DonorOutreach
{
    public int Id { get; set; }
    public int SupporterId { get; set; }
    public string StaffEmail { get; set; } = null!;
    public string StaffName { get; set; } = null!;
    public string OutreachType { get; set; } = null!; // "Email" or "Note"
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = AppConstants.DataCutoffUtc;

    public virtual Supporter Supporter { get; set; } = null!;
}

namespace backend.Models;

public class Newsletter
{
    public int NewsletterId { get; set; }
    public string? Subject { get; set; }
    public string? HtmlContent { get; set; }
    public string? PlainText { get; set; }
    public string Status { get; set; } = "draft";
    public DateTime GeneratedAt { get; set; } = AppConstants.DataCutoffUtc; // Frozen date — do not replace with DateTime.UtcNow
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public int RecipientCount { get; set; }
    public int MonthYear { get; set; } // e.g. 202604
}

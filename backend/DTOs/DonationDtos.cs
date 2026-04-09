using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class DonationRequest
{
    public int? SupporterId { get; set; }
    [StringLength(50)]
    public string? DonationType { get; set; }
    public DateOnly? DonationDate { get; set; }
    [StringLength(100)]
    public string? ChannelSource { get; set; }
    [StringLength(10)]
    public string? CurrencyCode { get; set; }
    [Range(0, 100_000_000, ErrorMessage = "Amount must be non-negative.")]
    public decimal? Amount { get; set; }
    [Range(0, 100_000_000, ErrorMessage = "Estimated value must be non-negative.")]
    public decimal? EstimatedValue { get; set; }
    [StringLength(100)]
    public string? ImpactUnit { get; set; }
    public bool? IsRecurring { get; set; }
    [StringLength(200)]
    public string? CampaignName { get; set; }
    public string? Notes { get; set; }
}

public class CreateCheckoutRequest
{
    [Required, RegularExpression("one-time|recurring", ErrorMessage = "Mode must be 'one-time' or 'recurring'.")]
    public string Mode { get; set; } = "one-time";
    [RegularExpression("monthly|quarterly|yearly", ErrorMessage = "Cadence must be 'monthly', 'quarterly', or 'yearly'.")]
    public string? Cadence { get; set; }
    [Required, Range(100, 100_000_000, ErrorMessage = "Amount must be at least 100 cents ($1).")]
    public long? AmountCents { get; set; }
    [EmailAddress]
    public string? DonorEmail { get; set; }
}

using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Donation
{
    public int DonationId { get; set; }

    public int? SupporterId { get; set; }

    public string? DonationType { get; set; }

    public DateOnly? DonationDate { get; set; }

    public string? ChannelSource { get; set; }

    public string? CurrencyCode { get; set; }

    public decimal? Amount { get; set; }

    public decimal? EstimatedValue { get; set; }

    public string? ImpactUnit { get; set; }

    public bool? IsRecurring { get; set; }

    public string? CampaignName { get; set; }

    public string? Notes { get; set; }

    public int? ReferralPostId { get; set; }

    public virtual ICollection<DonationAllocation> DonationAllocations { get; set; } = new List<DonationAllocation>();

    public virtual ICollection<InKindDonationItem> InKindDonationItems { get; set; } = new List<InKindDonationItem>();

    public virtual SocialMediaPost? ReferralPost { get; set; }

    public virtual Supporter? Supporter { get; set; }
}

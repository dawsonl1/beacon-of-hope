using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class InKindDonationItem
{
    public int ItemId { get; set; }

    public int DonationId { get; set; }

    public string? ItemName { get; set; }

    public string? ItemCategory { get; set; }

    public int? Quantity { get; set; }

    public string? UnitOfMeasure { get; set; }

    public decimal? EstimatedUnitValue { get; set; }

    public string? IntendedUse { get; set; }

    public string? ReceivedCondition { get; set; }

    public virtual Donation Donation { get; set; } = null!;
}

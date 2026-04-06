using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class DonationAllocation
{
    public int AllocationId { get; set; }

    public int DonationId { get; set; }

    public int? SafehouseId { get; set; }

    public string? ProgramArea { get; set; }

    public decimal? AmountAllocated { get; set; }

    public DateOnly? AllocationDate { get; set; }

    public string? AllocationNotes { get; set; }

    public virtual Donation Donation { get; set; } = null!;

    public virtual Safehouse? Safehouse { get; set; }
}

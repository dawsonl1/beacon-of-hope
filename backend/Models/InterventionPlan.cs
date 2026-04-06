using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class InterventionPlan
{
    public int PlanId { get; set; }

    public int ResidentId { get; set; }

    public string? PlanCategory { get; set; }

    public string? PlanDescription { get; set; }

    public string? ServicesProvided { get; set; }

    public decimal? TargetValue { get; set; }

    public DateOnly? TargetDate { get; set; }

    public string? Status { get; set; }

    public DateOnly? CaseConferenceDate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Resident Resident { get; set; } = null!;
}

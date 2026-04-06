using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class IncidentReport
{
    public int IncidentId { get; set; }

    public int? ResidentId { get; set; }

    public int? SafehouseId { get; set; }

    public DateOnly? IncidentDate { get; set; }

    public string? IncidentType { get; set; }

    public string? Severity { get; set; }

    public string? Description { get; set; }

    public string? ResponseTaken { get; set; }

    public bool? Resolved { get; set; }

    public DateOnly? ResolutionDate { get; set; }

    public string? ReportedBy { get; set; }

    public bool? FollowUpRequired { get; set; }

    public virtual Resident? Resident { get; set; }

    public virtual Safehouse? Safehouse { get; set; }
}

using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class EducationRecord
{
    public int EducationRecordId { get; set; }

    public int ResidentId { get; set; }

    public DateOnly? RecordDate { get; set; }

    public string? EducationLevel { get; set; }

    public decimal? AttendanceRate { get; set; }

    public decimal? ProgressPercent { get; set; }

    public string? CompletionStatus { get; set; }

    public string? Notes { get; set; }

    public string? SchoolName { get; set; }

    public string? EnrollmentStatus { get; set; }

    public virtual Resident Resident { get; set; } = null!;
}

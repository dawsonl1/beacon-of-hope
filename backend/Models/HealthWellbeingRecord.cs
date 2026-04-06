using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class HealthWellbeingRecord
{
    public int HealthRecordId { get; set; }

    public int ResidentId { get; set; }

    public DateOnly? RecordDate { get; set; }

    public decimal? WeightKg { get; set; }

    public decimal? HeightCm { get; set; }

    public decimal? Bmi { get; set; }

    public decimal? NutritionScore { get; set; }

    public decimal? SleepQualityScore { get; set; }

    public decimal? EnergyLevelScore { get; set; }

    public decimal? GeneralHealthScore { get; set; }

    public bool? MedicalCheckupDone { get; set; }

    public bool? DentalCheckupDone { get; set; }

    public bool? PsychologicalCheckupDone { get; set; }

    public string? Notes { get; set; }

    public virtual Resident Resident { get; set; } = null!;
}

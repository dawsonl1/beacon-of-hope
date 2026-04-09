using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class HealthRecordRequest
{
    [Required(ErrorMessage = "ResidentId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "ResidentId must be a positive integer.")]
    public int ResidentId { get; set; }
    public DateOnly? RecordDate { get; set; }
    [Range(0, 500, ErrorMessage = "WeightKg must be between 0 and 500.")]
    public decimal? WeightKg { get; set; }
    [Range(0, 300, ErrorMessage = "HeightCm must be between 0 and 300.")]
    public decimal? HeightCm { get; set; }
    [Range(0, 100, ErrorMessage = "BMI must be between 0 and 100.")]
    public decimal? Bmi { get; set; }
    [Range(0, 5, ErrorMessage = "NutritionScore must be between 0 and 5.")]
    public decimal? NutritionScore { get; set; }
    [Range(0, 5, ErrorMessage = "SleepQualityScore must be between 0 and 5.")]
    public decimal? SleepQualityScore { get; set; }
    [Range(0, 5, ErrorMessage = "EnergyLevelScore must be between 0 and 5.")]
    public decimal? EnergyLevelScore { get; set; }
    [Range(0, 5, ErrorMessage = "GeneralHealthScore must be between 0 and 5.")]
    public decimal? GeneralHealthScore { get; set; }
    public bool? MedicalCheckupDone { get; set; }
    public bool? DentalCheckupDone { get; set; }
    public bool? PsychologicalCheckupDone { get; set; }
    public string? Notes { get; set; }
}

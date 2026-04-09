using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class InterventionPlanRequest
{
    [Required(ErrorMessage = "ResidentId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "ResidentId must be a positive integer.")]
    public int ResidentId { get; set; }
    [StringLength(100)]
    public string? PlanCategory { get; set; }
    [StringLength(2000)]
    public string? PlanDescription { get; set; }
    [StringLength(500)]
    public string? ServicesProvided { get; set; }
    public decimal? TargetValue { get; set; }
    public DateOnly? TargetDate { get; set; }
    [StringLength(50)]
    public string? Status { get; set; }
    public DateOnly? CaseConferenceDate { get; set; }
}

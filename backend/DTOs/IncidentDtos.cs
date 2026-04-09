using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class IncidentRequest
{
    [Required(ErrorMessage = "ResidentId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "ResidentId must be a positive integer.")]
    public int? ResidentId { get; set; }
    public int? SafehouseId { get; set; }
    public DateOnly? IncidentDate { get; set; }
    [Required(ErrorMessage = "IncidentType is required.")]
    [StringLength(100)]
    public string? IncidentType { get; set; }
    [Required(ErrorMessage = "Severity is required.")]
    [StringLength(50)]
    public string? Severity { get; set; }
    [StringLength(2000)]
    public string? Description { get; set; }
    [StringLength(500)]
    public string? ResponseTaken { get; set; }
    [StringLength(200)]
    public string? ReportedBy { get; set; }
    public bool? Resolved { get; set; }
    public DateOnly? ResolutionDate { get; set; }
    public bool? FollowUpRequired { get; set; }
}

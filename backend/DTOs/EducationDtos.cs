using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class EducationRecordRequest
{
    [Required(ErrorMessage = "ResidentId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "ResidentId must be a positive integer.")]
    public int ResidentId { get; set; }
    public DateOnly? RecordDate { get; set; }
    [StringLength(100)]
    public string? EducationLevel { get; set; }
    [Range(0, 100, ErrorMessage = "AttendanceRate must be between 0 and 100.")]
    public decimal? AttendanceRate { get; set; }
    [Range(0, 100, ErrorMessage = "ProgressPercent must be between 0 and 100.")]
    public decimal? ProgressPercent { get; set; }
    [StringLength(100)]
    public string? CompletionStatus { get; set; }
    public string? Notes { get; set; }
    [StringLength(200)]
    public string? SchoolName { get; set; }
    [StringLength(100)]
    public string? EnrollmentStatus { get; set; }
}

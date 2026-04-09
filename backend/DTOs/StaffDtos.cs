using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class CreateStaffTaskRequest
{
    public int? ResidentId { get; set; }
    [Required(ErrorMessage = "SafehouseId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "SafehouseId must be a positive integer.")]
    public int SafehouseId { get; set; }
    [StringLength(100)]
    public string? TaskType { get; set; }
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200)]
    public string? Title { get; set; }
    [StringLength(2000)]
    public string? Description { get; set; }
    public string? ContextJson { get; set; }
}

public class UpdateStaffTaskRequest
{
    [StringLength(50)]
    public string? Status { get; set; }
    public DateTime? SnoozeUntil { get; set; }
}

public class CreateCalendarEventRequest
{
    [Required(ErrorMessage = "SafehouseId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "SafehouseId must be a positive integer.")]
    public int SafehouseId { get; set; }
    public int? ResidentId { get; set; }
    [StringLength(100)]
    public string? EventType { get; set; }
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200)]
    public string? Title { get; set; }
    [StringLength(2000)]
    public string? Description { get; set; }
    [Required(ErrorMessage = "EventDate is required.")]
    public string EventDate { get; set; } = "";
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public string? RecurrenceRule { get; set; }
    public int? SourceTaskId { get; set; }
}

public class UpdateCalendarEventRequest
{
    [StringLength(50)]
    public string? Status { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public string? EventDate { get; set; }
    [StringLength(200)]
    public string? Title { get; set; }
    [StringLength(2000)]
    public string? Description { get; set; }
}

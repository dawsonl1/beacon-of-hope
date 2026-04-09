using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class VisitationRequest
{
    [Required(ErrorMessage = "ResidentId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "ResidentId must be a positive integer.")]
    public int ResidentId { get; set; }
    public DateOnly? VisitDate { get; set; }
    [StringLength(200)]
    public string? SocialWorker { get; set; }
    [StringLength(100)]
    public string? VisitType { get; set; }
    [StringLength(500)]
    public string? LocationVisited { get; set; }
    public string? FamilyMembersPresent { get; set; }
    public string? Purpose { get; set; }
    public string? Observations { get; set; }
    [StringLength(100)]
    public string? FamilyCooperationLevel { get; set; }
    public bool? SafetyConcernsNoted { get; set; }
    public bool? FollowUpNeeded { get; set; }
    public string? FollowUpNotes { get; set; }
    [StringLength(200)]
    public string? VisitOutcome { get; set; }
}

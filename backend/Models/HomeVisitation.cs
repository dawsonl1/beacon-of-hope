using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class HomeVisitation
{
    public int VisitationId { get; set; }

    public int ResidentId { get; set; }

    public DateOnly? VisitDate { get; set; }

    public string? SocialWorker { get; set; }

    public string? VisitType { get; set; }

    public string? LocationVisited { get; set; }

    public string? FamilyMembersPresent { get; set; }

    public string? Purpose { get; set; }

    public string? Observations { get; set; }

    public string? FamilyCooperationLevel { get; set; }

    public bool? SafetyConcernsNoted { get; set; }

    public bool? FollowUpNeeded { get; set; }

    public string? FollowUpNotes { get; set; }

    public string? VisitOutcome { get; set; }

    public virtual Resident Resident { get; set; } = null!;
}

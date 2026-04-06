using System;
using System.Collections.Generic;

namespace backend.Models;

public partial class Resident
{
    public int ResidentId { get; set; }

    public string? CaseControlNo { get; set; }

    public string? InternalCode { get; set; }

    public int? SafehouseId { get; set; }

    public string? CaseStatus { get; set; }

    public string? Sex { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string? BirthStatus { get; set; }

    public string? PlaceOfBirth { get; set; }

    public string? Religion { get; set; }

    public string? CaseCategory { get; set; }

    public bool? SubCatOrphaned { get; set; }

    public bool? SubCatTrafficked { get; set; }

    public bool? SubCatChildLabor { get; set; }

    public bool? SubCatPhysicalAbuse { get; set; }

    public bool? SubCatSexualAbuse { get; set; }

    public bool? SubCatOsaec { get; set; }

    public bool? SubCatCicl { get; set; }

    public bool? SubCatAtRisk { get; set; }

    public bool? SubCatStreetChild { get; set; }

    public bool? SubCatChildWithHiv { get; set; }

    public bool? IsPwd { get; set; }

    public string? PwdType { get; set; }

    public bool? HasSpecialNeeds { get; set; }

    public string? SpecialNeedsDiagnosis { get; set; }

    public bool? FamilyIs4ps { get; set; }

    public bool? FamilySoloParent { get; set; }

    public bool? FamilyIndigenous { get; set; }

    public bool? FamilyParentPwd { get; set; }

    public bool? FamilyInformalSettler { get; set; }

    public DateOnly? DateOfAdmission { get; set; }

    public string? AgeUponAdmission { get; set; }

    public string? PresentAge { get; set; }

    public string? LengthOfStay { get; set; }

    public string? ReferralSource { get; set; }

    public string? ReferringAgencyPerson { get; set; }

    public DateOnly? DateColbRegistered { get; set; }

    public DateOnly? DateColbObtained { get; set; }

    public string? AssignedSocialWorker { get; set; }

    public string? InitialCaseAssessment { get; set; }

    public DateOnly? DateCaseStudyPrepared { get; set; }

    public string? ReintegrationType { get; set; }

    public string? ReintegrationStatus { get; set; }

    public string? InitialRiskLevel { get; set; }

    public string? CurrentRiskLevel { get; set; }

    public DateOnly? DateEnrolled { get; set; }

    public DateOnly? DateClosed { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? NotesRestricted { get; set; }

    public virtual ICollection<EducationRecord> EducationRecords { get; set; } = new List<EducationRecord>();

    public virtual ICollection<HealthWellbeingRecord> HealthWellbeingRecords { get; set; } = new List<HealthWellbeingRecord>();

    public virtual ICollection<HomeVisitation> HomeVisitations { get; set; } = new List<HomeVisitation>();

    public virtual ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();

    public virtual ICollection<InterventionPlan> InterventionPlans { get; set; } = new List<InterventionPlan>();

    public virtual ICollection<ProcessRecording> ProcessRecordings { get; set; } = new List<ProcessRecording>();

    public virtual Safehouse? Safehouse { get; set; }
}

using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class ResidentRequest
{
    [StringLength(100)]
    public string? FirstName { get; set; }
    [StringLength(100)]
    public string? LastName { get; set; }

    [StringLength(50)]
    public string? CaseControlNo { get; set; }
    [StringLength(50)]
    public string? InternalCode { get; set; }

    [Required]
    public int? SafehouseId { get; set; }

    [StringLength(50)]
    public string? CaseStatus { get; set; }

    [StringLength(20)]
    public string? Sex { get; set; }
    public DateOnly? DateOfBirth { get; set; }

    [StringLength(50)]
    public string? BirthStatus { get; set; }
    [StringLength(200)]
    public string? PlaceOfBirth { get; set; }
    [StringLength(100)]
    public string? Religion { get; set; }

    [Required, StringLength(100)]
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
    [StringLength(200)]
    public string? PwdType { get; set; }
    public bool? HasSpecialNeeds { get; set; }
    [StringLength(500)]
    public string? SpecialNeedsDiagnosis { get; set; }
    public bool? FamilyIs4ps { get; set; }
    public bool? FamilySoloParent { get; set; }
    public bool? FamilyIndigenous { get; set; }
    public bool? FamilyParentPwd { get; set; }
    public bool? FamilyInformalSettler { get; set; }
    public DateOnly? DateOfAdmission { get; set; }
    [StringLength(20)]
    public string? AgeUponAdmission { get; set; }
    [StringLength(20)]
    public string? PresentAge { get; set; }
    [StringLength(50)]
    public string? LengthOfStay { get; set; }
    [StringLength(200)]
    public string? ReferralSource { get; set; }
    [StringLength(200)]
    public string? ReferringAgencyPerson { get; set; }
    public DateOnly? DateColbRegistered { get; set; }
    public DateOnly? DateColbObtained { get; set; }

    [Required, StringLength(200)]
    public string? AssignedSocialWorker { get; set; }

    [StringLength(2000)]
    public string? InitialCaseAssessment { get; set; }
    public DateOnly? DateCaseStudyPrepared { get; set; }

    [StringLength(100)]
    public string? ReintegrationType { get; set; }
    [StringLength(50)]
    public string? ReintegrationStatus { get; set; }
    [StringLength(50)]
    public string? InitialRiskLevel { get; set; }

    [Required, StringLength(50)]
    public string? CurrentRiskLevel { get; set; }

    public DateOnly? DateEnrolled { get; set; }
    public DateOnly? DateClosed { get; set; }
    [StringLength(4000)]
    public string? NotesRestricted { get; set; }
}

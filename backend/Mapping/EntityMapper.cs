using backend.DTOs;
using backend.Models;

namespace backend.Mapping;

public static class EntityMapper
{
    public static void MapResident(Resident entity, ResidentRequest body)
    {
        entity.FirstName = body.FirstName;
        entity.LastName = body.LastName;
        entity.CaseControlNo = body.CaseControlNo;
        entity.InternalCode = body.InternalCode;
        entity.SafehouseId = body.SafehouseId;
        entity.CaseStatus = body.CaseStatus;
        entity.Sex = body.Sex;
        entity.DateOfBirth = body.DateOfBirth;
        entity.BirthStatus = body.BirthStatus;
        entity.PlaceOfBirth = body.PlaceOfBirth;
        entity.Religion = body.Religion;
        entity.CaseCategory = body.CaseCategory;
        entity.SubCatOrphaned = body.SubCatOrphaned;
        entity.SubCatTrafficked = body.SubCatTrafficked;
        entity.SubCatChildLabor = body.SubCatChildLabor;
        entity.SubCatPhysicalAbuse = body.SubCatPhysicalAbuse;
        entity.SubCatSexualAbuse = body.SubCatSexualAbuse;
        entity.SubCatOsaec = body.SubCatOsaec;
        entity.SubCatCicl = body.SubCatCicl;
        entity.SubCatAtRisk = body.SubCatAtRisk;
        entity.SubCatStreetChild = body.SubCatStreetChild;
        entity.SubCatChildWithHiv = body.SubCatChildWithHiv;
        entity.IsPwd = body.IsPwd;
        entity.PwdType = body.PwdType;
        entity.HasSpecialNeeds = body.HasSpecialNeeds;
        entity.SpecialNeedsDiagnosis = body.SpecialNeedsDiagnosis;
        entity.FamilyIs4ps = body.FamilyIs4ps;
        entity.FamilySoloParent = body.FamilySoloParent;
        entity.FamilyIndigenous = body.FamilyIndigenous;
        entity.FamilyParentPwd = body.FamilyParentPwd;
        entity.FamilyInformalSettler = body.FamilyInformalSettler;
        entity.DateOfAdmission = body.DateOfAdmission;
        entity.AgeUponAdmission = body.AgeUponAdmission;
        entity.PresentAge = body.PresentAge;
        entity.LengthOfStay = body.LengthOfStay;
        entity.ReferralSource = body.ReferralSource;
        entity.ReferringAgencyPerson = body.ReferringAgencyPerson;
        entity.DateColbRegistered = body.DateColbRegistered;
        entity.DateColbObtained = body.DateColbObtained;
        entity.AssignedSocialWorker = body.AssignedSocialWorker;
        entity.InitialCaseAssessment = body.InitialCaseAssessment;
        entity.DateCaseStudyPrepared = body.DateCaseStudyPrepared;
        entity.ReintegrationType = body.ReintegrationType;
        entity.ReintegrationStatus = body.ReintegrationStatus;
        entity.InitialRiskLevel = body.InitialRiskLevel;
        entity.CurrentRiskLevel = body.CurrentRiskLevel;
        entity.DateEnrolled = body.DateEnrolled;
        entity.DateClosed = body.DateClosed;
        entity.NotesRestricted = body.NotesRestricted;
    }

    public static void MapRecording(ProcessRecording entity, RecordingRequest body)
    {
        entity.ResidentId = body.ResidentId;
        entity.SessionDate = body.SessionDate;
        entity.SocialWorker = body.SocialWorker;
        entity.SessionType = body.SessionType;
        entity.SessionDurationMinutes = body.SessionDurationMinutes;
        entity.EmotionalStateObserved = body.EmotionalStateObserved;
        entity.EmotionalStateEnd = body.EmotionalStateEnd;
        entity.SessionNarrative = body.SessionNarrative;
        entity.InterventionsApplied = body.InterventionsApplied;
        entity.FollowUpActions = body.FollowUpActions;
        entity.ProgressNoted = body.ProgressNoted;
        entity.ConcernsFlagged = body.ConcernsFlagged;
        entity.ReferralMade = body.ReferralMade;
        entity.NotesRestricted = body.NotesRestricted;
        entity.NeedsCaseConference = body.NeedsCaseConference;
        entity.ReadyForReintegration = body.ReadyForReintegration;
        entity.SourceCalendarEventId = body.SourceCalendarEventId;
    }

    public static void MapSupporter(backend.Models.Supporter entity, SupporterRequest body)
    {
        entity.SupporterType = body.SupporterType;
        entity.DisplayName = body.DisplayName;
        entity.OrganizationName = body.OrganizationName;
        entity.FirstName = body.FirstName;
        entity.LastName = body.LastName;
        entity.RelationshipType = body.RelationshipType;
        entity.Email = body.Email;
        entity.Phone = body.Phone;
        entity.Region = body.Region;
        entity.Country = body.Country;
        entity.Status = body.Status;
        entity.AcquisitionChannel = body.AcquisitionChannel;
    }

    public static void MapDonation(backend.Models.Donation entity, DonationRequest body)
    {
        entity.SupporterId = body.SupporterId;
        entity.DonationType = body.DonationType;
        entity.DonationDate = body.DonationDate;
        entity.ChannelSource = body.ChannelSource;
        entity.CurrencyCode = body.CurrencyCode;
        entity.Amount = body.Amount;
        entity.EstimatedValue = body.EstimatedValue;
        entity.ImpactUnit = body.ImpactUnit;
        entity.IsRecurring = body.IsRecurring;
        entity.CampaignName = body.CampaignName;
        entity.Notes = body.Notes;
    }

    public static void MapVisitation(HomeVisitation entity, HomeVisitation body)
    {
        entity.ResidentId = body.ResidentId;
        entity.VisitDate = body.VisitDate;
        entity.SocialWorker = body.SocialWorker;
        entity.VisitType = body.VisitType;
        entity.LocationVisited = body.LocationVisited;
        entity.FamilyMembersPresent = body.FamilyMembersPresent;
        entity.Purpose = body.Purpose;
        entity.Observations = body.Observations;
        entity.FamilyCooperationLevel = body.FamilyCooperationLevel;
        entity.SafetyConcernsNoted = body.SafetyConcernsNoted;
        entity.FollowUpNeeded = body.FollowUpNeeded;
        entity.FollowUpNotes = body.FollowUpNotes;
        entity.VisitOutcome = body.VisitOutcome;
    }
}

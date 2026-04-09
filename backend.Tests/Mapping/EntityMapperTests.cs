using backend.DTOs;
using backend.Mapping;
using backend.Models;
using FluentAssertions;

namespace backend.Tests.Mapping;

public class EntityMapperTests
{
    [Fact]
    public void MapResident_AllFieldsCopied()
    {
        var entity = new Resident();
        var body = new ResidentRequest
        {
            CaseControlNo = "CC-001",
            InternalCode = "INT-001",
            SafehouseId = 1,
            CaseStatus = "Active",
            Sex = "F",
            DateOfBirth = new DateOnly(2010, 5, 15),
            BirthStatus = "Legitimate",
            PlaceOfBirth = "Manila",
            Religion = "Catholic",
            CaseCategory = "Neglected",
            SubCatOrphaned = true,
            SubCatTrafficked = false,
            SubCatChildLabor = false,
            SubCatPhysicalAbuse = true,
            SubCatSexualAbuse = false,
            SubCatOsaec = false,
            SubCatCicl = false,
            SubCatAtRisk = true,
            SubCatStreetChild = false,
            SubCatChildWithHiv = false,
            IsPwd = false,
            PwdType = null,
            HasSpecialNeeds = true,
            SpecialNeedsDiagnosis = "ADHD",
            FamilyIs4ps = true,
            FamilySoloParent = false,
            FamilyIndigenous = false,
            FamilyParentPwd = false,
            FamilyInformalSettler = true,
            DateOfAdmission = new DateOnly(2023, 1, 10),
            AgeUponAdmission = "12",
            PresentAge = "13",
            LengthOfStay = "365",
            ReferralSource = "DSWD",
            ReferringAgencyPerson = "Juan Dela Cruz",
            DateColbRegistered = new DateOnly(2023, 2, 1),
            DateColbObtained = new DateOnly(2023, 3, 1),
            AssignedSocialWorker = "Elena Reyes",
            InitialCaseAssessment = "Assessment text",
            DateCaseStudyPrepared = new DateOnly(2023, 4, 1),
            ReintegrationType = "Family",
            ReintegrationStatus = "In Progress",
            InitialRiskLevel = "High",
            CurrentRiskLevel = "Medium",
            DateEnrolled = new DateOnly(2023, 1, 15),
            DateClosed = null,
            NotesRestricted = "Restricted notes"
        };

        EntityMapper.MapResident(entity, body);

        entity.CaseControlNo.Should().Be("CC-001");
        entity.InternalCode.Should().Be("INT-001");
        entity.SafehouseId.Should().Be(1);
        entity.CaseStatus.Should().Be("Active");
        entity.Sex.Should().Be("F");
        entity.DateOfBirth.Should().Be(new DateOnly(2010, 5, 15));
        entity.CaseCategory.Should().Be("Neglected");
        entity.SubCatOrphaned.Should().BeTrue();
        entity.SubCatPhysicalAbuse.Should().BeTrue();
        entity.HasSpecialNeeds.Should().BeTrue();
        entity.SpecialNeedsDiagnosis.Should().Be("ADHD");
        entity.FamilyIs4ps.Should().BeTrue();
        entity.FamilyInformalSettler.Should().BeTrue();
        entity.AssignedSocialWorker.Should().Be("Elena Reyes");
        entity.ReintegrationType.Should().Be("Family");
        entity.CurrentRiskLevel.Should().Be("Medium");
        entity.NotesRestricted.Should().Be("Restricted notes");
    }

    [Fact]
    public void MapRecording_AllFieldsCopied()
    {
        var entity = new ProcessRecording();
        var body = new RecordingRequest
        {
            ResidentId = 42,
            SessionDate = new DateOnly(2024, 6, 15),
            SocialWorker = "Worker A",
            SessionType = "Individual",
            SessionDurationMinutes = 45,
            EmotionalStateObserved = "Anxious",
            EmotionalStateEnd = "Calm",
            SessionNarrative = "Detailed narrative",
            InterventionsApplied = "CBT",
            FollowUpActions = "Schedule next session",
            ProgressNoted = true,
            ConcernsFlagged = false,
            ReferralMade = true,
            NotesRestricted = "Restricted"
        };

        EntityMapper.MapRecording(entity, body);

        entity.ResidentId.Should().Be(42);
        entity.SessionDate.Should().Be(new DateOnly(2024, 6, 15));
        entity.SocialWorker.Should().Be("Worker A");
        entity.SessionType.Should().Be("Individual");
        entity.SessionDurationMinutes.Should().Be(45);
        entity.EmotionalStateObserved.Should().Be("Anxious");
        entity.EmotionalStateEnd.Should().Be("Calm");
        entity.SessionNarrative.Should().Be("Detailed narrative");
        entity.InterventionsApplied.Should().Be("CBT");
        entity.FollowUpActions.Should().Be("Schedule next session");
        entity.ProgressNoted.Should().BeTrue();
        entity.ConcernsFlagged.Should().BeFalse();
        entity.ReferralMade.Should().BeTrue();
        entity.NotesRestricted.Should().Be("Restricted");
    }

    [Fact]
    public void MapSupporter_AllFieldsCopied()
    {
        var entity = new backend.Models.Supporter();
        var body = new SupporterRequest
        {
            SupporterType = "Individual",
            DisplayName = "Maria Chen",
            OrganizationName = null,
            FirstName = "Maria",
            LastName = "Chen",
            RelationshipType = "Donor",
            Email = "maria@example.com",
            Phone = "+639171234567",
            Region = "NCR",
            Country = "PH",
            Status = "Active",
            AcquisitionChannel = "Website"
        };

        EntityMapper.MapSupporter(entity, body);

        entity.SupporterType.Should().Be("Individual");
        entity.DisplayName.Should().Be("Maria Chen");
        entity.FirstName.Should().Be("Maria");
        entity.LastName.Should().Be("Chen");
        entity.Email.Should().Be("maria@example.com");
        entity.Phone.Should().Be("+639171234567");
        entity.Region.Should().Be("NCR");
        entity.Country.Should().Be("PH");
        entity.Status.Should().Be("Active");
        entity.AcquisitionChannel.Should().Be("Website");
    }

    [Fact]
    public void MapDonation_AllFieldsCopied()
    {
        var entity = new backend.Models.Donation();
        var body = new DonationRequest
        {
            SupporterId = 10,
            DonationType = "Monetary",
            DonationDate = new DateOnly(2024, 6, 15),
            ChannelSource = "Online",
            CurrencyCode = "PHP",
            Amount = 5000m,
            EstimatedValue = null,
            ImpactUnit = "meals",
            IsRecurring = true,
            CampaignName = "Summer Drive",
            Notes = "Monthly recurring"
        };

        EntityMapper.MapDonation(entity, body);

        entity.SupporterId.Should().Be(10);
        entity.DonationType.Should().Be("Monetary");
        entity.DonationDate.Should().Be(new DateOnly(2024, 6, 15));
        entity.ChannelSource.Should().Be("Online");
        entity.CurrencyCode.Should().Be("PHP");
        entity.Amount.Should().Be(5000m);
        entity.IsRecurring.Should().BeTrue();
        entity.CampaignName.Should().Be("Summer Drive");
        entity.Notes.Should().Be("Monthly recurring");
    }

    [Fact]
    public void MapVisitation_AllFieldsCopied()
    {
        var entity = new HomeVisitation();
        var body = new HomeVisitation
        {
            ResidentId = 5,
            VisitDate = new DateOnly(2024, 7, 10),
            SocialWorker = "Worker B",
            VisitType = "Home Visit",
            LocationVisited = "Quezon City",
            FamilyMembersPresent = "Mother, Father",
            Purpose = "Follow-up check",
            Observations = "Family is cooperative",
            FamilyCooperationLevel = "High",
            SafetyConcernsNoted = false,
            FollowUpNeeded = true,
            FollowUpNotes = "Schedule monthly visit",
            VisitOutcome = "Positive"
        };

        EntityMapper.MapVisitation(entity, body);

        entity.ResidentId.Should().Be(5);
        entity.VisitDate.Should().Be(new DateOnly(2024, 7, 10));
        entity.SocialWorker.Should().Be("Worker B");
        entity.VisitType.Should().Be("Home Visit");
        entity.LocationVisited.Should().Be("Quezon City");
        entity.FamilyMembersPresent.Should().Be("Mother, Father");
        entity.Purpose.Should().Be("Follow-up check");
        entity.Observations.Should().Be("Family is cooperative");
        entity.FamilyCooperationLevel.Should().Be("High");
        entity.SafetyConcernsNoted.Should().BeFalse();
        entity.FollowUpNeeded.Should().BeTrue();
        entity.FollowUpNotes.Should().Be("Schedule monthly visit");
        entity.VisitOutcome.Should().Be("Positive");
    }
}

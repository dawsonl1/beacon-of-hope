using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Models.SocialMedia;

namespace backend.Data;

public partial class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Donation> Donations { get; set; }

    public virtual DbSet<DonationAllocation> DonationAllocations { get; set; }

    public virtual DbSet<EducationRecord> EducationRecords { get; set; }

    public virtual DbSet<HealthWellbeingRecord> HealthWellbeingRecords { get; set; }

    public virtual DbSet<HomeVisitation> HomeVisitations { get; set; }

    public virtual DbSet<InKindDonationItem> InKindDonationItems { get; set; }

    public virtual DbSet<IncidentReport> IncidentReports { get; set; }

    public virtual DbSet<InterventionPlan> InterventionPlans { get; set; }

    public virtual DbSet<Partner> Partners { get; set; }

    public virtual DbSet<PartnerAssignment> PartnerAssignments { get; set; }

    public virtual DbSet<ProcessRecording> ProcessRecordings { get; set; }

    public virtual DbSet<PublicImpactSnapshot> PublicImpactSnapshots { get; set; }

    public virtual DbSet<Resident> Residents { get; set; }

    public virtual DbSet<Safehouse> Safehouses { get; set; }

    public virtual DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics { get; set; }

    public virtual DbSet<SocialMediaPost> SocialMediaPosts { get; set; }

    public virtual DbSet<Supporter> Supporters { get; set; }

    public virtual DbSet<MlPrediction> MlPredictions { get; set; }

    public virtual DbSet<MlPredictionHistory> MlPredictionHistory { get; set; }

    public virtual DbSet<UserSafehouse> UserSafehouses { get; set; }
    public virtual DbSet<StaffTask> StaffTasks { get; set; }
    public virtual DbSet<CalendarEvent> CalendarEvents { get; set; }
    public virtual DbSet<CaseConference> CaseConferences { get; set; }
    public virtual DbSet<CaseConferenceResident> CaseConferenceResidents { get; set; }

    // Social Media Automation
    public virtual DbSet<AwarenessDate> AwarenessDates { get; set; }
    public virtual DbSet<CtaConfig> CtaConfigs { get; set; }
    public virtual DbSet<GraphicTemplate> GraphicTemplates { get; set; }
    public virtual DbSet<MediaLibraryItem> MediaLibraryItems { get; set; }
    public virtual DbSet<ContentFact> ContentFacts { get; set; }
    public virtual DbSet<ContentFactCandidate> ContentFactCandidates { get; set; }
    public virtual DbSet<ContentTalkingPoint> ContentTalkingPoints { get; set; }
    public virtual DbSet<VoiceGuide> VoiceGuides { get; set; }
    public virtual DbSet<HashtagSet> HashtagSets { get; set; }
    public virtual DbSet<SocialMediaSettings> SocialMediaSettings { get; set; }
    public virtual DbSet<GeneratedGraphic> GeneratedGraphics { get; set; }
    public virtual DbSet<MilestoneRule> MilestoneRules { get; set; }
    public virtual DbSet<AutomatedPost> AutomatedPosts { get; set; }

    // Newsletter
    public virtual DbSet<Newsletter> Newsletters { get; set; }
    public virtual DbSet<NewsletterSubscriber> NewsletterSubscribers { get; set; }

    // Donor Outreach
    public virtual DbSet<DonorOutreach> DonorOutreaches { get; set; }

    // App Settings
    public virtual DbSet<AppSetting> AppSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MlPrediction>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ml_predictions_pkey");

            entity.ToTable("ml_predictions");

            entity.HasIndex(e => new { e.EntityType, e.EntityId, e.ModelName })
                .IsUnique()
                .HasDatabaseName("ml_predictions_entity_type_entity_id_model_name_key");

            entity.HasIndex(e => new { e.EntityType, e.EntityId })
                .HasDatabaseName("idx_ml_predictions_entity");

            entity.HasIndex(e => new { e.ModelName, e.Score })
                .IsDescending(false, true)
                .HasDatabaseName("idx_ml_predictions_model_score");

            entity.HasIndex(e => new { e.ModelName, e.ScoreLabel })
                .HasDatabaseName("idx_ml_predictions_label");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EntityType).HasColumnName("entity_type");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.ModelName).HasColumnName("model_name");
            entity.Property(e => e.ModelVersion).HasColumnName("model_version");
            entity.Property(e => e.Score).HasColumnName("score").HasColumnType("numeric(6,2)");
            entity.Property(e => e.ScoreLabel).HasColumnName("score_label");
            entity.Property(e => e.PredictedAt).HasColumnName("predicted_at").HasDefaultValueSql("now()");
            entity.Property(e => e.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
        });

        modelBuilder.Entity<MlPredictionHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("ml_prediction_history_pkey");

            entity.ToTable("ml_prediction_history");

            entity.HasIndex(e => new { e.EntityType, e.EntityId, e.ModelName, e.PredictedAt })
                .IsDescending(false, false, false, true)
                .HasDatabaseName("idx_ml_history_entity_model");

            entity.HasIndex(e => new { e.ModelName, e.PredictedAt })
                .IsDescending(false, true)
                .HasDatabaseName("idx_ml_history_model");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EntityType).HasColumnName("entity_type");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.ModelName).HasColumnName("model_name");
            entity.Property(e => e.ModelVersion).HasColumnName("model_version");
            entity.Property(e => e.Score).HasColumnName("score").HasColumnType("numeric(6,2)");
            entity.Property(e => e.ScoreLabel).HasColumnName("score_label");
            entity.Property(e => e.PredictedAt).HasColumnName("predicted_at").HasDefaultValueSql("now()");
            entity.Property(e => e.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
        });

        modelBuilder.Entity<Donation>(entity =>
        {
            entity.HasKey(e => e.DonationId).HasName("donations_pkey");

            entity.ToTable("donations");

            entity.HasIndex(e => e.ReferralPostId, "donations_referral_post_id_idx");

            entity.HasIndex(e => e.SupporterId, "donations_supporter_id_idx");

            entity.HasIndex(e => new { e.SupporterId, e.DonationType, e.DonationDate })
                .HasDatabaseName("donations_supporter_type_date_idx");

            entity.HasIndex(e => e.CampaignName)
                .HasDatabaseName("donations_campaign_name_idx");

            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("numeric(12,2)");
            entity.Property(e => e.CampaignName).HasColumnName("campaign_name");
            entity.Property(e => e.ChannelSource).HasColumnName("channel_source");
            entity.Property(e => e.CurrencyCode).HasColumnName("currency_code");
            entity.Property(e => e.DonationDate).HasColumnName("donation_date");
            entity.Property(e => e.DonationType).HasColumnName("donation_type");
            entity.Property(e => e.EstimatedValue).HasColumnName("estimated_value").HasColumnType("numeric(12,2)");
            entity.Property(e => e.ImpactUnit).HasColumnName("impact_unit");
            entity.Property(e => e.IsRecurring).HasColumnName("is_recurring");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.ReferralPostId).HasColumnName("referral_post_id");
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id");

            entity.HasOne(d => d.ReferralPost).WithMany(p => p.Donations)
                .HasForeignKey(d => d.ReferralPostId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("donations_referral_post_id_fkey");

            entity.HasOne(d => d.Supporter).WithMany(p => p.Donations)
                .HasForeignKey(d => d.SupporterId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("donations_supporter_id_fkey");
        });

        modelBuilder.Entity<DonationAllocation>(entity =>
        {
            entity.HasKey(e => e.AllocationId).HasName("donation_allocations_pkey");

            entity.ToTable("donation_allocations");

            entity.HasIndex(e => e.DonationId, "donation_allocations_donation_id_idx");

            entity.HasIndex(e => e.SafehouseId, "donation_allocations_safehouse_id_idx");

            entity.Property(e => e.AllocationId).HasColumnName("allocation_id");
            entity.Property(e => e.AllocationDate).HasColumnName("allocation_date");
            entity.Property(e => e.AllocationNotes).HasColumnName("allocation_notes");
            entity.Property(e => e.AmountAllocated).HasColumnName("amount_allocated").HasColumnType("numeric(12,2)");
            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.ProgramArea).HasColumnName("program_area");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");

            entity.HasOne(d => d.Donation).WithMany(p => p.DonationAllocations)
                .HasForeignKey(d => d.DonationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("donation_allocations_donation_id_fkey");

            entity.HasOne(d => d.Safehouse).WithMany(p => p.DonationAllocations)
                .HasForeignKey(d => d.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("donation_allocations_safehouse_id_fkey");
        });

        modelBuilder.Entity<EducationRecord>(entity =>
        {
            entity.HasKey(e => e.EducationRecordId).HasName("education_records_pkey");

            entity.ToTable("education_records");

            entity.HasIndex(e => e.ResidentId, "education_records_resident_id_idx");

            entity.Property(e => e.EducationRecordId).HasColumnName("education_record_id");
            entity.Property(e => e.AttendanceRate).HasColumnName("attendance_rate");
            entity.Property(e => e.CompletionStatus).HasColumnName("completion_status");
            entity.Property(e => e.EducationLevel).HasColumnName("education_level");
            entity.Property(e => e.EnrollmentStatus).HasColumnName("enrollment_status");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.ProgressPercent).HasColumnName("progress_percent");
            entity.Property(e => e.RecordDate).HasColumnName("record_date");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.SchoolName).HasColumnName("school_name");

            entity.HasOne(d => d.Resident).WithMany(p => p.EducationRecords)
                .HasForeignKey(d => d.ResidentId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("education_records_resident_id_fkey");
        });

        modelBuilder.Entity<HealthWellbeingRecord>(entity =>
        {
            entity.HasKey(e => e.HealthRecordId).HasName("health_wellbeing_records_pkey");

            entity.ToTable("health_wellbeing_records");

            entity.HasIndex(e => e.ResidentId, "health_wellbeing_records_resident_id_idx");

            entity.Property(e => e.HealthRecordId).HasColumnName("health_record_id");
            entity.Property(e => e.Bmi).HasColumnName("bmi");
            entity.Property(e => e.DentalCheckupDone).HasColumnName("dental_checkup_done");
            entity.Property(e => e.EnergyLevelScore).HasColumnName("energy_level_score");
            entity.Property(e => e.GeneralHealthScore).HasColumnName("general_health_score");
            entity.Property(e => e.HeightCm).HasColumnName("height_cm");
            entity.Property(e => e.MedicalCheckupDone).HasColumnName("medical_checkup_done");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.NutritionScore).HasColumnName("nutrition_score");
            entity.Property(e => e.PsychologicalCheckupDone).HasColumnName("psychological_checkup_done");
            entity.Property(e => e.RecordDate).HasColumnName("record_date");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.SleepQualityScore).HasColumnName("sleep_quality_score");
            entity.Property(e => e.WeightKg).HasColumnName("weight_kg");

            entity.HasOne(d => d.Resident).WithMany(p => p.HealthWellbeingRecords)
                .HasForeignKey(d => d.ResidentId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("health_wellbeing_records_resident_id_fkey");
        });

        modelBuilder.Entity<HomeVisitation>(entity =>
        {
            entity.HasKey(e => e.VisitationId).HasName("home_visitations_pkey");

            entity.ToTable("home_visitations");

            entity.HasIndex(e => e.ResidentId, "home_visitations_resident_id_idx");

            entity.Property(e => e.VisitationId).HasColumnName("visitation_id");
            entity.Property(e => e.FamilyCooperationLevel).HasColumnName("family_cooperation_level");
            entity.Property(e => e.FamilyMembersPresent).HasColumnName("family_members_present");
            entity.Property(e => e.FollowUpNeeded).HasColumnName("follow_up_needed");
            entity.Property(e => e.FollowUpNotes).HasColumnName("follow_up_notes");
            entity.Property(e => e.LocationVisited).HasColumnName("location_visited");
            entity.Property(e => e.Observations).HasColumnName("observations");
            entity.Property(e => e.Purpose).HasColumnName("purpose");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.SafetyConcernsNoted).HasColumnName("safety_concerns_noted");
            entity.Property(e => e.SocialWorker).HasColumnName("social_worker");
            entity.Property(e => e.VisitDate).HasColumnName("visit_date");
            entity.Property(e => e.VisitOutcome).HasColumnName("visit_outcome");
            entity.Property(e => e.VisitType).HasColumnName("visit_type");

            entity.HasOne(d => d.Resident).WithMany(p => p.HomeVisitations)
                .HasForeignKey(d => d.ResidentId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("home_visitations_resident_id_fkey");
        });

        modelBuilder.Entity<InKindDonationItem>(entity =>
        {
            entity.HasKey(e => e.ItemId).HasName("in_kind_donation_items_pkey");

            entity.ToTable("in_kind_donation_items");

            entity.HasIndex(e => e.DonationId, "in_kind_donation_items_donation_id_idx");

            entity.Property(e => e.ItemId).HasColumnName("item_id");
            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.EstimatedUnitValue).HasColumnName("estimated_unit_value").HasColumnType("numeric(12,2)");
            entity.Property(e => e.IntendedUse).HasColumnName("intended_use");
            entity.Property(e => e.ItemCategory).HasColumnName("item_category");
            entity.Property(e => e.ItemName).HasColumnName("item_name");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.ReceivedCondition).HasColumnName("received_condition");
            entity.Property(e => e.UnitOfMeasure).HasColumnName("unit_of_measure");

            entity.HasOne(d => d.Donation).WithMany(p => p.InKindDonationItems)
                .HasForeignKey(d => d.DonationId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("in_kind_donation_items_donation_id_fkey");
        });

        modelBuilder.Entity<IncidentReport>(entity =>
        {
            entity.HasKey(e => e.IncidentId).HasName("incident_reports_pkey");

            entity.ToTable("incident_reports");

            entity.HasIndex(e => e.ResidentId, "incident_reports_resident_id_idx");

            entity.HasIndex(e => e.SafehouseId, "incident_reports_safehouse_id_idx");

            entity.Property(e => e.IncidentId).HasColumnName("incident_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.FollowUpRequired).HasColumnName("follow_up_required");
            entity.Property(e => e.IncidentDate).HasColumnName("incident_date");
            entity.Property(e => e.IncidentType).HasColumnName("incident_type");
            entity.Property(e => e.ReportedBy).HasColumnName("reported_by");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.ResolutionDate).HasColumnName("resolution_date");
            entity.Property(e => e.Resolved).HasColumnName("resolved");
            entity.Property(e => e.ResponseTaken).HasColumnName("response_taken");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.Severity).HasColumnName("severity");

            entity.HasOne(d => d.Resident).WithMany(p => p.IncidentReports)
                .HasForeignKey(d => d.ResidentId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("incident_reports_resident_id_fkey");

            entity.HasOne(d => d.Safehouse).WithMany(p => p.IncidentReports)
                .HasForeignKey(d => d.SafehouseId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("incident_reports_safehouse_id_fkey");
        });

        modelBuilder.Entity<InterventionPlan>(entity =>
        {
            entity.HasKey(e => e.PlanId).HasName("intervention_plans_pkey");

            entity.ToTable("intervention_plans");

            entity.HasIndex(e => e.ResidentId, "intervention_plans_resident_id_idx");

            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.CaseConferenceDate).HasColumnName("case_conference_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.PlanCategory).HasColumnName("plan_category");
            entity.Property(e => e.PlanDescription).HasColumnName("plan_description");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.ServicesProvided).HasColumnName("services_provided");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.TargetDate).HasColumnName("target_date");
            entity.Property(e => e.TargetValue).HasColumnName("target_value");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(d => d.Resident).WithMany(p => p.InterventionPlans)
                .HasForeignKey(d => d.ResidentId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("intervention_plans_resident_id_fkey");
        });

        modelBuilder.Entity<Partner>(entity =>
        {
            entity.HasKey(e => e.PartnerId).HasName("partners_pkey");

            entity.ToTable("partners");

            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.ContactName).HasColumnName("contact_name");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.PartnerName).HasColumnName("partner_name");
            entity.Property(e => e.PartnerType).HasColumnName("partner_type");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.RoleType).HasColumnName("role_type");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.Status).HasColumnName("status");
        });

        modelBuilder.Entity<PartnerAssignment>(entity =>
        {
            entity.HasKey(e => e.AssignmentId).HasName("partner_assignments_pkey");

            entity.ToTable("partner_assignments");

            entity.HasIndex(e => e.PartnerId, "partner_assignments_partner_id_idx");

            entity.HasIndex(e => e.SafehouseId, "partner_assignments_safehouse_id_idx");

            entity.Property(e => e.AssignmentId).HasColumnName("assignment_id");
            entity.Property(e => e.AssignmentEnd).HasColumnName("assignment_end");
            entity.Property(e => e.AssignmentStart).HasColumnName("assignment_start");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.ProgramArea).HasColumnName("program_area");
            entity.Property(e => e.ResponsibilityNotes).HasColumnName("responsibility_notes");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.Status).HasColumnName("status");

            entity.HasOne(d => d.Partner).WithMany(p => p.PartnerAssignments)
                .HasForeignKey(d => d.PartnerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("partner_assignments_partner_id_fkey");

            entity.HasOne(d => d.Safehouse).WithMany(p => p.PartnerAssignments)
                .HasForeignKey(d => d.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("partner_assignments_safehouse_id_fkey");
        });

        modelBuilder.Entity<ProcessRecording>(entity =>
        {
            entity.HasKey(e => e.RecordingId).HasName("process_recordings_pkey");

            entity.ToTable("process_recordings");

            entity.HasIndex(e => e.ResidentId, "process_recordings_resident_id_idx");

            entity.Property(e => e.RecordingId).HasColumnName("recording_id");
            entity.Property(e => e.ConcernsFlagged).HasColumnName("concerns_flagged");
            entity.Property(e => e.EmotionalStateEnd).HasColumnName("emotional_state_end");
            entity.Property(e => e.EmotionalStateObserved).HasColumnName("emotional_state_observed");
            entity.Property(e => e.FollowUpActions).HasColumnName("follow_up_actions");
            entity.Property(e => e.InterventionsApplied).HasColumnName("interventions_applied");
            entity.Property(e => e.NotesRestricted).HasColumnName("notes_restricted");
            entity.Property(e => e.ProgressNoted).HasColumnName("progress_noted");
            entity.Property(e => e.ReferralMade).HasColumnName("referral_made");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.SessionDate).HasColumnName("session_date");
            entity.Property(e => e.SessionDurationMinutes).HasColumnName("session_duration_minutes");
            entity.Property(e => e.SessionNarrative).HasColumnName("session_narrative");
            entity.Property(e => e.SessionType).HasColumnName("session_type");
            entity.Property(e => e.SocialWorker).HasColumnName("social_worker");

            entity.HasOne(d => d.Resident).WithMany(p => p.ProcessRecordings)
                .HasForeignKey(d => d.ResidentId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("process_recordings_resident_id_fkey");
        });

        modelBuilder.Entity<PublicImpactSnapshot>(entity =>
        {
            entity.HasKey(e => e.SnapshotId).HasName("public_impact_snapshots_pkey");

            entity.ToTable("public_impact_snapshots");

            entity.Property(e => e.SnapshotId).HasColumnName("snapshot_id");
            entity.Property(e => e.Headline).HasColumnName("headline");
            entity.Property(e => e.IsPublished).HasColumnName("is_published");
            entity.Property(e => e.MetricPayloadJson).HasColumnName("metric_payload_json");
            entity.Property(e => e.PublishedAt).HasColumnName("published_at");
            entity.Property(e => e.SnapshotDate).HasColumnName("snapshot_date");
            entity.Property(e => e.SummaryText).HasColumnName("summary_text");
        });

        modelBuilder.Entity<Resident>(entity =>
        {
            entity.HasKey(e => e.ResidentId).HasName("residents_pkey");

            entity.ToTable("residents");

            entity.HasIndex(e => e.SafehouseId, "residents_safehouse_id_idx");

            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.AgeUponAdmission).HasColumnName("age_upon_admission");
            entity.Property(e => e.AssignedSocialWorker).HasColumnName("assigned_social_worker");
            entity.Property(e => e.BirthStatus).HasColumnName("birth_status");
            entity.Property(e => e.CaseCategory).HasColumnName("case_category");
            entity.Property(e => e.CaseControlNo).HasColumnName("case_control_no");
            entity.Property(e => e.CaseStatus).HasColumnName("case_status");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.CurrentRiskLevel).HasColumnName("current_risk_level");
            entity.Property(e => e.DateCaseStudyPrepared).HasColumnName("date_case_study_prepared");
            entity.Property(e => e.DateClosed).HasColumnName("date_closed");
            entity.Property(e => e.DateColbObtained).HasColumnName("date_colb_obtained");
            entity.Property(e => e.DateColbRegistered).HasColumnName("date_colb_registered");
            entity.Property(e => e.DateEnrolled).HasColumnName("date_enrolled");
            entity.Property(e => e.DateOfAdmission).HasColumnName("date_of_admission");
            entity.Property(e => e.DateOfBirth).HasColumnName("date_of_birth");
            entity.Property(e => e.FamilyIndigenous).HasColumnName("family_indigenous");
            entity.Property(e => e.FamilyInformalSettler).HasColumnName("family_informal_settler");
            entity.Property(e => e.FamilyIs4ps).HasColumnName("family_is_4ps");
            entity.Property(e => e.FamilyParentPwd).HasColumnName("family_parent_pwd");
            entity.Property(e => e.FamilySoloParent).HasColumnName("family_solo_parent");
            entity.Property(e => e.HasSpecialNeeds).HasColumnName("has_special_needs");
            entity.Property(e => e.InitialCaseAssessment).HasColumnName("initial_case_assessment");
            entity.Property(e => e.InitialRiskLevel).HasColumnName("initial_risk_level");
            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
            entity.Property(e => e.InternalCode).HasColumnName("internal_code");
            entity.Property(e => e.IsPwd).HasColumnName("is_pwd");
            entity.Property(e => e.LengthOfStay).HasColumnName("length_of_stay");
            entity.Property(e => e.NotesRestricted).HasColumnName("notes_restricted");
            entity.Property(e => e.PlaceOfBirth).HasColumnName("place_of_birth");
            entity.Property(e => e.PresentAge).HasColumnName("present_age");
            entity.Property(e => e.PwdType).HasColumnName("pwd_type");
            entity.Property(e => e.ReferralSource).HasColumnName("referral_source");
            entity.Property(e => e.ReferringAgencyPerson).HasColumnName("referring_agency_person");
            entity.Property(e => e.ReintegrationStatus).HasColumnName("reintegration_status");
            entity.Property(e => e.ReintegrationType).HasColumnName("reintegration_type");
            entity.Property(e => e.Religion).HasColumnName("religion");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.Sex).HasColumnName("sex");
            entity.Property(e => e.SpecialNeedsDiagnosis).HasColumnName("special_needs_diagnosis");
            entity.Property(e => e.SubCatAtRisk).HasColumnName("sub_cat_at_risk");
            entity.Property(e => e.SubCatChildLabor).HasColumnName("sub_cat_child_labor");
            entity.Property(e => e.SubCatChildWithHiv).HasColumnName("sub_cat_child_with_hiv");
            entity.Property(e => e.SubCatCicl).HasColumnName("sub_cat_cicl");
            entity.Property(e => e.SubCatOrphaned).HasColumnName("sub_cat_orphaned");
            entity.Property(e => e.SubCatOsaec).HasColumnName("sub_cat_osaec");
            entity.Property(e => e.SubCatPhysicalAbuse).HasColumnName("sub_cat_physical_abuse");
            entity.Property(e => e.SubCatSexualAbuse).HasColumnName("sub_cat_sexual_abuse");
            entity.Property(e => e.SubCatStreetChild).HasColumnName("sub_cat_street_child");
            entity.Property(e => e.SubCatTrafficked).HasColumnName("sub_cat_trafficked");

            entity.HasOne(d => d.Safehouse).WithMany(p => p.Residents)
                .HasForeignKey(d => d.SafehouseId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("residents_safehouse_id_fkey");
        });

        modelBuilder.Entity<Safehouse>(entity =>
        {
            entity.HasKey(e => e.SafehouseId).HasName("safehouses_pkey");

            entity.ToTable("safehouses");

            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.CapacityGirls).HasColumnName("capacity_girls");
            entity.Property(e => e.CapacityStaff).HasColumnName("capacity_staff");
            entity.Property(e => e.City).HasColumnName("city");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.CurrentOccupancy).HasColumnName("current_occupancy");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.OpenDate).HasColumnName("open_date");
            entity.Property(e => e.Province).HasColumnName("province");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.SafehouseCode).HasColumnName("safehouse_code");
            entity.Property(e => e.Status).HasColumnName("status");
        });

        modelBuilder.Entity<SafehouseMonthlyMetric>(entity =>
        {
            entity.HasKey(e => e.MetricId).HasName("safehouse_monthly_metrics_pkey");

            entity.ToTable("safehouse_monthly_metrics");

            entity.HasIndex(e => e.SafehouseId, "safehouse_monthly_metrics_safehouse_id_idx");

            entity.Property(e => e.MetricId).HasColumnName("metric_id");
            entity.Property(e => e.ActiveResidents).HasColumnName("active_residents");
            entity.Property(e => e.AvgEducationProgress).HasColumnName("avg_education_progress");
            entity.Property(e => e.AvgHealthScore).HasColumnName("avg_health_score");
            entity.Property(e => e.HomeVisitationCount).HasColumnName("home_visitation_count");
            entity.Property(e => e.IncidentCount).HasColumnName("incident_count");
            entity.Property(e => e.MonthEnd).HasColumnName("month_end");
            entity.Property(e => e.MonthStart).HasColumnName("month_start");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.ProcessRecordingCount).HasColumnName("process_recording_count");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");

            entity.HasOne(d => d.Safehouse).WithMany(p => p.SafehouseMonthlyMetrics)
                .HasForeignKey(d => d.SafehouseId)
                .HasConstraintName("safehouse_monthly_metrics_safehouse_id_fkey");
        });

        modelBuilder.Entity<SocialMediaPost>(entity =>
        {
            entity.HasKey(e => e.PostId).HasName("social_media_posts_pkey");

            entity.ToTable("social_media_posts");

            entity.HasIndex(e => new { e.CampaignName, e.CreatedAt })
                .HasDatabaseName("social_posts_campaign_created_idx");

            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.AvgViewDurationSeconds).HasColumnName("avg_view_duration_seconds");
            entity.Property(e => e.BoostBudgetPhp).HasColumnName("boost_budget_php").HasColumnType("numeric(12,2)");
            entity.Property(e => e.CallToActionType).HasColumnName("call_to_action_type");
            entity.Property(e => e.CampaignName).HasColumnName("campaign_name");
            entity.Property(e => e.Caption).HasColumnName("caption");
            entity.Property(e => e.CaptionLength).HasColumnName("caption_length");
            entity.Property(e => e.ClickThroughs).HasColumnName("click_throughs");
            entity.Property(e => e.Comments).HasColumnName("comments");
            entity.Property(e => e.ContentTopic).HasColumnName("content_topic");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.DayOfWeek).HasColumnName("day_of_week");
            entity.Property(e => e.DonationReferrals).HasColumnName("donation_referrals");
            entity.Property(e => e.EngagementRate).HasColumnName("engagement_rate");
            entity.Property(e => e.EstimatedDonationValuePhp).HasColumnName("estimated_donation_value_php").HasColumnType("numeric(12,2)");
            entity.Property(e => e.FeaturesResidentStory).HasColumnName("features_resident_story");
            entity.Property(e => e.FollowerCountAtPost).HasColumnName("follower_count_at_post");
            entity.Property(e => e.Forwards).HasColumnName("forwards");
            entity.Property(e => e.HasCallToAction).HasColumnName("has_call_to_action");
            entity.Property(e => e.Hashtags).HasColumnName("hashtags");
            entity.Property(e => e.Impressions).HasColumnName("impressions");
            entity.Property(e => e.IsBoosted).HasColumnName("is_boosted");
            entity.Property(e => e.Likes).HasColumnName("likes");
            entity.Property(e => e.MediaType).HasColumnName("media_type");
            entity.Property(e => e.MentionsCount).HasColumnName("mentions_count");
            entity.Property(e => e.NumHashtags).HasColumnName("num_hashtags");
            entity.Property(e => e.Platform).HasColumnName("platform");
            entity.Property(e => e.PlatformPostId).HasColumnName("platform_post_id");
            entity.Property(e => e.PostHour).HasColumnName("post_hour");
            entity.Property(e => e.PostType).HasColumnName("post_type");
            entity.Property(e => e.PostUrl).HasColumnName("post_url");
            entity.Property(e => e.ProfileVisits).HasColumnName("profile_visits");
            entity.Property(e => e.Reach).HasColumnName("reach");
            entity.Property(e => e.Saves).HasColumnName("saves");
            entity.Property(e => e.SentimentTone).HasColumnName("sentiment_tone");
            entity.Property(e => e.Shares).HasColumnName("shares");
            entity.Property(e => e.SubscriberCountAtPost).HasColumnName("subscriber_count_at_post");
            entity.Property(e => e.VideoViews).HasColumnName("video_views");
            entity.Property(e => e.WatchTimeSeconds).HasColumnName("watch_time_seconds");
        });

        modelBuilder.Entity<Supporter>(entity =>
        {
            entity.HasKey(e => e.SupporterId).HasName("supporters_pkey");

            entity.ToTable("supporters");

            entity.Property(e => e.SupporterId).HasColumnName("supporter_id");
            entity.Property(e => e.AcquisitionChannel).HasColumnName("acquisition_channel");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.DisplayName).HasColumnName("display_name");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.FirstDonationDate).HasColumnName("first_donation_date");
            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
            entity.Property(e => e.OrganizationName).HasColumnName("organization_name");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.RelationshipType).HasColumnName("relationship_type");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.SupporterType).HasColumnName("supporter_type");
        });

        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasOne(u => u.Supporter)
                .WithMany()
                .HasForeignKey(u => u.SupporterId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<UserSafehouse>(entity =>
        {
            entity.HasKey(e => e.UserSafehouseId).HasName("user_safehouses_pkey");
            entity.ToTable("user_safehouses");
            entity.HasIndex(e => new { e.UserId, e.SafehouseId }).IsUnique().HasDatabaseName("user_safehouses_user_safehouse_idx");
            entity.Property(e => e.UserSafehouseId).HasColumnName("user_safehouse_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.HasOne(e => e.User).WithMany(u => u.UserSafehouses).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("user_safehouses_user_id_fkey");
            entity.HasOne(e => e.Safehouse).WithMany(s => s.UserSafehouses).HasForeignKey(e => e.SafehouseId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("user_safehouses_safehouse_id_fkey");
        });

        modelBuilder.Entity<StaffTask>(entity =>
        {
            entity.HasKey(e => e.StaffTaskId).HasName("staff_tasks_pkey");
            entity.ToTable("staff_tasks");
            entity.HasIndex(e => e.StaffUserId).HasDatabaseName("staff_tasks_staff_user_id_idx");
            entity.HasIndex(e => new { e.StaffUserId, e.Status }).HasDatabaseName("staff_tasks_user_status_idx");
            entity.HasIndex(e => e.SafehouseId).HasDatabaseName("staff_tasks_safehouse_id_idx");
            entity.Property(e => e.StaffTaskId).HasColumnName("staff_task_id");
            entity.Property(e => e.StaffUserId).HasColumnName("staff_user_id");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.TaskType).HasColumnName("task_type");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ContextJson).HasColumnName("context_json").HasColumnType("jsonb");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.SnoozeUntil).HasColumnName("snooze_until");
            entity.Property(e => e.DueTriggerDate).HasColumnName("due_trigger_date");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.SourceEntityType).HasColumnName("source_entity_type");
            entity.Property(e => e.SourceEntityId).HasColumnName("source_entity_id");
            entity.HasOne(e => e.StaffUser).WithMany(u => u.StaffTasks).HasForeignKey(e => e.StaffUserId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("staff_tasks_staff_user_id_fkey");
            entity.HasOne(e => e.Resident).WithMany(r => r.StaffTasks).HasForeignKey(e => e.ResidentId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("staff_tasks_resident_id_fkey");
            entity.HasOne(e => e.Safehouse).WithMany(s => s.StaffTasks).HasForeignKey(e => e.SafehouseId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("staff_tasks_safehouse_id_fkey");
        });

        modelBuilder.Entity<CalendarEvent>(entity =>
        {
            entity.HasKey(e => e.CalendarEventId).HasName("calendar_events_pkey");
            entity.ToTable("calendar_events");
            entity.HasIndex(e => e.StaffUserId).HasDatabaseName("calendar_events_staff_user_id_idx");
            entity.HasIndex(e => new { e.StaffUserId, e.EventDate }).HasDatabaseName("calendar_events_user_date_idx");
            entity.HasIndex(e => e.SafehouseId).HasDatabaseName("calendar_events_safehouse_id_idx");
            entity.Property(e => e.CalendarEventId).HasColumnName("calendar_event_id");
            entity.Property(e => e.StaffUserId).HasColumnName("staff_user_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.EventType).HasColumnName("event_type");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.EventDate).HasColumnName("event_date");
            entity.Property(e => e.StartTime).HasColumnName("start_time");
            entity.Property(e => e.EndTime).HasColumnName("end_time");
            entity.Property(e => e.RecurrenceRule).HasColumnName("recurrence_rule");
            entity.Property(e => e.SourceTaskId).HasColumnName("source_task_id");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.HasOne(e => e.StaffUser).WithMany(u => u.CalendarEvents).HasForeignKey(e => e.StaffUserId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("calendar_events_staff_user_id_fkey");
            entity.HasOne(e => e.Safehouse).WithMany(s => s.CalendarEvents).HasForeignKey(e => e.SafehouseId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("calendar_events_safehouse_id_fkey");
            entity.HasOne(e => e.Resident).WithMany(r => r.CalendarEvents).HasForeignKey(e => e.ResidentId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("calendar_events_resident_id_fkey");
            entity.HasOne(e => e.SourceTask).WithMany().HasForeignKey(e => e.SourceTaskId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("calendar_events_source_task_id_fkey");
        });

        // ── Case Conference Tables ──

        modelBuilder.Entity<CaseConference>(entity =>
        {
            entity.HasKey(e => e.ConferenceId).HasName("case_conferences_pkey");
            entity.ToTable("case_conferences");
            entity.HasIndex(e => e.SafehouseId).HasDatabaseName("case_conferences_safehouse_id_idx");
            entity.HasIndex(e => e.ScheduledDate).HasDatabaseName("case_conferences_scheduled_date_idx");
            entity.Property(e => e.ConferenceId).HasColumnName("conference_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.ScheduledDate).HasColumnName("scheduled_date");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.HasOne(e => e.Safehouse).WithMany().HasForeignKey(e => e.SafehouseId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("case_conferences_safehouse_id_fkey");
        });

        modelBuilder.Entity<CaseConferenceResident>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("case_conference_residents_pkey");
            entity.ToTable("case_conference_residents");
            entity.HasIndex(e => new { e.ConferenceId, e.ResidentId }).IsUnique().HasDatabaseName("case_conference_residents_unique");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ConferenceId).HasColumnName("conference_id");
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.Source).HasColumnName("source");
            entity.Property(e => e.Discussed).HasColumnName("discussed");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.AddedAt).HasColumnName("added_at").HasDefaultValueSql("now()");
            entity.HasOne(e => e.Conference).WithMany(c => c.Residents).HasForeignKey(e => e.ConferenceId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("case_conference_residents_conference_id_fkey");
            entity.HasOne(e => e.Resident).WithMany().HasForeignKey(e => e.ResidentId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("case_conference_residents_resident_id_fkey");
        });

        // ── Social Media Automation Tables ──

        modelBuilder.Entity<AwarenessDate>(entity =>
        {
            entity.HasKey(e => e.AwarenessDateId).HasName("awareness_dates_pkey");
            entity.ToTable("awareness_dates");
            entity.Property(e => e.AwarenessDateId).HasColumnName("awareness_date_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.DateStart).HasColumnName("date_start");
            entity.Property(e => e.DateEnd).HasColumnName("date_end");
            entity.Property(e => e.Recurrence).HasColumnName("recurrence");
            entity.Property(e => e.PillarEmphasis).HasColumnName("pillar_emphasis");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<CtaConfig>(entity =>
        {
            entity.HasKey(e => e.CtaConfigId).HasName("cta_configs_pkey");
            entity.ToTable("cta_configs");
            entity.Property(e => e.CtaConfigId).HasColumnName("cta_config_id");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.GoalAmount).HasColumnName("goal_amount").HasColumnType("numeric(12,2)");
            entity.Property(e => e.CurrentAmount).HasColumnName("current_amount").HasColumnType("numeric(12,2)");
            entity.Property(e => e.Url).HasColumnName("url");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.Priority).HasColumnName("priority");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<GraphicTemplate>(entity =>
        {
            entity.HasKey(e => e.GraphicTemplateId).HasName("graphic_templates_pkey");
            entity.ToTable("graphic_templates");
            entity.Property(e => e.GraphicTemplateId).HasColumnName("graphic_template_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.TextColor).HasColumnName("text_color");
            entity.Property(e => e.TextPosition).HasColumnName("text_position");
            entity.Property(e => e.SuitableFor).HasColumnName("suitable_for").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<MediaLibraryItem>(entity =>
        {
            entity.HasKey(e => e.MediaLibraryItemId).HasName("media_library_pkey");
            entity.ToTable("media_library");
            entity.HasIndex(e => e.SafehouseId).HasDatabaseName("media_library_safehouse_id_idx");
            entity.HasIndex(e => e.ActivityType).HasDatabaseName("media_library_activity_type_idx");
            entity.Property(e => e.MediaLibraryItemId).HasColumnName("media_library_item_id");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.ThumbnailPath).HasColumnName("thumbnail_path");
            entity.Property(e => e.Caption).HasColumnName("caption");
            entity.Property(e => e.ActivityType).HasColumnName("activity_type");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.UploadedBy).HasColumnName("uploaded_by");
            entity.Property(e => e.ConsentConfirmed).HasColumnName("consent_confirmed");
            entity.Property(e => e.UsedCount).HasColumnName("used_count");
            entity.Property(e => e.UploadedAt).HasColumnName("uploaded_at");
            entity.HasOne(e => e.Safehouse).WithMany().HasForeignKey(e => e.SafehouseId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("media_library_safehouse_id_fkey");
        });

        modelBuilder.Entity<ContentFact>(entity =>
        {
            entity.HasKey(e => e.ContentFactId).HasName("content_facts_pkey");
            entity.ToTable("content_facts");
            entity.HasIndex(e => e.Category).HasDatabaseName("content_facts_category_idx");
            entity.HasIndex(e => e.Pillar).HasDatabaseName("content_facts_pillar_idx");
            entity.Property(e => e.ContentFactId).HasColumnName("content_fact_id");
            entity.Property(e => e.FactText).HasColumnName("fact_text");
            entity.Property(e => e.SourceName).HasColumnName("source_name");
            entity.Property(e => e.SourceUrl).HasColumnName("source_url");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.Pillar).HasColumnName("pillar");
            entity.Property(e => e.UsageCount).HasColumnName("usage_count");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.AddedBy).HasColumnName("added_by");
            entity.Property(e => e.AddedAt).HasColumnName("added_at");
        });

        modelBuilder.Entity<ContentFactCandidate>(entity =>
        {
            entity.HasKey(e => e.ContentFactCandidateId).HasName("content_fact_candidates_pkey");
            entity.ToTable("content_fact_candidates");
            entity.HasIndex(e => e.Status).HasDatabaseName("content_fact_candidates_status_idx");
            entity.Property(e => e.ContentFactCandidateId).HasColumnName("content_fact_candidate_id");
            entity.Property(e => e.FactText).HasColumnName("fact_text");
            entity.Property(e => e.SourceName).HasColumnName("source_name");
            entity.Property(e => e.SourceUrl).HasColumnName("source_url");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.SearchQuery).HasColumnName("search_query");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<ContentTalkingPoint>(entity =>
        {
            entity.HasKey(e => e.ContentTalkingPointId).HasName("content_talking_points_pkey");
            entity.ToTable("content_talking_points");
            entity.HasIndex(e => e.Topic).HasDatabaseName("content_talking_points_topic_idx");
            entity.Property(e => e.ContentTalkingPointId).HasColumnName("content_talking_point_id");
            entity.Property(e => e.Text).HasColumnName("text");
            entity.Property(e => e.Topic).HasColumnName("topic");
            entity.Property(e => e.UsageCount).HasColumnName("usage_count");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<VoiceGuide>(entity =>
        {
            entity.HasKey(e => e.VoiceGuideId).HasName("voice_guide_pkey");
            entity.ToTable("voice_guide");
            entity.Property(e => e.VoiceGuideId).HasColumnName("voice_guide_id");
            entity.Property(e => e.OrgDescription).HasColumnName("org_description");
            entity.Property(e => e.ToneDescription).HasColumnName("tone_description");
            entity.Property(e => e.PreferredTerms).HasColumnName("preferred_terms").HasColumnType("jsonb");
            entity.Property(e => e.AvoidedTerms).HasColumnName("avoided_terms").HasColumnType("jsonb");
            entity.Property(e => e.StructuralRules).HasColumnName("structural_rules");
            entity.Property(e => e.VisualRules).HasColumnName("visual_rules");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<HashtagSet>(entity =>
        {
            entity.HasKey(e => e.HashtagSetId).HasName("hashtag_sets_pkey");
            entity.ToTable("hashtag_sets");
            entity.HasIndex(e => new { e.Pillar, e.Platform }).HasDatabaseName("hashtag_sets_pillar_platform_idx");
            entity.Property(e => e.HashtagSetId).HasColumnName("hashtag_set_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.Pillar).HasColumnName("pillar");
            entity.Property(e => e.Platform).HasColumnName("platform");
            entity.Property(e => e.Hashtags).HasColumnName("hashtags").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<SocialMediaSettings>(entity =>
        {
            entity.HasKey(e => e.SocialMediaSettingsId).HasName("social_media_settings_pkey");
            entity.ToTable("social_media_settings");
            entity.Property(e => e.SocialMediaSettingsId).HasColumnName("social_media_settings_id");
            entity.Property(e => e.PostsPerWeek).HasColumnName("posts_per_week");
            entity.Property(e => e.PlatformsActive).HasColumnName("platforms_active").HasColumnType("jsonb");
            entity.Property(e => e.Timezone).HasColumnName("timezone");
            entity.Property(e => e.RecyclingEnabled).HasColumnName("recycling_enabled");
            entity.Property(e => e.DailyGenerationTime).HasColumnName("daily_generation_time");
            entity.Property(e => e.DailySpendCapUsd).HasColumnName("daily_spend_cap_usd").HasColumnType("numeric(8,2)");
            entity.Property(e => e.MaxBatchSize).HasColumnName("max_batch_size");
            entity.Property(e => e.NotificationMethod).HasColumnName("notification_method");
            entity.Property(e => e.NotificationEmail).HasColumnName("notification_email");
            entity.Property(e => e.PillarRatioSafehouseLife).HasColumnName("pillar_ratio_safehouse_life");
            entity.Property(e => e.PillarRatioTheProblem).HasColumnName("pillar_ratio_the_problem");
            entity.Property(e => e.PillarRatioTheSolution).HasColumnName("pillar_ratio_the_solution");
            entity.Property(e => e.PillarRatioDonorImpact).HasColumnName("pillar_ratio_donor_impact");
            entity.Property(e => e.PillarRatioCallToAction).HasColumnName("pillar_ratio_call_to_action");
            entity.Property(e => e.RecyclingCooldownDays).HasColumnName("recycling_cooldown_days");
            entity.Property(e => e.RecyclingMinEngagement).HasColumnName("recycling_min_engagement");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<GeneratedGraphic>(entity =>
        {
            entity.HasKey(e => e.GeneratedGraphicId).HasName("generated_graphics_pkey");
            entity.ToTable("generated_graphics");
            entity.Property(e => e.GeneratedGraphicId).HasColumnName("generated_graphic_id");
            entity.Property(e => e.FilePath).HasColumnName("file_path");
            entity.Property(e => e.TemplateId).HasColumnName("template_id");
            entity.Property(e => e.OverlayText).HasColumnName("overlay_text");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasOne(e => e.Template).WithMany(t => t.GeneratedGraphics).HasForeignKey(e => e.TemplateId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("generated_graphics_template_id_fkey");
        });

        modelBuilder.Entity<MilestoneRule>(entity =>
        {
            entity.HasKey(e => e.MilestoneRuleId).HasName("milestone_rules_pkey");
            entity.ToTable("milestone_rules");
            entity.Property(e => e.MilestoneRuleId).HasColumnName("milestone_rule_id");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.MetricName).HasColumnName("metric_name");
            entity.Property(e => e.ThresholdType).HasColumnName("threshold_type");
            entity.Property(e => e.ThresholdValue).HasColumnName("threshold_value").HasColumnType("numeric(12,2)");
            entity.Property(e => e.CooldownDays).HasColumnName("cooldown_days");
            entity.Property(e => e.PostTemplate).HasColumnName("post_template");
            entity.Property(e => e.LastTriggeredAt).HasColumnName("last_triggered_at");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<AutomatedPost>(entity =>
        {
            entity.HasKey(e => e.AutomatedPostId).HasName("automated_posts_pkey");
            entity.ToTable("automated_posts");
            entity.HasIndex(e => e.Status).HasDatabaseName("automated_posts_status_idx");
            entity.HasIndex(e => e.ContentPillar).HasDatabaseName("automated_posts_pillar_idx");
            entity.HasIndex(e => e.Platform).HasDatabaseName("automated_posts_platform_idx");
            entity.HasIndex(e => e.ScheduledAt).HasDatabaseName("automated_posts_scheduled_at_idx");
            entity.Property(e => e.AutomatedPostId).HasColumnName("automated_post_id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.OriginalContent).HasColumnName("original_content");
            entity.Property(e => e.ContentPillar).HasColumnName("content_pillar");
            entity.Property(e => e.Source).HasColumnName("source");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.SnoozedUntil).HasColumnName("snoozed_until");
            entity.Property(e => e.Platform).HasColumnName("platform");
            entity.Property(e => e.MediaId).HasColumnName("media_id");
            entity.Property(e => e.GeneratedGraphicId).HasColumnName("generated_graphic_id");
            entity.Property(e => e.FactId).HasColumnName("fact_id");
            entity.Property(e => e.TalkingPointId).HasColumnName("talking_point_id");
            entity.Property(e => e.ScheduledAt).HasColumnName("scheduled_at");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.RejectionReason).HasColumnName("rejection_reason");
            entity.Property(e => e.MilestoneRuleId).HasColumnName("milestone_rule_id");
            entity.Property(e => e.RecycledFromId).HasColumnName("recycled_from_id");
            entity.Property(e => e.EngagementLikes).HasColumnName("engagement_likes");
            entity.Property(e => e.EngagementShares).HasColumnName("engagement_shares");
            entity.Property(e => e.EngagementComments).HasColumnName("engagement_comments");
            entity.Property(e => e.EngagementDonations).HasColumnName("engagement_donations").HasColumnType("numeric(12,2)");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.HasOne(e => e.Media).WithMany(m => m.AutomatedPosts).HasForeignKey(e => e.MediaId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("automated_posts_media_id_fkey");
            entity.HasOne(e => e.GeneratedGraphic).WithMany(g => g.AutomatedPosts).HasForeignKey(e => e.GeneratedGraphicId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("automated_posts_generated_graphic_id_fkey");
            entity.HasOne(e => e.Fact).WithMany(f => f.AutomatedPosts).HasForeignKey(e => e.FactId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("automated_posts_fact_id_fkey");
            entity.HasOne(e => e.TalkingPoint).WithMany(t => t.AutomatedPosts).HasForeignKey(e => e.TalkingPointId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("automated_posts_talking_point_id_fkey");
            entity.HasOne(e => e.MilestoneRule).WithMany(m => m.AutomatedPosts).HasForeignKey(e => e.MilestoneRuleId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("automated_posts_milestone_rule_id_fkey");
            entity.HasOne(e => e.RecycledFrom).WithMany().HasForeignKey(e => e.RecycledFromId).OnDelete(DeleteBehavior.SetNull).HasConstraintName("automated_posts_recycled_from_id_fkey");
        });

        // Newsletter tables
        modelBuilder.Entity<Newsletter>(entity =>
        {
            entity.HasKey(e => e.NewsletterId).HasName("newsletters_pkey");
            entity.ToTable("newsletters");
            entity.HasIndex(e => e.Status).HasDatabaseName("newsletters_status_idx");
            entity.HasIndex(e => e.MonthYear).HasDatabaseName("newsletters_month_year_idx");
            entity.Property(e => e.NewsletterId).HasColumnName("newsletter_id");
            entity.Property(e => e.Subject).HasColumnName("subject");
            entity.Property(e => e.HtmlContent).HasColumnName("html_content");
            entity.Property(e => e.PlainText).HasColumnName("plain_text");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.GeneratedAt).HasColumnName("generated_at");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.SentAt).HasColumnName("sent_at");
            entity.Property(e => e.RecipientCount).HasColumnName("recipient_count");
            entity.Property(e => e.MonthYear).HasColumnName("month_year");
        });

        modelBuilder.Entity<NewsletterSubscriber>(entity =>
        {
            entity.HasKey(e => e.NewsletterSubscriberId).HasName("newsletter_subscribers_pkey");
            entity.ToTable("newsletter_subscribers");
            entity.HasIndex(e => e.Email).IsUnique().HasDatabaseName("newsletter_subscribers_email_idx");
            entity.HasIndex(e => e.IsActive).HasDatabaseName("newsletter_subscribers_active_idx");
            entity.Property(e => e.NewsletterSubscriberId).HasColumnName("newsletter_subscriber_id");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.SubscribedAt).HasColumnName("subscribed_at");
            entity.Property(e => e.UnsubscribeToken).HasColumnName("unsubscribe_token");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
        });

        modelBuilder.Entity<DonorOutreach>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("donor_outreaches_pkey");
            entity.ToTable("donor_outreaches");
            entity.HasIndex(e => new { e.SupporterId, e.CreatedAt }).HasDatabaseName("idx_donor_outreaches_supporter");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id");
            entity.Property(e => e.StaffEmail).HasColumnName("staff_email");
            entity.Property(e => e.StaffName).HasColumnName("staff_name");
            entity.Property(e => e.OutreachType).HasColumnName("outreach_type");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.HasOne(e => e.Supporter)
                .WithMany(s => s.DonorOutreaches)
                .HasForeignKey(e => e.SupporterId);
        });

        modelBuilder.Entity<AppSetting>(entity =>
        {
            entity.HasKey(e => e.Key).HasName("app_settings_pkey");
            entity.ToTable("app_settings");
            entity.Property(e => e.Key).HasColumnName("key");
            entity.Property(e => e.Value).HasColumnName("value");
            entity.HasData(new AppSetting { Key = "okr_reintegration_goal", Value = "10" });
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

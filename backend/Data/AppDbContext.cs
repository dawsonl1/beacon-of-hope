using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using backend.Models;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);


        modelBuilder.Entity<Donation>(entity =>
        {
            entity.HasKey(e => e.DonationId).HasName("donations_pkey");

            entity.ToTable("donations");

            entity.HasIndex(e => e.ReferralPostId, "donations_referral_post_id_idx");

            entity.HasIndex(e => e.SupporterId, "donations_supporter_id_idx");

            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.CampaignName).HasColumnName("campaign_name");
            entity.Property(e => e.ChannelSource).HasColumnName("channel_source");
            entity.Property(e => e.CurrencyCode).HasColumnName("currency_code");
            entity.Property(e => e.DonationDate).HasColumnName("donation_date");
            entity.Property(e => e.DonationType).HasColumnName("donation_type");
            entity.Property(e => e.EstimatedValue).HasColumnName("estimated_value");
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
            entity.Property(e => e.AmountAllocated).HasColumnName("amount_allocated");
            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.ProgramArea).HasColumnName("program_area");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");

            entity.HasOne(d => d.Donation).WithMany(p => p.DonationAllocations)
                .HasForeignKey(d => d.DonationId)
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
                .HasConstraintName("home_visitations_resident_id_fkey");
        });

        modelBuilder.Entity<InKindDonationItem>(entity =>
        {
            entity.HasKey(e => e.ItemId).HasName("in_kind_donation_items_pkey");

            entity.ToTable("in_kind_donation_items");

            entity.HasIndex(e => e.DonationId, "in_kind_donation_items_donation_id_idx");

            entity.Property(e => e.ItemId).HasColumnName("item_id");
            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.EstimatedUnitValue).HasColumnName("estimated_unit_value");
            entity.Property(e => e.IntendedUse).HasColumnName("intended_use");
            entity.Property(e => e.ItemCategory).HasColumnName("item_category");
            entity.Property(e => e.ItemName).HasColumnName("item_name");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.ReceivedCondition).HasColumnName("received_condition");
            entity.Property(e => e.UnitOfMeasure).HasColumnName("unit_of_measure");

            entity.HasOne(d => d.Donation).WithMany(p => p.InKindDonationItems)
                .HasForeignKey(d => d.DonationId)
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

            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.AvgViewDurationSeconds).HasColumnName("avg_view_duration_seconds");
            entity.Property(e => e.BoostBudgetPhp).HasColumnName("boost_budget_php");
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
            entity.Property(e => e.EstimatedDonationValuePhp).HasColumnName("estimated_donation_value_php");
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

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}

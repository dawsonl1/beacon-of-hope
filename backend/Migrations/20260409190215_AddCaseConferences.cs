using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCaseConferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SourceCalendarEventId",
                table: "process_recordings",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "awareness_dates",
                columns: table => new
                {
                    awareness_date_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    date_start = table.Column<DateOnly>(type: "date", nullable: true),
                    date_end = table.Column<DateOnly>(type: "date", nullable: true),
                    recurrence = table.Column<string>(type: "text", nullable: true),
                    pillar_emphasis = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("awareness_dates_pkey", x => x.awareness_date_id);
                });

            migrationBuilder.CreateTable(
                name: "case_conferences",
                columns: table => new
                {
                    conference_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    safehouse_id = table.Column<int>(type: "integer", nullable: false),
                    scheduled_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("case_conferences_pkey", x => x.conference_id);
                    table.ForeignKey(
                        name: "case_conferences_safehouse_id_fkey",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "content_fact_candidates",
                columns: table => new
                {
                    content_fact_candidate_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fact_text = table.Column<string>(type: "text", nullable: true),
                    source_name = table.Column<string>(type: "text", nullable: true),
                    source_url = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: true),
                    search_query = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    reviewed_by = table.Column<string>(type: "text", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("content_fact_candidates_pkey", x => x.content_fact_candidate_id);
                });

            migrationBuilder.CreateTable(
                name: "content_facts",
                columns: table => new
                {
                    content_fact_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fact_text = table.Column<string>(type: "text", nullable: true),
                    source_name = table.Column<string>(type: "text", nullable: true),
                    source_url = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: true),
                    pillar = table.Column<string>(type: "text", nullable: true),
                    usage_count = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    added_by = table.Column<string>(type: "text", nullable: true),
                    added_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("content_facts_pkey", x => x.content_fact_id);
                });

            migrationBuilder.CreateTable(
                name: "content_talking_points",
                columns: table => new
                {
                    content_talking_point_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    text = table.Column<string>(type: "text", nullable: true),
                    topic = table.Column<string>(type: "text", nullable: true),
                    usage_count = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("content_talking_points_pkey", x => x.content_talking_point_id);
                });

            migrationBuilder.CreateTable(
                name: "cta_configs",
                columns: table => new
                {
                    cta_config_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    goal_amount = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    current_amount = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    url = table.Column<string>(type: "text", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("cta_configs_pkey", x => x.cta_config_id);
                });

            migrationBuilder.CreateTable(
                name: "graphic_templates",
                columns: table => new
                {
                    graphic_template_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    file_path = table.Column<string>(type: "text", nullable: true),
                    text_color = table.Column<string>(type: "text", nullable: true),
                    text_position = table.Column<string>(type: "text", nullable: true),
                    suitable_for = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("graphic_templates_pkey", x => x.graphic_template_id);
                });

            migrationBuilder.CreateTable(
                name: "hashtag_sets",
                columns: table => new
                {
                    hashtag_set_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: true),
                    pillar = table.Column<string>(type: "text", nullable: true),
                    platform = table.Column<string>(type: "text", nullable: true),
                    hashtags = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("hashtag_sets_pkey", x => x.hashtag_set_id);
                });

            migrationBuilder.CreateTable(
                name: "media_library",
                columns: table => new
                {
                    media_library_item_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_path = table.Column<string>(type: "text", nullable: true),
                    thumbnail_path = table.Column<string>(type: "text", nullable: true),
                    caption = table.Column<string>(type: "text", nullable: true),
                    activity_type = table.Column<string>(type: "text", nullable: true),
                    safehouse_id = table.Column<int>(type: "integer", nullable: true),
                    uploaded_by = table.Column<string>(type: "text", nullable: true),
                    consent_confirmed = table.Column<bool>(type: "boolean", nullable: false),
                    used_count = table.Column<int>(type: "integer", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("media_library_pkey", x => x.media_library_item_id);
                    table.ForeignKey(
                        name: "media_library_safehouse_id_fkey",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "milestone_rules",
                columns: table => new
                {
                    milestone_rule_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: true),
                    metric_name = table.Column<string>(type: "text", nullable: true),
                    threshold_type = table.Column<string>(type: "text", nullable: true),
                    threshold_value = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    cooldown_days = table.Column<int>(type: "integer", nullable: false),
                    post_template = table.Column<string>(type: "text", nullable: true),
                    last_triggered_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("milestone_rules_pkey", x => x.milestone_rule_id);
                });

            migrationBuilder.CreateTable(
                name: "social_media_settings",
                columns: table => new
                {
                    social_media_settings_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    posts_per_week = table.Column<int>(type: "integer", nullable: false),
                    platforms_active = table.Column<string>(type: "jsonb", nullable: true),
                    timezone = table.Column<string>(type: "text", nullable: true),
                    recycling_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    daily_generation_time = table.Column<string>(type: "text", nullable: true),
                    daily_spend_cap_usd = table.Column<decimal>(type: "numeric(8,2)", nullable: false),
                    max_batch_size = table.Column<int>(type: "integer", nullable: false),
                    notification_method = table.Column<string>(type: "text", nullable: true),
                    notification_email = table.Column<string>(type: "text", nullable: true),
                    pillar_ratio_safehouse_life = table.Column<int>(type: "integer", nullable: false),
                    pillar_ratio_the_problem = table.Column<int>(type: "integer", nullable: false),
                    pillar_ratio_the_solution = table.Column<int>(type: "integer", nullable: false),
                    pillar_ratio_donor_impact = table.Column<int>(type: "integer", nullable: false),
                    pillar_ratio_call_to_action = table.Column<int>(type: "integer", nullable: false),
                    recycling_cooldown_days = table.Column<int>(type: "integer", nullable: false),
                    recycling_min_engagement = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("social_media_settings_pkey", x => x.social_media_settings_id);
                });

            migrationBuilder.CreateTable(
                name: "voice_guide",
                columns: table => new
                {
                    voice_guide_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    org_description = table.Column<string>(type: "text", nullable: true),
                    tone_description = table.Column<string>(type: "text", nullable: true),
                    preferred_terms = table.Column<string>(type: "jsonb", nullable: true),
                    avoided_terms = table.Column<string>(type: "jsonb", nullable: true),
                    structural_rules = table.Column<string>(type: "text", nullable: true),
                    visual_rules = table.Column<string>(type: "text", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("voice_guide_pkey", x => x.voice_guide_id);
                });

            migrationBuilder.CreateTable(
                name: "case_conference_residents",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    conference_id = table.Column<int>(type: "integer", nullable: false),
                    resident_id = table.Column<int>(type: "integer", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false),
                    discussed = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    added_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("case_conference_residents_pkey", x => x.id);
                    table.ForeignKey(
                        name: "case_conference_residents_conference_id_fkey",
                        column: x => x.conference_id,
                        principalTable: "case_conferences",
                        principalColumn: "conference_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "case_conference_residents_resident_id_fkey",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "generated_graphics",
                columns: table => new
                {
                    generated_graphic_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    file_path = table.Column<string>(type: "text", nullable: true),
                    template_id = table.Column<int>(type: "integer", nullable: true),
                    overlay_text = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("generated_graphics_pkey", x => x.generated_graphic_id);
                    table.ForeignKey(
                        name: "generated_graphics_template_id_fkey",
                        column: x => x.template_id,
                        principalTable: "graphic_templates",
                        principalColumn: "graphic_template_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "automated_posts",
                columns: table => new
                {
                    automated_post_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    content = table.Column<string>(type: "text", nullable: true),
                    original_content = table.Column<string>(type: "text", nullable: true),
                    content_pillar = table.Column<string>(type: "text", nullable: true),
                    source = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: true),
                    snoozed_until = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    platform = table.Column<string>(type: "text", nullable: true),
                    media_id = table.Column<int>(type: "integer", nullable: true),
                    generated_graphic_id = table.Column<int>(type: "integer", nullable: true),
                    fact_id = table.Column<int>(type: "integer", nullable: true),
                    talking_point_id = table.Column<int>(type: "integer", nullable: true),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    approved_by = table.Column<string>(type: "text", nullable: true),
                    approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    milestone_rule_id = table.Column<int>(type: "integer", nullable: true),
                    recycled_from_id = table.Column<int>(type: "integer", nullable: true),
                    engagement_likes = table.Column<int>(type: "integer", nullable: true),
                    engagement_shares = table.Column<int>(type: "integer", nullable: true),
                    engagement_comments = table.Column<int>(type: "integer", nullable: true),
                    engagement_donations = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("automated_posts_pkey", x => x.automated_post_id);
                    table.ForeignKey(
                        name: "automated_posts_fact_id_fkey",
                        column: x => x.fact_id,
                        principalTable: "content_facts",
                        principalColumn: "content_fact_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "automated_posts_generated_graphic_id_fkey",
                        column: x => x.generated_graphic_id,
                        principalTable: "generated_graphics",
                        principalColumn: "generated_graphic_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "automated_posts_media_id_fkey",
                        column: x => x.media_id,
                        principalTable: "media_library",
                        principalColumn: "media_library_item_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "automated_posts_milestone_rule_id_fkey",
                        column: x => x.milestone_rule_id,
                        principalTable: "milestone_rules",
                        principalColumn: "milestone_rule_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "automated_posts_recycled_from_id_fkey",
                        column: x => x.recycled_from_id,
                        principalTable: "automated_posts",
                        principalColumn: "automated_post_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "automated_posts_talking_point_id_fkey",
                        column: x => x.talking_point_id,
                        principalTable: "content_talking_points",
                        principalColumn: "content_talking_point_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_process_recordings_SourceCalendarEventId",
                table: "process_recordings",
                column: "SourceCalendarEventId");

            migrationBuilder.CreateIndex(
                name: "automated_posts_pillar_idx",
                table: "automated_posts",
                column: "content_pillar");

            migrationBuilder.CreateIndex(
                name: "automated_posts_platform_idx",
                table: "automated_posts",
                column: "platform");

            migrationBuilder.CreateIndex(
                name: "automated_posts_scheduled_at_idx",
                table: "automated_posts",
                column: "scheduled_at");

            migrationBuilder.CreateIndex(
                name: "automated_posts_status_idx",
                table: "automated_posts",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_automated_posts_fact_id",
                table: "automated_posts",
                column: "fact_id");

            migrationBuilder.CreateIndex(
                name: "IX_automated_posts_generated_graphic_id",
                table: "automated_posts",
                column: "generated_graphic_id");

            migrationBuilder.CreateIndex(
                name: "IX_automated_posts_media_id",
                table: "automated_posts",
                column: "media_id");

            migrationBuilder.CreateIndex(
                name: "IX_automated_posts_milestone_rule_id",
                table: "automated_posts",
                column: "milestone_rule_id");

            migrationBuilder.CreateIndex(
                name: "IX_automated_posts_recycled_from_id",
                table: "automated_posts",
                column: "recycled_from_id");

            migrationBuilder.CreateIndex(
                name: "IX_automated_posts_talking_point_id",
                table: "automated_posts",
                column: "talking_point_id");

            migrationBuilder.CreateIndex(
                name: "case_conference_residents_unique",
                table: "case_conference_residents",
                columns: new[] { "conference_id", "resident_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_case_conference_residents_resident_id",
                table: "case_conference_residents",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "case_conferences_safehouse_id_idx",
                table: "case_conferences",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "case_conferences_scheduled_date_idx",
                table: "case_conferences",
                column: "scheduled_date");

            migrationBuilder.CreateIndex(
                name: "content_fact_candidates_status_idx",
                table: "content_fact_candidates",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "content_facts_category_idx",
                table: "content_facts",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "content_facts_pillar_idx",
                table: "content_facts",
                column: "pillar");

            migrationBuilder.CreateIndex(
                name: "content_talking_points_topic_idx",
                table: "content_talking_points",
                column: "topic");

            migrationBuilder.CreateIndex(
                name: "IX_generated_graphics_template_id",
                table: "generated_graphics",
                column: "template_id");

            migrationBuilder.CreateIndex(
                name: "hashtag_sets_pillar_platform_idx",
                table: "hashtag_sets",
                columns: new[] { "pillar", "platform" });

            migrationBuilder.CreateIndex(
                name: "media_library_activity_type_idx",
                table: "media_library",
                column: "activity_type");

            migrationBuilder.CreateIndex(
                name: "media_library_safehouse_id_idx",
                table: "media_library",
                column: "safehouse_id");

            migrationBuilder.AddForeignKey(
                name: "FK_process_recordings_calendar_events_SourceCalendarEventId",
                table: "process_recordings",
                column: "SourceCalendarEventId",
                principalTable: "calendar_events",
                principalColumn: "calendar_event_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_process_recordings_calendar_events_SourceCalendarEventId",
                table: "process_recordings");

            migrationBuilder.DropTable(
                name: "automated_posts");

            migrationBuilder.DropTable(
                name: "awareness_dates");

            migrationBuilder.DropTable(
                name: "case_conference_residents");

            migrationBuilder.DropTable(
                name: "content_fact_candidates");

            migrationBuilder.DropTable(
                name: "cta_configs");

            migrationBuilder.DropTable(
                name: "hashtag_sets");

            migrationBuilder.DropTable(
                name: "social_media_settings");

            migrationBuilder.DropTable(
                name: "voice_guide");

            migrationBuilder.DropTable(
                name: "content_facts");

            migrationBuilder.DropTable(
                name: "generated_graphics");

            migrationBuilder.DropTable(
                name: "media_library");

            migrationBuilder.DropTable(
                name: "milestone_rules");

            migrationBuilder.DropTable(
                name: "content_talking_points");

            migrationBuilder.DropTable(
                name: "case_conferences");

            migrationBuilder.DropTable(
                name: "graphic_templates");

            migrationBuilder.DropIndex(
                name: "IX_process_recordings_SourceCalendarEventId",
                table: "process_recordings");

            migrationBuilder.DropColumn(
                name: "SourceCalendarEventId",
                table: "process_recordings");
        }
    }
}

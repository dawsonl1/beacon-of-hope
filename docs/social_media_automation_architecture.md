# Social Media Automation System — Architecture

## The Problem

The founders have no marketing team and no bandwidth for social media. They need a system that does the thinking for them — generates content from data they're already collecting, queues it up on a schedule, and only asks them to say yes or no.

---

## System Overview

Five components, each building on the last:

```text
[Media Library] ──┐
                  ├→ [Content Generation Engine] → [Approval Queue] → [Scheduling Calendar] → [Published Posts]
[Org-Level Data] ─┘          ↑
                    [Milestone Triggers]
```

Staff has two touchpoints: snap photos throughout the week (30 seconds each), and review the queue when drafts pile up. That's it.

---

## 1. Media Library & Photo Capture

### What it does

A mobile-friendly photo upload tool that lets safehouse staff capture moments as they happen. Photos accumulate in a shared library that the content engine draws from when building posts.

### The upload flow (under 30 seconds)

1. Open the app on your phone
2. Tap a camera/upload button
3. Take a photo or select from camera roll
4. Type a short caption (optional — even just "art therapy" is enough)
5. Check the consent box: "Everyone pictured has given consent for this photo to be shared publicly"
6. Submit

The consent checkbox is non-negotiable — no check, no upload. Simple language, not legalese.

### How photos are stored

- Each photo is tagged with: safehouse, date, activity type (dropdown: art therapy, sports, meal, outing, celebration, daily life, facility, other), and the uploader
- Photos land in a browsable media library accessible to anyone managing social media
- The library is searchable/filterable by safehouse, activity type, and date range
- Photos without the consent flag never enter the library — they are rejected at upload

### Why it's separate from post creation

Staff at safehouses are not the same people managing social media. The person snapping a photo during volleyball shouldn't need to think about platforms, timing, or messaging. They just capture the moment. The social media manager (or the system) handles the rest later.

### Photo size and compression

Staff will be uploading from phone cameras — easily 5-10MB per photo. The backend must handle this:

- **Max upload size**: 10MB. Reject anything larger with a clear error message.
- **Server-side compression**: on upload, the backend compresses the image to a max width of 1920px and JPEG quality 80. This is good enough for social media (Instagram max is 1080px wide) and keeps blob storage costs down.
- **Thumbnail generation**: generate a 400px-wide thumbnail on upload, stored alongside the original. The media library grid view and approval queue use thumbnails. The full image is only loaded when the LLM's `view_photo` tool needs it or when the post is ready to publish.
- Both original (compressed) and thumbnail are stored in Azure Blob Storage.

### Mobile UX priority

This is the one flow that absolutely must work well on a phone. Big tap targets, camera API integration, minimal fields. The full admin dashboard can be desktop-focused, but photo upload needs to feel native on mobile.

---

### Branded graphics for non-photo posts

Not every post has a staff photo. "The Problem" posts need a stat graphic, "Donor Impact" posts need a numbers graphic. These are simple branded images — a background color/pattern with text overlaid.

**How they're created:**

- The system stores 5-10 **graphic templates** as image files in blob storage — simple branded backgrounds (org colors, logo watermark, no text). An admin uploads these once during setup.
- When the engine generates a post that needs a graphic (no staff photo), the Python harness calls an image generation function that composites the post's key text (the stat, the number, the CTA) onto a template background using Pillow (Python image library).
- The generated graphic is stored in blob storage and linked to the post via `media_id`.
- This is NOT AI image generation. It's simple text-on-background compositing. Think Canva, not DALL-E.

If this is too much to build for MVP, the fallback is: these posts go into the queue with a "needs image" flag and staff attaches a graphic manually.

---

## 2. Content Generation Engine

### What it does

Produces ready-to-post social media drafts by combining photos from the media library with org-level data, a curated fact database, and LLM API calls. Staff never faces a blank page. Each post serves exactly one content pillar — the engine manages the mix over time.

### Critical constraint: no resident data, ever

All resident data is sensitive by default. These are minors who are abuse survivors. Even "anonymized" aggregate stats like "12 girls advanced a grade level" could be identifying in a small safehouse with 8 residents. The content engine **never pulls from resident/case management tables**. No exceptions.

### What the engine CAN use

| Data source | Why it's safe | Example content |
| --- | --- | --- |
| Media library photos + captions | Staff already confirmed consent at upload | "Art therapy day at the safehouse!" with the photo |
| Org-level metrics (donation totals, safehouse count, years operating, staff count) | Not personally identifiable | "We just crossed $10,000 in donations this month!" |
| Donor data (only donors who opted in to being mentioned) | Explicit donor consent | "Thank you to our 15 new monthly supporters this quarter." |
| Curated fact database (vetted statistics from trusted sources) | Public knowledge, admin-approved | "79% of trafficking victims are exploited before age 18 — UNICEF" |
| Org-approved talking points (how the safehouse model works) | Describes the org, not individuals | "Our model provides 24/7 care including counseling, education, and health services." |
| Safehouse activity descriptions (from photo captions and activity tags) | Describes activities, not individuals | "Movie night at the safehouse — the girls picked the film this time." |

### What the engine CANNOT use

- Any data from resident, case, process recording, health, education, or intervention tables
- Any individual-level data about residents, even aggregated
- Any photos without the consent flag
- Any donor information without explicit opt-in

---

### Content pillars

Each post has one job — one pillar. The engine manages the distribution across posts over time so the audience gets a balanced mix. Target distribution (configurable in settings):

| Pillar | Target mix | Source data | Goal | Tone |
| --- | --- | --- | --- | --- |
| Safehouse Life | ~30% | Media library photos + captions | Humanize the org, show the good happening | Warm, joyful, hopeful |
| The Problem | ~25% | Curated fact database | Educate followers, motivate new donors | Serious but not hopeless — always end with hope or a path forward |
| The Solution | ~20% | Org-approved talking points | Build credibility, show competence | Confident, specific, credible |
| Donor Impact | ~15% | Org-level donation/operational metrics | Retain existing donors, show their money matters | Grateful, specific, connecting dollars to operations |
| Call to Action | ~10% | Current fundraising goals, events, volunteer needs | Convert followers to donors/volunteers | Urgent but not desperate, specific about what's needed |

So if the org posts 10 times a week: 3 safehouse life, 2-3 problem, 2 solution, 1-2 donor impact, 1 CTA. The engine enforces this when building its daily generation plan. The ML model can eventually recommend ratio adjustments based on what's converting to donations vs. just generating likes.

**Safehouse Life** — The engine grabs an unused photo from the media library and sends the caption to the LLM to produce a warm, engaging post. The photo IS the post — the text supports it. This is the most frequent pillar because it's the most humanizing and engaging content type.

**The Problem** — The engine pulls a fact from the curated fact database and asks the LLM to wrap it in context. The goal is to educate without exploiting — never just a sad statistic with no context. Every problem post must end with hope or a path forward ("this is why organizations like ours exist"). Media: branded graphic templates with the stat overlaid, never photos of residents.

**The Solution** — The engine pulls from org-approved talking points and asks the LLM to make them feel fresh. Varies the angle each time — one post about counseling, another about education, another about the staff. Media: facility photos from the media library (tagged "facility"), or branded graphics.

**Donor Impact** — The engine queries org-level metrics (total raised, donor count, safehouses funded) and asks the LLM to make numbers feel personal. "$15,000 this month" becomes "Your generosity kept 3 safehouses running this month." Never individual resident outcomes. Media: branded graphics showing the numbers.

**Call to Action** — The engine pulls current fundraising goals or volunteer needs from a config and asks the LLM to write a clear, compelling ask. Varies the CTA style — sometimes direct ("Donate today"), sometimes soft ("Share this post"), sometimes story-driven. Kept at 10% so followers don't feel sold to.

---

### The daily generation loop

Every day (or on-demand), the engine runs through this cycle:

**Step 1: Build the generation plan.** The engine checks the content calendar and calculates what's needed:

- What's the current pillar mix over the last 7-14 days? If the last 5 posts were safehouse life, it's time for awareness or CTA.
- Are there awareness dates coming up in the next 7 days?
- Are there fresh photos in the media library that haven't been used?
- Has a milestone been hit? (Handled by milestone triggers, but factored into the mix.)
Based on this, it decides: "Today I need to generate 1 safehouse life post and 1 problem post for Instagram and Facebook."

**Step 2: Gather raw material.** For each post in the plan, it pulls the source data for that pillar (photo + caption, fact from the database, talking point, metric, or CTA config).

**Step 3: Call the LLM.** Each post gets its own API call to GPT. The prompt has two parts:

*System prompt (same every time):*

- The voice guide (see below)
- Hard rules: never reference specific residents, never use guilt/shame, always end with hope
- Brand details: org name, mission statement

*User prompt (varies per post):*

- The content pillar and its goal
- The raw material to build around
- The target platform and its constraints
- 2-3 examples of past high-performing posts in this pillar (pulled from approved/published posts with good engagement — this is how the system improves over time)

The LLM returns a complete, ready-to-post draft — not a rough outline, a finished post with hashtags, tone, and length all dialed in.

**Step 4: Pair with media.** Safehouse life posts already have their photo. Other pillars get either a relevant photo from the library, a branded graphic template, or a "needs image" flag for staff.

**Step 5: Store as draft.** The complete post goes into `social_media_posts` with status `draft`, one row per platform variant. It appears in the approval queue.

---

### Platform-specific adaptation

Every post gets generated once per target platform. The LLM gets different instructions for each:

**Instagram:**

- 2200 character max, sweet spot 150-300 words
- 5-10 hashtags (mix of broad and niche)
- Visual-first — the photo IS the post, caption supports it
- More emotional, storytelling tone

**Facebook:**

- Longer-form OK (up to 500 words for important posts)
- 2-3 hashtags max
- Can include links directly in the post
- More informational, community-building tone

**Twitter/X:**

- 280 characters hard limit
- 1-2 hashtags max
- Punchy, single-idea posts
- Link in reply, not in main tweet

So one safehouse life moment might produce 3 drafts: an Instagram caption, a Facebook post, and a tweet. Staff can approve all 3 or just the ones they want.

---

### The fact database (hybrid research approach)

This powers the "Problem" and "Solution" pillars. Two layers:

**Layer 1: Curated facts (always available).** A `content_facts` table with vetted statistics from trusted sources. Each row has:

- The fact text ("79% of trafficking victims are exploited before age 18")
- The source (UNICEF, US State Dept TIP Report, IJM, etc.)
- Source URL
- Category: trafficking_stats, abuse_stats, rehabilitation, policy, regional
- Date added and a freshness flag
- Usage count (how many posts have used this fact)

Admins can add facts manually anytime.

**Layer 2: Research refresh (periodic, admin-triggered).** When an admin clicks "Refresh Research" (monthly or as-needed):

1. The system calls a web search API with queries like "human trafficking Philippines statistics 2026," "child abuse rehabilitation outcomes research"
2. The LLM parses results and extracts candidate facts — each with the statistic, source, and URL
3. Candidates land in a **fact review queue** (separate from the post approval queue). They are NOT auto-added to the database.
4. An admin reviews each candidate: approve (enters the fact database), reject, or edit and approve
5. Approved facts become available to the content engine

This gives freshness without the risk of auto-publishing unvetted information. The system never generates awareness content from data it hasn't been explicitly told is trustworthy.

---

### Hashtag strategy

Managed in a `hashtag_sets` table, not randomly generated:

- **Cause hashtags** (always relevant): #endtrafficking, #humantrafficking, #childprotection, #survivorstrong
- **Org hashtags** (brand-specific): #[OrgName], #[OrgName]Impact
- **Pillar-specific**: awareness → #didyouknow, #awarenessmonth; safehouse life → #safehouselife, #healing; CTA → #donate, #makeadifference
- **Platform rules**: Instagram gets 8-10, Facebook gets 2-3, Twitter gets 1-2

The engine selects from these sets based on pillar and platform. The ML model can eventually learn which combinations correlate with better engagement.

---

### The voice guide

A document stored in the DB that gets injected into every LLM call as the system prompt. It defines:

- **Who we are**: one-paragraph org description and mission
- **How we speak**: warm, hopeful, direct. Never clinical or bureaucratic.
- **Words we use**: "residents" not "victims" (for girls in care), "survivors" (for the broader issue), "supporters" not "donors" (more inclusive)
- **Words we avoid**: graphic descriptions of abuse, guilt-based language ("these girls are suffering because you didn't give"), pity framing
- **Structural rules**: always end awareness posts with hope or a path forward. Never post just a sad statistic with no context.
- **Visual rules**: no photos showing identifiable faces of residents without consent, no images of distress used as emotional manipulation

---

### Content recycling

High-performing posts shouldn't be one-and-done:

- Posts with above-average engagement get flagged as "recyclable"
- After a cooldown period (60-90 days), the engine can resurface them
- It doesn't repost verbatim — it feeds the original to the LLM with "rephrase with a fresh angle" instructions
- Recycled posts go through the same approval queue as new drafts

---

### Feedback loop

When staff interacts with drafts, the system learns over time:

- **Approved without edits** — this content type, tone, and format is working. The post becomes a candidate few-shot example for future LLM prompts.
- **Approved with edits** — both the original and edited version are stored. Over time, edited versions become the few-shot examples (showing the LLM "here's what we generated vs. what staff preferred").
- **Rejected** — the rejection reason (if given) is logged. If a content type or pillar keeps getting rejected, the engine reduces its frequency.
- **Engagement data after publishing** — if staff logs likes/shares/donations post-publish, that data feeds the ML model for predicting what works and adjusting pillar ratios.

This isn't real-time training — it's a slow accumulation of signal that improves prompt examples, pillar mix, and scheduling decisions over time.

---

### ML pipeline opportunity

- **Predictive model**: train on historical social media engagement data to predict which content pillars, tones, platforms, and posting times drive the most engagement (or better: donations). Use this to prioritize the generation plan and scheduling.
- **Explanatory model**: analyze which post attributes (pillar, length, hashtags, time of day, platform, photo vs. no photo) have the strongest causal relationship with donation conversion. Use this to inform pillar ratios and the voice guide.

---

## 3. Approval Queue

### What it does

A simple inbox where staff reviews generated drafts and decides: approve, edit, or reject. This is the primary UI staff interacts with.

### How it works

- The queue is a filtered view of `social_media_posts` where status = `draft`.
- Each card in the queue shows:
  - The generated post text
  - The paired photo (if applicable) with option to swap for a different photo from the library
  - The content type and data source summary (so staff understands where the numbers came from)
  - Suggested platform(s) and scheduled time
  - A confidence/priority indicator (if the ML model is scoring posts)
- Staff actions:
  - **Approve** → status moves to `scheduled`, post lands on the calendar at the suggested time
  - **Edit + Approve** → staff tweaks the text inline, then approves
  - **Reject** → status moves to `rejected`, post is archived with an optional reason (feeds back into the system to improve future generation)
  - **Snooze** → staff picks a duration (1 hour, 4 hours, tomorrow, next week). Status moves to `snoozed`, `snoozed_until` is set. The post disappears from the queue and reappears when the snooze expires. A background check in the `PostReadinessJob` moves expired snoozes back to `draft`.

### UX priority

This needs to be fast. Staff should be able to clear 10 drafts in 2 minutes. Think swipe-style or keyboard-shortcut-driven. No friction.

### Concurrent access

Two staff members might review the queue at the same time. Handled with optimistic concurrency:

- Each post has an `updated_at` timestamp.
- When staff approves/rejects, the frontend sends the `updated_at` value it last read.
- The backend checks: if the DB's `updated_at` differs from what was sent, someone else already acted on this post. Return a 409 Conflict and the frontend refreshes that card.
- In practice this is rare — most orgs have one person managing social media. But it prevents double-approvals without adding locks.

---

## 4. Scheduling Calendar

### What it does

A visual calendar showing what's going out and when. Approved posts land here automatically with smart default times. Staff can drag to reschedule but shouldn't need to.

### How it works

- Approved posts are placed on the calendar at a default time determined by:
  - **Simple heuristic**: best-performing time slots from historical engagement data (stored in a config or computed by the ML model). Falls back to industry defaults (e.g., Tuesday/Thursday mornings) if no data.
  - **Cadence rules**: the system enforces a minimum gap between posts (e.g., no more than 1 per day, at least 3 per week) to prevent flooding or going silent.
- The calendar view shows:
  - Upcoming scheduled posts with their text preview and platform
  - Gaps in the schedule (highlighted so staff can see "you have nothing going out Friday")
  - Past posts with engagement metrics (if tracking is implemented)
- When a scheduled time arrives, the post moves to status `ready_to_publish`.

### Publishing — the realistic approach

We are NOT building direct API integrations with Facebook/Instagram/Twitter. Instead:

- **Option A (MVP)**: The system sends a notification (email or in-app) at the scheduled time with the post text ready to copy-paste. Staff opens the platform and pastes it. Total effort: 30 seconds.
- **Option B (stretch)**: Integrate with a free tier of a scheduling tool (like Buffer's API) that handles the last-mile publishing. The system pushes the post to Buffer, Buffer publishes it.
- **Option C (if time allows)**: Direct API integration with one platform (Facebook Graph API is the most straightforward for pages).

The value of this system is not in the publishing — it's in everything that happens before publishing.

### The publish and feedback flow

Once staff actually publishes a post (copy-pastes to Instagram, etc.), they need to close the loop:

1. Staff opens the calendar or queue, finds the `ready_to_publish` post.
2. Clicks "Copy to clipboard" — copies the post text and hashtags. Downloads the paired photo if there is one.
3. Pastes into the social media platform and publishes.
4. Comes back to the app and clicks "Mark as published." Status moves to `published`. The post now shows a publish timestamp.
5. **Engagement logging (optional but valuable):** After 24-48 hours, staff can come back and enter the engagement numbers (likes, shares, comments) on the published post. This is a simple inline form on the post card — just 3 number fields. This data feeds the ML model and the feedback loop. If staff never logs engagement, the system still works — it just doesn't learn as fast.

The "Mark as published" step is important — without it, the system doesn't know the post went out and can't track the feedback loop or avoid duplicating content.

### Notifications

- **In-app badge**: the social media section in the nav shows a count of posts in `ready_to_publish` status. This is the primary notification — staff sees it when they open the app.
- **Email digest (stretch goal)**: a daily email listing posts that are ready to publish today, with the text and photo attached. Staff can copy from the email directly. Sent via Azure Communication Services or any SMTP provider.
- No push notifications for MVP — that requires a service worker and adds complexity. The badge count and optional email are enough.

---

## 5. Milestone Triggers

### What it does

The system watches the database for notable events and automatically creates draft posts when thresholds are hit. No human initiates these — they just appear in the queue.

### How it works

- A `milestone_rules` table defines trigger conditions:
  - Metric to watch (e.g., total donations this month, number of reintegrations this year, new donor count)
  - Threshold type (absolute value, percentage change, round number)
  - Threshold value (e.g., every $5,000 increment, every 10th reintegration)
  - Cooldown period (don't re-trigger for X days after last trigger)
  - Associated post template
- A background job runs on a schedule (hourly or daily) that evaluates each rule against current DB state.
- When a rule fires:
  1. Generate a draft post using the associated template + current data
  2. Insert into `social_media_posts` with status `draft` and source `milestone_trigger`
  3. The draft appears in the approval queue like any other post

### Example triggers

| Metric | Trigger | Post |
|---|---|---|
| Monthly donation total | Every $5,000 increment | "We've reached $15,000 in donations this month!" |
| Reintegration count (yearly) | Each one | "Another resident has been successfully reintegrated — [X] so far this year." |
| New donor count (monthly) | Every 10th | "10 new supporters joined us this month. Welcome to the family." |
| Consecutive months of donation growth | 3+ months | "That's 3 months of growing support in a row. Momentum matters." |
| Counseling sessions completed (quarterly) | Every 50 | "Our counselors have completed 200 sessions this quarter." |

---

## Data Model (New Tables)

### awareness_dates

Calendar of relevant awareness dates and events that the content planner checks when building the daily generation plan.

- `id` — primary key
- `name` — e.g., "Human Trafficking Awareness Month", "World Day Against Trafficking in Persons", "Giving Tuesday"
- `date_start` — start date (for single-day events, same as date_end)
- `date_end` — end date (for month-long awareness periods)
- `recurrence` — enum: annual, one_time
- `pillar_emphasis` — which pillar to emphasize around this date (usually the_problem or call_to_action)
- `description` — context for the LLM when generating related content
- `is_active` — boolean
- `created_at`

Pre-populated with ~20 key dates at setup. Admins can add more.

### cta_config

Current fundraising goals and volunteer needs that power the "Call to Action" pillar.

- `id` — primary key
- `title` — short label (e.g., "Q2 Fundraising Goal", "Volunteer tutors needed")
- `description` — what the ask is and why it matters (this gets passed to the LLM as raw material)
- `goal_amount` — numeric target if applicable (nullable — not all CTAs are monetary)
- `current_amount` — current progress toward the goal (nullable)
- `url` — donation link or signup page to include in posts
- `is_active` — boolean (only active CTAs are available to the engine)
- `priority` — integer (higher priority CTAs get used first)
- `created_at`, `updated_at`

Staff updates these as fundraising goals change. The engine pulls the highest-priority active CTA when generating a call_to_action post.

### graphic_templates

Branded background images used for non-photo posts (stat graphics, milestone announcements, etc.).

- `id` — primary key
- `name` — e.g., "Dark blue with logo", "Light gradient"
- `file_path` — blob storage URL for the background image
- `text_color` — hex color for overlaid text
- `text_position` — enum: center, bottom_left, top_center (where the text goes on the background)
- `suitable_for` — JSON array of pillar names this template works for (e.g., ["the_problem", "donor_impact"])
- `created_at`

Uploaded by admin during initial setup. 5-10 templates is plenty.

### media_library

Photos uploaded by staff, the raw material for social media content.

- `id` — primary key
- `file_path` — blob storage URL for the compressed original
- `thumbnail_path` — blob storage URL for the 400px thumbnail
- `caption` — short description from the uploader (e.g., "Art therapy Tuesday")
- `activity_type` — enum: art_therapy, sports, meal, outing, celebration, daily_life, facility, other
- `safehouse_id` — FK to safehouse
- `uploaded_by` — FK to staff user
- `consent_confirmed` — boolean (must be true to enter the library)
- `used_count` — how many posts have used this photo (for recycling/freshness logic)
- `uploaded_at` — timestamp

### content_facts

Curated, vetted facts and statistics that power the "Problem" and "Solution" pillars.

- `id` — primary key
- `fact_text` — the statistic or claim ("79% of trafficking victims are exploited before age 18")
- `source_name` — who published it (UNICEF, US State Dept, IJM, etc.)
- `source_url` — link to the original source
- `category` — enum: trafficking_stats, abuse_stats, rehabilitation, policy, regional
- `pillar` — enum: the_problem, the_solution (which pillar this fact serves)
- `usage_count` — how many posts have used this fact
- `is_active` — boolean (can be retired without deleting)
- `added_by` — FK to admin user who approved it
- `added_at` — timestamp

### content_fact_candidates

Staging table for facts surfaced by the research refresh. Not yet approved.

- `id` — primary key
- `fact_text` — the candidate statistic
- `source_name`
- `source_url`
- `category`
- `search_query` — the query that surfaced this result
- `status` — enum: pending, approved, rejected
- `reviewed_by` — FK to admin user (nullable)
- `reviewed_at` — timestamp (nullable)
- `created_at` — timestamp

### content_talking_points

Org-approved statements about how the organization works. Powers the "Solution" pillar.

- `id` — primary key
- `text` — the talking point ("Our safehouse model provides 24/7 care including counseling, education, and health services")
- `topic` — enum: counseling, education, health, staffing, safehouse_model, reintegration, general
- `usage_count` — how many posts have used this
- `is_active` — boolean
- `created_at`, `updated_at`

### voice_guide

The org's brand voice definition, injected into every LLM call.

- `id` — primary key
- `org_description` — one-paragraph description of the org and its mission
- `tone_description` — how the org speaks (warm, hopeful, direct, etc.)
- `preferred_terms` — JSON: terms to use (e.g., {"residents": "not victims", "supporters": "not donors", "survivors": "for the broader issue"})
- `avoided_terms` — JSON: terms/patterns to avoid (graphic descriptions, guilt language, pity framing)
- `structural_rules` — text: rules like "always end awareness posts with hope"
- `visual_rules` — text: rules like "no identifiable faces without consent"
- `updated_at` — timestamp

### hashtag_sets

Managed hashtag groups by pillar and platform.

- `id` — primary key
- `name` — human-readable label (e.g., "Cause hashtags", "Safehouse life — Instagram")
- `category` — enum: cause, org_brand, pillar_specific
- `pillar` — enum: safehouse_life, the_problem, the_solution, donor_impact, call_to_action, all (nullable — cause/brand tags apply everywhere)
- `platform` — enum: facebook, instagram, twitter, all
- `hashtags` — JSON array of hashtag strings
- `created_at`, `updated_at`

### social_media_posts

The central table. Every generated post lives here regardless of status.

- `id` — primary key
- `content` — the post text
- `original_content` — the pre-edit text (nullable — populated when staff edits before approving, used for the feedback loop)
- `content_pillar` — enum: safehouse_life, the_problem, the_solution, donor_impact, call_to_action
- `source` — enum: auto_generated, milestone_trigger, manual, recycled
- `status` — enum: draft, snoozed, scheduled, ready_to_publish, published, rejected
- `snoozed_until` — timestamp (nullable — when snoozed, the post reappears in the queue after this time)
- `platform` — enum: facebook, instagram, twitter
- `media_id` — FK to media_library (nullable — staff photos)
- `generated_graphic_id` — FK to generated_graphics (nullable — system-generated stat/milestone graphics). A post has either a `media_id` OR a `generated_graphic_id` OR neither, never both.
- `fact_id` — FK to content_facts (nullable — only for problem/solution posts)
- `talking_point_id` — FK to content_talking_points (nullable — only for solution posts)
- `scheduled_at` — when the post should go out
- `approved_by` — FK to staff user who approved
- `approved_at` — timestamp
- `rejection_reason` — text (nullable — logged when staff rejects a draft)
- `milestone_rule_id` — FK to milestone_rules (nullable)
- `recycled_from_id` — FK to social_media_posts (nullable — self-reference for recycled posts)
- `engagement_likes` — integer (nullable — logged post-publish)
- `engagement_shares` — integer (nullable)
- `engagement_comments` — integer (nullable)
- `engagement_donations` — decimal (nullable — attributed donations, if trackable)
- `created_at`, `updated_at`

### social_media_settings

Single-row configuration table for all social media automation settings. Only one row exists — it's a key-value store for the system.

- `id` — primary key (always 1)
- `posts_per_week` — integer (staff-controlled, default: 10)
- `platforms_active` — JSON array of active platforms (e.g., ["instagram", "facebook"])
- `timezone` — string (e.g., "Asia/Manila")
- `recycling_enabled` — boolean (default: true)
- `daily_generation_time` — time of day to run the content generation job, in the org's timezone (default: "06:00" — generates drafts before staff starts their day)
- `daily_spend_cap_usd` — decimal (default: 5.00 — max OpenAI API spend per day)
- `max_batch_size` — integer (default: 10 — max posts generated per daily run)
- `notification_method` — enum: in_app, email, both (default: in_app)
- `notification_email` — email address for notifications (nullable — only needed if method includes email)
- `pillar_ratio_safehouse_life` — integer percentage (AI-managed, default: 30)
- `pillar_ratio_the_problem` — integer percentage (AI-managed, default: 25)
- `pillar_ratio_the_solution` — integer percentage (AI-managed, default: 20)
- `pillar_ratio_donor_impact` — integer percentage (AI-managed, default: 15)
- `pillar_ratio_call_to_action` — integer percentage (AI-managed, default: 10)
- `recycling_cooldown_days` — integer (AI-managed, default: 90)
- `recycling_min_engagement` — integer (AI-managed, minimum total likes+shares to qualify for recycling, default: 20)
- `updated_at` — timestamp

### generated_graphics

Output images from the branded graphic compositing (stat cards, milestone graphics, etc.). Separate from media_library because these are system-generated, not staff uploads.

- `id` — primary key
- `file_path` — blob storage URL for the generated graphic
- `template_id` — FK to graphic_templates (which background was used)
- `overlay_text` — the text that was composited onto the background
- `created_at` — timestamp

Posts that use a generated graphic store the graphic's blob URL in a `generated_graphic_id` FK instead of `media_id`.

### milestone_rules

Defines what triggers auto-generated posts.

- `id` — primary key
- `name` — human-readable label
- `metric_name` — enum of predefined metrics: monthly_donation_total, yearly_donation_total, new_donor_count_monthly, reintegration_count_yearly, counseling_sessions_quarterly, active_resident_count. Each enum value maps to a specific SQL query in the MilestoneEvaluationService — not user-defined SQL, just a fixed set of named queries that the code knows how to execute.
- `threshold_type` — enum: absolute, increment, percentage_change
- `threshold_value` — numeric
- `cooldown_days` — minimum days between triggers
- `post_template` — template text with variable placeholders
- `last_triggered_at` — timestamp
- `is_active` — boolean
- `created_at`, `updated_at`

---

## Backend Architecture

### Two services, clean separation

The backend is split into two services with distinct responsibilities:

```text
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API calls
┌───────────────────────────▼─────────────────────────────────────┐
│                    .NET 10 Backend                                │
│                                                                  │
│  Owns: data, auth, CRUD, business logic, background job triggers │
│                                                                  │
│  Controllers:                                                    │
│  ├── MediaLibraryController  (photo upload, browse, delete)      │
│  ├── SocialMediaController   (posts CRUD, approve/reject, cal)   │
│  ├── MilestoneController     (rules CRUD, manual trigger)        │
│  ├── ContentFactsController  (facts CRUD, candidate review)      │
│  ├── VoiceGuideController    (voice guide, talking points)       │
│  └── HashtagController       (hashtag sets CRUD)                 │
│                                                                  │
│  Background Jobs (IHostedService):                               │
│  ├── DailyContentGenerationJob  → calls Python AI Harness       │
│  ├── MilestoneEvaluationJob     → checks rules, calls Harness   │
│  └── PostReadinessJob           → moves scheduled → ready        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP calls
┌───────────────────────────▼─────────────────────────────────────┐
│                  Python AI Harness (FastAPI)                      │
│                                                                  │
│  Owns: all AI/LLM logic, prompt engineering, tool definitions,   │
│        web research, ML model inference                          │
│                                                                  │
│  Endpoints:                                                      │
│  ├── POST /plan-content      (agentic — multi-turn with tools)  │
│  ├── POST /generate-post     (agentic — tool use for examples)  │
│  ├── POST /select-photo      (agentic — multimodal photo eval)  │
│  ├── POST /refresh-facts     (agentic — web search + extraction)│
│  └── POST /predict-schedule  (ML model inference)                │
│                                                                  │
│  Stack: FastAPI + OpenAI SDK (GPT-5.4) + httpx + scikit-learn │
│  No frameworks: no LangChain, no LangGraph, no CrewAI           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
        OpenAI API    Web Search API   PostgreSQL
        (OpenAI)   (Bing/Brave)     (read-only from harness)
```

**.NET owns the data.** All writes go through the .NET backend. The Python harness has read-only DB access to query photos, facts, posts, and settings when the LLM's tools need data. It never writes directly — it returns structured results to .NET, which handles the writes.

**Python owns the AI.** All prompt engineering, LLM calls, tool definitions, and ML inference live in Python. The .NET backend never calls the OpenAI API directly. This keeps all AI logic in one place where it's easy to iterate on prompts and add new tools.

### The AI Harness in detail

The harness is a small FastAPI app with 5 endpoints. Each endpoint uses OpenAI's GPT-5.4 with tool use (function calling) — the LLM decides which tools to call and in what order. GPT-5.4 is used for all endpoints — it handles tool use, multimodal vision, and reasoning in a single model.

#### POST /plan-content — Daily content planning

The .NET `DailyContentGenerationJob` calls this endpoint once per day. The LLM acts as a content strategist.

**Tools available to the LLM:**

- `get_weekly_target()` — returns posts-per-week setting
- `get_pillar_mix(days)` — returns pillar distribution over the last N days vs. target ratios
- `get_scheduled_count()` — returns how many posts are already scheduled this week
- `get_unused_photos(limit)` — returns recent photos that haven't been used in posts
- `get_unused_facts(limit)` — returns facts not recently used, with categories
- `get_awareness_dates(next_days)` — returns upcoming awareness dates/events
- `get_recent_engagement()` — returns engagement data on recent posts by pillar

**How it runs:**

The LLM makes multiple tool calls to understand the current state — what's the pillar mix, what's scheduled, what raw material is available, any upcoming dates. Then it reasons about what's needed and returns a structured generation plan: a JSON array of post assignments, each with a pillar, platform, source material reference, and reasoning.

The key value: the LLM makes judgment calls. It might decide to break the pillar ratio because there's a great photo that shouldn't wait, or ramp up CTA posts because an awareness date is approaching. A rule-based system can't do that.

**Response:** a list of post assignments for the .NET backend to execute.

#### POST /generate-post — Write a single post

Called once per post in the generation plan. The LLM acts as a social media copywriter.

**Tools available to the LLM:**

- `get_voice_guide()` — returns the org's voice definition, preferred/avoided terms, structural rules
- `get_hashtags(pillar, platform)` — returns the hashtag set for this pillar + platform
- `get_examples(pillar, platform, limit)` — returns past approved posts with good engagement (few-shot examples that improve over time via the feedback loop)
- `view_photo(id)` — returns the actual image (multimodal) so the LLM can see what's in the photo, not just read the caption

**How it runs:**

The LLM loads the voice guide and examples, then writes a complete post tailored to the platform's constraints. For photo posts, the LLM actually looks at the image to write a caption that matches what's happening in the photo — not just the uploader's two-word caption.

**Response:** finished post text, hashtags, and the photo ID.

#### POST /select-photo — Pick the best photo for a post

Called when the generation plan assigns a post that doesn't have a photo yet (donor_impact, CTA, etc.). The LLM acts as a photo editor.

**Tools available to the LLM:**

- `query_photos(activity_types, unused_first, limit)` — returns photo metadata matching filters
- `view_photo(id)` — returns the actual image (multimodal) so the LLM can evaluate visual quality and relevance

**How it runs:**

The LLM queries available photos based on the post's pillar and tone, then actually looks at candidate photos to evaluate which one best supports the message. It considers visual quality, emotional tone, relevance to the post topic, and recency.

**Response:** selected photo ID and reasoning.

#### POST /refresh-facts — Web research for new facts

Called when an admin triggers a research refresh. The LLM acts as a researcher.

**Tools available to the LLM:**

- `web_search(query)` — calls Bing/Brave Search API, returns titles + snippets + URLs
- `fetch_page(url)` — fetches and extracts text from a web page
- `get_existing_facts(category)` — returns facts already in the database (so the LLM doesn't surface duplicates)

**How it runs:**

The LLM searches for current statistics on trafficking, abuse, and rehabilitation. It reads promising results, evaluates source credibility, verifies stats by cross-referencing, and skips anything it can't verify. It may do multiple search rounds if initial results are thin.

**Response:** candidate facts for admin review, each with the fact text, source, URL, and category. These go into `content_fact_candidates` for approval — they never go directly into the fact database.

#### POST /predict-schedule — ML-powered scheduling

Called by the .NET `SchedulingService` when assigning times to approved posts.

**This one is NOT agentic** — it's a simple ML inference call. No tool use, no reasoning loop. A trained scikit-learn model predicts the optimal posting time based on:

- Platform
- Content pillar
- Day of week
- Historical engagement patterns

**Response:** recommended `scheduled_at` timestamp.

### How the daily flow connects end-to-end

1. `DailyContentGenerationJob` fires in .NET
2. .NET calls `POST /plan-content` → Python/GPT plans the batch using tools
3. For each post in the plan:
   - If the post needs a photo and doesn't have one: .NET calls `POST /select-photo` → GPT picks one
   - .NET calls `POST /generate-post` with the assignment → GPT writes the post
   - .NET saves the draft to `social_media_posts` with status `draft`
4. Drafts appear in the approval queue
5. Staff approves → .NET calls `POST /predict-schedule` → ML picks the optimal time
6. Post moves to `scheduled` with the assigned time
7. `PostReadinessJob` fires hourly → moves posts to `ready_to_publish` when their time arrives → notifies staff

### Photo storage

Photos are stored in **Azure Blob Storage**, not in the database or local filesystem. The `media_library` table stores the blob URL. When the LLM's `view_photo` tool is called, the harness fetches the image from blob storage and passes it to GPT as a multimodal input.

### Background jobs

Three recurring jobs in .NET (using `IHostedService`):

1. **DailyContentGenerationJob** (runs daily at the time configured in `social_media_settings.daily_generation_time`, converted to UTC using the configured timezone): triggers the plan → select → generate pipeline via the Python harness. Before starting, checks the harness health endpoint. If unhealthy, logs the error, notifies admin, and skips — will retry next day.
2. **MilestoneEvaluationJob** (runs hourly): checks active milestone rules against DB state. When a rule fires, calls `POST /generate-post` on the harness directly (skips `/plan-content` — the plan is already known: "generate a milestone post for this metric with this value"). The generated draft goes into the queue like any other post.
3. **PostReadinessJob** (runs hourly): moves `scheduled` posts to `ready_to_publish` when their time arrives, moves expired `snoozed` posts back to `draft`, sends in-app notification to staff if any posts are now ready.

### ML integration

ML models live in `ml/social_media/` and are loaded by the Python harness at startup. The harness serves predictions via the `/predict-schedule` endpoint. Models are retrained periodically (weekly or monthly) by a separate Python script that reads engagement data from the DB and writes updated model files. The harness picks up new model files on its next restart or via a reload signal.

### Deployment

Both services deploy to Azure:

- **.NET backend** → Azure App Service (same as the existing app)
- **Python AI harness** → Azure Container App or a second App Service. Needs access to: OpenAI's API (outbound HTTPS), the PostgreSQL DB (read-only connection string), Azure Blob Storage (for photo retrieval), and a web search API (outbound HTTPS).

Communication between .NET and Python is internal HTTP — both are in the same Azure virtual network, so no public exposure of the harness endpoints.

### Authentication between services

The Python harness is NOT publicly accessible — it sits behind the Azure virtual network and only the .NET backend can reach it. As an additional layer, the .NET backend sends a shared API key in the `Authorization` header on every request to the harness. The harness rejects any request without a valid key. The key is stored in environment variables on both services (via Azure Key Vault or App Service configuration). This is simple and sufficient — the harness is not a public API.

### Python harness DB access

The harness connects directly to PostgreSQL using a **read-only database user**. This is a separate Postgres role with `SELECT` permissions only on the tables it needs (media_library, content_facts, content_talking_points, social_media_posts, voice_guide, hashtag_sets, awareness_dates, cta_config, graphic_templates, and donation/safehouse tables for org-level metrics). It cannot write, update, or delete anything. All writes go through the .NET backend after the harness returns its structured results.

The connection string for the read-only user is stored in the harness's environment variables, separate from the .NET backend's read-write connection string.

### Error handling and resilience

**OpenAI API down or timeout:**

- Each harness endpoint has a 60-second timeout on OpenAI API calls. If the API doesn't respond, the endpoint returns a 503 to the .NET backend.
- The `DailyContentGenerationJob` retries the full pipeline once after a 5-minute wait. If it fails again, it logs the failure and sends an in-app notification to admins: "Content generation failed today. The queue may be empty."
- The system doesn't crash — it just means no new drafts appear in the queue that day. Staff can manually create posts if needed, or the job retries the next day.
- Individual post generation failures within a batch don't kill the whole batch. If 1 out of 6 posts fails, the other 5 still get saved as drafts.

**Harness service down:**

- The .NET backend treats the harness as an external dependency. If it can't reach the harness, it logs the error and moves on. Background jobs will retry on their next scheduled run.
- The rest of the app (photo upload, queue management, calendar, manual post creation) works fine without the harness. Only AI-generated content and research refresh require it.

**Photo retrieval failures:**

- If a photo can't be loaded from blob storage during `view_photo`, the tool returns an error and the LLM works with the caption text only. The post still gets generated — it just might not be as well-matched to the photo content.

### Cost management

**Estimated OpenAI API usage per week** (assuming 10 posts/week across 2 platforms):

- `/plan-content`: 1 call/day × 7 days = 7 calls, ~3-5 tool turns each. ~$0.50-1.00/week.
- `/generate-post`: ~20 posts/week (10 posts × 2 platforms), 1-2 tool turns each. ~$1.00-2.00/week.
- `/select-photo`: ~10 calls/week (not every post needs photo selection), 2-3 tool turns each. ~$0.50-1.00/week. Vision (image) inputs cost more.
- `/refresh-facts`: ~1-2 calls/month, 3-5 tool turns each. Negligible.

**Total estimated cost: ~$8-15/month** using GPT-5.4. This is well within a nonprofit's budget, especially compared to hiring a social media manager.

**Cost guardrails:**

- The harness tracks total API calls and token usage per day. If daily spend exceeds a configurable threshold (e.g., $5), it stops making new calls and notifies admins.
- The `DailyContentGenerationJob` has a max batch size (configurable, default 10 posts). It won't generate 50 posts in one day even if the calendar is empty.

### The tool-use loop pattern

Every agentic endpoint in the harness follows the same code pattern. This is the core of the harness — about 30 lines of Python:

1. Build the initial messages array: system prompt (voice guide + rules) + user prompt (task-specific instructions + raw material).
2. Define the tools as a list of JSON schemas (OpenAI function calling format). Each tool maps to a Python function.
3. Call `openai.chat.completions.create()` with the messages and tools.
4. Check the response: if the model returned `tool_calls`, execute each tool function with the provided arguments.
5. Append the tool results to the messages array as tool response messages.
6. Call the API again with the updated messages.
7. Repeat steps 4-6 until the model returns a final message with no tool calls.
8. Parse the final message as structured JSON (the plan, the post, the photo selection, etc.) and return it.

A max iteration limit (default: 10 tool rounds) prevents runaway loops. If hit, the endpoint returns whatever partial result exists and logs a warning.

### Health check endpoint

`GET /health` — returns 200 if the harness is running, can reach the DB, and has a valid OpenAI API key configured. The .NET backend calls this before starting the daily generation pipeline. If unhealthy, it skips generation and notifies admins.

### API contracts (request/response schemas)

**POST /plan-content**

Request:
```json
{
  "max_posts": 10
}
```

Response:
```json
{
  "plan": [
    {
      "pillar": "safehouse_life",
      "platform": "instagram",
      "photo_id": 91,
      "fact_id": null,
      "talking_point_id": null,
      "reasoning": "Great art therapy photo uploaded yesterday, unused"
    },
    {
      "pillar": "the_problem",
      "platform": "facebook",
      "photo_id": null,
      "fact_id": 42,
      "talking_point_id": null,
      "reasoning": "Awareness date in 5 days, pillar underrepresented"
    }
  ]
}
```

**POST /generate-post**

Request:
```json
{
  "pillar": "safehouse_life",
  "platform": "instagram",
  "photo_id": 91,
  "fact_id": null,
  "talking_point_id": null,
  "milestone_data": null
}
```

Response:
```json
{
  "content": "Creativity is part of healing. Tuesdays at the safehouse are for art therapy...",
  "hashtags": ["#safehouselife", "#arttherapy", "#healing"],
  "photo_id": 91,
  "generated_graphic": null
}
```

For posts that need a branded graphic (no photo), the response includes:
```json
{
  "content": "We just crossed $15,000 in donations this month!",
  "hashtags": ["#thankyou", "#impact"],
  "photo_id": null,
  "generated_graphic": {
    "template_id": 3,
    "overlay_text": "$15,000\nThis Month",
    "file_path": "https://blob.../generated/graphic_20260408_001.jpg"
  }
}
```

**POST /select-photo**

Request:
```json
{
  "pillar": "donor_impact",
  "platform": "instagram",
  "post_description": "Monthly donation milestone, celebratory tone"
}
```

Response:
```json
{
  "photo_id": 45,
  "reasoning": "Group dinner photo conveys community and warmth, pairs well with donor gratitude messaging"
}
```

**POST /refresh-facts**

Request:
```json
{
  "categories": ["trafficking_stats", "rehabilitation", "regional"]
}
```

Response:
```json
{
  "candidates": [
    {
      "fact_text": "An estimated 4.8 million children are trapped in forced sexual exploitation worldwide",
      "source_name": "UNICEF",
      "source_url": "https://...",
      "category": "trafficking_stats"
    }
  ]
}
```

**POST /predict-schedule**

Request:
```json
{
  "platform": "instagram",
  "pillar": "safehouse_life",
  "preferred_day": null
}
```

Response:
```json
{
  "scheduled_at": "2026-04-10T09:00:00+08:00"
}
```

### Empty media library handling

If the daily generation job runs and the media library has no unused photos:

- The planner skips `safehouse_life` posts entirely for this batch.
- It shifts the plan toward pillars that don't need photos: `the_problem` (uses fact + branded graphic), `the_solution` (uses talking point + branded graphic or facility photo if any exist), `donor_impact` (uses metrics + branded graphic), `call_to_action` (text-focused).
- The system adds an in-app notification to admins: "The photo library is empty — safehouse life posts can't be generated. Ask staff to upload photos."
- This is a graceful degradation, not a failure. The system keeps posting, just with a different pillar mix until photos are available.

---

## Frontend Architecture

### Navigation

The social media section is a **top-level item in the admin sidebar**, labeled "Social Media" with an icon. It expands to show sub-pages:

- Upload (with a camera icon — the primary action)
- Queue (with badge count of drafts awaiting review)
- Calendar
- Media Library
- Facts
- Voice & Brand
- Settings

The badge count on "Queue" is the main driver of staff attention — they see it every time they open the admin panel.

### Roles

Three distinct roles for the social media system, added to the existing RBAC:

**Admin** — configures the system and has full access. Sets up the voice guide, talking points, hashtag sets, milestone rules, and settings. Can do everything the Social Media Manager can do, plus system configuration and photo deletion. Typically 1-2 people (the founders or a tech-savvy staff member).

**Social Media Manager** — the day-to-day operator. Reviews the queue, approves/edits/rejects posts, manages the calendar, publishes posts (copy to clipboard + mark as published), logs engagement data, manages the fact database. Does NOT configure the system voice, settings, or milestone rules — works within the guardrails the admin set up. Could be the admin wearing a different hat, or a volunteer/part-time person who only handles outreach.

**Safehouse Staff** — on the ground at safehouses. Their only social media touchpoint is uploading photos. They also use the case management side of the app for their day-to-day work. They should not see the queue, calendar, or any content management pages — their view is limited to photo upload and browsing the media library for their safehouse.

### Permission matrix

| Page | Admin | Social Media Manager | Safehouse Staff |
| --- | --- | --- | --- |
| Photo Upload | Yes | Yes | Yes |
| Media Library (browse) | Yes | Yes | Yes (own safehouse only) |
| Media Library (delete) | Yes | No | No |
| Queue (approve/edit/reject/snooze) | Yes | Yes | No |
| Calendar (view/reschedule) | Yes | Yes | No |
| Publish + Mark as Published | Yes | Yes | No |
| Engagement Logging | Yes | Yes | No |
| Fact Database (browse/add) | Yes | Yes | No |
| Research Refresh (trigger) | Yes | Yes | No |
| Voice & Brand | Yes | No | No |
| Settings | Yes | No | No |
| Milestone Rules | Yes | No | No |

**Why the separation matters:** The org might have 10+ safehouse staff across multiple locations, but only 1-2 people managing social media. If safehouse staff can see the queue, they might get confused or start approving posts they shouldn't. Keeping their view limited to photo upload makes the system simpler for them — open the app, upload a photo, done.

The Social Media Manager role is separate from Admin because the person doing day-to-day social media doesn't need to configure the system. An admin sets up the voice guide, talking points, and milestone rules during onboarding. The social media manager works within those guardrails daily.

### Who logs engagement data

The Social Media Manager (or Admin acting as one). They're the person who copy-pastes to Instagram, so they're the person who comes back 48 hours later to log the numbers. This is critical — without engagement data, the ML models can't learn.

### New pages (all behind auth, staff/admin only)

1. **Photo Upload** (`/admin/social/upload`)
   - Mobile-optimized, minimal UI — this is the one page that must feel native on a phone
   - Camera button (uses device camera API) or file picker
   - Caption field, activity type dropdown, safehouse selector
   - Consent checkbox (required to submit)
   - Confirmation screen, then done — no extra steps

2. **Media Library** (`/admin/social/media`)
   - Grid view of all uploaded photos with captions
   - Filter by safehouse, activity type, date range
   - Shows usage count (how many posts have used each photo)
   - Bulk select for deletion if needed

3. **Social Media Queue** (`/admin/social/queue`)
   - Default landing page for the social media section
   - Card-based list of draft posts, sorted by priority/recency
   - Each card: post preview with photo, content type badge, suggested platform/time, approve/edit/reject actions
   - Photo swap button to pick a different image from the media library
   - Filter by content pillar, source, platform

4. **Social Media Calendar** (`/admin/social/calendar`)
   - Month/week view showing scheduled and published posts
   - Drag-and-drop to reschedule
   - Color-coded by content type or platform
   - Gap indicators showing days with no scheduled content
   - Click a post to view/edit details

5. **Fact Database** (`/admin/social/facts`)
   - Browse/search curated facts by category and pillar
   - Add new facts manually
   - "Refresh Research" button triggers web search — results land in a review queue on this page
   - Approve, reject, or edit candidate facts from research refresh
   - Usage counts show which facts have been used most/least

6. **Voice & Brand** (`/admin/social/voice`)
   - Edit the voice guide (org description, tone, preferred/avoided terms, structural rules)
   - Manage talking points (add/edit/retire)
   - Manage hashtag sets by pillar and platform
   - Preview: "Generate a sample post using these settings" to test changes before they affect real drafts

7. **Settings** (`/admin/social/settings`)
   - **Staff controls** (things only humans can decide):
     - Posts per week (how much content can they review?)
     - Which platforms are active (toggle Facebook/Instagram/Twitter)
     - Milestone trigger rules (add/edit/toggle)
     - Content recycling on/off
     - Notification preferences (in-app, email, both)
     - Time zone
   - **AI-managed** (shown under an "Advanced" toggle for override, but optimized automatically):
     - Pillar distribution ratios (AI adjusts based on what drives donations vs. likes)
     - Posting times per platform (AI learns when audience is most active)
     - Posting days (AI optimizes based on engagement data)
     - Max/min posts per day (AI balances against weekly target)
     - Content recycling cooldown and thresholds (AI learns freshness windows)
     - Fact freshness flags (AI tracks usage and age)

---

## First-Time Setup (Bootstrapping)

On day 1, the engine has nothing to work with — no photos, no facts, no talking points, no past posts for few-shot examples. Here's the onboarding flow an admin needs to complete before the system can generate its first post:

### Required before the engine can run

1. **Voice guide** — Go to Voice & Brand, fill in the org description, tone, preferred/avoided terms, and structural rules. This is the system prompt for every LLM call. Without it, the engine has no voice. (~15 minutes)

2. **Talking points** — Add at least 5-10 talking points about what the org does. These power the "Solution" pillar. Without them, the engine can only generate 4 out of 5 pillars. (~10 minutes)

3. **Facts** — Either manually add 10-15 facts to the fact database, or run a research refresh and approve the results. These power the "Problem" pillar. (~15 minutes for manual, ~10 minutes for refresh + review)

4. **Hashtag sets** — Set up at least one hashtag set per pillar. Doesn't need to be perfect — can be refined later. (~10 minutes)

5. **CTA config** — Add at least one active fundraising goal or volunteer need. This powers the "Call to Action" pillar. (~5 minutes)

6. **Settings** — Set posts per week, activate platforms, set time zone. (~5 minutes)

7. **Upload at least 5-10 photos** — The engine needs photos for "Safehouse Life" posts. Have staff upload a batch of recent photos to seed the library. (~10 minutes)

**Total first-time setup: ~60-90 minutes.** After that, the system runs on its own.

### Optional but recommended at setup

- **Awareness dates** — Pre-populated with the following key dates. Admin should review and add any org-specific dates:
  - January: Human Trafficking Awareness Month (full month), National Slavery and Human Trafficking Prevention Month (full month)
  - February 6: International Day of Zero Tolerance for Female Genital Mutilation
  - February 8: Safer Internet Day
  - March 8: International Women's Day
  - April: Child Abuse Prevention Month (full month), Sexual Assault Awareness Month (full month)
  - April 8: Day of Remembrance for Child Victims of Violence
  - June 12: World Day Against Child Labour
  - June 19: International Day for the Elimination of Sexual Violence in Conflict
  - June 20: World Refugee Day
  - July 30: World Day Against Trafficking in Persons
  - August 12: International Youth Day
  - September 21: International Day of Peace
  - October 11: International Day of the Girl Child
  - November 19: World Day for the Prevention of Child Abuse
  - November 20: Universal Children's Day
  - November 25: International Day for the Elimination of Violence Against Women
  - Giving Tuesday (Tuesday after US Thanksgiving — varies by year)
  - Year-End Giving Season (December 15-31)
- **Milestone rules** — Set up at least 2-3 milestone triggers (e.g., donation milestones, new donor count).
- **Graphic templates** — Upload 5-10 branded background images for non-photo posts.

### The cold start for few-shot examples

The feedback loop depends on past approved posts as few-shot examples for the LLM. On day 1, there are none. The engine handles this gracefully:

- **Week 1-2**: no few-shot examples available. The LLM generates posts using only the voice guide and pillar instructions. Quality will be decent but not fine-tuned to the org's preferences.
- **Week 3+**: as staff approves (and especially edits) posts, the system accumulates examples. The edited versions become the few-shot examples, teaching the LLM what the org actually likes.
- **Month 2+**: enough engagement data exists for the ML model to start optimizing pillar ratios and posting times.

The system gets better over time. The first week's posts won't be as good as month 3's posts, and that's expected.

---

## What Staff Actually Does Day-to-Day

This is the key. Here's what a typical week looks like:

### Safehouse staff (the people on the ground)

Their only job is capturing moments. No social media knowledge required.

**Throughout the week (~2 minutes total):**

- Girls are doing art therapy → open app on phone, snap a photo, type "art therapy," check consent, submit. 30 seconds.
- Movie night → same thing. 30 seconds.
- New mural on the wall → same thing. 30 seconds.

That's it. They never think about platforms, timing, or messaging. They just document life at the safehouse.

### Social media manager (or whoever is managing outreach)

**Monday morning (5 minutes):**

- Open the queue. See 8-10 draft posts generated from this week's photos and org data.
- Each draft already has a polished caption and a paired photo.
- Scan them. Approve 6, tweak the wording on 2, swap the photo on 1, reject 1 that feels off.
- Done. The calendar now has content scheduled through the week.

**Throughout the week (30 seconds per post):**

- Get a notification: "3 posts are ready to publish."
- Open the calendar. See the posts with "Copy to clipboard" buttons.
- Copy the text, download the photo, paste into Instagram/Facebook. Mark as published. 30 seconds each.

**Wednesday (2 minutes):**

- Get a notification: "Milestone reached — monthly donations hit $10,000."
- Open the queue. See the auto-generated milestone post.
- Approve it. It goes out Thursday morning.

**Friday (5 minutes):**

- Open the calendar. See the reminder: "5 posts need engagement data."
- For each published post from this week, open it, check the platform for likes/comments/shares, type the numbers in. 30 seconds each.
- If any donations came in that seem tied to a post, log the amount.

**Total weekly effort: ~5 minutes for safehouse staff, ~20 minutes for the social media manager (including engagement logging).**

That's the goal. Everything else is the system's job.

---

## ML Pipeline Data

### What the system captures automatically

Every post that moves through the pipeline generates training data with zero human input:

**Post attributes (features):**

- `content_pillar` — which of the 5 pillars
- `platform` — instagram, facebook, twitter
- `post_length` — character count (derived from content)
- `word_count` — word count (derived from content)
- `hashtag_count` — number of hashtags used
- `has_photo` — boolean (media_id is not null)
- `has_branded_graphic` — boolean (generated_graphic_id is not null)
- `has_no_media` — boolean (neither photo nor graphic)
- `photo_activity_type` — activity type of the paired photo (nullable)
- `fact_category` — category of the source fact (nullable)
- `source` — auto_generated, milestone_trigger, manual, recycled
- `is_recycled` — boolean
- `was_edited` — boolean (original_content differs from content)
- `edit_distance` — how much staff changed the draft (character-level diff, computed on save)
- `scheduled_day_of_week` — Monday through Sunday
- `scheduled_hour` — 0-23
- `time_in_queue_hours` — how long the draft sat before approval
- `week_number` — ISO week number (for seasonal patterns)
- `month` — 1-12

**Post outcomes (targets) — requires manual input:**

- `engagement_likes` — integer
- `engagement_comments` — integer
- `engagement_shares` — integer
- `engagement_total` — likes + comments + shares (computed)
- `engagement_donations` — decimal, attributed donation amount

### What the social media manager must manually input

After publishing each post (ideally 24-48 hours later):

1. **Mark as published** — required. One click. Without this the system doesn't know the post went out.
2. **Likes, comments, shares** — required for ML to work. Three number fields, takes 15 seconds per post. The manager checks the platform's native analytics and types the numbers.
3. **Saves** (Instagram only) — optional. One more number field.
4. **Reach/impressions** — optional. Harder to find on some platforms. Nice to have but not required for the core ML models.
5. **Attributed donations** — optional but high value. A dollar amount the manager estimates was driven by this post. Could be exact ("someone donated $100 and mentioned this post") or approximate ("we got 3 donations totaling $500 within 24 hours of this post"). Even rough estimates are valuable.

**Making it painless:**

- The engagement form is inline on the post card in the calendar view — no separate page.
- 3 required fields (likes, comments, shares) + 1 optional (donations). That's it for the minimum.
- Batch-friendly: the calendar highlights all posts needing engagement data. The manager can knock out a whole week in 5 minutes on Friday.
- 48-hour nudge: if a post has been `published` for 48+ hours with no engagement data, show a badge/reminder: "5 posts need engagement data."

### The four ML pipelines

**Pipeline 1: Engagement Prediction**

- **Business question:** Given a post's attributes, how much engagement will it get?
- **Type:** Predictive
- **Features:** all post attributes listed above
- **Target:** engagement_total (likes + comments + shares)
- **Algorithm:** Random forest or gradient boosting (handles mixed feature types well)
- **Used by:** the content planner (prioritize high-engagement content), the scheduler (pick times that maximize engagement)
- **Minimum data needed:** ~50-80 published posts with engagement data (~month 2-3)

**Pipeline 2: Donation Conversion**

- **Business question:** Which post attributes and engagement patterns actually drive donations?
- **Type:** Both predictive and explanatory
- **Features:** all post attributes + engagement metrics
- **Target:** engagement_donations > 0 (classification: did this post drive any donations?) and engagement_donations amount (regression: how much?)
- **Algorithm:** Logistic regression for explanation (which features matter?), gradient boosting for prediction (which posts will convert?)
- **Used by:** the planner (generate more of what converts), the voice guide recommendations (what tone/style drives donations)
- **Minimum data needed:** ~100+ posts with donation attribution logged (~month 4+). This is the hardest model to train because donation attribution is optional and approximate.

**Pipeline 3: Optimal Posting Time**

- **Business question:** When should we post on each platform for maximum engagement?
- **Type:** Predictive
- **Features:** platform, pillar, day_of_week, hour, month
- **Target:** engagement_total
- **Algorithm:** Simple regression or time-series binning — this doesn't need a complex model, just "Instagram posts at 9am Tuesday get 2x the engagement of Wednesday 3pm"
- **Used by:** the `/predict-schedule` endpoint
- **Minimum data needed:** ~40-60 posts spread across different times (~month 2)

**Pipeline 4: Pillar Ratio Optimization**

- **Business question:** What pillar mix maximizes donations over time?
- **Type:** Explanatory
- **Features:** weekly pillar distribution (% of each pillar that week), total posts that week, average engagement that week
- **Target:** total donations that week
- **Algorithm:** OLS regression — simple and interpretable. "Increasing CTA from 10% to 15% of posts is associated with $X more in weekly donations."
- **Used by:** the AI-managed pillar ratio settings in `social_media_settings`
- **Minimum data needed:** ~20-25 weeks of data (~month 6+). This is the slowest model to become useful because each data point is one week.

### Cold start timeline

| Phase | Timeframe | ML status | What the system uses instead |
| --- | --- | --- | --- |
| No data | Weeks 1-4 | No models trained | Hardcoded defaults: industry-standard posting times, 30/25/20/15/10 pillar ratios, GPT judgment for planning |
| Early data | Month 2-3 | Engagement prediction + posting time models start training | Engagement prediction starts influencing the planner. Posting time model starts informing `/predict-schedule`. |
| Growing data | Month 4-5 | Donation conversion model starts training | Donation model starts identifying which post types actually drive revenue. |
| Mature data | Month 6+ | All 4 models active, pillar ratio optimizer kicks in | The full feedback loop is running. Pillar ratios auto-adjust. The system gets measurably better over time. |

Each model has a **minimum data threshold** — if there aren't enough data points, the `/predict-schedule` endpoint and the planner fall back to defaults. The system never uses an undertrained model.

### ML retraining job

Follows the existing pattern in `.github/workflows/ml-pipeline.yml` — a GitHub Actions workflow that runs nightly at 3am UTC with a manual trigger option.

The social media ML retraining adds steps to the existing pipeline (or a new workflow at `.github/workflows/ml-social-media.yml`):

1. **ETL step**: query `social_media_posts` where `status = published` and engagement data is logged. Build training DataFrames for each pipeline. Check minimum data thresholds — if not enough data for a model, skip it.
2. **Training step**: for each model that has enough data, retrain on the full dataset. Compare new model performance to the current model. If the new model is worse (overfitting, data issue), keep the old one.
3. **Export step**: serialize trained models as `.joblib` files. Write them to a known path in Azure Blob Storage (e.g., `models/social_media/engagement_prediction.joblib`).
4. **Inference step**: run predictions using the current best models. Write results to a `ml_predictions` table in the DB that the Python harness reads from.
5. **Pillar ratio update step** (Pipeline 4 only): if the pillar ratio optimizer has enough data and produces a recommendation, write the suggested ratios to `social_media_settings`. This is the one place where ML directly modifies a config value.

The Python harness loads model files from blob storage at startup and whenever a new model file appears (checked on each request, or via a `/reload-models` endpoint the GitHub Action calls after export).

Environment variables needed by the GitHub Action:
- `DATABASE_URL` — read-write Postgres connection string (already in repository secrets)
- `AZURE_STORAGE_CONNECTION_STRING` — for writing model files to blob storage

### Data retention and cleanup

Data accumulates over time. Retention policy:

**Keep forever:**
- Published posts with engagement data — this is ML training data. Every row makes the models better. Never delete.
- Approved content_facts — the curated fact database only grows. Retired facts are flagged `is_active = false`, not deleted.
- Voice guide history — there's only one row, it just gets updated. No cleanup needed.

**Keep for 1 year, then archive:**
- Rejected posts — useful for the feedback loop in the short term. After 12 months, move to an `archived_posts` table or delete. A monthly cleanup job handles this.
- Snoozed posts that were never acted on — if a post has been `snoozed` for 30+ days, auto-reject it and log the reason as "expired snooze."

**Keep for 90 days, then delete:**
- Rejected fact candidates (`content_fact_candidates` where `status = rejected`) — no long-term value. Clean up monthly.

**Clean up immediately:**
- Generated graphics for rejected posts — if a post is rejected and it had a generated graphic, delete the graphic from blob storage and the `generated_graphics` table. No reason to keep graphics that will never be used.

**Media library photos** — never auto-deleted. Only admins can delete photos manually. Even if a photo has been used in multiple posts, it stays in the library. Storage is cheap.

A monthly GitHub Action (or a step in the existing nightly pipeline) runs the cleanup queries: archive old rejected posts, delete expired fact candidates, clean up orphaned graphics.

---

## Environment Variables

### .NET Backend

- `DATABASE_URL` — read-write Postgres connection string
- `AZURE_STORAGE_CONNECTION_STRING` — Azure Blob Storage for photo uploads and generated graphics
- `AI_HARNESS_URL` — internal URL of the Python harness (e.g., `http://ai-harness.internal:8000`)
- `AI_HARNESS_API_KEY` — shared key for authenticating requests to the harness
- `SMTP_CONNECTION_STRING` — email service for notifications (only needed if email notifications are enabled)

### Python AI Harness

- `DATABASE_URL_READONLY` — read-only Postgres connection string
- `AZURE_STORAGE_CONNECTION_STRING` — Azure Blob Storage for reading photos and writing generated graphics
- `OPENAI_API_KEY` — GPT-5.4 API key
- `WEB_SEARCH_API_KEY` — Bing or Brave Search API key (for research refresh)
- `HARNESS_API_KEY` — the shared key this service validates on incoming requests
- `DAILY_SPEND_CAP_USD` — max OpenAI API spend per day (overridable from DB settings, but needs a startup default)

### GitHub Actions (repository secrets)

- `DATABASE_URL` — read-write Postgres (already exists)
- `AZURE_STORAGE_CONNECTION_STRING` — for writing model files to blob storage

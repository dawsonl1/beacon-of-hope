# Beacon of Hope - Application Architecture

## Overview

Beacon of Hope is a full-stack web application for managing a child safehouse organization in Guam. It supports case management, donor relations, incident tracking, counseling workflows, ML-powered predictions, automated social media content generation, and a public-facing donation/engagement site.

```text
┌─────────────────────┐
│   React 19 SPA      │
│   (Vercel CDN)      │
└─────────┬───────────┘
          │ HTTPS / cookie auth
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│  .NET 10 Backend    │────▶│  AI Harness          │
│  (Azure App Service)│     │  FastAPI + GPT-4o    │
└──┬──────┬───────────┘     │  (Azure App Service) │
   │      │       │         └──────────┬───────────┘
   │      │                          │ reads (read-only)
   ▼      ▼                          ▼
┌──────┐┌────────────────────────────────────┐
│Azure ││  Azure PostgreSQL                  │
│ Blob ││  (shared database)                 │
└──────┘└─────────────────┬──────────────────┘
                               │
                               ▼
                     ┌─────────────────────┐
                     │  ML Pipeline        │
                     │  GitHub Actions     │
                     │  (nightly at 3 AM)  │
                     └─────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7 |
| UI | CSS Modules, Lucide icons, Recharts, @dnd-kit |
| Backend | .NET 10, ASP.NET Minimal APIs, Entity Framework Core |
| Auth | ASP.NET Identity (cookie-based), roles: Admin, Staff, Donor, SocialMediaManager |
| Database | Azure PostgreSQL Flexible Server (Npgsql) |
| Image Storage | Azure Blob Storage + SixLabors.ImageSharp (resize/compress) |
| ML | Python 3.12, scikit-learn, statsmodels, pandas |
| AI Content | Python FastAPI + OpenAI GPT-4o (agentic tool-use loops) |
| CI/CD | GitHub Actions (3 workflows) |
| Frontend Host | Vercel (with API rewrite proxy to Azure) |
| Backend Host | Azure App Service (westus2) |

---

## Backend Architecture

### Directory Structure

```text
backend/
├── Program.cs           # Entry point: DI, middleware, endpoint mapping, inline social endpoints
├── Endpoints/           # 14 minimal API endpoint group files
├── Models/              # EF Core entity models (62 DbSets)
├── DTOs/                # Request/response data transfer objects (14 files)
├── Mapping/             # EntityMapper — DTO → Entity one-way mapping
├── Data/                # AppDbContext, DataSeeder, IdentitySeeder
├── Services/            # 5 background hosted services
├── Migrations/          # EF Core migrations (auto-applied on startup)
└── Constants.cs         # DataCutoff date for analytics queries
```

### API Endpoints

Uses **ASP.NET Minimal APIs** (no controllers). Endpoints organized as extension method groups:

| Group | Prefix | Key Operations |
| --- | --- | --- |
| AuthEndpoints | `/api/auth` | Login (with lockout), logout, register (creates Supporter + User), `/me` session check |
| AdminEndpoints | `/api/admin` | User CRUD (roles + safehouse assignments), partner CRUD with assignments, safehouse management with monthly metrics, resident CRUD scoped by staff safehouse |
| ResidentEndpoints | `/api/admin` | Education records, health records, intervention plans, post-placement monitoring |
| IncidentEndpoints | `/api/admin/incidents` | CRUD; auto-creates StaffTask when follow_up_required=true |
| RecordingEndpoints | `/api/admin/recordings` | Process recording CRUD, emotional trends; auto-adds to case conference when NeedsCaseConference=true |
| VisitationEndpoints | `/api/admin/visitations` | Home visitation CRUD with safety concern tracking |
| StaffEndpoints | `/api/staff` | Tasks (to-do system with snooze/complete/dismiss), calendar events (linked to tasks) |
| SupporterEndpoints | `/api/admin/supporters` | Supporter profiles with donation history |
| DonationEndpoints | `/api/admin/donations` | Donation records, allocation summaries by program/safehouse |
| DonorPortalEndpoints | `/api/donor` | Donor dashboard, personal donation history, impact summary |
| ReportEndpoints | `/api/admin/reports` | Safehouse summary, resident outcomes, donation trends, incident analysis |
| PublicEndpoints | `/api` | Health check, impact summary, donations by month, education/health trends (no auth) |
| SeedEndpoints | `/api/seed` | Database seeding utilities (dev) |

**Inline Social Media Endpoints** (~1000 lines in Program.cs under `/api/admin/social/*`):

- Settings & voice guide (Admin only)
- Content facts, talking points, hashtag sets (CRUD)
- Automated posts: full lifecycle (draft → approve/reject/snooze → scheduled → published) with optimistic concurrency (409 on stale updates)
- Media library: multipart upload with consent verification, auto-compress to 1920px, thumbnail at 400px
- Fact candidates: AI-researched facts pending admin review (approve → ContentFact)
- Awareness dates, CTA configs, graphic templates, milestone rules
- Calendar view, queue count badge, AI generation trigger
- Newsletter management: CRUD, send to subscribers, public subscribe/unsubscribe

### Authentication and Security

- **Cookie auth**: `BeaconAuth` cookie, 8-hour expiration with sliding window
- **Password policy**: 12+ chars, upper/lower/digit/special required
- **Account lockout**: 5 failed attempts → 15min lockout, returns 423 status
- **Roles**: Admin, Staff, Donor, SocialMediaManager
- **Staff scoping**: Staff only see residents/data from their assigned safehouses (via `UserSafehouse` join)
- **CORS**: Restricted to localhost dev ports, Vercel (`intex2-1.vercel.app`, `intex2.dawsonsprojects.com`), Azure backend
- **Security headers**: CSP (self + Google Analytics/Tag Manager), HSTS, X-Frame-Options DENY, nosniff, strict-origin referrer
- **Auth endpoints**: no-cache headers to prevent session caching

### Background Services

| Service | Schedule | Behavior |
| --- | --- | --- |
| ContentGenerationJob | Daily at 6:00 UTC | Health-checks AI harness → plans content → generates posts → saves as drafts |
| PostReadinessJob | Every 15 minutes | Moves scheduled→ready when time arrives, unsnozes expired, emails for posts needing engagement data |
| MilestoneEvaluationJob | Every 60 minutes | Evaluates milestone rules (donation totals, donor counts, resident counts) against thresholds → auto-generates celebration posts |
| DataRetentionJob | Every 30 days | Deletes rejected posts >12mo, rejected fact candidates >90d, auto-rejects 30d snoozed posts, cleans orphaned graphics |
| MonthlyNewsletterJob | 1st of month 08:00 UTC | Calls AI harness `/generate-newsletter` with monthly aggregates → saves as draft newsletter |

### Database Startup

On startup: `MigrateAsync()` applies pending migrations → `IdentitySeeder.SeedAsync()` creates roles (Admin, Staff, Donor, SocialMediaManager) and test accounts in development → `DataSeeder` resets PostgreSQL sequences to avoid insert collisions.

---

## Frontend Architecture

### Directory Structure

```text
frontend/src/
├── App.tsx              # Root: BrowserRouter, ErrorBoundary, providers, all routes
├── main.tsx             # Entry point
├── api.ts               # apiFetch<T>() — fetch wrapper with credentials + 401 handling
├── domain.ts            # Domain enums (CaseStatus, RiskLevel, SupporterType, etc.)
├── types.ts             # Shared TypeScript interfaces
├── constants.ts         # App-wide constants
├── contexts/
│   ├── AuthContext.tsx       # Auth state, login/logout, sessionStorage persistence
│   ├── CookieConsentContext.tsx  # GDPR consent (necessary/analytics/functional)
│   └── SafehouseContext.tsx  # Active safehouse selection (admin=all, staff=assigned)
├── hooks/
│   ├── useApiFetch.ts       # Generic data fetching: { data, loading, error }
│   ├── useConsentGate.ts    # Returns boolean for consent category
│   ├── useConsentScript.ts  # Consent-gated script injection (GA4)
│   ├── useDocumentTitle.ts  # Sets document.title with app suffix
│   └── useReveal.ts         # Intersection Observer scroll animations
├── components/
│   ├── Header.tsx           # Logo, nav, auth buttons, mobile menu, newsletter bar
│   ├── Footer.tsx           # Brand, links, social, cookie settings
│   ├── ProtectedRoute.tsx   # Role-based route guard with returnUrl
│   ├── ChatWidget.tsx       # Decision-tree chatbot (not AI — static tree)
│   ├── CookieConsent.tsx    # GDPR banner (accept/reject/preferences)
│   ├── CookiePreferencesModal.tsx  # Accessible modal with Tab trapping
│   ├── AnalyticsLoader.tsx  # Consent-gated GA4 loader
│   ├── ApiError.tsx         # Error display component
│   ├── ScrollToTop.tsx      # Scroll to top on route change
│   └── admin/
│       ├── KpiCard.tsx          # Metric card with loading skeleton
│       ├── MlBadge.tsx          # Purple "ML" pill badge with sparkles icon
│       ├── Pagination.tsx       # Page controls with ellipsis
│       ├── Dropdown.tsx         # Single-select with click-outside close
│       ├── MultiSelectDropdown.tsx  # Multi-select with tags
│       ├── DatePicker.tsx       # Calendar grid picker
│       ├── TimePicker.tsx       # Time slot picker (15/30min intervals)
│       ├── DeleteConfirmDialog.tsx  # Confirm dialog with disabled state
│       └── ChartTooltip.tsx     # Recharts tooltip
├── layouts/
│   └── AdminLayout.tsx      # Sidebar nav, safehouse dropdown, grouped sections, mobile slide-out
└── pages/
    ├── HomePage.tsx         # Public landing: animated counters, impact stats, CTAs
    ├── ImpactPage.tsx       # Public: org impact visualization
    ├── DonatePage.tsx       # Donation page
    ├── DonateSuccessPage.tsx
    ├── DonorPortal.tsx      # Donor dashboard: impact, history, allocations (tabs)
    ├── LoginPage.tsx        # Auth: validation, remember me, return URL
    ├── NewsletterPage.tsx, VolunteerPage.tsx, PartnerPage.tsx
    ├── PrivacyPolicyPage.tsx
    └── admin/
        ├── HomePage.tsx         # Weekly calendar + drag-and-drop task queue
        ├── CaseloadPage.tsx     # Resident list with filters, search, pagination
        ├── ResidentDetailPage.tsx  # Tabs: profile, health, education, incidents
        ├── ResidentFormPage.tsx
        ├── IncidentsPage.tsx    # Severity-colored, tab-filtered (open/resolved)
        ├── CaseQueuePage.tsx    # Prioritized case queue
        ├── CaseConferencesPage.tsx  # Conference scheduling with ML alerts
        ├── PostPlacementPage.tsx # Discharged resident monitoring
        ├── ProcessRecordingsPage.tsx  # Counseling session recordings
        ├── VisitationsPage.tsx  # Home visitation tracking
        ├── DonorsPage.tsx       # Multi-tab: supporters, partners, donations, allocations
        ├── ReportsPage.tsx      # Tabs: overview, donations, outcomes, safehouses, ML insights
        ├── AdminDashboard.tsx   # KPI cards, trend charts, ML summaries
        ├── UsersPage.tsx        # User/role management
        └── social/
            ├── SocialPostsPage.tsx   # Content calendar, pillar balance, AI generation
            ├── SocialPhotosPage.tsx   # Media library with upload
            └── SocialSetupPage.tsx    # Platform & voice guide configuration
```

### Key Patterns

- **Code splitting**: Admin pages lazy-loaded via `lazyRetry()` — catches stale chunk errors on Vercel redeploy and auto-reloads once
- **Styling**: CSS Modules throughout (`.module.css` co-located), no CSS framework
- **Design system**: CSS variables for colors (cream/navy/amber/sage/rose), Cormorant Garamond (display) + Plus Jakarta Sans (body)
- **API client**: `apiFetch<T>()` sends credentials, dispatches `auth:unauthorized` on 401
- **Data fetching**: `useApiFetch<T>(url)` hook for reads; direct `apiFetch()` for mutations
- **Route protection**: `<ProtectedRoute allowedRoles={[...]}>` with returnUrl redirect
- **Two layouts**: PublicLayout (Header + Footer + ChatWidget) and AdminLayout (sidebar + safehouse dropdown)
- **Error handling**: Top-level ErrorBoundary + per-page PageErrorBoundary in AdminLayout
- **Testing**: Vitest + Testing Library + MSW for API mocking

### Routing Summary

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page with animated impact counters |
| `/impact` | Public | Organization impact visualization |
| `/donate` | Public | Donation page |
| `/login` | Public | Authentication with return URL |
| `/newsletter`, `/volunteer`, `/partner` | Public | Engagement pages |
| `/donor` | Donor | Personal donation dashboard with tabs |
| `/admin` | Admin/Staff | Calendar + task queue (home) |
| `/admin/dashboard` | Admin/Staff | KPI cards, trend charts, ML summaries |
| `/admin/caseload/*` | Admin/Staff | Resident case management (list/detail/form) |
| `/admin/incidents/*` | Admin/Staff | Incident tracking and follow-up |
| `/admin/queue` | Admin/Staff | Case prioritization queue |
| `/admin/conferences` | Admin/Staff | Case conference scheduling |
| `/admin/recordings/*` | Admin/Staff | Counseling session recordings |
| `/admin/visitations/*` | Admin/Staff | Home visitation tracking |
| `/admin/post-placement` | Admin/Staff | Post-discharge monitoring |
| `/admin/donors/*` | Admin/Staff | Supporter, partner, donation management |
| `/admin/reports` | Admin/Staff | Analytics dashboards (6 tabs) |
| `/admin/users` | Admin | User and role management |
| `/admin/social/*` | Admin/Staff | Social media automation (posts, photos, setup) |

### Authentication Flow

1. App mounts → `AuthContext.checkAuth()` → `GET /api/auth/me`
2. If authenticated: store in sessionStorage + state; if 401: show login gate
3. Login: `POST /api/auth/login` → store user → redirect to `/admin` or `/donor` by role
4. 401 on any API call → `auth:unauthorized` window event → auto-logout
5. ProtectedRoute checks `isAuthenticated && hasRole` before rendering

### Admin Page Pattern

All admin pages follow:
1. Mount → `useState` for data, loading, filters
2. `useEffect` → `apiFetch` with filters/pagination
3. Render: header + filters (dropdowns, search) + data table + pagination
4. Click row → navigate to detail; detail has tabs for related records
5. Edit → form page with validation → POST/PUT → navigate back

---

## Data Model

### Core Entities (62 DbSets)

```text
Safehouse
├── Resident (61+ properties)
│   ├── EducationRecord
│   ├── HealthWellbeingRecord
│   ├── ProcessRecording (counseling sessions)
│   ├── InterventionPlan
│   ├── HomeVisitation
│   ├── IncidentReport
│   ├── MlPrediction (reintegration + incident scores)
│   ├── StaffTask
│   └── CalendarEvent
├── UserSafehouse (staff assignment, many-to-many)
├── SafehouseMonthlyMetric
├── CaseConference
│   └── CaseConferenceResident
└── PartnerAssignment

ApplicationUser (ASP.NET Identity)
├── Roles: Admin, Staff, Donor, SocialMediaManager
├── UserSafehouses
├── StaffTasks
├── CalendarEvents
└── Supporter (optional FK)

Supporter
├── Donation
│   ├── DonationAllocation (by safehouse + program area)
│   └── InKindDonationItem
└── MlPrediction (churn scores)

Partner
└── PartnerAssignment (to safehouses, with program area)

Social Media Automation
├── AutomatedPost (full lifecycle: draft→approved→scheduled→published)
│   ├── MediaLibraryItem (photos with consent tracking)
│   ├── GeneratedGraphic
│   ├── ContentFact
│   ├── ContentTalkingPoint
│   └── MilestoneRule
├── SocialMediaSettings (pillar ratios, platforms, schedules)
├── VoiceGuide (tone, preferred/avoided terms)
├── HashtagSet (by pillar + platform)
├── AwarenessDate (recurring events calendar)
├── CtaConfig (active fundraising/volunteer CTAs)
├── GraphicTemplate
├── ContentFactCandidate (AI-researched, pending review)
└── SocialMediaPost (analytics: impressions, reach, engagement)

Newsletter
├── Newsletter (draft→approved→sent)
└── NewsletterSubscriber (with unsubscribe token)

ML Output
├── MlPrediction (current scores, upserted — unique on entity_type+entity_id+model_name)
└── MlPredictionHistory (append-only audit trail)

PublicImpactSnapshot (cached stats for public pages)
```

### Key Resident Properties

Demographics, case category (orphaned, trafficked, labor, abuse, OSAEC, CICL, etc.), sub-category boolean flags, special needs (PWD type, diagnosis), family status flags (4PS, solo parent, indigenous, informal settler), risk levels (initial + current), reintegration type/status, assigned social worker, dates (admission, enrolled, closed, COL-B obtained/registered).

---

## ML Pipeline

### How It Runs

Nightly at 3:00 AM UTC via GitHub Actions (`ml-pipeline.yml`). Can also be triggered manually with modes: `all` (smoke test), `predictions` (inference only). Orchestrated by `ml/run_predictions.py` which calls all 8 infer functions in sequence.

### Models (8 total, 4 pairs of predictor + explainer)

#### Reintegration Readiness (entity: resident)

- **Algorithm**: Extra Trees classifier (evolved through LR → GB → SVM → Extra Trees)
- **Target**: Reintegration status = "Completed" (binary)
- **Features** (24 continuous + case_category one-hot): age at admission, length of stay, risk levels, trauma severity score, family vulnerability score, avg health/education scores, checkup compliance, session metrics (total, positive rate, concerns), home visit metrics (favorable rate, cooperation, safety concerns), intervention achieved rate, sessions/visits per month
- **Output**: Score 0-100 (from predict_proba), label: Ready (75+), Progressing (50-74), Early Stage (25-49), Not Ready (<25)
- **Latest metrics**: Accuracy 100%, F1 100%, ROC-AUC 100% (small dataset: 48 train / 12 test)

#### Reintegration Drivers (entity: org_insight)

- **Algorithm**: OLS regression (statsmodels)
- **Purpose**: Identify top features driving reintegration completion
- **Output**: Top 12 significant features with coefficient, p-value, 95% CI, human-readable label explaining direction of effect
- **Latest**: Adjusted R^2 0.379

#### Donor Churn (entity: supporter)

- **Algorithm**: Gradient Boosting classifier
- **Target**: Supporter status = "Inactive" (binary)
- **Features** (13 continuous + categorical dummies): RFM metrics (recency, frequency, monetary total/avg/last), tenure, avg gap days, gap trend, amount trend, campaign response rate, missed campaigns, is_recurring, acquisition channel, relationship type
- **Output**: Score 0-100, label: Critical/High/Medium/Low, plus deterministic rule tier (recency > 180/90/30 days)
- **Latest metrics**: Accuracy 75%, F1 40%, ROC-AUC 66.7% (45 train / 12 test)

#### Donor Churn Drivers (entity: org_insight)

- **Algorithm**: Logistic regression (statsmodels)
- **Output**: Top 5 features with coefficient, odds ratio, p-value

#### Incident Early Warning (entity: resident, dual model)

- **Algorithm**: Two separate classifiers (selfharm + runaway)
- **Target**: incident_type in (SelfHarm, RunawayAttempt)
- **Features** (intake-only, 14 total): age, initial risk, trauma severity, family vulnerability, trauma flags (sexual_abuse, trafficked, OSAEC, physical, labor), special needs flags, case category one-hot
- **Design**: Uses only admission data (no longitudinal) so predictions are stable and repeatable
- **Output**: Two rows per resident — selfharm score + runaway score, each with top 3 risk factors
- **Latest**: Selfharm F1 66.7% / ROC-AUC 90%; Runaway F1 57.1% / ROC-AUC 56.25%

#### Incident Risk Drivers (entity: org_insight)

- **Algorithm**: Dual logistic regression (statsmodels)
- **Output**: Top 5 selfharm drivers + top 5 runaway drivers with odds ratios

#### Social Media Content (entity: org_insight)

- **Algorithm**: OLS regression (statsmodels)
- **Target**: donation_referrals (from social_media_posts)
- **Features** (before-post only): resident story flag, CTA presence, is boosted, boost budget, caption length, hashtag count, post hour, platform, media type, sentiment tone, content topic, CTA type, day of week
- **Output**: Top 5 significant features with effect size and plain-language label
- **Latest**: Adjusted R^2 0.286, MAE 14.28

#### Social Media Timing (entity: platform_timing, grid)

- **Algorithm**: Random Forest regressor
- **Target**: engagement_rate
- **Features**: Platform, post hour, day of week, is_weekend, media type, is boosted, boost budget, CTA presence, post type
- **Output**: Pre-computes all 1,176 combinations (7 platforms x 7 days x 24 hours), ranks within platform
- **Latest**: R^2 0.603, MAE 0.025

### Prediction Schema

All models write to the same tables:

| Field | Values |
| --- | --- |
| entity_type | `resident`, `supporter`, `org_insight`, `platform_timing` |
| entity_id | FK or NULL for org-level insights |
| model_name | e.g. `reintegration-readiness`, `donor-churn` |
| score | 0-100 (classifiers), raw prediction (regressors), NULL (org insights) |
| score_label | Human label or custom (e.g. "explainer", "content_strategy") |
| metadata | JSON with top drivers, risk factors, confidence info |

`ml_predictions`: Upserted (current score only, unique on entity_type + entity_id + model_name)
`ml_prediction_history`: Append-only (full audit trail)

---

## AI Harness (Social Media Agent)

A separate **Python FastAPI microservice** (`ai_harness/`) deployed to its own Azure App Service (`intex-ai-harness.azurewebsites.net`). Uses GPT-4o with agentic tool-use loops to automate social media content creation. The .NET backend calls it via HTTP with Bearer token auth.

### Endpoints

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | DB connectivity check (no auth) |
| `/plan-content` | POST | Agentic planner — GPT decides what posts to generate |
| `/generate-post` | POST | Generate a single post from a plan item |
| `/select-photo` | POST | Agentic photo selector — GPT picks best photo |
| `/generate-graphic` | POST | Create branded 1080x1080 graphic with text overlay |
| `/refresh-facts` | POST | Agentic web research — finds new facts from credible sources |
| `/predict-schedule` | POST | Optimal posting time (industry defaults, ML model pending) |
| `/generate-newsletter` | POST | Monthly newsletter generation with aggregated data |

### Agentic Workflows

All agents use `run_tool_loop()` — a generic OpenAI function-calling loop (max 10 rounds):

**Content Planner** (`planner.py`): GPT receives 8 tools to query the database:

- `get_weekly_target` → posts/week + active platforms
- `get_pillar_mix(days)` → actual vs target pillar distribution
- `get_scheduled_count` → posts already queued
- `get_unused_photos(limit)` → safehouse_life raw material
- `get_unused_facts(limit)` → the_problem raw material
- `get_talking_points(topic)` → the_solution raw material
- `get_awareness_dates(next_days)` → upcoming dates
- `get_cta_config` → active fundraising/volunteer CTA

GPT autonomously gathers context, then outputs a JSON plan balancing 5 content pillars:

- safehouse_life (30%) — humanize the org, joyful tone
- the_problem (25%) — educate about trafficking, must end with hope
- the_solution (20%) — show org credibility, specific and confident
- donor_impact (15%) — connect dollars to outcomes
- call_to_action (10%) — convert followers, urgent but not desperate

**Photo Selector** (`photo_selector.py`): GPT receives `query_photos(activity_types, limit)` tool, ranks photos by metadata only (caption, activity type), picks best match for post pillar/platform.

**Fact Researcher** (`researcher.py`): GPT receives `web_search(query)` (DuckDuckGo HTML scraping) and `get_existing_facts(category)` for dedup. Searches for trafficking/abuse/rehabilitation statistics from credible sources (UNICEF, ILO, WHO, academic journals). Returns candidates for admin review.

**Post Generator** (`llm.py`): Not agentic (direct GPT call). Assembles: voice guide from DB + pillar goals + platform constraints + raw material + 3 approved examples (few-shot) + hashtags → returns JSON `{content, hashtags}`.

### Content Generation Flow

```text
1. ContentGenerationJob (backend, daily 6 AM UTC)
2. Health-check AI harness
3. POST /plan-content → Planner agent queries DB → returns post plan
4. For each plan item:
   a. (Optional) POST /select-photo if pillar supports photos
   b. POST /generate-post → GPT writes post using voice guide
   c. If no photo: auto-generates branded graphic (Pillow, 1080x1080)
   d. POST /predict-schedule → optimal posting time
   e. Save as AutomatedPost with status="draft"
5. PostReadinessJob (every 15 min): moves scheduled→ready when time arrives
6. Admin reviews/approves/rejects in Social Posts page
7. MilestoneEvaluationJob (hourly): auto-generates celebration posts on metric milestones
```

### AI Data Isolation — Protecting Sensitive Information

The AI harness generates public-facing social media content, so it must never access or leak sensitive resident, case, or user data. This is enforced at three layers:

**1. Database layer — restricted queries (`db.py`)**

The AI harness connects via a read-only connection string (`DATABASE_URL_READONLY`) and its query functions are hard-coded to only access content and aggregate tables. GPT cannot write arbitrary SQL — it can only call the pre-built tool functions, each of which runs a fixed query. The tables the AI can read:

| Allowed (content/config) | Never accessed (sensitive) |
| --- | --- |
| `voice_guide` | `residents` |
| `social_media_settings` | `health_wellbeing_records` |
| `hashtag_sets` | `education_records` |
| `media_library` (consent-confirmed photos only) | `process_recordings` |
| `content_facts`, `content_talking_points` | `home_visitations` |
| `automated_posts` (published content + engagement) | `incident_reports` |
| `awareness_dates`, `cta_configs` | `intervention_plans` |
| `safehouse_monthly_metrics` (aggregates only) | `AspNetUsers` / identity tables |
| `calendar_events` (title + type + date only) | `supporters` (individual donor data) |
| `public_impact_snapshots` | `donations` (individual records) |
| `donations` (aggregate SUM/COUNT only for newsletters) | `staff_tasks`, `case_conferences` |

Key restrictions in the queries:
- **Photos**: Only returns rows where `consent_confirmed = true`
- **Donations**: Only accessed as aggregates (`SUM(amount)`, `COUNT(*)`) for newsletter stats — never individual donor names, emails, or transaction details
- **Calendar events**: Only returns `title`, `event_type`, `event_date` — no resident names or session details
- **Resident metrics**: Only accessed via `safehouse_monthly_metrics` (pre-aggregated counts and averages) — never individual resident records

**2. Tool layer — GPT can only call defined functions**

The agentic loops (planner, researcher, photo selector) use OpenAI function calling. GPT does not have raw database access — it can only invoke the specific tools defined in `planner.py`, `researcher.py`, and `photo_selector.py`. Each tool maps to one of the fixed queries above. There is no "run SQL" tool.

**3. Prompt layer — hard-coded safety rules in system prompt (`llm.py`)**

Every GPT call includes these non-negotiable rules in the system prompt, assembled by `build_system_prompt()`:

- Never reference specific residents by name or identifiable details
- Never use guilt-based or shame-based language
- Never pull from resident/case management data
- Always end awareness/problem posts with hope or a path forward
- Each post serves exactly ONE content pillar

These rules are hard-coded in `llm.py` and cannot be overridden by the admin-configurable voice guide. The voice guide (stored in DB) controls tone, preferred terms, and structural rules, but the safety rules are appended after it and take precedence.

---

## CI/CD and Infrastructure

### GitHub Actions Workflows

| Workflow | Trigger | Steps |
| --- | --- | --- |
| `deploy-backend.yml` | Push to `main` on `backend/**` | .NET 10 publish → Azure WebApps Deploy |
| `ml-pipeline.yml` | Nightly 3 AM UTC + manual dispatch | Python 3.12 → ETL smoke test → run predictions → write to DB |
| `deploy-ai-harness.yml` | Push to `main` on `ai_harness/**` + manual | Python zip → Kudu deploy to Azure App Service |

### Deployment Topology

| Component | Host | URL |
| --- | --- | --- |
| Frontend | Vercel (CDN) | `intex2-1.vercel.app`, `intex2.dawsonsprojects.com` |
| Backend API | Azure App Service | `intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net` |
| AI Harness | Azure App Service | `intex-ai-harness.azurewebsites.net` |
| Database | Azure PostgreSQL | `intex-db.postgres.database.azure.com:5432` |
| Blob Storage | Azure Blob | Container: `media` |

Vercel config (`vercel.json`): API rewrite `/api/:path*` → Azure backend URL; SPA fallback `/(.*) → /index.html`.

### Environment Configuration

- **Production**: Connection strings and API keys via Azure App Service settings / GitHub Secrets
- **Development**: `appsettings.Development.json` points to Azure DB directly
- **Local**: `appsettings.Local.json` → Docker PostgreSQL on port 5433, AI harness at localhost:8001
- **Frontend**: `VITE_API_URL` env var (localhost:5001 for dev, Azure URL for production)

### Secrets (GitHub Actions)

- `AZURE_WEBAPP_PUBLISH_PROFILE` — Backend deployment
- `DATABASE_URL` — ML pipeline PostgreSQL connection
- `AZURE_AI_HARNESS_SCM_CREDENTIALS` — Kudu deploy credentials

### Seed Data (17 CSV files in `/data/`)

Residents, safehouses, supporters, partners, donations, allocations, in-kind items, home visitations, process recordings, health records, education records, intervention plans, incident reports, social media posts, safehouse monthly metrics, partner assignments, public impact snapshots.

---

## Cross-Cutting Concerns

| Concern | Implementation |
| --- | --- |
| Error handling | Global middleware catches exceptions → JSON 500; validation → 400; not found → 404; business conflicts → 409 |
| Pagination | Standard page/pageSize (default 20-50, max 100) with totalCount |
| Optimistic concurrency | Social media post approve/reject checks `updatedAt` → 409 Conflict if stale |
| CORS | Restricted to known origins with credentials |
| Data protection | ASP.NET Data Protection API, file-system key persistence (`dp-keys/`) |
| Cookie consent | GDPR-compliant 3-category consent (necessary/analytics/functional), 365-day versioned cookie |
| Analytics | Google Analytics 4 loaded only after consent via `useConsentScript` hook |
| Image processing | Upload: validate type (JPEG/PNG/WebP/GIF), max 10MB, compress to 1920px, thumbnail at 400px |
| Email | SendGrid (SMTP relay at `smtp.sendgrid.net:587`) via `EmailNotificationService` — post-ready alerts, generation failures, engagement reminders, newsletter delivery |
| Chat widget | Client-side decision tree (not AI) — guides visitors to donate/volunteer/learn |
| Timestamps | UTC only throughout; ISO 8601 in JSON |
| File storage | Azure Blob in production; local `wwwroot/media/` in development |

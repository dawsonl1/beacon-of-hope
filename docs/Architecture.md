# Beacon of Hope - Application Architecture

## Overview

Beacon of Hope is a full-stack web application for managing a child safehouse organization in Guam. It supports case management, donor relations, incident tracking, counseling workflows, ML-powered predictions, automated social media content generation, and a public-facing donation/engagement site.

```text
                    Cloudflare (SSL + CDN)
                           │
                    ┌──────┴──────┐
                    │   Nginx     │
                    │  HTTP/2     │
                    ├─────────────┤
              ┌─────┤  Oracle VM  ├─────┐
              │     └──────┬──────┘     │
              ▼            ▼            ▼
     ┌──────────────┐ ┌─────────┐ ┌─────────┐
     │ .NET 10 API  │ │   AI    │ │  Vanna  │
     │ ASP.NET +    │ │ Harness │ │ Chatbot │
     │ EF Core +    │ │ FastAPI │ │ FastAPI │
     │ Identity     │ │ + GPT   │ │ + GPT   │
     └──────┬───────┘ └────┬────┘ └────┬────┘
            │              │           │
            ▼              ▼           ▼
     ┌─────────────────────────────────────┐
     │         PostgreSQL 17               │
     └─────────────────────────────────────┘
                    ▲
                    │ Nightly (GitHub Actions + SSH tunnel)
             ┌──────┴──────┐
             │ ML Pipeline │
             │ 8 models    │
             └─────────────┘
```

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7 |
| UI | CSS Modules, Lucide icons, Recharts, @dnd-kit |
| Backend | .NET 10, ASP.NET Minimal APIs, Entity Framework Core |
| Auth | ASP.NET Identity (cookie-based), roles: Admin, Staff, Donor, SocialMediaManager |
| Database | PostgreSQL 17 (Npgsql) |
| Image Storage | Azure Blob Storage + SixLabors.ImageSharp (resize/compress) |
| ML | Python 3.12, scikit-learn, statsmodels, pandas |
| AI Content | Python FastAPI + OpenAI GPT-5.4 (agentic tool-use loops) |
| Data Assistant | Python FastAPI + OpenAI GPT-5.4 (NL-to-SQL) |
| CI/CD | GitHub Actions (3 workflows) |
| Infrastructure | Oracle Cloud VM, Nginx, Cloudflare (Full Strict SSL), systemd |

---

## Backend Architecture

### Directory Structure

```text
backend/
├── Program.cs           # Entry point: DI, middleware, endpoint mapping, inline social endpoints
├── Endpoints/           # 14 minimal API endpoint group files
├── Models/              # EF Core entity models
├── DTOs/                # Request/response data transfer objects
├── Mapping/             # EntityMapper — DTO → Entity one-way mapping
├── Data/                # AppDbContext, DataSeeder (CSV bulk import), IdentitySeeder
├── Services/            # 5 background hosted services
├── Migrations/          # EF Core migrations (auto-applied on startup)
├── seed/                # 31 CSV files — complete seed data for all domain tables
└── Constants.cs         # DataCutoff date for analytics queries
```

### API Endpoints

Uses **ASP.NET Minimal APIs** (no controllers). Endpoints organized as extension method groups:

| Group | Prefix | Key Operations |
| --- | --- | --- |
| AuthEndpoints | `/api/auth` | Login (with lockout), logout, register, session check |
| AdminEndpoints | `/api/admin` | User CRUD, partner CRUD, safehouse management, resident CRUD scoped by staff safehouse |
| ResidentEndpoints | `/api/admin` | Education records, health records, intervention plans, post-placement monitoring |
| IncidentEndpoints | `/api/admin/incidents` | CRUD; auto-creates StaffTask on follow-up |
| RecordingEndpoints | `/api/admin/recordings` | Process recording CRUD, emotional trends |
| VisitationEndpoints | `/api/admin/visitations` | Home visitation CRUD with safety concern tracking |
| StaffEndpoints | `/api/staff` | Tasks (snooze/complete/dismiss), calendar events |
| SupporterEndpoints | `/api/admin/supporters` | Supporter profiles with donation history |
| DonationEndpoints | `/api/admin/donations` | Donations, allocation summaries by program/safehouse |
| DonorPortalEndpoints | `/api/donor` | Donor dashboard, donation history, impact summary |
| ReportEndpoints | `/api/admin/reports` | Safehouse comparison, outcomes, donation trends |
| PublicEndpoints | `/api` | Health check, impact data, donation progress (no auth) |
| ChatbotEndpoints | `/api/chat` | NL-to-SQL chatbot (proxies to Vanna service) |
| NewsletterEndpoints | `/api/newsletter` | Subscribe/unsubscribe, admin CRUD, send |

**Inline Social Media Endpoints** (~1000 lines in Program.cs under `/api/admin/social/*`):
Settings, voice guide, content facts, talking points, hashtag sets, automated posts lifecycle, media library, fact candidates, awareness dates, CTA configs, graphic templates, milestone rules, calendar view, AI generation trigger.

### Authentication and Security

- **Cookie auth**: `BeaconAuth` cookie, HttpOnly, Secure, SameSite=Lax, 8-hour sliding expiration
- **Password policy**: 14+ characters
- **Account lockout**: 5 failed attempts → 15-minute lockout
- **Roles**: Admin, Staff, Donor, SocialMediaManager
- **Staff scoping**: Staff only see data from their assigned safehouses (row-level filtering via `UserSafehouse` join)
- **CORS**: Restricted to known origins with credentials
- **Security headers**: CSP, HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy
- **Infrastructure**: Cloudflare Full (Strict) SSL with origin certificate, Nginx reverse proxy, fail2ban, Cloudflare-only IP restriction, API rate limiting (10r/s)

### Background Services

| Service | Schedule | Behavior |
| --- | --- | --- |
| ContentGenerationJob | Daily 6:00 UTC | Health-checks AI harness → plans content → generates posts → saves as drafts |
| PostReadinessJob | Every 15 min | Moves scheduled→ready, unsnozes expired, emails for posts needing engagement data |
| MilestoneEvaluationJob | Hourly | Evaluates milestone rules against thresholds → auto-generates celebration posts |
| DataRetentionJob | Monthly | Deletes rejected posts >12mo, rejected fact candidates >90d, cleans orphaned graphics |
| MonthlyNewsletterJob | 1st of month 08:00 UTC | Calls AI harness for newsletter generation → saves as draft |

### Database Startup & Seed

On startup: `MigrateAsync()` applies pending migrations → `IdentitySeeder` creates roles and demo accounts (admin, staff, donors, 18 social workers) → `DataSeeder` bulk-imports 31 CSV files using PostgreSQL `COPY FROM` with FK constraints deferred → `SeedDonorAccountsAsync` creates donor user accounts linked to imported supporters → sequence reset.

The database resets nightly at 4 AM UTC to ensure a clean demo experience.

---

## Frontend Architecture

### Key Patterns

- **Code splitting**: Admin pages lazy-loaded via `lazyRetry()` — catches stale chunk errors and auto-reloads
- **Styling**: CSS Modules throughout (`.module.css` co-located), no CSS framework
- **Design system**: CSS variables (cream/navy/amber/sage/rose), Cormorant Garamond + Plus Jakarta Sans
- **API client**: `apiFetch<T>()` — centralized fetch with credentials, 401 handling, error extraction
- **Route protection**: `<ProtectedRoute allowedRoles={[...]}>` with returnUrl redirect
- **Two layouts**: PublicLayout (Header + Footer + ChatWidget) and AdminLayout (sidebar + safehouse dropdown)
- **Error handling**: Top-level ErrorBoundary + per-page PageErrorBoundary
- **Testing**: Vitest + Testing Library + MSW for API mocking

### Routing

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page with animated impact counters |
| `/impact` | Public | Organization impact visualization |
| `/donate` | Public | Donation page |
| `/login` | Public | Authentication with return URL |
| `/newsletter`, `/volunteer`, `/partner` | Public | Engagement pages |
| `/donor` | Donor | Personal donation dashboard with tabs |
| `/admin` | Admin/Staff | Calendar + task queue |
| `/admin/dashboard` | Admin/Staff | KPI cards, trend charts, ML summaries |
| `/admin/caseload/*` | Admin/Staff | Resident case management |
| `/admin/incidents/*` | Admin/Staff | Incident tracking and follow-up |
| `/admin/queue` | Admin/Staff | Case prioritization queue |
| `/admin/conferences` | Admin/Staff | Case conference scheduling with ML alerts |
| `/admin/recordings/*` | Admin/Staff | Counseling session recordings |
| `/admin/visitations/*` | Admin/Staff | Home visitation tracking |
| `/admin/post-placement` | Admin/Staff | Post-discharge monitoring |
| `/admin/donors/*` | Admin/Staff | Supporter, partner, donation management |
| `/admin/reports` | Admin/Staff | Analytics dashboards (6 tabs) |
| `/admin/users` | Admin | User and role management |
| `/admin/social/*` | Admin/Staff | Social media automation |

---

## Data Model

See [schemas.md](schemas.md) for the complete data dictionary (42 tables).

### Entity Relationships

```text
Safehouse
├── Resident
│   ├── EducationRecord, HealthWellbeingRecord
│   ├── ProcessRecording, InterventionPlan
│   ├── HomeVisitation, IncidentReport
│   ├── MlPrediction (reintegration + incident scores)
│   ├── StaffTask, CalendarEvent
│   └── CaseConferenceResident
├── UserSafehouse (staff assignment, many-to-many)
├── SafehouseMonthlyMetric
├── CaseConference
└── PartnerAssignment

Supporter
├── Donation
│   ├── DonationAllocation (by safehouse + program area)
│   └── InKindDonationItem
├── DonorOutreach
└── MlPrediction (churn scores)

Social Media Automation
├── AutomatedPost (draft→approved→scheduled→published)
│   ├── MediaLibraryItem, GeneratedGraphic
│   ├── ContentFact, ContentTalkingPoint, MilestoneRule
├── SocialMediaSettings, VoiceGuide
├── HashtagSet, AwarenessDate, CtaConfig, GraphicTemplate
└── ContentFactCandidate (AI-researched, pending review)

Newsletter → NewsletterSubscriber
MlPrediction → MlPredictionHistory (append-only audit trail)
```

---

## ML Pipeline

Nightly at 3:00 AM UTC via GitHub Actions (`ml-pipeline.yml`). Connects to the production database through an SSH tunnel. Each predictive model uses GridSearchCV to compare multiple algorithms and automatically selects the best performer.

### Models (8 total, 4 pairs of predictor + explainer)

| Model | Entity | Purpose |
| --- | --- | --- |
| Reintegration Readiness | Resident | Score 0-100 indicating readiness for reintegration |
| Reintegration Drivers | Org | Top features driving reintegration (OLS regression) |
| Donor Churn | Supporter | Predict likelihood a donor stops giving |
| Donor Churn Drivers | Org | Key predictors of donor retention (logistic regression) |
| Incident Early Warning | Resident | Separate self-harm and runaway risk scores |
| Incident Risk Drivers | Org | Factors driving incident risk (logistic regression) |
| Social Media Content | Org | Content attributes that drive donation referrals (OLS) |
| Social Media Timing | Platform | Optimal posting day/hour per platform (1,176 combinations) |

All predictive models use permutation feature importance for iterative feature pruning.

---

## AI Harness (Social Media Agent)

A Python FastAPI microservice (`ai_harness/`) using GPT-5.4 with agentic tool-use loops. The .NET backend calls it via HTTP with Bearer token auth.

### Agentic Workflows

**Content Planner** (`planner.py`): GPT receives 8 tools to query the database (weekly targets, pillar mix, scheduled count, unused photos, unused facts, talking points, awareness dates, CTA config). Autonomously gathers context, then outputs a JSON plan balancing 5 content pillars: safehouse\_life (30%), the\_problem (25%), the\_solution (20%), donor\_impact (15%), call\_to\_action (10%).

**Photo Selector** (`photo_selector.py`): GPT queries and ranks photos by metadata, picks best match for post pillar/platform.

**Fact Researcher** (`researcher.py`): GPT searches the web (DuckDuckGo) for trafficking statistics from credible sources, deduplicates against existing facts, returns candidates for admin review.

**Post Generator** (`llm.py`): Assembles voice guide + pillar goals + platform constraints + raw material + few-shot examples → returns platform-formatted post content.

### AI Data Isolation

The AI harness only accesses content and aggregate tables — never resident, case, or individual donor data. This is enforced at three layers: database (read-only connection, fixed queries), tool layer (GPT can only call predefined functions, no raw SQL), and prompt layer (hard-coded safety rules in every system prompt that cannot be overridden by the admin-configurable voice guide).

---

## CI/CD and Infrastructure

### GitHub Actions Workflows

| Workflow | Trigger | Target |
| --- | --- | --- |
| `deploy-oracle.yml` | Push to `backend/**` or `frontend/**` | Oracle VM via SSH |
| `deploy-python-services.yml` | Push to `ai_harness/**` or `vanna_service/**` | Oracle VM via SSH |
| `ml-pipeline.yml` | Nightly 3 AM UTC + manual | GitHub Actions runner → SSH tunnel to Oracle DB |

### Infrastructure

| Component | Technology |
| --- | --- |
| Compute | Oracle Cloud VM (Always Free tier) |
| Web Server | Nginx (HTTP/2, gzip, security headers, Cloudflare-only access) |
| SSL | Cloudflare Full (Strict) + Origin Certificate (expires 2041) |
| Process Management | systemd (backend, ai-harness, vanna-service) |
| Database | PostgreSQL 17 (local) |
| Backups | Nightly pg\_dump with 7-day rotation |
| Monitoring | Health checks every 5 min, email alerts on failure, monthly utilization reports |
| Security | fail2ban (SSH + web), API rate limiting, SSH key-only auth |
| Anti-reclamation | CPU keepalive cron prevents Oracle idle instance reclamation |

### Nightly Reset

The database resets at 4 AM UTC daily. The reset script drops and recreates the database, the backend auto-applies migrations and seeds all 31 CSV files on startup. This ensures a clean, reproducible demo experience.

---

## Cross-Cutting Concerns

| Concern | Implementation |
| --- | --- |
| Error handling | Global middleware → JSON 500; validation → 400; not found → 404; conflicts → 409 |
| Pagination | Standard page/pageSize (default 20-50, max 100) with totalCount |
| Optimistic concurrency | Social post approve/reject checks `updatedAt` → 409 Conflict if stale |
| CORS | Restricted to known origins with credentials |
| Data protection | ASP.NET Data Protection API, file-system key persistence (`dp-keys/`) |
| Cookie consent | GDPR-compliant 3-category consent (necessary/analytics/functional) |
| Image processing | Validate type, max 10MB, compress to 1920px, thumbnail at 400px |
| Email | SendGrid — post alerts, newsletter delivery, donor welcome emails |
| Timestamps | UTC only; ISO 8601 in JSON |
| File storage | Azure Blob Storage in production; local `wwwroot/media/` in development |

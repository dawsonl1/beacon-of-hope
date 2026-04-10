# Beacon of Hope

A full-stack case management, donor relations, and AI-powered social media platform for **Beacon of Hope** -- a nonprofit organization supporting survivors of abuse and trafficking across 9 safehouses in the Philippines.

Built for BYU IS 401/413/414/455 INTEX.

**Live Site:** [intex2.dawsonsprojects.com](https://intex2.dawsonsprojects.com)

---

## Architecture

```
                           Vercel CDN
                        React 19 + Vite
                     ┌──────────────────┐
                     │    Frontend       │
                     │  TypeScript SPA   │
                     └────────┬─────────┘
                              │ HTTPS (cookie auth)
                              ▼
                     ┌──────────────────┐         ┌──────────────────┐
                     │  .NET 10 Backend │────────▶│  AI Harness      │
                     │  ASP.NET + EF    │         │  FastAPI + GPT   │
                     │  Core + Identity │         │  Content Engine  │
                     └───────┬──┬───────┘         └──────────────────┘
                             │  │                          │
                     ┌───────┘  └───────┐          ┌──────┴──────┐
                     ▼                  ▼          ▼             ▼
              ┌─────────────┐   ┌────────────┐  OpenAI     Azure Blob
              │ PostgreSQL  │   │   Vanna     │  GPT-5.4   Storage
              │ Azure DB    │   │  Chatbot    │
              └─────────────┘   └────────────┘
                     ▲
                     │ Nightly batch
              ┌──────┴──────┐
              │ ML Pipeline │
              │ scikit-learn│
              │  8 models   │
              └─────────────┘
```

| Layer | Technology | Hosting | URL |
|-------|-----------|---------|-----|
| Frontend | React 19, TypeScript, Vite | Vercel | [intex2.dawsonsprojects.com](https://intex2.dawsonsprojects.com) |
| Backend | .NET 10, EF Core, ASP.NET Identity | Azure App Service | intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net |
| Database | PostgreSQL 17 | Azure Flexible Server | intex-db.postgres.database.azure.com |
| AI Harness | Python 3.12, FastAPI, OpenAI GPT-5.4 | Azure App Service | intex-ai-harness.azurewebsites.net |
| Data Assistant | Python 3.12, OpenAI | Azure App Service | intex-vanna.azurewebsites.net |
| ML Pipeline | Python 3.12, scikit-learn | GitHub Actions (nightly) | -- |
| Email | SendGrid | SaaS | -- |
| Storage | Azure Blob Storage | Azure | -- |

---

## Features

### Public Website
- **Home Page** -- animated impact counters, mission statement, donation CTA
- **Impact Dashboard** -- live donation totals, education/health trends, safehouse metrics
- **Donate** -- one-time donations with automatic donor account creation
- **Newsletter** -- email subscription with AI-generated monthly newsletters
- **Volunteer & Partner** -- signup forms for community engagement

### Donor Portal (`/donor`)
- Personal donation history with receipt PDF export
- Impact attribution -- see exactly where your money went (education, wellbeing, operations)
- Allocation breakdown by program and safehouse

### Admin Portal (`/admin`)

**Case Management**
- Full resident lifecycle: intake, assessment, intervention, reintegration, post-placement
- Caseload view with filtering by safehouse, case status, and risk level
- ML-powered risk badges (reintegration readiness, incident early warning)
- Education records, health/wellbeing records, intervention plans
- Incident reporting with severity levels and linked follow-up tasks
- Home visitation tracking with assessment notes
- Process recordings with emotion trend analysis
- Case conferences -- multi-resident team review meetings
- Post-placement monitoring dashboard

**Staff Workspace**
- Drag-and-drop calendar with tasks and events
- To-do list with dateless tasks
- Safehouse-scoped data -- staff only see residents in their assigned safehouses

**Donor Management**
- Supporter CRM with contact info, donation history, and outreach tracking
- Partner organizations management
- Donation recording and fund allocation across programs/safehouses

**AI-Powered Social Media Automation**
- Content planning agent (GPT decides what posts to write based on 5 content pillars)
- Auto-generated posts for Instagram, Facebook, and Twitter
- Photo selection agent picks the best image from the media library
- Branded graphic generation (1080x1080 with text overlay)
- ML-optimized post scheduling (best day/hour per platform)
- Milestone detection -- auto-generates celebration posts when donation goals are hit
- Approve/edit/reject workflow with calendar view
- Engagement logging to train the ML timing model

**Newsletter System**
- AI-generated monthly newsletters pulling live data (donations, metrics, events)
- HTML email with branded design (inline CSS for email client compatibility)
- Approve, edit, and send workflow via SendGrid
- Subscriber management with one-click unsubscribe

**Data Assistant Chatbot**
- Natural language to SQL -- ask questions like "How many residents are in safehouse 3?"
- Auto-generates charts (bar, line, pie) from query results
- Conversational summaries of data
- Safehouse-scoped: staff see only their data, admins see everything
- Draggable/repositionable chat window

**Reports & Analytics**
- Dashboard with KPI cards and trend charts
- Donation analysis (by source, campaign, monthly trends)
- Resident outcomes (reintegration rates, education progress, health scores)
- Safehouse comparison metrics
- ML insights (risk distributions, key drivers, model performance)

**User Management**
- Role-based access: Admin, Staff, Donor, SocialMediaManager
- Safehouse assignment per staff member
- Account lockout after 5 failed attempts (15-min cooldown)

---

## Machine Learning Pipeline

Eight models run nightly via GitHub Actions, writing predictions to the database.

### Predictive Models

| Model | Entity | Method | Purpose |
|-------|--------|--------|---------|
| Reintegration Readiness | Resident | Stacking Classifier (10 base models) | Score 0-100 indicating readiness for reintegration |
| Donor Churn | Supporter | Stacking Classifier (9 base models) | Predict likelihood a donor stops giving |
| Incident Early Warning | Resident | Dual Gradient Boosting | Separate self-harm and runaway risk scores |
| Social Media Timing | Platform | Random Forest | Optimal posting day/hour per platform (1,176 combos) |

### Explanatory Models

| Model | Method | Purpose |
|-------|--------|---------|
| Reintegration Drivers | OLS Regression | Statistically significant factors affecting readiness |
| Donor Churn Drivers | Logistic Regression | Key predictors of donor retention |
| Incident Risk Drivers | Logistic Regression | Factors driving self-harm and runaway incidents |
| Content Effectiveness | OLS Regression | Content attributes that drive donation referrals |

All models use permutation feature importance for iterative pruning and GridSearchCV for hyperparameter tuning. Risk scores are categorized: Critical (75+), High (50-74), Medium (25-49), Low (0-24).

---

## AI Harness Endpoints

The AI harness is a FastAPI service that handles all GPT-powered content generation.

| Endpoint | Purpose |
|----------|---------|
| `POST /plan-content` | Agentic planner -- GPT uses 8 tools to inspect DB state and decide what posts to generate |
| `POST /generate-post` | Generate a single social media post with platform-specific formatting |
| `POST /select-photo` | GPT picks the best photo from the media library for a post |
| `POST /generate-graphic` | Create a branded 1080x1080 graphic with text overlay |
| `POST /predict-schedule` | ML-powered optimal posting time (falls back to industry defaults) |
| `POST /generate-newsletter` | Monthly newsletter aggregating donation stats, metrics, events |
| `POST /refresh-facts` | Web research agent finds new trafficking statistics via DuckDuckGo |
| `GET /health` | Service health check with DB connectivity status |

Content pillars: Safehouse Life (30%), The Problem (25%), The Solution (20%), Donor Impact (15%), Call to Action (10%).

---

## Login Credentials

All accounts use password: **`Test1234!@#$`**

### Core Accounts

| Role | Email | Notes |
|------|-------|-------|
| Admin | `admin@beaconofhope.org` | Full access to all safehouses, user management, social media, newsletters |
| Staff | `staff@beaconofhope.org` | Assigned to safehouses 1 & 2 |
| Donor | `donor@beaconofhope.org` | Donor portal only -- no admin access |
| Social Media Manager | `social@beaconofhope.org` | Social media post management and setup |

### Staff Social Worker Accounts

Each staff account has pre-seeded tasks, calendar events, and safehouse assignments.

**Best for demo: `sw07@beaconofhope.org`** (8 tasks, 5+ events on Feb 16)

| Account | Name | Safehouses |
|---------|------|------------|
| `sw01@beaconofhope.org` | Maria Santos | SH01, SH02 |
| `sw02@beaconofhope.org` | Elena Cruz | SH01 |
| `sw03@beaconofhope.org` | Rosa Garcia | SH02 |
| `sw04@beaconofhope.org` | Ana Reyes | SH03 |
| `sw05@beaconofhope.org` | Carmen Bautista | SH03, SH04 |
| `sw06@beaconofhope.org` | Linda Perez | SH04 |
| `sw07@beaconofhope.org` | Grace Flores | SH05, SH06 |
| `sw08@beaconofhope.org` | Joy Rivera | SH01 |
| `sw09@beaconofhope.org` | Faith Torres | SH05 |
| `sw10@beaconofhope.org` | Hope Ramos | SH06 |
| `sw11@beaconofhope.org` | Liza Mendoza | SH07 |
| `sw13@beaconofhope.org` | Diana Castro | SH07, SH08 |
| `sw14@beaconofhope.org` | Sarah Aquino | SH08 |
| `sw15@beaconofhope.org` | Ruth Villanueva | SH09 |
| `sw16@beaconofhope.org` | Esther Soriano | SH02, SH07 |
| `sw17@beaconofhope.org` | Mercy Dela Cruz | SH07, SH08 |
| `sw19@beaconofhope.org` | Alma Pascual | SH09 |
| `sw20@beaconofhope.org` | Nina Cortez | SH01, SH03 |

### Donor Accounts

60 donor accounts are auto-seeded from supporter data. All use password `Test1234!@#$`. See `INTEX/DONORLOGINS.md` for the full list.

### Important: App Date

The app treats **February 16, 2026** as "today". All seeded data, calendar events, dashboard metrics, and ML predictions are anchored to this date.

---

## Project Structure

```
intex2/
├── backend/              .NET 10 Web API
│   ├── Data/             EF Core DbContext, identity seeder, migrations
│   ├── Endpoints/        Minimal API endpoint groups
│   ├── Models/           Entity models (40+ tables)
│   ├── Services/         Background jobs (content gen, newsletters, milestones)
│   └── Migrations/       33+ EF Core migrations
├── backend.Tests/        xUnit test suite
├── frontend/             React 19 + TypeScript + Vite
│   └── src/
│       ├── pages/        30+ pages (public + admin portal)
│       ├── components/   Shared UI components
│       ├── contexts/     Auth, safehouse, cookie consent
│       ├── hooks/        useApiFetch, useReveal, useDocumentTitle
│       ├── layouts/      AdminLayout with sidebar navigation
│       └── api.ts        Centralized fetch with cookie auth
├── ai_harness/           FastAPI + GPT social media engine
│   ├── planner.py        Agentic content planner (8 tools)
│   ├── llm.py            Post generation + tool-use loop
│   ├── researcher.py     Web research agent
│   ├── photo_selector.py Agentic photo picker
│   └── graphics.py       Branded graphic generation
├── vanna_service/        Natural language SQL chatbot
├── ml/                   Machine learning pipeline
│   ├── reintegration/    Readiness prediction + drivers
│   ├── churn/            Donor churn prediction + drivers
│   ├── incident/         Early warning + risk drivers
│   ├── social_media/     Timing optimization + content effectiveness
│   └── run_all.py        Orchestrator (nightly via GitHub Actions)
├── models/               Trained model artifacts (.sav)
├── data/                 17 CSV seed files (~2.8 MB)
├── INTEX/                Project docs, requirements, architecture
├── .github/workflows/    CI/CD (backend, AI harness, Vanna, ML pipeline)
└── CLAUDE.md             Agent instructions
```

---

## Local Development

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.12](https://www.python.org/) (for AI harness / ML)
- [Docker](https://www.docker.com/) (optional, for local PostgreSQL)

### Database

Option A -- Local PostgreSQL via Docker:
```bash
docker compose -f docker-compose.dev.yml up -d
```
Creates a PostgreSQL 17 instance on port 5433.

Option B -- Connect to Azure (requires VPN or firewall rule):
```
Host=intex-db.postgres.database.azure.com;Port=5432;Database=postgres
```

### Backend

```bash
cd backend
# Create .env from template and fill in your connection string
cp .env.example .env
dotnet restore
dotnet run
```
Runs on `http://localhost:5000`. Migrations apply automatically on startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### AI Harness (optional)

```bash
cd ai_harness
pip install -r requirements.txt
uvicorn ai_harness.app:app --port 8001
```

### Vanna Chatbot (optional)

```bash
cd vanna_service
pip install -r requirements.txt
uvicorn vanna_service.app:app --port 8002
```

---

## Deployment

All services auto-deploy to Azure via GitHub Actions on push to `main`:

| Service | Trigger Path | Target |
|---------|-------------|--------|
| Backend | `backend/**` | Azure App Service (`intex-backend`) |
| AI Harness | `ai_harness/**` | Azure App Service (`intex-ai-harness`) |
| Vanna Service | `vanna_service/**` | Azure App Service (`intex-vanna`) |
| ML Pipeline | Nightly cron (3 AM UTC) | GitHub Actions runner |

**Frontend** auto-deploy is disabled. Deploy manually:
```bash
cd frontend && npx vercel --prod
```

### Database Migrations

Migrations run automatically at backend startup via `MigrateAsync()`. To create a new migration:
```bash
dotnet ef migrations add YourMigrationName --project backend
```
Commit and push the migration files -- the backend applies them on next deploy.

---

## Security

- **Authentication:** Cookie-based sessions (HttpOnly, Secure, SameSite) via ASP.NET Identity
- **Authorization:** Role-based access control (Admin, Staff, Donor, SocialMediaManager) with safehouse-level data scoping
- **Account Lockout:** 5 failed attempts triggers 15-minute lockout
- **Password Policy:** Minimum 14 characters
- **Security Headers:** CSP, HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy
- **Data Isolation:** AI harness reads only content/config tables -- never accesses resident or case data
- **Secrets Management:** All credentials in Azure App Service environment variables, never in source

---

## Background Jobs

Five background services run continuously in the .NET backend:

| Job | Schedule | Purpose |
|-----|----------|---------|
| ContentGenerationJob | Daily 6:00 AM UTC | Plans and generates social media posts via AI harness |
| PostReadinessJob | Every 15 min | Moves scheduled posts to ready, expires snoozed posts |
| MilestoneEvaluationJob | Hourly | Generates celebration posts when donation milestones are hit |
| MonthlyNewsletterJob | 1st of month, 8:00 AM UTC | Generates monthly newsletter draft |
| DataRetentionJob | Monthly | Purges old rejected content per retention policy |

---

## Team Workflow

- Never push directly to `main` -- use feature branches and open PRs
- Secrets go in `.env` files (never committed)
- Database migrations auto-apply on startup
- ML model artifacts use `.sav` extension (`.pkl` is gitignored)

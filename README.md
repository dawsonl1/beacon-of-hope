# Beacon of Hope

A full-stack case management, donor relations, and AI-powered social media platform for a nonprofit supporting survivors of abuse and trafficking across 9 safehouses in the Philippines.

**Live:** [beaconofhope.dawsonsprojects.com](https://beaconofhope.dawsonsprojects.com)

---

## Architecture

```
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

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript, Vite |
| Backend API | .NET 10, EF Core, ASP.NET Identity |
| AI Content Engine | Python 3.12, FastAPI, GPT-5.4 (agentic tool-use) |
| Data Assistant | Python 3.12, FastAPI, GPT-5.4 (NL-to-SQL) |
| ML Pipeline | scikit-learn, statsmodels (8 models, nightly batch) |
| Database | PostgreSQL 17 |
| Infrastructure | Oracle Cloud VM, Nginx, Cloudflare, systemd |
| CI/CD | GitHub Actions (deploy on push, ML nightly via SSH tunnel) |

---

## Features

### Public Website
- Animated impact counters with live donation totals and education/health trends
- One-time donations with automatic donor account creation
- AI-generated monthly newsletters with subscriber management
- Volunteer and partner signup forms

### Donor Portal
- Personal donation history with receipt PDF export
- Impact attribution showing exactly where funds were allocated
- Breakdown by program area and safehouse

### Admin Portal

**Case Management**
- Full resident lifecycle: intake, assessment, intervention, reintegration, post-placement
- ML-powered risk badges (reintegration readiness, incident early warning)
- Education records, health/wellbeing records, intervention plans
- Incident reporting with severity levels and linked follow-up tasks
- Home visitation tracking, process recordings with emotion trend analysis
- Case conferences for multi-resident team reviews
- Post-placement monitoring dashboard

**Staff Workspace**
- Drag-and-drop calendar with tasks and events
- Safehouse-scoped data -- staff only see residents in their assigned safehouses
- Case claiming and assignment workflow

**Donor Management**
- Supporter CRM with donation history and outreach tracking
- Partner organization management
- Fund allocation across programs and safehouses

**AI Social Media Automation**
- Agentic content planner (GPT inspects DB state via 8 tools to decide what to post)
- Auto-generated posts for Instagram, Facebook, and Twitter
- Photo selection agent picks the best image from the media library
- Branded graphic generation (1080x1080 with text overlay)
- ML-optimized post scheduling (best day/hour per platform)
- Milestone detection -- auto-generates celebration posts when donation goals are hit
- Approve/edit/reject workflow with content calendar view

**Newsletter System**
- AI-generated monthly newsletters pulling live donation stats and metrics
- HTML email with branded design (inline CSS for email client compatibility)
- Approve, edit, and send workflow via SendGrid

**Data Assistant Chatbot**
- Natural language to SQL -- "How many residents are in safehouse 3?"
- Auto-generates charts from query results
- Safehouse-scoped: staff see only their data, admins see everything

**Reports & Analytics**
- Dashboard with KPI cards and trend charts
- Donation analysis by source, campaign, and monthly trends
- Resident outcomes (reintegration rates, education progress, health scores)
- Safehouse comparison metrics
- ML insights with risk distributions and key drivers

---

## Machine Learning Pipeline

Eight models run nightly via GitHub Actions, connecting to the production database through an SSH tunnel. Results are written by a restricted `ml_pipeline` database user with write access only to prediction tables.

### Predictive Models

| Model | Candidates Evaluated | Purpose |
|-------|---------------------|---------|
| Reintegration Readiness | 11 (incl. stacking ensemble) | Score 0-100 indicating readiness for reintegration |
| Donor Churn | 10 (incl. stacking ensemble) | Predict likelihood a donor stops giving |
| Incident Early Warning | 4 per risk type | Separate self-harm and runaway risk scores |
| Social Media Timing | 9 (incl. stacking ensemble) | Optimal posting day/hour per platform |

### Explanatory Models

| Model | Method | Purpose |
|-------|--------|---------|
| Reintegration Drivers | OLS Regression | Statistically significant factors affecting readiness |
| Donor Churn Drivers | Logistic Regression | Key predictors of donor retention |
| Incident Risk Drivers | Logistic Regression | Factors driving self-harm and runaway incidents |
| Content Effectiveness | OLS Regression | Content attributes that drive donation referrals |

Each predictive model uses GridSearchCV to compare multiple algorithm types (Logistic Regression, Random Forest, Gradient Boosting, SVM, KNN, AdaBoost, ExtraTrees, stacking ensembles, etc.) and automatically selects the best performer. Models are retrained nightly so the winning algorithm can change as new data arrives. Permutation feature importance drives iterative feature pruning to prevent overfitting.

---

## Project Structure

```
beacon-of-hope/
├── backend/              .NET 10 Web API (179+ endpoints)
│   ├── Data/             EF Core DbContext, seeders, 33+ migrations
│   ├── Endpoints/        Minimal API endpoint groups
│   ├── Models/           Entity models (49 tables)
│   └── Services/         5 background jobs
├── backend.Tests/        xUnit test suite
├── frontend/             React 19 + TypeScript + Vite
│   └── src/
│       ├── pages/        30+ pages (public + admin portal)
│       ├── components/   Shared UI components
│       ├── contexts/     Auth, safehouse, cookie consent
│       └── api.ts        Centralized fetch with cookie auth
├── ai_harness/           FastAPI content engine
│   ├── planner.py        Agentic content planner (8 tools)
│   ├── llm.py            Post generation with tool-use loop
│   ├── researcher.py     Web research agent
│   └── graphics.py       Branded graphic generation
├── vanna_service/        Natural language SQL chatbot
├── ml/                   Machine learning pipeline (8 models)
│   ├── reintegration/    Readiness prediction + drivers
│   ├── churn/            Donor churn prediction + drivers
│   ├── incident/         Early warning + risk drivers
│   └── social_media/     Timing optimization + content effectiveness
├── models/               Trained model artifacts (.sav)
├── docs/                 Architecture, schemas, security documentation
└── .github/workflows/    CI/CD pipelines
```

---

## Security

- **Authentication:** Cookie-based sessions (HttpOnly, Secure, SameSite=Lax) via ASP.NET Identity
- **Authorization:** Role-based access (Admin, Staff, Donor, SocialMediaManager) with safehouse-level row filtering
- **Account Lockout:** 5 failed attempts triggers 15-minute lockout
- **Password Policy:** Minimum 14 characters
- **Security Headers:** CSP, HSTS, X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Infrastructure:** Cloudflare Full (Strict) SSL, Nginx reverse proxy, fail2ban, origin IP restriction, API rate limiting
- **Data Isolation:** AI harness reads only content/config tables -- never accesses resident or case data
- **Secrets Management:** Production credentials in server-side config files, never in source

---

## Deployment

All services auto-deploy via GitHub Actions on push to `main`:

| Trigger | Service | Target |
|---------|---------|--------|
| `backend/**` or `frontend/**` | Backend + Frontend | Oracle VM via SSH |
| `ai_harness/**` or `vanna_service/**` | Python Services | Oracle VM via SSH |
| Nightly 3 AM UTC | ML Pipeline | GitHub Actions (SSH tunnel to DB) |

---

## Local Development

### Prerequisites
- .NET 10 SDK
- Node.js 20+
- Python 3.12 (for AI harness / ML)
- PostgreSQL 17

### Backend
```bash
cd backend
dotnet restore && dotnet run
```
Runs on `http://localhost:5000`. Migrations apply automatically on startup.

### Frontend
```bash
cd frontend
npm install && npm run dev
```
Runs on `http://localhost:5173` with proxy to backend.

### AI Harness
```bash
cd ai_harness
pip install -r requirements.txt
uvicorn ai_harness.app:app --port 8001
```

### Vanna Chatbot
```bash
cd vanna_service
pip install -r requirements.txt
uvicorn vanna_service.app:app --port 8002
```

---

## Demo Credentials

All accounts use password: `Test1234!@#$%^`

| Role | Email | Access |
|------|-------|--------|
| Admin | `admin@beaconofhope.org` | Full access to all features and safehouses |
| Staff | `sw07@beaconofhope.org` | Best demo account -- 8 tasks, calendar events, 2 safehouses |
| Donor | `donor@beaconofhope.org` | Donor portal only |
| Social Media | `social@beaconofhope.org` | Social media management |

The app treats **February 16, 2026** as "today". All data, metrics, and predictions are anchored to this date.

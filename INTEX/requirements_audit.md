# INTEX Requirements Audit

Comprehensive list of all requirements extracted from `rubric.md` and `intex_requirements.md`. Items marked **UNCLEAR** lack sufficient detail in the source documents to fully evaluate.

---

## IS 401 - Project Management & Systems Design (20 pts)

### Monday - Requirements (6.5 pts)

| # | Requirement | Status |
|---|-------------|--------|
| 401-1 | Identify Scrum Master and Product Owner | |
| 401-2 | Create 2 realistic customer personas for the 2 most important target users, with justification | |
| 401-3 | Journey map showing key user steps and pain points | |
| 401-4 | Problem statement clearly describing the specific problem the product solves | |
| 401-5 | MoSCoW table listing every INTEX requirement + at least 5 nice-to-have ideas | |
| 401-6 | Identify one feature you chose NOT to build and why | |
| 401-7 | Product backlog with clear product goal and at least 12 backlog cards | |
| 401-8 | Sprint "Monday" backlog: sprint goal, at least 8 cards, each with point estimate and exactly 1 person assigned | |
| 401-9 | Screenshot of Monday sprint backlog taken before starting Monday work | |
| 401-10 | Burndown chart set up to track all progress throughout the week | |
| 401-11 | Figma wireframe: brainstorm 3 most important screens, draw wireframe for each in Desktop view | |

### Tuesday - Design (4 pts)

| # | Requirement | Status |
|---|-------------|--------|
| 401-12 | Sprint "Tuesday" backlog: sprint goal, at least 8 cards, point estimates, 1 person each | |
| 401-13 | Screenshot of Tuesday sprint backlog before starting Tuesday work | |
| 401-14 | 3 screenshots of each of 3 different AI-generated UI designs (9 screenshots total) | |
| 401-15 | 5 questions asked to AI about each of the 3 UI designs | |
| 401-16 | Sentence or two summarizing takeaways from AI feedback on each design | |
| 401-17 | Design decision: indicate which UI was chosen with a paragraph justifying why | |
| 401-18 | List 3 changes made to the original AI output | |
| 401-19 | Tech stack diagram with logos for frontend, backend, and database technologies | |

### Wednesday - One Working Page (4.5 pts)

| # | Requirement | Status |
|---|-------------|--------|
| 401-20 | Sprint "Wednesday" backlog: sprint goal, at least 8 cards, point estimates, 1 person each | |
| 401-21 | Screenshot of Wednesday sprint backlog before starting Wednesday work | |
| 401-22 | Screenshots of at least 5 pages in both desktop and mobile views | |
| 401-23 | One working page deployed to cloud that persists data in the database | |
| 401-24 | User feedback: show site to a real person (relevant to target persona), watch them use it, record 5 specific things to change | |
| 401-25 | Up-to-date burndown chart reflecting progress so far | |

### Thursday - Iterate (5 pts)

| # | Requirement | Status |
|---|-------------|--------|
| 401-26 | Sprint "Thursday" backlog: sprint goal, at least 8 cards, point estimates, 1 person each | |
| 401-27 | Screenshot of Thursday sprint backlog before starting Thursday work | |
| 401-28 | OKR metric: track and display one meaningful metric in the app with explanation of why it's the most important measure of success | |
| 401-29 | Lighthouse accessibility score of at least 90% on every page | |
| 401-30 | Every page resizes appropriately for desktop and mobile views (responsiveness) | |
| 401-31 | Retrospective: each person writes 2 things going well, 2 things that could be better, and their greatest personal contribution | |
| 401-32 | Team reflection on how well the solution solves the customer problem | |

### General 401

| # | Requirement | Status |
|---|-------------|--------|
| 401-33 | Copy of Figjam board submitted via Learning Suite on Monday | |
| 401-34 | Figjam board filled out throughout the week, each day's section due by 11:59pm that night | |

---

## IS 413 - Enterprise Application Development (In-Depth Audit)

### Public Pages (Non-Authenticated)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 413-1 | **Home / Landing Page:** Modern, professional; introduces the organization and its mission; clear CTAs for visitors to engage or support | PASS | `HomePage.tsx` — Hero with mission statement, animated impact stats from live API, 4 engagement cards (Donate/Volunteer/Partner/Advocate), donation-level CTAs ($500/$2k/$8k), testimonials, process breakdown. Solid. |
| 413-2 | **Impact / Donor-Facing Dashboard:** Aggregated, anonymized data showing organization impact (outcomes, progress, resource use); clear and visually understandable | PASS | `ImpactPage.tsx` — Live stats (girls served, donations, safehouses, in-care), North Star OKR (reintegrations vs 2026 goal), monthly donations bar chart, program allocation chart. All data aggregated, no PII. Stories explicitly anonymized. Also has authenticated `DonorPortal.tsx` with personalized donor impact. |
| 413-3 | **Login Page:** Username/password authentication with proper validation and error handling | PASS | `LoginPage.tsx` — Email regex validation, 12-char password minimum, field-level errors, general error banner, ARIA live regions, loading state, password visibility toggle, role-based redirect (Admin→/admin, Donor→/donor). Backend uses ASP.NET Identity with 5-attempt lockout (15 min). |
| 413-4 | **Privacy Policy Page:** Explains data usage; linked from footer (at minimum on home page) | PASS | `PrivacyPolicyPage.tsx` — 12-section GDPR-compliant policy with table of contents, minors' data protection (Art. 9), data retention schedules, rights (Art. 15-21), cookie table, breach notification. Linked from footer "Legal" section. Print button. |
| 413-5 | **Cookie Consent:** GDPR-compliant cookie consent notification | PASS | `CookieConsent.tsx` + `CookiePreferencesModal.tsx` + `CookieConsentContext.tsx` — Three actions (Reject/Manage/Accept All), 3 cookie categories (Necessary always-on, Analytics opt-in, Functional opt-in), consent stored in versioned JSON cookie, analytics cleanup on revocation, keyboard navigation, footer "Cookie Settings" button to revisit. Fully functional, not cosmetic. |

### Admin / Staff Portal (Authenticated Only)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 413-6 | **Admin Dashboard:** High-level overview of key metrics: active residents across safehouses, recent donations, upcoming case conferences, summarized progress data; "command center" for daily operations | PASS | `AdminDashboard.tsx` — KPI cards (active residents, open incidents by severity, monthly donations with % change, upcoming conferences + next date), quick action buttons (add resident/log donation/create recording), recent donations list, active residents trend chart, flagged cases trend chart, donations by channel bar chart. All from live DB via `/api/admin/metrics`. |
| 413-7 | **Donors & Contributions - Supporter Profiles:** View, create, manage supporter profiles; classify by type (monetary donor, volunteer, skills contributor, etc.) and status (active/inactive) | PASS | `DonorsPage.tsx` (Supporters tab) + `SupporterDetailPage.tsx` + `SupporterFormPage.tsx` — Types: MonetaryDonor/Volunteer/SkillsContributor/SocialMediaAdvocate. Statuses: Active/Inactive/Lapsed/Prospective. Full CRUD. Edit pre-populates. Delete has confirmation dialog. |
| 413-8 | **Donors & Contributions - Contribution Tracking:** Track all types (monetary, in-kind, time, skills, social media); record and review donation activity | PASS (minor gap) | `DonationFormPage.tsx` — All 5 types with conditional fields per type. Monetary: amount+currency. InKind: estimated value. Time: impact unit. Skills: impact unit+value. SocialMedia: impact unit. **Gap:** In-kind donations lack an item description field (only captures monetary estimate, not WHAT was donated). **Gap:** No delete button in the donation form UI (endpoint exists but unreachable from form). |
| 413-9 | **Donors & Contributions - Allocation View:** View donation allocations across safehouses and program areas | PASS (read-only) | `DonorsPage.tsx` (Allocations tab) — Two summary tables: by program area and by safehouse (count + total). **Limitation:** Read-only aggregates only. No CRUD for individual allocations (no POST/PUT/DELETE endpoints, no allocation form). Requirement says "supports viewing" which is met, but staff cannot manage allocations. |
| 413-10 | **Caseload Inventory - Resident Profiles:** View, create, update resident profiles; demographics, case category/sub-categories, disability info, family socio-demographic profile, admission details, referral info, assigned social workers, reintegration tracking | PASS (minor gaps) | `ResidentFormPage.tsx` + `ResidentDetailPage.tsx` + `CaseloadPage.tsx` — **Present in form:** sex, DOB, religion, birth status, place of birth, case category (dropdown), 10 sub-category booleans, isPwd/pwdType/hasSpecialNeeds/diagnosis, all 5 family fields (4Ps/solo parent/indigenous/parent PWD/informal settler), date of admission, referral source/agency, assigned social worker, reintegration type/status. **Missing from form (in model but not rendered):** presentAge, lengthOfStay, dateColbRegistered, dateColbObtained, dateCaseStudyPrepared, initialRiskLevel. These are minor — auto-calculable or administrative fields. |
| 413-11 | **Caseload Inventory - Filtering/Search:** Filter and search by case status, safehouse, case category, and other key fields | PASS | `CaseloadPage.tsx` — Text search (internal code, case control #, social worker). Dropdowns: case status, safehouse, case category, risk level. Sorting by 7 columns with direction toggle. Filter chips with clear buttons. Dynamic filter options from `/api/admin/residents/filter-options`. **Not filterable:** referral source, admission date range, reintegration status — but the 3 required fields (status, safehouse, category) are all present. |
| 413-12 | **Process Recording - Entry Form:** Forms for entering dated counseling session notes; captures session date, social worker, session type (individual/group), emotional state observed, narrative summary, interventions applied, follow-up actions | PASS | `RecordingFormPage.tsx` — All required fields present: session date, social worker (pre-filled), session type (7 options including Individual Counseling and Group Therapy), emotional state start + end (9-point scale), session narrative, interventions applied, follow-up actions. Bonus: voice memo transcription via Gemini API, progress/concerns/referral checkboxes. **Minor:** Two form fields (`needsCaseConference`, `readyForReintegration`) are captured in UI but NOT included in the submit payload — silently lost on save. |
| 413-13 | **Process Recording - History View:** View full history of process recordings for any resident, displayed chronologically | PASS | `ProcessRecordingsPage.tsx` — Filter by resident dropdown, sort by date (newest/oldest) or social worker, paginated (15/page), table shows date/resident/worker/type/emotional state/narrative preview/flags. Click through to `RecordingDetailPage.tsx` for full detail. Emotional trajectory visualization on `ResidentDetailPage.tsx`. |
| 413-14 | **Home Visitation - Logging:** Log home and field visits; visit type, home environment observations, family cooperation level, safety concerns, follow-up actions | PASS | `VisitationFormPage.tsx` + `VisitationDetailPage.tsx` — All 5 visit types present (Initial Assessment, Routine Follow-Up, Reintegration Assessment, Post-Placement Monitoring, Emergency). Fields: observations (textarea), family cooperation level (Cooperative/Partially/Uncooperative/Hostile), safety concerns (boolean with red alert), follow-up needed + notes. Additional: location, family members present, purpose, outcome. Full CRUD. **Limitation:** Observations is a single textarea, not structured (no checklists for home conditions). |
| 413-15 | **Case Conferences:** View case conference history and upcoming conferences for each resident | PARTIAL | `CaseConferencesPage.tsx` + `VisitationsPage.tsx` (Conferences tab) — Shows upcoming vs past conferences with resident code, date, category, status. **Gaps:** (1) No way to CREATE/SCHEDULE new conferences from the UI — the POST endpoint exists for intervention plans but there is no form page or "Add Conference" button. (2) Conference list is GLOBAL, not filterable per-resident — no "view this resident's conferences" on ResidentDetailPage. (3) Hard 50-item limit, no pagination. |
| 413-16 | **Reports & Analytics - Donation Trends:** Donation trends over time | PASS | `ReportsPage.tsx` (Donations tab) — Monthly donation trends line chart (time-series), donations by source bar chart, donations by campaign bar chart. Data from `/api/impact/donations-by-month`, `/api/admin/reports/donations-by-source`, `/api/admin/reports/donations-by-campaign`. |
| 413-17 | **Reports & Analytics - Resident Outcomes:** Resident outcome metrics (education progress, health improvements) | PASS (shallow) | `ReportsPage.tsx` (Outcomes tab) — Education: monthly average progress % line chart from `/api/impact/education-trends`. Health: multi-line chart (Health/Nutrition/Sleep/Energy scores) from `/api/impact/health-trends`. Reintegration donut chart with success %. **Weakness:** Education is just an aggregate % — no breakdown by grade level, attendance, enrollment. Health metrics have no scale explanation (what is "good"?). No comparison to initial assessments. |
| 413-18 | **Reports & Analytics - Safehouse Comparisons:** Safehouse performance comparisons | PASS | `ReportsPage.tsx` (Safehouses tab) — Comparison table with occupancy (current/capacity/%), active residents, incidents, sessions, avg education %, avg health score per safehouse. Occupancy bar chart with color coding. Incidents bar chart. **Weakness:** No trend lines over time, no staff-to-resident ratio, no cost metrics. But side-by-side comparison IS present. |
| 413-19 | **Reports & Analytics - Reintegration:** Reintegration success rates | PASS | Reintegration donut chart in Outcomes tab showing success rate %. Breakdown by type (Family Reunification/Foster Care/Adoption/Independent Living). `/api/admin/reports/reintegration-rates` returns by-type-and-safehouse data + total-by-safehouse. Also shown on ImpactPage as North Star OKR. |
| 413-20 | **Reports & Analytics - AAR Alignment:** Consider structuring reports to align with Annual Accomplishment Report format (services: caring/healing/teaching, beneficiary counts, program outcomes) | FAIL | **No AAR-aligned structure exists anywhere.** No categorization of services as "Caring/Healing/Teaching". No beneficiary counts by service category. No AAR-specific endpoint or report page. The data to support this exists (health records = healing, education = teaching, shelter = caring) but it's never organized into AAR format. The requirement says "consider" but a harsh grader would note this is completely absent. |

### Technical Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 413-21 | Backend: .NET 10 / C# | PASS | `backend.csproj`: `<TargetFramework>net10.0</TargetFramework>` |
| 413-22 | Frontend: React / TypeScript (Vite) | PASS | `package.json`: React 19.2.4, TypeScript 6.0.2, Vite 8.0.4. Strict mode enabled. |
| 413-23 | Database: Azure SQL, MySQL, or PostgreSQL (relational) | PASS | PostgreSQL via `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.1. `AppDbContext` with 25+ DbSets. |
| 413-24 | App deployed to cloud (Azure recommended) | PASS | Backend: Azure App Service via `.github/workflows/deploy-backend.yml`. Frontend: Vercel via `vercel.json` with API rewrites to Azure. |
| 413-25 | Database deployed to cloud | PASS | Azure Database for PostgreSQL Flexible Server at `intex-db.postgres.database.azure.com`. SSL required. |
| 413-26 | Data validation and error handling throughout | PARTIAL | **Backend:** `DtoValidator` exists and is used on major DTOs (Recording, Resident, Donation, Login). **But:** 9+ DTOs have ZERO validation attributes (Incident, Education, Health, Intervention, StaffTask, CalendarEvent). Visitation/Education/Health/Intervention/Incident POST/PUT endpoints skip `DtoValidator.Validate()` entirely. 15+ `NotFound()` responses return no error message. **Frontend:** LoginPage has good validation. ErrorBoundary exists but shows generic "Something went wrong". API error handling is inconsistent across pages. |
| 413-27 | Good code quality (as taught in class) | PARTIAL | **Good:** Clean frontend structure (pages/components/contexts/hooks), TypeScript strict mode, CSS modules, ESLint configured. **Bad:** `Program.cs` is a **2,883-line monolith** — all 40+ endpoints, DTOs, mappers, and validators in one file. No controllers, no services, no separation of concerns. This is a significant code quality issue. |
| 413-28 | Finishing touches: titles, icons, logos, consistent look and feel, pagination, speed | PARTIAL | **Present:** Favicon (SVG), logo, Pagination component used on most list pages, loading spinners on most pages. **Missing:** No dynamic page titles (all pages show same static `<title>` from index.html — should be "Caseload \| Beacon of Hope" etc.). No 404/not-found page (navigating to invalid route shows blank/error). Inconsistent pagination (2 pages use custom implementation instead of shared Pagination component). Inconsistent loading state styling (some use Loader2 spinner, others show plain text). |

### Misc

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 413-29 | Any additional pages required to support functionality in other portions of the project (security, social media, accessibility, partner features) | PASS | DonatePage (Stripe integration), DonateSuccessPage, DonorPortal, NewsletterPage. Partner model exists in backend. Social media post tracking in DB. ARIA attributes throughout. Cookie consent management. |

### IS 413 Audit Summary

| Grade | Count | Items |
|-------|-------|-------|
| PASS | 19 | 413-1, 413-2, 413-3, 413-4, 413-5, 413-6, 413-7, 413-8, 413-9, 413-10, 413-11, 413-12, 413-13, 413-14, 413-16, 413-19, 413-21, 413-22, 413-23, 413-24, 413-25, 413-29 |
| PASS (with noted weaknesses) | 3 | 413-17, 413-18 (shallow metrics), 413-8 (in-kind gap) |
| PARTIAL | 4 | 413-15 (no create/schedule conferences), 413-26 (inconsistent validation), 413-27 (monolith Program.cs), 413-28 (no dynamic titles, no 404 page) |
| FAIL | 1 | 413-20 (AAR alignment completely absent) |

### Critical Items to Fix (Priority Order)

1. **413-15 — Case Conference Creation:** Add a form/route to create and schedule case conferences. Add per-resident conference filtering on ResidentDetailPage.
2. **413-20 — AAR Report Structure:** Add a report section or tab that categorizes services as Caring/Healing/Teaching with beneficiary counts per category.
3. **413-26 — Backend Validation:** Add validation attributes to the 9 bare DTOs (Incident, Education, Health, Intervention, StaffTask, CalendarEvent). Call `DtoValidator.Validate()` in all POST/PUT endpoints.
4. **413-28 — Dynamic Page Titles:** Add `document.title` updates per page. Add a catch-all 404 route in App.tsx. Standardize pagination and loading state components.
5. **413-27 — Code Organization:** At minimum, extract DTOs and mappers into separate files. Ideally refactor endpoints into controller-like groupings.
6. **413-12 — Lost Form Fields:** Fix `RecordingFormPage.tsx` to include `needsCaseConference` and `readyForReintegration` in the submit payload, or remove them from the form.

---

## IS 414 - Security (20 pts)

### Confidentiality / Encryption (1.5 pts)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-1 | Use HTTPS/TLS for all public connections; valid certificate | 1 | |
| 414-2 | Redirect HTTP traffic to HTTPS | 0.5 | |

### Authentication (6 pts)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-3 | Username/password authentication (ASP.NET Identity or equivalent); identity DB can be SQLite or DB server | 3 | |
| 414-4 | Require better passwords than default `PasswordOptions` (strictly graded per class instruction, NOT per Microsoft docs values) | 1 | **UNCLEAR** - exact password policy requirements depend on what was taught in class; AI-suggested policies that conflict with class instruction will NOT receive points |
| 414-5 | Pages and API endpoints require auth where needed; unauthenticated users can browse home page and other public pages | 1 | |
| 414-6 | RBAC: Only admin can CUD (Create, Update, Delete) including at endpoint level | 1.5 | |

### Authorization / Roles

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-7 | Admin role can add, modify, delete data | (included in 414-6) | |
| 414-8 | Donor role: authenticated donors can see their donor history and donation impact | **UNCLEAR** - mentioned in requirements text but NOT in rubric scoring; unclear how heavily weighted | |
| 414-9 | Non-authenticated users see public pages (homepage, privacy policy, etc.) | (included in 414-5) | |
| 414-10 | Optional: staff/employee role that differs from admin | **UNCLEAR** - "you may choose" whether to have this | |

### Integrity (1 pt)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-11 | Data can only be changed/deleted by authorized, authenticated user | 1 | |
| 414-12 | Confirmation required to delete data | (included in 414-11) | |

### Credentials (1 pt)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-13 | Credentials stored securely: secrets manager, `.env` file not in repo, or OS environment variables | 1 | |
| 414-14 | No credentials in code or public repositories | (included in 414-13) | |

### Privacy (2 pts)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-15 | GDPR-compliant privacy policy content, tailored to the site, linked from footer (at minimum on home page) | 1 | |
| 414-16 | GDPR-compliant cookie consent notification, fully functional | 1 | |
| 414-17 | In video: be specific about whether cookie consent is cosmetic or fully functional | 0 (documentation) | |

### Attack Mitigations (2 pts)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-18 | Content-Security-Policy (CSP) HTTP **header** (not `<meta>` tag); specify sources needed and no more (e.g., `default-src`, `style-src`, `img-src`, `script-src`) | 2 | |
| 414-19 | CSP header must be visible in browser developer tools inspector | (verification of 414-18) | |

### Availability (4 pts)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-20 | Site publicly accessible / deployed to cloud | 4 | |

### Additional Security Features (2 pts)

| # | Requirement | Points | Status |
|---|-------------|--------|--------|
| 414-21 | Additional security/privacy features beyond the explicit list (creativity encouraged) | 2 | |

**Suggested additional features (partial or full credit each):**

| # | Option | Status |
|---|--------|--------|
| 414-21a | Third-party authentication (at least one provider) | |
| 414-21b | Two-factor or multi-factor authentication (must keep at least 1 admin and 1 non-admin account WITHOUT 2FA/MFA for grading) | |
| 414-21c | HTTP Strict Transport Security (HSTS) | |
| 414-21d | Browser-accessible cookie (NOT httponly) that saves a user setting used by React to change the page (e.g., dark mode, language) | |
| 414-21e | Data sanitization (incoming) or data encoding (rendered by frontend) to prevent injection attacks | |
| 414-21f | Both operational and identity databases deployed to "real" DBMS (not SQLite) | |
| 414-21g | Deploy using Docker containers instead of VM | |

### Security Documentation

| # | Requirement | Status |
|---|-------------|--------|
| 414-22 | ALL security features must be clearly shown in the submitted video to receive points | |
| 414-23 | Additional security features must be briefly described (what and why) in the video | |

---

## IS 455 - Machine Learning (20 pts)

### General ML Requirements

| # | Requirement | Status |
|---|-------------|--------|
| 455-1 | Deliver as many complete, quality ML pipelines as possible (no maximum; more = better, but quality > quantity) | |
| 455-2 | Each pipeline addresses a **different business problem** | |
| 455-3 | Demonstrate variety of modeling approaches across pipelines | |
| 455-4 | Include at least one predictive model and one explanatory model (recommended, not strictly required) | **UNCLEAR** - "ideally including... but this is not strictly required" |
| 455-5 | Pipelines integrated into or supported by the web application | |

### Per-Pipeline Requirements

Each pipeline is evaluated on these stages:

#### 1. Problem Framing (Ch. 1)

| # | Requirement | Status |
|---|-------------|--------|
| 455-6 | Business problem clearly stated | |
| 455-7 | Problem matters to the organization | |
| 455-8 | Choice of predictive vs. explanatory approach explicitly justified | |
| 455-9 | Success metrics defined | |
| 455-10 | For each pipeline: generate BOTH a causal AND a predictive model | |
| 455-11 | In the .ipynb file: indicate which features are most impactful | |
| 455-12 | In the .ipynb file: recommend decisions based on results | |

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2-8)

| # | Requirement | Status |
|---|-------------|--------|
| 455-13 | Data explored thoroughly (distributions, correlations, anomalies, relationships) | |
| 455-14 | Missing values handled well | |
| 455-15 | Outliers handled well | |
| 455-16 | Feature engineering performed | |
| 455-17 | Data preparation is reproducible as a pipeline (not one-off scripts) | |
| 455-18 | Joins across tables done correctly and documented | |
| 455-19 | Exploration documented and informs modeling choices | |

#### 3. Modeling & Feature Selection (Ch. 9-14, 16)

| # | Requirement | Status |
|---|-------------|--------|
| 455-20 | Model appropriate for stated goal (prediction vs. explanation) | |
| 455-21 | Multiple approaches considered or compared | |
| 455-22 | Feature selection is thoughtful and justified | |
| 455-23 | Feature importance / selection techniques or domain reasoning used to justify feature choices | |
| 455-24 | For explanatory: coefficients and interpretability prioritized | |
| 455-25 | For predictive: out-of-sample performance prioritized | |

#### 4. Evaluation & Selection (Ch. 15)

| # | Requirement | Status |
|---|-------------|--------|
| 455-26 | Appropriate metrics used | |
| 455-27 | Model validated properly (train/test split, cross-validation) | |
| 455-28 | Hyperparameters tuned | |
| 455-29 | Multiple models compared where appropriate | |
| 455-30 | Results interpreted in business terms (not just statistical terms) | |
| 455-31 | Real-world consequences of errors explained for this organization | |

#### 5. Deployment & Integration (Ch. 17)

| # | Requirement | Status |
|---|-------------|--------|
| 455-32 | Model deployed and accessible | |
| 455-33 | Integrated with web application in a meaningful way | |
| 455-34 | Provides value to end users | |
| 455-35 | Possible forms: API endpoint serving predictions, dashboard displaying model outputs, interactive interface for user input/predictions | **UNCLEAR** - listed as examples, not clear which form is required |

---

## Cross-Cutting / Business Context Requirements

These come from the overarching project description and client goals:

### Donor Retention & Growth

| # | Requirement | Status |
|---|-------------|--------|
| BIZ-1 | Understand donor retention: which donors might give more, which are at risk of lapsing | |
| BIZ-2 | Evaluate fundraising campaign effectiveness | **UNCLEAR** - mentioned as a client concern but no specific deliverable defined |
| BIZ-3 | Personalize outreach without a dedicated marketing team | **UNCLEAR** - mentioned as a client goal but no specific feature defined |
| BIZ-4 | Connect donation activity to resident outcomes for donor communication | |

### Case Management / Resident Welfare

| # | Requirement | Status |
|---|-------------|--------|
| BIZ-5 | Identify which residents are progressing vs. struggling | |
| BIZ-6 | Identify which interventions are working | |
| BIZ-7 | Identify when a resident may be ready for reintegration or at risk of regression | |
| BIZ-8 | Manage cases across full lifecycle: intake, assessment, counseling, education, health, reintegration/placement | |

### Social Media Strategy

| # | Requirement | Status |
|---|-------------|--------|
| BIZ-9 | Help organization make smarter social media decisions: what to post, which platforms, how often, what time, what content leads to donations | |
| BIZ-10 | Understand what social media activity is actually working | **UNCLEAR** - expected deliverable form not defined (ML pipeline? dashboard? both?) |

### Administration

| # | Requirement | Status |
|---|-------------|--------|
| BIZ-11 | System administrable by limited staff; easy to create, update, and (carefully) remove data | |

### Privacy & Safety

| # | Requirement | Status |
|---|-------------|--------|
| BIZ-12 | Protect privacy and safety of victims, employees, donors, and partners | |
| BIZ-13 | Extremely sensitive data involving minors who are abuse survivors — privacy and data protection paramount | |

### Other

| # | Requirement | Status |
|---|-------------|--------|
| BIZ-14 | Recommend a name for the new organization | **UNCLEAR** - mentioned in requirements doc but no evaluation criteria |

---

## Video / Presentation Requirements

| # | Requirement | Status |
|---|-------------|--------|
| VID-1 | Final deliverable and presentation due Friday | |
| VID-2 | Security features MUST be clearly shown in submitted video to receive points | |
| VID-3 | Additional security features must be described (what and why) in video | |
| VID-4 | Cookie consent: must specify in video if cosmetic or fully functional | |

---

## Data / Database Requirements

| # | Requirement | Status |
|---|-------------|--------|
| DATA-1 | Dataset: 17 tables from provided CSV files (3 domains: Donor/Support, Case Management, Outreach/Communication) | |
| DATA-2 | May modify data as needed | |
| DATA-3 | May add additional tables/fields deemed useful | |
| DATA-4 | Not required to use all existing data | |
| DATA-5 | Good database design principles | |
| DATA-6 | Relational database (Azure SQL, MySQL, or PostgreSQL) | |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| IS 401 Requirements | 34 |
| IS 413 Requirements | 29 |
| IS 414 Requirements | 23+ (7 optional additional features) |
| IS 455 Requirements | 35 |
| Business Context Requirements | 14 |
| Video/Presentation Requirements | 4 |
| Data/Database Requirements | 6 |
| **Total** | **~145** |
| Items flagged UNCLEAR | 10 |

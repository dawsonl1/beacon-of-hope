# Plan 03 — Our Impact Page (Public, Donor-Facing Dashboard)

## Purpose

The Impact page is the **trust-building engine** of the site. It takes aggregated, anonymized data from the database and presents it in a way that answers the donor's core question: *"Is my money making a difference?"* and the partner's question: *"Is this organization producing real results?"*

This is the IS 413 requirement: "Impact / Donor-Facing Dashboard — Displays aggregated, anonymized data showing the organization's impact (e.g., outcomes, progress, and resource use) in a clear and visually understandable way."

## Available Data (from the database)

| Source Table | What it tells us | Rows |
|---|---|---|
| `public_impact_snapshots` | Monthly aggregate reports (avg health score, avg education progress, total residents, monthly donations) | 50 |
| `safehouse_monthly_metrics` | Per-safehouse monthly stats (active residents, education progress, health score, session counts, incident counts) | 450 |
| `donation_allocations` | Where donations go (safehouse + program area: Education, Health, Transport, etc.) | 521 |
| `donations` | Donation amounts, types, campaigns, dates | 420 |
| `residents` | Case status, reintegration type/status, risk levels (aggregated only — no PII on public page) | 60 |
| `safehouses` | Names, regions, capacity, occupancy | 9 |
| `education_records` | Per-resident education progress over time (attendance, progress %, completion) | 534 |
| `health_wellbeing_records` | Per-resident health scores over time (general health, nutrition, sleep, energy) | 534 |

**Critical constraint**: This is a PUBLIC page. No personally identifiable information. Everything must be aggregated or anonymized.

---

## Personas on the Impact Page

### Maria Chen — Recurring Donor
- **Arriving from**: Home page "See Our Impact" CTA, or email newsletter link
- **Time budget**: 2-3 minutes. Scanning, not reading deeply.
- **Goals on this page**:
  - See that donations (including hers) are being put to work
  - Understand what "impact" looks like in concrete terms — not just money in, but outcomes out
  - See trends going up over time (health improving, education progressing, more girls served)
  - Find one compelling stat or visual she can screenshot and share on Instagram
  - Be moved to donate again
- **What would make her leave**: A wall of text. A single static number with no context. Charts she can't read on her phone. No emotional connection.
- **Key question**: "What did my ₱1,000 actually do?"

### Pastor James Okafor — Potential Partner
- **Arriving from**: Home page deep scroll, or direct link shared by a colleague
- **Time budget**: 5-10 minutes. Will read everything if the content is credible.
- **Goals on this page**:
  - See hard data on outcomes across all safehouses
  - Understand how funds are allocated across programs (education, health, operations)
  - Compare safehouse performance to gauge operational maturity
  - Assess whether the organization is growing and improving over time
  - Find data he can present to his church leadership board as evidence
  - Understand the scale of operations (how many safehouses, how many girls, what regions)
- **What would make him leave**: Vague claims without data. Cherry-picked stats that feel misleading. No breakdown of how funds are used.
- **Key question**: "Can I show my leadership board this page and convince them to commit?"

### Elena Reyes — Staff / Social Worker
- **Arriving from**: Admin portal, or sending a link to a referring government agency
- **Time budget**: 1 minute. She knows the org — she just needs the page to look credible.
- **Goals on this page**:
  - Verify the public page accurately reflects the work she does every day
  - Share a link with government partners or referring agencies as a credibility tool
  - See if the latest monthly metrics are up to date
- **What would make her leave**: Outdated data. Numbers that don't match her experience on the ground.
- **Key question**: "Does this page represent our work accurately?"

### David Kim — First-Time Visitor from Social Media
- **Demographics**: 28, software engineer in San Francisco, saw a Beacon of Hope Instagram reel that was reshared by a friend
- **Arriving from**: Instagram link in bio → Home page → clicked "Impact"
- **Time budget**: 30-60 seconds. High scroll speed. Looking for something that hooks him.
- **Goals on this page**:
  - Quickly gauge if this org is legit or just another feel-good campaign
  - See a visual that makes him pause — a chart, a number, something that surprises him
  - Decide whether to donate or at least follow on social media
- **What would make him leave**: Boring layout. No visuals. Feels like a corporate annual report. Loads slowly.
- **Key question**: "Is this real? Should I care?"

---

## User Stories — Impact Page

### Overview & First Impression

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 1 | First-time visitor | See a clear headline and summary of overall impact within 3 seconds | I know this page will show me results, not just ask for money | Hero/summary section visible above the fold with 2-3 key numbers |
| 2 | Any visitor | See the data is current (most recent month shown) | I trust this isn't a stale marketing page | Latest snapshot date displayed prominently |
| 3 | Mobile visitor | View all charts and data clearly on my phone | I can engage with this page from Instagram → browser | All visualizations responsive, no horizontal scrolling |

### Donation Transparency

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 4 | Donor | See total donations received over time | I know the organization has sustained support | Line or area chart showing cumulative or monthly donation totals |
| 5 | Donor | See how donations are allocated across program areas | I know my money goes to real programs, not just overhead | Pie or bar chart breaking down allocations (Education, Health, Transport, etc.) |
| 6 | Potential partner | See donation allocation by safehouse | I understand how funds are distributed geographically | Breakdown by safehouse or region |
| 7 | Donor | See how different donation types contribute (monetary, in-kind, time, skills) | I understand the full picture of community support | Stacked bar or summary showing contribution types |

### Resident Outcomes

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 8 | Donor | See how many girls have been helped and their current status | I know the organization is actively serving people | Aggregate counts: active, reintegrated, closed cases |
| 9 | Potential partner | See reintegration success rates and types | I can assess program effectiveness | Percentage of residents who completed reintegration, breakdown by type (family, foster, independent) |
| 10 | Any visitor | See education progress trends over time | I know girls are learning and growing | Line chart showing average education progress % over months |
| 11 | Any visitor | See health improvement trends over time | I know girls are getting healthier | Line chart showing average health scores over months |
| 12 | Potential partner | See risk level changes (intake vs current) | I can assess whether the program is reducing risk | Before/after comparison of risk levels across residents |

### Safehouse Operations

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 13 | Potential partner | See how many safehouses exist and where they are | I understand the geographic reach | Map or regional breakdown (Luzon, Visayas, Mindanao) with safehouse counts |
| 14 | Potential partner | See capacity vs occupancy across safehouses | I understand operational utilization | Bar chart or summary showing capacity and current occupancy per safehouse |
| 15 | Any visitor | See monthly activity levels (counseling sessions, home visits) | I know the staff are actively working with residents | Monthly counts from safehouse_monthly_metrics |

### Engagement & Sharing

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 16 | Donor | See a compelling stat I can share | I can advocate for this org on social media | At least one "shareable" callout stat with clean visual treatment |
| 17 | Any visitor | Have a clear CTA to donate after seeing the impact data | I can act on the trust I just built | Donate CTA at bottom of page |
| 18 | Potential partner | Download or reference impact data for a presentation | I can bring this to my leadership board | Consider a "latest impact report" section or printable view |

### Compliance

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 19 | Any visitor | See only aggregated, anonymized data | No resident's privacy is violated | Zero PII on this page — no names, no birthdates, no case numbers |
| 20 | Any visitor | Access this page without logging in | I don't need an account to see public impact data | Page is fully public, no auth required |

---

## Page Structure

### Hero / Summary Banner
- Headline: "Our Impact" or "Where Your Generosity Goes"
- 3-4 headline stats in large type: total girls served, reintegration rate, active safehouses, total donations
- "Last updated: [latest snapshot month]" for credibility
- Subtle: pulled from real data, not hardcoded

### Section 1 — Resident Outcomes
- **Status breakdown**: Active / Reintegrated / Closed (donut or horizontal bar)
- **Reintegration types**: Family Reunification / Foster Care / Independent Living (bar chart)
- **Risk level change**: Intake risk vs current risk (grouped bar or sankey)
- **Education progress**: Average education progress % over time (line chart)
- **Health improvement**: Average health score over time (line chart)

### Section 2 — Donation Transparency
- **Monthly donations over time**: Area or bar chart
- **Allocation by program area**: Pie or treemap (Education, Health, Transport, Nutrition, etc.)
- **Allocation by region**: Map or grouped bars (Luzon, Visayas, Mindanao)
- **Contribution types**: Monetary vs In-Kind vs Time vs Skills vs Social Media Advocacy

### Section 3 — Safehouse Operations
- **Regional map or cards**: 3 regions with safehouse counts and total capacity
- **Capacity vs occupancy**: Per-safehouse bar chart
- **Monthly activity**: Counseling sessions, home visits, incidents (line chart over time)

### Section 4 — Monthly Impact Snapshots
- Timeline or card grid showing the latest `public_impact_snapshots`
- Each shows: month, total residents, avg health score, avg education progress, donations that month

### Bottom CTA
- "Every number on this page represents a real life changed."
- Donate button + Get Involved link

---

## API Endpoints Needed

| Endpoint | Data | Auth |
|----------|------|------|
| `GET /api/impact/summary` | Aggregate stats: total residents, reintegration rate, active safehouses, total donations | Public |
| `GET /api/impact/outcomes` | Resident status breakdown, reintegration types, risk level changes (all aggregated) | Public |
| `GET /api/impact/education-trends` | Average education progress by month | Public |
| `GET /api/impact/health-trends` | Average health score by month | Public |
| `GET /api/impact/donations` | Monthly donation totals, allocation by program area and region | Public |
| `GET /api/impact/safehouses` | Safehouse list with capacity, occupancy, region (no resident details) | Public |
| `GET /api/impact/snapshots` | Published impact snapshots | Public |
| `GET /api/impact/activity` | Monthly counseling sessions, home visits, incidents (from safehouse_monthly_metrics) | Public |

---

## Charting Library

Use **Recharts** (React-native, lightweight, responsive, good accessibility). Install in frontend: `npm install recharts`.

---

## Design Notes

- Same warm editorial aesthetic as home page (Cormorant Garamond + Plus Jakarta Sans, amber/cream palette)
- Charts should use the brand color palette — amber for primary data, sage for secondary, rose for accents
- No dark/busy chart backgrounds — keep them clean on cream/white
- Every chart needs a clear title and a one-sentence explanation of what it shows
- Mobile: charts should stack vertically and be touch-scrollable
- Accessibility: all charts need aria-labels and color-blind-friendly palettes

---

## Definition of Done

- [ ] All sections render with real data from the API
- [ ] Zero PII displayed — only aggregated/anonymized data
- [ ] All charts responsive and readable on mobile
- [ ] Lighthouse accessibility ≥ 90%
- [ ] Page loads in < 3 seconds
- [ ] Donate CTA present at bottom
- [ ] Latest data month displayed for credibility
- [ ] No auth required to access this page

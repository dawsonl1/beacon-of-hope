# Plan 04 — Admin Dashboard (Command Center)

## Purpose

The Admin Dashboard is the **"command center"** for staff managing daily operations. It gives a high-level overview of everything happening across safehouses — active residents, recent donations, incidents, upcoming tasks — so staff can quickly assess what needs attention today.

From IS 413: "Provides a high-level overview of key metrics such as active residents across safehouses, recent donations, upcoming case conferences, and summarized progress data."

**Auth note**: Eventually behind login. For now, clicking Login in the header routes directly to `/admin`.

**Roles on this page** (from requirements):
- **Admin** — full CRUD across all data
- **Staff/Employee** — view + limited write (process recordings, visitations, etc.)

(Donor role gets a separate portal — see Plan 05.)

---

## Personas on the Admin Dashboard

### 1. Elena Reyes — Social Worker / Case Manager

- **Demographics**: 34, licensed social worker, based at Safehouse 2 in Cebu City. Manages 8-10 active cases.
- **Role**: Staff
- **Arriving from**: Login → lands here as her default view every morning
- **Time budget**: Checks this page multiple times a day, 1-2 minutes each. She's busy — every second on this page is time away from a girl who needs her.
- **Digital behavior**: Uses a shared desktop at the safehouse office. Sometimes checks on her phone between home visits. Needs things to be obvious — she's not tech-savvy and doesn't have time to learn a complex interface.
- **Goals on the dashboard**:
  - See at a glance how many active residents she's responsible for
  - Check for new incidents or flagged concerns since yesterday — especially anything marked Critical or High severity
  - See if any intervention plans have upcoming case conferences she needs to prepare for
  - See if any of her residents' process recordings are overdue (last session too long ago)
  - Know if new donations came in (morale boost — reminds her the outside world cares)
  - Quickly jump to the specific case or section she needs (caseload, process recordings, home visitation)
- **Frustrations**:
  - Having to click through multiple pages just to find out if anything changed overnight
  - Data that's not filtered to her caseload — she doesn't need to see all 60 residents, just hers
  - Slow-loading dashboards that waste her limited computer time
  - Jargon or complex charts — she wants plain numbers and clear lists
- **Key question**: "What needs my attention right now, and how do I get there fast?"

### 2. Director Reyes — Organization Director / Admin

- **Demographics**: 52, co-founder of Beacon of Hope, based in the US. Oversees all operations remotely.
- **Role**: Admin
- **Arriving from**: Login → checks dashboard 2-3 times per week from her laptop
- **Time budget**: 5-10 minutes per visit. Wants the big picture, not individual case details.
- **Digital behavior**: Comfortable with data dashboards (uses QuickBooks, Google Analytics). Expects a professional, polished interface. Will drill into specific areas if something looks off.
- **Goals on the dashboard**:
  - See total active residents across ALL safehouses — are we growing or shrinking?
  - Review capacity utilization — which safehouses are full, which have room? Do we need to open a new one?
  - Check donation totals for the month — are we on pace to meet operating costs?
  - Look at incident counts per safehouse — any pattern or spike she needs to investigate?
  - See summarized progress data — are education scores and health scores trending up?
  - Quick access to Reports & Analytics for board presentations
  - Ability to add, edit, or delete any data in the system (full admin CRUD)
- **Frustrations**:
  - Having to ask staff for updates that should be visible in the system
  - No way to compare safehouses against each other
  - Dashboard that only shows raw numbers without context (is 12 incidents good or bad?)
  - Not knowing if data is up to date
- **Key question**: "Is the organization healthy? Are we growing? Anything I need to escalate?"

### 3. Grace Flores — Donor Relations Coordinator

- **Demographics**: 29, communications graduate, works remotely from Manila. Manages all supporter relationships and donation tracking.
- **Role**: Staff (or Admin, depending on team decision)
- **Arriving from**: Login → checks dashboard daily, then navigates to Donors & Contributions
- **Time budget**: Spends 15-20 minutes in the admin portal daily, but only 1-2 minutes on the dashboard itself.
- **Digital behavior**: Lives in spreadsheets and email. Comfortable with data but wants it organized and exportable. Uses desktop 90% of the time.
- **Goals on the dashboard**:
  - See this month's donation total vs. last month — are we trending up or down?
  - See how many new supporters were added recently and through which channels
  - Check if any recurring donors have lapsed (donation expected but not received)
  - See donation allocation breakdown — is any program area underfunded?
  - Quick access to create a new supporter profile or log a new donation
  - See recent donations to send timely thank-you messages
- **Frustrations**:
  - No notification when a new donation comes in — she finds out days late
  - Donation data scattered across multiple views instead of one clear summary
  - Can't quickly see which campaigns are performing and which aren't
  - Having to manually cross-reference donors with their donation history
- **Key question**: "Who gave recently, how much are we bringing in, and who do I need to follow up with?"

---

## User Stories — Admin Dashboard

### Overview Metrics (All Authenticated Users)

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 1 | Staff member | See total active residents across all safehouses | I know the current caseload at a glance | Number displayed prominently, with change indicator vs. last month |
| 2 | Staff member | See this month's donation total and count | I know if funding is on pace | Monthly total in ₱, donation count, comparison to last month |
| 3 | Staff member | See open (unresolved) incident count | I can prioritize urgent matters | Count with red highlight if > 0, link to incidents page |
| 4 | Staff member | See upcoming case conferences this week | I know what I need to prepare for | Count with link to interventions page, shows next conference date |

### Safehouse Overview (Admin + Staff)

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 5 | Admin | See all safehouses with occupancy vs capacity | I know which are full and which have room | Card per safehouse with progress bar, color-coded (green/amber/red) |
| 6 | Admin | See which region each safehouse is in | I understand geographic distribution | Region label on each safehouse card |
| 7 | Admin | See a capacity summary across the whole organization | I know total beds available vs. filled | Summary row: "X of Y total beds occupied (Z%)" |
| 8 | Staff member | See my safehouse's status highlighted | I can quickly find my own safehouse | Current user's safehouse visually distinguished (future: based on auth) |

### Recent Activity (Admin + Staff)

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 9 | Staff member | See the 5 most recent donations | I know who just contributed and can send thanks | Table: date, supporter name, donation type, amount, campaign |
| 10 | Staff member | See recent incidents with severity levels | I can follow up on anything urgent first | Table: date, safehouse, type, severity (color-coded), resolved status |
| 11 | Staff member | See recent process recordings | I know what counseling happened recently | Table: date, resident code (not name), social worker, session type, emotional state |
| 12 | Staff member | See recent home visitations | I know what field activity happened | Table: date, resident code, visit type, outcome, follow-up needed |

### Donor Relations (Staff — Grace's needs)

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 13 | Donor coordinator | See this month vs. last month donation comparison | I know if we're trending up or down | Side-by-side or percentage change indicator |
| 14 | Donor coordinator | See which acquisition channels are bringing in donors | I know where to focus outreach | Breakdown: SocialMedia, Church, Event, etc. with counts |
| 15 | Donor coordinator | See recurring vs. one-time donation split | I understand donor retention | Percentage or count of recurring vs. one-time |
| 16 | Donor coordinator | Quickly navigate to create a new supporter or log a donation | I can act immediately when I get a call or email | "Add Supporter" and "Log Donation" quick-action buttons |

### Quick Navigation & Actions (Admin + Staff)

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 17 | Staff member | Navigate to caseload, donors, recordings, visitations, etc. from sidebar | I can get to the detail I need in one click | Sidebar with links to all admin sections |
| 18 | Admin | See quick-action buttons for common tasks | I can create records without navigating away | "Add Resident", "Log Donation", "New Recording" buttons |
| 19 | Any auth user | See my role and name in the interface | I know I'm logged into the right account | Username and role badge displayed in header/sidebar |
| 20 | Any auth user | Log out securely | I can end my session | Logout link in sidebar, clears session |

### Data Freshness & Trust (All Roles)

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 21 | Admin | See when the dashboard data was last updated | I trust the numbers are current | "Last updated" timestamp or "as of today" indicator |
| 22 | Admin | See data that auto-refreshes or is current on page load | I don't have to manually refresh to see changes | Data fetched fresh on each page load |

---

## Definition of Done

- [ ] Dashboard addresses all user stories above
- [ ] Admin/staff only — no donor access to this page
- [ ] Login button in header routes to /admin
- [ ] Page is responsive on mobile

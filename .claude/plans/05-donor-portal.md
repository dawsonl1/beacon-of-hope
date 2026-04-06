# Plan 05 — Donor Portal

## Purpose

A separate, warm, simple dashboard for authenticated donors to see their own donation history, how their money was allocated, and anonymized impact connected to their giving. This is NOT the admin dashboard — donors should never see operational data.

From IS 414: "Only authenticated users who are donors should be able to see their donor history and the impact of those donations."

---

## Personas

### Maria Chen — Authenticated Donor (Logged In)

- **Demographics**: 42, marketing manager, recurring monetary donor (same persona from public pages, now logged in)
- **Role**: Donor
- **Arriving from**: Login → routed to donor portal (not admin dashboard)
- **Time budget**: 2-3 minutes, checking quarterly. She's not here to manage operations — she's here to see what her money did.
- **Digital behavior**: Phone 70% of the time. Expects a clean, simple experience. Does not want to see operational complexity.
- **Goals**:
  - See her total lifetime donations and donation history (dates, amounts, types)
  - See how her donations were allocated — which safehouses and programs benefited
  - See anonymized impact data connected to her giving (e.g., "Your donations supported 3 months of education supplies at Safehouse 2")
  - Feel appreciated — a thank-you message, a sense of connection
  - Easy path to donate again
- **What she should NOT see**:
  - Individual resident details (PII)
  - Staff operations, incidents, case details
  - Other donors' information
  - Admin CRUD functionality
- **Frustrations**:
  - Logging in and seeing an overwhelming admin interface meant for staff
  - No connection between her donation and any outcome
  - Generic "thank you for your support" with no specifics
  - Having to contact the organization to get her donation history
- **Key question**: "What did my money do? Am I making a difference?"

---

## User Stories

| # | As a... | I want to... | So that... | Acceptance Criteria |
|---|---------|-------------|-----------|-------------------|
| 1 | Donor | See my total lifetime donation amount | I know my cumulative contribution | Clear number with donation count |
| 2 | Donor | See my full donation history | I have a record of every gift | Table: date, amount, type, campaign, allocation |
| 3 | Donor | See how my donations were allocated | I know which programs and safehouses my money supported | Breakdown by program area and/or safehouse |
| 4 | Donor | See anonymized impact connected to my donations | I feel my giving made a real difference | E.g., "Your donations supported X months of education at Safehouse Y" |
| 5 | Donor | See a thank-you message or appreciation | I feel valued and want to give again | Personalized welcome, donation milestone acknowledgments |
| 6 | Donor | Easily donate again from this view | I can act on my impulse to give more | "Donate Again" CTA button |

---

## Definition of Done

- [ ] Donor portal at separate route from admin dashboard
- [ ] Shows only the authenticated donor's own data
- [ ] Zero PII — no resident names, no other donors' info
- [ ] No admin CRUD functionality visible
- [ ] Responsive on mobile

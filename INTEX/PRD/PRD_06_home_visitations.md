# PRD 06 — Fieldwork & Home Visitations

## Overview
Social workers conduct home visits to evaluate family safety and cooperation. The first visit is triggered when a case is claimed. Subsequent visits recur on a cadence set by the social worker. Visits are scheduled from to-do items and logged after completion.

---

## Requirements

### 6.1 — Initial Home Visit Task
| ID | Requirement | Audit |
|----|------------|-------|
| 6.1.1 | When a social worker claims a resident, a "Schedule Home Visit" to-do item is auto-created | |
| 6.1.2 | The task can be marked N/A if the resident has no home | |
| 6.1.3 | Clicking "Schedule" opens the scheduling modal with date/time picker | |
| 6.1.4 | Scheduling creates a HomeVisit calendar event titled "Home visit — [code]" | |
| 6.1.5 | The scheduling task is marked as Completed | |

### 6.2 — Calendar Event Actions
| ID | Requirement | Audit |
|----|------------|-------|
| 6.2.1 | Clicking a scheduled HomeVisit event shows a "Log Visit" action | |
| 6.2.2 | "Log Visit" navigates to the visitation form with resident and event pre-filled | |
| 6.2.3 | After submission, the calendar event is marked as Completed | |
| 6.2.4 | After submission from the calendar flow, the user is navigated back to the calendar | |

### 6.3 — Visitation Form
| ID | Requirement | Audit |
|----|------------|-------|
| 6.3.1 | A visitation form exists at /admin/visitations/new | |
| 6.3.2 | Form captures which resident was visited | |
| 6.3.3 | Form captures visit date | |
| 6.3.4 | Form captures assessment outcome (Favorable, Needs Improvement, Unfavorable, Inconclusive) | |
| 6.3.5 | Form captures family cooperation level | |
| 6.3.6 | Form captures home safety evaluation | |
| 6.3.7 | Submitting the form creates a new visitation record | |

### 6.4 — Recurring Cadence
| ID | Requirement | Audit |
|----|------------|-------|
| 6.4.1 | On the first visitation for a resident, the staff member can set a recurring visit cadence | |
| 6.4.2 | Future "Schedule Home Visit" to-do items auto-appear based on the set cadence | |

### 6.5 — Profile Integration
| ID | Requirement | Audit |
|----|------------|-------|
| 6.5.1 | The resident's profile page shows their home visitation records | |
| 6.5.2 | Staff can add a new visitation from the profile page | |

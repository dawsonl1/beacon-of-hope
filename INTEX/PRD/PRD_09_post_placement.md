# PRD 09 — Post-Placement & Closure

## Overview
After a resident is reintegrated, staff conduct follow-up visits on a declining cadence until the case is closed. Weekly surveys monitor the resident's wellbeing. A final check-in occurs 6 months after closure.

---

## Requirements

### 9.1 — Marking as Reintegrated
| ID | Requirement | Audit |
|----|------------|-------|
| 9.1.1 | Staff can mark a resident as "Reintegrated" on their profile | |
| 9.1.2 | Marking as reintegrated updates the case status | |
| 9.1.3 | The resident's email is collected at this point | |

### 9.2 — Post-Placement Visit Cycle
| ID | Requirement | Audit |
|----|------------|-------|
| 9.2.1 | One week after reintegration, a "Schedule Post-Placement Visit" to-do item appears | |
| 9.2.2 | Clicking "Schedule" opens the scheduling modal to create a PostPlacementVisit calendar event | |
| 9.2.3 | The calendar event title is "Post-placement visit — [code]" | |
| 9.2.4 | Clicking the calendar event shows a "Log Visit" action | |
| 9.2.5 | The logging form lets the staff member set the interval until the next post-placement visit | |
| 9.2.6 | The logging form lets the staff member mark the case as "Closed" instead | |
| 9.2.7 | If an interval is set, a new "Schedule Post-Placement Visit" to-do appears after that interval | |

### 9.3 — Final Check-In
| ID | Requirement | Audit |
|----|------------|-------|
| 9.3.1 | Six months after closure, one final to-do item appears for a check-in visit | |
| 9.3.2 | After the final visit is logged, the case is fully closed with no further auto-generated tasks | |

### 9.4 — Weekly Surveys
| ID | Requirement | Audit |
|----|------------|-------|
| 9.4.1 | A short weekly survey is sent to the reintegrated resident's email | |
| 9.4.2 | Survey responses are visible on the resident's profile | |
| 9.4.3 | Survey responses are visible in aggregate dashboards | |
| 9.4.4 | Residents can request an emergency post-placement visit through the survey | |

### 9.5 — Post-Placement Dashboards
| ID | Requirement | Audit |
|----|------------|-------|
| 9.5.1 | Each staff member can see post-placement data for their assigned residents | |
| 9.5.2 | Staff can see aggregate post-placement data for all placed residents at their safehouse | |

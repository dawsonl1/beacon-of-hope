# PRD 07 — Case Conferences & Planning

## Overview
Case conferences are formal team review meetings where staff collaborate on a resident's care plan. They are auto-scheduled weekly and can be triggered by counseling flags or ML score stagnation. During conferences, staff review and update intervention plans.

---

## Requirements

### 7.1 — Auto-Scheduled Meetings
| ID | Requirement | Audit |
|----|------------|-------|
| 7.1.1 | Case conference events are auto-created on Monday mornings for all staff at each safehouse | |
| 7.1.2 | If no residents were flagged for "needs case conference" that week, the meeting is removed from the calendar | |

### 7.2 — Conference Triggers
| ID | Requirement | Audit |
|----|------------|-------|
| 7.2.1 | Residents flagged with "Needs case conference" on a process recording appear in the conference agenda | |
| 7.2.2 | Residents whose ML reintegration readiness score hasn't improved by 0.04 in the last 3 weeks are flagged | |
| 7.2.3 | ML-flagged residents appear in an alert table with options: snooze, schedule conference, review intervention plans | |

### 7.3 — Case Conferences Page
| ID | Requirement | Audit |
|----|------------|-------|
| 7.3.1 | A dedicated Case Conferences page exists in the navigation | |
| 7.3.2 | The page shows upcoming case conferences | |
| 7.3.3 | The page shows all intervention plans in a table | |
| 7.3.4 | Staff can schedule a new case conference from the page | |
| 7.3.5 | Clicking a resident card/row navigates to that resident's full profile | |

### 7.4 — During a Conference
| ID | Requirement | Audit |
|----|------------|-------|
| 7.4.1 | The resident's profile page shows their intervention plans | |
| 7.4.2 | Intervention plans are editable from the profile page | |
| 7.4.3 | Intervention plans have status tracking: Open, In Progress, Achieved, Closed | |
| 7.4.4 | Intervention plans have numeric targets and target dates | |
| 7.4.5 | Changes to intervention plans are saved to the database | |

### 7.5 — Intervention Plan Categories
| ID | Requirement | Audit |
|----|------------|-------|
| 7.5.1 | Plans can be categorized under: Rehabilitation, Education, Health, Reintegration, Protection | |
| 7.5.2 | Each plan has a description, status, target value, target date, and services provided | |

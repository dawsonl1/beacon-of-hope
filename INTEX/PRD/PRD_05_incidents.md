# PRD 05 — Incident Management

## Overview
Staff document incidents (runaway attempts, self-harm, behavioral issues, security conflicts) and track their resolution. Incidents that require follow-up generate to-do items for the assigned social worker.

---

## Requirements

### 5.1 — Incidents List Page
| ID | Requirement | Audit |
|----|------------|-------|
| 5.1.1 | An Incidents page exists showing incident reports | |
| 5.1.2 | Staff see incidents filtered to their safehouse | |
| 5.1.3 | Admins can see incidents across all safehouses | |
| 5.1.4 | Incidents can be filtered by severity (Critical, High, Medium, Low) | |
| 5.1.5 | Incidents can be filtered by status (Open, Resolved) | |
| 5.1.6 | Incidents are sortable by date, type, severity, reported by, status | |
| 5.1.7 | Clicking an incident navigates to its detail page | |

### 5.2 — Incident Creation Form
| ID | Requirement | Audit |
|----|------------|-------|
| 5.2.1 | A "Report Incident" button exists on the Incidents page | |
| 5.2.2 | Form captures which resident the incident involves | |
| 5.2.3 | Form captures incident date | |
| 5.2.4 | Form captures incident type | |
| 5.2.5 | Form captures severity level (Critical, High, Medium, Low) | |
| 5.2.6 | Form captures description of the incident | |
| 5.2.7 | Form captures response/action taken | |
| 5.2.8 | Form captures who reported it | |
| 5.2.9 | Form captures whether it is resolved (toggle) | |
| 5.2.10 | Form captures whether follow-up is required (toggle) | |
| 5.2.11 | Submitting the form creates a new incident record | |

### 5.3 — Follow-Up Task Generation
| ID | Requirement | Audit |
|----|------------|-------|
| 5.3.1 | When "Follow-Up Required" is marked, a to-do item is auto-created for the resident's assigned social worker | |
| 5.3.2 | The follow-up to-do item shows incident details (severity, description) | |
| 5.3.3 | The to-do item has a link to view the resident's profile | |
| 5.3.4 | From the follow-up, the staff member can decide next steps (schedule counseling, doctor appointment, etc.) | |

### 5.4 — Incident-Counseling Linkage
| ID | Requirement | Audit |
|----|------------|-------|
| 5.4.1 | If a counseling session is scheduled from an incident follow-up, the resulting recording is linked to the incident | |

### 5.5 — Profile Integration
| ID | Requirement | Audit |
|----|------------|-------|
| 5.5.1 | The resident's profile page shows their incidents | |
| 5.5.2 | Incidents on the profile show severity, date, type, and resolution status | |

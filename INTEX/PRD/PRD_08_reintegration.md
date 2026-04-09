# PRD 08 — Reintegration Assessment & Pathways

## Overview
When a resident is deemed ready, staff initiate a reintegration assessment. This involves scheduling a reintegration home visit, evaluating suitability, and assigning a placement pathway. If the first pathway isn't suitable, the cycle repeats with a different one.

---

## Requirements

### 8.1 — Triggering Reintegration
| ID | Requirement | Audit |
|----|------------|-------|
| 8.1.1 | The process recording form has a "Ready for reintegration assessment" option | |
| 8.1.2 | Selecting it creates a "Schedule Reintegration Home Visit" to-do item | |
| 8.1.3 | The to-do item is assigned to the resident's social worker | |

### 8.2 — Scheduling the Assessment Visit
| ID | Requirement | Audit |
|----|------------|-------|
| 8.2.1 | Clicking "Schedule" on the reintegration task opens the scheduling modal | |
| 8.2.2 | The modal creates a ReintegrationVisit calendar event | |
| 8.2.3 | The calendar event title is "Reintegration visit — [code]" | |
| 8.2.4 | The scheduling task is marked as Completed | |
| 8.2.5 | The staff member can select which reintegration pathway is being assessed | |
| 8.2.6 | There is a "Cancel reintegration assessment" option that cancels the process | |

### 8.3 — Reintegration Readiness (ML)
| ID | Requirement | Audit |
|----|------------|-------|
| 8.3.1 | The ML Reintegration Readiness model provides a score (0–100) for each resident | |
| 8.3.2 | The score is visible on the resident's profile page | |
| 8.3.3 | The score is labeled as ML-powered | |
| 8.3.4 | Legal milestones (Certificate of Live Birth, final case study) are trackable | |
| 8.3.5 | Current risk level vs. initial risk level comparison is visible | |

### 8.4 — Logging the Reintegration Visit
| ID | Requirement | Audit |
|----|------------|-------|
| 8.4.1 | Clicking a ReintegrationVisit calendar event shows a "Log Visit" action | |
| 8.4.2 | "Log Visit" navigates to a form for logging the reintegration visit | |
| 8.4.3 | The form includes "Suitable for reintegration?" (Yes/No) | |
| 8.4.4 | If Yes: the reintegration pathway is assigned on the resident's profile | |
| 8.4.5 | If No: a new to-do item is created to schedule another assessment with a different pathway | |

### 8.5 — Reintegration Pathways
| ID | Requirement | Audit |
|----|------------|-------|
| 8.5.1 | Four pathways are supported: Reunification, Foster Care, Adoption, Independent Living | |
| 8.5.2 | The selected pathway is stored on the resident's record | |
| 8.5.3 | The pathway is visible on the resident's profile page | |

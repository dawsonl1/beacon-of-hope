# PRD 01 — Intake & Admission

## Overview
When a new resident arrives at a safehouse, staff create a comprehensive record. The resident then enters an unclaimed queue, gets claimed by a social worker, and the social worker begins the care process with an initial home visit and recurring counseling.

---

## Requirements

### 1.1 — Resident Creation Form
| ID | Requirement | Audit |
|----|------------|-------|
| 1.1.1 | A "New Resident" form exists and is accessible from the Caseload page | |
| 1.1.2 | Form captures demographics: date of birth, birthplace, religion | |
| 1.1.3 | Form captures case classification: category (Abandoned, Foundling, Surrendered, Neglected) | |
| 1.1.4 | Form captures trauma sub-categories (multi-select or checkboxes) | |
| 1.1.5 | Form captures needs assessment: disabilities (PWD), special needs | |
| 1.1.6 | Form captures family vulnerability factors: solo parent, indigenous, informal settler | |
| 1.1.7 | Form captures initial risk level (Low, Medium, High, Critical) | |
| 1.1.8 | Form captures referral source | |
| 1.1.9 | Form captures assigned social worker (optional — can be left blank for queue) | |
| 1.1.10 | Form captures safehouse assignment | |
| 1.1.11 | Submitting the form creates a new resident record in the database | |

### 1.2 — ML Prediction on Intake
| ID | Requirement | Audit |
|----|------------|-------|
| 1.2.1 | The Incident Early Warning ML model runs for newly created residents | |
| 1.2.2 | Self-harm and runaway risk scores are visible on the resident's profile page | |
| 1.2.3 | Risk scores are labeled as ML-powered (sparkle badge or similar) | |

### 1.3 — Unclaimed Queue
| ID | Requirement | Audit |
|----|------------|-------|
| 1.3.1 | A queue/list exists showing residents with no assigned social worker | |
| 1.3.2 | All staff can view the unclaimed queue | |
| 1.3.3 | A staff member can claim a resident from the queue (assigns themselves as social worker) | |
| 1.3.4 | After claiming, the resident no longer appears in the queue | |

### 1.4 — Post-Claim Automation
| ID | Requirement | Audit |
|----|------------|-------|
| 1.4.1 | When a social worker claims a case, an "Initial Home Visit" to-do item is auto-created | |
| 1.4.2 | The home visit task can be marked N/A if the resident has no home | |
| 1.4.3 | The "Schedule" button on the home visit task opens a modal with date/time picker | |
| 1.4.4 | Scheduling from the modal creates a HomeVisit calendar event and marks the task done | |

### 1.5 — Recurring Counseling Setup
| ID | Requirement | Audit |
|----|------------|-------|
| 1.5.1 | After the initial visit, the social worker can assign a recurring counseling cadence | |
| 1.5.2 | Recurring counseling sessions appear on the calendar each week as unscheduled events | |
| 1.5.3 | Unscheduled events appear in the all-day/parking-lot row | |
| 1.5.4 | Staff can drag unscheduled events to a specific time slot on the calendar | |

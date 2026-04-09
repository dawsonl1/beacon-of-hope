# PRD 04 — Counseling & Emotional Growth

## Overview
Staff conduct individual and group counseling sessions, documented through process recordings. Sessions appear on the calendar as recurring events. After sessions, staff log recordings that capture emotional states, interventions, and progress. Voice transcription is available for quick documentation.

---

## Requirements

### 4.1 — Calendar Integration
| ID | Requirement | Audit |
|----|------------|-------|
| 4.1.1 | Recurring counseling events appear on the calendar each week as unscheduled (no time) events | |
| 4.1.2 | Unscheduled counseling events appear in the all-day/parking-lot row | |
| 4.1.3 | Staff can drag unscheduled counseling events to a specific time slot | |
| 4.1.4 | Group therapy events can be created on the calendar | |
| 4.1.5 | Clicking a completed/scheduled Counseling event shows a "Log Recording" action | |
| 4.1.6 | Clicking a completed/scheduled GroupTherapy event shows a "Log Recording" action | |
| 4.1.7 | "Log Recording" navigates to the process recording form with resident and event pre-filled | |

### 4.2 — Process Recording Form (Individual)
| ID | Requirement | Audit |
|----|------------|-------|
| 4.2.1 | A process recording form exists at /admin/recordings/new | |
| 4.2.2 | Form captures session type (Individual, Group, Family, Crisis) | |
| 4.2.3 | Form captures emotional state at start of session | |
| 4.2.4 | Form captures emotional state at end of session | |
| 4.2.5 | Form captures interventions applied (multi-select) | |
| 4.2.6 | Form captures follow-up actions | |
| 4.2.7 | Form captures session narrative/notes | |
| 4.2.8 | Form captures restricted/confidential notes | |
| 4.2.9 | Form has a "Needs case conference" checkbox | |
| 4.2.10 | Form has a "Ready for reintegration assessment" checkbox | |
| 4.2.11 | Voice transcription is available for the narrative field | |
| 4.2.12 | When navigated to from the calendar, the residentId and calendarEventId are pre-filled | |
| 4.2.13 | Submitting the form marks the linked calendar event as Completed | |
| 4.2.14 | After submission from the calendar flow, the user is navigated back to the calendar | |

### 4.3 — Process Recording Form (Group Therapy)
| ID | Requirement | Audit |
|----|------------|-------|
| 4.3.1 | Group therapy sessions can record which residents attended | |
| 4.3.2 | One recording per group session covers all attendees | |

### 4.4 — End-of-Session Triggers
| ID | Requirement | Audit |
|----|------------|-------|
| 4.4.1 | Checking "Needs case conference" flags the resident for the next case conference | |
| 4.4.2 | Checking "Ready for reintegration assessment" creates a to-do item for scheduling a reintegration visit | |

### 4.5 — Unscheduled Sessions
| ID | Requirement | Audit |
|----|------------|-------|
| 4.5.1 | Staff can navigate to the Recordings page and log a new recording without a calendar event | |
| 4.5.2 | The recording can be attached to any resident | |

### 4.6 — Emotional Trajectory
| ID | Requirement | Audit |
|----|------------|-------|
| 4.6.1 | The resident's profile page shows an emotional trajectory visualization | |
| 4.6.2 | The trajectory is derived from start/end emotional states across process recordings | |
| 4.6.3 | An API endpoint exists for emotional trends data (/api/admin/recordings/emotional-trends) | |

### 4.7 — Profile Integration
| ID | Requirement | Audit |
|----|------------|-------|
| 4.7.1 | The resident's profile page shows their process recordings | |
| 4.7.2 | Staff can add a new recording from the profile page | |

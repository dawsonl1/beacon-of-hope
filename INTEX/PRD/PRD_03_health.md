# PRD 03 — Health & Wellbeing

## Overview
Staff schedule monthly doctor and dentist appointments for residents. The system generates scheduling tasks, and after appointments are completed, generates record-entry tasks. Health records track physical metrics and medical checkup completion.

---

## Requirements

### 3.1 — Appointment Scheduling Tasks
| ID | Requirement | Audit |
|----|------------|-------|
| 3.1.1 | A monthly "Schedule Doctor Appointment" to-do item appears for each active resident | |
| 3.1.2 | A monthly "Schedule Dentist Appointment" to-do item appears for each active resident | |
| 3.1.3 | Each scheduling task shows when the last visit occurred | |
| 3.1.4 | Clicking "Schedule" opens a modal with a mini calendar and time picker | |
| 3.1.5 | Selecting a date/time in the modal creates a DoctorApt or DentistApt calendar event | |
| 3.1.6 | The created calendar event title is the appointment name (e.g. "Doctor appt — R-1234"), not the task name | |
| 3.1.7 | The scheduling task is marked as Completed after scheduling | |
| 3.1.8 | Staff can snooze the scheduling task (postpones for ~30 days) | |
| 3.1.9 | Staff can dismiss the scheduling task | |

### 3.2 — Post-Appointment Record Entry
| ID | Requirement | Audit |
|----|------------|-------|
| 3.2.1 | After a scheduled doctor/dentist appointment is completed, an "Input Health Records" to-do item is auto-created | |
| 3.2.2 | Clicking "Log Records" on the to-do navigates to the health record form for that resident | |
| 3.2.3 | Submitting the health record form marks the to-do item as completed | |

### 3.3 — Health Record Form
| ID | Requirement | Audit |
|----|------------|-------|
| 3.3.1 | A health record form exists accessible from the resident's profile | |
| 3.3.2 | Form captures physical metrics: BMI, nutrition, sleep quality, energy levels | |
| 3.3.3 | Form captures medical checkup completion status | |
| 3.3.4 | Form captures dental checkup completion status | |
| 3.3.5 | Form captures psychological checkup completion status | |
| 3.3.6 | Submitting the form creates a new health record in the database | |
| 3.3.7 | When navigated to from the to-do or calendar, the back button returns to the calendar page | |

### 3.4 — Profile Integration
| ID | Requirement | Audit |
|----|------------|-------|
| 3.4.1 | The resident's profile page shows their health records | |
| 3.4.2 | Health records are viewable in a list or table format | |
| 3.4.3 | Staff can add a new health record from the profile page | |

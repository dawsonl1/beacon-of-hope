# PRD 02 — Education & Vocational

## Overview
Staff track monthly education progress for each resident. The system auto-generates to-do items when records are overdue, and staff log updates through a dedicated form.

---

## Requirements

### 2.1 — Auto-Generated To-Do Items
| ID | Requirement | Audit |
|----|------------|-------|
| 2.1.1 | A "Update Education Records" to-do item exists for residents who haven't had an education record entered in 30+ days | |
| 2.1.2 | The to-do item is assigned to the resident's social worker | |
| 2.1.3 | The to-do item shows which resident it's for (resident code visible) | |
| 2.1.4 | Clicking "Log Records" on the to-do navigates to the education record form for that resident | |

### 2.2 — Education Record Form
| ID | Requirement | Audit |
|----|------------|-------|
| 2.2.1 | An education record form exists accessible from the resident's profile | |
| 2.2.2 | Form captures program type (Bridge Program, Secondary Support, Vocational Skills, Literacy Boost) | |
| 2.2.3 | Form captures attendance metrics | |
| 2.2.4 | Form captures GPA-equivalent scores | |
| 2.2.5 | Form captures course completion percentages | |
| 2.2.6 | Submitting the form creates a new education record in the database | |

### 2.3 — Task Auto-Completion
| ID | Requirement | Audit |
|----|------------|-------|
| 2.3.1 | When a new education record is submitted via the to-do item flow, the to-do item is marked as completed | |
| 2.3.2 | The to-do item does not reappear for approximately one month after submission | |
| 2.3.3 | When navigated to from the to-do or calendar, the back button returns to the calendar page | |

### 2.4 — Profile Integration
| ID | Requirement | Audit |
|----|------------|-------|
| 2.4.1 | The resident's profile page shows their education records | |
| 2.4.2 | Education records are viewable in a list or table format | |
| 2.4.3 | Staff can add a new education record from the profile page | |

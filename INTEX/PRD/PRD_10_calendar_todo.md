# PRD 10 — Calendar & To-Do System

## Overview
The calendar and to-do list are the staff member's daily command center. The calendar shows a weekly view with drag-and-drop support. The to-do list shows auto-generated and manual tasks. Together they drive the daily workflow.

---

## Requirements

### 10.1 — Weekly Calendar View
| ID | Requirement | Audit |
|----|------------|-------|
| 10.1.1 | The Home page shows a weekly calendar grid (Mon–Sun, 6AM–7PM) | |
| 10.1.2 | Day column headers show the day name and date | |
| 10.1.3 | Today's column is visually highlighted | |
| 10.1.4 | Staff can navigate forward/backward by week | |
| 10.1.5 | A "Today" button returns to the current week | |
| 10.1.6 | Events are color-coded by type (Counseling, DoctorApt, etc.) | |
| 10.1.7 | Events show title, resident code, and time range | |
| 10.1.8 | Overlapping events are displayed side-by-side (not stacked) | |
| 10.1.9 | Completed events are visually distinct (strikethrough or opacity) | |

### 10.2 — All-Day / Parking Lot Row
| ID | Requirement | Audit |
|----|------------|-------|
| 10.2.1 | An "all-day" row exists above the time grid | |
| 10.2.2 | Events with no start time appear in the all-day row | |
| 10.2.3 | When there are many all-day events, a "+N more" button collapses them | |
| 10.2.4 | Clicking "+N more" expands to show all events | |

### 10.3 — Event Drag & Drop
| ID | Requirement | Audit |
|----|------------|-------|
| 10.3.1 | Scheduled events can be dragged to a different time slot | |
| 10.3.2 | Events can be dragged to a different day | |
| 10.3.3 | Events can be dragged from the all-day row to a time slot | |
| 10.3.4 | Events can be dragged from a time slot to the all-day row | |
| 10.3.5 | A drop indicator line shows the exact time where the event will land | |
| 10.3.6 | The drop indicator shows the time label (e.g. "2:30 PM") | |
| 10.3.7 | Dropping an event updates it in the database | |
| 10.3.8 | Event duration is preserved when dragging | |
| 10.3.9 | Events snap to 15-minute intervals | |

### 10.4 — Event Popover
| ID | Requirement | Audit |
|----|------------|-------|
| 10.4.1 | Clicking an event opens a detail popover | |
| 10.4.2 | Popover shows: title, date, time, resident, type, description, status | |
| 10.4.3 | Popover has a "View Patient" link to the resident's profile | |
| 10.4.4 | Counseling/GroupTherapy events show "Log Recording" action | |
| 10.4.5 | HomeVisit/ReintegrationVisit/PostPlacementVisit events show "Log Visit" action | |
| 10.4.6 | Other event types show "Complete" action | |
| 10.4.7 | Unscheduled events show a "Set Time" action | |
| 10.4.8 | Events can be cancelled from the popover | |
| 10.4.9 | Clicking outside the popover closes it | |

### 10.5 — New Event Creation
| ID | Requirement | Audit |
|----|------------|-------|
| 10.5.1 | A "New Event" button exists in the header | |
| 10.5.2 | Clicking it opens a modal form | |
| 10.5.3 | Form captures: type, resident, title, date, start time, end time, description | |
| 10.5.4 | Uses custom Dropdown, DatePicker, and TimePicker components (not native inputs) | |
| 10.5.5 | Submitting creates a new calendar event | |

### 10.6 — To-Do List Panel
| ID | Requirement | Audit |
|----|------------|-------|
| 10.6.1 | A to-do list panel exists alongside the calendar | |
| 10.6.2 | Tasks show an icon based on type (stethoscope for doctor, graduation cap for education, etc.) | |
| 10.6.3 | Tasks show the title, resident code (clickable link), description, and context | |
| 10.6.4 | Task count badge is shown in the panel header | |
| 10.6.5 | Scheduling tasks show a "Schedule" button that opens the scheduling modal | |
| 10.6.6 | Education/health tasks show a "Log Records" button that navigates to the form | |
| 10.6.7 | Other tasks show a "Done" button for direct completion | |
| 10.6.8 | Tasks have a snooze button (clock icon) | |
| 10.6.9 | Tasks have a dismiss button (X icon) | |
| 10.6.10 | Tasks have a "View Patient" link | |
| 10.6.11 | Completed/dismissed tasks animate out with a slide/fade | |

### 10.7 — Task Drag to Calendar
| ID | Requirement | Audit |
|----|------------|-------|
| 10.7.1 | To-do items can be dragged onto the calendar | |
| 10.7.2 | A floating ghost follows the cursor during drag | |
| 10.7.3 | The ghost collapses into an event-chip shape when crossing over the calendar | |
| 10.7.4 | A drop indicator shows where the event will land | |
| 10.7.5 | A preview chip shows the event in the target cell | |
| 10.7.6 | Dropping creates a calendar event at the drop time and day | |
| 10.7.7 | The ghost animates out on drop (fade + scale) | |
| 10.7.8 | Tasks can be dropped on the all-day row (creates unscheduled event) | |

### 10.8 — Schedule Modal
| ID | Requirement | Audit |
|----|------------|-------|
| 10.8.1 | The schedule modal shows the task title and resident | |
| 10.8.2 | Modal has a mini calendar for date selection | |
| 10.8.3 | Mini calendar starts on Monday | |
| 10.8.4 | Modal has a time picker with 15-minute interval slots | |
| 10.8.5 | A summary line shows the selected date and time | |
| 10.8.6 | "Schedule" button creates the calendar event and marks the task done | |
| 10.8.7 | "Cancel" button closes the modal without action | |

### 10.9 — Safehouse Filtering
| ID | Requirement | Audit |
|----|------------|-------|
| 10.9.1 | Calendar events are filtered by the active safehouse context | |
| 10.9.2 | To-do items are filtered by the active safehouse context | |
| 10.9.3 | Admins can switch between safehouses and see different data | |

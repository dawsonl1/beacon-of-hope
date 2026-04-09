# Beacon of Hope — Staff Workflow

## 1. Trauma Occurrence

A traumatizing event occurs: trafficking, sexual abuse, OSAEC, physical abuse, child labor, abandonment, or neglect.

---

## 2. Referral

The victim is referred to Beacon of Hope via:

- **Official channels:** government agencies, police, NGOs, court orders
- **Community channels:** community members or self-referral

---

## 3. Intake & Admission

A staff member creates a **Resident Record** with:

- **Demographics:** date of birth, birthplace, religion
- **Case classification:** category (Abandoned, Foundling, Surrendered, Neglected) and trauma sub-categories
- **Needs assessment:** disabilities, special needs, family vulnerability factors (solo parent, indigenous, informal settler)
- **Logistics:** initial risk level (Low–Critical), referral source, assigned social worker
- **ML prediction:** Incident Early Warning model runs immediately to flag self-harm and runaway risks

**What happens next:**

1. The resident enters the **unclaimed queue**
2. A social worker claims the case from the queue
3. The social worker conducts an **initial home visit** (auto-added to their to-do list, or marked N/A if the girl has no home)
4. Based on the initial visit, the social worker assigns a **recurring counseling cadence** — these sessions are automatically placed on the calendar as unscheduled events each week, ready to be dragged to a specific time

---

## 4. Residential Care (Parallel Tracks)

While in the safehouse, progress is tracked across several domains. Each domain generates **automatic to-do list items** and **calendar events** for the assigned social worker.

### Education & Vocational

**Programs:** Bridge Program, Secondary Support, Vocational Skills, Literacy Boost
**Tracking:** monthly attendance, GPA-equivalent scores, course completion percentages

**Workflow:**
- A monthly to-do item appears: "Update Education Records"
- Clicking the to-do item opens the resident's profile, where the staff member clicks "Update Education Record" to open the form
- Once a new record is submitted, the to-do item disappears for one month
- If no record is entered for 30+ days, the to-do item reappears

### Health & Wellbeing

**Physical:** monthly BMI, nutrition, sleep quality, energy levels
**Medical:** completion tracking for medical, dental, and psychological checkups

**Workflow — scheduling appointments:**
- Monthly to-do items appear: "Schedule Doctor Appointment" and "Schedule Dentist Appointment"
- Each shows when the last visit occurred
- Clicking "Schedule" opens a modal with a mini calendar and time picker — the staff member picks the date and time for the actual appointment, which creates the calendar event and marks the task as done
- Alternatively, they can snooze it for a month
- The to-do is for *scheduling*, not for inputting records

**Workflow — inputting records after appointments:**
- After a scheduled appointment is completed, a new to-do item appears: "Input Health Records"
- The staff member inputs data from the paper form the girl brought to the appointment
- Works the same as education record entry

### Counseling & Emotional Growth

**Sessions:** individual, group, family, or crisis
**Documentation:** process recordings capture emotional states (start vs. end), interventions, and progress

**Workflow — scheduled sessions:**
- Recurring counseling events appear on the calendar each week (unscheduled — dragged to a time)
- After a session, the staff member clicks the calendar event and presses "Log Recording"
- This opens the process recording form with fields auto-filled from the event
- Voice transcription is available for quick documentation

**Workflow — unscheduled sessions:**
- The staff member goes to the Recordings page and logs a new recording, attaching it to the resident

**Workflow — group therapy:**
- Staff schedule group therapy blocks on the calendar
- After the session, they click the event and press "Log Recording" — this opens a group therapy version of the form where they record who attended plus session details

**End-of-session options:**
- "Needs case conference" checkbox — flags the resident for the next case conference
- "Ready for reintegration assessment" checkbox — creates a to-do item to schedule an assessment

### Incident Management

**Reporting:** documents runaway attempts, self-harm, behavioral issues, security conflicts
**Resolution:** every incident is logged with severity, response action, and tracked resolution

**Workflow:**
- From the Incidents page, staff log a new incident and select the resident
- The safehouse's incidents are listed on the Incidents page; admins see all safehouses
- Each resident's profile shows their incidents
- If "Follow-Up Required" is marked, a to-do item is created for the assigned social worker
  - The follow-up item shows incident details and lets the staff member decide next steps (schedule counseling, doctor appointment, etc.)
  - If a counseling session is scheduled from the follow-up, the recording is automatically linked to the incident

### Fieldwork & Home Visitations

**Assessment:** social workers evaluate family home safety and cooperation levels
**Outcomes:** Favorable, Needs Improvement, Unfavorable, or Inconclusive

**Workflow:**
- When a case is claimed, an initial home visit to-do item is created (or marked N/A if no home)
- Clicking "Schedule" opens a modal where the staff member picks the date and time — this creates the calendar event and completes the task
- After the visit, the staff member logs it via "Log Visit" on the calendar event
- On the first visitation, the staff member sets a **recurring cadence** for future home visits
- Future home visit to-do items auto-appear based on that cadence

### Case Conferences & Planning

**Pillars of care:** Caring, Healing, Teaching, Legal
**Intervention plans:** Safety, Education, Physical Health — with numeric targets and status tracking (Open → In Progress → Achieved)

**Workflow:**
- Case conferences are auto-scheduled for Monday mornings on all staff calendars
- If no residents were flagged for "needs case conference" that week, the meeting is removed
- Residents also appear if their ML reintegration readiness score hasn't improved by 0.04 in the last 3 weeks — shown in an alert table with options to snooze, schedule a conference, or review intervention plans

**During a case conference:**
1. All staff open the Case Conferences page
2. Cards show each resident scheduled for discussion
3. Clicking a card opens the resident's full profile with editable intervention plans
4. The assigned social worker updates the intervention plan based on team discussion
5. Staff return to the conference page and proceed to the next resident

---

## 5. Reintegration Assessment

Before moving toward closure:

- **Readiness score:** ML Reintegration Readiness model scores the resident (0–100)
- **Legal milestones:** verified Certificate of Live Birth, completed final case study
- **Risk review:** comparison of current vs. initial risk levels

**Workflow:**
- At the end of a counseling session, the staff member can select "Ready for reintegration assessment"
- This creates a to-do item: "Schedule Reintegration Home Visit"
- Clicking "Schedule" opens a modal where the staff member picks the date and time for the visit, creating the calendar event and completing the task
- They also select the reintegration pathway being assessed
- They can also cancel the assessment (must be re-triggered from a future counseling session)

---

## 6. Reintegration Pathways

Placement is finalized through one of four routes:

- **Reunification:** return to biological family
- **Foster Care:** placement with a temporary resource family
- **Adoption:** domestic or inter-country placement
- **Independent Living:** for older girls with vocational skills

**Workflow:**
- After a reintegration visit, the staff member clicks the calendar event to "Log Reintegration Visit"
- The form includes: "Suitable for reintegration?" 
  - **Yes:** the pathway is assigned on the resident's profile
  - **No:** a new to-do item is created to schedule another assessment with a different pathway

---

## 7. Post-Placement & Closure

**Monitoring:** staff conduct follow-up home visits to ensure safety and stability
**Case closure:** once stability is confirmed, the record moves to Closed status

**Workflow:**
1. Staff member marks the resident as "reintegrated" on their profile
2. One week later, a to-do item appears: "Schedule Post-Placement Visit"
3. Clicking "Schedule" opens a modal to pick the date and time, creating the calendar event; after the visit, staff log it via the calendar event
4. The logging form lets the staff member either:
   - Set the interval until the next post-placement visit to-do item appears
   - Mark the case as "Closed"
5. Six months after closure, one final to-do item appears for a check-in visit
6. After that visit, the case is fully closed

**Post-placement monitoring dashboards:**
- Each staff member sees post-placement data for their residents
- Staff can also see aggregate post-placement data for all placed residents at their safehouse

**Weekly surveys:**
- When a resident is marked as reintegrated, their email is collected
- A short weekly survey is sent for the resident to report how they're doing
- Survey data is visible on the resident's profile and in aggregate dashboards
- Residents can request an emergency post-placement visit through the survey

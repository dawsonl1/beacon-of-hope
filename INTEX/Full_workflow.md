### **1\. Trauma Occurrence**

A traumatizing event occurs, including trafficking, sexual abuse, OSAEC, physical abuse, child labor, abandonment, or neglect.

### **2\. Referral**

The victim is referred to Beacon of Hope via:

* **Official Channels:** Government agencies, police, NGOs, or court orders.  
* **Community Channels:** Community members or self-referral.

### **3\. Intake & Admission**

Upon arrival at the safehouse, a staff member creates a comprehensive **Resident Record**:

* **Demographics:** Date of birth, birthplace, and religion.  
* **Case Classification:** Category (Abandoned, Foundling, Surrendered, Neglected) and applicable trauma sub-categories.  
* **Needs Assessment:** Disabilities, special needs, and family vulnerability factors (e.g., solo parent, indigenous, informal settler).  
* **Logistics:** Initial risk level (Low to Critical), referral source, and assigned social worker.  
* **Predictive Analytics:** The **ML Incident Early Warning** model runs immediately to flag self-harm and runaway risks, allowing for intensive monitoring from day one.

**Pages:** Intake form, victim profile, new Social Worker page  
**ML Features:** Incident Risk Prediction. Shows on profile page. Colored circle, shows risk assessment at the top. 

After a patent checks in, they are put into a queue where they will await a social worker to claim their case. Once claimed, they will oversee that patents progress from start to finish. They will also do an initial visit.

After the initial visit they will assign the girl a recurring cadence or counseling based on needs. Those recurring meetings will be automatically put into the social workers calendar.

How will will be implemented:

- All staff have access to the queue where they can claim unclaimed cases.  
- All staff have an in app calendar that they log into at the beginning of each day to see the days activities.  
  - They can see a collection of everything that needs to be done each day based on the recurring appointments with patients that they set up. They will schedule time in the assigned day manually  
- Staff have a to do list that is not attached to specific days. This to do list will have the following auto generated items for each claimed patient:  
  - Monthly: Schedule a doctor appointment. (they can say yes and then selected where that should go in the calendar, or they can say no and it gets snoozed for a month)  
  - Monthly: Schedule a Dentist appointment. (they can say yes and then selected where that should go in the calendar, or they can say no and it gets snoozed for a month)  
  - Monthly: Update educational fields for each person

---

### **4\. Residential Care (Parallel Tracks)**

While in the safehouse, progress is tracked across several specialized domains:

#### **🎓 Education & Vocational**

* **Programs:** Bridge Program, Secondary Support, Vocational Skills, Literacy Boost.  
* **Tracking:** Monthly metrics for attendance, GPA-equivalent scores, and course completion percentages.

When they click on the to-do list item, it opens up the profile page of the girl, and they can select the update education records button. They click on a button in the bottom right of the screen that is something like “update education record” and that opens up a form page where they can update the education records.

When the system sees a new education record in the system, the to-do list item disappears for a month. 

When the system looks at a girl and sees it’s been more than a month since they have had an updated education record, a to-do list item pops up for that girl’s assigned worker.

#### **🏥 Health & Wellbeing**

* **Physical:** Monthly tracking of BMI, nutrition, sleep quality, and energy levels.  
* **Medical:** Completion tracking for medical, dental, and psychological checkups.

When this to-do list pops up, the staff member can decide if it should be snoozed a month because the girl doesn't need another appointment, or if an appointment should be scheduled. The to do list will pop up with the last time they saw the dentist or doctor depending on if it is the to do list item for doctor or dentist.

The monthly to-do list item is to schedule the appointment , not input health records. After the appointment happens, the system automatically puts a to-do list item for inputting the records.

We make a paper form that the girl brings with her to the doctor/dentist appointment that the medical professional fills out. This is the data that the staff member will later input into the system.

For the inputting records task, it works just like inputting educational records, but with relevant fields. 

#### **🧠 Counseling & Emotional Growth**

* **Sessions:** Individual, group, family, or crisis sessions.  
* **Documentation:** Process recordings capture emotional states (start vs. end), interventions, and progress to visualize an **emotional trajectory**.

Website edit notes:

We already have the session recording page built. Some refinement needed on group vs individual forms. Interventions and follow-up actions applied should be multi-select. Add in ‘notes\_restricted’ field in that form.

Workflow:

After a scheduled counseling event, they can click on the calendar event and then click on a “process recording” button that opens up the “New process recording” page with some fields autofilled and they will be able to fill the rest in either by typing or through the quick voice transcription method.

When unscheduled counseling sessions occur, the worker will go onto the “recordings” page and log a new recording, attaching it to the related girl.

Staff should have the ability to schedule group therapy blocks as they want, and afterwards, when recording info about the group therapy, they can click ont he past calander event and press the  “process recording” button and it opens up a group therapy version of the “New process recording” where they can record who attended the group therapy and the other fields about it.

 \- Gap: The backend has an /api/admin/recordings/emotional-trends endpoint that is not surfaced in the UI — staff can't see a girl's emotional trajectory over time

#### **⚠️ Incident Management**

* **Reporting:** Documentation of runaway attempts, self-harm, behavioral issues, or security conflicts.  
* **Resolution:** Every incident is logged with a severity level, response action, and tracked resolution.

We need a way to log and manage incidents.

Incidents page where they can see past incidents for the safehouse they work at. Admins can see a master list of all safehouses.

Each profile page will show incidents related to the individual profile.

From the incident page, the user can log a new incident, and select the girl that it happened with and enter the details in.

If follow up required is “yes” it creates an action item for the assigned staff member to the girl where they can quickly see information about the incident, and decide what the best course of action is (like creating doctors appointment, counseling session, etc.) If they decide a counseling appointment needs to happen they will add it to the calendar like normal and when they are logging the session notes afterwards, it automatically connects that counseling session to the incident.

#### **🏠 Fieldwork & Home Visitations**

* **Assessment:** Social workers evaluate family home safety and cooperation levels.  
* **Outcomes:** Recorded as Favorable, Needs Improvement, Unfavorable, or Inconclusive.

This starts as a to do list item for the social worker. 

When a girl is claimed by a social worker, an initial assessment home visit is put in the to do list. That task goes from the to do list item into the calendar when it is scheduled. Or it can be marked as “not applicable” if the girl doesn’t have a home. 

Upon completion of a home visit, the staff member logs visit information in the “new home visitation” page. We need to add a cadence assignment when it is the first visitation for a girl. This will inform when the next home visit is auto put on the to do list to be scheduled.

#### **📋 Case Conferences & Planning**

* **Pillars of Care:** Services are assigned from four pillars: **Caring, Healing, Teaching, and Legal.**  
* **Intervention Plans:** Three specific plans (Safety, Education, Physical Health) are updated with numeric targets and status tracking (Open → In Progress → Achieved).

This is a formal team review meeting where staff sit down together and collaborate about what a girl needs to improve moving forward.

The case conference is an auto-scheduled meeting for Monday morning. There should be an option at the end of a counseling session or incident report (checkbox) that is ‘needs case conference’. If no girls in a  week were marked for “needs case conference” that auto-recurring meeting on all of the staff’s calendars is removed. 

A girl should show up if they do not improve by 0.04 score given by the machine learning pipeline in the last 3 weeks. score for integration readiness, they should pop up in an alert table with a one button click action to either snooze, schedule a case conference, or review the intervention plans for that girl. 

At a case conference:

	There will be a case conference page where it shows all the upcoming case conferences. During a case conference, all the staff are sitting in a circle, and all have the case conference page opened on their computers. They click the current meeting and it shows cards for each person scheduled to be discussed. When a card is clicked, it opens up that girl’s profile with all their data. From the profile page, the intervention plan is visible, and editable. This allows staff to brainstorm about what is currently happening and what should change for results to improve. The girl’s assigned staff member will update the intervention plan accordingly. Then all staff will go back to the case conference page, and click into the next girls profile and repeat.

For the website:

Split up case conferences so it is no longer on the same page as the home visitations. Case conferences should be its own tab in the header.

	

---

### **5\. Reintegration Assessment**

Before a case moves toward closure, the following must be met:

* **Readiness Score:** The **ML Reintegration Readiness** model scores the girl (0–100) to determine if she is "Ready."  
* **Legal Milestones:** Verification of registered Certificate of Live Birth and completion of the final case study.  
* **Risk Review:** Comparison of current risk levels versus initial intake levels.

At the end of a counseling session, the staff member uploading the details has the option to select “ready for reintegration assessment” and it goes into the to-do list to be scheduled.

From the to-do list, the item is “schedule reintegration home visit” and is completed by the staff member scheduling an applicable home visit or saying “NA”. When scheduling the integration assessment, they will select what pathway they are assessing. They can also pick a "cancel reintegration assessment option” that cancels the reintegration process and must be retriggered through the end of the counseling session trigger.

### **6\. Reintegration Pathways**

Placement is finalized through one of four routes:

* **Reunification:** Return to biological family.  
* **Foster Care:** Placement with a temporary resource family.  
* **Adoption:** Domestic or inter-country placement.  
* **Independent Living:** For older girls equipped with vocational skills.

After a reintegration visit is completed, the staff member will click on the previously scheduled reintegration to “log reintegration visit”. THis opens up a form where they enter information needed for the database. 1 important input will be “suitable for reintegration?” if the answer is yes, it is assigned as the reintegration pathway ont eh girls profile account. If the answer is no, a new to do list item is added to the staff for them to schedule a new reintegration assessment. This will allow them to pick a new reintegration pathway.

### **7\. Post-Placement & Closure**

* **Monitoring:** Staff conduct follow-up home visits to ensure safety and stability.  
* **Case Closure:** Once stability is confirmed, the record is officially moved to **Closed** status.

When a  girl is reintegrated, the staff member will go onto their account and mark them as reintegrated. One week after a girl is reintegrated, a to-do list item will show up on the staff member assigned to the girl to schedule a post placement monitoring visit. It will go on the calendar. After the visit, a new to-do list item is added to the list and is resolved by either clicking on the action item, or clicking on the calendar event and pressing the “log post placement visit” button. This opens a form page where they log in needed by the database and can either select how long it should be until the next “schedule post placement visit” to do list task pops up, or they can mark it as “closed”. Once a girl is marked as closed, 6 months later a to-do list item pops back up for the staff member where they schedule schedule one last reintegration visit to make sure things are still good.

Each staff member should be able to see the post placement monitoring data for their girls in one dashboard.

Staff members should also be able to see overall post placement monitoring for all placed girls from their safehouse.

As part of marking a girl as reintegrated, the staff member will get their email. Then every single week a short survey is sent to the girls email to let them update how they are feeling about things. This data will be visible on the girls profile, and part of the aggregate data shown in the overall office reintegrated girls dashboard, and the individual staff members reintegrated girls dashboard. Girls will be able to specifically ask for an emergency post placement reintegration visit if they want through this email.

FOR APP:

The girls profile page needs much more data. It should have all the data associated with the girl and also Machine learning pipeline predictive scores where applicable (such as reintegration readiness score)
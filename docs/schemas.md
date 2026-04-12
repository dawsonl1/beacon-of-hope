# Data Dictionary

## Table Overview

### Core Domain

| Table | Purpose |
| :---- | :---- |
| safehouses | Physical locations where girls are housed and served |
| residents | Case records for girls currently or formerly served |
| partners | Organizations and individuals who deliver services |
| partner\_assignments | Which partners serve which safehouses and in what capacity |
| supporters | People and organizations who donate money, goods, time, skills, or advocacy |
| donations | Individual donations across all types |
| in\_kind\_donation\_items | Item-level details for in-kind donations |
| donation\_allocations | How donation value is distributed across safehouses and program areas |

### Case Management

| Table | Purpose |
| :---- | :---- |
| process\_recordings | Dated counseling session notes for each resident |
| home\_visitations | Home and field visit records for residents and families |
| education\_records | Monthly education progress and attendance |
| health\_wellbeing\_records | Monthly physical health, nutrition, sleep, and energy |
| intervention\_plans | Individual intervention plans, goals, and services |
| incident\_reports | Individual safety and behavioral incident records |
| case\_conferences | Team review meetings where multiple residents are discussed |
| case\_conference\_residents | Residents included in a case conference |

### Staff Workspace

| Table | Purpose |
| :---- | :---- |
| staff\_tasks | Tasks assigned to staff from workflows, incidents, and manual creation |
| calendar\_events | Staff calendar events for visits, sessions, and tasks |
| user\_safehouses | Staff-to-safehouse assignments controlling row-level data access |
| donor\_outreaches | Outreach interactions logged for supporter relationship management |

### Social Media Automation

| Table | Purpose |
| :---- | :---- |
| automated\_posts | AI-generated posts with approve/reject workflow |
| social\_media\_settings | Global configuration for the automation system |
| voice\_guide | Brand voice configuration for AI content generation |
| content\_facts | Verified facts and statistics for content generation |
| content\_fact\_candidates | Pending facts from web research agent, awaiting review |
| content\_talking\_points | Reusable talking points for post generation |
| media\_library | Photo and media assets for social media content |
| generated\_graphics | AI-generated branded graphics (1080x1080) |
| graphic\_templates | Design templates for graphic generation |
| hashtag\_sets | Curated hashtag collections by platform and pillar |
| awareness\_dates | Calendar of awareness dates for content planning |
| cta\_configs | Call-to-action configurations for posts |
| milestone\_rules | Rules for auto-generating celebration posts at metric thresholds |

### Newsletters

| Table | Purpose |
| :---- | :---- |
| newsletters | AI-generated monthly newsletters with approve/send workflow |
| newsletter\_subscribers | Email subscribers with one-click unsubscribe |

### Machine Learning

| Table | Purpose |
| :---- | :---- |
| ml\_predictions | Current prediction scores, overwritten nightly by the ML pipeline |
| ml\_prediction\_history | Append-only history of all predictions for trend analysis |

### Analytics & Configuration

| Table | Purpose |
| :---- | :---- |
| social\_media\_posts | Historical social media activity, content, and engagement metrics |
| safehouse\_monthly\_metrics | Aggregated monthly outcome metrics for each safehouse |
| public\_impact\_snapshots | Anonymized aggregate impact reports for public dashboards |
| app\_settings | Key-value application configuration store |

---

## safehouses

Safehouse locations operated by the organization.

| Field | Type | Description |
| :---- | :---- | :---- |
| safehouse\_id | integer | Primary key |
| safehouse\_code | string | Human-readable short code (e.g., SH-01) |
| name | string | Display name |
| region | string | One of: Luzon, Visayas, Mindanao |
| city | string | City of the safehouse |
| province | string | Province of the safehouse |
| country | string | Always Philippines |
| open\_date | date | Date the safehouse opened |
| status | string | Active or Inactive |
| capacity\_girls | integer | Maximum number of girls the facility can house |
| capacity\_staff | integer | Target on-site staff headcount |
| current\_occupancy | integer | Current number of girls housed |
| notes | string | Free-text notes |

---

## partners

Organizations and individuals contracted to deliver services (education, operations, transport, etc.).

| Field | Type | Description |
| :---- | :---- | :---- |
| partner\_id | integer | Primary key |
| partner\_name | string | Full name or organization name |
| partner\_type | string | Organization or Individual |
| role\_type | string | One of: Education, Evaluation, SafehouseOps, FindSafehouse, Logistics, Transport, Maintenance |
| contact\_name | string | Primary contact person |
| email | string | Contact email address |
| phone | string | Contact phone number |
| region | string | Primary region served |
| status | string | Active or Inactive |
| start\_date | date | Contract start date |
| end\_date | date | Contract end date; null if still active |
| notes | string | Free-text notes |

---

## partner\_assignments

Assignments of partners to safehouses and program areas.

| Field | Type | Description |
| :---- | :---- | :---- |
| assignment\_id | integer | Primary key |
| partner\_id | integer | FK → partners.partner\_id |
| safehouse\_id | integer | FK → safehouses.safehouse\_id (nullable) |
| program\_area | string | One of: Education, Wellbeing, Operations, Transport, Maintenance |
| assignment\_start | date | Assignment start date |
| assignment\_end | date | Assignment end date; null if active |
| responsibility\_notes | string | Description of the assignment |
| is\_primary | boolean | Whether this is the partner's primary assignment |
| status | string | Active or Ended |

---

## supporters

Donors, volunteers, skilled contributors, and partner organizations that provide support.

| Field | Type | Description |
| :---- | :---- | :---- |
| supporter\_id | integer | Primary key |
| supporter\_type | string | One of: MonetaryDonor, InKindDonor, Volunteer, SkillsContributor, SocialMediaAdvocate, PartnerOrganization |
| display\_name | string | Name shown in communications |
| organization\_name | string | Organization name (null for individuals) |
| first\_name | string | First name (null for organizations) |
| last\_name | string | Last name (null for organizations) |
| relationship\_type | string | One of: Local, International, PartnerOrganization |
| region | string | Region of record |
| country | string | Country of the supporter |
| email | string | Contact email address |
| phone | string | Contact phone number |
| status | string | Active or Inactive |
| first\_donation\_date | date | Date of the supporter's first donation (nullable) |
| acquisition\_channel | string | How the supporter first learned about the organization. One of: Website, SocialMedia, Event, WordOfMouth, PartnerReferral, Church |
| created\_at | datetime | When the supporter record was created |

---

## donations

Donation events across all donation types.

| Field | Type | Description |
| :---- | :---- | :---- |
| donation\_id | integer | Primary key |
| supporter\_id | integer | FK → supporters.supporter\_id |
| donation\_type | string | One of: Monetary, InKind, Time, Skills, SocialMedia |
| donation\_date | date | Date of the donation |
| channel\_source | string | One of: Campaign, Event, Direct, SocialMedia, PartnerReferral |
| currency\_code | string | PHP for monetary (in Philippine pesos); null otherwise |
| amount | decimal | Monetary amount; null for non-monetary |
| estimated\_value | decimal | Value in the unit given by impact\_unit |
| impact\_unit | string | One of: pesos, items, hours, campaigns |
| is\_recurring | boolean | Whether this donation is part of a recurring commitment |
| campaign\_name | string | Name of the fundraising campaign, if applicable (nullable). Examples: Year-End Hope, Back to School, Summer of Safety, GivingTuesday |
| notes | string | Free-text notes |
| created\_by\_partner\_id | integer | FK → partners.partner\_id (nullable) |
| referral\_post\_id | integer | FK → social\_media\_posts.post\_id (nullable). Populated for donations where channel\_source is SocialMedia, linking to the post that likely referred the donation |

---

## in\_kind\_donation\_items

Line-item details for in-kind donations.

| Field | Type | Description |
| :---- | :---- | :---- |
| item\_id | integer | Primary key |
| donation\_id | integer | FK → donations.donation\_id |
| item\_name | string | Item description |
| item\_category | string | One of: Food, Supplies, Clothing, SchoolMaterials, Hygiene, Furniture, Medical |
| quantity | integer | Quantity donated |
| unit\_of\_measure | string | One of: pcs, boxes, kg, sets, packs |
| estimated\_unit\_value | decimal | Estimated value per unit in Philippine pesos (PHP) |
| intended\_use | string | One of: Meals, Education, Shelter, Hygiene, Health |
| received\_condition | string | One of: New, Good, Fair |

---

## donation\_allocations

How donations are allocated across safehouses and program areas.

| Field | Type | Description |
| :---- | :---- | :---- |
| allocation\_id | integer | Primary key |
| donation\_id | integer | FK → donations.donation\_id |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |
| program\_area | string | One of: Education, Wellbeing, Operations, Transport, Maintenance, Outreach |
| amount\_allocated | decimal | Allocated value in Philippine pesos (PHP) |
| allocation\_date | date | Date of allocation |
| allocation\_notes | string | Free-text notes |

---

## residents

Case records for girls currently or formerly served by the organization. This table is modeled after real caseload inventory documentation used by Philippine social welfare agencies.

| Field | Type | Description |
| :---- | :---- | :---- |
| resident\_id | integer | Primary key |
| case\_control\_no | string | Case control number (e.g., C0073) |
| internal\_code | string | Anonymized internal identifier |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |
| case\_status | string | One of: Active, Closed, Transferred |
| sex | string | F (all residents in this program are female) |
| date\_of\_birth | date | Date of birth |
| birth\_status | string | One of: Marital, Non-Marital |
| place\_of\_birth | string | City/municipality of birth |
| religion | string | Religious affiliation |
| case\_category | string | One of: Abandoned, Foundling, Surrendered, Neglected |
| sub\_cat\_orphaned | boolean | Is the child orphaned? |
| sub\_cat\_trafficked | boolean | Is the child a trafficked child? |
| sub\_cat\_child\_labor | boolean | Is the child a victim of child labor? |
| sub\_cat\_physical\_abuse | boolean | Is the child a victim of physical abuse? |
| sub\_cat\_sexual\_abuse | boolean | Is the child a victim of sexual abuse? |
| sub\_cat\_osaec | boolean | Is the child a victim of OSAEC/CSAEM? |
| sub\_cat\_cicl | boolean | Is the child in conflict with the law (CICL)? |
| sub\_cat\_at\_risk | boolean | Is the child at risk (CAR)? |
| sub\_cat\_street\_child | boolean | Is the child in a street situation? |
| sub\_cat\_child\_with\_hiv | boolean | Is the child living with HIV? |
| is\_pwd | boolean | Is the child a person with a disability? |
| pwd\_type | string | Type of disability if applicable (nullable) |
| has\_special\_needs | boolean | Does the child have mental/health/developmental needs? |
| special\_needs\_diagnosis | string | Diagnosis/type if applicable (nullable) |
| family\_is\_4ps | boolean | Is the family a 4Ps (Pantawid Pamilyang Pilipino Program) beneficiary? |
| family\_solo\_parent | boolean | Is the parent a solo parent? |
| family\_indigenous | boolean | Is the family part of an indigenous group? |
| family\_parent\_pwd | boolean | Is the parent a person with a disability? |
| family\_informal\_settler | boolean | Is the family an informal settler or homeless? |
| date\_of\_admission | date | Date admitted to the safehouse |
| age\_upon\_admission | string | Age at admission (e.g., 13 Years 2 months), current data may not be calculated accurately. |
| present\_age | string | Current age as of reporting date, current data may not be calculated accurately |
| length\_of\_stay | string | Duration in the center (e.g., 3 Years 1 months), current data may not be calculated accurately |
| referral\_source | string | One of: Government Agency, NGO, Police, Self-Referral, Community, Court Order |
| referring\_agency\_person | string | Name of referring agency or person |
| date\_colb\_registered | date | Date Certificate of Live Birth (COLB) was registered (nullable) |
| date\_colb\_obtained | date | Date Certificate of Live Birth (COLB) was obtained from Local Civil Registry (LCR) or Philippine Statistics Authority (PSA) (nullable) |
| assigned\_social\_worker | string | Name(s) of assigned social worker(s) |
| initial\_case\_assessment | string | Initial assessment/plan (e.g., For Reunification, For Foster Care) |
| date\_case\_study\_prepared | date | Date the child case study report was prepared (nullable) |
| reintegration\_type | string | One of: Family Reunification, Foster Care, Adoption (Domestic), Adoption (Inter-Country), Independent Living, None (nullable) |
| reintegration\_status | string | One of: Not Started, In Progress, Completed, On Hold (nullable) |
| initial\_risk\_level | string | Risk level assessed at intake. One of: Low, Medium, High, Critical |
| current\_risk\_level | string | Most recently assessed risk level. One of: Low, Medium, High, Critical |
| date\_enrolled | date | Same as date\_of\_admission (for compatibility) |
| date\_closed | date | Date the case was closed; null if still open |
| created\_at | datetime | Record creation timestamp |
| notes\_restricted | string | Restricted-access free-text field |

---

## process\_recordings

Structured counseling session notes for each resident, following the "Process Recording" format used by Philippine social welfare practitioners. Each entry documents a dated interaction between a social worker and a resident, including observations, interventions, and follow-up actions.

| Field | Type | Description |
| :---- | :---- | :---- |
| recording\_id | integer | Primary key |
| resident\_id | integer | FK → residents.resident\_id |
| session\_date | date | Date of the counseling session |
| social\_worker | string | Name of the social worker conducting the session |
| session\_type | string | One of: Individual, Group |
| session\_duration\_minutes | integer | Duration of the session in minutes |
| emotional\_state\_observed | string | Emotional state at the start of the session. One of: Calm, Anxious, Sad, Angry, Hopeful, Withdrawn, Happy, Distressed |
| emotional\_state\_end | string | Emotional state at the end of the session. Same enum as emotional\_state\_observed |
| session\_narrative | string | Narrative summary of the session (what was discussed, what was observed) |
| interventions\_applied | string | Description of interventions or techniques used |
| follow\_up\_actions | string | Planned follow-up actions |
| progress\_noted | boolean | Whether progress was noted in this session |
| concerns\_flagged | boolean | Whether any concerns were flagged |
| referral\_made | boolean | Whether a referral was made to another professional (e.g., psychologist, legal) |
| notes\_restricted | string | Restricted-access free-text field |

---

## home\_visitations

Records of home and field visits conducted by social workers to the families or guardians of residents. Home visitations are a critical part of case assessment, reintegration planning, and post-placement monitoring.

| Field | Type | Description |
| :---- | :---- | :---- |
| visitation\_id | integer | Primary key |
| resident\_id | integer | FK → residents.resident\_id |
| visit\_date | date | Date of the visit |
| social\_worker | string | Name of the social worker who conducted the visit |
| visit\_type | string | One of: Initial Assessment, Routine Follow-Up, Reintegration Assessment, Post-Placement Monitoring, Emergency |
| location\_visited | string | Location or address visited |
| family\_members\_present | string | Description of who was present (e.g., "Mother and aunt") |
| purpose | string | Purpose of the visit |
| observations | string | Narrative observations about the home environment and family |
| family\_cooperation\_level | string | One of: Highly Cooperative, Cooperative, Neutral, Uncooperative |
| safety\_concerns\_noted | boolean | Whether safety concerns were noted during the visit |
| follow\_up\_needed | boolean | Whether follow-up action is needed |
| follow\_up\_notes | string | Details of required follow-up (nullable) |
| visit\_outcome | string | One of: Favorable, Needs Improvement, Unfavorable, Inconclusive |

---

## education\_records

Monthly education progress records for each resident, tracking enrollment in educational programs, attendance, and academic progress.

| Field | Type | Description |
| :---- | :---- | :---- |
| education\_record\_id | integer | Primary key |
| resident\_id | integer | FK → residents.resident\_id |
| record\_date | date | Date of the record |
| program\_name | string | One of: Bridge Program, Secondary Support, Vocational Skills, Literacy Boost |
| course\_name | string | One of: Math, English, Science, Life Skills, Computer Basics, Livelihood |
| education\_level | string | One of: Primary, Secondary, Vocational, CollegePrep |
| attendance\_status | string | One of: Present, Late, Absent |
| attendance\_rate | decimal | Rolling attendance rate (0.0–1.0) |
| progress\_percent | decimal | Overall program progress (0–100) |
| completion\_status | string | One of: NotStarted, InProgress, Completed |
| gpa\_like\_score | decimal | Grade-like composite (1.0–5.0 scale) |
| notes | string | Free-text notes |

---

## health\_wellbeing\_records

Monthly physical health and wellbeing records for each resident, including medical, dental, and nutritional assessments.

| Field | Type | Description |
| :---- | :---- | :---- |
| health\_record\_id | integer | Primary key |
| resident\_id | integer | FK → residents.resident\_id |
| record\_date | date | Date of the record |
| weight\_kg | decimal | Body weight in kilograms |
| height\_cm | decimal | Height in centimeters |
| bmi | decimal | Body mass index |
| nutrition\_score | decimal | Nutrition quality score (1.0–5.0) |
| sleep\_score | decimal | Sleep quality score (1.0–5.0) |
| energy\_score | decimal | Daytime energy score (1.0–5.0) |
| general\_health\_score | decimal | Overall health score (1.0–5.0) |
| medical\_checkup\_done | boolean | Whether a medical check-up was conducted this period |
| dental\_checkup\_done | boolean | Whether a dental check-up was conducted this period |
| psychological\_checkup\_done | boolean | Whether a psychological check-up was conducted this period |
| medical\_notes\_restricted | string | Restricted-access free-text field |

---

## intervention\_plans

Individual intervention plans, goals, and services provided to each resident. Each plan represents a structured goal with a target area, description, and progress tracking. Plans are created during case conferences and updated during process recording sessions.

| Field | Type | Description |
| :---- | :---- | :---- |
| plan\_id | integer | Primary key |
| resident\_id | integer | FK → residents.resident\_id |
| plan\_category | string | One of: Safety, Psychosocial, Education, Physical Health, Legal, Reintegration |
| plan\_description | string | Description of the intervention or goal |
| services\_provided | string | Services provided (e.g., Caring, Healing, Teaching, Legal Services) |
| target\_value | decimal | Numeric target for the goal on the relevant scale (nullable) |
| target\_date | date | Target date for achievement |
| status | string | One of: Open, In Progress, Achieved, On Hold, Closed |
| case\_conference\_date | date | Date of the case conference where this plan was created/reviewed (nullable) |
| created\_at | datetime | Record creation timestamp |
| updated\_at | datetime | Last update timestamp |

---

## incident\_reports

Individual safety and behavioral incident records for residents. Each row represents a specific incident that was observed, reported, or documented by staff. Incident data provides granular detail beyond the monthly aggregate counts in safehouse\_monthly\_metrics.

| Field | Type | Description |
| :---- | :---- | :---- |
| incident\_id | integer | Primary key |
| resident\_id | integer | FK → residents.resident\_id |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |
| incident\_date | date | Date of the incident |
| incident\_type | string | One of: Behavioral, Medical, Security, RunawayAttempt, SelfHarm, ConflictWithPeer, PropertyDamage |
| severity | string | One of: Low, Medium, High |
| description | string | Narrative description of the incident |
| response\_taken | string | Description of the staff response |
| resolved | boolean | Whether the incident has been resolved |
| resolution\_date | date | Date the incident was resolved (nullable) |
| reported\_by | string | Name of the staff member who reported the incident |
| follow\_up\_required | boolean | Whether follow-up action is required |

---

## social\_media\_posts

Records of the organization's social media activity across platforms, modeled after the data available through platform APIs (Twitter/X, Facebook Graph, Instagram Insights, TikTok, LinkedIn, YouTube Data, WhatsApp Channels). Each row represents a single post with its content, metadata, and engagement metrics. Used to analyze social media effectiveness and its relationship to donor behavior.

| Field | Type | Description |
| :---- | :---- | :---- |
| post\_id | integer | Primary key |
| platform | string | One of: Facebook, Instagram, Twitter, TikTok, LinkedIn, YouTube, WhatsApp |
| platform\_post\_id | string | Simulated platform-native post ID (e.g., fb\_1234567890123456) |
| post\_url | string | Permalink URL to the post |
| created\_at | datetime | Full date and time the post was published (includes hour and minute) |
| day\_of\_week | string | Day of the week (e.g., Monday, Tuesday) |
| post\_hour | integer | Hour of the day the post was published (0–23) |
| post\_type | string | One of: ImpactStory, Campaign, EventPromotion, ThankYou, EducationalContent, FundraisingAppeal |
| media\_type | string | One of: Photo, Video, Carousel, Text, Reel |
| caption | string | Full text caption of the post |
| hashtags | string | Comma-separated list of hashtags used (e.g., \#EndTrafficking, \#HopeForGirls) |
| num\_hashtags | integer | Count of hashtags used |
| mentions\_count | integer | Number of @mentions in the post |
| has\_call\_to\_action | boolean | Whether the post includes a call to action |
| call\_to\_action\_type | string | One of: DonateNow, LearnMore, ShareStory, SignUp (nullable) |
| content\_topic | string | One of: Education, Health, Reintegration, DonorImpact, SafehouseLife, EventRecap, CampaignLaunch, Gratitude, AwarenessRaising |
| sentiment\_tone | string | One of: Hopeful, Urgent, Celebratory, Informative, Grateful, Emotional |
| caption\_length | integer | Character count of the caption |
| features\_resident\_story | boolean | Whether the post features a specific resident's anonymized story |
| campaign\_name | string | Associated campaign name, if any (nullable). Uses the same campaign names as donations.campaign\_name |
| is\_boosted | boolean | Whether paid promotion was used for this post |
| boost\_budget\_php | decimal | Amount spent on paid promotion in Philippine pesos (PHP) (nullable; only populated if is\_boosted is true) |
| impressions | integer | Total number of times the post was displayed |
| reach | integer | Number of unique accounts that saw the post |
| likes | integer | Number of likes or reactions |
| comments | integer | Number of comments |
| shares | integer | Number of shares or retweets |
| saves | integer | Number of saves or bookmarks |
| click\_throughs | integer | Number of clicks to the organization's website |
| video\_views | integer | Number of video views (nullable; only populated for Video and Reel media types) |
| engagement\_rate | decimal | Engagement rate: (likes \+ comments \+ shares) / reach |
| profile\_visits | integer | Number of profile visits attributed to this post |
| donation\_referrals | integer | Number of donations attributed to this post |
| estimated\_donation\_value\_php | decimal | Estimated total Philippine pesos (PHP) value of donations referred by this post |
| follower\_count\_at\_post | integer | Organization's follower count on this platform at the time of posting |
| watch\_time\_seconds | integer | Total watch time in seconds across all viewers (nullable; only populated for YouTube posts) |
| avg\_view\_duration\_seconds | integer | Average number of seconds each viewer watched (nullable; only populated for YouTube posts) |
| subscriber\_count\_at\_post | integer | YouTube subscriber count at the time of posting (nullable; only populated for YouTube posts) |
| forwards | integer | Number of message forwards (nullable; only populated for WhatsApp posts). WhatsApp forwards represent personal referrals with high donation conversion rates |

---

## safehouse\_monthly\_metrics

Pre-aggregated monthly metrics for each safehouse.

| Field | Type | Description |
| :---- | :---- | :---- |
| metric\_id | integer | Primary key |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |
| month\_start | date | First day of the month |
| month\_end | date | Last day of the month |
| active\_residents | integer | Number of residents assigned during the month |
| avg\_education\_progress | decimal | Mean education progress (0–100) |
| avg\_health\_score | decimal | Mean general health score (1.0–5.0) |
| process\_recording\_count | integer | Total process recording entries for the month |
| home\_visitation\_count | integer | Total home visitations conducted |
| incident\_count | integer | Total safety incidents recorded (from incident\_reports) |
| notes | string | Free-text notes |

---

## public\_impact\_snapshots

Monthly anonymized aggregate impact reports intended for public-facing dashboards and donor communications.

| Field | Type | Description |
| :---- | :---- | :---- |
| snapshot\_id | integer | Primary key |
| snapshot\_date | date | Month the snapshot represents |
| headline | string | Headline text for the snapshot |
| summary\_text | string | Short paragraph summary |
| metric\_payload\_json | string | JSON string of aggregated metrics |
| is\_published | boolean | Whether the snapshot has been published |
| published\_at | date | Publication date |

---

## app\_settings

Key-value application configuration store.

| Field | Type | Description |
| :---- | :---- | :---- |
| key | string | Setting name (primary key) |
| value | string | Setting value |

---

## automated\_posts

AI-generated social media posts managed through an approve/reject workflow.

| Field | Type | Description |
| :---- | :---- | :---- |
| automated\_post\_id | integer | Primary key |
| content | text | Post content (may be edited after generation) |
| original\_content | text | Original AI-generated content before edits |
| content\_pillar | string | One of: safehouse\_life, the\_problem, the\_solution, donor\_impact, call\_to\_action |
| source | string | How the post was created (e.g., ai\_generated, manual, milestone, recycled) |
| status | string | One of: draft, scheduled, ready, published, rejected, snoozed |
| snoozed\_until | datetime | When a snoozed post should resurface (nullable) |
| platform | string | Target platform (e.g., instagram, facebook, twitter) |
| media\_id | integer | FK → media\_library.media\_library\_item\_id (nullable) |
| generated\_graphic\_id | integer | FK → generated\_graphics.generated\_graphic\_id (nullable) |
| fact\_id | integer | FK → content\_facts.content\_fact\_id (nullable) |
| talking\_point\_id | integer | FK → content\_talking\_points.content\_talking\_point\_id (nullable) |
| scheduled\_at | datetime | Scheduled publication time (nullable) |
| approved\_by | string | Email of the user who approved (nullable) |
| approved\_at | datetime | Approval timestamp (nullable) |
| rejection\_reason | text | Reason for rejection (nullable) |
| milestone\_rule\_id | integer | FK → milestone\_rules.milestone\_rule\_id (nullable) |
| recycled\_from\_id | integer | FK → automated\_posts.automated\_post\_id (nullable, self-reference) |
| engagement\_likes | integer | Likes after publishing (nullable) |
| engagement\_shares | integer | Shares after publishing (nullable) |
| engagement\_comments | integer | Comments after publishing (nullable) |
| engagement\_donations | decimal | Donation value attributed to this post (nullable) |
| created\_at | datetime | Record creation timestamp |
| updated\_at | datetime | Last update timestamp |

---

## awareness\_dates

Calendar of awareness dates and campaigns for content planning.

| Field | Type | Description |
| :---- | :---- | :---- |
| awareness\_date\_id | integer | Primary key |
| name | string | Name of the awareness date or campaign |
| date\_start | date | Start date |
| date\_end | date | End date |
| recurrence | string | Recurrence pattern (e.g., annual) |
| pillar\_emphasis | string | Content pillar to emphasize |
| description | text | Description of the awareness date |
| is\_active | boolean | Whether this date is active for content planning |
| created\_at | datetime | Record creation timestamp |

---

## calendar\_events

Staff calendar events for scheduling visits, sessions, and tasks.

| Field | Type | Description |
| :---- | :---- | :---- |
| calendar\_event\_id | integer | Primary key |
| staff\_user\_id | string | FK → AspNetUsers.Id |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |
| resident\_id | integer | FK → residents.resident\_id (nullable) |
| event\_type | string | One of: HomeVisit, ProcessRecording, CaseConference, Reintegration, Medical, Education, Other |
| title | string | Event title |
| description | text | Event description (nullable) |
| event\_date | date | Date of the event |
| start\_time | time | Start time (nullable) |
| end\_time | time | End time (nullable) |
| recurrence\_rule | string | Recurrence pattern (nullable) |
| source\_task\_id | integer | FK → staff\_tasks.staff\_task\_id (nullable) |
| status | string | One of: Scheduled, Completed, Cancelled |
| created\_at | datetime | Record creation timestamp |

---

## case\_conferences

Team review meetings where multiple residents are discussed.

| Field | Type | Description |
| :---- | :---- | :---- |
| conference\_id | integer | Primary key |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |
| scheduled\_date | date | Date of the conference |
| status | string | One of: Scheduled, Completed, Cancelled |
| notes | text | Conference notes (nullable) |
| created\_at | datetime | Record creation timestamp |

---

## case\_conference\_residents

Residents included in a case conference.

| Field | Type | Description |
| :---- | :---- | :---- |
| id | integer | Primary key |
| conference\_id | integer | FK → case\_conferences.conference\_id |
| resident\_id | integer | FK → residents.resident\_id |
| source | string | How the resident was added (e.g., ml\_flagged, manual) |
| discussed | boolean | Whether the resident was discussed |
| notes | text | Discussion notes (nullable) |
| added\_at | datetime | When the resident was added to the conference |

---

## content\_facts

Verified facts and statistics used in social media content generation.

| Field | Type | Description |
| :---- | :---- | :---- |
| content\_fact\_id | integer | Primary key |
| fact\_text | text | The fact or statistic |
| source\_name | string | Source attribution |
| source\_url | string | URL to the source |
| category | string | Topic category |
| pillar | string | Content pillar this fact supports |
| usage\_count | integer | Number of times used in generated posts |
| is\_active | boolean | Whether available for content generation |
| added\_by | string | Who added this fact |
| added\_at | datetime | When the fact was added |

---

## content\_fact\_candidates

Pending facts discovered by the web research agent, awaiting human review.

| Field | Type | Description |
| :---- | :---- | :---- |
| content\_fact\_candidate\_id | integer | Primary key |
| fact\_text | text | The candidate fact |
| source\_name | string | Source attribution |
| source\_url | string | URL to the source |
| category | string | Topic category |
| search\_query | string | The search query that found this fact |
| status | string | One of: pending, approved, rejected |
| reviewed\_by | string | Who reviewed this candidate (nullable) |
| reviewed\_at | datetime | Review timestamp (nullable) |
| created\_at | datetime | When the candidate was discovered |

---

## content\_talking\_points

Reusable talking points for social media content generation.

| Field | Type | Description |
| :---- | :---- | :---- |
| content\_talking\_point\_id | integer | Primary key |
| text | text | The talking point |
| topic | string | Topic category |
| usage\_count | integer | Number of times used |
| is\_active | boolean | Whether available for content generation |
| created\_at | datetime | Record creation timestamp |
| updated\_at | datetime | Last update timestamp |

---

## cta\_configs

Call-to-action configurations for social media posts.

| Field | Type | Description |
| :---- | :---- | :---- |
| cta\_config\_id | integer | Primary key |
| title | string | CTA title |
| description | text | CTA description |
| goal\_amount | decimal | Fundraising goal (nullable) |
| current\_amount | decimal | Current progress (nullable) |
| url | string | CTA destination URL |
| is\_active | boolean | Whether this CTA is active |
| priority | integer | Display priority |
| created\_at | datetime | Record creation timestamp |
| updated\_at | datetime | Last update timestamp |

---

## donor\_outreaches

Outreach interactions logged by staff for supporter relationship management.

| Field | Type | Description |
| :---- | :---- | :---- |
| id | integer | Primary key |
| supporter\_id | integer | FK → supporters.supporter\_id |
| staff\_email | string | Email of the staff member who made the outreach |
| staff\_name | string | Name of the staff member |
| outreach\_type | string | One of: Call, Email, Meeting, Event, Other |
| note | text | Outreach notes (nullable) |
| created\_at | datetime | When the outreach was logged |

---

## generated\_graphics

AI-generated branded graphics (1080x1080) for social media posts.

| Field | Type | Description |
| :---- | :---- | :---- |
| generated\_graphic\_id | integer | Primary key |
| file\_path | string | Path to the generated image file |
| template\_id | integer | FK → graphic\_templates.graphic\_template\_id (nullable) |
| overlay\_text | text | Text overlay on the graphic |
| created\_at | datetime | Generation timestamp |

---

## graphic\_templates

Design templates for branded graphic generation.

| Field | Type | Description |
| :---- | :---- | :---- |
| graphic\_template\_id | integer | Primary key |
| name | string | Template name |
| file\_path | string | Path to the background image |
| text\_color | string | Text color hex code |
| text\_position | string | Text positioning (e.g., center, bottom) |
| suitable\_for | jsonb | Content pillars this template works for |
| created\_at | datetime | Record creation timestamp |

---

## hashtag\_sets

Curated hashtag collections for social media posts.

| Field | Type | Description |
| :---- | :---- | :---- |
| hashtag\_set\_id | integer | Primary key |
| name | string | Set name |
| category | string | Topic category |
| pillar | string | Content pillar |
| platform | string | Target platform |
| hashtags | jsonb | Array of hashtag strings |
| created\_at | datetime | Record creation timestamp |
| updated\_at | datetime | Last update timestamp |

---

## media\_library

Photo and media assets for social media content.

| Field | Type | Description |
| :---- | :---- | :---- |
| media\_library\_item\_id | integer | Primary key |
| file\_path | string | Path or URL to the media file |
| thumbnail\_path | string | Path to thumbnail (nullable) |
| caption | text | Description of the media |
| activity\_type | string | Type of activity depicted |
| safehouse\_id | integer | FK → safehouses.safehouse\_id (nullable) |
| uploaded\_by | string | Who uploaded the media |
| consent\_confirmed | boolean | Whether consent for use was confirmed |
| used\_count | integer | Number of times used in posts |
| uploaded\_at | datetime | Upload timestamp |

---

## milestone\_rules

Rules for automatically generating celebration posts when metrics reach thresholds.

| Field | Type | Description |
| :---- | :---- | :---- |
| milestone\_rule\_id | integer | Primary key |
| name | string | Rule name |
| metric\_name | string | Metric to monitor (e.g., total\_donations) |
| threshold\_type | string | Type of threshold (e.g., cumulative, per\_month) |
| threshold\_value | decimal | Value that triggers the milestone |
| cooldown\_days | integer | Minimum days between triggers |
| post\_template | text | Template for the celebration post |
| last\_triggered\_at | datetime | When this rule last triggered (nullable) |
| is\_active | boolean | Whether this rule is active |
| created\_at | datetime | Record creation timestamp |
| updated\_at | datetime | Last update timestamp |

---

## ml\_predictions

Current ML prediction scores for residents and supporters. Overwritten nightly by the ML pipeline.

| Field | Type | Description |
| :---- | :---- | :---- |
| id | bigint | Primary key |
| entity\_type | string | One of: resident, supporter |
| entity\_id | integer | ID of the resident or supporter |
| model\_name | string | Name of the ML model |
| model\_version | string | Model version identifier |
| score | decimal | Prediction score (0-100) |
| score\_label | string | Risk category: Critical, High, Medium, Low |
| predicted\_at | datetime | When the prediction was generated |
| metadata | jsonb | Additional model-specific data (feature importances, drivers) |

---

## ml\_prediction\_history

Append-only history of all ML predictions for trend analysis.

| Field | Type | Description |
| :---- | :---- | :---- |
| id | bigint | Primary key |
| entity\_type | string | One of: resident, supporter |
| entity\_id | integer | ID of the resident or supporter |
| model\_name | string | Name of the ML model |
| model\_version | string | Model version identifier |
| score | decimal | Prediction score (0-100) |
| score\_label | string | Risk category: Critical, High, Medium, Low |
| predicted\_at | datetime | When the prediction was generated |
| metadata | jsonb | Additional model-specific data |

---

## newsletters

AI-generated monthly newsletters with approve/send workflow.

| Field | Type | Description |
| :---- | :---- | :---- |
| newsletter\_id | integer | Primary key |
| subject | string | Email subject line |
| html\_content | text | Full HTML email body |
| plain\_text | text | Plain text fallback |
| status | string | One of: draft, approved, sent |
| generated\_at | datetime | When the newsletter was generated |
| approved\_by | string | Who approved it (nullable) |
| approved\_at | datetime | Approval timestamp (nullable) |
| sent\_at | datetime | When it was sent (nullable) |
| recipient\_count | integer | Number of recipients |
| month\_year | integer | Encoded month/year (YYYYMM) |

---

## newsletter\_subscribers

Email subscribers for monthly newsletters.

| Field | Type | Description |
| :---- | :---- | :---- |
| newsletter\_subscriber\_id | integer | Primary key |
| email | string | Subscriber email |
| name | string | Subscriber name (nullable) |
| subscribed\_at | datetime | Subscription timestamp |
| unsubscribe\_token | string | Token for one-click unsubscribe |
| is\_active | boolean | Whether the subscription is active |

---

## social\_media\_settings

Global configuration for the social media automation system.

| Field | Type | Description |
| :---- | :---- | :---- |
| social\_media\_settings\_id | integer | Primary key |
| posts\_per\_week | integer | Target number of posts per week |
| platforms\_active | jsonb | Array of active platform names |
| timezone | string | Timezone for scheduling |
| recycling\_enabled | boolean | Whether post recycling is enabled |
| daily\_generation\_time | string | Time of day for auto-generation |
| daily\_spend\_cap\_usd | decimal | Daily budget cap for boosted posts |
| max\_batch\_size | integer | Max posts to generate per batch |
| notification\_method | string | How to notify on new posts |
| notification\_email | string | Email for notifications |
| pillar\_ratio\_safehouse\_life | integer | Content mix percentage for Safehouse Life |
| pillar\_ratio\_the\_problem | integer | Content mix percentage for The Problem |
| pillar\_ratio\_the\_solution | integer | Content mix percentage for The Solution |
| pillar\_ratio\_donor\_impact | integer | Content mix percentage for Donor Impact |
| pillar\_ratio\_call\_to\_action | integer | Content mix percentage for Call to Action |
| recycling\_cooldown\_days | integer | Days before a post can be recycled |
| recycling\_min\_engagement | integer | Minimum engagement to qualify for recycling |
| updated\_at | datetime | Last update timestamp |

---

## staff\_tasks

Tasks assigned to staff members, generated automatically from incidents, visitations, and case management workflows.

| Field | Type | Description |
| :---- | :---- | :---- |
| staff\_task\_id | integer | Primary key |
| staff\_user\_id | string | FK → AspNetUsers.Id |
| resident\_id | integer | FK → residents.resident\_id (nullable) |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |
| task\_type | string | One of: ScheduleDoctor, InputHealthRecords, UpdateEducation, ScheduleHomeVisit, ScheduleReintegration, IncidentFollowUp, VisitationFollowUp, CaseConferencePrep, Manual |
| title | string | Task title |
| description | text | Task description (nullable) |
| context\_json | jsonb | Additional context data (nullable) |
| status | string | One of: Pending, Completed, Dismissed |
| snooze\_until | datetime | Snoozed until this time (nullable) |
| due\_trigger\_date | datetime | When the task was triggered (nullable) |
| created\_at | datetime | Record creation timestamp |
| completed\_at | datetime | Completion timestamp (nullable) |
| source\_entity\_type | string | Source entity type (e.g., IncidentReport, HomeVisitation) (nullable) |
| source\_entity\_id | integer | ID of the source entity (nullable) |

---

## user\_safehouses

Many-to-many relationship between staff users and their assigned safehouses. Controls row-level data access.

| Field | Type | Description |
| :---- | :---- | :---- |
| user\_safehouse\_id | integer | Primary key |
| user\_id | string | FK → AspNetUsers.Id |
| safehouse\_id | integer | FK → safehouses.safehouse\_id |

---

## voice\_guide

Brand voice configuration for AI content generation.

| Field | Type | Description |
| :---- | :---- | :---- |
| voice\_guide\_id | integer | Primary key |
| org\_description | text | Organization description for AI context |
| tone\_description | text | Desired tone of voice |
| preferred\_terms | jsonb | Terms to prefer in generated content |
| avoided\_terms | jsonb | Terms to avoid |
| structural\_rules | text | Structural guidelines for posts |
| visual\_rules | text | Visual style guidelines |
| updated\_at | datetime | Last update timestamp |
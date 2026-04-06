## IS 401 - Rubric

Make a copy of this [Figjam board](https://www.figma.com/board/8pD0922ice8zpZLfGuZNlc/2026W-INTEX-Figma-template?node-id=8405-285&t=Zk9u5jKTpRD5si4k-1) and submit the link through IS 401's Learning Suite on Monday. Fill it out throughout the week. Each day's section is due by 11:59pm that night.

## IS 413 - Rubric

Build all the required pages with all the required functionality (including, but not limited to):

**Public (Non-Authenticated Users)**

- **Home / Landing Page:** A modern, professional landing page that introduces the organization, its mission, and provides clear calls to action for visitors to engage or support.
- **Impact / Donor-Facing Dashboard:** Displays aggregated, anonymized data showing the organization's impact (e.g., outcomes, progress, and resource use) in a clear and visually understandable way.
- **Login Page:** Allows users to authenticate using a username and password, with proper validation and error handling.
- **Privacy Policy + Cookie Consent:** Provides a privacy policy explaining data usage and includes a GDPR-compliant cookie consent notification (see the IS414 section for more information).

**Admin / Staff Portal (Authenticated Users Only)**

- **Admin Dashboard:** Provides a high-level overview of key metrics such as active residents across safehouses, recent donations, upcoming case conferences, and summarized progress data. Think of this as the "command center" for staff managing daily operations.
- **Donors & Contributions:** Allows staff to view, create, and manage supporter profiles, including classification by type (monetary donor, volunteer, skills contributor, etc.) and status (active/inactive). Tracks all types of contributions (monetary, in-kind, time, skills, social media) and allows staff to record and review donation activity. Supports viewing donation allocations across safehouses and program areas.
- **Caseload Inventory:** This is the core case management page. It maintains records for all residents following the structure used by Philippine social welfare agencies. Staff can view, create, and update resident profiles including demographics, case category and sub-categories (e.g., trafficked, victim of physical abuse, neglected), disability information, family socio-demographic profile (4Ps beneficiary, solo parent, indigenous group, informal settler), admission details, referral information, assigned social workers, and reintegration tracking. This page should support filtering and searching by case status, safehouse, case category, and other key fields.
- **Process Recording:** Provides forms for entering and viewing dated counseling session notes for each resident. Each process recording entry captures the session date, social worker, session type (individual or group), emotional state observed, a narrative summary of the session, interventions applied, and follow-up actions. Staff should be able to view the full history of process recordings for any resident, displayed chronologically. This is the primary tool for documenting the healing journey of each resident.
- **Home Visitation & Case Conferences:** Allows staff to log home and field visits, including the visit type (initial assessment, routine follow-up, reintegration assessment, post-placement monitoring, or emergency), observations about the home environment, family cooperation level, safety concerns, and follow-up actions. Also provides a view of case conference history and upcoming conferences for each resident.
- **Reports & Analytics:** Displays aggregated insights and trends to support decision-making. This should include donation trends over time, resident outcome metrics (education progress, health improvements), safehouse performance comparisons, and reintegration success rates. Consider structuring reports to align with the Annual Accomplishment Report format used by Philippine social welfare agencies, which tracks services provided (caring, healing, teaching), beneficiary counts, and program outcomes.

**Misc**

- Any additional pages required to support functionality described in other portions of the project (e.g., security, social media, accessibility, or partner features).

###

## IS 414 - Security Rubric

| **Objective**                                                             | **Points Possible** |
| ------------------------------------------------------------------------- | ------------------- |
| Confidentiality - Use HTTPS/TLS                                           | 1                   |
| ---                                                                       | ---                 |
| Confidentiality - Redirect HTTP to HTTPS                                  | 0.5                 |
| ---                                                                       | ---                 |
| Auth - Authentication using username/password                             | 3                   |
| ---                                                                       | ---                 |
| Auth - Require better passwords                                           | 1                   |
| ---                                                                       | ---                 |
| Auth - Pages and API endpoints require auth where needed                  | 1                   |
| ---                                                                       | ---                 |
| Auth - RBAC- Only admin user can CUD (including endpoints)                | 1.5                 |
| ---                                                                       | ---                 |
| Integrity - Confirmation to delete data                                   | 1                   |
| ---                                                                       | ---                 |
| Credentials - Stored securely and not found in public repository          | 1                   |
| ---                                                                       | ---                 |
| Privacy - Privacy policy created and added to site (customized as needed) | 1                   |
| ---                                                                       | ---                 |
| Privacy - GDPR cookie consent notification fully functional               | 1                   |
| ---                                                                       | ---                 |
| Attack Mitigations - CSP header set properly                              | 2                   |
| ---                                                                       | ---                 |
| Availability - Deployed publicly                                          | 4                   |
| ---                                                                       | ---                 |
| Additional security features                                              | 2                   |
| ---                                                                       | ---                 |

## IS 455 - Rubric (20 points total)

Your score will be based on the number of complete, quality pipelines your team delivers. Each pipeline will be evaluated using the following criteria aligned with the full ML pipeline:

| **Pipeline Stage**                          | **What We're Evaluating**                                                                                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problem Framing                             | Is the business problem clearly stated? Does it matter to the organization? Is the choice of predictive vs. explanatory approach explicitly justified?                                                          |
| ---                                         | ---                                                                                                                                                                                                             |
| Data Acquisition, Preparation & Exploration | Is the data explored thoroughly? Are missing values, outliers, and feature engineering handled well? Is the data preparation reproducible as a pipeline? Are joins across tables done correctly and documented? |
| ---                                         | ---                                                                                                                                                                                                             |
| Modeling & Feature Selection                | Is the model appropriate for the stated goal (prediction or explanation)? Are multiple approaches considered or compared? Is feature selection thoughtful and justified?                                        |
| ---                                         | ---                                                                                                                                                                                                             |
| Evaluation & Selection                      | Are appropriate metrics used? Is the model validated properly (e.g., train/test split, cross-validation)? Are results interpreted in business terms, not just statistical terms?                                |
| ---                                         | ---                                                                                                                                                                                                             |
| Deployment & Integration                    | Is the model deployed and accessible? Is it integrated with the web application in a meaningful way? Does it provide value to end users?                                                                        |
| ---                                         | ---                                                                                                                                                                                                             |

###
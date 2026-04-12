# Pipeline 5 — Resident Incident Early Warning

## Files
- **Notebook:** `ml/notebooks/incident-early-warning.ipynb`
- **ETL:** `ml-scripts/jobs/etl_incident_warning.py`
- **Infer:** `ml-scripts/jobs/infer_incident_warning.py`
- **Features:** `ml-scripts/features/incident_features.py`
- **Model:** `ml/incident_early_warning.sav`

---

## Overview

| | |
|---|---|
| **Type** | Predictive |
| **Goal** | Flag new and active residents at elevated risk of self-harm or runaway attempt at intake |
| **Target variable** | Two separate binary targets — see below |
| **Primary metric** | ROC-AUC, Recall (prioritized over precision) |
| **Writes to** | `ml_predictions` + `ml_prediction_history` |

---

## Problem Framing

**Business question:** Based on a resident's intake profile — before any counseling, health records, or visit data exists — which girls are at elevated risk of self-harm or runaway attempt so staff can take proactive measures immediately?

**Why this matters:** This is the highest ethical stakes pipeline in the project. Every Critical and High risk resident in the dataset has had an incident. Sexual abuse survivors have a 66.7% self-harm rate. Trafficked residents have a 63.6% runaway attempt rate. Getting ahead of this with proactive staffing and monitoring could prevent real harm.

**Two separate models — run both:**

Model A — Self-harm risk:
- Target: `has_self_harm` — 1 if resident has any SelfHarm incident, 0 otherwise
- Class distribution: 12 self-harm, 48 without

Model B — Runaway risk:
- Target: `has_runaway` — 1 if resident has any RunawayAttempt incident, 0 otherwise
- Class distribution: approximately 17 runaway, 43 without

Train each model separately. Write both scores to `ml_predictions` as two separate rows per resident.

**Why intake features only:** The model must work at the moment of admission — before any counseling sessions, health records, or home visits exist. Only features available from the `residents` table at intake are valid X variables.

**False positive cost:** Staff assign extra monitoring to a girl who didn't need it — wasted effort, minimal harm.

**False negative cost:** A high-risk girl is missed — potentially catastrophic. Tune aggressively toward recall. A lower precision threshold is acceptable here.

**Incident severity and resolution — confirmed from data:**

| Incident Type | High Severity Rate | Unresolved Rate | Action |
|---|---|---|---|
| SelfHarm | 43% | 36% | Immediate escalation |
| RunawayAttempt | 31% | 41% | 48-hour mandatory follow-up |
| Security | 19% | 44% | 14-day resolution deadline |
| Behavioral | 15% | 10% | Standard protocol |
| Medical | 0% | 0% | Standard protocol |
| PropertyDamage | 0% | 0% | Standard protocol |

These thresholds should be hardcoded as alert logic in the infer job, separate from the ML model.

---

## Data Sources

| Table | Purpose |
|---|---|
| `residents` | Intake profile — demographics, risk level, case category, trauma subcategories, family flags |
| `incident_reports` | Target variable construction — which residents had which incident types |

Only intake features from `residents` are used as X variables. `incident_reports` is used only to construct the target variables.

---

## Features to Engineer

All features come from the `residents` table. These are features available at the moment of admission.

**From `residents`:**
- `age_at_admission` — from `date_of_birth` and `date_of_admission`
- `initial_risk_num` — Low=1, Medium=2, High=3, Critical=4
- `trauma_severity_score` — weighted sum of `sub_cat_` boolean columns. Same weighting as Pipeline 1.
- `family_vulnerability_score` — count of True `family_` boolean columns
- `sub_cat_sexual_abuse` — boolean, cast to int (strongest predictor of self-harm)
- `sub_cat_trafficked` — boolean, cast to int (strongest predictor of runaway)
- `sub_cat_osaec` — boolean, cast to int
- `sub_cat_physical_abuse` — boolean, cast to int
- `has_special_needs` — boolean, cast to int
- `is_pwd` — boolean, cast to int
- `case_category` — one-hot encode

**Target variables (constructed from `incident_reports`):**
- `has_self_harm` — 1 if any `incident_type == 'SelfHarm'` for this resident
- `has_runaway` — 1 if any `incident_type == 'RunawayAttempt'` for this resident

**Fill all nulls with 0.**

---

## Notebook Instructions

Follow the full Ch. 1–16 textbook pipeline. Train two models (Model A and Model B) in the same notebook.

**Sections in order:**
1. Problem Framing — discuss ethical stakes, two-model approach, why intake features only, false negative cost
2. Data Acquisition and Preparation
3. Exploration
4. Feature Selection
5. Modeling — Model A (self-harm), then Model B (runaway)
6. Evaluation and Model Selection
7. Causal and Relationship Analysis
8. Deployment Notes

**Exploration — document these confirmed findings:**
- 100% of Critical and High risk residents have had incidents
- `initial_risk_num` vs `has_incident`: r=0.524 — strongest single predictor
- `sub_cat_sexual_abuse` residents have 66.7% self-harm rate vs 4.4% without
- `sub_cat_trafficked` residents have 63.6% runaway rate vs 28.6% without
- Self-harm incidents: 43% high severity, 36% unresolved
- Runaway attempts: 31% high severity, 41% unresolved
- Higher severity incidents paradoxically correlate with better long-term outcomes (r=0.487 with risk_reduction) — because they trigger intensive intervention. Discuss this.

**Feature selection — follow Ch. 16:**
- Given small n=60, prefer fewer features
- Filter: remove near-zero variance
- Univariate: rank by correlation with each target separately
- RFECV on best model for each target
- Permutation importance
- Keep models interpretable — a Decision Tree that staff can follow is preferable to a Gradient Boosting model they cannot

**Modeling — train and compare ALL of the following for EACH target (Ch. 9–14):**
- Logistic Regression (use `class_weight='balanced'`)
- Decision Tree — preferred if performance is competitive because staff can see the exact rules
- K-Nearest Neighbors
- Support Vector Machine
- Naive Bayes
- Random Forest
- Gradient Boosting
- AdaBoost
- Extra Trees
- Stacking

Use stratified 5-fold cross-validation. Primary metric: Recall (not just ROC-AUC — missing a high-risk girl is worse than a false alarm). Also report ROC-AUC, precision, F1.

**Evaluation — follow Ch. 15:**
- For each target: learning curves, comparison table, final test set evaluation
- If a Decision Tree achieves similar Recall to Gradient Boosting, choose the tree — explainability matters for this use case because staff need to understand why a flag was raised
- Show the tree visualization if Decision Tree is chosen — staff can see the exact rules
- Discuss threshold adjustment — consider lowering the classification threshold to increase recall even at cost of precision

**Causal and Relationship Analysis:**
- Which intake characteristics are most predictive and why do they make clinical sense?
- Discuss the ethics of flagging girls at intake based on their history — this must be framed as a support tool, not a label
- What are the risks of over-relying on this model? How should staff be trained to use it?

**Saving artifacts — follow Ch. 17:**
- Save Model A to `ml/incident_early_warning-selfharm.sav`
- Save Model B to `ml/incident_early_warning-runaway.sav`
- Save combined metadata and metrics files:
  - `ml/incident_early_warning-metadata.json`
  - `ml/incident_early_warning-metrics.json`

---

## ETL Job Instructions (`etl_incident_warning.py`)

Import from `config.py`, `utils_db.py`, and `incident_features.py`.

1. Fetch `residents` and `incident_reports` tables
2. Construct `has_self_harm` and `has_runaway` from `incident_reports`
3. Run feature engineering from `incident_features.py`
4. Return clean modeling-ready DataFrame — one row per resident with both targets

---

## Infer Job Instructions (`infer_incident_warning.py`)

Import from `config.py`, `utils_db.py`, and `incident_features.py`.

1. Fetch `residents` table
2. Filter to active residents (`case_status == 'Active'`) — also score newly admitted residents
3. Run feature engineering from `incident_features.py`
4. Load both model files
5. Score every active resident for both self-harm risk and runaway risk
6. Apply hardcoded alert logic for SelfHarm and RunawayAttempt severity thresholds
7. Build two records per resident (one per model) and call `write_predictions()`

---

## What Gets Written to `ml_predictions`

Two rows per active resident — one for each model.

**Model A (self-harm):**
```
entity_type:   "resident"
entity_id:     resident_id
model_name:    "incident-early-warning-selfharm"
model_version: training date
score:         0–100 self-harm risk probability
score_label:   "Critical" / "High" / "Medium" / "Low"
predicted_at:  current UTC timestamp
metadata: {
    self_harm_probability,
    top_risk_factors: [ e.g. "sub_cat_sexual_abuse", "initial_risk_level_High" ],
    recommended_protocol: "Assign dedicated counselor, daily check-ins for first 30 days"
}
```

**Model B (runaway):**
```
entity_type:   "resident"
entity_id:     resident_id
model_name:    "incident-early-warning-runaway"
model_version: training date
score:         0–100 runaway risk probability
score_label:   "Critical" / "High" / "Medium" / "Low"
predicted_at:  current UTC timestamp
metadata: {
    runaway_probability,
    top_risk_factors: [ e.g. "sub_cat_trafficked", "initial_risk_level_Critical" ],
    recommended_protocol: "Physical environment check, establish trusted adult contact"
}
```

---

## Score Labels

| Score | Label |
|---|---|
| 75–100 | Critical |
| 50–74 | High |
| 25–49 | Medium |
| 0–24 | Low |

---

## Website Integration

**Resident intake form:** When a new resident is saved, the infer job runs immediately (or on next nightly cycle). Risk flags appear on the profile within 24 hours of admission.

**Resident profile page:** "Risk Flags" section showing self-harm risk score, runaway risk score, contributing factors, and recommended protocol for each flag. Color coded by severity.

**Admin dashboard:** Alert banner for any active resident with Critical or High risk flags that are not yet acknowledged by staff.

**Unresolved incident alert:** Separate from the ML model — if any SelfHarm or RunawayAttempt incident is unresolved after 7 days, surface an alert regardless of model score.

---

## Confirmed Numbers From the Data

| Fact | Value |
|---|---|
| Total residents | 60 |
| Residents with any incident | 44 |
| 100% incident rate | Critical and High risk at intake |
| Sexual abuse → self-harm rate | 66.7% |
| Trafficked → runaway rate | 63.6% |
| initial_risk_num vs has_incident | r=0.524 |
| Self-harm high severity rate | 43% |
| Self-harm unresolved rate | 36% |
| Runaway high severity rate | 31% |
| Runaway unresolved rate | 41% |
| Security unresolved rate | 44% |

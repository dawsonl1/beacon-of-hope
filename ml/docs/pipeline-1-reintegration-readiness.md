# Pipeline 1 — Reintegration Readiness Classifier

## Files
- **Notebook:** `ml/notebooks/reintegration-readiness.ipynb`
- **ETL:** `ml-scripts/jobs/etl_reintegration_readiness.py`
- **Infer:** `ml-scripts/jobs/infer_reintegration_readiness.py`
- **Features:** `ml-scripts/features/reintegration_features.py`
- **Model:** `ml/reintegration_readiness.sav`

---

## Overview

| | |
|---|---|
| **Type** | Predictive |
| **Goal** | Score every active resident 0–100% on probability of completing reintegration |
| **Target variable** | `reintegration_complete` — 1 if `reintegration_status == 'Completed'`, 0 otherwise |
| **Class distribution** | 19 completed (32%), 41 not completed (68%) |
| **Primary metric** | ROC-AUC |
| **Writes to** | `ml_predictions` + `ml_prediction_history` |

---

## Problem Framing

**Business question:** Given everything we know about a resident right now, what is the probability she will successfully complete reintegration?

**Why predictive:** Staff need an accurate score per resident to prioritize attention. Interpretability of individual coefficients is secondary. Pipeline 2 handles the "why" question using the same data.

**Why this matters:** With 30+ active residents across multiple safehouses, staff cannot manually assess every case consistently. A readiness score surfaces at-risk residents before they fall through the cracks.

**False positive cost:** Girl is scored Ready but isn't — risk of premature placement. This is the more dangerous error. Discuss this explicitly in the notebook.

**False negative cost:** Girl is scored Not Ready but is actually ready — she waits longer than necessary.

---

## Data Sources

| Table | Purpose |
|---|---|
| `residents` | Demographics, risk levels, case category, trauma subcategories, family flags |
| `health_wellbeing_records` | Monthly health scores and checkup completion |
| `education_records` | Monthly attendance rate and progress percent |
| `process_recordings` | Counseling session counts and emotional outcomes |
| `home_visitations` | Visit counts, outcomes, family cooperation |
| `intervention_plans` | Plan categories and achievement status |

All 60 residents have records in every table. Join on `resident_id`. Aggregate time-series tables down to one row per resident before joining to residents.

---

## Features to Engineer

These must be computed identically in both the notebook and `reintegration_features.py`. Extract them into shared functions in `reintegration_features.py` and import from there in both places.

**From `residents`:**
- `age_at_admission` — from `date_of_birth` and `date_of_admission`. Do not use the string column `age_upon_admission`.
- `length_of_stay_days` — from `date_of_admission` to `date_closed`, or today if still active
- `length_of_stay_months` — used to normalize session and visit counts
- `initial_risk_num` — Low=1, Medium=2, High=3, Critical=4
- `current_risk_num` — same encoding
- `risk_reduction` — initial minus current
- `trauma_severity_score` — weighted sum of `sub_cat_` boolean columns. Sexual abuse, trafficked, and OSAEC are most severe. Physical abuse and child labor moderate. At-risk lowest.
- `family_vulnerability_score` — count of True `family_` boolean columns

**From `health_wellbeing_records`:**
- `avg_health` — mean of `general_health_score`
- `health_trend` — last score minus first score
- `checkup_compliance` — proportion of months with `psychological_checkup_done == True`
- `psych_checkups` — total count
- `medical_checkups` — total count

**From `education_records`:**
- `avg_progress` — mean of `progress_percent`
- `avg_attendance` — mean of `attendance_rate`
- `courses_completed` — count where `completion_status == 'Completed'`

**From `process_recordings`:**
- `total_sessions` — count
- `sessions_per_month` — total sessions / `length_of_stay_months`
- `positive_session_rate` — proportion where `emotional_state_end` is Happy, Hopeful, or Calm
- `pct_concerns` — proportion where `concerns_flagged == True`
- `avg_duration` — mean `session_duration_minutes`

**From `home_visitations`:**
- `total_visits` — count
- `visits_per_month` — total visits / `length_of_stay_months`
- `favorable_rate` — proportion where `visit_outcome == 'Favorable'`
- `family_coop_rate` — proportion where `family_cooperation_level` is Cooperative or Highly Cooperative
- `safety_concern_rate` — proportion where `safety_concerns_noted == True`
- `post_placement_visits` — count where `visit_type == 'Post-Placement Monitoring'`
- `reintegration_assessments` — count where `visit_type == 'Reintegration Assessment'`

**Encoding:**
- One-hot encode `case_category`
- Fill all nulls with 0 after merging

---

## Notebook Instructions

Follow the full Ch. 1–16 textbook pipeline. The notebook tells the complete story from problem framing to deployment. A TA must be able to run it top to bottom and reproduce all results.

**Sections in order:**
1. Problem Framing
2. Data Acquisition and Preparation
3. Exploration
4. Feature Selection
5. Modeling
6. Evaluation and Model Selection
7. Causal and Relationship Analysis
8. Deployment Notes

**Exploration — document these confirmed findings:**
- `visits_per_month` is the strongest predictor (r=0.403)
- Surrendered girls reintegrate at 47.6%, Foundlings at 9.1% — explain why structurally
- Higher `trauma_severity_score` slightly predicts reintegration — counterintuitive, likely due to more intensive intervention. Discuss this.
- `sessions_per_month` matters more than `total_sessions`
- `health_trend` matters more than `avg_health`

**Feature selection — follow Ch. 16:**
- Filter methods first — remove near-zero variance and highly correlated features
- Univariate ranking — correlations with target
- RFECV — find optimal feature subset
- Permutation importance — after training best model
- Compare full vs reduced feature set. Document and justify final choice.

**Modeling — train and compare ALL of the following (Ch. 9–14):**
- Logistic Regression (baseline)
- Decision Tree — vary max_depth
- K-Nearest Neighbors
- Support Vector Machine (linear and RBF kernel)
- Naive Bayes
- Random Forest
- Gradient Boosting
- AdaBoost
- Extra Trees
- Stacking — combine top performers with a meta-learner

For every model: tune hyperparameters using GridSearchCV or RandomizedSearchCV. Use stratified 5-fold cross-validation throughout. Never touch the test set until final evaluation.

**Evaluation — follow Ch. 15:**
- Learning curves and validation curves for top candidates
- Head-to-head comparison table: every model, CV ROC-AUC mean ± std
- Select best model — justify in writing. If two models perform similarly, prefer the simpler one.
- Final test set evaluation: classification report, ROC-AUC, confusion matrix
- Business interpretation of results — not just numbers
- Honest limitation: n=60 is small. Say this clearly.

**Saving artifacts — follow Ch. 17:**
- Save model + scaler + feature list to `ml/reintegration_readiness.sav` using joblib
- Save `ml/reintegration_readiness-metadata.json` — training date, feature list, model type, row counts
- Save `ml/reintegration_readiness-metrics.json` — ROC-AUC, F1, accuracy from test set

---

## ETL Job Instructions (`etl_reintegration_readiness.py`)

Import from `config.py` and `utils_db.py`. Import feature engineering functions from `reintegration_features.py`.

1. Call `get_client()` from `utils_db.py`
2. Fetch all 6 tables using `fetch_table()`
3. Filter to residents with known reintegration outcomes (exclude NaN `reintegration_status`)
4. Run all feature engineering from `reintegration_features.py`
5. Return a clean modeling-ready DataFrame — one row per resident

---

## Infer Job Instructions (`infer_reintegration_readiness.py`)

Import from `config.py` and `utils_db.py`. Import feature engineering functions from `reintegration_features.py`.

1. Call `get_client()` from `utils_db.py`
2. Load `ml/reintegration_readiness.sav` using joblib
3. Fetch all 6 tables using `fetch_table()`
4. Filter to `case_status == 'Active'` residents only
5. Run all feature engineering from `reintegration_features.py`
6. Score every active resident — multiply probability by 100 to get 0–100 score
7. Convert score to label using `score_to_label()` from `utils_db.py` with `REINTEGRATION_LABELS` from `config.py`
8. Build records list and call `write_predictions()` from `utils_db.py`

---

## What Gets Written to `ml_predictions`

```
entity_type:   "resident"
entity_id:     resident_id
model_name:    "reintegration-readiness"
model_version: training date from metadata.json
score:         0–100
score_label:   "Ready" / "Progressing" / "Early Stage" / "Not Ready"
predicted_at:  current UTC timestamp
metadata: {
    total_visits, visits_per_month,
    total_sessions, sessions_per_month,
    positive_session_rate,
    avg_health, health_trend,
    family_coop_rate, favorable_rate,
    trauma_severity_score
}
```

Same record format is also inserted into `ml_prediction_history` for trajectory graphs.

---

## Score Labels

| Score | Label |
|---|---|
| 75–100 | Ready |
| 50–74 | Progressing |
| 25–49 | Early Stage |
| 0–24 | Not Ready |

---

## Confirmed Numbers From the Data

| Fact | Value |
|---|---|
| Total residents | 60 |
| Active residents scored nightly | 30 |
| Completed reintegration | 19 (32%) |
| Not completed | 41 (68%) |
| Strongest predictor | visits_per_month (r=0.403) |
| Surrendered reintegration rate | 47.6% |
| Foundling reintegration rate | 9.1% |
| Abandoned reintegration rate | 33.3% |
| Neglected reintegration rate | 20.0% |

# Pipeline 3 — Donor Churn Risk System

## Files
- **Notebook:** `ml-pipelines/donor-churn.ipynb`
- **ETL:** `ml-scripts/jobs/etl_donor_churn.py`
- **Infer:** `ml-scripts/jobs/infer_donor_churn.py`
- **Features:** `ml-scripts/features/donor_features.py`
- **Model:** `models/donor-churn.sav`

---

## Overview

| | |
|---|---|
| **Type** | Predictive |
| **Goal** | Score every monetary donor 0–100% on probability of churning (going inactive) |
| **Target variable** | `churned` — 1 if `status == 'Inactive'`, 0 if `status == 'Active'` |
| **Class distribution** | 14 churned (25%), 43 active (75%) |
| **Primary metric** | ROC-AUC |
| **Writes to** | `ml_predictions` + `ml_prediction_history` |

---

## Problem Framing

**Business question:** Which donors are at risk of lapsing so staff can intervene before they are lost?

**Why this matters:** Donor retention is existential for the org. Every lapsed donor is direct revenue loss. The org explicitly identified this as a top priority. Even a small improvement in retention — catching 2–3 lapsing donors per year — has significant financial impact.

**The data limitation:** Only 57 monetary donors, 14 inactive. This is a small dataset. The ML model alone is not reliable enough at this scale. The solution is a hybrid system: rule-based tiers that work on day one regardless of model confidence, combined with an ML probability score that improves as data accumulates.

**The hybrid system:**
- Rule-based tiers fire immediately based on days since last donation and gap trends
- ML model adds a probability score on top — treat it as a signal, not a verdict
- As the org grows and more donors lapse (or don't), the model gets meaningfully better on every retraining

**False positive cost:** Staff reach out to a donor who wasn't going to lapse — wasted effort but low harm.

**False negative cost:** A lapsing donor is missed and is lost — this is the more costly error. Tune toward recall.

---

## Data Sources

| Table | Purpose |
|---|---|
| `supporters` | Donor profile, acquisition channel, relationship type, status |
| `donations` | Full donation history per donor — amounts, dates, types, campaigns |

Filter to monetary donors only (`donation_type == 'Monetary'`). All feature engineering is done at the donor level — one row per supporter.

---

## Features to Engineer

These must be computed identically in both the notebook and `donor_features.py`. Extract into shared functions and import from both places.

**RFM features (Recency, Frequency, Monetary):**
- `recency_days` — days since last monetary donation (as of today)
- `frequency` — total count of monetary donations
- `monetary_total` — sum of all monetary donation amounts
- `monetary_avg` — mean donation amount
- `monetary_last` — most recent donation amount

**Behavioral trend features:**
- `avg_gap_days` — mean number of days between consecutive donations
- `gap_trend` — mean of last 3 gaps minus mean of first 3 gaps. Positive means gaps are widening.
- `amount_trend` — mean of last 3 amounts minus mean of first 3 amounts. Negative means declining.
- `tenure_days` — days from first donation to last donation
- `is_recurring` — whether any donation is marked recurring (boolean)
- `campaign_response_rate` — proportion of campaigns that ran during this donor's tenure where they donated
- `missed_campaigns` — count of campaigns that ran while the donor gave nothing

**Donor profile features (from `supporters`):**
- `acquisition_channel` — one-hot encoded
- `relationship_type` — one-hot encoded (Local, International, PartnerOrganization)

**Fill all nulls with 0 after engineering.**

---

## Rule-Based Churn Tiers

These fire in the infer job regardless of the ML model output. They are deterministic and always correct. Implement them in `donor_features.py` as a `compute_rule_tier()` function.

| Condition | Tier |
|---|---|
| `recency_days > 180` | Critical |
| `recency_days > 90` | High |
| `recency_days > 30` OR `gap_trend > 30` | Medium |
| Otherwise | Low |

The rule tier is stored in `metadata.rule_tier`. The ML score is stored in `score`. The frontend shows both — the rule tier for immediate action, the ML score for trend context.

---

## Notebook Instructions

Follow the full Ch. 1–16 textbook pipeline.

**Sections in order:**
1. Problem Framing — include the hybrid system rationale, discuss data limitations honestly
2. Data Acquisition and Preparation
3. Exploration
4. Feature Selection
5. Modeling
6. Evaluation and Model Selection
7. Causal and Relationship Analysis
8. Deployment Notes

**Exploration — document these confirmed findings:**
- Recurring donors give 2x more total (6,380 vs 3,228 PHP avg lifetime value)
- Recurring donors have shorter gaps (154 vs 262 avg days between donations)
- `frequency` (total donation count) strongly predicts recurring conversion (r=0.674)
- Church-acquired donors convert to recurring at 83% — highest of any channel
- SocialMedia acquisition averages highest lifetime value (5,611 PHP) vs Website (2,813 PHP)
- First donation amount does NOT predict future behavior (r=-0.063) — size of first gift doesn't matter

**Feature selection — follow Ch. 16:**
- Filter: remove near-zero variance features
- Univariate: rank by correlation with churn target
- RFECV: find optimal subset
- Permutation importance after training best model
- Given small n=57, prefer fewer features — regularization is important here

**Modeling — train and compare ALL of the following (Ch. 9–14):**
- Logistic Regression (baseline — use `class_weight='balanced'`)
- Decision Tree
- K-Nearest Neighbors
- Support Vector Machine
- Naive Bayes
- Random Forest
- Gradient Boosting
- AdaBoost
- Extra Trees
- Stacking

Use stratified 5-fold cross-validation throughout. Tune hyperparameters with GridSearchCV or RandomizedSearchCV. Primary metric: ROC-AUC.

**Evaluation — follow Ch. 15:**
- Learning curves and validation curves for top models
- Head-to-head comparison table
- Final test set evaluation
- Discuss class imbalance — only 14 churned donors
- Consider adjusting classification threshold toward recall given false negative is more costly
- Honest limitation: n=57 is very small. Model is a guide. Will improve as org grows.

**Saving artifacts — follow Ch. 17:**
- Save to `models/donor-churn.sav`
- Save `models/donor-churn-metadata.json`
- Save `models/donor-churn-metrics.json`

---

## ETL Job Instructions (`etl_donor_churn.py`)

Import from `config.py`, `utils_db.py`, and `donor_features.py`.

1. Fetch `supporters` and `donations` tables
2. Filter to monetary donors only
3. Run all feature engineering from `donor_features.py`
4. Return clean modeling-ready DataFrame — one row per monetary donor

---

## Infer Job Instructions (`infer_donor_churn.py`)

Import from `config.py`, `utils_db.py`, and `donor_features.py`.

1. Fetch `supporters` and `donations`
2. Filter to monetary donors only
3. Run feature engineering from `donor_features.py`
4. Load `models/donor-churn.sav`
5. Score every monetary donor
6. Compute rule tier using `compute_rule_tier()` from `donor_features.py`
7. Build records and call `write_predictions()`

---

## What Gets Written to `ml_predictions`

```
entity_type:   "supporter"
entity_id:     supporter_id
model_name:    "donor-churn"
model_version: training date
score:         0–100 churn probability
score_label:   "Critical" / "High" / "Medium" / "Low"
predicted_at:  current UTC timestamp
metadata: {
    recency_days,
    avg_gap_days,
    gap_trend,
    amount_trend,
    frequency,
    is_recurring,
    rule_tier,
    top_risk_factors: [ list of triggered rule conditions ]
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

**Donor profile page:** Churn risk badge, days since last donation, donation trend sparkline, one-click "Generate Outreach Message" button (triggers AI Feature 3 — Donor Outreach Personalizer using Claude API).

**Admin dashboard:** "Donor Health" panel — count of donors at each risk tier, sorted list of highest-risk donors with last donation date and score. One-click action button per donor.

**Automated trigger:** When churn score crosses High threshold, queue a personalized outreach email generated by the Claude API.

---

## Confirmed Numbers From the Data

| Fact | Value |
|---|---|
| Total monetary donors | 57 |
| Inactive (churned) | 14 |
| Active | 43 |
| Recurring donor avg lifetime value | 6,380 PHP |
| Non-recurring avg lifetime value | 3,228 PHP |
| Church acquisition recurring conversion rate | 83% |
| SocialMedia acquisition avg lifetime value | 5,611 PHP |
| Website acquisition avg lifetime value | 2,813 PHP |
| Frequency vs recurring conversion | r=0.674 |

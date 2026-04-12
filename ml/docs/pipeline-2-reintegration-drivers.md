# Pipeline 2 — Reintegration Drivers Explainer

## Files
- **Notebook:** `ml/notebooks/reintegration-drivers.ipynb`
- **ETL:** `ml-scripts/jobs/etl_reintegration_drivers.py`
- **Infer:** `ml-scripts/jobs/infer_reintegration_drivers.py`
- **Features:** `ml-scripts/features/reintegration_features.py` (shared with Pipeline 1)
- **Model:** `ml/reintegration_drivers.sav`

---

## Overview

| | |
|---|---|
| **Type** | Explanatory |
| **Goal** | Quantify which factors most explain reintegration completion and by how much |
| **Target variable** | `reintegration_complete` — same definition as Pipeline 1 |
| **Primary metric** | Adjusted R², coefficient significance (p-values) |
| **Writes to** | `ml_predictions` + `ml_prediction_history` (org-level insight row) |

---

## Problem Framing

**Business question:** Which specific interventions and case factors are most strongly associated with reintegration completion — and by how much? What should staff and leadership invest in?

**Why explanatory:** The org doesn't just need a score — they need to know what to do. Interpretable coefficients translate directly into strategy. "Each additional home visit per month is associated with a X point increase in readiness" is a sentence a director can act on and a grant writer can use.

**Why this is different from Pipeline 1:** Pipeline 1 optimizes for prediction accuracy. This pipeline optimizes for interpretable coefficients. The same data, different modeling goal, different algorithm family, different success criteria. The notebook must explicitly discuss this distinction using the textbook framework.

**What the org does with this:** Results are published on the public impact page and donor page. "Girls who receive more than 20 home visits are 3x more likely to successfully reintegrate. The three biggest drivers are home visit frequency, family cooperation, and counseling intensity." This is donor communication and strategy guidance in one.

---

## Data Sources

Same 6 tables as Pipeline 1. Same joins. Same aggregations. Import feature engineering from `reintegration_features.py` — do not rewrite it.

| Table | Purpose |
|---|---|
| `residents` | Demographics, risk levels, case category, trauma subcategories, family flags |
| `health_wellbeing_records` | Monthly health scores and checkup completion |
| `education_records` | Monthly attendance rate and progress percent |
| `process_recordings` | Counseling session counts and emotional outcomes |
| `home_visitations` | Visit counts, outcomes, family cooperation |
| `intervention_plans` | Plan categories and achievement status |

---

## Features to Engineer

**Identical to Pipeline 1.** Import all feature engineering from `reintegration_features.py`. Do not duplicate any logic in this notebook.

The only difference is which features make it into the final model. Pipeline 1 uses all features that improve prediction. Pipeline 2 uses a focused subset that produces interpretable, defensible coefficients. Multicollinearity is a much bigger concern here than in Pipeline 1.

---

## Notebook Instructions

Follow the full Ch. 1–16 textbook pipeline. Sections in the same order as Pipeline 1. The key difference is the modeling and evaluation sections.

**Sections in order:**
1. Problem Framing — explicitly discuss prediction vs explanation distinction from textbook
2. Data Acquisition and Preparation — import from `reintegration_features.py`, do not rewrite
3. Exploration — same findings as Pipeline 1, reference them, do not repeat all the charts
4. Feature Selection — focused on interpretability, not predictive accuracy
5. Modeling
6. Evaluation and Model Selection
7. Causal and Relationship Analysis — this section is the centerpiece of this pipeline
8. Deployment Notes

**Feature selection — follow Ch. 16, causal paradigm:**
- Remove features with high VIF (multicollinearity threatens coefficient validity)
- Apply domain reasoning — remove features that are mediators or proxies
- Goal is a clean, defensible set of independent features. 8–12 features is appropriate.
- Do not use RFECV here — that optimizes for prediction, not interpretation

**Modeling — Ch. 9–11 linear models are the right tool for explanation:**

Start with OLS Multiple Linear Regression (statsmodels) — this is the primary model for this pipeline. It produces p-values, confidence intervals, and standardized coefficients that can be interpreted causally.

Also run a logistic regression with statsmodels for comparison since the target is binary. Compare coefficient direction and significance between the two.

You may also run a Decision Tree for comparison — it reveals non-linear patterns and serves as a sanity check. But the primary deliverable is the OLS/logistic coefficients, not the tree.

Do NOT use ensemble methods as the primary model for this pipeline. Black-box models cannot serve the explanatory goal. You may include them for comparison but explain why they are not chosen as the final model.

**Evaluation — Ch. 15 adjusted for explanatory goal:**
- Report Adjusted R² (OLS) or pseudo-R² (logistic)
- Report coefficient table: feature, coefficient, standard error, p-value, confidence interval
- Standardize coefficients before fitting so magnitudes are comparable across features
- Run VIF check on final model — flag anything above 5
- Residual diagnostics: normality, homoscedasticity, linearity (Ch. 10)
- Cross-validation is less central here than in Pipeline 1 — the goal is inference, not generalization

**Causal and Relationship Analysis — the most important section of this notebook:**
- What do the coefficients tell the org? Translate each significant coefficient into a plain-language recommendation.
- Are the relationships directionally sensible? Does home visit frequency causing better outcomes make theoretical sense?
- Which claims are defensible as causal and which are only correlational? Be honest.
- Discuss confounders — girls who get more visits may be getting more visits because they are progressing. Does this reverse the causal arrow?
- What would we need (e.g. a randomized experiment) to make stronger causal claims?
- What should the org do differently based on these findings?

**Saving artifacts — follow Ch. 17:**
- Save model + scaler to `ml/reintegration_drivers.sav`
- Save `ml/reintegration_drivers-metadata.json`
- Save `ml/reintegration_drivers-metrics.json` — Adjusted R², significant features, p-values

---

## ETL Job Instructions (`etl_reintegration_drivers.py`)

Identical to `etl_reintegration_readiness.py`. Import from `reintegration_features.py`. The data preparation is the same — only the model is different.

---

## Infer Job Instructions (`infer_reintegration_drivers.py`)

This pipeline's inference output is different from Pipeline 1. It does not score individual residents. It produces an org-level insight — the coefficients — that gets written once and updated when the model retrains.

1. Call `get_client()` from `utils_db.py`
2. Load `ml/reintegration_drivers.sav`
3. Extract the top significant coefficients from the model
4. Format them as plain-language findings
5. Call `write_predictions()` with a single org-level record

---

## What Gets Written to `ml_predictions`

One org-level insight row, not one row per resident.

```
entity_type:   "org_insight"
entity_id:     null
model_name:    "reintegration-drivers"
model_version: training date
score:         null
score_label:   "explainer"
predicted_at:  current UTC timestamp
metadata: {
    top_drivers: [
        { feature: "visits_per_month", coefficient: 0.021, label: "Each additional home visit per month adds 2.1% readiness" },
        { feature: "family_coop_rate", coefficient: 0.312, label: "Cooperative families increase readiness by 31%" },
        { feature: "positive_session_rate", coefficient: 0.287, label: "Positive counseling sessions add 28% readiness" },
        ...
    ],
    adjusted_r2: 0.61,
    n_observations: 60
}
```

---

## Website Integration

**Impact page (public-facing):** Plain-language findings from `metadata.top_drivers`. "Girls who receive consistent home visits are 3x more likely to reintegrate successfully." Updated when model retrains.

**Donor page:** "X% of girls moved Y points closer to reintegration because of Z." The coefficients become the mechanism that connects donations to outcomes.

**Admin reports page:** Full coefficient table for staff — shows which interventions matter most and by how much.

# INTEX ML Pipeline Audit Reports

---

## 1. Donor Churn — Audit Report

**Pipeline:** donor_churn
**Business Problem:** Predict which monetary donors are at risk of becoming inactive (churning).
**Approach:** Predictive (with hybrid rule-based tiers)

### Checklist Results

#### 1. Problem Framing (Ch. 1)

> **Rating:** Partial

- States the business problem and metric (ROC-AUC) clearly.
- Mentions "recall-sensitive threshold discussion due to high false-negative cost" but never actually performs that threshold discussion.
- Does NOT explicitly name WHO in the organization cares (e.g., "the founders / fundraising team").
- Does not discuss real-world cost of false positives vs false negatives in concrete business terms (just one parenthetical mention).
- The prediction vs. explanation distinction is acknowledged (it's predictive) but there's no explanatory companion model as required by the instructions ("generate both a causal and predictive model").

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2-8)

> **Rating:** Partial

- Uses shared ETL modules (`build_training_frame`) — good for reproducibility.
- **Exploration is entirely in markdown bullet points with NO code, NO plots, NO statistical tests.** The "confirmed findings" are stated as facts but never demonstrated in the notebook. This is a major gap.
- No visualizations of distributions, correlations, or relationships.
- No missing value analysis shown.
- No outlier examination.
- Feature engineering is delegated to `build_training_frame()` — the notebook doesn't document what joins or transformations occur.
- Only 57 rows / 22 features — very small, but this is a data limitation, not a notebook flaw.

#### 3. Modeling & Feature Selection (Ch. 9-14, 16)

> **Rating:** Partial

- Compares 9 models — good breadth.
- Uses VarianceThreshold (filter) and RFECV (wrapper) — two methods of feature selection, good.
- Stacking classifier attempted — ensemble method covered.
- **No hyperparameter tuning** — all models use defaults (no GridSearchCV). This is a significant gap for Ch. 15 compliance.
- No sklearn Pipeline for preprocessing+modeling (just standalone StandardScaler in some models).
- RFECV selected 6 features but the best model (Gradient Boosting) was trained on the full 21 features, not the reduced set. The stacking model used the RFECV features but performed worse — this disconnect isn't discussed.

#### 4. Evaluation & Interpretation (Ch. 15)

> **Rating:** Partial

- Reports ROC-AUC, F1, accuracy, and classification report — appropriate metrics.
- Stratified train/test split — correct.
- **No cross-validation** on the final model (only RFECV uses CV internally).
- **No learning curves or validation curves.**
- **No business interpretation** of what 0.85 AUC or 0.40 F1 means operationally. The F1 of 0.40 for the positive class is quite poor and goes unaddressed.
- Test set is only 12 samples — acknowledged limitation but not discussed.

#### 5. Causal and Relationship Analysis

> **Rating:** Missing

- No written analysis of relationships.
- No discussion of feature importance or why features matter.
- No causal vs. correlation discussion.
- The exploration bullets are the closest thing, but they aren't substantiated with evidence or connected to the model's findings.

#### 6. Deployment Notes (Ch. 17)

> **Rating:** Complete

- Model artifacts saved via `save_model_bundle`, `save_metadata`, `save_metrics`.
- References `models/donor-churn/` output path.
- Mentions production-aligned ETL/feature modules.
- Could be improved with references to specific API endpoints or dashboard integrations.

#### 7. General Quality

> **Rating:** Partial

- Code is clean and modular — uses shared ETL.
- Random state set (42).
- Markdown narrative is thin — mostly headers and bullet lists, not explanation.
- Notebook IS executable if `build_training_frame()` can connect to data source.

### Chapter Coverage Gaps

| Chapter | Gap |
|---------|-----|
| Ch. 6 | No automated exploration — no distributions, no univariate stats, no plots |
| Ch. 8 | No bivariate relationship discovery — no correlation analysis, no chi-square, no ANOVA |
| Ch. 10 | No regression diagnostics (not applicable since no explanatory model, but requirements say to include one) |
| Ch. 12 | Decision tree used but feature importance not discussed, regularization not tuned |
| Ch. 14 | Stacking attempted but underperforms and the result isn't analyzed |
| Ch. 15 | No cross-validation on final model, no learning/validation curves, no hyperparameter tuning |

### Strengths

- Broad model comparison (9 algorithms).
- Clean integration with shared ETL modules.
- Feature selection uses two complementary methods (VarianceThreshold + RFECV).
- Artifact persistence is well-structured.

### Critical Issues (Must Fix)

1. **No exploration code/plots** — The exploration section has only text assertions with no supporting analysis. Add histograms, correlation heatmaps, and statistical tests.
2. **No causal/relationship analysis section** — This is explicitly required and entirely absent. Add a written section with feature importance analysis and coefficient/SHAP interpretation.
3. **No hyperparameter tuning** — All 9 models use defaults. Add GridSearchCV for at least the top 2-3 candidates.
4. **No business interpretation of results** — The F1=0.40 for churners is poor and unacknowledged. Discuss what this means operationally.

### Recommended Improvements

- Add an explanatory model (logistic regression with coefficient analysis) alongside the predictive model.
- Add cross-validation scores for the final model.
- Show learning curves to assess overfitting risk with n=57.
- Discuss threshold selection (the notebook mentions it in problem framing but never does it).

### Suggested Code/Content to Add

**Exploration cell:**
```python
# Distribution of target
print(y.value_counts(normalize=True))
# Correlation heatmap
import seaborn as sns
sns.heatmap(X.corr(), cmap='RdBu_r', center=0, annot=False)
plt.title("Feature Correlation Heatmap")
plt.show()
```

**Causal analysis markdown cell:**
```markdown
## Causal and Relationship Analysis
The top features by permutation importance are: ...
These make business sense because...
We cannot claim causation because... (observational data, potential confounders)
```

---

## 2. Incident Early Warning — Audit Report

**Pipeline:** incident_early_warning
**Business Problem:** Predict self-harm and runaway risk at intake for newly admitted residents.
**Approach:** Predictive

### Checklist Results

#### 1. Problem Framing (Ch. 1)

> **Rating:** Partial

- States the goal clearly (dual classifier for self-harm and runaway).
- "Recall-prioritized" — implies understanding of error costs.
- Does NOT explicitly discuss WHO cares or WHY it matters in business terms.
- Does NOT discuss prediction vs. explanation distinction.
- No success metrics defined beyond "recall-prioritized."
- No discussion of real-world cost of false positives (unnecessary interventions) vs false negatives (missed at-risk residents).

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2-8)

> **Rating:** Missing

- Uses shared ETL (`build_training_frame`) — but **zero exploration**.
- No distributions, no summary statistics, no visualizations.
- No missing value analysis.
- No outlier examination.
- No documentation of what features are included or what transformations were applied.
- Feature columns are extracted programmatically but never examined.

#### 3. Modeling & Feature Selection (Ch. 9-14, 16)

> **Rating:** Partial

- Compares 4 models (logreg, tree, RF, GB) — reasonable set.
- Uses a lowered threshold (0.35) to prioritize recall — good domain reasoning.
- **No feature selection at all** — all 14 features go in without filtering, RFECV, or importance analysis.
- **No hyperparameter tuning** — models use hand-picked defaults.
- **No sklearn Pipeline** for preprocessing.
- No ensemble method comparison beyond RF (no stacking, no boosting comparison).

#### 4. Evaluation & Interpretation (Ch. 15)

> **Rating:** Partial

- Reports recall, precision, F1, ROC-AUC — appropriate metrics.
- Stratified split — correct.
- **No cross-validation.**
- **No learning or validation curves.**
- **No business interpretation** — what does 100% recall with 50% precision mean for staff workload?
- Test set is only 12 samples — highly unstable estimates, not discussed.

#### 5. Causal and Relationship Analysis

> **Rating:** Missing

- No analysis of which intake features drive risk.
- No discussion of why certain features matter.
- No causal vs. correlation discussion.

#### 6. Deployment Notes (Ch. 17)

> **Rating:** Complete

- Saves dual model bundle + metadata + metrics.
- References artifact structure.
- Follows the repo's deployment pattern.

#### 7. General Quality

> **Rating:** Partial

- Code is clean and concise.
- Random state set.
- **Extremely thin narrative** — only 1 markdown cell (the header). Almost no written explanation anywhere.
- 4 code cells total — this is the thinnest notebook of the 6.

### Chapter Coverage Gaps

| Chapter | Gap |
|---------|-----|
| Ch. 1 | Problem framing is cursory — no prediction/explanation discussion |
| Ch. 6 | Zero exploration |
| Ch. 7 | No visible data preparation pipeline |
| Ch. 8 | No relationship discovery |
| Ch. 10 | No diagnostics |
| Ch. 14 | Ensemble methods present but not compared meaningfully |
| Ch. 15 | No CV, no tuning, no curves |
| Ch. 16 | No feature selection |

### Strengths

- Pragmatic threshold adjustment (0.35) for recall prioritization.
- Dual-target design (self-harm + runaway) is operationally meaningful.
- Clean code structure.

### Critical Issues (Must Fix)

1. **No exploration at all** — Add distributions of target variables, feature summaries, and visualizations.
2. **No causal/relationship analysis** — Required section is entirely absent.
3. **No feature selection** — All 14 features used without any filtering or justification.
4. **No written narrative** — The notebook has essentially 1 markdown cell. Needs substantial markdown explanation throughout.
5. **No hyperparameter tuning** — Add GridSearchCV.
6. **No cross-validation** — Critical for n=60 where test set estimates are highly unstable.

### Recommended Improvements

- Add an explanatory model (logistic regression with coefficient interpretation) to understand which intake factors predict risk.
- Add permutation importance analysis.
- Discuss the ethical implications of false negatives in this context (missing a self-harm risk for a minor).
- Add cross-validation with confidence intervals.

### Suggested Code/Content to Add

**Problem framing markdown:**
```markdown
### Who cares and why
The safehouse staff and social workers need early identification of residents
at risk of self-harm or runaway attempts. False negatives are extremely costly —
a missed warning could endanger a vulnerable minor. False positives result in
extra monitoring, which is costly but not dangerous.
```

**Feature importance after model fitting:**
```python
importances = pd.Series(
    best_selfharm_model.coef_[0] if hasattr(best_selfharm_model, 'coef_')
    else best_selfharm_model.feature_importances_,
    index=feature_cols
).sort_values(key=abs, ascending=False)
print("Top self-harm risk factors:")
print(importances.head(10))
```

---

## 3. Reintegration Drivers — Audit Report

**Pipeline:** reintegration_drivers
**Business Problem:** Identify which factors most strongly explain reintegration completion.
**Approach:** Explanatory

### Checklist Results

#### 1. Problem Framing (Ch. 1)

> **Rating:** Complete

- Clear business question stated.
- Explicitly states "Explanatory / inference-oriented."
- Distinguishes this from Pipeline 1 (predictive) with good textbook framing.
- Defines primary metrics (Adjusted R-squared, coefficient significance, pseudo-R-squared).
- Discusses operational use (org-level insight row for donor messaging).

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2-8)

> **Rating:** Partial

- Uses shared ETL from reintegration_readiness — good code reuse.
- Shows correlation with target — basic exploration present.
- **Defers to "Pipeline 1 already documented correlations"** — but the requirements say each notebook should be self-contained. Missing: distributions, visualizations, outlier analysis.
- No separate exploration visualizations in this notebook.

#### 3. Modeling & Feature Selection (Ch. 9-14, 16)

> **Rating:** Complete

- OLS regression as primary — appropriate for explanatory goal.
- Logistic regression attempted as comparison (failed due to singularity — honest about it).
- Decision tree as sanity check.
- **Excellent feature selection pipeline**: near-zero variance, high correlation pruning, iterative VIF pruning. This is textbook Ch. 16 done right.
- Standardized coefficients for comparability.
- VIF analysis is thorough and well-documented.

#### 4. Evaluation & Interpretation (Ch. 15)

> **Rating:** Complete

- Adjusted R-squared reported (0.379 — modest but honest).
- Full OLS summary with p-values and confidence intervals.
- VIF on final model with flags for VIF > 5.
- Residual diagnostics: Shapiro-Wilk normality test (p=0.73, passes), Breusch-Pagan heteroscedasticity test (p=0.11, passes).
- Could improve: no learning curves, no cross-validation, no explicit business interpretation of what the coefficients mean for the organization.

#### 5. Causal and Relationship Analysis

> **Rating:** Partial

- Present and acknowledges observational limitations — good.
- Mentions confounding (reverse causality with intervention intensity) — excellent.
- Notes that claims are "hypothesis-generating" not causal.
- **Too brief** — only 3 bullet points in a markdown cell. Doesn't interpret specific coefficients or discuss what the organization should DO based on findings. The `courses_completed` negative coefficient (p=0.008) is the strongest result but goes unexplained.

#### 6. Deployment Notes (Ch. 17)

> **Rating:** Complete

- Artifacts saved with metadata and metrics.
- References infer pipeline (`pipelines/reintegration_drivers_infer.py`).
- Mentions versioning via `training_date`.

#### 7. General Quality

> **Rating:** Partial

- Code is clean and well-organized.
- Random state set.
- Written narrative is present but thin in places — especially the causal analysis.
- The logistic model failing (singularity) is noted but not investigated. With n=48 training and 17 features, the model is overparameterized for logistic regression — this should be acknowledged.
- Notebook depends on Pipeline 1's ETL.

### Chapter Coverage Gaps

| Chapter | Gap |
|---------|-----|
| Ch. 6 | Exploration deferred to Pipeline 1 — not self-contained |
| Ch. 8 | No bivariate relationship plots in this notebook |
| Ch. 14 | No ensemble methods attempted (not required for explanatory, but could compare) |
| Ch. 15 | No cross-validation, no learning curves |

### Strengths

- **Excellent VIF-based feature selection** — iterative pruning from VIF>557 down to all VIF<10. This is the best Ch. 16 demonstration across all 6 notebooks.
- Proper regression diagnostics (Shapiro-Wilk, Breusch-Pagan).
- Clean separation of explanatory vs. predictive goals with Pipeline 1.
- Honest about n=60 limitations and the observational nature of findings.

### Critical Issues (Must Fix)

1. **Causal analysis is too thin** — The strongest coefficient (`courses_completed`, p=0.008, negative) is never interpreted. Add interpretation for each significant or near-significant coefficient.
2. **No self-contained exploration** — Don't defer to Pipeline 1. Add at least a correlation heatmap and key distributions.
3. **Logistic model singularity** — Acknowledge this is due to overparameterization (17 features, 48 rows) and consider reducing features further for the logistic comparison.

### Recommended Improvements

- Add a coefficient interpretation table in business terms (e.g., "Each SD increase in psych_checkups is associated with +0.13 increase in completion probability").
- Add cross-validation of the OLS model.
- Plot residuals visually (not just test statistics).

### Suggested Code/Content to Add

**Coefficient interpretation markdown:**
```markdown
### Key findings from OLS coefficients (standardized):
- **courses_completed** (coef = -0.18, p=0.008): Counterintuitively negative — residents
  with more courses completed are LESS likely to complete reintegration. This may reflect
  that residents in longer-term educational programs haven't yet reached reintegration stage.
- **psych_checkups** (coef = +0.13, p=0.053): Marginally significant positive association —
  regular psychological check-ups are associated with better outcomes.
- **trauma_severity_score** (coef = +0.13, p=0.09): Weak positive — higher-trauma cases
  may receive more intensive intervention (confounding).
```

---

## 4. Reintegration Readiness — Audit Report

**Pipeline:** reintegration_readiness
**Business Problem:** Predict probability of successful reintegration completion for active residents.
**Approach:** Predictive

### Checklist Results

#### 1. Problem Framing (Ch. 1)

> **Rating:** Complete

- Clear business question with operational use case (nightly scoring, 0-100).
- Explicitly states "Predictive" approach.
- Discusses error costs: false positive (premature placement — dangerous) vs. false negative (unnecessary delay).
- Acknowledges dataset limitations (n=60, class imbalance).

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2-8)

> **Rating:** Partial

- Uses shared ETL — good.
- Shows correlations with target and reintegration rates by case category — decent but minimal.
- **No visualizations** — no plots at all.
- No missing value analysis.
- No outlier analysis.
- Exploration is described in a markdown cell with "should verify" language, suggesting the findings were pre-determined.

#### 3. Modeling & Feature Selection (Ch. 9-14, 16)

> **Rating:** Complete

- **10 models compared** with GridSearchCV tuning — excellent breadth.
- Stacking classifier on top 3 models.
- RFECV feature selection (selected 9 from 29 features).
- Univariate ranking with f_classif — multiple selection methods.
- Proper sklearn Pipelines with StandardScaler.
- Full vs. reduced feature comparison (0.89 vs 1.0 CV AUC — reduced is better).

#### 4. Evaluation & Interpretation (Ch. 15)

> **Rating:** Partial (due to unaddressed red flag)

- ROC-AUC, F1, accuracy, confusion matrix, classification report.
- Stratified train/test split.
- **5-fold stratified CV** — properly done.
- **Learning curves** shown — goes from 0.88 to 1.0 as training size increases.
- **Validation curves** for regularization parameter C.
- Permutation importance on test set.
- **However**: CV AUC = 1.0 but test AUC = 0.625. This massive gap (perfect CV, poor holdout) is a red flag for overfitting or data leakage that goes **completely undiscussed**. This is the single biggest issue in this notebook.

#### 5. Causal and Relationship Analysis

> **Rating:** Partial

- Present but brief.
- Acknowledges observational nature and confounding.
- Mentions sensitivity analysis as next step — but doesn't do it.
- Doesn't interpret the actual permutation importances (where `reintegration_assessments` is the top feature but most features have negative importance — another red flag).
- Defers explanatory work to Pipeline 2.

#### 6. Deployment Notes (Ch. 17)

> **Rating:** Complete

- Nightly infer job referenced.
- Writes to `ml_predictions` and `ml_prediction_history`.
- Notes need for regular retraining.
- Artifacts saved with metadata.

#### 7. General Quality

> **Rating:** Partial

- Code is well-structured with proper sklearn patterns.
- Random state set throughout.
- **Major concern: CV AUC = 1.0 everywhere but test AUC = 0.625.** Either there's target leakage in the 5-fold CV (the scaler is fitting inside RFECV without a pipeline wrapper), the features are nearly deterministic of the outcome in the training set but not generalizable, or the 12-sample test set is unrepresentative. This needs diagnosis.
- Markdown narrative is present but doesn't address the critical overfitting signal.

### Chapter Coverage Gaps

| Chapter | Gap |
|---------|-----|
| Ch. 6 | Minimal exploration — no plots, no distribution analysis |
| Ch. 8 | Correlation shown but no visual relationship discovery |
| Ch. 11 | Possible target leakage — the CV=1.0 vs test=0.625 gap suggests something is wrong |

### Strengths

- **Most thorough model comparison** across all notebooks — 10 algorithms + stacking with GridSearchCV.
- Learning and validation curves included.
- RFECV + univariate ranking — strong feature selection methodology.
- Clear error cost discussion in problem framing.
- Full vs. reduced feature set comparison.

### Critical Issues (Must Fix)

1. **CV AUC = 1.0 but test AUC = 0.625** — This is a critical red flag. The notebook reports perfect cross-validation scores across multiple models but poor holdout performance. This needs diagnosis and honest discussion. Possible causes: data leakage during feature selection (RFECV sees entire training set including the CV folds' scaling), or the 9 selected features overfit to the 48 training examples.
2. **Permutation importances are mostly negative** — When most features have negative importance on the test set, the model is likely not learning generalizable patterns. This is unremarked upon.
3. **No exploration visualizations** — No plots at all despite having rich resident data.

### Recommended Improvements

- Investigate the CV/test discrepancy explicitly. Try nested cross-validation or leave-one-out given n=60.
- Add exploration plots (target distribution, top feature distributions, scatter plots).
- Discuss what the poor test performance means operationally — should this model be deployed?
- Consider whether n=60 is sufficient for 9 features with a 32% positive rate.

### Suggested Code/Content to Add

**Overfitting investigation:**
```markdown
### Critical observation: CV vs. holdout divergence
Our 5-fold CV reports perfect AUC (1.0) across Logistic Regression, SVM, and Stacking,
yet the holdout test AUC is only 0.625. With only n=48 in training and 12 in test,
this likely reflects:
1. The small test set being unrepresentative (3 positive cases)
2. Possible information leakage during RFECV feature selection
3. High variance inherent in small-sample classification

We should use nested CV or LOOCV for more reliable estimates.
```

---

## 5. Social Media Content — Audit Report

**Pipeline:** social_media_content
**Business Problem:** Identify which social media content characteristics explain donation referral volume.
**Approach:** Explanatory

### Checklist Results

#### 1. Problem Framing (Ch. 1)

> **Rating:** Complete

- Excellent problem framing with clear table format.
- Explicitly states "Explanatory" with strong justification.
- Distinguishes from Pipeline 4B (timing) clearly.
- Defines metrics (Adjusted R-squared, coefficient significance).
- The "before-post only" constraint is well-reasoned — features are only things staff can control at publish time.

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2-8)

> **Rating:** Complete

- Loads 812 posts from Supabase — well-documented.
- **Rich exploration** with 7 exploration cells: story vs. no-story (7.3x multiplier), post type breakdown, media type, sentiment tone, platform, engagement correlations, target distribution.
- **Visualizations** — bar charts for each categorical breakdown plus histograms for target distribution.
- Explicitly notes that after-post engagement metrics are NOT used as features (avoiding target leakage) — excellent discipline.
- Uses shared feature engineering module.
- 52 features built from raw data.

#### 3. Modeling & Feature Selection (Ch. 9-14, 16)

> **Rating:** Complete

- OLS as primary model — appropriate for explanatory goal.
- Logistic regression comparison (binary target, ROC-AUC = 0.808).
- Decision tree comparison for non-linear patterns.
- **Thorough feature selection**: VarianceThreshold, multicollinearity pruning (business-aware, not blind), VIF analysis, backward elimination (p > 0.05), final 11 features.
- Business-informed decisions about which correlated features to drop (e.g., keep both `features_resident_story` and `post_type_ImpactStory`).

#### 4. Evaluation & Interpretation (Ch. 15)

> **Rating:** Complete

- Test set R-squared = 0.335, Adjusted R-squared = 0.286 — modest but honest.
- Full residual diagnostics: residuals vs. fitted, histogram, Q-Q plot.
- VIF on final model — all <= 10.
- **Excellent business interpretation** — each coefficient translated to "adds/reduces ~X donation referrals."
- Missing: cross-validation, learning curves. But for OLS with n=812, this is less critical.

#### 5. Causal and Relationship Analysis

> **Rating:** Complete

- **Strong section.**
- Plain-language content recommendations.
- Explicitly discusses what's "likely causal" (staff-controlled decisions like story inclusion, post type) vs. "likely correlational" (platform differences, sentiment tone).
- Honest about observational limitations.
- Provides actionable strategy guide.

#### 6. Deployment Notes (Ch. 17)

> **Rating:** Complete

- Model bundle saved (joblib).
- Metadata + metrics saved as JSON.
- Preview of `ml_predictions` record that infer job will write.
- References specific file paths.

#### 7. General Quality

> **Rating:** Complete

- 39 cells — most thorough notebook of the 6.
- Rich markdown narrative throughout.
- Clean code with good documentation.
- Random state set.
- No target leakage (explicitly filters out post-hoc engagement metrics).
- Fully executable with clear outputs.

### Chapter Coverage Gaps

| Chapter | Gap |
|---------|-----|
| Ch. 14 | No ensemble methods — justified because explanatory goal, but could note this |
| Ch. 15 | No cross-validation or learning curves (minor for n=812 OLS) |

### Strengths

- **Best overall notebook** — comprehensive exploration, strong narrative, proper causal reasoning.
- Feature leakage prevention — explicitly excludes post-hoc engagement metrics with clear reasoning.
- Business-aware multicollinearity decisions — doesn't blindly drop features.
- VIF + backward elimination produce a clean, interpretable model.
- Coefficient interpretation in both standardized and referral-unit terms.
- Causal vs. correlational discussion is the strongest across all 6 notebooks.
- Visualizations throughout.

### Critical Issues (Must Fix)

1. **None critical** — This is the strongest notebook.

### Recommended Improvements

- Add cross-validation of the OLS model (even simple 5-fold) for robustness check.
- The Adjusted R-squared of 0.286 is relatively low — note that content features explain ~29% of referral variance, and discuss what else might drive the remaining 71%.
- Consider a zero-inflated model or hurdle model given that 35.7% of posts have zero referrals.
- Minor: the `pip install` cell shouldn't be needed in a production notebook.

---

## 6. Social Media Timing — Audit Report

**Pipeline:** social_media_timing
**Business Problem:** Predict engagement rate from timing and format features to optimize posting schedule.
**Approach:** Predictive

### Checklist Results

#### 1. Problem Framing (Ch. 1)

> **Rating:** Partial

- States the business question clearly.
- Justifies using `engagement_rate` over `donation_referrals`.
- Separates from Pipeline 4 (content) — good.
- **Does not discuss prediction vs. explanation distinction** beyond noting it's predictive.
- **Does not discuss error costs** or what a wrong prediction means operationally.
- Does not name WHO in the organization benefits.

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2-8)

> **Rating:** Partial

- Uses shared ETL — 812 posts, 30 features.
- **Minimal exploration** — only 2 stats: correlation of post_hour (r=0.44) and weekend vs weekday means.
- No visualizations.
- No distributions shown.
- No outlier analysis.
- No missing value analysis.
- Features are documented but not examined.

#### 3. Modeling & Feature Selection (Ch. 9-14, 16)

> **Rating:** Partial

- **9 models compared** including stacking — good breadth.
- 5-fold CV with MAE and R-squared — proper methodology.
- **No feature selection at all** — all 30 features used without filtering, importance analysis, or justification.
- **No hyperparameter tuning** — all models use defaults (no GridSearchCV).
- Uses sklearn Pipelines for some models (KNN, SVR).

#### 4. Evaluation & Interpretation (Ch. 15)

> **Rating:** Partial

- Reports MAE, RMSE, R-squared on test set.
- Cross-validation comparison table — good.
- **One line of business interpretation** — "off by 0.032 engagement points on avg (~32% of mean)" — minimal but present.
- **No learning or validation curves.**
- No residual analysis.
- R-squared = 0.47 on test — reasonable for timing-only features, but not discussed whether this is good enough to act on.

#### 5. Causal and Relationship Analysis

> **Rating:** Missing

- No written analysis of relationships.
- No discussion of which timing features matter most.
- No feature importance analysis.
- No causal vs. correlation discussion.

#### 6. Deployment Notes (Ch. 17)

> **Rating:** Complete

- Model saved via `save_model_bundle`.
- Metadata and metrics persisted.
- References `infer.py` for generating recommendation matrix.
- Feature list saved for alignment.

#### 7. General Quality

> **Rating:** Partial

- Code is clean.
- Random state set.
- Markdown narrative is present but thin.
- Notebook references `run_inference` import but doesn't call it.
- No explanatory companion model.

### Chapter Coverage Gaps

| Chapter | Gap |
|---------|-----|
| Ch. 6 | Minimal exploration — only 2 statistics |
| Ch. 8 | No relationship discovery |
| Ch. 10 | No regression diagnostics |
| Ch. 15 | No learning/validation curves, no hyperparameter tuning |
| Ch. 16 | No feature selection |

### Strengths

- Clean separation from content pipeline (Pipeline 4).
- Broad model comparison (9 models).
- Cross-validation used consistently.
- Business interpretation line is a start.
- Good stacking configuration with passthrough.

### Critical Issues (Must Fix)

1. **No causal/relationship analysis** — Required section entirely absent. Add feature importance from GradientBoosting and discuss which timing factors matter most.
2. **No feature selection** — 30 features used without any filtering. At minimum, add permutation importance or `feature_importances_` from GradientBoosting.
3. **No exploration** — Add plots showing engagement_rate vs. post_hour, day_of_week, platform.
4. **No hyperparameter tuning** — GradientBoosting selected as best but uses defaults. Add GridSearchCV.

### Recommended Improvements

- Add an explanatory model (OLS regression on timing features) to complement the predictive GBR.
- Add partial dependence plots for post_hour and day_of_week.
- Show the actual recommendation matrix (best hour x day x platform).
- Add residual diagnostics for the final model.

### Suggested Code/Content to Add

**Feature importance:**
```python
importances = pd.Series(
    best_model.feature_importances_,
    index=X.columns
).sort_values(ascending=False)
print("Top timing features:")
print(importances.head(10))
```

**Exploration visualization:**
```python
import matplotlib.pyplot as plt
fig, ax = plt.subplots(figsize=(10, 5))
hourly = pd.DataFrame({'hour': X_train['post_hour'], 'engagement': y_train})
hourly.groupby('hour')['engagement'].mean().plot(ax=ax)
ax.set_title("Mean Engagement Rate by Post Hour")
plt.show()
```

---

## Cross-Notebook Summary

| Notebook | Problem Framing | Data/Exploration | Modeling/FS | Evaluation | Causal Analysis | Deployment | Quality | Overall |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| **donor_churn** | Partial | Partial | Partial | Partial | Missing | Complete | Partial | Needs significant work |
| **incident_early_warning** | Partial | Missing | Partial | Partial | Missing | Complete | Partial | Thinnest notebook — needs major additions |
| **reintegration_drivers** | Complete | Partial | Complete | Complete | Partial | Complete | Partial | Solid explanatory work, needs more interpretation |
| **reintegration_readiness** | Complete | Partial | Complete | Partial | Partial | Complete | Partial | Strong modeling, but CV/test gap is critical |
| **social_media_content** | Complete | Complete | Complete | Complete | Complete | Complete | Complete | **Best notebook — model for others** |
| **social_media_timing** | Partial | Partial | Partial | Partial | Missing | Complete | Partial | Decent modeling, weak narrative |

### Top-Priority Fixes Across All Notebooks

1. **Add causal/relationship analysis** to donor_churn, incident_early_warning, and social_media_timing — this is a required section that's entirely missing in 3/6 notebooks.
2. **Add exploration with visualizations** to donor_churn, incident_early_warning, and social_media_timing — these have little to no EDA.
3. **Investigate reintegration_readiness CV=1.0 vs test=0.625** — this is the single most suspicious result and could indicate data leakage.
4. **Add hyperparameter tuning** to donor_churn, incident_early_warning, and social_media_timing.
5. **Expand markdown narrative** in all notebooks except social_media_content — explain the "why" behind every modeling decision.

### Systemic Strengths

- Shared ETL/feature modules across all notebooks — good software engineering.
- Model artifacts saved consistently via `save_model_bundle`.
- Random state set in all notebooks.
- Multiple model comparison in most notebooks.

### Systemic Weaknesses

1. **Causal & Relationship Analysis** is missing or thin in 4 of 6 notebooks — this is the most consistently underserved requirement.
2. **Exploration** is consistently weak — most notebooks list findings in markdown without showing the code/visualizations that produced them.
3. **Cross-validation** is missing or underused — several notebooks rely on tiny single holdout splits.
4. **Hyperparameter tuning** is absent in 3 of 6 notebooks.
5. **Feature selection** is absent in 2 of 6 notebooks.
6. **Business interpretation** of results is generally thin except in the social media content notebook.
7. **Deployment notes** across all notebooks are adequate for artifact saving but weak on web application integration details.

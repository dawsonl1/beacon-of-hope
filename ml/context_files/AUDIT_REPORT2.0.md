# ML Pipeline Audit Report 2.0

**Auditor:** Course TA (automated audit)
**Date:** 2026-04-07
**Notebooks reviewed:** 6 (all pipelines in `ml/`)
**Standards:** INTEX Requirements + Textbook Chapters 1, 5–17

---

## Table of Contents

1. [Pipeline 1 — Reintegration Readiness](#pipeline-1--reintegration-readiness)
2. [Pipeline 2 — Reintegration Drivers](#pipeline-2--reintegration-drivers)
3. [Pipeline 3 — Donor Churn](#pipeline-3--donor-churn)
4. [Pipeline 4 — Social Media Content](#pipeline-4--social-media-content)
5. [Pipeline 4B — Social Media Timing](#pipeline-4b--social-media-timing)
6. [Pipeline 5 — Incident Early Warning](#pipeline-5--incident-early-warning)
7. [Cross-Pipeline Summary](#cross-pipeline-summary)

---

## Pipeline 1 — Reintegration Readiness

**Pipeline:** reintegration_readiness
**Business Problem:** Predict the probability a resident will successfully complete reintegration, scoring active residents nightly for prioritization.
**Approach:** Predictive

### Checklist Results

#### 1. Problem Framing (Ch. 1)
:white_check_mark: **Complete**
- Clear written explanation of the business question (Cell 0 markdown)
- States WHO cares: safehouse staff and social workers for prioritization
- Explicitly states **predictive** approach with justification
- Defines ROC-AUC as primary metric
- Discusses error costs: false positive (premature placement) vs false negative (unnecessary delay) — appropriate for the nonprofit context
- Notes dataset limitation (n=60, class imbalance)

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2–8)
:white_check_mark: **Complete**
- Loads data via shared `etl.build_training_frame()` — modular and reusable (Cell 1)
- Documents which tables are used (residents, process recordings, health, education, home visitations, incidents, interventions)
- Missing values handled in the ETL module
- Exploration includes: target distribution, correlation heatmap, feature distributions by target class, reintegration rates by case category (Cells 3–4)
- Feature engineering documented in markdown (visits_per_month, trauma_severity_score, etc.)
- Uses VarianceThreshold and correlation pruning as reproducible preprocessing steps (Cell 5)
- Univariate feature ranking with f_classif for initial screening

#### 3. Modeling & Feature Selection (Ch. 9–14, 16)
:white_check_mark: **Complete**
- Compares **10 model families**: Logistic Regression, Decision Tree, KNN, SVM (Linear + RBF), Naive Bayes, Random Forest, Gradient Boosting, AdaBoost, Extra Trees (Cell 6)
- Builds **Stacking ensemble** from top 3 models (Ch. 14)
- All models tuned via **GridSearchCV** with stratified 5-fold CV (Ch. 15)
- **Iterative PFI feature selection** (Cell 8): principled approach using permutation importance on test set, dropping bottom 20% per iteration, retraining ALL models each round, with AUC tolerance stopping criterion
- Learning curves and validation curves shown (Cell 7)
- sklearn Pipelines used for preprocessing + modeling

#### 4. Evaluation & Interpretation (Ch. 15)
:white_check_mark: **Complete**
- ROC-AUC, F1, classification report, confusion matrix on holdout test (Cell 9)
- LOOCV for more reliable estimate with small n (Cell 10) — excellent methodological awareness
- Cross-validation with stratified K-fold
- Results interpreted in business terms with score labels (Ready/Progressing/Early Stage/Not Ready)
- Discusses CV vs holdout divergence honestly (Cell markdown after Cell 9)
- Compares LOOCV on full features vs top-5 for overfitting assessment

#### 5. Causal and Relationship Analysis
:warning: **Partial**
- Written analysis of key predictors from PFI selection (Cell markdown after Cell 10)
- Discusses confounding and intervention intensity confounding
- Mentions sensitivity analysis with propensity-style adjustment
- **Missing:** Does not deeply discuss *specific* feature relationships and their theoretical sense — mostly defers to Pipeline 2 for explanatory decomposition
- **Missing:** Does not provide a clear causal story beyond "features that survived PFI are genuine signals"

#### 6. Deployment Notes (Ch. 17)
:white_check_mark: **Complete**
- References nightly infer job and specific output tables (ml_predictions, ml_prediction_history)
- Score labels defined
- Model artifacts saved via `save_model_bundle` (Cell 11)
- Metadata and metrics saved as JSON
- Notes retraining cadence and monitoring needs

#### 7. General Quality
:white_check_mark: **Complete**
- Notebook is executable top-to-bottom (outputs present in all cells)
- Imports shared ETL module — no duplicated logic
- RANDOM_STATE = 42 set throughout
- Markdown narrative accompanies all code sections
- No target leakage — features are all behavioral/progress metrics available at scoring time

### Chapter Coverage Gaps

| Chapter | Status | Notes |
|---------|--------|-------|
| Ch. 1 | :white_check_mark: | Full CRISP-DM framing |
| Ch. 5 | :white_check_mark: | Data loading documented |
| Ch. 6 | :white_check_mark: | Systematic exploration |
| Ch. 7 | :white_check_mark: | Shared ETL pipeline |
| Ch. 8 | :warning: | Correlations shown but no chi-square or ANOVA tests for categorical/mixed relationships |
| Ch. 9-11 | :white_check_mark: | Logistic regression included in comparison |
| Ch. 12 | :white_check_mark: | Decision tree included with depth/leaf tuning |
| Ch. 13 | :white_check_mark: | Full classification metrics suite |
| Ch. 14 | :white_check_mark: | Stacking, Random Forest, Gradient Boosting, AdaBoost, Extra Trees |
| Ch. 15 | :white_check_mark: | GridSearchCV, learning curves, validation curves, LOOCV |
| Ch. 16 | :white_check_mark: | Iterative PFI — excellent implementation |
| Ch. 17 | :white_check_mark: | Artifacts saved, inference pipeline referenced |

### Strengths
- **Iterative PFI feature selection** (Cell 8) is the standout — principled, well-documented, retrains all models at each iteration. This goes beyond textbook requirements.
- **LOOCV** (Cell 10) shows strong methodological awareness for small-sample problems.
- **10-model comparison** with stacking is thorough.
- **Honest assessment** of CV vs holdout divergence and small-sample limitations.
- **Shared ETL module** prevents code duplication across pipelines 1 and 2.

### Critical Issues (Must Fix)
1. **Causal analysis is thin.** The causal/relationship analysis section mostly defers to Pipeline 2. The requirements say "for each pipeline, include a written analysis discussing the relationships you discovered in the data." Even predictive pipelines must discuss what the model reveals about underlying data structure. Add 2-3 paragraphs discussing: which features survived PFI and why that makes domain sense, what the feature importance rankings tell us about the reintegration process, and what theoretical mechanisms might explain the patterns.

### Recommended Improvements
1. Add chi-square or ANOVA tests in the exploration section (Ch. 8) for categorical features like case_category vs reintegration_complete.
2. Add a threshold analysis / precision-recall trade-off discussion — what threshold should staff use operationally?
3. Consider showing a calibration curve given the model outputs probabilities used for scoring.

### Suggested Code/Content to Add

**For Causal Analysis (add as markdown cell after Cell 10):**
```markdown
### Detailed Relationship Analysis

**visits_per_month** (strongest linear predictor, r≈0.40): More frequent home visitation
monitoring is associated with better reintegration outcomes. This relationship likely
reflects two mechanisms: (1) more engaged families facilitate more visits, and (2) visits
themselves provide monitoring and support that aids reintegration. The direction of
causation is ambiguous — we cannot determine whether visits cause better outcomes or
whether progressing residents naturally receive more visits.

**case_category_Surrendered vs Foundling**: Surrendered cases show dramatically higher
reintegration rates. This structural difference likely reflects family traceability —
surrendered children have identified families who may be willing to engage in the
reintegration process, while foundlings lack this critical resource. This is not something
the organization can change, but it should inform case planning expectations.

[Continue for 3-4 more features...]
```

---

## Pipeline 2 — Reintegration Drivers

**Pipeline:** reintegration_drivers
**Business Problem:** Identify which factors most strongly explain reintegration completion, with interpretable coefficients for organizational insight.
**Approach:** Explanatory

### Checklist Results

#### 1. Problem Framing (Ch. 1)
:white_check_mark: **Complete**
- Clear distinction from Pipeline 1: explanatory vs predictive (Cell 0)
- States primary metrics: Adjusted R², coefficient significance, pseudo-R²
- Identifies operational use: publish org-level insight row
- Explicitly discusses how feature selection and evaluation criteria differ from predictive work

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2–8)
:white_check_mark: **Complete**
- Reuses shared `build_training_frame()` from Pipeline 1's ETL module — excellent code reuse
- Self-contained exploration: target distribution, correlation heatmap, feature distributions by status, reintegration rates by case category (Cells 3–4)
- Documents that the notebook "must be self-contained" despite sharing ETL

#### 3. Modeling & Feature Selection (Ch. 9–14, 16)
:white_check_mark: **Complete**
- **VIF-based iterative pruning** (Cell 5) — drops features with VIF > 10 sequentially, excellent for explanatory work
- Near-zero variance filter and high-correlation pruning (|r| > 0.95) on training split only
- Final 17 features with all VIF ≤ ~8.5
- **OLS regression** as primary model (Cell 6) — appropriate for explanatory goal
- **Logistic regression** attempted as comparison (correctly notes singularity due to n=48/17 features)
- **Decision Tree** as sanity check
- Standardized coefficients for comparable interpretation
- Documents why RFECV is NOT used as final selector (prioritizes interpretability over prediction)

#### 4. Evaluation & Interpretation (Ch. 15)
:white_check_mark: **Complete**
- Adjusted R² = 0.379, R² = 0.604
- **Residual diagnostics** (Cell 7): Shapiro-Wilk for normality, Breusch-Pagan for homoscedasticity, residual plots, Q-Q plot
- 5-fold cross-validation of OLS via sklearn
- Coefficient table with p-values and confidence intervals
- VIF reported on final model
- F-statistic significant (p = 0.009)

#### 5. Causal and Relationship Analysis
:white_check_mark: **Complete** — This is the strongest section across all notebooks.
- Detailed interpretation of every near-significant coefficient (Cell markdown after Cell 6)
- **courses_completed paradox** explained: counterintuitive negative coefficient interpreted as mediator/confounder
- **psych_checkups** positive association discussed with reverse causality caveat
- **Intervention intensity confounding** explicitly addressed
- Clear separation of "defensible claims" vs "claims requiring stronger evidence"
- Discusses what randomized/quasi-experimental design would be needed for causal claims

#### 6. Deployment Notes (Ch. 17)
:warning: **Partial**
- Artifacts saved (Cell 8)
- References nightly infer job and org_insight row
- **Missing:** No specific API endpoint or dashboard component references
- **Missing:** No description of how the insight is displayed to end users

#### 7. General Quality
:white_check_mark: **Complete**
- Executable top-to-bottom
- Code reuses shared ETL
- Narrative accompanies all sections
- RANDOM_STATE = 42
- No target leakage

### Chapter Coverage Gaps

| Chapter | Status | Notes |
|---------|--------|-------|
| Ch. 1 | :white_check_mark: | Excellent pred vs explain framing |
| Ch. 6 | :white_check_mark: | Systematic exploration |
| Ch. 7 | :white_check_mark: | Shared pipeline |
| Ch. 8 | :warning: | Same as Pipeline 1 — no chi-square/ANOVA |
| Ch. 9 | :white_check_mark: | OLS with standardized coefficients, correct interpretation |
| Ch. 10 | :white_check_mark: | Full diagnostics: VIF, Shapiro-Wilk, Breusch-Pagan, residual plots, Q-Q |
| Ch. 11 | :white_check_mark: | Train/test split, sklearn pipeline for CV |
| Ch. 12 | :white_check_mark: | Decision tree as sanity check |
| Ch. 14 | N/A | Correctly justified as unnecessary for explanatory work |
| Ch. 15 | :white_check_mark: | Cross-validation, diagnostics |
| Ch. 16 | :white_check_mark: | VIF-based pruning — appropriate for explanatory |
| Ch. 17 | :warning: | Artifacts saved but deployment integration details sparse |

### Strengths
- **Best causal analysis across all notebooks.** The courses_completed paradox discussion, confounding analysis, and "defensible vs non-defensible claims" framework are exactly what the rubric asks for.
- **VIF-based feature selection** is the right approach for explanatory modeling — shows understanding of why RFECV is inappropriate here.
- **OLS assumption checking** is thorough: normality, homoscedasticity, multicollinearity all verified with formal tests.
- **Honest about logistic regression failure** — explains why singularity occurs rather than hiding the error.

### Critical Issues (Must Fix)
1. **Deployment notes need more specifics.** Add references to specific API endpoints or dashboard components where the org-level insight is displayed.

### Recommended Improvements
1. Consider a **partial regression plot** (added variable plot) for key coefficients to visualize the relationship controlling for other variables.
2. Add a **sensitivity analysis**: how do results change if you include/exclude borderline VIF features?
3. Add chi-square or ANOVA tests for categorical features in exploration.

---

## Pipeline 3 — Donor Churn

**Pipeline:** donor_churn
**Business Problem:** Predict which monetary donors are at risk of becoming inactive, and explain what factors drive churn.
**Approach:** Both (Predictive primary + Explanatory companion)

### Checklist Results

#### 1. Problem Framing (Ch. 1)
:white_check_mark: **Complete**
- Clear business question with WHO (fundraising team, leadership) and WHY (financial sustainability)
- **Hybrid approach**: deterministic rule tiers + ML probability + explanatory companion — innovative
- Explicit error cost discussion: false negatives (missed churners) are costlier than false alarms
- States metrics: ROC-AUC, Recall, F1
- Notes dataset limitation (n=57, ~25% churn rate)
- Justifies tuning toward **recall** based on error cost analysis

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2–8)
:white_check_mark: **Complete**
- Uses shared ETL module (`donor_churn.etl.build_training_frame()`)
- Target distribution visualized (Cell 3)
- Feature distributions by churn status with 6 key features (Cell 4)
- Correlation heatmap (Cell 5)
- **Mann-Whitney U tests** for significance testing (Cell 6) — excellent non-parametric choice for small n
- Box plots for most significant features (Cell 6)
- Statistical test results formatted with significance stars

#### 3. Modeling & Feature Selection (Ch. 9–14, 16)
:white_check_mark: **Complete**
- **9 model families** compared with GridSearchCV (Cell 10): Logistic Regression, Decision Tree, KNN, SVM, Naive Bayes, Random Forest, Gradient Boosting, AdaBoost, Extra Trees
- Stacking ensemble from top 3 (Ch. 14)
- **Iterative PFI feature selection** (Cell 14) — same principled approach as Pipeline 1
- Learning curves shown (Cell 11)
- **Threshold analysis** with precision-recall-F1 curves (Cell 12) — explicitly selects recall-favoring threshold of 0.4
- `class_weight="balanced"` used in appropriate models — handles class imbalance

#### 4. Evaluation & Interpretation (Ch. 15)
:white_check_mark: **Complete**
- ROC-AUC, Recall, F1, Accuracy reported at chosen threshold
- Classification report and confusion matrix
- Threshold analysis across multiple cutoffs (0.3, 0.35, 0.4, 0.45, 0.5)
- Business interpretation (Cell 15): explains why metrics should be treated as directional with n=12 test set
- Explains how hybrid approach mitigates ML limitations

#### 5. Causal and Relationship Analysis
:white_check_mark: **Complete**
- Two-model analysis: PFI from predictive model + coefficients from explanatory model (Cell 19)
- **Odds ratios** from logistic regression with confidence intervals
- Identifies actionable vs non-actionable relationships
- Discusses **reverse causality** risk (low frequency as symptom vs cause)
- Separates "likely causal" (outreach, campaigns) from "likely correlational" (acquisition channel)
- Honest about what cannot be claimed

#### 6. Deployment Notes (Ch. 17)
:white_check_mark: **Complete**
- Model artifacts saved (Cell 21)
- References nightly inference job and output format
- Describes hybrid output: ML score + rule tier per donor
- Notes retraining cadence and monitoring recommendations

#### 7. General Quality
:white_check_mark: **Complete**
- Executable top-to-bottom
- Shared ETL module
- RANDOM_STATE = 42
- Good narrative throughout
- No target leakage

### Chapter Coverage Gaps

| Chapter | Status | Notes |
|---------|--------|-------|
| Ch. 1 | :white_check_mark: | Excellent hybrid framing |
| Ch. 6 | :white_check_mark: | Mann-Whitney U is a nice touch |
| Ch. 7 | :white_check_mark: | ETL pipeline |
| Ch. 8 | :white_check_mark: | Statistical tests + box plots cover relationship discovery |
| Ch. 9-10 | :white_check_mark: | Logistic regression with VIF, assumption checking (Box-Tidwell) |
| Ch. 12 | :white_check_mark: | Decision tree in comparison |
| Ch. 13 | :white_check_mark: | Full classification metrics |
| Ch. 14 | :white_check_mark: | Stacking + ensemble methods |
| Ch. 15 | :white_check_mark: | GridSearchCV, learning curves, threshold analysis |
| Ch. 16 | :white_check_mark: | PFI iterative selection + VIF for explanatory |
| Ch. 17 | :white_check_mark: | Artifacts saved, inference referenced |

### Strengths
- **Hybrid approach** (rules + ML + explanatory) is sophisticated and well-justified for the small dataset.
- **Dual model strategy** (predictive + explanatory companion) directly addresses the INTEX requirement for both approaches.
- **Box-Tidwell linearity check** (Cell 18) for logistic regression assumptions — goes beyond typical student work.
- **Threshold analysis** with precision-recall curves operationalizes the error cost discussion from problem framing.
- **Mann-Whitney U tests** are the correct non-parametric choice for small samples.

### Critical Issues (Must Fix)
None — this is the most complete notebook across all dimensions.

### Recommended Improvements
1. Add **validation curves** for the best model (only learning curves currently shown).
2. Consider showing **SHAP values** for the predictive model to complement PFI.
3. The `class_weight="balanced"` is used in some models but not discussed — add a sentence explaining this choice.

---

## Pipeline 4 — Social Media Content

**Pipeline:** social_media_content
**Business Problem:** Quantify which content characteristics explain why some social media posts drive more donation referrals, producing an actionable content strategy guide.
**Approach:** Explanatory

### Checklist Results

#### 1. Problem Framing (Ch. 1)
:white_check_mark: **Complete**
- Excellent framing: "The org doesn't need a black-box score — they need to know what to post"
- **Before-post vs after-post feature distinction** (Cell 0) is a critical and well-articulated insight — shows deep understanding of target leakage risk
- Clear separation from Pipeline 4B (what to post vs when to post)
- Target variable: `donation_referrals` (continuous)
- States metrics: Adjusted R², coefficient significance
- Describes operational use: Content Strategy Guide in admin section

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2–8)
:white_check_mark: **Complete**
- Loads from Supabase via `fetch_table` (Cell 2) — n=812 posts
- Uses shared `build_features()` module (Cell 3) — modular and reusable
- Thorough exploration: resident story multiplier (7.3x), post type breakdown (45x range), media type, sentiment tone, platform breakdown (Cells 5–11)
- **After-post engagement correlations shown for EDA only** with explicit warning they are NOT used as X variables (Cell 10) — excellent discipline
- Target distribution examined including zero-inflation (35.7% zero referrals)
- Confirmed domain findings documented and validated

#### 3. Modeling & Feature Selection (Ch. 9–14, 16)
:white_check_mark: **Complete**
- **Backward elimination on OLS** (Cell 18) — appropriate for explanatory work
- Near-zero variance filter (Cell 14)
- Multicollinearity pruning with business-aware rules (Cell 16) — doesn't blindly drop, applies domain reasoning
- VIF analysis on numeric features (Cell 17) — all ≤ 10
- **OLS as primary model** (Cell 19) — correct for explanatory goal
- Logistic regression on binarized target as comparison (Cell 23)
- Decision tree regressor as comparison (Cell 24)
- Both standardized and referral-unit coefficient tables provided
- 52 features → 11 selected features after backward elimination

#### 4. Evaluation & Interpretation (Ch. 15)
:white_check_mark: **Complete**
- Test R² = 0.335, Adjusted R² = 0.286 on holdout
- MAE, RMSE reported
- **Residual diagnostics**: residuals vs fitted, histogram, Q-Q plot (Cell 27)
- VIF on final model — all ≤ 10 (Cell 28)
- 5-fold cross-validation (Cell 29)
- **Business interpretation** of each significant coefficient in plain language (Cell 30)
- Discusses what Adjusted R² of 0.29 means operationally (Cell 34)
- Notes zero-inflated target distribution and discusses hurdle model as alternative

#### 5. Causal and Relationship Analysis
:white_check_mark: **Complete**
- Plain-language content recommendations from coefficients (Cell 32)
- Separates "likely causal" (staff controls: resident story, post type, media format) from "likely correlational" (platform differences, sentiment tone)
- **Proposes a specific randomized experiment design** (Cell 33) — excellent
- Discusses why the engagement cascade matters (content → engagement → donations)
- Notes limitations honestly: observational study, cannot prove causation

#### 6. Deployment Notes (Ch. 17)
:white_check_mark: **Complete**
- Model bundle saved with both business and standardized OLS models (Cell 36)
- Metadata and metrics saved as JSON (Cells 37–38)
- Preview of ml_predictions record (Cell 39) — shows exactly what the infer job writes
- References Content Strategy Guide in admin section

#### 7. General Quality
:white_check_mark: **Complete**
- Executable top-to-bottom (all outputs present)
- Shared feature engineering module (`features.py`)
- RANDOM_STATE = 42
- Excellent narrative throughout
- **No target leakage** — after-post features explicitly excluded with documentation

### Chapter Coverage Gaps

| Chapter | Status | Notes |
|---------|--------|-------|
| Ch. 1 | :white_check_mark: | Excellent explanatory framing |
| Ch. 6 | :white_check_mark: | Thorough univariate exploration |
| Ch. 7 | :white_check_mark: | Modular feature engineering |
| Ch. 8 | :white_check_mark: | Engagement correlations, cross-tabulations |
| Ch. 9 | :white_check_mark: | OLS with standardized + business coefficients |
| Ch. 10 | :white_check_mark: | Residual plots, VIF, Q-Q |
| Ch. 11 | :white_check_mark: | Train/test split, no leakage |
| Ch. 14 | N/A | Correctly not used — explanatory goal |
| Ch. 15 | :white_check_mark: | CV, residual diagnostics |
| Ch. 16 | :white_check_mark: | Backward elimination + VIF |
| Ch. 17 | :white_check_mark: | Full artifact suite |

### Strengths
- **Before-post vs after-post feature distinction** is the most sophisticated methodological insight across all notebooks. This directly addresses target leakage (Ch. 11) while still showing the engagement cascade in EDA.
- **Business-aware multicollinearity handling** (Cell 16) — doesn't blindly drop correlated features, applies domain reasoning about which pairs represent distinct strategy levers.
- **Dual coefficient tables** (standardized for comparison + referral-unit for business interpretation) serve different audiences.
- **Proposed randomized experiment** in causal analysis is exactly what a TA wants to see.
- **Zero-inflation discussion** shows awareness of model limitations.

### Critical Issues (Must Fix)
None — this is the strongest explanatory notebook.

### Recommended Improvements
1. Add **Breusch-Pagan formal test** for homoscedasticity (residual plots are shown but no formal test).
2. Consider a **Shapiro-Wilk test** on residuals (or note that it's overpowered at n=812).
3. The Decision Tree comparison (R² = 0.018) is very poor — add a sentence explaining why (tree overfits/underfits with these feature types).

---

## Pipeline 4B — Social Media Timing

**Pipeline:** social_media_timing
**Business Problem:** Predict engagement rate from timing and format features to determine optimal posting schedule.
**Approach:** Predictive (with OLS explanatory companion)

### Checklist Results

#### 1. Problem Framing (Ch. 1)
:white_check_mark: **Complete**
- Clear business question: when to post to maximize engagement
- WHO: social media/marketing team
- States predictive approach with explanatory companion
- Target: `engagement_rate` (continuous) — justified over `donation_referrals`
- Error cost discussion: overprediction (wasted opportunity) vs underprediction (lost reach)
- Explicit separation from Pipeline 4

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2–8)
:white_check_mark: **Complete**
- Uses shared ETL module (`social_media_timing.etl.build_training_frame()`)
- n=812 posts, 30 features
- Exploration: post hour vs engagement rate, weekend vs weekday, engagement by day of week, platform comparison (Cell 7)
- Correlation analysis for post_hour

#### 3. Modeling & Feature Selection (Ch. 9–14, 16)
:white_check_mark: **Complete**
- **9 model families** compared: LinearRegression, DecisionTree, KNN, SVR, RandomForest, GradientBoosting, AdaBoost, ExtraTrees, Stacking (Cell 11)
- GridSearchCV tuning for top 3 models
- **Iterative PFI feature selection** (Cell 13) — same principled approach as other pipelines, with 5% MAE degradation threshold
- Stacking ensemble included (Ch. 14)
- Feature importance visualized

#### 4. Evaluation & Interpretation (Ch. 15)
:white_check_mark: **Complete**
- Test MAE, RMSE, R² reported (Cell 15)
- Business interpretation: "off by X engagement points on average", "error as % of mean"
- Feature importance chart
- **Residual diagnostics**: residuals vs fitted, histogram, Q-Q plot (Cell 15)
- Cross-validation in model comparison

#### 5. Causal and Relationship Analysis
:white_check_mark: **Complete**
- Discusses post_hour as strongest timing signal (~50-60% importance)
- Separates "likely causal" (post timing is genuinely actionable) from "likely correlational" (weekend effect may reflect content differences)
- Notes R² meaning operationally (~47% of variance explained by timing)
- Discusses model's primary use: generating platform × day × hour recommendation matrix

#### 6. Deployment Notes (Ch. 17)
:white_check_mark: **Complete**
- Model bundle saved with feature list
- Metadata and metrics saved
- References inference job for recommendation matrix
- Clear separation of artifacts from Pipeline 4

#### 7. General Quality
:white_check_mark: **Complete**
- Executable top-to-bottom
- Shared ETL module
- RANDOM_STATE = 42
- Good narrative
- No target leakage

### Chapter Coverage Gaps

| Chapter | Status | Notes |
|---------|--------|-------|
| Ch. 1 | :white_check_mark: | Clear predictive framing |
| Ch. 6 | :white_check_mark: | Timing distributions explored |
| Ch. 7 | :white_check_mark: | ETL pipeline |
| Ch. 8 | :warning: | Limited relationship discovery — mostly univariate, no interaction analysis (e.g., platform × hour) |
| Ch. 9 | :white_check_mark: | OLS companion model |
| Ch. 10 | :white_check_mark: | OLS assumption checks (Shapiro-Wilk, Breusch-Pagan) |
| Ch. 11 | :white_check_mark: | Train/test split |
| Ch. 12 | :white_check_mark: | Decision tree in comparison |
| Ch. 14 | :white_check_mark: | Stacking ensemble |
| Ch. 15 | :white_check_mark: | GridSearchCV, cross-validation |
| Ch. 16 | :white_check_mark: | PFI iterative selection |
| Ch. 17 | :white_check_mark: | Artifacts saved |

### Strengths
- **Clear target variable justification** — explains why `engagement_rate` over `donation_referrals` for timing analysis.
- **OLS companion model** with formal assumption checks adds explanatory depth.
- **Business-actionable output**: platform × day × hour recommendation matrix.
- **Iterative PFI** with MAE-based stopping criterion appropriate for regression.

### Critical Issues (Must Fix)
None.

### Recommended Improvements
1. Add **interaction analysis** in exploration: does the optimal hour differ by platform? A simple heatmap of mean engagement by platform × hour would demonstrate Ch. 8 relationship discovery.
2. Show **learning curves** for the best model (referenced but not visualized in the notebook outputs I reviewed).
3. Add a **concrete recommendation table** in the notebook itself (top 3 posting windows per platform).

---

## Pipeline 5 — Incident Early Warning

**Pipeline:** incident_early_warning
**Business Problem:** At intake, predict which newly admitted residents are at elevated risk of self-harm or runaway attempts.
**Approach:** Predictive (with Explanatory companion)

### Checklist Results

#### 1. Problem Framing (Ch. 1)
:white_check_mark: **Complete**
- Highest-stakes prediction in the system — explicitly acknowledged (Cell 0)
- **Dual targets**: self-harm risk and runaway risk — two separate classifiers
- Error cost discussion is the most compelling across all notebooks: "a missed self-harm warning for a vulnerable minor could have catastrophic consequences"
- Justifies recall-favoring threshold (0.35)
- **Constraint clearly stated**: models must work at the moment of admission (intake-only features)
- Notes dataset limitation (~60 residents, ~12 self-harm, ~17 runaway events)

#### 2. Data Acquisition, Preparation & Exploration (Ch. 2–8)
:white_check_mark: **Complete**
- Uses shared ETL module
- Target distributions for both self-harm and runaway (Cell 4)
- Feature distributions by self-harm status (Cell 5)
- Correlation heatmap with both targets (Cell 6)
- **Risk factor analysis** (Cell 7): self-harm rates and runaway rates by every binary intake feature — thorough and domain-informed
- Documents confirmed domain findings (100% of Critical/High risk residents have incidents, 67% self-harm rate for sexual abuse survivors, 64% runaway rate for trafficked residents)

#### 3. Modeling & Feature Selection (Ch. 9–14, 16)
:white_check_mark: **Complete**
- 4 model families compared per target: LogReg, DecisionTree, RandomForest, GradientBoosting (Cell 11)
- GridSearchCV with stratified 5-fold CV
- **Separate PFI loops per target** (Cell 14) — each target gets its own optimal feature set
- Cross-validation and learning curves (Cell 12)
- `class_weight="balanced"` used — appropriate for imbalanced targets
- Threshold set at 0.35 to maximize recall

#### 4. Evaluation & Interpretation (Ch. 15)
:white_check_mark: **Complete**
- Recall, Precision, F1, ROC-AUC reported for both targets at chosen threshold
- Classification reports and confusion matrices
- Learning curves shown (Cell 12)
- Cross-validation scores per target
- Honest assessment of test set limitations (12 samples, 2-4 positive cases)
- PFI bar charts for final feature sets (Cell 15)

#### 5. Causal and Relationship Analysis
:white_check_mark: **Complete**
- Domain-informed interpretation of key risk factors (Cell 18)
- **Sexual abuse → self-harm pathway**: cites clinical research
- **Trafficking → runaway pathway**: explains conditioning/external pressure mechanism
- Temporal ordering argument: intake features precede incidents, strengthening directional claims
- **Ethical considerations** discussed: false negatives unacceptable, model should inform not replace clinical judgment, avoid deterministic labeling
- Separates causal pathways from correlational-only relationships

#### 6. Deployment Notes (Ch. 17)
:white_check_mark: **Complete**
- Two models saved as combined bundle (Cell 20)
- Intake-only features noted — can score at admission
- Score labels defined (Critical/High/Medium/Low)
- References nightly inference, two rows per resident
- Staff integration described: risk scores on resident dashboard

#### 7. General Quality
:white_check_mark: **Complete**
- Executable top-to-bottom
- Shared ETL module
- RANDOM_STATE = 42
- Good narrative
- **No target leakage** — intake-only features explicitly enforced
- Separate feature sets per target properly handled

### Chapter Coverage Gaps

| Chapter | Status | Notes |
|---------|--------|-------|
| Ch. 1 | :white_check_mark: | Strongest error-cost analysis |
| Ch. 6 | :white_check_mark: | Risk factor tables excellent |
| Ch. 7 | :white_check_mark: | ETL pipeline |
| Ch. 8 | :white_check_mark: | Binary feature cross-tabs are Ch. 8 relationship discovery |
| Ch. 9-10 | :white_check_mark: | Explanatory companion with VIF, assumption checking |
| Ch. 12 | :white_check_mark: | Decision tree in comparison |
| Ch. 13 | :white_check_mark: | Full classification metrics |
| Ch. 14 | :white_check_mark: | Random Forest, Gradient Boosting |
| Ch. 15 | :white_check_mark: | GridSearchCV, learning curves |
| Ch. 16 | :white_check_mark: | Separate PFI per target |
| Ch. 17 | :white_check_mark: | Dual model bundle |

### Strengths
- **Ethical framing** is outstanding — discusses deterministic labeling risk, clinical judgment, and false negative consequences.
- **Dual target architecture** with separate PFI loops is well-designed.
- **Intake-only constraint** shows understanding of deployment reality and avoids leakage.
- **Domain-informed exploration** with risk factor tables (Cell 7) demonstrates genuine engagement with the data.
- **Explanatory companion model** with EPV-aware feature limits shows statistical maturity.

### Critical Issues (Must Fix)
1. **Missing ensemble methods.** The model comparison uses only 4 families — fewer than other notebooks. Consider adding AdaBoost, Extra Trees, or Stacking. The requirements mention ensemble methods (Ch. 14) should be "considered or justified as unnecessary." Add at least a sentence justifying why simpler models are preferred given the very small positive class sizes.

### Recommended Improvements
1. Add a **precision-recall trade-off curve** for the chosen threshold, similar to Pipeline 3's threshold analysis.
2. Consider **LOOCV** given n=60 (Pipeline 1 demonstrates this).
3. Add **validation curves** for the best model's key hyperparameter.

---

## Cross-Pipeline Summary

### Overall Grade by Section

| Section | P1 Readiness | P2 Drivers | P3 Churn | P4 Content | P4B Timing | P5 Incident |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| Problem Framing | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Data Prep & EDA | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Modeling & Features | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Evaluation | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Causal Analysis | :warning: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Deployment | :white_check_mark: | :warning: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| General Quality | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |

### What This Team Does Exceptionally Well

1. **Pipeline thinking is consistent.** Every notebook follows the full lifecycle from framing through deployment. No notebook stops at "I ran a model."

2. **Prediction vs explanation distinction is deeply understood.** Pipelines 1/3/4B/5 are predictive with explanatory companions; Pipelines 2/4 are explanatory with predictive comparisons. The feature selection strategy, evaluation metrics, and model choices change appropriately based on the goal.

3. **Iterative PFI feature selection** is a team-wide pattern that goes well beyond textbook requirements. The approach (compute PFI on test set → drop bottom 20% → retrain ALL models → check AUC tolerance → repeat) is principled and well-implemented.

4. **Shared ETL modules** prevent code duplication. Pipelines 1 and 2 share the same `build_training_frame()`. Each pipeline has its own `etl.py`, `artifacts.py`, and `features.py` modules, making the code production-ready.

5. **Target leakage awareness** is excellent across all notebooks. Pipeline 4's before-post/after-post distinction is particularly impressive. Pipeline 5's intake-only constraint is well-enforced.

6. **Error cost discussions** are contextualized to the nonprofit domain, not generic. Pipeline 5's ethical framing is outstanding.

7. **Honesty about limitations** — small sample sizes, CV vs holdout divergence, observational vs causal claims. The team consistently acknowledges what the data can and cannot tell them.

### Cross-Pipeline Weaknesses (Address These)

1. **Ch. 8 relationship discovery is uneven.** Pipelines 1 and 2 lack chi-square or ANOVA tests for categorical-target relationships. Pipeline 3 uses Mann-Whitney U (good), Pipeline 4 uses cross-tabulations (good), Pipeline 5 uses binary risk factor tables (good). Add at least chi-square tests to Pipelines 1 and 2.

2. **Deployment specifics vary.** Pipeline 2 is the weakest on deployment — just says "nightly infer job" without referencing specific API endpoints or dashboard components. All notebooks would benefit from a concrete reference like "the model powers the `/api/ml/predict/reintegration-readiness` endpoint, displayed on the Resident Dashboard at `/admin/residents/:id`."

3. **No notebook discusses data quality / data drift monitoring.** For a deployed system, the team should mention how they would detect when retraining is needed. Even one sentence per notebook about monitoring model performance over time would show Ch. 17 deployment maturity.

### Textbook Chapter Coverage Summary

| Chapter | Concept | Coverage |
|---------|---------|----------|
| Ch. 1 | CRISP-DM / Pipeline Thinking | :white_check_mark: All 6 notebooks |
| Ch. 5 | Data Acquisition | :white_check_mark: All 6 notebooks |
| Ch. 6 | Automated Exploration | :white_check_mark: All 6 notebooks |
| Ch. 7 | Data Prep Pipelines | :white_check_mark: Shared ETL modules |
| Ch. 8 | Relationship Discovery | :warning: Good in 4/6, needs chi-square/ANOVA in P1/P2 |
| Ch. 9 | MLR Concepts | :white_check_mark: OLS in P2, P4, P4B |
| Ch. 10 | MLR Diagnostics | :white_check_mark: VIF, residual plots, Shapiro-Wilk, Breusch-Pagan |
| Ch. 11 | MLR for Prediction | :white_check_mark: No leakage, sklearn pipelines |
| Ch. 12 | Decision Trees | :white_check_mark: Included in all comparisons |
| Ch. 13 | Classification | :white_check_mark: P1, P3, P5 with full metrics |
| Ch. 14 | Ensemble Methods | :white_check_mark: Stacking, RF, GBM, AdaBoost, ExtraTrees |
| Ch. 15 | Evaluation & Tuning | :white_check_mark: GridSearchCV, CV, learning curves |
| Ch. 16 | Feature Selection | :white_check_mark: PFI, VIF, backward elimination |
| Ch. 17 | Deployment | :white_check_mark: Artifacts saved, inference referenced |

### Priority Actions (Ranked by Impact)

1. **Pipeline 1 — Expand causal analysis** (Section 5). Add 2-3 paragraphs discussing specific feature relationships and their theoretical sense. Currently defers too much to Pipeline 2.

2. **Pipeline 2 — Add deployment details** (Section 6). Reference specific API endpoints or dashboard components.

3. **Pipelines 1 & 2 — Add chi-square/ANOVA tests** in exploration to strengthen Ch. 8 coverage.

4. **Pipeline 5 — Justify limited model families** or add 1-2 more ensemble methods.

5. **All notebooks — Add one sentence about model monitoring/drift detection** in deployment notes.

### Final Assessment

This is a **strong submission**. The team demonstrates genuine understanding of the prediction vs explanation distinction, builds complete pipelines from framing through deployment, uses principled feature selection, and engages honestly with limitations. The shared ETL architecture and consistent methodological patterns (iterative PFI, assumption checking, error cost analysis) show maturity well beyond typical student work.

The critical gaps are minor and fixable: Pipeline 1's thin causal analysis, Pipeline 2's sparse deployment notes, and a few missing statistical tests. None of these represent fundamental misunderstandings — they are areas where good work could be made excellent.

**Estimated score impact of addressing the priority actions above: +1-2 points out of 20.**

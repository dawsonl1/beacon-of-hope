# Pipeline 4B — Social Media Timing Optimizer

## Files
- **Notebook:** `ml-pipelines/social-media-timing-optimizer.ipynb`
- **ETL:** `ml-scripts/jobs/etl_social_timing.py`
- **Infer:** `ml-scripts/jobs/infer_social_timing.py`
- **Features:** `ml-scripts/features/social_timing_features.py`
- **Model:** `models/social-media-timing.sav`

---

## Overview

| | |
|---|---|
| **Type** | Predictive |
| **Goal** | Predict engagement rate for any platform + day + hour combination so staff know the best time to post |
| **Target variable** | `engagement_rate` (continuous) |
| **Primary metric** | MAE, RMSE, R² |
| **Writes to** | `ml_predictions` + `ml_prediction_history` (pre-computed timing matrix) |

---

## Problem Framing

**Business question:** Given the platform, day of week, and time of day, what engagement rate can we expect — and what combination maximizes reach?

**Why predictive:** The org doesn't need to understand why 10am on WhatsApp outperforms 3pm. They just need to know when to post. Gradient Boosting captures non-linear interactions between platform and hour that OLS cannot.

**Why engagement_rate and not donation_referrals:** Engagement rate is always measured by the platform regardless of donation tracking infrastructure. It is a clean, always-available outcome. As the org builds better UTM attribution, this model can be retrained with referrals as the target. For now, engagement rate is the right target.

**Why this is different from Pipeline 4:** Pipeline 4 answers "what to post" using before-post content features and OLS for interpretability. This pipeline answers "when and where to post" using timing and format features and an ensemble model for accuracy. Different question, different features, different algorithm.

**Key finding:** `post_hour` alone explains 19.7% of variance in engagement (r=0.444). It is the dominant feature by far (57% of Gradient Boosting feature importance). Platform and sentiment tone are secondary.

---

## Data Sources

| Table | Purpose |
|---|---|
| `social_media_posts` | All post timing, platform, format, and engagement data |

Same table as Pipeline 4. No joins required.

---

## Features to Engineer

**X variables — timing and format (before-post only):**
- `platform` — one-hot encode
- `post_hour` — numeric (0–23)
- `day_of_week` — one-hot encode
- `media_type` — one-hot encode
- `is_boosted` — boolean, cast to int
- `boost_budget_php` — numeric, fill null with 0
- `has_call_to_action` — boolean, cast to int
- `post_type` — one-hot encode
- `is_weekend` — engineered: True if day_of_week is Saturday or Sunday

**Note:** Do NOT include content features like `sentiment_tone`, `features_resident_story`, or `content_topic` as primary features here. This pipeline deliberately separates timing/format from content decisions. Staff use Pipeline 4 for content guidance and this pipeline for timing guidance.

**Target variable:**
- `engagement_rate` — numeric, cast to float

---

## Notebook Instructions

Follow the full Ch. 1–16 textbook pipeline.

**Sections in order:**
1. Problem Framing — explicitly explain why engagement_rate not donation_referrals. Explain separation from Pipeline 4.
2. Data Acquisition and Preparation
3. Exploration
4. Feature Selection
5. Modeling
6. Evaluation and Model Selection
7. Causal and Relationship Analysis
8. Deployment Notes

**Exploration — document these confirmed findings:**
- `post_hour` vs `engagement_rate`: r=0.444 — dominant signal
- Best platform + hour combos by donation referrals: WhatsApp 10am (87.0 avg), WhatsApp 6pm (82.2), YouTube 5pm (74.8), TikTok 11pm (55.0)
- Best days by engagement: Saturday (0.1057), Friday (0.1046), Sunday (0.1029)
- Best platform + day combos: WhatsApp Tuesday (42.5 avg referrals), YouTube Tuesday (35.7), TikTok Friday (33.4)
- Confirmed feature importances from Gradient Boosting: post_hour (57%), sentiment_tone (26%), platform (6%), has_call_to_action (5%)

**Feature selection — follow Ch. 16:**
- Variance threshold filter
- Univariate ranking
- RFECV with primary model
- Permutation importance
- Document final feature set and justify

**Modeling — train and compare ALL of the following (Ch. 9–14):**
- Linear Regression (baseline)
- Decision Tree Regressor
- K-Nearest Neighbors Regressor
- Support Vector Regressor
- Random Forest Regressor
- Gradient Boosting Regressor
- AdaBoost Regressor
- Extra Trees Regressor
- Stacking Regressor

Use 5-fold cross-validation throughout. Tune hyperparameters with GridSearchCV or RandomizedSearchCV. Primary metrics: MAE and R².

**Evaluation — follow Ch. 15:**
- Learning curves and validation curves for top models
- Head-to-head comparison table: every model, CV MAE mean ± std and R² mean ± std
- Final test set: MAE, RMSE, R²
- Business interpretation: "Our predictions are off by X engagement rate points on average. Since mean engagement is 0.100, this is within Y% of the actual outcome."

**Saving artifacts — follow Ch. 17:**
- Save to `models/social-media-timing.sav`
- Save `models/social-media-timing-metadata.json`
- Save `models/social-media-timing-metrics.json`

---

## ETL Job Instructions (`etl_social_timing.py`)

Import from `config.py`, `utils_db.py`, and `social_timing_features.py`.

1. Fetch `social_media_posts` table
2. Cast numeric columns
3. Engineer `is_weekend`
4. One-hot encode categorical features
5. Return clean modeling-ready DataFrame

---

## Infer Job Instructions (`infer_social_timing.py`)

This pipeline pre-computes a full recommendation matrix rather than scoring individual posts.

1. Load `models/social-media-timing.sav`
2. Generate all combinations of platform × day_of_week × post_hour (7 × 7 × 24 = 1,176 rows)
3. Run all combinations through the model
4. For each platform, rank combinations by predicted engagement rate
5. Call `write_predictions()` — one row per platform × day × hour combination

The frontend queries this matrix when staff select a platform and gets back the top 3 recommended times.

---

## What Gets Written to `ml_predictions`

One row per platform × day × hour combination (1,176 rows total).

```
entity_type:   "platform_timing"
entity_id:     null
model_name:    "social-media-timing"
model_version: training date
score:         predicted engagement rate (e.g. 0.142)
score_label:   "WhatsApp_Tuesday_10"
predicted_at:  current UTC timestamp
metadata: {
    platform: "WhatsApp",
    day: "Tuesday",
    hour: 10,
    predicted_engagement_rate: 0.142,
    rank_within_platform: 1
}
```

---

## Website Integration

**Admin social media section — "Best Time to Post" tool:**
Staff select a platform and optionally a post type. Frontend calls `.NET` endpoint which queries `ml_predictions WHERE model_name='social-media-timing' AND metadata->>'platform' = 'WhatsApp' ORDER BY score DESC LIMIT 3`. Returns top 3 recommended times with predicted engagement.

**Used alongside Pipeline 4:** Staff use Pipeline 4's Content Guide to decide what to post. They use this tool to decide when and where to post it. The Caption Scorer (AI Feature 1) sits between them — staff compose their caption, score it, then get timing recommendations.

---

## Confirmed Numbers From the Data

| Fact | Value |
|---|---|
| Total posts | 812 |
| post_hour vs engagement_rate | r=0.444 |
| post_hour feature importance (Gradient Boosting) | 57% |
| WhatsApp Tuesday 10am avg referrals | 87.0 |
| WhatsApp Friday 6pm avg referrals | 82.2 |
| YouTube Tuesday avg referrals | 35.7 |
| TikTok Friday avg referrals | 33.4 |
| Best day overall (engagement) | Saturday (0.1057) |
| Gradient Boosting R² on engagement | 0.836 |

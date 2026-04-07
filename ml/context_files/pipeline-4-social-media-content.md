# Pipeline 4 — Social Media Content Strategy Explainer

## Files
- **Notebook:** `ml-pipelines/social-media-content-strategy.ipynb`
- **ETL:** `ml-scripts/jobs/etl_social_content.py`
- **Infer:** `ml-scripts/jobs/infer_social_content.py`
- **Features:** `ml-scripts/features/social_content_features.py`
- **Model:** `models/social-media-content.sav`

---

## Overview

| | |
|---|---|
| **Type** | Explanatory |
| **Goal** | Quantify which content characteristics explain why some posts drive more donation referrals |
| **Target variable** | `donation_referrals` (continuous) |
| **Primary metric** | Adjusted R², coefficient significance |
| **Writes to** | `ml_predictions` + `ml_prediction_history` (org-level insight row) |

---

## Problem Framing

**Business question:** What characteristics of a social media post explain why it drives donations? Give the org interpretable coefficients they can use as a permanent content strategy guide.

**Why explanatory:** The org doesn't need a black-box score — they need to know what to post. Coefficients like "ImpactStory posts generate 28 more referrals than ThankYou posts" are sentences a non-technical director can act on. This is strategy, not prediction.

**Why this is different from Pipeline 4B:** This pipeline answers "what to post." Pipeline 4B answers "when and where to post." Different questions, different features, different algorithms, different outputs.

**Critical distinction — before-post vs after-post features:**
- Before-post features are things staff decide before publishing — platform, post type, content type, tone, timing, format. These are the only features used as X variables.
- After-post features are engagement metrics measured after publishing — shares, likes, impressions. These are NOT used as X variables in this pipeline. They appear in EDA to illustrate the engagement → donation cascade, but they cannot be used to predict future posts.

**What the org does with this:** Results are published as a "Content Strategy Guide" in the admin social media section. Updated as new posts are logged. Also used on the public impact page and donor page.

---

## Data Sources

| Table | Purpose |
|---|---|
| `social_media_posts` | All post characteristics, engagement metrics, and donation referrals |

812 posts across 7 platforms. All features needed are in this one table. No joins required.

---

## Features to Engineer

**Before-post features (X variables — what staff control):**
- `platform` — one-hot encode: Facebook, Instagram, Twitter, TikTok, LinkedIn, YouTube, WhatsApp
- `post_type` — one-hot encode: ImpactStory, FundraisingAppeal, Campaign, EventPromotion, EducationalContent, ThankYou
- `media_type` — one-hot encode: Photo, Video, Carousel, Text, Reel
- `sentiment_tone` — one-hot encode: Emotional, Urgent, Celebratory, Hopeful, Informative, Grateful
- `content_topic` — one-hot encode: Health, SafehouseLife, Reintegration, AwarenessRaising, Gratitude, CampaignLaunch, Education, DonorImpact, EventRecap
- `features_resident_story` — boolean, cast to int
- `has_call_to_action` — boolean, cast to int
- `call_to_action_type` — one-hot encode (fill null with 'None')
- `is_boosted` — boolean, cast to int
- `boost_budget_php` — numeric, fill null with 0
- `caption_length` — numeric
- `num_hashtags` — numeric
- `post_hour` — numeric
- `day_of_week` — one-hot encode

**Target variable:**
- `donation_referrals` — numeric, cast to float

**After-post features (do NOT use as X — only for EDA):**
- `shares`, `likes`, `comments`, `saves`, `impressions`, `reach`, `engagement_rate`

---

## Notebook Instructions

Follow the full Ch. 1–16 textbook pipeline.

**Sections in order:**
1. Problem Framing — explicitly discuss prediction vs explanation distinction. Explain before-post vs after-post feature distinction.
2. Data Acquisition and Preparation
3. Exploration
4. Feature Selection
5. Modeling
6. Evaluation and Model Selection
7. Causal and Relationship Analysis — centerpiece of this pipeline
8. Deployment Notes

**Exploration — document these confirmed findings:**
- `features_resident_story = True` averages 41.0 referrals vs 5.6 without — 7x difference
- ImpactStory posts average 36.4 referrals vs ThankYou at 0.8 — 45x range
- Reel averages 19.7 referrals vs Text at 7.0
- Emotional tone averages 18.1 referrals vs Grateful at 7.6
- WhatsApp averages 23.1 referrals, LinkedIn averages 4.3
- After-post: shares r=0.727 with referrals — strongest signal in the dataset (but cannot use as X)
- Show the engagement → donation cascade: content decisions → engagement → donations

**Feature selection — follow Ch. 16, causal paradigm:**
- Remove near-zero variance features
- Check for multicollinearity between one-hot columns (some post_type and sentiment combinations may overlap)
- VIF analysis on numeric features
- Backward elimination on OLS — remove insignificant features (p > 0.05) iteratively
- Goal: 8–15 significant features with defensible coefficients

**Modeling — Ch. 9–11 linear models are primary for explanation:**

Primary model: OLS Multiple Linear Regression (statsmodels) with standardized coefficients.

Also run:
- Logistic Regression on a binarized target (`donation_referrals > 0`) for comparison
- Decision Tree for comparison — shows non-linear patterns
- Do NOT use ensemble methods as primary — they cannot serve the explanatory goal

Standardize all numeric features before fitting OLS so coefficients are comparable in magnitude across features.

**Evaluation — Ch. 15 adjusted for explanatory goal:**
- Adjusted R² on test set
- Coefficient table: feature, standardized coefficient, p-value, 95% confidence interval
- Residual diagnostics (Ch. 10): normality, homoscedasticity, linearity
- VIF check on final model
- Business interpretation of each significant coefficient in plain language

**Causal and Relationship Analysis:**
- Translate every significant coefficient into a plain-language content recommendation
- Discuss which relationships are likely causal vs correlational
- Example honest caveat: "We cannot prove that switching to ImpactStory format causes more donations — but the 45x difference in average referrals is large enough that the recommendation is defensible"
- What would a randomized experiment look like to prove causality here?

**Saving artifacts — follow Ch. 17:**
- Save to `models/social-media-content.sav`
- Save `models/social-media-content-metadata.json`
- Save `models/social-media-content-metrics.json`

---

## ETL Job Instructions (`etl_social_content.py`)

Import from `config.py`, `utils_db.py`, and `social_content_features.py`.

1. Fetch `social_media_posts` table
2. Cast numeric columns
3. Fill nulls
4. One-hot encode categorical features
5. Return clean modeling-ready DataFrame

---

## Infer Job Instructions (`infer_social_content.py`)

This pipeline produces an org-level insight, not per-post scores.

1. Load `models/social-media-content.sav`
2. Extract significant coefficients from the trained model
3. Format as plain-language findings
4. Call `write_predictions()` with a single org-level record

---

## What Gets Written to `ml_predictions`

```
entity_type:   "org_insight"
entity_id:     null
model_name:    "social-media-content"
model_version: training date
score:         null
score_label:   "content_strategy"
predicted_at:  current UTC timestamp
metadata: {
    top_findings: [
        { feature: "features_resident_story", effect: 35.4, label: "Featuring a resident story adds ~35 referrals" },
        { feature: "post_type_ImpactStory", effect: 28.1, label: "ImpactStory posts add ~28 referrals vs ThankYou" },
        { feature: "sentiment_tone_Emotional", effect: 11.3, label: "Emotional tone adds ~11 referrals vs Informative" },
        { feature: "media_type_Reel", effect: 8.7, label: "Reels add ~9 referrals vs Text" },
        { feature: "platform_WhatsApp", effect: 12.4, label: "WhatsApp generates ~12 more referrals than LinkedIn" }
    ],
    adjusted_r2: 0.61,
    n_observations: 812
}
```

---

## Confirmed Numbers From the Data

| Fact | Value |
|---|---|
| Total posts | 812 |
| Posts with referrals > 0 | 522 (64.3%) |
| features_resident_story True avg referrals | 41.0 |
| features_resident_story False avg referrals | 5.6 |
| ImpactStory avg referrals | 36.4 |
| ThankYou avg referrals | 0.8 |
| Reel avg referrals | 19.7 |
| Text avg referrals | 7.0 |
| Emotional tone avg referrals | 18.1 |
| Grateful tone avg referrals | 7.6 |
| WhatsApp avg referrals | 23.1 |
| LinkedIn avg referrals | 4.3 |
| Shares vs referrals correlation | r=0.727 |

## Social Media Content Strategy Pipeline (Explanatory Model)

This pipeline does **not** produce per-post scores.
It produces **one org-level explanatory insight** row showing which before-post content characteristics are most associated with donation referrals.

### 1) File structure (what each file does)

```text
ml/
  config.py
  utils_db.py
  run_predictions.py
  social_media_content/
    features.py
    etl.py
    artifacts.py
    infer.py
    notebook.ipynb
models/
  social-media-content/
    model.sav
    model.json
supabase/
  migrations/
    20260407120000_add_ml_predictions.sql
```

- `ml/social_media_content/features.py`: builds before-post feature matrix from raw `social_media_posts` data.
- `ml/social_media_content/etl.py`: fetches `social_media_posts` from Supabase and delegates to `features.py` to produce a modelling-ready frame.
- `ml/social_media_content/notebook.ipynb`: trains the explanatory model (OLS flow), saves artifacts.
- `ml/social_media_content/artifacts.py`: saves/loads model bundle + run metadata.
- `ml/social_media_content/infer.py`: reads trained coefficients and writes one `org_insight` record.
- `ml/utils_db.py`: shared write helper (`write_predictions`) to both current+history tables.
- `ml/config.py`: constants for model name/path and table names.

---

### 2) Data + modeling flow

1. **Training data source**
   - `social_media_content/etl.py` fetches the `social_media_posts` table (812 posts, 7 platforms).
   - Calls `features.build_features()` to produce the before-post feature matrix (X), target (y), and after-post engagement columns (EDA only).

2. **Training intent**
   - This model is for **interpretability** (content strategy coefficients), not per-post scoring.
   - Notebook trains and persists:
     - an OLS object (for coefficient interpretation / p-values / CIs)
     - optional scaler / selected feature list
     - model metadata/metrics to `model.json`
     - serialized bundle to `model.sav`

3. **Inference intent**
   - `social_media_content/infer.py` loads the trained bundle.
   - Pulls significant coefficients (p <= 0.05), excludes intercept.
   - Sorts by absolute coefficient magnitude.
   - Builds human-readable labels for each driver (e.g. "ImpactStory posts add ~28 referrals vs ThankYou").
   - Writes **one row** as:
     - `entity_type = "org_insight"`
     - `entity_id = null`
     - `model_name = "social-media-content"`
     - `score = null`
     - `score_label = "content_strategy"`
     - `metadata = { top_findings, adjusted_r2, n_observations }`

---

### 3) Why it's "explanatory"

In `infer.py`, top findings are built from OLS terms:
- includes `feature`, `effect` (coefficient), `p_value`, confidence interval bounds
- adds readable explanation text (e.g. "Featuring a resident story adds ~35 referrals")
- output is aggregate org insight, not post-specific prediction

So this pipeline answers:
**"What characteristics of a social media post explain why it drives donations?"**

Critical distinction — only **before-post** features (what staff decide before publishing) are used as X variables. After-post engagement metrics appear in EDA only.

---

### 4) DB write behavior for social media content

`infer.py` calls `write_predictions(client, [record])`, so it writes to both tables:

- `ml_predictions`: upsert current org insight for `social-media-content`
- `ml_prediction_history`: append every run for trend/history

Because key is `(entity_type, entity_id, model_name)`, this becomes:
- current table: one latest org row for this model
- history table: timeline of org insight snapshots

---

### 5) Files that still need to be created

- `ml/social_media_content/etl.py` — fetch + feature build (thin wrapper around `features.build_features`)
- `ml/social_media_content/artifacts.py` — save/load model bundle + append run metadata to `model.json`
- `ml/social_media_content/infer.py` — load bundle, extract significant coefficients, write `org_insight` record
- `models/social-media-content/model.json` — combined metadata+metrics (created by `artifacts.py`, currently saved as `metadata.json` by the notebook)

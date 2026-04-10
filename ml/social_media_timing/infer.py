"""Nightly inference for social media timing optimizer (pre-computed matrix)."""

from __future__ import annotations

import logging

import pandas as pd

from ml.config import MODEL_NAME_SOCIAL_TIMING
from ml.social_media_timing.artifacts import load_metadata, load_model_bundle
from ml.social_media_timing.features import FEATURE_COLUMNS, build_features
from ml.utils_db import get_client, now_utc, write_predictions

logger = logging.getLogger(__name__)


def _load_model_version() -> str:
    meta = load_metadata()
    if meta:
        return str(meta.get("model_version") or meta.get("training_date") or "unknown")
    return "unknown"


def _timing_grid() -> pd.DataFrame:
    """
    Generate all combinations of platform × day_of_week × post_hour.

    Spec expects 7 × 7 × 24 = 1,176 rows.
    Platforms are taken from the training schema (one-hot columns) so inference
    stays consistent with the trained model.
    """
    bundle = load_model_bundle()
    model = bundle.get("model")
    platforms: list[str] = []
    if hasattr(model, "named_steps") and "prep" in model.named_steps:
        prep = model.named_steps["prep"]
        ohe = (
            getattr(prep, "named_transformers_", {})
            .get("cat", None)
        )
        if ohe is not None and hasattr(ohe, "named_steps") and "onehot" in ohe.named_steps:
            encoder = ohe.named_steps["onehot"]
            cat_features = getattr(prep, "transformers_", [])
            for _, _, cols in cat_features:
                if isinstance(cols, list) and "platform" in cols and hasattr(encoder, "categories_"):
                    platform_idx = cols.index("platform")
                    categories = encoder.categories_[platform_idx]
                    platforms = sorted([str(v) for v in categories if pd.notna(v)])
                    break
    if not platforms:
        platforms = ["Facebook", "Instagram", "TikTok", "Twitter", "WhatsApp", "YouTube", "Other"]

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    hours = list(range(24))

    rows: list[dict] = []
    for platform in platforms:
        for day in days:
            for hour in hours:
                rows.append(
                    {
                        "platform": platform,
                        "day_of_week": day,
                        "post_hour": hour,
                        # Defaults for non-grid features in this pipeline:
                        "media_type": "None",
                        "post_type": "None",
                        "is_boosted": 0,
                        "boost_budget_php": 0,
                        "has_call_to_action": 0,
                    }
                )
    return pd.DataFrame(rows)


def run_inference() -> list[dict]:
    """
    Pre-compute platform/day/hour engagement predictions and write to DB.

    Writes one row per combination to both `ml_predictions` (upsert) and
    `ml_prediction_history` (append).
    """
    bundle = load_model_bundle()
    model = bundle.get("model")
    feature_list = bundle.get("feature_list")
    if model is None:
        raise ValueError("Loaded timing model bundle is missing 'model'. Re-train and re-save artifacts.")

    grid = _timing_grid()
    X = grid.copy()
    X["is_weekend"] = X["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)
    X["engagement_rate"] = 0.0
    X, _y_unused = build_features(X)
    if feature_list:
        for col in feature_list:
            if col not in X:
                X[col] = 0
        X = X[feature_list]
    else:
        X = X[FEATURE_COLUMNS]

    preds = model.predict(X)
    preds = pd.to_numeric(pd.Series(preds), errors="coerce").fillna(0).astype(float).values

    result = grid.copy()
    result["predicted_engagement_rate"] = preds

    # Rank within platform (1 = best).
    result["rank_within_platform"] = (
        result.groupby("platform")["predicted_engagement_rate"]
        .rank(ascending=False, method="first")
        .astype(int)
    )

    model_version = _load_model_version()
    timestamp = now_utc()
    records: list[dict] = []
    for _, row in result.iterrows():
        platform = str(row["platform"])
        day = str(row["day_of_week"])
        hour = int(row["post_hour"])
        score = float(row["predicted_engagement_rate"])
        rank = int(row["rank_within_platform"])

        # Stable numeric ID from the combination so upsert works
        # (NULL entity_id causes O(n²) UPDATE scans).
        entity_id = hash((platform, day, hour)) % (2**31)

        records.append(
            {
                "entity_type": "platform_timing",
                "entity_id": entity_id,
                "model_name": MODEL_NAME_SOCIAL_TIMING,
                "model_version": model_version,
                "score": score,
                "score_label": f"{platform}_{day}_{hour}",
                "predicted_at": timestamp,
                "metadata": {
                    "platform": platform,
                    "day": day,
                    "hour": hour,
                    "predicted_engagement_rate": score,
                    "rank_within_platform": rank,
                },
            }
        )

    client = get_client()
    write_predictions(client, records)
    logger.info("Wrote %d social media timing predictions.", len(records))
    return records


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()


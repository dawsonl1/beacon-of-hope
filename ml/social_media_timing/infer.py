"""Nightly inference for social media timing optimizer (pre-computed matrix)."""

from __future__ import annotations

import logging

import pandas as pd

from ml.config import MODEL_NAME_SOCIAL_TIMING
from ml.social_media_timing.artifacts import load_metadata, load_model_bundle
from ml.social_media_timing.features import build_features
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
    feature_list = bundle.get("feature_list") or []
    platforms = sorted(
        [c[len("platform_") :] for c in feature_list if isinstance(c, str) and c.startswith("platform_")]
    )
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
    X_raw, _y_unused = build_features(grid.assign(engagement_rate=0.0))

    X = X_raw.copy()
    if feature_list:
        for col in feature_list:
            if col not in X:
                X[col] = 0
        X = X[feature_list]

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

        records.append(
            {
                "entity_type": "platform_timing",
                "entity_id": None,
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


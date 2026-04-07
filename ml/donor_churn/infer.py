"""Nightly inference for donor churn."""

from __future__ import annotations

import logging

import pandas as pd

from ml.config import (
    CHURN_LABELS,
    MODEL_NAME_DONOR_CHURN,
    TABLE_DONATIONS,
    TABLE_SOCIAL_MEDIA_POSTS,
    TABLE_SUPPORTERS,
)
from ml.donor_churn.artifacts import load_metadata, load_model_bundle
from ml.donor_churn.features import build_donor_feature_frame, compute_rule_tier, compute_top_risk_factors
from ml.utils_db import fetch_table, get_client, now_utc, score_to_label, write_predictions

logger = logging.getLogger(__name__)

METADATA_FIELDS = [
    "recency_days",
    "avg_gap_days",
    "gap_trend",
    "amount_trend",
    "frequency",
    "is_recurring",
]


def _load_model_version() -> str:
    metadata = load_metadata()
    if metadata:
        return str(metadata.get("model_version") or metadata.get("training_date") or "unknown")
    return "unknown"


def _build_records(features: pd.DataFrame, model_version: str) -> list[dict]:
    timestamp = now_utc()
    records: list[dict] = []
    for _, row in features.iterrows():
        score = float(row["score"])
        recency_days = float(row.get("recency_days", 0.0))
        gap_trend = float(row.get("gap_trend", 0.0))
        rule_tier = compute_rule_tier(recency_days=recency_days, gap_trend=gap_trend)

        metadata = {key: float(row.get(key, 0.0)) for key in METADATA_FIELDS}
        metadata["rule_tier"] = rule_tier
        metadata["top_risk_factors"] = compute_top_risk_factors(recency_days=recency_days, gap_trend=gap_trend)

        records.append(
            {
                "entity_type": "supporter",
                "entity_id": int(row["supporter_id"]),
                "model_name": MODEL_NAME_DONOR_CHURN,
                "model_version": model_version,
                "score": score,
                "score_label": score_to_label(score, CHURN_LABELS),
                "predicted_at": timestamp,
                "metadata": metadata,
            }
        )
    return records


def run_inference() -> list[dict]:
    client = get_client()
    supporters = fetch_table(client, TABLE_SUPPORTERS)
    donations = fetch_table(client, TABLE_DONATIONS)
    social_posts = fetch_table(client, TABLE_SOCIAL_MEDIA_POSTS)
    features = build_donor_feature_frame(
        supporters=supporters,
        donations=donations,
        social_posts=social_posts,
    )
    if features.empty:
        logger.info("No monetary donors available for donor churn inference.")
        return []

    bundle = load_model_bundle()
    model = bundle["model"]
    scaler = bundle.get("scaler")
    feature_list = bundle.get("feature_list")

    X = features.drop(columns=["supporter_id"], errors="ignore").copy()
    if feature_list:
        for col in feature_list:
            if col not in X:
                X[col] = 0
        X = X[feature_list]

    X_input = scaler.transform(X) if scaler is not None else X
    proba = model.predict_proba(X_input)[:, 1]
    features["score"] = (proba * 100).clip(0, 100)

    records = _build_records(features=features, model_version=_load_model_version())
    write_predictions(client, records)
    logger.info("Wrote %s donor churn predictions.", len(records))
    return records


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()

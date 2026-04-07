"""Nightly inference for reintegration readiness."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from ml.config import (
    MODEL_NAME_REINTEGRATION_READINESS,
    REINTEGRATION_LABELS,
    TABLE_EDUCATION,
    TABLE_HEALTH,
    TABLE_HOME_VISITATIONS,
    TABLE_INTERVENTION_PLANS,
    TABLE_PROCESS_RECORDINGS,
    TABLE_RESIDENTS,
)
from ml.reintegration_readiness.features import build_reintegration_feature_frame
from ml.reintegration_readiness.artifacts import load_metadata, load_model_bundle
from ml.utils_db import fetch_table, get_client, now_utc, score_to_label, write_predictions

logger = logging.getLogger(__name__)

METADATA_FIELDS = [
    "total_visits",
    "visits_per_month",
    "total_sessions",
    "sessions_per_month",
    "positive_session_rate",
    "avg_health",
    "health_trend",
    "family_coop_rate",
    "favorable_rate",
    "trauma_severity_score",
]


def _load_model_version() -> str:
    metadata = load_metadata()
    if metadata:
        return str(metadata.get("model_version") or metadata.get("training_date") or "unknown")
    return "unknown"


def _build_records(
    features: pd.DataFrame,
    scores: np.ndarray,
    model_version: str,
) -> list[dict]:
    timestamp = now_utc()
    records: list[dict] = []
    for _, row in features.iterrows():
        score = float(row["score"])
        metadata = {}
        for key in METADATA_FIELDS:
            metadata[key] = float(row.get(key, 0.0))

        records.append(
            {
                "entity_type": "resident",
                "entity_id": int(row["resident_id"]),
                "model_name": MODEL_NAME_REINTEGRATION_READINESS,
                "model_version": model_version,
                "score": score,
                "score_label": score_to_label(score, REINTEGRATION_LABELS),
                "predicted_at": timestamp,
                "metadata": metadata,
            }
        )
    return records


def run_inference() -> list[dict]:
    """Score active residents and write both current and history predictions."""
    client = get_client()
    residents = fetch_table(client, TABLE_RESIDENTS)
    health = fetch_table(client, TABLE_HEALTH)
    education = fetch_table(client, TABLE_EDUCATION)
    process = fetch_table(client, TABLE_PROCESS_RECORDINGS)
    visitations = fetch_table(client, TABLE_HOME_VISITATIONS)
    intervention_plans = fetch_table(client, TABLE_INTERVENTION_PLANS)

    active_residents = residents[residents["case_status"].eq("Active")].copy()
    features = build_reintegration_feature_frame(
        residents=active_residents,
        health=health,
        education=education,
        process_recordings=process,
        home_visitations=visitations,
        intervention_plans=intervention_plans,
    )

    bundle = load_model_bundle()
    model = bundle["model"]
    scaler = bundle.get("scaler")
    feature_list = bundle.get("feature_list")

    X = features.copy()
    X = X.drop(columns=["resident_id"], errors="ignore")
    if feature_list:
        for col in feature_list:
            if col not in X:
                X[col] = 0
        X = X[feature_list]

    if scaler is not None:
        X_input = scaler.transform(X)
    else:
        X_input = X

    proba = model.predict_proba(X_input)[:, 1]
    features["score"] = (proba * 100).clip(0, 100)
    records = _build_records(features, proba, _load_model_version())

    write_predictions(client, records)
    logger.info("Wrote %s reintegration readiness predictions.", len(records))
    return records


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()

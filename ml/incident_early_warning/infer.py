"""Nightly inference for incident early warning."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from ml.config import (
    INCIDENT_LABELS,
    MODEL_INCIDENT_RISK_DRIVERS,
    MODEL_NAME_INCIDENT_WARNING_RUNAWAY,
    MODEL_NAME_INCIDENT_WARNING_SELFHARM,
    TABLE_RESIDENTS,
)
from ml.incident_early_warning.artifacts import load_metadata, load_model_bundle
from ml.incident_early_warning.features import build_feature_frame
from ml.utils_db import fetch_table, get_client, now_utc, score_to_label, write_predictions

logger = logging.getLogger(__name__)

MODEL_NAME_INCIDENT_SELFHARM = MODEL_NAME_INCIDENT_WARNING_SELFHARM
MODEL_NAME_INCIDENT_RUNAWAY = MODEL_NAME_INCIDENT_WARNING_RUNAWAY


def _load_model_version() -> str:
    metadata = load_metadata()
    if metadata:
        return str(metadata.get("model_version") or metadata.get("training_date") or "unknown")
    return "unknown"


def _load_significant_drivers() -> dict[str, list[str]]:
    """Load statistically significant features from the incident risk drivers model."""
    try:
        from ml.incident_risk_drivers.artifacts import load_model_bundle as load_drivers_bundle

        if not MODEL_INCIDENT_RISK_DRIVERS.exists():
            return {"selfharm": [], "runaway": []}
        bundle = load_drivers_bundle()
        result: dict[str, list[str]] = {}
        for key, logit_key in [("selfharm", "selfharm_logit"), ("runaway", "runaway_logit")]:
            logit = bundle.get(logit_key)
            if logit is None or not hasattr(logit, "pvalues"):
                result[key] = []
                continue
            drivers = []
            for name in logit.params.index:
                if name in ("const", "Intercept"):
                    continue
                pval = float(logit.pvalues[name])
                if pval > 0.05:
                    continue
                drivers.append((name, abs(float(logit.params[name]))))
            drivers.sort(key=lambda x: x[1], reverse=True)
            result[key] = [name for name, _ in drivers]
        return result
    except Exception as e:
        logger.warning("Could not load incident risk drivers: %s", e)
        return {"selfharm": [], "runaway": []}


def _build_records(
    features: pd.DataFrame,
    selfharm_scores: np.ndarray,
    runaway_scores: np.ndarray,
    model_version: str,
    significant_drivers: dict[str, list[str]] | None = None,
) -> list[dict]:
    timestamp = now_utc()
    records: list[dict] = []
    selfharm_factors = (significant_drivers or {}).get("selfharm", [])
    runaway_factors = (significant_drivers or {}).get("runaway", [])

    for i, row in features.reset_index(drop=True).iterrows():
        resident_id = int(row["resident_id"])
        selfharm_pct = float(np.clip(selfharm_scores[i] * 100.0, 0.0, 100.0))
        runaway_pct = float(np.clip(runaway_scores[i] * 100.0, 0.0, 100.0))

        records.append(
            {
                "entity_type": "resident",
                "entity_id": resident_id,
                "model_name": MODEL_NAME_INCIDENT_WARNING_SELFHARM,
                "model_version": model_version,
                "score": selfharm_pct,
                "score_label": score_to_label(selfharm_pct, INCIDENT_LABELS),
                "predicted_at": timestamp,
                "metadata": {
                    "self_harm_probability": round(selfharm_scores[i], 6),
                    "top_risk_factors": selfharm_factors,
                    "recommended_protocol": "Assign dedicated counselor, daily check-ins for first 30 days",
                },
            }
        )
        records.append(
            {
                "entity_type": "resident",
                "entity_id": resident_id,
                "model_name": MODEL_NAME_INCIDENT_WARNING_RUNAWAY,
                "model_version": model_version,
                "score": runaway_pct,
                "score_label": score_to_label(runaway_pct, INCIDENT_LABELS),
                "predicted_at": timestamp,
                "metadata": {
                    "runaway_probability": round(runaway_scores[i], 6),
                    "top_risk_factors": runaway_factors,
                    "recommended_protocol": "Physical environment check, establish trusted adult contact",
                },
            }
        )
    return records


def run_inference() -> list[dict]:
    """Score active residents for self-harm and runaway risk."""
    client = get_client()
    residents = fetch_table(client, TABLE_RESIDENTS)
    active = residents[residents["case_status"].eq("Active")].copy()
    if active.empty:
        logger.info("No active residents for incident warning inference.")
        return []

    bundle = load_model_bundle()
    selfharm_model = bundle.get("selfharm_model")
    runaway_model = bundle.get("runaway_model")
    feature_list = bundle.get("feature_list") or []
    if selfharm_model is None or runaway_model is None:
        raise ValueError("Incident warning model bundle is missing selfharm_model or runaway_model.")

    features = build_feature_frame(active)
    X_all = features.drop(columns=["resident_id"], errors="ignore")

    # Ensure all union features exist (fill missing with 0)
    if feature_list:
        for col in feature_list:
            if col not in X_all.columns:
                X_all[col] = 0

    # Each model was trained on its own PFI-selected feature subset.
    # Use each model's feature_names_in_ to select the right columns.
    def _align(model, X):
        if hasattr(model, "feature_names_in_"):
            cols = list(model.feature_names_in_)
        elif feature_list:
            cols = feature_list
        else:
            return X
        for c in cols:
            if c not in X.columns:
                X[c] = 0
        return X[cols]

    selfharm_scores = selfharm_model.predict_proba(_align(selfharm_model, X_all.copy()))[:, 1]
    runaway_scores = runaway_model.predict_proba(_align(runaway_model, X_all.copy()))[:, 1]

    significant_drivers = _load_significant_drivers()
    records = _build_records(features, selfharm_scores, runaway_scores, _load_model_version(), significant_drivers)
    write_predictions(client, records)
    logger.info("Wrote %s incident early warning predictions.", len(records))
    return records


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()

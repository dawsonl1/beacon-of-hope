"""Artifact helpers for incident risk drivers (explanatory logistic) model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from ml.config import (
    MODEL_INCIDENT_RISK_DRIVERS,
    MODEL_NAME_INCIDENT_RISK_DRIVERS,
    MODEL_RUNS_INCIDENT_RISK_DRIVERS,
)

MODEL_NAME = MODEL_NAME_INCIDENT_RISK_DRIVERS
MODEL_PATH = MODEL_INCIDENT_RISK_DRIVERS
MODEL_RUNS_PATH = MODEL_RUNS_INCIDENT_RISK_DRIVERS


def _version_from_utc(now: datetime) -> str:
    return now.strftime("%Y%m%d")


_PENDING_METADATA: dict[str, Any] | None = None


def _ensure_dir() -> None:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)


def _load_combined() -> dict[str, Any]:
    if MODEL_RUNS_PATH.exists():
        with open(MODEL_RUNS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            data.setdefault("model_name", MODEL_NAME)
            return data
    return {"model_name": MODEL_NAME, "runs": []}


def _append_run(run: dict[str, Any]) -> dict[str, Any]:
    _ensure_dir()
    combined = _load_combined()
    combined["runs"].append(run)
    with open(MODEL_RUNS_PATH, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2)
    return run


def _latest_run() -> dict[str, Any]:
    combined = _load_combined()
    runs = combined.get("runs", [])
    if runs:
        latest = runs[-1]
        if isinstance(latest, dict):
            return latest
    return {}


def save_model_bundle(
    selfharm_logit: Any,
    runaway_logit: Any,
    feature_lists: dict[str, list[str]],
) -> None:
    """Save both logistic regression models and their feature lists."""
    _ensure_dir()
    bundle = {
        "selfharm_logit": selfharm_logit,
        "runaway_logit": runaway_logit,
        "feature_lists": feature_lists,
    }
    joblib.dump(bundle, MODEL_PATH)


def load_model_bundle() -> dict[str, Any]:
    loaded = joblib.load(MODEL_PATH)
    if not isinstance(loaded, dict):
        raise ValueError("incident-risk-drivers model.sav must be a dict bundle with selfharm_logit, runaway_logit, feature_lists")
    loaded.setdefault("selfharm_logit", None)
    loaded.setdefault("runaway_logit", None)
    loaded.setdefault("feature_lists", {})
    return loaded


def save_metadata(
    model_type: str,
    feature_list: list[str],
    train_rows: int,
    test_rows: int,
    total_rows: int,
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metadata = {
        "model_name": MODEL_NAME,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "features": feature_list,
        "num_training_rows": int(train_rows),
        "num_test_rows": int(test_rows),
        # Transitional/compatibility fields:
        "training_date": _version_from_utc(now),
        "model_type": model_type,
        "feature_list": feature_list,
        "train_rows": int(train_rows),
        "test_rows": int(test_rows),
        "total_rows": int(total_rows),
    }
    _PENDING_METADATA = metadata
    return metadata


def load_metadata() -> dict[str, Any]:
    latest = _latest_run()
    return latest if latest else {}


def save_metrics(
    selfharm_coefficients: list[dict[str, Any]] | None = None,
    runaway_coefficients: list[dict[str, Any]] | None = None,
    selfharm_pseudo_r2: float | None = None,
    runaway_pseudo_r2: float | None = None,
    n_observations: int | None = None,
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metrics: dict[str, Any] = {
        "model_name": MODEL_NAME,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "selfharm_pseudo_r2": float(selfharm_pseudo_r2) if selfharm_pseudo_r2 is not None else None,
        "runaway_pseudo_r2": float(runaway_pseudo_r2) if runaway_pseudo_r2 is not None else None,
        "n_observations": int(n_observations) if n_observations is not None else None,
    }
    if selfharm_coefficients is not None:
        metrics["selfharm_coefficients"] = selfharm_coefficients
    if runaway_coefficients is not None:
        metrics["runaway_coefficients"] = runaway_coefficients
    if _PENDING_METADATA:
        run = {**_PENDING_METADATA, **metrics}
    else:
        run = {
            "model_name": MODEL_NAME,
            "model_version": metrics["model_version"],
            "trained_at_utc": metrics["trained_at_utc"],
            "features": [],
            "num_training_rows": 0,
            "num_test_rows": 0,
            "training_date": metrics["model_version"],
            "feature_list": [],
            "train_rows": 0,
            "test_rows": 0,
            "total_rows": 0,
            **metrics,
        }
    _PENDING_METADATA = None
    return _append_run(run)


def load_metrics() -> dict[str, Any]:
    latest = _latest_run()
    return latest if latest else {}

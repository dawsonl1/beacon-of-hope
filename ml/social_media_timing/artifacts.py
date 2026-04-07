"""Artifact helpers for social media timing (predictive regressor) model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from ml.config import (
    MODEL_NAME_SOCIAL_TIMING,
    MODEL_RUNS_SOCIAL_TIMING,
    MODEL_SOCIAL_TIMING,
)


def _version_from_utc(now: datetime) -> str:
    return now.strftime("%Y%m%d")


_PENDING_METADATA: dict[str, Any] | None = None


def _load_combined() -> dict[str, Any]:
    if MODEL_RUNS_SOCIAL_TIMING.exists():
        with open(MODEL_RUNS_SOCIAL_TIMING, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            data.setdefault("model_name", MODEL_NAME_SOCIAL_TIMING)
            return data
    return {"model_name": MODEL_NAME_SOCIAL_TIMING, "runs": []}


def _append_run(run: dict[str, Any]) -> dict[str, Any]:
    combined = _load_combined()
    combined["runs"].append(run)
    MODEL_RUNS_SOCIAL_TIMING.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_RUNS_SOCIAL_TIMING, "w", encoding="utf-8") as f:
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


def save_model_bundle(model: Any, feature_list: list[str]) -> None:
    bundle = {"model": model, "feature_list": feature_list}
    MODEL_SOCIAL_TIMING.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_SOCIAL_TIMING)


def load_model_bundle() -> dict[str, Any]:
    loaded = joblib.load(MODEL_SOCIAL_TIMING)
    if isinstance(loaded, dict):
        loaded.setdefault("model", None)
        loaded.setdefault("feature_list", None)
        return loaded
    return {"model": loaded, "feature_list": None}


def save_metadata(
    feature_list: list[str],
    model_type: str,
    train_rows: int,
    test_rows: int,
    total_rows: int,
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metadata = {
        "model_name": MODEL_NAME_SOCIAL_TIMING,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "model_type": model_type,
        "features": feature_list,
        "num_training_rows": int(train_rows),
        "num_test_rows": int(test_rows),
        "total_rows": int(total_rows),
    }
    _PENDING_METADATA = metadata
    return metadata


def load_metadata() -> dict[str, Any]:
    return _latest_run()


def save_metrics(
    mae: float,
    rmse: float,
    r2: float,
    cv_table: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metrics: dict[str, Any] = {
        "model_name": MODEL_NAME_SOCIAL_TIMING,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "mae": float(mae),
        "rmse": float(rmse),
        "r2": float(r2),
    }
    if cv_table is not None:
        metrics["cv_results"] = cv_table
    if _PENDING_METADATA:
        run = {**_PENDING_METADATA, **metrics}
    else:
        run = {
            "model_name": MODEL_NAME_SOCIAL_TIMING,
            "model_version": metrics["model_version"],
            "trained_at_utc": metrics["trained_at_utc"],
            "model_type": "unknown",
            "features": [],
            "num_training_rows": 0,
            "num_test_rows": 0,
            "total_rows": 0,
            **metrics,
        }
    _PENDING_METADATA = None
    return _append_run(run)


def load_metrics() -> dict[str, Any]:
    return _latest_run()

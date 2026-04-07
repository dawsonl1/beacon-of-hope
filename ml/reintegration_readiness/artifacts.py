"""Artifact helpers for reintegration readiness model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from config import (
    MODEL_RUNS_REINTEGRATION_READINESS,
    MODEL_NAME_REINTEGRATION_READINESS,
    MODEL_REINTEGRATION_READINESS,
)


def save_model_bundle(model: Any, scaler: Any, feature_list: list[str]) -> None:
    bundle = {
        "model": model,
        "scaler": scaler,
        "feature_list": feature_list,
    }
    joblib.dump(bundle, MODEL_REINTEGRATION_READINESS)


def load_model_bundle() -> dict:
    loaded = joblib.load(MODEL_REINTEGRATION_READINESS)
    if isinstance(loaded, dict):
        loaded.setdefault("scaler", None)
        loaded.setdefault("feature_list", None)
        return loaded
    return {"model": loaded, "scaler": None, "feature_list": None}


def _version_from_utc(now: datetime) -> str:
    return now.strftime("%Y%m%d")


_PENDING_METADATA: dict[str, Any] | None = None


def _load_combined() -> dict[str, Any]:
    if MODEL_RUNS_REINTEGRATION_READINESS.exists():
        with open(MODEL_RUNS_REINTEGRATION_READINESS, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            data.setdefault("model_name", MODEL_NAME_REINTEGRATION_READINESS)
            return data
    return {"model_name": MODEL_NAME_REINTEGRATION_READINESS, "runs": []}


def _append_run(run: dict[str, Any]) -> dict[str, Any]:
    combined = _load_combined()
    combined["runs"].append(run)
    with open(MODEL_RUNS_REINTEGRATION_READINESS, "w", encoding="utf-8") as f:
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


def save_metadata(model_type: str, feature_list: list[str], train_rows: int, test_rows: int, total_rows: int) -> dict:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metadata = {
        "model_name": MODEL_NAME_REINTEGRATION_READINESS,
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
    # Hold metadata until save_metrics appends one merged run record.
    _PENDING_METADATA = metadata
    return metadata


def load_metadata() -> dict:
    latest = _latest_run()
    return latest if latest else {}


def save_metrics(roc_auc: float, f1: float, accuracy: float, classification_report: dict[str, Any] | None = None) -> dict:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metrics = {
        "model_name": MODEL_NAME_REINTEGRATION_READINESS,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "accuracy": float(accuracy),
        "f1": float(f1),
        "roc_auc": float(roc_auc),
        "classification_report": classification_report,
    }
    if _PENDING_METADATA:
        run = {**_PENDING_METADATA, **metrics}
    else:
        # Backfill minimum metadata if metrics saved standalone.
        run = {
            "model_name": MODEL_NAME_REINTEGRATION_READINESS,
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

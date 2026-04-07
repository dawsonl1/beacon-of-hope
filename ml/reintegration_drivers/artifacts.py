"""Artifact helpers for reintegration drivers (explanatory OLS) model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from ml.config import (
    MODEL_RUNS_REINTEGRATION_DRIVERS,
    MODEL_NAME_REINTEGRATION_DRIVERS,
    MODEL_REINTEGRATION_DRIVERS,
)


def _version_from_utc(now: datetime) -> str:
    return now.strftime("%Y%m%d")


_PENDING_METADATA: dict[str, Any] | None = None


def _load_combined() -> dict[str, Any]:
    if MODEL_RUNS_REINTEGRATION_DRIVERS.exists():
        with open(MODEL_RUNS_REINTEGRATION_DRIVERS, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            data.setdefault("model_name", MODEL_NAME_REINTEGRATION_DRIVERS)
            return data
    return {"model_name": MODEL_NAME_REINTEGRATION_DRIVERS, "runs": []}


def _append_run(run: dict[str, Any]) -> dict[str, Any]:
    combined = _load_combined()
    combined["runs"].append(run)
    with open(MODEL_RUNS_REINTEGRATION_DRIVERS, "w", encoding="utf-8") as f:
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
    ols_results: Any,
    scaler: Any,
    feature_list: list[str],
    logit_results: Any | None = None,
) -> None:
    bundle = {
        "ols": ols_results,
        "scaler": scaler,
        "feature_list": feature_list,
        "logit": logit_results,
    }
    joblib.dump(bundle, MODEL_REINTEGRATION_DRIVERS)


def load_model_bundle() -> dict[str, Any]:
    loaded = joblib.load(MODEL_REINTEGRATION_DRIVERS)
    if not isinstance(loaded, dict):
        raise ValueError("reintegration-drivers.sav must be a dict bundle with ols, scaler, feature_list")
    loaded.setdefault("scaler", None)
    loaded.setdefault("feature_list", None)
    loaded.setdefault("logit", None)
    loaded.setdefault("ols", None)
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
        "model_name": MODEL_NAME_REINTEGRATION_DRIVERS,
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


def load_metadata() -> dict[str, Any]:
    latest = _latest_run()
    return latest if latest else {}


def save_metrics(
    adjusted_r2: float,
    pseudo_r2: float | None,
    n_observations: int,
    ols_coefficients: list[dict[str, Any]] | None = None,
    logit_coefficients: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metrics: dict[str, Any] = {
        "model_name": MODEL_NAME_REINTEGRATION_DRIVERS,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "accuracy": None,
        "f1": None,
        "roc_auc": None,
        "classification_report": None,
        "adjusted_r2": float(adjusted_r2),
        "pseudo_r2": float(pseudo_r2) if pseudo_r2 is not None else None,
        "n_observations": int(n_observations),
    }
    if ols_coefficients is not None:
        metrics["ols_coefficients"] = ols_coefficients
    if logit_coefficients is not None:
        metrics["logit_coefficients"] = logit_coefficients
    if _PENDING_METADATA:
        run = {**_PENDING_METADATA, **metrics}
    else:
        run = {
            "model_name": MODEL_NAME_REINTEGRATION_DRIVERS,
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

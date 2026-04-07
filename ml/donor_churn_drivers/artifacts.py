"""Artifact helpers for donor churn drivers (explanatory logistic) model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib

MODEL_NAME = "donor-churn-drivers"
_MODELS_DIR = Path(__file__).resolve().parents[2] / "models" / "donor-churn-drivers"
MODEL_PATH = _MODELS_DIR / "model.sav"
MODEL_RUNS_PATH = _MODELS_DIR / "model.json"


def _version_from_utc(now: datetime) -> str:
    return now.strftime("%Y%m%d")


_PENDING_METADATA: dict[str, Any] | None = None


def _load_combined() -> dict[str, Any]:
    if MODEL_RUNS_PATH.exists():
        with open(MODEL_RUNS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            data.setdefault("model_name", MODEL_NAME)
            return data
    return {"model_name": MODEL_NAME, "runs": []}


def _append_run(run: dict[str, Any]) -> dict[str, Any]:
    combined = _load_combined()
    combined["runs"].append(run)
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
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
    logit_results: Any,
    scaler: Any,
    feature_list: list[str],
) -> None:
    bundle = {
        "logit": logit_results,
        "scaler": scaler,
        "feature_list": feature_list,
    }
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)


def load_model_bundle() -> dict[str, Any]:
    loaded = joblib.load(MODEL_PATH)
    if not isinstance(loaded, dict):
        raise ValueError("donor-churn-drivers model.sav must be a dict bundle with logit, scaler, feature_list")
    loaded.setdefault("scaler", None)
    loaded.setdefault("feature_list", None)
    loaded.setdefault("logit", None)
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
    # Hold metadata until save_metrics appends one merged run record.
    _PENDING_METADATA = metadata
    return metadata


def load_metadata() -> dict[str, Any]:
    latest = _latest_run()
    return latest if latest else {}


def save_metrics(
    pseudo_r2: float,
    n_observations: int,
    coefficients: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metrics: dict[str, Any] = {
        "model_name": MODEL_NAME,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "accuracy": None,
        "f1": None,
        "roc_auc": None,
        "classification_report": None,
        "pseudo_r2": float(pseudo_r2),
        "n_observations": int(n_observations),
    }
    if coefficients is not None:
        metrics["coefficients"] = coefficients
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

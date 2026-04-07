"""Artifact helpers for social media content (explanatory OLS) model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from ml.config import (
    MODEL_RUNS_SOCIAL_CONTENT,
    MODEL_NAME_SOCIAL_CONTENT,
    MODEL_SOCIAL_CONTENT,
)


def _version_from_utc(now: datetime) -> str:
    return now.strftime("%Y%m%d")


_PENDING_METADATA: dict[str, Any] | None = None


def _load_combined() -> dict[str, Any]:
    if MODEL_RUNS_SOCIAL_CONTENT.exists():
        with open(MODEL_RUNS_SOCIAL_CONTENT, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            data.setdefault("model_name", MODEL_NAME_SOCIAL_CONTENT)
            return data
    return {"model_name": MODEL_NAME_SOCIAL_CONTENT, "runs": []}


def _append_run(run: dict[str, Any]) -> dict[str, Any]:
    combined = _load_combined()
    combined["runs"].append(run)
    MODEL_RUNS_SOCIAL_CONTENT.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_RUNS_SOCIAL_CONTENT, "w", encoding="utf-8") as f:
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
    ols_business: Any,
    ols_std: Any,
    scaler: Any,
    numeric_cols: list[str],
    feature_list: list[str],
    coef_table_business: list[dict],
    coef_table_std: list[dict],
) -> None:
    bundle = {
        "model_business": ols_business,
        "model_std": ols_std,
        "numeric_scaler": scaler,
        "numeric_cols": numeric_cols,
        "selected_features": feature_list,
        "coef_table_business": coef_table_business,
        "coef_table_std": coef_table_std,
    }
    MODEL_SOCIAL_CONTENT.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_SOCIAL_CONTENT)


def load_model_bundle() -> dict[str, Any]:
    loaded = joblib.load(MODEL_SOCIAL_CONTENT)
    if not isinstance(loaded, dict):
        raise ValueError("social-media-content model.sav must be a dict bundle")
    loaded.setdefault("model_business", None)
    loaded.setdefault("model_std", None)
    loaded.setdefault("numeric_scaler", None)
    loaded.setdefault("numeric_cols", [])
    loaded.setdefault("selected_features", [])
    loaded.setdefault("coef_table_business", [])
    loaded.setdefault("coef_table_std", [])
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
        "model_name": MODEL_NAME_SOCIAL_CONTENT,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "features": feature_list,
        "num_training_rows": int(train_rows),
        "num_test_rows": int(test_rows),
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
    adjusted_r2: float,
    r2_test: float,
    adjusted_r2_test: float,
    mae_test: float,
    rmse_test: float,
    n_observations: int,
    ols_coefficients: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metrics: dict[str, Any] = {
        "model_name": MODEL_NAME_SOCIAL_CONTENT,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "adjusted_r2_train": float(adjusted_r2),
        "r2_test": float(r2_test),
        "adjusted_r2_test": float(adjusted_r2_test),
        "mae_test": float(mae_test),
        "rmse_test": float(rmse_test),
        "n_observations": int(n_observations),
    }
    if ols_coefficients is not None:
        metrics["ols_coefficients"] = ols_coefficients
    if _PENDING_METADATA:
        run = {**_PENDING_METADATA, **metrics}
    else:
        run = {
            "model_name": MODEL_NAME_SOCIAL_CONTENT,
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

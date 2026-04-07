"""Artifact helpers for reintegration drivers (explanatory OLS) model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from config import META_REINTEGRATION_DRIVERS, METRICS_REINTEGRATION_DRIVERS, MODEL_REINTEGRATION_DRIVERS


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
    metadata = {
        "training_date": datetime.now(timezone.utc).strftime("%Y%m%d"),
        "model_type": model_type,
        "feature_list": feature_list,
        "train_rows": int(train_rows),
        "test_rows": int(test_rows),
        "total_rows": int(total_rows),
    }
    with open(META_REINTEGRATION_DRIVERS, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    return metadata


def load_metadata() -> dict[str, Any]:
    if not META_REINTEGRATION_DRIVERS.exists():
        return {}
    with open(META_REINTEGRATION_DRIVERS, "r", encoding="utf-8") as f:
        return json.load(f)


def save_metrics(
    adjusted_r2: float,
    pseudo_r2: float | None,
    n_observations: int,
    ols_coefficients: list[dict[str, Any]] | None = None,
    logit_coefficients: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    metrics: dict[str, Any] = {
        "adjusted_r2": float(adjusted_r2),
        "pseudo_r2": float(pseudo_r2) if pseudo_r2 is not None else None,
        "n_observations": int(n_observations),
    }
    if ols_coefficients is not None:
        metrics["ols_coefficients"] = ols_coefficients
    if logit_coefficients is not None:
        metrics["logit_coefficients"] = logit_coefficients
    with open(METRICS_REINTEGRATION_DRIVERS, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    return metrics


def load_metrics() -> dict[str, Any]:
    if not METRICS_REINTEGRATION_DRIVERS.exists():
        return {}
    with open(METRICS_REINTEGRATION_DRIVERS, "r", encoding="utf-8") as f:
        return json.load(f)

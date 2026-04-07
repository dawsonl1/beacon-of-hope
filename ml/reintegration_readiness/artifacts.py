"""Artifact helpers for reintegration readiness model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from config import META_REINTEGRATION_READINESS, METRICS_REINTEGRATION_READINESS, MODEL_REINTEGRATION_READINESS


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


def save_metadata(model_type: str, feature_list: list[str], train_rows: int, test_rows: int, total_rows: int) -> dict:
    metadata = {
        "training_date": datetime.now(timezone.utc).strftime("%Y%m%d"),
        "model_type": model_type,
        "feature_list": feature_list,
        "train_rows": int(train_rows),
        "test_rows": int(test_rows),
        "total_rows": int(total_rows),
    }
    with open(META_REINTEGRATION_READINESS, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    return metadata


def load_metadata() -> dict:
    if not META_REINTEGRATION_READINESS.exists():
        return {}
    with open(META_REINTEGRATION_READINESS, "r", encoding="utf-8") as f:
        return json.load(f)


def save_metrics(roc_auc: float, f1: float, accuracy: float) -> dict:
    metrics = {
        "roc_auc": float(roc_auc),
        "f1": float(f1),
        "accuracy": float(accuracy),
    }
    with open(METRICS_REINTEGRATION_READINESS, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    return metrics

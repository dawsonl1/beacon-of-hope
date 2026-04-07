"""Artifact helpers for incident early warning dual-model classifier."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib

from ml.config import (
    MODEL_INCIDENT_WARNING,
    MODEL_NAME_INCIDENT_WARNING,
    MODEL_RUNS_INCIDENT_WARNING,
)


def _version_from_utc(now: datetime) -> str:
    return now.strftime("%Y%m%d")


_PENDING_METADATA: dict[str, Any] | None = None


def _load_combined() -> dict[str, Any]:
    if MODEL_RUNS_INCIDENT_WARNING.exists():
        with open(MODEL_RUNS_INCIDENT_WARNING, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            data.setdefault("model_name", MODEL_NAME_INCIDENT_WARNING)
            return data
    return {"model_name": MODEL_NAME_INCIDENT_WARNING, "runs": []}


def _append_run(run: dict[str, Any]) -> dict[str, Any]:
    combined = _load_combined()
    combined["runs"].append(run)
    MODEL_RUNS_INCIDENT_WARNING.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_RUNS_INCIDENT_WARNING, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2)
    return run


def _latest_run() -> dict[str, Any]:
    combined = _load_combined()
    runs = combined.get("runs", [])
    if runs and isinstance(runs[-1], dict):
        return runs[-1]
    return {}


def save_model_bundle(selfharm_model: Any, runaway_model: Any, feature_list: list[str]) -> None:
    bundle = {
        "selfharm_model": selfharm_model,
        "runaway_model": runaway_model,
        "feature_list": feature_list,
    }
    MODEL_INCIDENT_WARNING.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_INCIDENT_WARNING)


def load_model_bundle() -> dict[str, Any]:
    loaded = joblib.load(MODEL_INCIDENT_WARNING)
    if not isinstance(loaded, dict):
        raise ValueError("incident-early-warning model must be a dict bundle.")
    loaded.setdefault("selfharm_model", None)
    loaded.setdefault("runaway_model", None)
    loaded.setdefault("feature_list", [])
    return loaded


def save_metadata(model_type: str, feature_list: list[str], train_rows: int, test_rows: int, total_rows: int) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metadata = {
        "model_name": MODEL_NAME_INCIDENT_WARNING,
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
    selfharm_metrics: dict[str, Any],
    runaway_metrics: dict[str, Any],
) -> dict[str, Any]:
    global _PENDING_METADATA
    now = datetime.now(timezone.utc)
    metrics: dict[str, Any] = {
        "model_name": MODEL_NAME_INCIDENT_WARNING,
        "model_version": _version_from_utc(now),
        "trained_at_utc": now.isoformat(),
        "selfharm_metrics": selfharm_metrics,
        "runaway_metrics": runaway_metrics,
    }
    if _PENDING_METADATA:
        run = {**_PENDING_METADATA, **metrics}
    else:
        run = {
            "model_name": MODEL_NAME_INCIDENT_WARNING,
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

"""Nightly inference for donor churn drivers (explanatory)."""

from __future__ import annotations

import logging
from typing import Any

from ml.donor_churn_drivers.artifacts import load_model_bundle, load_metadata, MODEL_PATH
from ml.utils_db import get_client, now_utc, write_predictions

logger = logging.getLogger(__name__)

MODEL_NAME = "donor-churn-drivers"


def _load_model_version() -> str:
    metadata = load_metadata()
    if metadata:
        return str(metadata.get("model_version") or metadata.get("training_date") or "unknown")
    return "unknown"


def run_inference() -> list[dict]:
    """Publish coefficient summary as a single org_insight row."""
    if not MODEL_PATH.exists():
        logger.warning("Skipping donor churn drivers: model file missing at %s", MODEL_PATH)
        return []

    bundle = load_model_bundle()
    logit = bundle.get("logit")
    feature_list = bundle.get("feature_list", [])

    if logit is None:
        logger.warning("No logistic model found in bundle; skipping org insight.")
        return []

    import numpy as np

    coefficients: list[dict[str, Any]] = []
    if hasattr(logit, "params"):
        for name in logit.params.index:
            if name == "const":
                continue
            coefficients.append({
                "feature": name,
                "coefficient": float(logit.params[name]),
                "odds_ratio": float(np.exp(logit.params[name])),
                "p_value": float(logit.pvalues[name]),
            })

    coefficients.sort(key=lambda x: abs(x["coefficient"]), reverse=True)

    record: dict[str, Any] = {
        "entity_type": "org_insight",
        "entity_id": None,
        "model_name": MODEL_NAME,
        "model_version": _load_model_version(),
        "score": None,
        "score_label": "churn_drivers",
        "predicted_at": now_utc(),
        "metadata": {
            "top_drivers": coefficients[:5],
            "all_coefficients": coefficients,
            "n_features": len(feature_list),
        },
    }

    client = get_client()
    write_predictions(client, [record])
    logger.info("Wrote donor churn drivers org insight.")
    return [record]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()

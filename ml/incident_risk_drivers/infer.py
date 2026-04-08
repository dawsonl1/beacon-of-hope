"""Nightly inference for incident risk drivers (explanatory)."""

from __future__ import annotations

import logging

from ml.config import MODEL_NAME_INCIDENT_RISK_DRIVERS
from ml.incident_risk_drivers.artifacts import load_model_bundle, load_metadata, MODEL_PATH
from ml.utils_db import get_client, now_utc, write_predictions

logger = logging.getLogger(__name__)

MODEL_NAME = MODEL_NAME_INCIDENT_RISK_DRIVERS


def _load_model_version() -> str:
    metadata = load_metadata()
    if metadata:
        return str(metadata.get("model_version") or metadata.get("training_date") or "unknown")
    return "unknown"


def run_inference() -> list[dict]:
    if not MODEL_PATH.exists():
        logger.warning("Skipping incident risk drivers: model file missing at %s", MODEL_PATH)
        return []

    bundle = load_model_bundle()
    sh_logit = bundle.get("selfharm_logit")
    rw_logit = bundle.get("runaway_logit")

    import numpy as np

    def _extract_coefficients(logit_model):
        if logit_model is None or not hasattr(logit_model, "params"):
            return []
        coefficients = []
        for name in logit_model.params.index:
            if name == "const":
                continue
            coefficients.append({
                "feature": name,
                "coefficient": float(logit_model.params[name]),
                "odds_ratio": float(np.exp(logit_model.params[name])),
                "p_value": float(logit_model.pvalues[name]),
            })
        coefficients.sort(key=lambda x: abs(x["coefficient"]), reverse=True)
        return coefficients

    sh_coefficients = _extract_coefficients(sh_logit)
    rw_coefficients = _extract_coefficients(rw_logit)

    record = {
        "entity_type": "org_insight",
        "entity_id": None,
        "model_name": MODEL_NAME,
        "model_version": _load_model_version(),
        "score": None,
        "score_label": "incident_risk_drivers",
        "predicted_at": now_utc(),
        "metadata": {
            "selfharm_drivers": sh_coefficients[:5],
            "runaway_drivers": rw_coefficients[:5],
            "all_selfharm_coefficients": sh_coefficients,
            "all_runaway_coefficients": rw_coefficients,
        },
    }

    client = get_client()
    write_predictions(client, [record])
    logger.info("Wrote incident risk drivers org insight.")
    return [record]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()

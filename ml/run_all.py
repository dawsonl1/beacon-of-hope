"""
Entry point for scheduled ML jobs.

This file is intended to be invoked by GitHub Actions (nightly).
It runs the full pipeline for each model: train → save .sav → run inference.
"""

from __future__ import annotations

import logging
import traceback

from ml.donor_churn.train import run_training as train_donor_churn
from ml.donor_churn.infer import run_inference as infer_donor_churn
from ml.donor_churn_drivers.train import run_training as train_donor_churn_drivers
from ml.donor_churn_drivers.infer import run_inference as infer_donor_churn_drivers
from ml.incident_early_warning.train import run_training as train_incident_warning
from ml.incident_early_warning.infer import run_inference as infer_incident_warning
from ml.incident_risk_drivers.train import run_training as train_incident_risk_drivers
from ml.incident_risk_drivers.infer import run_inference as infer_incident_risk_drivers
from ml.reintegration_readiness.train import run_training as train_reintegration_readiness
from ml.reintegration_readiness.infer import run_inference as infer_reintegration_readiness
from ml.reintegration_drivers.train import run_training as train_reintegration_drivers
from ml.reintegration_drivers.infer import run_inference as infer_reintegration_drivers
from ml.social_media_content.train import run_training as train_social_content
from ml.social_media_content.infer import run_inference as infer_social_content
from ml.social_media_timing.train import run_training as train_social_timing
from ml.social_media_timing.infer import run_inference as infer_social_timing

logger = logging.getLogger(__name__)


def _safe_run(label: str, fn) -> None:
    """Run a pipeline step, log errors but don't crash the whole job."""
    try:
        fn()
    except Exception:
        logger.error("FAILED: %s\n%s", label, traceback.format_exc())


def main() -> None:
    """Run all ML pipelines: train then infer for each model."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("=== Starting nightly ML pipeline run ===")

    # ── Explanatory pipelines first ────────────────────────────────────────
    # These must run before predictive inferences that embed their results
    # (e.g., reintegration readiness infer reads reintegration drivers .sav).

    logger.info("--- Donor Churn Drivers (explanatory) ---")
    _safe_run("donor-churn-drivers train", train_donor_churn_drivers)
    _safe_run("donor-churn-drivers infer", infer_donor_churn_drivers)

    logger.info("--- Incident Risk Drivers (explanatory, dual-target) ---")
    _safe_run("incident-risk-drivers train", train_incident_risk_drivers)
    _safe_run("incident-risk-drivers infer", infer_incident_risk_drivers)

    logger.info("--- Reintegration Drivers (explanatory) ---")
    _safe_run("reintegration-drivers train", train_reintegration_drivers)
    _safe_run("reintegration-drivers infer", infer_reintegration_drivers)

    logger.info("--- Social Media Content (explanatory) ---")
    _safe_run("social-media-content train", train_social_content)
    _safe_run("social-media-content infer", infer_social_content)

    # ── Predictive pipelines ─────────────────────────────────────────────────

    logger.info("--- Donor Churn (predictive) ---")
    _safe_run("donor-churn train", train_donor_churn)
    _safe_run("donor-churn infer", infer_donor_churn)

    logger.info("--- Incident Early Warning (predictive, dual-target) ---")
    _safe_run("incident-early-warning train", train_incident_warning)
    _safe_run("incident-early-warning infer", infer_incident_warning)

    logger.info("--- Reintegration Readiness (predictive) ---")
    _safe_run("reintegration-readiness train", train_reintegration_readiness)
    _safe_run("reintegration-readiness infer", infer_reintegration_readiness)

    logger.info("--- Social Media Timing (predictive) ---")
    _safe_run("social-media-timing train", train_social_timing)
    _safe_run("social-media-timing infer", infer_social_timing)

    logger.info("=== Nightly ML pipeline run complete ===")


if __name__ == "__main__":
    main()

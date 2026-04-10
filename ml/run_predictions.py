"""Entry point for nightly ML prediction jobs."""

from __future__ import annotations

import logging
import traceback

from ml.donor_churn.infer import run_inference as run_donor_churn
from ml.donor_churn_drivers.infer import run_inference as run_donor_churn_drivers
from ml.incident_early_warning.infer import run_inference as run_incident_warning
from ml.incident_risk_drivers.infer import run_inference as run_incident_risk_drivers
from ml.reintegration_drivers.infer import run_inference as run_reintegration_drivers
from ml.reintegration_readiness.infer import run_inference as run_reintegration_readiness
from ml.social_media_content.infer import run_inference as run_social_content
from ml.social_media_timing.infer import run_inference as run_social_timing

logger = logging.getLogger(__name__)


def _safe_run(label: str, fn) -> None:
    """Run a pipeline step, log errors but don't crash the whole job."""
    try:
        fn()
    except Exception:
        logger.error("FAILED: %s\n%s", label, traceback.format_exc())


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("Starting nightly prediction jobs.")

    # Explanatory inferences first (readiness infer reads drivers .sav)
    _safe_run("reintegration-drivers infer", run_reintegration_drivers)
    _safe_run("donor-churn-drivers infer", run_donor_churn_drivers)
    _safe_run("incident-risk-drivers infer", run_incident_risk_drivers)
    _safe_run("social-media-content infer", run_social_content)

    # Predictive inferences
    _safe_run("reintegration-readiness infer", run_reintegration_readiness)
    _safe_run("donor-churn infer", run_donor_churn)
    _safe_run("incident-early-warning infer", run_incident_warning)
    _safe_run("social-media-timing infer", run_social_timing)

    logger.info("Completed nightly prediction jobs.")


if __name__ == "__main__":
    main()

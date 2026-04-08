"""Entry point for nightly ML prediction jobs."""

from __future__ import annotations

import logging

from ml.donor_churn.infer import run_inference as run_donor_churn
from ml.donor_churn_drivers.infer import run_inference as run_donor_churn_drivers
from ml.incident_early_warning.infer import run_inference as run_incident_warning
from ml.incident_risk_drivers.infer import run_inference as run_incident_risk_drivers
from ml.reintegration_drivers.infer import run_inference as run_reintegration_drivers
from ml.reintegration_readiness.infer import run_inference as run_reintegration_readiness
from ml.social_media_content.infer import run_inference as run_social_content
from ml.social_media_timing.infer import run_inference as run_social_timing

logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("Starting nightly prediction jobs.")
    run_reintegration_readiness()
    run_reintegration_drivers()
    run_social_content()
    run_social_timing()
    run_donor_churn()
    run_donor_churn_drivers()
    run_incident_warning()
    run_incident_risk_drivers()
    logger.info("Completed nightly prediction jobs.")


if __name__ == "__main__":
    main()

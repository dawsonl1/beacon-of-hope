"""
Entry point for scheduled ML jobs.

This file is intended to be invoked by GitHub Actions (nightly).
"""

from __future__ import annotations

import logging

from ml.donor_churn.etl import build_training_frame as build_donor_churn_frame
from ml.incident_early_warning.etl import build_training_frame as build_incident_warning_frame
from ml.reintegration_readiness.etl import build_training_frame
from ml.social_media_content.etl import build_training_frame as build_social_content_frame
from ml.social_media_timing.etl import build_training_frame as build_social_timing_frame

logger = logging.getLogger(__name__)


def main() -> None:
    """
    Build ETL-ready training data for all pipelines.
    This script is useful as a pre-training smoke check in CI.
    """
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    df = build_training_frame()
    logger.info("Reintegration training frame built: %s rows x %s cols", df.shape[0], df.shape[1])

    X, y, _ = build_social_content_frame()
    logger.info("Social media content training frame built: %s rows x %s cols", X.shape[0], X.shape[1])

    X_t, y_t = build_social_timing_frame()
    logger.info("Social media timing training frame built: %s rows x %s cols", X_t.shape[0], X_t.shape[1])

    donor_df = build_donor_churn_frame()
    logger.info("Donor churn training frame built: %s rows x %s cols", donor_df.shape[0], donor_df.shape[1])

    incident_df = build_incident_warning_frame()
    logger.info("Incident early warning training frame built: %s rows x %s cols", incident_df.shape[0], incident_df.shape[1])


if __name__ == "__main__":
    main()

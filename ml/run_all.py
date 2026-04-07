"""
Entry point for scheduled ML jobs.

This file is intended to be invoked by GitHub Actions (nightly).
"""

from __future__ import annotations

import logging

from reintegration_readiness.etl import build_training_frame
from social_media_content.etl import build_training_frame as build_social_content_frame
from social_media_timing.etl import build_training_frame as build_social_timing_frame

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


if __name__ == "__main__":
    main()

"""
Entry point for scheduled ML jobs.

This file is intended to be invoked by GitHub Actions (nightly).
"""

from __future__ import annotations

import logging

from reintegration_readiness.etl import build_training_frame

logger = logging.getLogger(__name__)


def main() -> None:
    """
    Build ETL-ready training data for reintegration pipeline.
    This script is useful as a pre-training smoke check in CI.
    """
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    df = build_training_frame()
    logger.info("Reintegration training frame built: %s rows x %s cols", df.shape[0], df.shape[1])


if __name__ == "__main__":
    main()

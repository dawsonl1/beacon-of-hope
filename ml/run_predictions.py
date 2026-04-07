"""Entry point for nightly ML prediction jobs."""

from __future__ import annotations

import logging

from reintegration_drivers.infer import run_inference as run_reintegration_drivers
from reintegration_readiness.infer import run_inference as run_reintegration_readiness
from social_media_content.infer import run_inference as run_social_content
from social_media_timing.infer import run_inference as run_social_timing

logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("Starting nightly prediction jobs.")
    run_reintegration_readiness()
    run_reintegration_drivers()
    run_social_content()
    run_social_timing()
    logger.info("Completed nightly prediction jobs.")


if __name__ == "__main__":
    main()

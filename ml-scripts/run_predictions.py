"""Entry point for nightly ML prediction jobs."""

from __future__ import annotations

import logging

from pipelines.reintegration_drivers_infer import run_inference as run_reintegration_drivers
from pipelines.reintegration_infer import run_inference as run_reintegration_readiness

logger = logging.getLogger(__name__)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    logger.info("Starting nightly prediction jobs.")
    run_reintegration_readiness()
    run_reintegration_drivers()
    logger.info("Completed nightly prediction jobs.")


if __name__ == "__main__":
    main()

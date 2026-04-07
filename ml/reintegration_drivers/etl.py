"""Reintegration drivers pipeline — same training data as readiness; explanatory model + org insight."""

from __future__ import annotations

import logging

from reintegration_readiness.etl import build_training_frame
from reintegration_drivers.infer import run_inference

__all__ = ["build_training_frame", "run_inference"]


def main() -> None:
    """Smoke-test ETL: same frame as Pipeline 1 (`reintegration_complete` + features)."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    df = build_training_frame()
    logging.info("Reintegration drivers training frame (same as readiness): %s rows x %s cols", df.shape[0], df.shape[1])


if __name__ == "__main__":
    main()

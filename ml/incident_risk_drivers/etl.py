"""Incident risk drivers pipeline — same training data as incident early warning; explanatory model."""

from __future__ import annotations

import logging

from ml.incident_early_warning.etl import build_training_frame
from ml.incident_risk_drivers.infer import run_inference

__all__ = ["build_training_frame", "run_inference"]


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    df = build_training_frame()
    logging.info("Incident risk drivers training frame: %s rows x %s cols", df.shape[0], df.shape[1])


if __name__ == "__main__":
    main()

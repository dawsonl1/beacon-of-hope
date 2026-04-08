"""Donor churn drivers pipeline — same training data as donor churn; explanatory model + org insight."""

from __future__ import annotations

import logging

from ml.donor_churn.etl import build_training_frame
from ml.donor_churn_drivers.infer import run_inference

__all__ = ["build_training_frame", "run_inference"]


def main() -> None:
    """Smoke-test ETL: same frame as donor churn pipeline."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    df = build_training_frame()
    logging.info("Donor churn drivers training frame: %s rows x %s cols", df.shape[0], df.shape[1])


if __name__ == "__main__":
    main()

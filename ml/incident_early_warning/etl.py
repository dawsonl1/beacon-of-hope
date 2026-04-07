"""ETL and training frame assembly for incident early warning."""

from __future__ import annotations

import logging

import pandas as pd

from ml.config import TABLE_INCIDENTS, TABLE_RESIDENTS
from ml.incident_early_warning.features import build_feature_frame, build_targets
from ml.utils_db import fetch_table, get_client

logger = logging.getLogger(__name__)


def build_training_frame() -> pd.DataFrame:
    """Return one row per resident with intake features + both incident targets."""
    client = get_client()
    residents = fetch_table(client, TABLE_RESIDENTS)
    incidents = fetch_table(client, TABLE_INCIDENTS)

    X = build_feature_frame(residents)
    y = build_targets(residents, incidents)
    train_df = X.merge(y, on="resident_id", how="left").fillna(0)
    logger.info("Built incident early warning frame: %s rows x %s cols", train_df.shape[0], train_df.shape[1])
    return train_df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    df = build_training_frame()
    logger.info("Training frame shape: %s", df.shape)

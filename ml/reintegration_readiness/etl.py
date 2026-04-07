"""ETL and training data assembly for reintegration readiness."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import pandas as pd

from config import (
    TABLE_EDUCATION,
    TABLE_HEALTH,
    TABLE_HOME_VISITATIONS,
    TABLE_INTERVENTION_PLANS,
    TABLE_PROCESS_RECORDINGS,
    TABLE_RESIDENTS,
)
from reintegration_readiness.features import (
    build_reintegration_feature_frame,
    build_target,
)
from utils_db import fetch_table, get_client

logger = logging.getLogger(__name__)


@dataclass
class ReintegrationSourceTables:
    residents: pd.DataFrame
    health: pd.DataFrame
    education: pd.DataFrame
    process_recordings: pd.DataFrame
    home_visitations: pd.DataFrame
    intervention_plans: pd.DataFrame


def load_source_tables() -> ReintegrationSourceTables:
    """Load all operational tables required for this pipeline."""
    client = get_client()
    return ReintegrationSourceTables(
        residents=fetch_table(client, TABLE_RESIDENTS),
        health=fetch_table(client, TABLE_HEALTH),
        education=fetch_table(client, TABLE_EDUCATION),
        process_recordings=fetch_table(client, TABLE_PROCESS_RECORDINGS),
        home_visitations=fetch_table(client, TABLE_HOME_VISITATIONS),
        intervention_plans=fetch_table(client, TABLE_INTERVENTION_PLANS),
    )


def _residents_with_known_outcome(residents: pd.DataFrame) -> pd.DataFrame:
    return residents[residents["reintegration_status"].notna()].copy()


def build_training_frame() -> pd.DataFrame:
    """
    Return one-row-per-resident training frame with features + target.
    Filters to residents with known reintegration outcomes only.
    """
    tables = load_source_tables()
    residents = _residents_with_known_outcome(tables.residents)
    y = build_target(residents).rename("reintegration_complete")

    X = build_reintegration_feature_frame(
        residents=residents,
        health=tables.health,
        education=tables.education,
        process_recordings=tables.process_recordings,
        home_visitations=tables.home_visitations,
        intervention_plans=tables.intervention_plans,
    )
    train_df = X.merge(
        residents[["resident_id"]].assign(reintegration_complete=y.values),
        on="resident_id",
        how="inner",
    )
    logger.info("Built reintegration training frame with %s rows.", len(train_df))
    return train_df


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    df = build_training_frame()
    logger.info("Training frame shape: %s", df.shape)

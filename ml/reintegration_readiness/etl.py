"""ETL and training data assembly for reintegration readiness."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import pandas as pd

from ml.config import (
    TABLE_EDUCATION,
    TABLE_HEALTH,
    TABLE_HOME_VISITATIONS,
    TABLE_INTERVENTION_PLANS,
    TABLE_PROCESS_RECORDINGS,
    TABLE_RESIDENTS,
)
from ml.reintegration_readiness.features import (
    build_reintegration_feature_frame,
    build_target,
)
from ml.utils_db import fetch_table, get_client

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


def _apply_temporal_cutoff(
    records: pd.DataFrame,
    date_col: str,
    cutoffs: pd.DataFrame,
) -> pd.DataFrame:
    """Filter records to only those that occurred before each resident's outcome date.

    cutoffs: DataFrame with columns [resident_id, date_closed].
    Records for residents without a date_closed are kept as-is.
    """
    if records.empty or date_col not in records.columns:
        return records

    merged = records.merge(cutoffs[["resident_id", "date_closed"]], on="resident_id", how="left")
    record_dt = pd.to_datetime(merged[date_col], errors="coerce", utc=True)
    cutoff_dt = pd.to_datetime(merged["date_closed"], errors="coerce", utc=True)

    # Keep records where: no cutoff date, no record date, or record is before cutoff
    keep = cutoff_dt.isna() | record_dt.isna() | (record_dt < cutoff_dt)
    return records.loc[keep].copy()


def build_training_frame() -> pd.DataFrame:
    """
    Return one-row-per-resident training frame with features + target.
    Filters to residents with known reintegration outcomes only.
    Applies temporal cutoff: only uses records from before each resident's outcome date
    to prevent data leakage.
    """
    tables = load_source_tables()
    residents = _residents_with_known_outcome(tables.residents)
    y = build_target(residents).rename("reintegration_complete")

    # Build cutoff lookup for temporal filtering
    cutoffs = residents[["resident_id", "date_closed"]].copy()

    X = build_reintegration_feature_frame(
        residents=residents,
        health=_apply_temporal_cutoff(tables.health, "record_date", cutoffs),
        education=_apply_temporal_cutoff(tables.education, "record_date", cutoffs),
        process_recordings=_apply_temporal_cutoff(tables.process_recordings, "session_date", cutoffs),
        home_visitations=_apply_temporal_cutoff(tables.home_visitations, "visit_date", cutoffs),
        intervention_plans=_apply_temporal_cutoff(tables.intervention_plans, "target_date", cutoffs),
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

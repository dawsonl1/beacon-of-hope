"""ETL and training frame assembly for donor churn."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import pandas as pd

from ml.config import TABLE_DONATIONS, TABLE_SOCIAL_MEDIA_POSTS, TABLE_SUPPORTERS
from ml.donor_churn.features import build_donor_feature_frame
from ml.utils_db import fetch_table, get_client

logger = logging.getLogger(__name__)


@dataclass
class DonorSourceTables:
    supporters: pd.DataFrame
    donations: pd.DataFrame
    social_posts: pd.DataFrame


def load_source_tables() -> DonorSourceTables:
    client = get_client()
    return DonorSourceTables(
        supporters=fetch_table(client, TABLE_SUPPORTERS),
        donations=fetch_table(client, TABLE_DONATIONS),
        social_posts=fetch_table(client, TABLE_SOCIAL_MEDIA_POSTS),
    )


def build_training_frame(as_of_date: str | None = None) -> pd.DataFrame:
    """Build one-row-per-donor frame with churn target for modeling."""
    tables = load_source_tables()
    features = build_donor_feature_frame(
        supporters=tables.supporters,
        donations=tables.donations,
        social_posts=tables.social_posts,
        as_of_date=as_of_date,
    )
    if features.empty:
        return features.assign(churned=pd.Series(dtype="int64"))

    supporters = tables.supporters.copy()
    supporters["supporter_id"] = pd.to_numeric(supporters["supporter_id"], errors="coerce")
    supporters = supporters[supporters["supporter_id"].notna()].copy()
    supporters["supporter_id"] = supporters["supporter_id"].astype(int)
    supporters["status"] = supporters.get("status", "").astype(str).str.strip().str.lower()
    supporters = supporters[supporters["status"].isin(["active", "inactive"])].copy()
    supporters["churned"] = supporters["status"].eq("inactive").astype(int)

    out = features.merge(
        supporters[["supporter_id", "churned"]],
        on="supporter_id",
        how="inner",
    )
    logger.info("Built donor churn training frame with %s rows.", len(out))
    return out


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    frame = build_training_frame()
    logger.info("Training frame shape: %s", frame.shape)

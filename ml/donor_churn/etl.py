"""ETL and training frame assembly for donor churn.

Temporal contract
-----------------
To prevent data leakage, the training frame uses a **time-windowed** target:

    data_freeze  = 2026-02-16  (last date with reliable data)
    cutoff       = data_freeze - OBSERVATION_WINDOW_DAYS
    features     = computed from donations **before** cutoff
    target       = 1 if the donor made ZERO donations between cutoff and data_freeze

This ensures features never see information from the same period used to define
the target.  At inference time (nightly scoring), features are computed from all
donations up to "now", and the model predicts *future* churn risk.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import pandas as pd

from ml.config import DATA_FREEZE, TABLE_DONATIONS, TABLE_SOCIAL_MEDIA_POSTS, TABLE_SUPPORTERS
from ml.donor_churn.features import build_donor_feature_frame
from ml.utils_db import fetch_table, get_client

logger = logging.getLogger(__name__)

# Observation window: a donor is labeled "churned" if they made zero donations
# in the OBSERVATION_WINDOW_DAYS *after* the feature cutoff date.
# 180 days ≈ 6 months — a standard churn definition for non-subscription donors.
OBSERVATION_WINDOW_DAYS = 180


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
    """Build one-row-per-donor frame with time-windowed churn target.

    Features are computed from donations before the cutoff date.
    Target = 1 if the donor made zero donations in the observation window
    (cutoff → data_freeze).
    """
    tables = load_source_tables()

    # ── Temporal cutoff ─────────────────────────────────────────────────
    cutoff = DATA_FREEZE - pd.Timedelta(days=OBSERVATION_WINDOW_DAYS)
    logger.info(
        "Churn temporal contract: features before %s, target window %s → %s (%d days)",
        cutoff.date(), cutoff.date(), DATA_FREEZE.date(), OBSERVATION_WINDOW_DAYS,
    )

    # Features use only donations BEFORE the cutoff
    features = build_donor_feature_frame(
        supporters=tables.supporters,
        donations=tables.donations,
        social_posts=tables.social_posts,
        as_of_date=cutoff,
    )
    if features.empty:
        return features.assign(churned=pd.Series(dtype="int64"))

    # ── Time-windowed target ────────────────────────────────────────────
    # A donor churned if they made zero monetary donations in [cutoff, data_freeze].
    donations = tables.donations.copy()
    donations["supporter_id"] = pd.to_numeric(donations["supporter_id"], errors="coerce")
    donations = donations[donations["supporter_id"].notna()].copy()
    donations["supporter_id"] = donations["supporter_id"].astype(int)
    donations["donation_type"] = donations.get("donation_type", "").astype(str)
    donations = donations[donations["donation_type"].str.lower().eq("monetary")].copy()
    donations["donation_date"] = pd.to_datetime(
        donations.get("donation_date"), errors="coerce"
    ).dt.tz_localize(None)

    window_donations = donations[
        (donations["donation_date"] >= cutoff)
        & (donations["donation_date"] <= DATA_FREEZE)
    ]
    active_in_window = set(window_donations["supporter_id"].unique())

    features["churned"] = (~features["supporter_id"].isin(active_in_window)).astype(int)

    logger.info(
        "Built donor churn training frame: %d rows (%d churned, %d active).",
        len(features),
        features["churned"].sum(),
        (features["churned"] == 0).sum(),
    )
    return features


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    frame = build_training_frame()
    logger.info("Training frame shape: %s", frame.shape)

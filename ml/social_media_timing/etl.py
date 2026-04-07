"""Social media timing pipeline — fetch posts and build feature matrix."""

from __future__ import annotations

import logging

import pandas as pd

from ml.config import TABLE_SOCIAL_MEDIA_POSTS
from ml.social_media_timing.features import build_features
from ml.utils_db import fetch_table, get_client

logger = logging.getLogger(__name__)

__all__ = ["build_training_frame", "fetch_training_raw"]


def fetch_training_raw() -> pd.DataFrame:
    """Fetch the raw social media post table used by this pipeline."""
    client = get_client()
    raw = fetch_table(client, TABLE_SOCIAL_MEDIA_POSTS)
    logger.info("Fetched %d social media posts", len(raw))
    return raw


def build_training_frame() -> tuple[pd.DataFrame, pd.Series]:
    """
    Fetch social_media_posts and return (X, y) for engagement rate prediction.

    Implements the ETL job described in `pipeline-4b-social-media-timing.md`.
    """
    raw = fetch_training_raw()
    X, y = build_features(raw)
    logger.info("Feature matrix: %d rows x %d cols", X.shape[0], X.shape[1])
    return X, y


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    X, y = build_training_frame()
    logger.info("ETL complete: %d rows x %d features; target mean=%0.6f", X.shape[0], X.shape[1], float(y.mean()))


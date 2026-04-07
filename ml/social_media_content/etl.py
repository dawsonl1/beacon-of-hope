"""Social media content pipeline — fetch posts and build feature matrix."""

from __future__ import annotations

import logging

import pandas as pd

from config import TABLE_SOCIAL_MEDIA_POSTS
from social_media_content.features import build_features
from utils_db import get_client, fetch_table

logger = logging.getLogger(__name__)

__all__ = ["build_training_frame"]


def build_training_frame() -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """Fetch social_media_posts and return (X, y, eda_engagement)."""
    client = get_client()
    raw = fetch_table(client, TABLE_SOCIAL_MEDIA_POSTS)
    logger.info("Fetched %d social media posts", len(raw))
    X, y, eda_engagement = build_features(raw)
    logger.info("Feature matrix: %d rows x %d cols", X.shape[0], X.shape[1])
    return X, y, eda_engagement


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    X, y, _ = build_training_frame()
    logger.info("ETL complete: %d rows x %d features", X.shape[0], X.shape[1])

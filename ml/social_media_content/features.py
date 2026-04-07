"""Feature engineering for social media content strategy."""

from __future__ import annotations

import numpy as np
import pandas as pd


TARGET = "donation_referrals"

# After-post engagement columns — used in EDA only, never as X variables.
AFTER_POST_COLS = [
    "shares", "likes", "comments", "saves",
    "impressions", "reach", "engagement_rate",
]

# Categorical columns to one-hot encode.
_CATEGORICAL = [
    "platform",
    "post_type",
    "media_type",
    "sentiment_tone",
    "content_topic",
    "call_to_action_type",
    "day_of_week",
]

# Boolean columns cast to int.
_BOOLEAN = [
    "features_resident_story",
    "has_call_to_action",
    "is_boosted",
]

# Numeric columns kept as-is (after null fill).
_NUMERIC = [
    "boost_budget_php",
    "caption_length",
    "num_hashtags",
    "post_hour",
]


def build_features(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """Build the modelling-ready feature matrix from raw social_media_posts.

    Returns
    -------
    X : DataFrame
        Before-post features (one-hot + boolean + numeric).
    y : Series
        Target variable (donation_referrals).
    eda_engagement : DataFrame
        After-post engagement columns for EDA correlation analysis.
    """
    df = raw.copy()

    # ── Target ────────────────────────────────────────────────────────────────
    y = pd.to_numeric(df[TARGET], errors="coerce").fillna(0).astype(float)

    # ── After-post engagement (EDA only) ──────────────────────────────────────
    eda_engagement = df[[c for c in AFTER_POST_COLS if c in df.columns]].apply(
        pd.to_numeric, errors="coerce"
    ).fillna(0)

    # ── Boolean features ──────────────────────────────────────────────────────
    for col in _BOOLEAN:
        if col in df.columns:
            df[col] = (
                df[col]
                .fillna(False)
                .astype(str)
                .str.strip()
                .str.lower()
                .map({"true": 1, "1": 1, "yes": 1, "false": 0, "0": 0, "no": 0})
                .fillna(0)
                .astype(int)
            )

    # ── Numeric features ──────────────────────────────────────────────────────
    for col in _NUMERIC:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # ── Categorical features (one-hot) ────────────────────────────────────────
    for col in _CATEGORICAL:
        if col in df.columns:
            df[col] = df[col].fillna("None").astype(str)

    dummies = pd.get_dummies(
        df[[c for c in _CATEGORICAL if c in df.columns]],
        drop_first=False,
    )

    # ── Assemble X ────────────────────────────────────────────────────────────
    bool_cols = [c for c in _BOOLEAN if c in df.columns]
    num_cols = [c for c in _NUMERIC if c in df.columns]

    X = pd.concat([df[bool_cols + num_cols], dummies], axis=1)

    return X, y, eda_engagement

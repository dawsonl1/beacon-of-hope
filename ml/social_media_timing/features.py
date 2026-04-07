"""Feature engineering for social media timing optimization.

This pipeline deliberately uses only *timing and format* features (before-post only)
to predict `engagement_rate`. Content features (sentiment, topic, etc.) are excluded
by design (see `pipeline-4b-social-media-timing.md`).
"""

from __future__ import annotations

import pandas as pd

TARGET = "engagement_rate"

# Categorical columns to one-hot encode.
_CATEGORICAL = [
    "platform",
    "day_of_week",
    "media_type",
    "post_type",
]

# Boolean columns cast to int (0/1).
_BOOLEAN = [
    "is_boosted",
    "has_call_to_action",
    "is_weekend",
]

# Numeric columns kept as-is (after null fill / type coercion).
_NUMERIC = [
    "post_hour",
    "boost_budget_php",
]


def _to_bool_int(series: pd.Series) -> pd.Series:
    return (
        series.fillna(False)
        .astype(str)
        .str.strip()
        .str.lower()
        .map({"true": 1, "1": 1, "yes": 1, "false": 0, "0": 0, "no": 0})
        .fillna(0)
        .astype(int)
    )


def _ensure_is_weekend(df: pd.DataFrame) -> pd.DataFrame:
    if "is_weekend" in df.columns:
        df["is_weekend"] = _to_bool_int(df["is_weekend"])
        return df

    if "day_of_week" not in df.columns:
        df["is_weekend"] = 0
        return df

    day = df["day_of_week"].fillna("").astype(str).str.strip().str.lower()
    df["is_weekend"] = day.isin(["saturday", "sunday"]).astype(int)
    return df


def build_features(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Build the modeling-ready feature matrix for timing optimization.

    Returns
    -------
    X : DataFrame
        Before-post timing + format features (one-hot + boolean + numeric).
    y : Series
        Target variable (engagement_rate), float.
    """
    df = raw.copy()

    # ── Target ────────────────────────────────────────────────────────────────
    y = pd.to_numeric(df.get(TARGET), errors="coerce").fillna(0).astype(float)

    # ── Numeric features ──────────────────────────────────────────────────────
    for col in _NUMERIC:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        else:
            df[col] = 0

    # ── Boolean features ──────────────────────────────────────────────────────
    for col in [c for c in _BOOLEAN if c != "is_weekend"]:
        if col in df.columns:
            df[col] = _to_bool_int(df[col])
        else:
            df[col] = 0

    df = _ensure_is_weekend(df)

    # ── Categorical features (one-hot) ────────────────────────────────────────
    for col in _CATEGORICAL:
        if col in df.columns:
            df[col] = df[col].fillna("None").astype(str)
        else:
            df[col] = "None"

    dummies = pd.get_dummies(
        df[_CATEGORICAL],
        drop_first=False,
    )

    bool_cols = _BOOLEAN
    num_cols = _NUMERIC
    X = pd.concat([df[bool_cols + num_cols], dummies], axis=1)

    return X, y


"""Feature engineering for incident early warning."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

import pandas as pd

RISK_MAP = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}

# Keep trauma weights aligned with reintegration readiness scoring.
TRAUMA_WEIGHTS = {
    "sub_cat_sexual_abuse": 3.0,
    "sub_cat_trafficked": 3.0,
    "sub_cat_osaec": 3.0,
    "sub_cat_physical_abuse": 2.0,
    "sub_cat_child_labor": 2.0,
    "sub_cat_at_risk": 1.0,
}

TARGET_SELF_HARM = "has_self_harm"
TARGET_RUNAWAY = "has_runaway"


def _to_bool(series: pd.Series) -> pd.Series:
    if series.dtype == bool:
        return series
    normalized = (
        series.fillna(False)
        .astype(str)
        .str.strip()
        .str.lower()
        .map({"true": True, "1": True, "yes": True, "false": False, "0": False, "no": False})
    )
    return normalized.fillna(False).astype(bool)


def _safe_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True)


def build_feature_frame(
    residents: pd.DataFrame,
    *,
    case_category_values: Iterable[str] | None = None,
    now_utc: datetime | None = None,
) -> pd.DataFrame:
    """Build intake-only resident feature frame (one row per resident)."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    df = residents.copy()
    df["date_of_birth"] = _safe_datetime(df.get("date_of_birth", pd.Series(index=df.index)))
    df["date_of_admission"] = _safe_datetime(df.get("date_of_admission", pd.Series(index=df.index)))

    age = ((df["date_of_admission"] - df["date_of_birth"]).dt.days / 365.25).clip(lower=0)
    df["age_at_admission"] = age.fillna(0)
    df["initial_risk_num"] = df.get("initial_risk_level").map(RISK_MAP).fillna(0).astype(float)

    trauma_score = pd.Series(0.0, index=df.index)
    for col, weight in TRAUMA_WEIGHTS.items():
        if col in df.columns:
            trauma_score += _to_bool(df[col]).astype(float) * weight
    df["trauma_severity_score"] = trauma_score

    family_cols = [c for c in df.columns if c.startswith("family_")]
    if family_cols:
        family_bool = pd.concat([_to_bool(df[c]) for c in family_cols], axis=1)
        df["family_vulnerability_score"] = family_bool.sum(axis=1)
    else:
        df["family_vulnerability_score"] = 0.0

    bool_features = [
        "sub_cat_sexual_abuse",
        "sub_cat_trafficked",
        "sub_cat_osaec",
        "sub_cat_physical_abuse",
        "has_special_needs",
        "is_pwd",
    ]
    for col in bool_features:
        if col in df.columns:
            df[col] = _to_bool(df[col]).astype(int)
        else:
            df[col] = 0

    df["case_category"] = df.get("case_category", pd.Series(index=df.index, dtype=object)).fillna("None").astype(str)
    case_dummies = pd.get_dummies(df["case_category"], prefix="case_category", dtype=int)
    if case_category_values:
        expected = [f"case_category_{cat}" for cat in case_category_values]
        for col in expected:
            if col not in case_dummies:
                case_dummies[col] = 0
        case_dummies = case_dummies[expected]

    keep_cols = [
        "resident_id",
        "age_at_admission",
        "initial_risk_num",
        "trauma_severity_score",
        "family_vulnerability_score",
        *bool_features,
    ]
    out = pd.concat([df[keep_cols], case_dummies], axis=1)
    return out.fillna(0)


def build_targets(residents: pd.DataFrame, incident_reports: pd.DataFrame) -> pd.DataFrame:
    """Build resident-level self-harm/runaway binary targets."""
    base = residents[["resident_id"]].drop_duplicates().copy()
    if incident_reports.empty:
        base[TARGET_SELF_HARM] = 0
        base[TARGET_RUNAWAY] = 0
        return base

    inc = incident_reports.copy()
    inc["incident_type"] = inc.get("incident_type", pd.Series(index=inc.index, dtype=object)).fillna("").astype(str)

    selfharm_ids = set(inc.loc[inc["incident_type"].eq("SelfHarm"), "resident_id"].dropna().astype(int).tolist())
    runaway_ids = set(inc.loc[inc["incident_type"].eq("RunawayAttempt"), "resident_id"].dropna().astype(int).tolist())

    base[TARGET_SELF_HARM] = base["resident_id"].astype(int).isin(selfharm_ids).astype(int)
    base[TARGET_RUNAWAY] = base["resident_id"].astype(int).isin(runaway_ids).astype(int)
    return base


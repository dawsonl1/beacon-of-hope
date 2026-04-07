"""Feature engineering for reintegration readiness."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

import numpy as np
import pandas as pd


RISK_MAP = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
POSITIVE_EMOTIONS = {"Happy", "Hopeful", "Calm"}
COOPERATIVE_LEVELS = {"Cooperative", "Highly Cooperative"}

# Higher weights for more severe trauma indicators.
TRAUMA_WEIGHTS = {
    "sub_cat_sexual_abuse": 3.0,
    "sub_cat_trafficked": 3.0,
    "sub_cat_osaec": 3.0,
    "sub_cat_physical_abuse": 2.0,
    "sub_cat_child_labor": 2.0,
    "sub_cat_at_risk": 1.0,
}


def _to_bool_series(series: pd.Series) -> pd.Series:
    if series.dtype == bool:
        return series
    normalized = series.fillna(False)
    if normalized.dtype == object:
        normalized = normalized.astype(str).str.strip().str.lower().map(
            {"true": True, "1": True, "yes": True, "false": False, "0": False, "no": False}
        )
    return normalized.fillna(False).astype(bool)


def _safe_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True)


def _positive_denominator(series: pd.Series) -> pd.Series:
    return series.replace(0, np.nan)


def engineer_resident_base_features(
    residents: pd.DataFrame,
    now_utc: datetime | None = None,
) -> pd.DataFrame:
    """Build resident-level base features from residents table."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    df = residents.copy()
    df["date_of_birth"] = _safe_datetime(df.get("date_of_birth"))
    df["date_of_admission"] = _safe_datetime(df.get("date_of_admission"))
    df["date_closed"] = _safe_datetime(df.get("date_closed"))

    close_dates = df["date_closed"].fillna(pd.Timestamp(now_utc))
    admission = df["date_of_admission"]

    df["age_at_admission"] = ((admission - df["date_of_birth"]).dt.days / 365.25).clip(lower=0)
    df["length_of_stay_days"] = (close_dates - admission).dt.days.clip(lower=0)
    df["length_of_stay_months"] = (df["length_of_stay_days"] / 30.44).clip(lower=1 / 30.44)

    df["initial_risk_num"] = df.get("initial_risk_level").map(RISK_MAP).fillna(0)
    df["current_risk_num"] = df.get("current_risk_level").map(RISK_MAP).fillna(0)
    df["risk_reduction"] = df["initial_risk_num"] - df["current_risk_num"]

    trauma_score = pd.Series(0.0, index=df.index)
    for col, weight in TRAUMA_WEIGHTS.items():
        if col in df.columns:
            trauma_score += _to_bool_series(df[col]).astype(float) * weight
    df["trauma_severity_score"] = trauma_score

    family_cols = [c for c in df.columns if c.startswith("family_")]
    if family_cols:
        family_bool = pd.concat([_to_bool_series(df[c]) for c in family_cols], axis=1)
        df["family_vulnerability_score"] = family_bool.sum(axis=1)
    else:
        df["family_vulnerability_score"] = 0

    keep_cols = [
        "resident_id",
        "case_category",
        "age_at_admission",
        "length_of_stay_days",
        "length_of_stay_months",
        "initial_risk_num",
        "current_risk_num",
        "risk_reduction",
        "trauma_severity_score",
        "family_vulnerability_score",
    ]
    return df[keep_cols].copy()


def engineer_health_features(health: pd.DataFrame) -> pd.DataFrame:
    if health.empty:
        return pd.DataFrame(columns=["resident_id", "avg_health", "health_trend", "checkup_compliance", "psych_checkups", "medical_checkups"])

    df = health.copy()
    df["recorded_at"] = _safe_datetime(df.get("recorded_at"))
    df["general_health_score"] = pd.to_numeric(df.get("general_health_score"), errors="coerce")

    grouped = df.sort_values(["resident_id", "recorded_at"]).groupby("resident_id", as_index=False)
    out = grouped.agg(
        avg_health=("general_health_score", "mean"),
        first_health=("general_health_score", "first"),
        last_health=("general_health_score", "last"),
        psych_checkups=("psychological_checkup_done", lambda s: _to_bool_series(s).sum()),
        medical_checkups=("medical_checkup_done", lambda s: _to_bool_series(s).sum()),
        checkup_compliance=("psychological_checkup_done", lambda s: _to_bool_series(s).mean()),
    )
    out["health_trend"] = out["last_health"] - out["first_health"]
    return out.drop(columns=["first_health", "last_health"])


def engineer_education_features(education: pd.DataFrame) -> pd.DataFrame:
    if education.empty:
        return pd.DataFrame(columns=["resident_id", "avg_progress", "avg_attendance", "courses_completed"])

    df = education.copy()
    df["progress_percent"] = pd.to_numeric(df.get("progress_percent"), errors="coerce")
    df["attendance_rate"] = pd.to_numeric(df.get("attendance_rate"), errors="coerce")
    status = df.get("completion_status", pd.Series(index=df.index, dtype=object)).fillna("").astype(str)
    df["is_completed"] = status.eq("Completed")

    out = df.groupby("resident_id", as_index=False).agg(
        avg_progress=("progress_percent", "mean"),
        avg_attendance=("attendance_rate", "mean"),
        courses_completed=("is_completed", "sum"),
    )
    return out


def engineer_process_features(process_recordings: pd.DataFrame) -> pd.DataFrame:
    if process_recordings.empty:
        return pd.DataFrame(
            columns=[
                "resident_id",
                "total_sessions",
                "positive_session_rate",
                "pct_concerns",
                "avg_duration",
            ]
        )

    df = process_recordings.copy()
    end_state = df.get("emotional_state_end", pd.Series(index=df.index, dtype=object)).fillna("").astype(str)
    df["is_positive"] = end_state.isin(POSITIVE_EMOTIONS)
    df["concerns_flagged"] = _to_bool_series(df.get("concerns_flagged", pd.Series(False, index=df.index)))
    df["session_duration_minutes"] = pd.to_numeric(df.get("session_duration_minutes"), errors="coerce")

    out = df.groupby("resident_id", as_index=False).agg(
        total_sessions=("resident_id", "size"),
        positive_session_rate=("is_positive", "mean"),
        pct_concerns=("concerns_flagged", "mean"),
        avg_duration=("session_duration_minutes", "mean"),
    )
    return out


def engineer_home_visit_features(home_visitations: pd.DataFrame) -> pd.DataFrame:
    if home_visitations.empty:
        return pd.DataFrame(
            columns=[
                "resident_id",
                "total_visits",
                "favorable_rate",
                "family_coop_rate",
                "safety_concern_rate",
                "post_placement_visits",
                "reintegration_assessments",
            ]
        )

    df = home_visitations.copy()
    outcome = df.get("visit_outcome", pd.Series(index=df.index, dtype=object)).fillna("").astype(str)
    coop = df.get("family_cooperation_level", pd.Series(index=df.index, dtype=object)).fillna("").astype(str)
    visit_type = df.get("visit_type", pd.Series(index=df.index, dtype=object)).fillna("").astype(str)

    df["is_favorable"] = outcome.eq("Favorable")
    df["is_cooperative"] = coop.isin(COOPERATIVE_LEVELS)
    df["safety_concerns_noted"] = _to_bool_series(df.get("safety_concerns_noted", pd.Series(False, index=df.index)))
    df["is_post_placement"] = visit_type.eq("Post-Placement Monitoring")
    df["is_reintegration_assessment"] = visit_type.eq("Reintegration Assessment")

    out = df.groupby("resident_id", as_index=False).agg(
        total_visits=("resident_id", "size"),
        favorable_rate=("is_favorable", "mean"),
        family_coop_rate=("is_cooperative", "mean"),
        safety_concern_rate=("safety_concerns_noted", "mean"),
        post_placement_visits=("is_post_placement", "sum"),
        reintegration_assessments=("is_reintegration_assessment", "sum"),
    )
    return out


def engineer_intervention_features(intervention_plans: pd.DataFrame) -> pd.DataFrame:
    """Resident-level aggregates from intervention_plans."""
    empty_cols = ["resident_id", "intervention_plan_count", "intervention_achieved_rate"]
    if intervention_plans.empty:
        return pd.DataFrame(columns=empty_cols)

    df = intervention_plans.copy()
    if "resident_id" not in df.columns:
        return pd.DataFrame(columns=empty_cols)

    status = df.get("status", pd.Series(index=df.index, dtype=object)).fillna("").astype(str).str.strip()
    st_lower = status.str.lower()
    df["is_achieved"] = st_lower.isin({"achieved", "completed", "complete"}) | st_lower.str.contains(
        "achiev", na=False
    )

    out = df.groupby("resident_id", as_index=False).agg(
        intervention_plan_count=("resident_id", "size"),
        intervention_achieved_rate=("is_achieved", "mean"),
    )
    return out


def build_reintegration_feature_frame(
    residents: pd.DataFrame,
    health: pd.DataFrame,
    education: pd.DataFrame,
    process_recordings: pd.DataFrame,
    home_visitations: pd.DataFrame,
    intervention_plans: pd.DataFrame | None = None,
    case_category_values: Iterable[str] | None = None,
) -> pd.DataFrame:
    """
    Return one row per resident with all engineered features and case_category one-hot.
    """
    if intervention_plans is None:
        intervention_plans = pd.DataFrame()

    base = engineer_resident_base_features(residents)
    health_f = engineer_health_features(health)
    edu_f = engineer_education_features(education)
    proc_f = engineer_process_features(process_recordings)
    visit_f = engineer_home_visit_features(home_visitations)
    int_f = engineer_intervention_features(intervention_plans)

    feature_df = base.merge(health_f, on="resident_id", how="left")
    feature_df = feature_df.merge(edu_f, on="resident_id", how="left")
    feature_df = feature_df.merge(proc_f, on="resident_id", how="left")
    feature_df = feature_df.merge(visit_f, on="resident_id", how="left")
    feature_df = feature_df.merge(int_f, on="resident_id", how="left")

    months = _positive_denominator(feature_df["length_of_stay_months"])
    feature_df["sessions_per_month"] = feature_df.get("total_sessions", 0) / months
    feature_df["visits_per_month"] = feature_df.get("total_visits", 0) / months

    case_dummies = pd.get_dummies(feature_df["case_category"], prefix="case_category", dtype=float)
    if case_category_values:
        expected_cols = [f"case_category_{cat}" for cat in case_category_values]
        for col in expected_cols:
            if col not in case_dummies:
                case_dummies[col] = 0.0
        case_dummies = case_dummies[expected_cols]
    feature_df = pd.concat([feature_df.drop(columns=["case_category"]), case_dummies], axis=1)

    feature_df = feature_df.fillna(0)
    return feature_df


def build_target(residents: pd.DataFrame) -> pd.Series:
    """Binary target where Completed = 1 else 0."""
    status = residents.get("reintegration_status", pd.Series(index=residents.index, dtype=object))
    return status.fillna("").astype(str).eq("Completed").astype(int)

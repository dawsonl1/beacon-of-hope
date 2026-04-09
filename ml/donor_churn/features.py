"""Feature engineering for donor churn."""

from __future__ import annotations

from datetime import date
from typing import Iterable

import pandas as pd


def _to_naive_timestamp(value: pd.Timestamp) -> pd.Timestamp:
    """Return timezone-naive timestamp for safe arithmetic."""
    if value.tzinfo is not None:
        return value.tz_localize(None)
    return value


def _normalize_date(value: str | pd.Timestamp | date | None) -> pd.Timestamp:
    if value is None:
        return _to_naive_timestamp(pd.Timestamp.utcnow()).normalize()
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return _to_naive_timestamp(pd.Timestamp.utcnow()).normalize()
    return _to_naive_timestamp(pd.Timestamp(parsed)).normalize()


def _safe_mean(values: Iterable[float]) -> float:
    seq = list(values)
    if not seq:
        return 0.0
    return float(pd.Series(seq, dtype="float64").mean())


def _trend_delta(values: list[float], window: int = 3) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return 0.0
    first = values[:window]
    last = values[-window:]
    return _safe_mean(last) - _safe_mean(first)


def compute_rule_tier(recency_days: float, gap_trend: float) -> str:
    """Deterministic donor-risk tier from operational thresholds."""
    if recency_days > 180:
        return "Critical"
    if recency_days > 90:
        return "High"
    if recency_days > 30 or gap_trend > 30:
        return "Medium"
    return "Low"


def compute_top_risk_factors(recency_days: float, gap_trend: float) -> list[str]:
    """Return triggered rule conditions for metadata transparency."""
    factors: list[str] = []
    if recency_days > 180:
        factors.append("recency_days > 180")
    elif recency_days > 90:
        factors.append("recency_days > 90")
    elif recency_days > 30:
        factors.append("recency_days > 30")
    if gap_trend > 30:
        factors.append("gap_trend > 30")
    return factors


def build_donor_feature_frame(
    supporters: pd.DataFrame,
    donations: pd.DataFrame,
    social_posts: pd.DataFrame | None = None,
    as_of_date: str | pd.Timestamp | date | None = None,
) -> pd.DataFrame:
    """Build one row per monetary donor with model-ready features."""
    as_of = _normalize_date(as_of_date)
    df_d = donations.copy()
    df_d["donation_type"] = df_d.get("donation_type", "").astype(str)
    df_d = df_d[df_d["donation_type"].str.lower().eq("monetary")].copy()
    if df_d.empty:
        return pd.DataFrame(columns=["supporter_id"])

    df_d["supporter_id"] = pd.to_numeric(df_d["supporter_id"], errors="coerce")
    df_d = df_d[df_d["supporter_id"].notna()].copy()
    df_d["supporter_id"] = df_d["supporter_id"].astype(int)
    df_d["donation_date"] = pd.to_datetime(df_d.get("donation_date"), errors="coerce").dt.tz_localize(None)
    df_d["amount"] = pd.to_numeric(df_d.get("amount"), errors="coerce").fillna(0.0)
    df_d["is_recurring"] = df_d.get("is_recurring", False).fillna(False).astype(bool)
    df_d["campaign_name"] = df_d.get("campaign_name", "").fillna("").astype(str).str.strip()
    df_d = df_d[df_d["donation_date"].notna()].copy()
    df_d = df_d.sort_values(["supporter_id", "donation_date"]).reset_index(drop=True)

    s = supporters.copy()
    s["supporter_id"] = pd.to_numeric(s["supporter_id"], errors="coerce")
    s = s[s["supporter_id"].notna()].copy()
    s["supporter_id"] = s["supporter_id"].astype(int)
    s = s.drop_duplicates("supporter_id")

    donor_ids = sorted(df_d["supporter_id"].unique().tolist())
    s = s[s["supporter_id"].isin(donor_ids)].copy()

    records: list[dict] = []
    for supporter_id, grp in df_d.groupby("supporter_id", sort=False):
        grp = grp.sort_values("donation_date")
        donation_dates = grp["donation_date"].tolist()
        amounts = grp["amount"].astype(float).tolist()

        first_date = donation_dates[0]
        last_date = donation_dates[-1]
        recency_days = float(max((as_of - last_date.normalize()).days, 0))
        frequency = int(len(grp))
        monetary_total = float(sum(amounts))
        monetary_avg = float(monetary_total / frequency) if frequency else 0.0
        monetary_last = float(amounts[-1]) if amounts else 0.0
        tenure_days = float(max((last_date.normalize() - first_date.normalize()).days, 0))
        is_recurring = int(bool(grp["is_recurring"].any()))

        gaps = grp["donation_date"].diff().dt.days.dropna().astype(float).tolist()
        avg_gap_days = _safe_mean(gaps)
        gap_trend = _trend_delta(gaps)
        amount_trend = _trend_delta(amounts)

        campaign_response_rate = 0.0
        missed_campaigns = 0.0
        if social_posts is not None and not social_posts.empty:
            campaigns = social_posts.copy()
            campaigns["campaign_name"] = campaigns.get("campaign_name", "").fillna("").astype(str).str.strip()
            campaigns["created_at"] = pd.to_datetime(campaigns.get("created_at"), errors="coerce").dt.tz_localize(None)
            campaigns = campaigns[(campaigns["campaign_name"] != "") & (campaigns["created_at"].notna())].copy()
            if not campaigns.empty:
                first_campaign_dates = (
                    campaigns.sort_values("created_at")
                    .drop_duplicates("campaign_name", keep="first")[["campaign_name", "created_at"]]
                )
                exposure = first_campaign_dates[
                    (first_campaign_dates["created_at"] >= first_date.normalize())
                    & (first_campaign_dates["created_at"] <= as_of)
                ]["campaign_name"]
                exposed = set(exposure.tolist())
                responded = set(grp.loc[grp["campaign_name"] != "", "campaign_name"].tolist()) & exposed
                if exposed:
                    campaign_response_rate = float(len(responded) / len(exposed))
                    missed_campaigns = float(len(exposed) - len(responded))

        records.append(
            {
                "supporter_id": int(supporter_id),
                "recency_days": recency_days,
                "frequency": float(frequency),
                "monetary_total": monetary_total,
                "monetary_avg": monetary_avg,
                "monetary_last": monetary_last,
                "avg_gap_days": avg_gap_days,
                "gap_trend": gap_trend,
                "amount_trend": amount_trend,
                "tenure_days": tenure_days,
                "is_recurring": float(is_recurring),
                "campaign_response_rate": campaign_response_rate,
                "missed_campaigns": missed_campaigns,
            }
        )

    features = pd.DataFrame(records)
    merged = features.merge(
        s[["supporter_id", "acquisition_channel", "relationship_type"]],
        on="supporter_id",
        how="left",
    )
    merged["acquisition_channel"] = merged["acquisition_channel"].fillna("Unknown").astype(str)
    merged["relationship_type"] = merged["relationship_type"].fillna("Unknown").astype(str)

    dummies = pd.get_dummies(
        merged[["acquisition_channel", "relationship_type"]],
        prefix=["acquisition_channel", "relationship_type"],
        drop_first=False,
    )
    final = pd.concat([merged.drop(columns=["acquisition_channel", "relationship_type"]), dummies], axis=1)
    final.columns = pd.Index([str(c) for c in final.columns])
    return final.fillna(0)


"""Nightly inference for reintegration drivers — one org-level insight row."""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd

from ml.config import MODEL_NAME_REINTEGRATION_DRIVERS, MODEL_REINTEGRATION_DRIVERS
from ml.reintegration_drivers.artifacts import load_metadata, load_model_bundle
from ml.utils_db import get_client, now_utc, write_predictions

logger = logging.getLogger(__name__)

# Human-readable explanations for infer (coefficients are on standardized scale).
FEATURE_INSIGHT_LABELS: dict[str, str] = {
    "visits_per_month": "A one standard deviation increase in home visits per month is associated with higher reintegration completion (holding other factors fixed).",
    "sessions_per_month": "A one standard deviation increase in counseling sessions per month is associated with the outcome (holding other factors fixed).",
    "positive_session_rate": "A higher share of sessions ending in positive emotional states is associated with the outcome.",
    "family_coop_rate": "Higher family cooperation during visits is associated with the outcome.",
    "favorable_rate": "A higher share of favorable visit outcomes is associated with the outcome.",
    "total_visits": "Total home visits over the stay are associated with the outcome (may overlap with visits per month — interpret with care).",
    "total_sessions": "Total counseling sessions are associated with the outcome.",
    "avg_health": "Average recorded health score is associated with the outcome.",
    "health_trend": "Change in health from first to last record is associated with the outcome.",
    "checkup_compliance": "Psychological checkup completion rate is associated with the outcome.",
    "trauma_severity_score": "Higher weighted trauma indicators are associated with the outcome.",
    "courses_completed": "Number of completed education courses is associated with the outcome.",
    "avg_progress": "Average education progress is associated with the outcome.",
    "avg_attendance": "Average attendance is associated with the outcome.",
    "age_at_admission": "Age at admission is associated with the outcome.",
    "length_of_stay_months": "Length of stay is associated with the outcome.",
    "initial_risk_num": "Initial risk level (numeric) is associated with the outcome.",
    "current_risk_num": "Current risk level (numeric) is associated with the outcome.",
    "risk_reduction": "Reduction in risk from initial to current is associated with the outcome.",
    "family_vulnerability_score": "Family vulnerability indicators are associated with the outcome.",
    "post_placement_visits": "Count of post-placement monitoring visits is associated with the outcome.",
    "reintegration_assessments": "Count of reintegration assessment visits is associated with the outcome.",
    "safety_concern_rate": "Rate of safety concerns noted on visits is associated with the outcome.",
    "intervention_plan_count": "Number of intervention plans is associated with the outcome.",
    "intervention_achieved_rate": "Share of plans marked achieved is associated with the outcome.",
    "case_category_Surrendered": "Case category (Surrendered vs reference) is associated with the outcome.",
    "case_category_Foundling": "Case category (Foundling vs reference) is associated with the outcome.",
    "case_category_Abandoned": "Case category (Abandoned vs reference) is associated with the outcome.",
    "case_category_Neglected": "Case category (Neglected vs reference) is associated with the outcome.",
}


def _load_model_version() -> str:
    metadata = load_metadata()
    if metadata:
        return str(metadata.get("model_version") or metadata.get("training_date") or "unknown")
    return "unknown"


def _default_label(feature: str, coef: float) -> str:
    template = FEATURE_INSIGHT_LABELS.get(feature)
    direction = "higher" if coef >= 0 else "lower"
    if template:
        return f"{template} Estimated standardized coefficient: {coef:+.3f} ({direction} completion probability in this linear model)."
    pretty = feature.replace("_", " ")
    return (
        f"A one standard deviation increase in {pretty} is associated with a "
        f"{'positive' if coef >= 0 else 'negative'} association with reintegration completion "
        f"(coefficient {coef:+.3f})."
    )


def _top_drivers_from_ols(ols: Any, max_features: int = 12) -> list[dict[str, Any]]:
    """Extract significant coefficients (excluding intercept), sorted by |coef|."""
    params = ols.params
    pvalues = ols.pvalues
    conf = ols.conf_int()

    rows: list[tuple[str, float, float, float, float, float]] = []
    for name in params.index:
        if name in ("const", "Intercept"):
            continue
        coef = float(params[name])
        pval = float(pvalues[name])
        if pval > 0.05:
            continue
        if name not in conf.index:
            continue
        row_ci = conf.loc[name]
        lo, hi = float(row_ci.iloc[0]), float(row_ci.iloc[1])
        rows.append((name, coef, pval, lo, hi, abs(coef)))

    rows.sort(key=lambda x: x[5], reverse=True)
    out: list[dict[str, Any]] = []
    for name, coef, pval, lo, hi, _ in rows[:max_features]:
        out.append(
            {
                "feature": name,
                "coefficient": round(coef, 6),
                "p_value": round(pval, 6),
                "ci_lower": round(lo, 6),
                "ci_upper": round(hi, 6),
                "label": _default_label(name, coef),
            }
        )
    return out


def _metadata_from_metrics_fallback() -> tuple[list[dict[str, Any]], float | None, int | None]:
    from ml.reintegration_drivers.artifacts import load_metrics

    m = load_metrics()
    drivers = m.get("ols_coefficients") or []
    top: list[dict[str, Any]] = []
    for row in drivers:
        if not isinstance(row, dict):
            continue
        feat = row.get("feature")
        coef = row.get("coefficient")
        pval = row.get("p_value", 1.0)
        if feat in ("const", "Intercept") or pval > 0.05:
            continue
        c = float(coef)
        top.append(
            {
                "feature": feat,
                "coefficient": c,
                "p_value": float(pval),
                "ci_lower": row.get("ci_lower"),
                "ci_upper": row.get("ci_upper"),
                "label": _default_label(str(feat), c),
            }
        )
    top.sort(key=lambda x: abs(x["coefficient"]), reverse=True)
    adj_r2 = m.get("adjusted_r2")
    n_obs = m.get("n_observations")
    return top[:12], float(adj_r2) if adj_r2 is not None else None, int(n_obs) if n_obs is not None else None


def run_inference() -> list[dict]:
    """Publish coefficient summary as a single org_insight row."""
    if not MODEL_REINTEGRATION_DRIVERS.exists():
        logger.warning("Skipping reintegration drivers: model file missing at %s", MODEL_REINTEGRATION_DRIVERS)
        return []

    bundle = load_model_bundle()
    ols = bundle.get("ols")
    if ols is None:
        logger.warning("Skipping reintegration drivers: bundle has no OLS results.")
        return []

    top_drivers = _top_drivers_from_ols(ols)
    if not top_drivers:
        top_drivers, adj_r2_fb, n_obs_fb = _metadata_from_metrics_fallback()
        adjusted_r2 = adj_r2_fb
        n_observations = n_obs_fb
    else:
        adjusted_r2 = float(ols.rsquared_adj) if hasattr(ols, "rsquared_adj") else None
        n_observations = int(ols.nobs) if hasattr(ols, "nobs") else None

    if adjusted_r2 is None:
        from ml.reintegration_drivers.artifacts import load_metrics

        m = load_metrics()
        ar = m.get("adjusted_r2")
        adjusted_r2 = float(ar) if ar is not None else None
        no = m.get("n_observations")
        n_observations = int(no) if no is not None else n_observations

    model_version = _load_model_version()
    timestamp = now_utc()

    metadata: dict[str, Any] = {
        "top_drivers": top_drivers,
        "adjusted_r2": adjusted_r2,
        "n_observations": n_observations,
    }

    record = {
        "entity_type": "org_insight",
        "entity_id": None,
        "model_name": MODEL_NAME_REINTEGRATION_DRIVERS,
        "model_version": model_version,
        "score": None,
        "score_label": "explainer",
        "predicted_at": timestamp,
        "metadata": metadata,
    }

    client = get_client()
    write_predictions(client, [record])
    logger.info("Wrote reintegration drivers org_insight prediction.")
    return [record]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()

"""Nightly inference for social media content — one org-level insight row."""

from __future__ import annotations

import logging
from typing import Any

from ml.config import MODEL_NAME_SOCIAL_CONTENT, MODEL_SOCIAL_CONTENT
from ml.social_media_content.artifacts import load_metadata, load_model_bundle, load_metrics
from ml.utils_db import get_client, now_utc, write_predictions

logger = logging.getLogger(__name__)

# Baselines for interpreting one-hot coefficients relative to a reference category.
_BASELINE_MAP = {
    "platform_": "LinkedIn",
    "post_type_": "ThankYou",
    "media_type_": "Text",
    "sentiment_tone_": "Informative",
    "content_topic_": "Gratitude",
    "call_to_action_type_": "None",
    "day_of_week_": "Monday",
}


def _load_model_version() -> str:
    metadata = load_metadata()
    if metadata:
        return str(metadata.get("model_version") or metadata.get("training_date") or "unknown")
    return "unknown"


def _plain_label(feature: str, effect: float) -> str:
    sign = "+" if effect >= 0 else "-"

    if feature in {"features_resident_story", "has_call_to_action", "is_boosted"}:
        verb = "adds" if effect >= 0 else "reduces by"
        return f"{feature} {verb} ~{abs(effect):.1f} donation referrals on average"

    if feature in {"boost_budget_php", "caption_length", "num_hashtags", "post_hour"}:
        return f"{feature}: {sign}{abs(effect):.2f} referrals per 1-unit increase"

    for prefix, baseline in _BASELINE_MAP.items():
        if feature.startswith(prefix):
            feat_name = feature[len(prefix):]
            return f"{feat_name} is ~{sign}{abs(effect):.1f} referrals vs {baseline}"

    return f"{feature}: {sign}{abs(effect):.1f} referrals"


def _top_findings_from_ols(ols: Any, max_features: int = 5) -> list[dict[str, Any]]:
    """Extract significant coefficients (excluding intercept), sorted by |coef|."""
    params = ols.params
    pvalues = ols.pvalues

    rows: list[tuple[str, float, float, float]] = []
    for name in params.index:
        if name in ("const", "Intercept"):
            continue
        coef = float(params[name])
        pval = float(pvalues[name])
        if pval > 0.05:
            continue
        rows.append((name, coef, pval, abs(coef)))

    rows.sort(key=lambda x: x[3], reverse=True)

    out: list[dict[str, Any]] = []
    for name, coef, pval, _ in rows[:max_features]:
        out.append({
            "feature": name,
            "effect": round(coef, 1),
            "label": _plain_label(name, coef),
        })
    return out


def _findings_from_metrics_fallback() -> tuple[list[dict[str, Any]], float | None, int | None]:
    m = load_metrics()
    coefficients = m.get("ols_coefficients") or []
    top: list[dict[str, Any]] = []
    for row in coefficients:
        if not isinstance(row, dict):
            continue
        feat = row.get("feature")
        coef = row.get("coefficient")
        pval = row.get("p_value", 1.0)
        if feat in ("const", "Intercept") or pval > 0.05:
            continue
        c = float(coef)
        top.append({
            "feature": feat,
            "effect": round(c, 1),
            "label": _plain_label(str(feat), c),
        })
    top.sort(key=lambda x: abs(x["effect"]), reverse=True)
    adj_r2 = m.get("adjusted_r2_test") or m.get("adjusted_r2_train")
    n_obs = m.get("n_observations")
    return top[:5], float(adj_r2) if adj_r2 is not None else None, int(n_obs) if n_obs is not None else None


def run_inference() -> list[dict]:
    """Publish coefficient summary as a single org_insight row."""
    if not MODEL_SOCIAL_CONTENT.exists():
        logger.warning("Skipping social media content: model file missing at %s", MODEL_SOCIAL_CONTENT)
        return []

    bundle = load_model_bundle()
    ols = bundle.get("model_business")
    if ols is None:
        logger.warning("Skipping social media content: bundle has no OLS results.")
        return []

    top_findings = _top_findings_from_ols(ols)
    if not top_findings:
        top_findings, adj_r2_fb, n_obs_fb = _findings_from_metrics_fallback()
        adjusted_r2 = adj_r2_fb
        n_observations = n_obs_fb
    else:
        adjusted_r2 = float(ols.rsquared_adj) if hasattr(ols, "rsquared_adj") else None
        n_observations = int(ols.nobs) if hasattr(ols, "nobs") else None

    if adjusted_r2 is None:
        m = load_metrics()
        ar = m.get("adjusted_r2_test") or m.get("adjusted_r2_train")
        adjusted_r2 = float(ar) if ar is not None else None
        no = m.get("n_observations")
        n_observations = int(no) if no is not None else n_observations

    model_version = _load_model_version()
    timestamp = now_utc()

    metadata: dict[str, Any] = {
        "top_findings": top_findings,
        "adjusted_r2": adjusted_r2,
        "n_observations": n_observations,
    }

    record = {
        "entity_type": "org_insight",
        "entity_id": None,
        "model_name": MODEL_NAME_SOCIAL_CONTENT,
        "model_version": model_version,
        "score": None,
        "score_label": "content_strategy",
        "predicted_at": timestamp,
        "metadata": metadata,
    }

    client = get_client()
    write_predictions(client, [record])
    logger.info("Wrote social media content org_insight prediction.")
    return [record]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run_inference()

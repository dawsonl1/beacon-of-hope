"""Training pipeline for incident risk drivers (explanatory dual logistic regression).

Mirrors ml-pipelines/incident-risk-drivers.ipynb.
Full pipeline: ETL → VIF pruning → EPV constraint → statsmodels Logit per target → save .sav
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from statsmodels.stats.outliers_influence import variance_inflation_factor

from ml.incident_risk_drivers.artifacts import save_model_bundle, save_metadata, save_metrics
from ml.incident_early_warning.etl import build_training_frame

logger = logging.getLogger(__name__)

RANDOM_STATE = 42
TEST_SIZE = 0.2
VIF_THRESHOLD = 5.0


def _drop_near_zero_variance(X: pd.DataFrame, threshold: float = 1e-6) -> pd.DataFrame:
    variances = X.var(numeric_only=True)
    low_var = variances[variances < threshold].index.tolist()
    if low_var:
        logger.info("Dropping %d near-zero variance features.", len(low_var))
    return X.drop(columns=low_var, errors="ignore")


def _iterative_vif_pruning(X: pd.DataFrame, threshold: float = VIF_THRESHOLD) -> list[str]:
    cols = list(X.columns)
    while len(cols) >= 2:
        arr = X[cols].values.astype(float)
        vifs = [variance_inflation_factor(arr, i) for i in range(len(cols))]
        max_vif = max(vifs)
        if max_vif <= threshold:
            break
        worst_idx = vifs.index(max_vif)
        dropped = cols.pop(worst_idx)
        logger.info("  VIF pruning: dropped %s (VIF=%.2f)", dropped, max_vif)
    return cols


def _select_by_epv(X_train, y_train, remaining_cols, epv_divisor=3):
    """Select top features constrained by Events Per Variable rule."""
    n_events = int(y_train.sum())
    max_features = max(2, n_events // epv_divisor)
    logger.info("  EPV rule: %d events → max %d features", n_events, max_features)

    corr_abs = X_train[remaining_cols].corrwith(y_train).abs().sort_values(ascending=False)
    selected = corr_abs.head(max_features).index.tolist()
    return selected


def _extract_coefficients(logit_model) -> list[dict]:
    params = logit_model.params
    pvalues = logit_model.pvalues
    conf = logit_model.conf_int()
    coefficients = []
    for feat in params.index:
        if feat == "const":
            continue
        coefficients.append({
            "feature": feat,
            "coefficient": float(params[feat]),
            "odds_ratio": float(np.exp(params[feat])),
            "p_value": float(pvalues[feat]),
            "ci_lower": float(conf.loc[feat, 0]),
            "ci_upper": float(conf.loc[feat, 1]),
        })
    return coefficients


def _train_single_target(
    target_name: str, X_train: pd.DataFrame, X_test: pd.DataFrame,
    y_train: pd.Series, y_test: pd.Series,
) -> tuple[object, list[str], list[dict], float]:
    """VIF → EPV → Logit for one target. Returns (model, features, coefficients, pseudo_r2)."""
    logger.info("Training target: %s", target_name)

    X_numeric = X_train.select_dtypes(include=[np.number])
    X_numeric = _drop_near_zero_variance(X_numeric)
    vif_cols = _iterative_vif_pruning(X_numeric)
    selected = _select_by_epv(X_numeric, y_train, vif_cols)
    logger.info("  Selected %d features: %s", len(selected), selected)

    scaler = StandardScaler()
    X_tr_scaled = pd.DataFrame(
        scaler.fit_transform(X_train[selected]), columns=selected, index=X_train.index,
    )
    X_tr_sm = sm.add_constant(X_tr_scaled)

    try:
        logit = sm.Logit(y_train, X_tr_sm).fit(disp=0, maxiter=200)
    except Exception:
        logger.warning("  Standard fit failed, trying regularized.")
        logit = sm.Logit(y_train, X_tr_sm).fit_regularized(alpha=0.1, disp=0)

    pseudo_r2 = float(logit.prsquared)
    coefficients = _extract_coefficients(logit)
    logger.info("  %s Pseudo-R²: %.4f", target_name, pseudo_r2)

    return logit, selected, coefficients, pseudo_r2


def run_training() -> dict:
    """Full training pipeline for dual-target incident risk drivers."""

    frame = build_training_frame()
    if frame.empty:
        logger.warning("No training data for incident risk drivers. Skipping.")
        return {}

    target_cols = ["has_self_harm", "has_runaway"]
    for col in target_cols:
        if col not in frame.columns:
            logger.warning("Missing target %s. Skipping.", col)
            return {}

    feature_cols = [c for c in frame.columns if c not in target_cols + ["resident_id"]]
    X = frame[feature_cols]
    y_sh = frame["has_self_harm"].astype(int)
    y_rw = frame["has_runaway"].astype(int)

    logger.info("Training incident risk drivers with %d rows, %d features.", len(X), len(feature_cols))

    X_train, X_test, y_sh_train, y_sh_test, y_rw_train, y_rw_test = train_test_split(
        X, y_sh, y_rw, test_size=TEST_SIZE, random_state=RANDOM_STATE,
    )

    sh_logit, sh_features, sh_coefficients, sh_pseudo_r2 = _train_single_target(
        "self-harm", X_train, X_test, y_sh_train, y_sh_test,
    )
    rw_logit, rw_features, rw_coefficients, rw_pseudo_r2 = _train_single_target(
        "runaway", X_train, X_test, y_rw_train, y_rw_test,
    )

    save_model_bundle(
        selfharm_logit=sh_logit,
        runaway_logit=rw_logit,
        feature_lists={"selfharm": sh_features, "runaway": rw_features},
    )
    save_metadata(
        model_type="Logistic Regression (statsmodels) - dual target",
        feature_list=list(set(sh_features + rw_features)),
        train_rows=len(X_train),
        test_rows=len(X_test),
        total_rows=len(X),
    )
    save_metrics(
        selfharm_coefficients=sh_coefficients,
        runaway_coefficients=rw_coefficients,
        selfharm_pseudo_r2=sh_pseudo_r2,
        runaway_pseudo_r2=rw_pseudo_r2,
        n_observations=len(X_train),
    )

    logger.info("Incident risk drivers models saved successfully.")
    return {
        "model_name": "incident-risk-drivers",
        "selfharm_pseudo_r2": sh_pseudo_r2,
        "runaway_pseudo_r2": rw_pseudo_r2,
        "n_train": len(X_train),
        "n_test": len(X_test),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    result = run_training()
    if result:
        logger.info("Training complete: %s", result)
    else:
        logger.warning("Training produced no results.")

"""Training pipeline for reintegration drivers (explanatory OLS).

Mirrors ml-pipelines/reintegration-drivers.ipynb.
Full pipeline: ETL → VIF pruning → OLS regression → coefficient analysis → save .sav
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from statsmodels.stats.outliers_influence import variance_inflation_factor

from ml.reintegration_drivers.artifacts import save_model_bundle, save_metadata, save_metrics
from ml.reintegration_readiness.etl import build_training_frame

logger = logging.getLogger(__name__)

RANDOM_STATE = 42
TEST_SIZE = 0.2
VIF_THRESHOLD = 10.0


def _drop_near_zero_variance(X: pd.DataFrame, threshold: float = 1e-12) -> pd.DataFrame:
    variances = X.var(numeric_only=True)
    low_var = variances[variances < threshold].index.tolist()
    if low_var:
        logger.info("Dropping %d near-zero variance features.", len(low_var))
    return X.drop(columns=low_var, errors="ignore")


def _drop_high_correlation(X: pd.DataFrame, threshold: float = 0.95) -> pd.DataFrame:
    corr = X.corr().abs()
    upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
    to_drop = [col for col in upper.columns if any(upper[col] > threshold)]
    if to_drop:
        logger.info("Dropping %d highly correlated features: %s", len(to_drop), to_drop)
    return X.drop(columns=to_drop, errors="ignore")


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


def _extract_coefficients(ols_model) -> list[dict]:
    params = ols_model.params
    pvalues = ols_model.pvalues
    conf = ols_model.conf_int()
    bse = ols_model.bse
    coefficients = []
    for feat in params.index:
        if feat == "const":
            continue
        coefficients.append({
            "feature": feat,
            "coefficient": float(params[feat]),
            "std_err": float(bse[feat]),
            "p_value": float(pvalues[feat]),
            "ci_lower": float(conf.loc[feat, 0]),
            "ci_upper": float(conf.loc[feat, 1]),
        })
    return coefficients


def run_training() -> dict:
    """Full training pipeline: ETL → VIF → OLS → save."""

    frame = build_training_frame()
    if frame.empty or "reintegration_complete" not in frame.columns:
        logger.warning("No training data for reintegration drivers. Skipping.")
        return {}

    X = frame.drop(columns=["reintegration_complete", "resident_id"], errors="ignore")
    y = frame["reintegration_complete"].astype(float)

    logger.info("Training reintegration drivers with %d rows, %d features.", len(X), len(X.columns))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y.astype(int),
    )

    # Feature selection
    X_numeric = X_train.select_dtypes(include=[np.number])
    X_numeric = _drop_near_zero_variance(X_numeric)
    X_numeric = _drop_high_correlation(X_numeric)
    selected_features = _iterative_vif_pruning(X_numeric)
    logger.info("Selected %d features after VIF: %s", len(selected_features), selected_features)

    # Standardize
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(
        scaler.fit_transform(X_train[selected_features]),
        columns=selected_features, index=X_train.index,
    )
    X_test_scaled = pd.DataFrame(
        scaler.transform(X_test[selected_features]),
        columns=selected_features, index=X_test.index,
    )

    # Fit OLS
    X_train_sm = sm.add_constant(X_train_scaled)
    ols_model = sm.OLS(y_train, X_train_sm).fit()
    adjusted_r2 = float(ols_model.rsquared_adj)
    logger.info("OLS Adjusted R²: %.4f", adjusted_r2)

    ols_coefficients = _extract_coefficients(ols_model)
    for c in ols_coefficients:
        logger.info("  %s: coef=%.4f, p=%.4f", c["feature"], c["coefficient"], c["p_value"])

    # Attempt Logit for comparison
    logit_model = None
    pseudo_r2 = None
    logit_coefficients = None
    try:
        logit_model = sm.Logit(y_train.astype(int), X_train_sm).fit(disp=0, maxiter=200)
        pseudo_r2 = float(logit_model.prsquared)
        logit_coefficients = _extract_coefficients(logit_model)
        logger.info("Logit Pseudo-R²: %.4f", pseudo_r2)
    except Exception as e:
        logger.warning("Logit fit failed: %s", e)

    # Cross-validation R²
    cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(
        LinearRegression(), X_train_scaled, y_train, cv=cv, scoring="r2",
    )
    logger.info("5-fold CV R²: %.4f ± %.4f", cv_scores.mean(), cv_scores.std())

    # Save
    save_model_bundle(
        ols_results=ols_model, scaler=scaler,
        feature_list=selected_features, logit_results=logit_model,
    )
    save_metadata(
        model_type="OLS_explanatory",
        feature_list=selected_features,
        train_rows=len(X_train), test_rows=len(X_test), total_rows=len(X),
    )
    save_metrics(
        adjusted_r2=adjusted_r2,
        pseudo_r2=pseudo_r2,
        n_observations=len(X_train),
        ols_coefficients=ols_coefficients,
        logit_coefficients=logit_coefficients,
    )

    logger.info("Reintegration drivers model saved successfully.")
    return {
        "model_name": "reintegration-drivers",
        "adjusted_r2": adjusted_r2,
        "pseudo_r2": pseudo_r2,
        "n_features": len(selected_features),
        "n_train": len(X_train), "n_test": len(X_test),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    result = run_training()
    if result:
        logger.info("Training complete: %s", result)
    else:
        logger.warning("Training produced no results.")

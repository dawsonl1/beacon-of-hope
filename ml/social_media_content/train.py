"""Training pipeline for social media content strategy (explanatory OLS).

Mirrors ml-pipelines/social-media-content-strategy.ipynb.
Full pipeline: ETL → VIF → backward elimination → OLS + comparison models → save .sav
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.feature_selection import VarianceThreshold
from sklearn.linear_model import ElasticNet, Lasso, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, KFold, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeRegressor
from statsmodels.stats.outliers_influence import variance_inflation_factor

from ml.social_media_content.artifacts import save_model_bundle, save_metadata, save_metrics
from ml.social_media_content.etl import build_training_frame

logger = logging.getLogger(__name__)

RANDOM_STATE = 42
TEST_SIZE = 0.2
BACKWARD_ELIM_THRESHOLD = 0.05


def _backward_elimination(X_train: pd.DataFrame, y_train: pd.Series) -> list[str]:
    """Iteratively remove features with p-value > threshold from OLS."""
    features = list(X_train.columns)
    while len(features) > 1:
        X_sm = sm.add_constant(X_train[features])
        model = sm.OLS(y_train, X_sm).fit()
        pvalues = model.pvalues.drop("const", errors="ignore")
        max_p = pvalues.max()
        if max_p <= BACKWARD_ELIM_THRESHOLD:
            break
        worst = pvalues.idxmax()
        logger.info("  Backward elimination: dropping %s (p=%.4f)", worst, max_p)
        features.remove(worst)
    return features


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
    """Full training pipeline: ETL → backward elimination → OLS → save."""

    result = build_training_frame()
    if isinstance(result, tuple):
        X, y, _ = result
    else:
        logger.warning("Unexpected ETL output for social media content. Skipping.")
        return {}

    if X.empty or y.empty:
        logger.warning("No training data for social media content. Skipping.")
        return {}

    logger.info("Training social media content model with %d rows, %d features.", len(X), len(X.columns))

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE,
    )

    # Variance filter
    vt = VarianceThreshold()
    vt.fit(X_train)
    keep_cols = X_train.columns[vt.get_support()].tolist()
    X_train = X_train[keep_cols]
    X_test = X_test[keep_cols]

    # Identify numeric columns for standardization
    num_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()
    # All columns should be numeric after one-hot encoding in features.py

    # Backward elimination on OLS
    selected_features = _backward_elimination(X_train, y_train)
    logger.info("Selected %d features after backward elimination.", len(selected_features))

    X_train_sel = X_train[selected_features]
    X_test_sel = X_test[selected_features]

    # Standardize numeric subset for comparison models
    num_cols_present = [c for c in num_cols if c in selected_features]
    scaler = StandardScaler()
    X_train_std = X_train_sel.copy()
    X_test_std = X_test_sel.copy()
    if num_cols_present:
        X_train_std[num_cols_present] = scaler.fit_transform(X_train_sel[num_cols_present])
        X_test_std[num_cols_present] = scaler.transform(X_test_sel[num_cols_present])

    # Fit primary OLS (unstandardized for business interpretation)
    X_train_sm = sm.add_constant(X_train_sel)
    X_test_sm = sm.add_constant(X_test_sel)
    ols_business = sm.OLS(y_train, X_train_sm).fit()

    # Fit standardized OLS
    X_train_std_sm = sm.add_constant(X_train_std)
    ols_std = sm.OLS(y_train, X_train_std_sm).fit()

    # Evaluate
    y_pred = ols_business.predict(X_test_sm)
    r2_test = float(r2_score(y_test, y_pred))
    n, p = len(y_test), len(selected_features)
    adj_r2_test = float(1 - (1 - r2_test) * (n - 1) / (n - p - 1)) if n > p + 1 else r2_test
    mae_test = float(mean_absolute_error(y_test, y_pred))
    rmse_test = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    adj_r2_train = float(ols_business.rsquared_adj)

    logger.info("OLS Train Adj-R²=%.4f, Test R²=%.4f, MAE=%.4f, RMSE=%.4f",
                adj_r2_train, r2_test, mae_test, rmse_test)

    # Cross-validation MAE
    cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_mae = cross_val_score(
        Ridge(alpha=1.0), X_train_sel, y_train, cv=cv, scoring="neg_mean_absolute_error",
    )
    logger.info("5-fold CV MAE: %.4f ± %.4f", -cv_mae.mean(), cv_mae.std())

    # Comparison models (logged but not saved)
    for name, model in [
        ("Ridge", Ridge(alpha=1.0)),
        ("Lasso", Lasso(alpha=1.0)),
        ("ElasticNet", ElasticNet(alpha=1.0, l1_ratio=0.5)),
        ("DecisionTree", DecisionTreeRegressor(max_depth=4, random_state=RANDOM_STATE)),
    ]:
        model.fit(X_train_sel, y_train)
        pred = model.predict(X_test_sel)
        r2 = r2_score(y_test, pred)
        mae = mean_absolute_error(y_test, pred)
        logger.info("  %s: R²=%.4f, MAE=%.4f", name, r2, mae)

    coef_table_business = _extract_coefficients(ols_business)
    coef_table_std = _extract_coefficients(ols_std)

    # Save
    save_model_bundle(
        ols_business=ols_business,
        ols_std=ols_std,
        scaler=scaler,
        numeric_cols=num_cols_present,
        feature_list=selected_features,
    )
    save_metadata(
        model_type="OLS_content_strategy",
        feature_list=selected_features,
        train_rows=len(X_train), test_rows=len(X_test), total_rows=len(X),
    )
    save_metrics(
        adjusted_r2=adj_r2_train,
        r2_test=r2_test,
        adjusted_r2_test=adj_r2_test,
        mae_test=mae_test,
        rmse_test=rmse_test,
        n_observations=len(X_train),
        ols_coefficients=coef_table_business,
    )

    logger.info("Social media content model saved successfully.")
    return {
        "model_name": "social-media-content",
        "adj_r2_train": adj_r2_train,
        "r2_test": r2_test, "mae_test": mae_test, "rmse_test": rmse_test,
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

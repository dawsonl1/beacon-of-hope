"""Training pipeline for donor churn drivers (explanatory logistic regression).

Mirrors ml-pipelines/donor-churn-drivers.ipynb.
Full pipeline: ETL → VIF pruning → EPV constraint → statsmodels Logit → odds ratios → save .sav
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

from ml.donor_churn_drivers.artifacts import save_model_bundle, save_metadata, save_metrics
from ml.donor_churn_drivers.etl import build_training_frame

logger = logging.getLogger(__name__)

RANDOM_STATE = 42
TEST_SIZE = 0.2
VIF_THRESHOLD = 5.0


def _drop_near_zero_variance(X: pd.DataFrame, threshold: float = 1e-6) -> pd.DataFrame:
    variances = X.var(numeric_only=True)
    low_var = variances[variances < threshold].index.tolist()
    if low_var:
        logger.info("Dropping %d near-zero variance features: %s", len(low_var), low_var)
    return X.drop(columns=low_var, errors="ignore")


def _iterative_vif_pruning(X: pd.DataFrame, threshold: float = VIF_THRESHOLD) -> list[str]:
    """Iteratively remove the feature with the highest VIF until all are below threshold."""
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


def _select_by_epv_and_correlation(
    X_train: pd.DataFrame, y_train: pd.Series, remaining_cols: list[str],
) -> list[str]:
    """Select top features by correlation, constrained by Events Per Variable rule."""
    n_events = int(y_train.sum())
    max_features = min(6, max(2, n_events // 10))
    logger.info("EPV rule: %d events → max %d features", n_events, max_features)

    corr_abs = X_train[remaining_cols].corrwith(y_train).abs().sort_values(ascending=False)
    selected = corr_abs.head(max_features).index.tolist()
    logger.info("Selected %d features by correlation: %s", len(selected), selected)
    return selected


def _extract_coefficients(logit_model) -> list[dict]:
    """Extract coefficient table with odds ratios from statsmodels Logit result."""
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


def run_training() -> dict:
    """Full training pipeline: ETL → VIF → EPV → Logit → save."""

    # ── 1. ETL ───────────────────────────────────────────────────────────────
    frame = build_training_frame()
    if frame.empty or "churned" not in frame.columns:
        logger.warning("No training data available for donor churn drivers. Skipping.")
        return {}

    X = frame.drop(columns=["churned", "supporter_id"], errors="ignore")
    y = frame["churned"].astype(int)

    if len(y.unique()) < 2:
        logger.warning("Only one class present. Skipping training.")
        return {}

    logger.info("Training donor churn drivers with %d rows, %d features.", len(X), len(X.columns))

    # ── 2. Train/test split ──────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y,
    )

    # ── 3. Feature selection ─────────────────────────────────────────────────
    X_train_numeric = X_train.select_dtypes(include=[np.number])
    X_train_numeric = _drop_near_zero_variance(X_train_numeric)
    vif_cols = _iterative_vif_pruning(X_train_numeric)
    selected_features = _select_by_epv_and_correlation(X_train_numeric, y_train, vif_cols)

    # ── 4. Standardize ──────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_train_scaled = pd.DataFrame(
        scaler.fit_transform(X_train[selected_features]),
        columns=selected_features, index=X_train.index,
    )
    X_test_scaled = pd.DataFrame(
        scaler.transform(X_test[selected_features]),
        columns=selected_features, index=X_test.index,
    )

    # ── 5. Fit statsmodels Logit ─────────────────────────────────────────────
    X_train_sm = sm.add_constant(X_train_scaled)
    try:
        logit_model = sm.Logit(y_train, X_train_sm).fit(disp=0, maxiter=200)
        # Detect quasi-complete separation: if any coefficient is absurdly large,
        # the model didn't converge meaningfully. Fall back to regularized fit.
        max_coef = float(logit_model.params.drop("const", errors="ignore").abs().max())
        if max_coef > 20:
            logger.warning(
                "Max coefficient magnitude %.1f suggests separation. Using regularized fit.",
                max_coef,
            )
            logit_model = sm.Logit(y_train, X_train_sm).fit_regularized(alpha=1.0, disp=0)
    except Exception:
        logger.warning("Standard fit failed, trying regularized fit.")
        logit_model = sm.Logit(y_train, X_train_sm).fit_regularized(alpha=1.0, disp=0)

    pseudo_r2 = float(logit_model.prsquared)
    logger.info("Logit Pseudo-R²: %.4f", pseudo_r2)

    coefficients = _extract_coefficients(logit_model)
    for c in coefficients:
        logger.info("  %s: coef=%.4f, OR=%.4f, p=%.4f", c["feature"], c["coefficient"], c["odds_ratio"], c["p_value"])

    # ── 6. Cross-validation (sklearn LogisticRegression for AUC) ─────────────
    n_folds = min(5, y_train.value_counts().min())
    if n_folds >= 2:
        cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=RANDOM_STATE)
        cv_scores = cross_val_score(
            LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
            X_train_scaled, y_train, cv=cv, scoring="accuracy",
        )
        logger.info("5-fold CV accuracy: %.4f ± %.4f", cv_scores.mean(), cv_scores.std())

    # ── 7. Save artifacts ────────────────────────────────────────────────────
    save_model_bundle(logit_results=logit_model, scaler=scaler, feature_list=selected_features)
    save_metadata(
        model_type="logistic_regression_explanatory",
        feature_list=selected_features,
        train_rows=len(X_train),
        test_rows=len(X_test),
        total_rows=len(X),
    )
    save_metrics(
        pseudo_r2=pseudo_r2,
        n_observations=len(X_train),
        coefficients=coefficients,
    )

    logger.info("Donor churn drivers model saved successfully.")
    return {
        "model_name": "donor-churn-drivers",
        "model_type": "logistic_regression_explanatory",
        "pseudo_r2": pseudo_r2,
        "n_features": len(selected_features),
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

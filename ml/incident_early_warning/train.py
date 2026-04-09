"""Training pipeline for incident early warning dual classifier.

Mirrors ml-pipelines/incident-early-warning.ipynb.
Full pipeline: ETL → 4 models per target (self-harm, runaway) → PFI feature pruning → save .sav
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.feature_selection import VarianceThreshold
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from ml.incident_early_warning.artifacts import save_model_bundle, save_metadata, save_metrics
from ml.incident_early_warning.etl import build_training_frame

logger = logging.getLogger(__name__)

RANDOM_STATE = 42
TEST_SIZE = 0.2
THRESHOLD = 0.35
PFI_DROP_FRACTION = 0.2
PFI_AUC_TOLERANCE = 0.02
PFI_MIN_FEATURES = 3
PFI_MAX_ITERATIONS = 10


def _build_candidates() -> list[tuple[str, Pipeline, dict]]:
    """4 candidate models mirroring the notebook."""
    return [
        ("LogReg",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE))]),
         {"clf__C": [0.01, 0.1, 1.0, 10.0]}),

        ("DecisionTree",
         Pipeline([("clf", DecisionTreeClassifier(class_weight="balanced", random_state=RANDOM_STATE))]),
         {"clf__max_depth": [2, 3, 4], "clf__min_samples_leaf": [1, 2, 4]}),

        ("RandomForest",
         Pipeline([("clf", RandomForestClassifier(n_estimators=200, class_weight="balanced", random_state=RANDOM_STATE))]),
         {"clf__max_depth": [None, 4, 8], "clf__min_samples_leaf": [1, 2]}),

        ("GradientBoosting",
         Pipeline([("clf", GradientBoostingClassifier(random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [100, 200], "clf__learning_rate": [0.05, 0.1], "clf__max_depth": [2, 3]}),
    ]


def _run_grid_search(candidates, X_train, y_train, cv):
    results = []
    for name, pipeline, param_grid in candidates:
        logger.info("  Training %s ...", name)
        gs = GridSearchCV(pipeline, param_grid, cv=cv, scoring="roc_auc", n_jobs=-1, refit=True)
        gs.fit(X_train, y_train)
        auc = float(gs.best_score_)
        logger.info("    %s CV AUC: %.4f", name, auc)
        results.append({"name": name, "best_estimator": gs.best_estimator_, "cv_auc": auc})
    results.sort(key=lambda r: r["cv_auc"], reverse=True)
    return results


def _pfi_feature_selection(best_est, candidates, X_train, X_test, y_train, y_test, cv):
    """Iterative PFI pruning, re-running model selection each round."""
    current_features = list(X_train.columns)

    for iteration in range(PFI_MAX_ITERATIONS):
        if len(current_features) <= PFI_MIN_FEATURES:
            break

        X_tr = X_train[current_features]
        X_te = X_test[current_features]

        iter_results = _run_grid_search(candidates, X_tr, y_train, cv)
        iter_best = iter_results[0]

        iter_best["best_estimator"].fit(X_tr, y_train)
        perm = permutation_importance(
            iter_best["best_estimator"], X_te, y_test,
            n_repeats=10, random_state=RANDOM_STATE, scoring="roc_auc",
        )
        pfi_df = pd.DataFrame({
            "feature": current_features,
            "importance": perm.importances_mean,
        }).sort_values("importance", ascending=True)

        n_to_drop = max(1, int(len(current_features) * PFI_DROP_FRACTION))
        if len(current_features) - n_to_drop < PFI_MIN_FEATURES:
            n_to_drop = len(current_features) - PFI_MIN_FEATURES
        if n_to_drop == 0:
            break

        features_to_drop = set(pfi_df.head(n_to_drop)["feature"].tolist())
        remaining = [f for f in current_features if f not in features_to_drop]

        logger.info("    PFI round %d: %d → %d features, best=%s, AUC=%.4f",
                     iteration + 1, len(current_features), len(remaining),
                     iter_best["name"], iter_best["cv_auc"])

        best_est = iter_best["best_estimator"]
        current_features = remaining

    return best_est, current_features


def _train_single_target(
    target_name: str, X_train: pd.DataFrame, X_test: pd.DataFrame,
    y_train: pd.Series, y_test: pd.Series,
) -> tuple[object, list[str], dict]:
    """Train, prune, evaluate for one target."""
    logger.info("Training target: %s", target_name)

    # Remove zero-variance features
    vt = VarianceThreshold(threshold=0.0)
    vt.fit(X_train)
    keep_cols = X_train.columns[vt.get_support()].tolist()
    X_tr = X_train[keep_cols]
    X_te = X_test[keep_cols]

    n_folds = min(5, y_train.value_counts().min())
    if n_folds < 2:
        n_folds = 2
    cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=RANDOM_STATE)

    candidates = _build_candidates()
    results = _run_grid_search(candidates, X_tr, y_train, cv)
    best_est = results[0]["best_estimator"]

    # PFI feature pruning
    best_est, final_features = _pfi_feature_selection(
        best_est, candidates, X_tr, X_te, y_train, y_test, cv,
    )

    # Final evaluation
    X_tr_final = X_train[final_features]
    X_te_final = X_test[final_features]
    best_est.fit(X_tr_final, y_train)
    y_proba = best_est.predict_proba(X_te_final)[:, 1]
    y_pred = (y_proba >= THRESHOLD).astype(int)

    metrics = {
        "selected_model": type(best_est).__name__ if not isinstance(best_est, Pipeline) else str(best_est),
        "selected_features": final_features,
        "n_features": len(final_features),
        "roc_auc": float(roc_auc_score(y_test, y_proba)) if len(y_test.unique()) > 1 else 0.0,
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
    }
    logger.info("  %s: AUC=%.4f, Recall=%.4f, F1=%.4f", target_name, metrics["roc_auc"], metrics["recall"], metrics["f1"])

    return best_est, final_features, metrics


def run_training() -> dict:
    """Full training pipeline for dual-target incident early warning."""

    # ── 1. ETL ───────────────────────────────────────────────────────────────
    frame = build_training_frame()
    if frame.empty:
        logger.warning("No training data available for incident early warning. Skipping.")
        return {}

    target_cols = ["has_self_harm", "has_runaway"]
    for col in target_cols:
        if col not in frame.columns:
            logger.warning("Missing target column %s. Skipping.", col)
            return {}

    feature_cols = [c for c in frame.columns if c not in target_cols + ["resident_id"]]
    X = frame[feature_cols]
    y_sh = frame["has_self_harm"].astype(int)
    y_rw = frame["has_runaway"].astype(int)

    logger.info("Training incident early warning with %d rows, %d features.", len(X), len(feature_cols))

    # ── 2. Train/test split (same indices for both targets) ──────────────────
    X_train, X_test, y_sh_train, y_sh_test, y_rw_train, y_rw_test = train_test_split(
        X, y_sh, y_rw, test_size=TEST_SIZE, random_state=RANDOM_STATE,
    )

    # ── 3. Train self-harm model ─────────────────────────────────────────────
    sh_model, sh_features, sh_metrics = _train_single_target(
        "self-harm", X_train, X_test, y_sh_train, y_sh_test,
    )

    # ── 4. Train runaway model ───────────────────────────────────────────────
    rw_model, rw_features, rw_metrics = _train_single_target(
        "runaway", X_train, X_test, y_rw_train, y_rw_test,
    )

    # ── 5. Save artifacts ────────────────────────────────────────────────────
    all_features = list(set(sh_features + rw_features))

    save_model_bundle(selfharm_model=sh_model, runaway_model=rw_model, feature_list=all_features)
    save_metadata(
        model_type="dual_classifier",
        feature_list=all_features,
        train_rows=len(X_train),
        test_rows=len(X_test),
        total_rows=len(X),
    )
    save_metrics(selfharm_metrics=sh_metrics, runaway_metrics=rw_metrics)

    logger.info("Incident early warning models saved successfully.")
    return {
        "model_name": "incident-early-warning",
        "selfharm_auc": sh_metrics["roc_auc"],
        "runaway_auc": rw_metrics["roc_auc"],
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

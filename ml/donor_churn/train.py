"""Training pipeline for donor churn classifier.

Mirrors ml-pipelines/donor-churn-classifier.ipynb.
Full pipeline: ETL → feature engineering → 9 models + stacking → PFI feature pruning → evaluate → save .sav
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import (
    AdaBoostClassifier,
    ExtraTreesClassifier,
    GradientBoostingClassifier,
    RandomForestClassifier,
    StackingClassifier,
)
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    roc_auc_score,
)
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

from ml.donor_churn.artifacts import save_metadata, save_metrics, save_model_bundle
from ml.donor_churn.etl import build_training_frame

logger = logging.getLogger(__name__)

RANDOM_STATE = 42
TEST_SIZE = 0.2
PFI_DROP_FRACTION = 0.2
PFI_MIN_FEATURES = 4


def _build_candidates() -> list[tuple[str, Pipeline, dict]]:
    """All 9 candidate models with param grids, mirroring the notebook."""
    return [
        ("LogisticRegression",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", LogisticRegression(class_weight="balanced", max_iter=2000, random_state=RANDOM_STATE))]),
         {"clf__C": [0.01, 0.1, 1.0, 10.0]}),

        ("DecisionTree",
         Pipeline([("clf", DecisionTreeClassifier(random_state=RANDOM_STATE))]),
         {"clf__max_depth": [2, 3, 4, 6, None], "clf__min_samples_leaf": [1, 2, 4]}),

        ("KNeighbors",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", KNeighborsClassifier())]),
         {"clf__n_neighbors": [3, 5, 7, 9], "clf__weights": ["uniform", "distance"]}),

        ("SVC",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", SVC(probability=True, random_state=RANDOM_STATE))]),
         {"clf__C": [0.1, 1.0, 10.0], "clf__kernel": ["linear", "rbf"]}),

        ("GaussianNB",
         Pipeline([("clf", GaussianNB())]),
         {"clf__var_smoothing": [1e-9, 1e-8, 1e-7]}),

        ("RandomForest",
         Pipeline([("clf", RandomForestClassifier(class_weight="balanced", random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [100, 300], "clf__max_depth": [None, 4, 8], "clf__min_samples_leaf": [1, 2]}),

        ("GradientBoosting",
         Pipeline([("clf", GradientBoostingClassifier(random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [100, 300], "clf__learning_rate": [0.03, 0.1], "clf__max_depth": [2, 3]}),

        ("AdaBoost",
         Pipeline([("clf", AdaBoostClassifier(random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [50, 100, 300], "clf__learning_rate": [0.03, 0.1, 1.0]}),

        ("ExtraTrees",
         Pipeline([("clf", ExtraTreesClassifier(class_weight="balanced", random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [100, 300], "clf__max_depth": [None, 4, 8]}),
    ]


def _run_grid_search(
    candidates: list[tuple[str, Pipeline, dict]],
    X_train: pd.DataFrame,
    y_train: pd.Series,
    cv: StratifiedKFold,
) -> list[dict]:
    """Run GridSearchCV for each candidate. Returns sorted results (best first)."""
    results = []
    for name, pipeline, param_grid in candidates:
        logger.info("Training %s ...", name)
        gs = GridSearchCV(
            estimator=pipeline,
            param_grid=param_grid,
            cv=cv,
            scoring="roc_auc",
            n_jobs=-1,
            refit=True,
        )
        gs.fit(X_train, y_train)
        auc = float(gs.best_score_)
        logger.info("  %s CV AUC: %.4f  params: %s", name, auc, gs.best_params_)
        results.append({
            "name": name,
            "best_estimator": gs.best_estimator_,
            "best_params": gs.best_params_,
            "cv_auc": auc,
        })
    results.sort(key=lambda r: r["cv_auc"], reverse=True)
    return results


def _build_stacking_candidate(
    results: list[dict],
    X_train: pd.DataFrame,
    y_train: pd.Series,
    cv: StratifiedKFold,
) -> dict | None:
    """Build a stacking ensemble from the top 3 models and score it."""
    if len(results) < 3:
        return None

    top3 = results[:3]
    estimators = [(r["name"].replace(" ", "_"), r["best_estimator"]) for r in top3]
    stack = StackingClassifier(
        estimators=estimators,
        final_estimator=LogisticRegression(class_weight="balanced", max_iter=2000, random_state=RANDOM_STATE),
        cv=cv,
        n_jobs=-1,
    )
    logger.info("Training Stacking (top 3: %s) ...", [r["name"] for r in top3])
    stack_scores = cross_val_score(stack, X_train, y_train, cv=cv, scoring="roc_auc")
    auc = float(stack_scores.mean())
    logger.info("  Stacking CV AUC: %.4f (std=%.4f)", auc, float(stack_scores.std()))

    stack.fit(X_train, y_train)
    return {
        "name": "Stacking",
        "best_estimator": stack,
        "best_params": {"top_models": [r["name"] for r in top3]},
        "cv_auc": auc,
    }


def _iterative_feature_pruning(
    best_name: str,
    best_estimator: object,
    candidates: list[tuple[str, Pipeline, dict]],
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_train: pd.Series,
    y_test: pd.Series,
    cv: StratifiedKFold,
) -> tuple[str, object, list[str]]:
    """Iteratively prune low-importance features via PFI, re-running model selection each round."""
    current_features = list(X_train.columns)
    baseline_auc = float(cross_val_score(
        best_estimator, X_train, y_train, cv=cv, scoring="roc_auc",
    ).mean())
    logger.info("PFI baseline CV AUC (full %d features): %.4f", len(current_features), baseline_auc)

    while len(current_features) > PFI_MIN_FEATURES:
        X_tr = X_train[current_features]
        X_te = X_test[current_features]

        # Re-run model selection on current features
        iter_results = _run_grid_search(candidates, X_tr, y_train, cv)
        iter_best = iter_results[0]
        iter_best_name = iter_best["name"]
        iter_best_est = iter_best["best_estimator"]

        # Compute PFI on test set
        iter_best_est.fit(X_tr, y_train)
        perm = permutation_importance(
            iter_best_est, X_te, y_test,
            n_repeats=10, random_state=RANDOM_STATE, scoring="roc_auc",
        )
        pfi_df = pd.DataFrame({
            "feature": current_features,
            "importance": perm.importances_mean,
        }).sort_values("importance", ascending=True)

        # Drop lowest-importance features
        n_to_drop = max(1, int(len(current_features) * PFI_DROP_FRACTION))
        if len(current_features) - n_to_drop < PFI_MIN_FEATURES:
            n_to_drop = len(current_features) - PFI_MIN_FEATURES
        if n_to_drop == 0:
            break

        features_to_drop = set(pfi_df.head(n_to_drop)["feature"].tolist())
        remaining = [f for f in current_features if f not in features_to_drop]

        # Check if AUC degraded
        iter_auc = iter_best["cv_auc"]
        auc_change = iter_auc - baseline_auc
        logger.info(
            "  PFI round: %d → %d features, best=%s, AUC=%.4f (Δ=%.4f)",
            len(current_features), len(remaining), iter_best_name, iter_auc, auc_change,
        )

        if auc_change < -0.05:
            logger.info("  AUC dropped >5%%, stopping pruning. Keeping %d features.", len(current_features))
            break

        baseline_auc = iter_auc
        best_name = iter_best_name
        best_estimator = iter_best_est
        current_features = remaining

    logger.info("Final feature set (%d features): %s", len(current_features), current_features)
    return best_name, best_estimator, current_features


def run_training() -> dict:
    """Full training pipeline: ETL → 9 models + stacking → PFI pruning → evaluate → save."""

    # ── 1. ETL ───────────────────────────────────────────────────────────────
    frame = build_training_frame()
    if frame.empty or "churned" not in frame.columns:
        logger.warning("No training data available for donor churn. Skipping.")
        return {}

    X = frame.drop(columns=["churned", "supporter_id"], errors="ignore")
    y = frame["churned"].astype(int)

    if len(y.unique()) < 2:
        logger.warning("Only one class present in donor churn target. Skipping training.")
        return {}

    logger.info("Training donor churn model with %d rows, %d features.", len(X), len(X.columns))

    # ── 2. Train/test split ──────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y,
    )
    cv = StratifiedKFold(
        n_splits=min(5, y_train.value_counts().min()),
        shuffle=True, random_state=RANDOM_STATE,
    )

    # ── 3. Model selection: 9 models via GridSearchCV ────────────────────────
    candidates = _build_candidates()
    results = _run_grid_search(candidates, X_train, y_train, cv)

    # ── 4. Build stacking ensemble from top 3, add as 10th candidate ─────────
    stack_result = _build_stacking_candidate(results, X_train, y_train, cv)
    if stack_result:
        results.append(stack_result)
        results.sort(key=lambda r: r["cv_auc"], reverse=True)

    best = results[0]
    best_name = best["name"]
    best_estimator = best["best_estimator"]
    logger.info("Best model after selection: %s (CV AUC=%.4f)", best_name, best["cv_auc"])

    # ── 5. Iterative feature pruning via PFI ─────────────────────────────────
    best_name, best_estimator, final_features = _iterative_feature_pruning(
        best_name, best_estimator, candidates,
        X_train, X_test, y_train, y_test, cv,
    )

    # ── 6. Final evaluation on held-out test set ─────────────────────────────
    X_train_final = X_train[final_features]
    X_test_final = X_test[final_features]

    # Cross-validated AUC on training set (more reliable than single test split)
    cv_scores = cross_val_score(best_estimator, X_train_final, y_train, cv=cv, scoring="roc_auc")
    cv_auc_mean = float(cv_scores.mean())
    cv_auc_std = float(cv_scores.std())
    logger.info("Final CV AUC: %.4f +/- %.4f", cv_auc_mean, cv_auc_std)

    best_estimator.fit(X_train_final, y_train)
    y_proba = best_estimator.predict_proba(X_test_final)[:, 1]
    y_pred = (y_proba >= 0.4).astype(int)  # threshold from notebook

    test_auc = float(roc_auc_score(y_test, y_proba))
    test_f1 = float(f1_score(y_test, y_pred, zero_division=0))
    test_acc = float(accuracy_score(y_test, y_pred))
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    logger.info("Final test AUC=%.4f  F1=%.4f  Accuracy=%.4f", test_auc, test_f1, test_acc)

    # ── 7. Extract model and scaler for saving ───────────────────────────────
    if isinstance(best_estimator, Pipeline) and "scaler" in best_estimator.named_steps:
        scaler = best_estimator.named_steps["scaler"]
        model = best_estimator.named_steps["clf"]
    else:
        scaler = None
        model = best_estimator

    # ── 8. Save artifacts ────────────────────────────────────────────────────
    save_model_bundle(model=model, scaler=scaler, feature_list=final_features)
    save_metadata(
        model_type=best_name,
        feature_list=final_features,
        train_rows=len(X_train),
        test_rows=len(X_test),
        total_rows=len(X),
    )
    save_metrics(
        roc_auc=test_auc,
        f1=test_f1,
        accuracy=test_acc,
        classification_report=report,
        cv_auc=cv_auc_mean,
        cv_auc_std=cv_auc_std,
    )

    logger.info("Donor churn model saved successfully.")
    return {
        "model_name": "donor-churn",
        "model_type": best_name,
        "cv_auc": cv_auc_mean,
        "cv_auc_std": cv_auc_std,
        "test_auc": test_auc,
        "test_f1": test_f1,
        "test_accuracy": test_acc,
        "n_features": len(final_features),
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

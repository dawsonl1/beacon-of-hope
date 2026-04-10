"""Training pipeline for reintegration readiness classifier.

Mirrors ml-pipelines/reintegration-readiness.ipynb.
Full pipeline: ETL → 10 models + stacking → PFI feature pruning → evaluate → save .sav
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
from sklearn.feature_selection import VarianceThreshold
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

from ml.reintegration_readiness.artifacts import save_model_bundle, save_metadata, save_metrics
from ml.reintegration_readiness.etl import build_training_frame

logger = logging.getLogger(__name__)

RANDOM_STATE = 42
TEST_SIZE = 0.2
PFI_DROP_FRACTION = 0.2
PFI_AUC_TOLERANCE = 0.02
PFI_MIN_FEATURES = 3
PFI_MAX_ITERATIONS = 10
MIN_SAMPLES_FOR_TREES = 100  # Below this, tree ensembles overfit on small datasets


TREE_MODELS = {"DecisionTree", "RandomForest", "GradientBoosting", "AdaBoost", "ExtraTrees"}


def _build_candidates() -> list[tuple[str, Pipeline, dict]]:
    """10 candidate models mirroring the notebook."""
    return [
        ("LogisticRegression",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", LogisticRegression(max_iter=5000, random_state=RANDOM_STATE))]),
         {"clf__C": [0.1, 1.0, 10.0]}),

        ("DecisionTree",
         Pipeline([("clf", DecisionTreeClassifier(random_state=RANDOM_STATE))]),
         {"clf__max_depth": [2, 3, 4, 6, None], "clf__min_samples_leaf": [1, 2, 4]}),

        ("KNeighbors",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", KNeighborsClassifier())]),
         {"clf__n_neighbors": [3, 5, 7, 9], "clf__weights": ["uniform", "distance"]}),

        ("SVM_Linear",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", SVC(kernel="linear", probability=True, random_state=RANDOM_STATE))]),
         {"clf__C": [0.1, 1.0, 10.0]}),

        ("SVM_RBF",
         Pipeline([("scaler", StandardScaler()),
                   ("clf", SVC(kernel="rbf", probability=True, random_state=RANDOM_STATE))]),
         {"clf__C": [0.1, 1.0, 10.0], "clf__gamma": ["scale", 0.1, 1.0]}),

        ("GaussianNB",
         Pipeline([("clf", GaussianNB())]),
         {"clf__var_smoothing": [1e-9, 1e-8, 1e-7]}),

        ("RandomForest",
         Pipeline([("clf", RandomForestClassifier(random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [100, 300], "clf__max_depth": [None, 4, 8], "clf__min_samples_leaf": [1, 2, 4]}),

        ("GradientBoosting",
         Pipeline([("clf", GradientBoostingClassifier(random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [100, 300], "clf__learning_rate": [0.03, 0.1], "clf__max_depth": [2, 3]}),

        ("AdaBoost",
         Pipeline([("clf", AdaBoostClassifier(random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [50, 100, 300], "clf__learning_rate": [0.03, 0.1, 1.0]}),

        ("ExtraTrees",
         Pipeline([("clf", ExtraTreesClassifier(random_state=RANDOM_STATE))]),
         {"clf__n_estimators": [100, 300], "clf__max_depth": [None, 4, 8], "clf__min_samples_leaf": [1, 2, 4]}),
    ]


def _run_grid_search(candidates, X_train, y_train, cv):
    results = []
    for name, pipeline, param_grid in candidates:
        logger.info("Training %s ...", name)
        gs = GridSearchCV(pipeline, param_grid, cv=cv, scoring="roc_auc", n_jobs=-1, refit=True)
        gs.fit(X_train, y_train)
        auc = float(gs.best_score_)
        logger.info("  %s CV AUC: %.4f", name, auc)
        results.append({"name": name, "best_estimator": gs.best_estimator_, "cv_auc": auc})
    results.sort(key=lambda r: r["cv_auc"], reverse=True)
    return results


def _build_stacking(results, X_train, y_train, cv):
    if len(results) < 3:
        return None
    top3 = results[:3]
    estimators = [(r["name"], r["best_estimator"]) for r in top3]
    stack = StackingClassifier(
        estimators=estimators,
        final_estimator=LogisticRegression(max_iter=2000, random_state=RANDOM_STATE),
        cv=cv, n_jobs=-1,
    )
    logger.info("Training Stacking (top 3: %s) ...", [r["name"] for r in top3])
    scores = cross_val_score(stack, X_train, y_train, cv=cv, scoring="roc_auc")
    auc = float(scores.mean())
    logger.info("  Stacking CV AUC: %.4f", auc)
    stack.fit(X_train, y_train)
    return {"name": "Stacking", "best_estimator": stack, "cv_auc": auc}


def _pfi_feature_pruning(best_est, candidates, X_train, X_test, y_train, y_test, cv):
    current_features = list(X_train.columns)
    baseline_auc = float(cross_val_score(best_est, X_train, y_train, cv=cv, scoring="roc_auc").mean())

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
            n_repeats=30, random_state=RANDOM_STATE, scoring="roc_auc",
        )
        pfi_df = pd.DataFrame({
            "feature": current_features, "importance": perm.importances_mean,
        }).sort_values("importance", ascending=True)

        n_to_drop = max(1, int(len(current_features) * PFI_DROP_FRACTION))
        if len(current_features) - n_to_drop < PFI_MIN_FEATURES:
            n_to_drop = len(current_features) - PFI_MIN_FEATURES
        if n_to_drop == 0:
            break

        features_to_drop = set(pfi_df.head(n_to_drop)["feature"].tolist())
        remaining = [f for f in current_features if f not in features_to_drop]

        auc_change = iter_best["cv_auc"] - baseline_auc
        logger.info("  PFI round %d: %d → %d features, AUC=%.4f (Δ=%.4f)",
                     iteration + 1, len(current_features), len(remaining), iter_best["cv_auc"], auc_change)

        if auc_change < -PFI_AUC_TOLERANCE:
            break

        baseline_auc = iter_best["cv_auc"]
        best_est = iter_best["best_estimator"]
        current_features = remaining

    return best_est, current_features


def run_training() -> dict:
    """Full training pipeline: ETL → 10 models + stacking → PFI → evaluate → save."""

    frame = build_training_frame()
    if frame.empty or "reintegration_complete" not in frame.columns:
        logger.warning("No training data for reintegration readiness. Skipping.")
        return {}

    X = frame.drop(columns=["reintegration_complete", "resident_id"], errors="ignore")
    y = frame["reintegration_complete"].astype(int)

    if len(y.unique()) < 2:
        logger.warning("Only one class present. Skipping.")
        return {}

    # Remove zero-variance and highly correlated features
    vt = VarianceThreshold(threshold=0.0)
    X_filtered = pd.DataFrame(vt.fit_transform(X), columns=X.columns[vt.get_support()], index=X.index)
    corr_matrix = X_filtered.corr().abs()
    upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
    to_drop = [col for col in upper.columns if any(upper[col] > 0.95)]
    X_filtered = X_filtered.drop(columns=to_drop, errors="ignore")

    logger.info("Training reintegration readiness with %d rows, %d features.", len(X_filtered), len(X_filtered.columns))

    X_train, X_test, y_train, y_test = train_test_split(
        X_filtered, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y,
    )
    cv = StratifiedKFold(
        n_splits=min(5, y_train.value_counts().min()),
        shuffle=True, random_state=RANDOM_STATE,
    )

    candidates = _build_candidates()
    if len(X_train) < MIN_SAMPLES_FOR_TREES:
        excluded = [name for name, _, _ in candidates if name in TREE_MODELS]
        candidates = [(name, pipe, grid) for name, pipe, grid in candidates if name not in TREE_MODELS]
        logger.info("Small dataset (%d rows < %d): excluding tree models %s",
                     len(X_train), MIN_SAMPLES_FOR_TREES, excluded)
    results = _run_grid_search(candidates, X_train, y_train, cv)

    stack_result = _build_stacking(results, X_train, y_train, cv)
    if stack_result:
        results.append(stack_result)
        results.sort(key=lambda r: r["cv_auc"], reverse=True)

    best = results[0]
    logger.info("Best model: %s (CV AUC=%.4f)", best["name"], best["cv_auc"])

    best_name, best_est, final_features = best["name"], best["best_estimator"], list(X_train.columns)
    best_name_after, best_est, final_features = (
        best["name"],
        *_pfi_feature_pruning(best["best_estimator"], candidates, X_train, X_test, y_train, y_test, cv),
    )

    # Final evaluation
    X_tr_final = X_train[final_features]
    X_te_final = X_test[final_features]

    # Cross-validated AUC on training set (more reliable than single test split)
    cv_scores = cross_val_score(best_est, X_tr_final, y_train, cv=cv, scoring="roc_auc")
    cv_auc_mean = float(cv_scores.mean())
    cv_auc_std = float(cv_scores.std())
    logger.info("Final CV AUC: %.4f ± %.4f", cv_auc_mean, cv_auc_std)

    best_est.fit(X_tr_final, y_train)
    y_proba = best_est.predict_proba(X_te_final)[:, 1]
    y_pred = (y_proba >= 0.5).astype(int)

    test_auc = float(roc_auc_score(y_test, y_proba))
    test_f1 = float(f1_score(y_test, y_pred, zero_division=0))
    test_acc = float(accuracy_score(y_test, y_pred))
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    logger.info("Final test AUC=%.4f  F1=%.4f  Accuracy=%.4f", test_auc, test_f1, test_acc)

    # Extract scaler if present
    if isinstance(best_est, Pipeline) and "scaler" in best_est.named_steps:
        scaler = best_est.named_steps["scaler"]
    else:
        scaler = None

    save_model_bundle(model=best_est, scaler=scaler, feature_list=final_features)
    save_metadata(
        model_type=best_name_after if best_name_after else best["name"],
        feature_list=final_features,
        train_rows=len(X_train), test_rows=len(X_test), total_rows=len(X_filtered),
    )
    save_metrics(roc_auc=test_auc, f1=test_f1, accuracy=test_acc, classification_report=report,
                 cv_auc=cv_auc_mean, cv_auc_std=cv_auc_std)

    logger.info("Reintegration readiness model saved successfully.")
    return {
        "model_name": "reintegration-readiness",
        "model_type": best["name"],
        "cv_auc": cv_auc_mean, "cv_auc_std": cv_auc_std,
        "test_auc": test_auc, "test_f1": test_f1, "test_accuracy": test_acc,
        "n_features": len(final_features), "n_train": len(X_train), "n_test": len(X_test),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    result = run_training()
    if result:
        logger.info("Training complete: %s", result)
    else:
        logger.warning("Training produced no results.")

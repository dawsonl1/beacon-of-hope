"""Training pipeline for social media timing optimizer (predictive regressor).

Mirrors ml-pipelines/social-media-timing-optimizer.ipynb.
Full pipeline: ETL → 9 models with GridSearchCV → evaluate → save .sav
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    AdaBoostRegressor,
    ExtraTreesRegressor,
    GradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
)
from sklearn.feature_selection import SelectKBest, VarianceThreshold, f_regression
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, KFold, train_test_split
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVR
from sklearn.tree import DecisionTreeRegressor

from ml.social_media_timing.artifacts import save_model_bundle, save_metadata, save_metrics
from ml.social_media_timing.etl import build_training_frame

logger = logging.getLogger(__name__)

SEED = 42
TEST_SIZE = 0.2
SELECTED_K = 5

# Feature column categories (from features.py)
CATEGORICAL_COLS = ["platform", "day_of_week", "media_type", "post_type"]
NUMERIC_COLS = ["post_hour", "boost_budget_php"]
BOOLEAN_COLS = ["is_boosted", "has_call_to_action", "is_weekend"]


def _build_preprocessor():
    """ColumnTransformer mirroring the notebook's preprocessing."""
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_COLS),
            ("num", StandardScaler(), NUMERIC_COLS),
        ],
        remainder="passthrough",
    )


def _build_candidates(preprocessor) -> list[tuple[str, Pipeline, dict]]:
    """9 candidate models mirroring the notebook."""
    def make_pipe(model):
        return Pipeline([
            ("prep", preprocessor),
            ("variance", VarianceThreshold()),
            ("select", SelectKBest(f_regression, k=SELECTED_K)),
            ("model", model),
        ])

    return [
        ("LinearRegression",
         make_pipe(LinearRegression()),
         {"select__k": [SELECTED_K, "all"]}),

        ("DecisionTree",
         make_pipe(DecisionTreeRegressor(random_state=SEED)),
         {"select__k": [SELECTED_K, "all"],
          "model__max_depth": [3, 5, 8, None], "model__min_samples_leaf": [1, 5, 10]}),

        ("KNN",
         make_pipe(KNeighborsRegressor()),
         {"select__k": [SELECTED_K, "all"],
          "model__n_neighbors": [5, 9, 15], "model__weights": ["uniform", "distance"]}),

        ("SVR",
         make_pipe(SVR()),
         {"select__k": [SELECTED_K, "all"],
          "model__C": [0.5, 1.0, 5.0], "model__epsilon": [0.01, 0.02], "model__gamma": ["scale", "auto"]}),

        ("RandomForest",
         make_pipe(RandomForestRegressor(n_estimators=300, random_state=SEED)),
         {"select__k": [SELECTED_K, "all"],
          "model__max_depth": [4, 6, 8, None],
          "model__min_samples_split": [2, 10, 30],
          "model__min_samples_leaf": [3, 5, 10, 20],
          "model__max_features": ["sqrt", 0.5]}),

        ("GradientBoosting",
         make_pipe(GradientBoostingRegressor(random_state=SEED)),
         {"select__k": [SELECTED_K, "all"],
          "model__n_estimators": [100, 200], "model__learning_rate": [0.05, 0.1], "model__max_depth": [2, 3]}),

        ("AdaBoost",
         make_pipe(AdaBoostRegressor(random_state=SEED)),
         {"select__k": [SELECTED_K, "all"],
          "model__n_estimators": [100, 200], "model__learning_rate": [0.05, 0.1, 0.5]}),

        ("ExtraTrees",
         make_pipe(ExtraTreesRegressor(n_estimators=300, random_state=SEED)),
         {"select__k": [SELECTED_K, "all"],
          "model__max_depth": [None, 6, 10], "model__min_samples_leaf": [1, 3, 5]}),

        ("Stacking",
         Pipeline([
             ("prep", preprocessor),
             ("variance", VarianceThreshold()),
             ("select", SelectKBest(f_regression, k=SELECTED_K)),
             ("model", StackingRegressor(
                 estimators=[
                     ("rf", RandomForestRegressor(n_estimators=200, max_depth=6, random_state=SEED)),
                     ("gb", GradientBoostingRegressor(n_estimators=150, learning_rate=0.05, max_depth=2, random_state=SEED)),
                 ],
                 final_estimator=Ridge(alpha=1.0),
             )),
         ]),
         {"select__k": [SELECTED_K, "all"],
          "model__final_estimator__alpha": [0.1, 1.0, 10.0]}),
    ]


def run_training() -> dict:
    """Full training pipeline: ETL → 9 models GridSearchCV → evaluate → save."""

    result = build_training_frame()
    if isinstance(result, tuple):
        X, y = result
    else:
        logger.warning("Unexpected ETL output for social media timing. Skipping.")
        return {}

    if X.empty or y.empty:
        logger.warning("No training data for social media timing. Skipping.")
        return {}

    # Ensure expected columns exist
    for col in CATEGORICAL_COLS + NUMERIC_COLS + BOOLEAN_COLS:
        if col not in X.columns:
            X[col] = 0

    feature_list = list(X.columns)
    logger.info("Training social media timing with %d rows, %d features.", len(X), len(feature_list))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=SEED,
    )

    cv = KFold(n_splits=5, shuffle=True, random_state=SEED)
    preprocessor = _build_preprocessor()
    candidates = _build_candidates(preprocessor)

    # Run GridSearchCV for all 9 models
    cv_results_table = []
    best_name = ""
    best_estimator = None
    best_mae = float("inf")

    for name, pipeline, param_grid in candidates:
        logger.info("Training %s ...", name)
        gs = GridSearchCV(
            pipeline, param_grid, cv=cv,
            scoring={"mae": "neg_mean_absolute_error", "r2": "r2"},
            refit="mae", n_jobs=-1,
        )
        gs.fit(X_train, y_train)
        cv_mae = -float(gs.cv_results_["mean_test_mae"][gs.best_index_])
        cv_r2 = float(gs.cv_results_["mean_test_r2"][gs.best_index_])
        logger.info("  %s CV MAE: %.4f, R²: %.4f", name, cv_mae, cv_r2)

        cv_results_table.append({
            "model": name,
            "cv_mae_mean": cv_mae,
            "cv_mae_std": float(gs.cv_results_["std_test_mae"][gs.best_index_]),
            "cv_r2_mean": cv_r2,
            "cv_r2_std": float(gs.cv_results_["std_test_r2"][gs.best_index_]),
            "best_params": gs.best_params_,
        })

        if cv_mae < best_mae:
            best_mae = cv_mae
            best_name = name
            best_estimator = gs.best_estimator_

    logger.info("Best model: %s (CV MAE=%.4f)", best_name, best_mae)

    # Final evaluation on test set
    y_pred = best_estimator.predict(X_test)
    test_mae = float(mean_absolute_error(y_test, y_pred))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    test_r2 = float(r2_score(y_test, y_pred))

    logger.info("Test MAE=%.4f, RMSE=%.4f, R²=%.4f", test_mae, test_rmse, test_r2)

    # Save
    save_model_bundle(model=best_estimator, feature_list=feature_list)
    save_metadata(
        feature_list=feature_list,
        model_type=best_name,
        train_rows=len(X_train), test_rows=len(X_test), total_rows=len(X),
    )
    save_metrics(
        mae=test_mae, rmse=test_rmse, r2=test_r2,
        cv_table=cv_results_table,
    )

    logger.info("Social media timing model saved successfully.")
    return {
        "model_name": "social-media-timing",
        "model_type": best_name,
        "test_mae": test_mae, "test_rmse": test_rmse, "test_r2": test_r2,
        "n_features": len(feature_list),
        "n_train": len(X_train), "n_test": len(X_test),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    result = run_training()
    if result:
        logger.info("Training complete: %s", result)
    else:
        logger.warning("Training produced no results.")

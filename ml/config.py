"""
config.py
---------
Shared constants for all ML scripts.
Every job imports from here — never hardcode paths or table names elsewhere.

Environment variables are loaded from the system (set in GitHub Secrets for Actions,
set in .env for local development).
"""

import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

# ── Data freeze date ──────────────────────────────────────────────────────────
# The app's data is frozen to this date (see CLAUDE.md rule 9).
# All feature computation at inference time must use this as "today".
DATA_FREEZE = pd.Timestamp("2026-02-16")

# ── Project paths ─────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parents[1]  # root of the repo
MODELS_DIR   = PROJECT_ROOT / "models"              # where .sav files live

# Load .env files for local runs (repo root first, then ml/.env).
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

# ── Database connection ────────────────────────────────────────────────────────
# A standard PostgreSQL connection URL (Azure Database for PostgreSQL).
DATABASE_URL = os.environ["DATABASE_URL"]

# ── Table names ───────────────────────────────────────────────────────────────
# Operational tables (read by ETL jobs)
TABLE_RESIDENTS              = "residents"
TABLE_HEALTH                 = "health_wellbeing_records"
TABLE_EDUCATION              = "education_records"
TABLE_PROCESS_RECORDINGS     = "process_recordings"
TABLE_HOME_VISITATIONS       = "home_visitations"
TABLE_INTERVENTION_PLANS     = "intervention_plans"
TABLE_INCIDENTS              = "incident_reports"
TABLE_DONATIONS              = "donations"
TABLE_SUPPORTERS             = "supporters"
TABLE_SOCIAL_MEDIA_POSTS     = "social_media_posts"

# ML output tables (written by infer jobs)
TABLE_ML_PREDICTIONS         = "ml_predictions"          # current score — upserted nightly
TABLE_ML_PREDICTION_HISTORY  = "ml_prediction_history"   # all scores ever — append only

# ── Model file paths ───────────────────────────────────────────────────────────
# Each model lives in its own subdirectory: models/<name>/model.sav, metadata.json, metrics.json
MODEL_REINTEGRATION_READINESS = MODELS_DIR / "reintegration-readiness" / "model.sav"
MODEL_REINTEGRATION_DRIVERS   = MODELS_DIR / "reintegration-drivers"   / "model.sav"
MODEL_DONOR_CHURN             = MODELS_DIR / "donor-churn"             / "model.sav"
MODEL_DONOR_CHURN_DRIVERS     = MODELS_DIR / "donor-churn-drivers"     / "model.sav"
MODEL_SOCIAL_CONTENT          = MODELS_DIR / "social-media-content"    / "model.sav"
MODEL_SOCIAL_TIMING           = MODELS_DIR / "social-media-timing"     / "model.sav"
MODEL_INCIDENT_WARNING        = MODELS_DIR / "incident-early-warning"  / "model.sav"
MODEL_INCIDENT_RISK_DRIVERS   = MODELS_DIR / "incident-risk-drivers"   / "model.sav"

META_REINTEGRATION_READINESS  = MODELS_DIR / "reintegration-readiness" / "metadata.json"
META_REINTEGRATION_DRIVERS    = MODELS_DIR / "reintegration-drivers"   / "metadata.json"
META_DONOR_CHURN              = MODELS_DIR / "donor-churn"             / "metadata.json"
META_DONOR_CHURN_DRIVERS      = MODELS_DIR / "donor-churn-drivers"     / "metadata.json"
META_SOCIAL_CONTENT           = MODELS_DIR / "social-media-content"    / "metadata.json"
META_SOCIAL_TIMING            = MODELS_DIR / "social-media-timing"     / "metadata.json"
META_INCIDENT_WARNING         = MODELS_DIR / "incident-early-warning"  / "metadata.json"
META_INCIDENT_RISK_DRIVERS    = MODELS_DIR / "incident-risk-drivers"   / "metadata.json"

METRICS_REINTEGRATION_READINESS = MODELS_DIR / "reintegration-readiness" / "metrics.json"
METRICS_REINTEGRATION_DRIVERS   = MODELS_DIR / "reintegration-drivers"   / "metrics.json"
METRICS_DONOR_CHURN             = MODELS_DIR / "donor-churn"             / "metrics.json"
METRICS_DONOR_CHURN_DRIVERS     = MODELS_DIR / "donor-churn-drivers"     / "metrics.json"
METRICS_SOCIAL_CONTENT          = MODELS_DIR / "social-media-content"    / "metrics.json"
METRICS_SOCIAL_TIMING           = MODELS_DIR / "social-media-timing"     / "metrics.json"
METRICS_INCIDENT_WARNING        = MODELS_DIR / "incident-early-warning"  / "metrics.json"
METRICS_INCIDENT_RISK_DRIVERS   = MODELS_DIR / "incident-risk-drivers"   / "metrics.json"

# combined per-pipeline model run files (metadata + metrics, append-only runs)
MODEL_RUNS_REINTEGRATION_READINESS = MODELS_DIR / "reintegration-readiness" / "model.json"
MODEL_RUNS_REINTEGRATION_DRIVERS   = MODELS_DIR / "reintegration-drivers"   / "model.json"
MODEL_RUNS_DONOR_CHURN             = MODELS_DIR / "donor-churn"             / "model.json"
MODEL_RUNS_DONOR_CHURN_DRIVERS     = MODELS_DIR / "donor-churn-drivers"     / "model.json"
MODEL_RUNS_SOCIAL_CONTENT          = MODELS_DIR / "social-media-content"    / "model.json"
MODEL_RUNS_SOCIAL_TIMING           = MODELS_DIR / "social-media-timing"     / "model.json"
MODEL_RUNS_INCIDENT_WARNING        = MODELS_DIR / "incident-early-warning"  / "model.json"
MODEL_RUNS_INCIDENT_RISK_DRIVERS   = MODELS_DIR / "incident-risk-drivers"   / "model.json"

# ── Model name constants ───────────────────────────────────────────────────────
# These are the values written to the model_name column in ml_predictions.
# Must match exactly what the infer jobs write — never hardcode these strings elsewhere.

MODEL_NAME_REINTEGRATION_READINESS = "reintegration-readiness"
MODEL_NAME_REINTEGRATION_DRIVERS   = "reintegration-drivers"
MODEL_NAME_DONOR_CHURN             = "donor-churn"
MODEL_NAME_DONOR_CHURN_DRIVERS     = "donor-churn-drivers"
MODEL_NAME_SOCIAL_CONTENT          = "social-media-content"
MODEL_NAME_SOCIAL_TIMING           = "social-media-timing"
MODEL_NAME_INCIDENT_WARNING        = "incident-early-warning"
MODEL_NAME_INCIDENT_WARNING_SELFHARM = "incident-early-warning-selfharm"
MODEL_NAME_INCIDENT_WARNING_RUNAWAY  = "incident-early-warning-runaway"
MODEL_NAME_INCIDENT_RISK_DRIVERS     = "incident-risk-drivers"

# ── Score label thresholds ─────────────────────────────────────────────────────
# Used by infer jobs to convert raw 0-100 scores to human-readable labels.
# Defined here so the frontend and backend can be told what to expect.

REINTEGRATION_LABELS = {
    75: "Ready",
    50: "Progressing",
    25: "Early Stage",
    0:  "Not Ready",
}

CHURN_LABELS = {
    75: "Critical",
    50: "High",
    25: "Medium",
    0:  "Low",
}

INCIDENT_LABELS = {
    75: "Critical",
    50: "High",
    25: "Medium",
    0:  "Low",
}
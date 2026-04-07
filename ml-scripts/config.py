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
from dotenv import load_dotenv

# ── Project paths ─────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parents[1]  # root of the repo
MODELS_DIR   = PROJECT_ROOT / "models"              # where .sav files live

# Load .env files for local runs (repo root first, then ml-scripts/.env).
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

# ── Supabase credentials ───────────────────────────────────────────────────────
# Read from environment only (typically loaded from .env in local development
# and from CI/CD secret variables in production).
SUPABASE_PROJECT_ID = os.environ["SUPABASE_PROJECT_ID"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_PUBLISHABLE_KEY = os.environ["SUPABASE_PUBLISHABLE_KEY"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
# Backward-compatible fallback for older variable name.
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_DB_URL = os.environ["SUPABASE_DB_URL"]

# ── Supabase table names ───────────────────────────────────────────────────────
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
# .sav files
MODEL_REINTEGRATION_READINESS = MODELS_DIR / "reintegration-readiness.sav"
MODEL_REINTEGRATION_DRIVERS   = MODELS_DIR / "reintegration-drivers.sav"
MODEL_DONOR_CHURN             = MODELS_DIR / "donor-churn.sav"
MODEL_SOCIAL_CONTENT          = MODELS_DIR / "social-media-content.sav"
MODEL_SOCIAL_TIMING           = MODELS_DIR / "social-media-timing.sav"
MODEL_INCIDENT_WARNING        = MODELS_DIR / "incident-early-warning.sav"

# metadata.json files
META_REINTEGRATION_READINESS  = MODELS_DIR / "reintegration-readiness-metadata.json"
META_REINTEGRATION_DRIVERS    = MODELS_DIR / "reintegration-drivers-metadata.json"
META_DONOR_CHURN              = MODELS_DIR / "donor-churn-metadata.json"
META_SOCIAL_CONTENT           = MODELS_DIR / "social-media-content-metadata.json"
META_SOCIAL_TIMING            = MODELS_DIR / "social-media-timing-metadata.json"
META_INCIDENT_WARNING         = MODELS_DIR / "incident-early-warning-metadata.json"

# metrics.json files
METRICS_REINTEGRATION_READINESS = MODELS_DIR / "reintegration-readiness-metrics.json"
METRICS_REINTEGRATION_DRIVERS   = MODELS_DIR / "reintegration-drivers-metrics.json"
METRICS_DONOR_CHURN             = MODELS_DIR / "donor-churn-metrics.json"
METRICS_SOCIAL_CONTENT          = MODELS_DIR / "social-media-content-metrics.json"
METRICS_SOCIAL_TIMING           = MODELS_DIR / "social-media-timing-metrics.json"
METRICS_INCIDENT_WARNING        = MODELS_DIR / "incident-early-warning-metrics.json"

# ── Model name constants ───────────────────────────────────────────────────────
# These are the values written to the model_name column in ml_predictions.
# Must match exactly what the infer jobs write — never hardcode these strings elsewhere.

MODEL_NAME_REINTEGRATION_READINESS = "reintegration-readiness"
MODEL_NAME_REINTEGRATION_DRIVERS   = "reintegration-drivers"
MODEL_NAME_DONOR_CHURN             = "donor-churn"
MODEL_NAME_SOCIAL_CONTENT          = "social-media-content"
MODEL_NAME_SOCIAL_TIMING           = "social-media-timing"
MODEL_NAME_INCIDENT_WARNING        = "incident-early-warning"

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
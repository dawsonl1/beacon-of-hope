"""
utils_db.py
-----------
Shared Supabase connection and database write helpers.
Every ETL and infer job imports from here.

Two responsibilities:
1. get_client()  — returns an authenticated Supabase client
2. fetch_table() — pulls any table into a DataFrame
3. upsert_predictions()  — writes current scores to ml_predictions
4. insert_history()      — appends scores to ml_prediction_history
"""

import logging
import pandas as pd
from datetime import datetime, timezone
from supabase import create_client, Client
from ml.config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    TABLE_ML_PREDICTIONS,
    TABLE_ML_PREDICTION_HISTORY,
)

logger = logging.getLogger(__name__)


# ── Client ─────────────────────────────────────────────────────────────────────

def get_client() -> Client:
    """
    Returns an authenticated Supabase client using the service key.
    The service key bypasses Row Level Security — only used server-side
    by GitHub Actions, never exposed to the frontend.
    """
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ── Fetching ───────────────────────────────────────────────────────────────────

def fetch_table(client: Client, table: str) -> pd.DataFrame:
    """
    Fetches all rows from a Supabase table and returns a DataFrame.
    Used by all ETL jobs to pull operational data.

    Usage:
        client = get_client()
        residents = fetch_table(client, TABLE_RESIDENTS)
    """
    logger.info(f"Fetching table: {table}")
    response = client.table(table).select("*").execute()
    df = pd.DataFrame(response.data)
    logger.info(f"  → {len(df)} rows")
    return df


# ── Writing predictions ────────────────────────────────────────────────────────

def upsert_predictions(client: Client, records: list[dict]) -> None:
    """
    Writes current prediction scores to ml_predictions.
    Uses upsert so the same row is overwritten each night.
    The unique key in Supabase is (entity_type, entity_id, model_name).

    Each record must have:
        entity_type   — "resident", "supporter", "platform_timing", "org_insight"
        entity_id     — the id of the entity (nullable for org_insight)
        model_name    — the model that produced this score
        score         — the numeric score (0-100 or raw probability)
        score_label   — human readable label e.g. "Ready", "High Risk"
        model_version — date the .sav was trained e.g. "20240415"
        predicted_at  — ISO timestamp of when this score was generated
        metadata      — dict of supporting detail for the frontend

    Usage:
        upsert_predictions(client, [
            {
                "entity_type": "resident",
                "entity_id": 42,
                "model_name": "reintegration-readiness",
                "score": 73.2,
                "score_label": "Progressing",
                "model_version": "20240415",
                "predicted_at": "2024-04-16T02:00:00Z",
                "metadata": { ... }
            }
        ])
    """
    if not records:
        logger.warning("upsert_predictions called with empty records list — skipping")
        return

    client.table(TABLE_ML_PREDICTIONS).upsert(
        records,
        on_conflict="entity_type,entity_id,model_name"
    ).execute()

    logger.info(f"Upserted {len(records)} rows to {TABLE_ML_PREDICTIONS}")


def insert_history(client: Client, records: list[dict]) -> None:
    """
    Appends prediction scores to ml_prediction_history.
    This table is append-only — rows are never updated or deleted.
    Every nightly run adds a new row per entity per model.
    This is what powers the trajectory graphs on the frontend.

    Accepts the same record format as upsert_predictions().

    Usage:
        insert_history(client, records)
    """
    if not records:
        logger.warning("insert_history called with empty records list — skipping")
        return

    client.table(TABLE_ML_PREDICTION_HISTORY).insert(records).execute()

    logger.info(f"Inserted {len(records)} rows to {TABLE_ML_PREDICTION_HISTORY}")


def write_predictions(client: Client, records: list[dict]) -> None:
    """
    Convenience wrapper that writes to BOTH tables in one call.
    This is what every infer job should call at the end.

    Writes current score to ml_predictions (upsert).
    Appends tonight's score to ml_prediction_history (insert).

    Usage:
        write_predictions(client, records)
    """
    upsert_predictions(client, records)
    insert_history(client, records)


# ── Helpers ────────────────────────────────────────────────────────────────────

def now_utc() -> str:
    """Returns current UTC time as an ISO string. Used for predicted_at field."""
    return datetime.now(timezone.utc).isoformat()


def score_to_label(score: float, thresholds: dict) -> str:
    """
    Converts a numeric score to a human-readable label using a threshold dict.
    Thresholds are defined in config.py.

    Example:
        thresholds = {75: "Ready", 50: "Progressing", 25: "Early Stage", 0: "Not Ready"}
        score_to_label(73.2, thresholds)  →  "Progressing"

    Usage:
        from ml.config import REINTEGRATION_LABELS
        label = score_to_label(score, REINTEGRATION_LABELS)
    """
    for threshold in sorted(thresholds.keys(), reverse=True):
        if score >= threshold:
            return thresholds[threshold]
    return list(thresholds.values())[-1]
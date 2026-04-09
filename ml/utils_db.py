"""
utils_db.py
-----------
Shared database connection and write helpers using SQLAlchemy + psycopg2.
Every ETL and infer job imports from here.

Functions:
1. get_engine()          — returns a SQLAlchemy engine (cached)
2. fetch_table()         — pulls any table into a DataFrame
3. upsert_predictions()  — writes current scores to ml_predictions
4. insert_history()      — appends scores to ml_prediction_history
5. write_predictions()   — convenience wrapper for both
"""

import json
import logging
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from ml.config import (
    DATABASE_URL,
    TABLE_ML_PREDICTIONS,
    TABLE_ML_PREDICTION_HISTORY,
)

logger = logging.getLogger(__name__)

_engine: Engine | None = None


# ── Engine ────────────────────────────────────────────────────────────────────

def get_engine() -> Engine:
    """Returns a cached SQLAlchemy engine connected to the Azure PostgreSQL database."""
    global _engine
    if _engine is None:
        _engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    return _engine


# Backward-compatible alias — ETL/infer files call get_client().
# Returns the engine so existing code like `client = get_client()` keeps working.
def get_client() -> Engine:
    return get_engine()


# ── Fetching ──────────────────────────────────────────────────────────────────

def fetch_table(client: Engine, table: str) -> pd.DataFrame:
    """
    Fetches all rows from a table and returns a DataFrame.
    Used by all ETL jobs to pull operational data.

    Usage:
        client = get_client()
        residents = fetch_table(client, TABLE_RESIDENTS)
    """
    logger.info(f"Fetching table: {table}")
    df = pd.read_sql_table(table, client)
    # SQLAlchemy returns quoted_name objects (a str subclass) for column names,
    # which causes sklearn to reject the DataFrame.  Force plain str here.
    df.columns = pd.Index([str(c) for c in df.columns])
    logger.info(f"  → {len(df)} rows")
    return df


# ── Writing predictions ──────────────────────────────────────────────────────

def upsert_predictions(client: Engine, records: list[dict]) -> None:
    """
    Writes current prediction scores to ml_predictions.
    Uses INSERT ... ON CONFLICT to upsert.
    The unique key is (entity_type, entity_id, model_name).
    """
    if not records:
        logger.warning("upsert_predictions called with empty records list — skipping")
        return

    upsert_sql = text("""
        INSERT INTO ml_predictions
            (entity_type, entity_id, model_name, model_version, score, score_label, predicted_at, metadata)
        VALUES
            (:entity_type, :entity_id, :model_name, :model_version, :score, :score_label, :predicted_at, :metadata)
        ON CONFLICT (entity_type, entity_id, model_name)
        DO UPDATE SET
            model_version = EXCLUDED.model_version,
            score         = EXCLUDED.score,
            score_label   = EXCLUDED.score_label,
            predicted_at  = EXCLUDED.predicted_at,
            metadata      = EXCLUDED.metadata
    """)

    with client.begin() as conn:
        for r in records:
            conn.execute(upsert_sql, _prepare_params(r))

    logger.info(f"Upserted {len(records)} rows to {TABLE_ML_PREDICTIONS}")


def insert_history(client: Engine, records: list[dict]) -> None:
    """
    Appends prediction scores to ml_prediction_history.
    This table is append-only — rows are never updated or deleted.
    """
    if not records:
        logger.warning("insert_history called with empty records list — skipping")
        return

    insert_sql = text("""
        INSERT INTO ml_prediction_history
            (entity_type, entity_id, model_name, model_version, score, score_label, predicted_at, metadata)
        VALUES
            (:entity_type, :entity_id, :model_name, :model_version, :score, :score_label, :predicted_at, :metadata)
    """)

    with client.begin() as conn:
        for r in records:
            conn.execute(insert_sql, _prepare_params(r))

    logger.info(f"Inserted {len(records)} rows to {TABLE_ML_PREDICTION_HISTORY}")


def write_predictions(client: Engine, records: list[dict]) -> None:
    """
    Convenience wrapper that writes to BOTH tables in one call.
    This is what every infer job should call at the end.
    """
    upsert_predictions(client, records)
    insert_history(client, records)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _prepare_params(record: dict) -> dict:
    """Convert a record dict to SQL parameters, serializing metadata to JSON."""
    params = dict(record)
    if "metadata" in params and params["metadata"] is not None:
        if not isinstance(params["metadata"], str):
            params["metadata"] = json.dumps(params["metadata"])
    return params


def now_utc() -> str:
    """Returns current UTC time as an ISO string. Used for predicted_at field."""
    return datetime.now(timezone.utc).isoformat()


def score_to_label(score: float, thresholds: dict) -> str:
    """
    Converts a numeric score to a human-readable label using a threshold dict.

    Example:
        thresholds = {75: "Ready", 50: "Progressing", 25: "Early Stage", 0: "Not Ready"}
        score_to_label(73.2, thresholds)  →  "Progressing"
    """
    for threshold in sorted(thresholds.keys(), reverse=True):
        if score >= threshold:
            return thresholds[threshold]
    return list(thresholds.values())[-1]

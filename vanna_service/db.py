"""
db.py — Read-only database access for Vanna chatbot queries.
"""

import re
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from vanna_service.config import DATABASE_URL_READONLY

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(DATABASE_URL_READONLY, pool_pre_ping=True)
    return _engine


# DML keywords that must not appear as standalone SQL words.
# Uses word-boundary regex to avoid false positives (e.g. "created_at" vs "CREATE").
_DISALLOWED = re.compile(
    r'\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|COPY)\b',
    re.IGNORECASE,
)


def execute_sql(sql: str, limit: int = 500) -> tuple[list[str], list[dict]]:
    """
    Execute a read-only SQL query and return (columns, rows).
    Enforces statement timeout and row limit.
    """
    sql_stripped = sql.strip().rstrip(";")

    # Safety: reject non-SELECT statements
    first_word = sql_stripped.split()[0].upper() if sql_stripped else ""
    if first_word not in ("SELECT", "WITH"):
        raise ValueError(f"Only SELECT queries are allowed, got: {first_word}")

    # Check for DML keywords using word boundaries
    match = _DISALLOWED.search(sql_stripped)
    if match:
        raise ValueError(f"Query contains disallowed keyword: {match.group(1).upper()}")

    # Add LIMIT if not present
    if "LIMIT" not in sql_stripped.upper():
        sql_stripped += f" LIMIT {limit}"

    with get_engine().connect() as conn:
        conn.execute(text("SET statement_timeout = '10000'"))
        result = conn.execute(text(sql_stripped))
        columns = list(result.keys())
        rows = [dict(row) for row in result.mappings().all()]
        return columns, rows

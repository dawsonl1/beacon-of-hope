"""
app.py — FastAPI application for the Vanna chatbot service.
Receives natural language questions, generates SQL via Vanna/OpenAI,
executes against a read-only PostgreSQL connection, and returns
data + chart descriptors.
"""

import logging
import re
import traceback
import uuid
from datetime import date, datetime
from decimal import Decimal
from fastapi import Depends, FastAPI, HTTPException, Header, Request
from pydantic import BaseModel
from vanna_service.config import VANNA_API_KEY, APP_TODAY
from vanna_service.db import execute_sql
from vanna_service.vanna_setup import get_vanna

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, "request_id"):
            record.request_id = "no-req"
        return True

# Apply the filter to the root logger so ALL loggers (including httpx, openai, etc.) get it
_rid_filter = RequestIdFilter()
logging.root.addFilter(_rid_filter)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s (%(request_id)s): %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


# -- Auth --

def verify_key(authorization: str = Header(default="")):
    if not VANNA_API_KEY:
        raise HTTPException(status_code=500, detail="VANNA_API_KEY not configured")
    if authorization != f"Bearer {VANNA_API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid API key")


app = FastAPI(title="Vanna Chatbot Service", version="0.1.0")


# -- Health (no auth) --

@app.get("/health")
def health():
    from vanna_service.db import get_engine
    try:
        with get_engine().connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "healthy" if db_ok else "degraded", "db": "ok" if db_ok else "unreachable"}


# -- Request/Response Models --

class AskRequest(BaseModel):
    question: str
    safehouse_ids: list[int] | None = None


class ChartDescriptor(BaseModel):
    type: str  # bar, line, pie, area
    x: list[str]
    y: list[float]
    labels: list[str] | None = None
    x_label: str | None = None
    y_label: str | None = None


class AskResponse(BaseModel):
    sql: str | None = None
    data: list[dict] | None = None
    columns: list[str] | None = None
    chart: ChartDescriptor | None = None
    summary: str | None = None
    error: str | None = None
    debug_error: str | None = None  # detailed error info for backend logs


def _serialize_value(v):
    """Convert non-JSON-serializable types to strings."""
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    return v


def _serialize_rows(rows: list[dict]) -> list[dict]:
    return [{k: _serialize_value(v) for k, v in row.items()} for row in rows]


def _build_safehouse_context(safehouse_ids: list[int] | None) -> str:
    if safehouse_ids is None:
        return (
            "The user is an administrator and can see ALL data across all safehouses. "
            "Do NOT add any SafehouseId filter unless the user specifically asks about a particular safehouse."
        )
    ids_str = ", ".join(str(i) for i in safehouse_ids)
    return (
        f"The user can only see data from safehouses with IDs: [{ids_str}]. "
        f'You MUST add WHERE "SafehouseId" IN ({ids_str}) to every query that touches '
        f"a table with a SafehouseId column. For tables linked via ResidentId, "
        f"join through the residents table to filter by SafehouseId. "
        f"NEVER return data from other safehouses."
    )


def _infer_chart(columns: list[str], rows: list[dict]) -> ChartDescriptor | None:
    """Infer a simple chart descriptor from query results."""
    if not rows or len(rows) < 2 or len(columns) < 2:
        return None

    # Look for a string column (labels/x-axis) and a numeric column (values/y-axis)
    str_col = None
    num_col = None
    for col in columns:
        sample = rows[0].get(col)
        if isinstance(sample, str) and str_col is None:
            str_col = col
        elif isinstance(sample, (int, float, Decimal)) and num_col is None:
            num_col = col

    if str_col is None or num_col is None:
        return None

    x = [str(row.get(str_col, "")) for row in rows]
    y = [float(row.get(num_col, 0) or 0) for row in rows]

    # Choose chart type based on data shape
    if len(rows) <= 6:
        chart_type = "bar"
    elif len(rows) <= 12:
        # Check if x values look like dates/months
        date_pattern = re.compile(r"\d{4}[-/]\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec", re.I)
        if any(date_pattern.search(val) for val in x[:3]):
            chart_type = "line"
        else:
            chart_type = "bar"
    else:
        chart_type = "line"

    # Use pie chart for small categorical data with proportions
    if len(rows) <= 5 and all(v >= 0 for v in y):
        total = sum(y)
        if total > 0 and all(v / total < 0.8 for v in y):
            chart_type = "pie"

    return ChartDescriptor(
        type=chart_type,
        x=x,
        y=y,
        labels=x,
        x_label=str_col,
        y_label=num_col,
    )


# -- Main endpoint --

@app.post("/ask", response_model=AskResponse, dependencies=[Depends(verify_key)])
def ask(req: AskRequest, request: Request):
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4())[:8])
    extra = {"request_id": request_id}

    logger.info("Question: %s | Safehouses: %s", req.question, req.safehouse_ids, extra=extra)

    vn = get_vanna()

    # Build the prompt with safehouse context
    safehouse_context = _build_safehouse_context(req.safehouse_ids)

    # Enhance the question with context
    enhanced_question = (
        f"{safehouse_context}\n\n"
        f"Today's date is {APP_TODAY.strftime('%Y-%m-%d')}. "
        f"Use this as the current date for any date-relative queries.\n\n"
        f"User question: {req.question}"
    )

    try:
        # Generate SQL using Vanna
        logger.info("Generating SQL via OpenAI...", extra=extra)
        sql = vn.generate_sql(question=enhanced_question)

        if not sql or sql.strip().upper() == "NONE":
            logger.warning("SQL generation returned NONE for question: %s", req.question, extra=extra)
            return AskResponse(
                error="I couldn't generate a query for that question. Try rephrasing it."
            )

        logger.info("Generated SQL: %s", sql, extra=extra)

        # Execute the SQL
        logger.info("Executing SQL...", extra=extra)
        columns, rows = execute_sql(sql)
        rows = _serialize_rows(rows)
        logger.info("Query returned %d rows, %d columns", len(rows), len(columns), extra=extra)

        # Infer chart from results
        chart = _infer_chart(columns, rows)

        # Generate a brief summary
        summary = None
        if rows:
            if len(rows) == 1 and len(columns) == 1:
                val = rows[0].get(columns[0], "")
                summary = f"The answer is **{val}**."
            elif len(rows) == 1:
                parts = [f"{col}: {rows[0].get(col, '')}" for col in columns]
                summary = " | ".join(parts)
            else:
                summary = f"Found **{len(rows)}** result{'s' if len(rows) != 1 else ''}."
        else:
            summary = "No results found for your query."

        return AskResponse(
            sql=sql,
            data=rows,
            columns=columns,
            chart=chart,
            summary=summary,
        )

    except ValueError as e:
        logger.warning("SQL safety check failed: %s", e, extra=extra)
        return AskResponse(error=str(e))

    except Exception as e:
        tb = traceback.format_exc()
        logger.error(
            "Error processing question [%s]: %s\n%s",
            type(e).__name__, e, tb,
            extra=extra,
        )

        raw_error = str(e)
        if "statement timeout" in raw_error.lower():
            user_msg = "Your query was too complex and timed out. Try a simpler question."
        elif "permission denied" in raw_error.lower():
            user_msg = "You don't have access to the requested data."
        else:
            user_msg = "Something went wrong processing your question. Try rephrasing it."

        # Include the real error details so the .NET backend can log them
        return AskResponse(
            error=user_msg,
            debug_error=f"[{request_id}] {type(e).__name__}: {raw_error}",
        )

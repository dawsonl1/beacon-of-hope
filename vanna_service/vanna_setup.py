"""
vanna_setup.py — SQL generation using OpenAI directly.
Loads training data (DDL, documentation, example Q&A pairs) at startup
and includes them as context in the system prompt.
"""

import json
import logging
from pathlib import Path
from openai import OpenAI

from vanna_service.config import OPENAI_API_KEY, OPENAI_MODEL, DATABASE_URL_READONLY

logger = logging.getLogger(__name__)

TRAINING_DIR = Path(__file__).parent / "training_data"


class SQLGenerator:
    """Generates SQL from natural language questions using OpenAI with training data context."""

    def __init__(self):
        self._client = OpenAI(api_key=OPENAI_API_KEY)
        self._model = OPENAI_MODEL
        self._ddl: list[str] = []
        self._documentation: str = ""
        self._example_pairs: list[dict] = []

    def add_ddl(self, ddl: str):
        self._ddl.append(ddl)

    def add_documentation(self, doc: str):
        self._documentation = doc

    def add_question_sql(self, question: str, sql: str):
        self._example_pairs.append({"question": question, "sql": sql})

    def _build_system_prompt(self) -> str:
        parts = [
            "You are a PostgreSQL SQL expert for a nonprofit managing safehouses. "
            "Given a natural language question or request, generate a single, valid "
            "PostgreSQL SELECT query that best answers it. "
            "Return ONLY the SQL query — no explanation, no markdown fences, no commentary.",
            "",
            "Rules:",
            "- Only generate SELECT or WITH (CTE) queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, etc.",
            "- Use PostgreSQL syntax.",
            "- Column and table names should use snake_case. Quote them with double quotes if needed.",
            "- ALWAYS try to generate a useful query, even if the question is vague or conversational. "
            "Interpret requests like 'show me a graph of X' or 'help me understand X' as requests "
            "for data that would make a good visualization.",
            "- For trend/graph requests, GROUP BY time periods (month, week) and ORDER BY date.",
            "- Only return NONE if the question is completely unrelated to the database (e.g. 'what is the weather').",
            "",
        ]

        if self._documentation:
            parts.append("## Database Documentation")
            parts.append(self._documentation)
            parts.append("")

        if self._ddl:
            parts.append("## Database Schema (DDL)")
            for ddl in self._ddl:
                parts.append(ddl)
            parts.append("")

        if self._example_pairs:
            parts.append("## Example Question → SQL Pairs")
            for pair in self._example_pairs:
                parts.append(f"Q: {pair['question']}")
                parts.append(f"SQL: {pair['sql']}")
                parts.append("")

        return "\n".join(parts)

    def generate_sql(self, question: str) -> str:
        """Generate SQL from a natural language question."""
        system_prompt = self._build_system_prompt()

        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
            temperature=0,
            max_completion_tokens=1024,
        )

        sql = response.choices[0].message.content.strip()

        # Strip markdown code fences if the model wraps the SQL
        if sql.startswith("```"):
            lines = sql.split("\n")
            lines = [line for line in lines if not line.strip().startswith("```")]
            sql = "\n".join(lines).strip()

        return sql


_gen: SQLGenerator | None = None


def get_vanna() -> SQLGenerator:
    global _gen
    if _gen is None:
        _gen = SQLGenerator()
        _load_training_data(_gen)
    return _gen


def _load_training_data(gen: SQLGenerator):
    """Load DDL, documentation, and example Q&A pairs from training_data/."""

    # Load documentation
    doc_path = TRAINING_DIR / "documentation.md"
    if doc_path.exists():
        gen.add_documentation(doc_path.read_text())
        logger.info("Loaded documentation from %s", doc_path)

    # Load example Q&A pairs
    pairs_path = TRAINING_DIR / "example_pairs.json"
    if pairs_path.exists():
        pairs = json.loads(pairs_path.read_text())
        for pair in pairs:
            gen.add_question_sql(pair["question"], pair["sql"])
        logger.info("Loaded %d example Q&A pairs", len(pairs))

    # Auto-extract DDL from the database
    if not DATABASE_URL_READONLY:
        logger.warning("DATABASE_URL_READONLY not set, skipping DDL extraction")
        return

    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(DATABASE_URL_READONLY, pool_pre_ping=True)

        with engine.connect() as conn:
            tables = conn.execute(text("""
                SELECT table_name FROM information_schema.table_privileges
                WHERE grantee = current_user AND privilege_type = 'SELECT'
                  AND table_schema = 'public'
                ORDER BY table_name
            """)).fetchall()

            for (table_name,) in tables:
                cols = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = :table AND table_schema = 'public'
                    ORDER BY ordinal_position
                """), {"table": table_name}).fetchall()

                if cols:
                    col_defs = []
                    for col_name, data_type, nullable, default in cols:
                        parts = [f'    "{col_name}" {data_type}']
                        if nullable == "NO":
                            parts.append("NOT NULL")
                        if default:
                            parts.append(f"DEFAULT {default}")
                        col_defs.append(" ".join(parts))

                    ddl = f'CREATE TABLE "{table_name}" (\n'
                    ddl += ",\n".join(col_defs)
                    ddl += "\n);"
                    gen.add_ddl(ddl)

            logger.info("Auto-extracted DDL for %d tables", len(tables))

    except Exception as e:
        logger.warning("Could not auto-extract DDL: %s", e)
        logger.info("Continuing with documentation and example pairs only")

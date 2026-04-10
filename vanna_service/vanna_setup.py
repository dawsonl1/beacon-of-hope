"""
vanna_setup.py — Configure Vanna instance with OpenAI LLM and ChromaDB vector store.
Loads training data from JSON files at startup.
"""

import json
import logging
from pathlib import Path
from vanna.openai import OpenAI_Chat
from vanna.chromadb import ChromaDB_VectorStore

from vanna_service.config import OPENAI_API_KEY, OPENAI_MODEL, DATABASE_URL_READONLY

logger = logging.getLogger(__name__)

TRAINING_DIR = Path(__file__).parent / "training_data"


class BeaconVanna(ChromaDB_VectorStore, OpenAI_Chat):
    """Vanna instance using OpenAI for LLM + ChromaDB for in-memory vector store."""

    def __init__(self):
        ChromaDB_VectorStore.__init__(self, config={})
        OpenAI_Chat.__init__(self, config={
            "api_key": OPENAI_API_KEY,
            "model": OPENAI_MODEL,
        })


_vn: BeaconVanna | None = None


def get_vanna() -> BeaconVanna:
    global _vn
    if _vn is None:
        _vn = BeaconVanna()
        _load_training_data(_vn)
    return _vn


def _load_training_data(vn: BeaconVanna):
    """Load DDL, documentation, and example Q&A pairs from training_data/."""

    # Load documentation
    doc_path = TRAINING_DIR / "documentation.md"
    if doc_path.exists():
        doc_text = doc_path.read_text()
        vn.add_documentation(doc_text)
        logger.info("Loaded documentation from %s", doc_path)

    # Load example Q&A pairs
    pairs_path = TRAINING_DIR / "example_pairs.json"
    if pairs_path.exists():
        pairs = json.loads(pairs_path.read_text())
        for pair in pairs:
            vn.add_question_sql(pair["question"], pair["sql"])
        logger.info("Loaded %d example Q&A pairs", len(pairs))

    # Auto-extract DDL from the database
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(DATABASE_URL_READONLY, pool_pre_ping=True)

        # Only extract DDL for tables we have access to
        with engine.connect() as conn:
            tables = conn.execute(text("""
                SELECT table_name FROM information_schema.table_privileges
                WHERE grantee = current_user AND privilege_type = 'SELECT'
                  AND table_schema = 'public'
                ORDER BY table_name
            """)).fetchall()

            for (table_name,) in tables:
                cols = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable,
                           column_default
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
                    vn.add_ddl(ddl)

            logger.info("Auto-extracted DDL for %d tables", len(tables))

    except Exception as e:
        logger.warning("Could not auto-extract DDL: %s", e)
        logger.info("Continuing with documentation and example pairs only")

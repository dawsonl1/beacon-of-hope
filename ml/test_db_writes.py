"""
Integration checks for prediction-table writes (Azure PostgreSQL).

Runs 8 ordered tests against:
  - ml_predictions (upsert/current snapshot)
  - ml_prediction_history (append-only history)
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any, Callable

from dotenv import load_dotenv


def _load_env() -> None:
    """Load env files and ensure DATABASE_URL is present."""
    ml_dir = Path(__file__).resolve().parent
    repo_root = ml_dir.parent

    if (repo_root / ".env").exists():
        load_dotenv(repo_root / ".env", override=False)
    if (ml_dir / ".env").exists():
        load_dotenv(ml_dir / ".env", override=False)

    if not os.getenv("DATABASE_URL"):
        raise RuntimeError(
            "Missing required environment variable: DATABASE_URL. "
            "Set it in your shell or ml/.env (see ml/.env.example)."
        )


_load_env()

from ml.utils_db import get_client, now_utc, write_predictions  # noqa: E402
from sqlalchemy import text  # noqa: E402


TABLE_PREDICTIONS = "ml_predictions"
TABLE_HISTORY = "ml_prediction_history"
RUN_ID = f"db-write-test-{uuid.uuid4()}"
MODEL_NAME = "reintegration-readiness"

PASS_COUNT = 0
FAIL_COUNT = 0


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _base_metadata(test_case: str) -> dict[str, Any]:
    return {
        "test_run_id": RUN_ID,
        "test_case": test_case,
        "script": "ml/test_db_writes.py",
    }


def _resident_record(
    resident_id: int,
    model_name: str,
    score: float | None,
    score_label: str,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    return {
        "entity_type": "resident",
        "entity_id": resident_id,
        "model_name": model_name,
        "model_version": "test-v1",
        "score": score,
        "score_label": score_label,
        "predicted_at": now_utc(),
        "metadata": metadata,
    }


def _org_insight_record() -> dict[str, Any]:
    metadata = _base_metadata("test6")
    metadata["top_findings"] = [
        {
            "theme": "Engagement",
            "insight": "Videos with testimonials generated the highest interaction this week.",
        }
    ]
    return {
        "entity_type": "org_insight",
        "entity_id": None,
        "model_name": "social-media-content",
        "model_version": "test-v1",
        "score": None,
        "score_label": "content_strategy",
        "predicted_at": now_utc(),
        "metadata": metadata,
    }


def _rows_with_run_id(engine: Any, table: str) -> list[dict[str, Any]]:
    with engine.connect() as conn:
        result = conn.execute(
            text(f"SELECT * FROM {table} WHERE metadata @> :filter"),
            {"filter": json.dumps({"test_run_id": RUN_ID})},
        )
        return [dict(row._mapping) for row in result]


def _cleanup_run_rows(engine: Any) -> None:
    with engine.begin() as conn:
        for table in [TABLE_PREDICTIONS, TABLE_HISTORY]:
            conn.execute(
                text(f"DELETE FROM {table} WHERE metadata @> :filter"),
                {"filter": json.dumps({"test_run_id": RUN_ID})},
            )


def _preflight_tables_exist(engine: Any) -> None:
    try:
        with engine.connect() as conn:
            conn.execute(text(f"SELECT id FROM {TABLE_PREDICTIONS} LIMIT 1"))
            conn.execute(text(f"SELECT id FROM {TABLE_HISTORY} LIMIT 1"))
    except Exception as exc:
        raise RuntimeError(
            "Preflight failed: required tables were not found or are not accessible. "
            "Run EF Core migrations first."
        ) from exc


def run_test(name: str, fn: Callable[[], None]) -> None:
    global PASS_COUNT, FAIL_COUNT
    try:
        fn()
        PASS_COUNT += 1
        print(f"PASS - {name}")
    except Exception as exc:
        FAIL_COUNT += 1
        print(f"FAIL - {name}: {exc}")


def main() -> None:
    client = get_client()
    _preflight_tables_exist(client)
    _cleanup_run_rows(client)

    def test_1_basic_write_to_predictions() -> None:
        metadata = _base_metadata("test1")
        metadata.update({"total_visits": 29, "visits_per_month": 1.8, "total_sessions": 52})
        record = _resident_record(
            resident_id=1, model_name=MODEL_NAME, score=73.2,
            score_label="Progressing", metadata=metadata,
        )
        write_predictions(client, [record])
        rows = _rows_with_run_id(client, TABLE_PREDICTIONS)
        match = [r for r in rows if r["entity_type"] == "resident" and r["entity_id"] == 1
                 and r["model_name"] == MODEL_NAME]
        _assert(len(match) >= 1, "expected at least one matching ml_predictions row")

    def test_2_upsert_overwrites_no_duplicate() -> None:
        metadata = _base_metadata("test2")
        metadata.update({"total_visits": 30, "visits_per_month": 2.0, "total_sessions": 55})
        record = _resident_record(
            resident_id=1, model_name=MODEL_NAME, score=75.0,
            score_label="Ready", metadata=metadata,
        )
        write_predictions(client, [record])
        with client.connect() as conn:
            result = conn.execute(text(
                "SELECT * FROM ml_predictions WHERE entity_type='resident' AND entity_id=1 AND model_name=:mn"
            ), {"mn": MODEL_NAME})
            rows = [dict(r._mapping) for r in result]
        _assert(len(rows) == 1, "expected exactly one upserted row")
        _assert(float(rows[0]["score"]) == 75.0, "expected score to be overwritten to 75.0")

    def test_3_history_appends_not_overwrite() -> None:
        record_a = _resident_record(1, MODEL_NAME, 61.0, "Progressing",
                                    {**_base_metadata("test3"), "variant": "a"})
        record_b = _resident_record(1, MODEL_NAME, 62.5, "Progressing",
                                    {**_base_metadata("test3"), "variant": "b"})
        write_predictions(client, [record_a])
        write_predictions(client, [record_b])
        rows = _rows_with_run_id(client, TABLE_HISTORY)
        match = [r for r in rows if r["entity_type"] == "resident" and r["entity_id"] == 1
                 and r["model_name"] == MODEL_NAME]
        _assert(len(match) >= 2, "expected at least 2 history rows")

    def test_4_multiple_models_per_resident() -> None:
        models = [
            ("reintegration-readiness", 74.0, "Progressing"),
            ("incident-early-warning-selfharm", 22.0, "Low"),
            ("incident-early-warning-runaway", 35.0, "Medium"),
        ]
        records = [
            _resident_record(1, mn, s, l, {**_base_metadata("test4"), "model_marker": mn})
            for mn, s, l in models
        ]
        write_predictions(client, records)
        rows = _rows_with_run_id(client, TABLE_PREDICTIONS)
        match = [r for r in rows if r["entity_type"] == "resident" and r["entity_id"] == 1]
        model_names = sorted({r["model_name"] for r in match})
        _assert(len(match) >= 3, "expected at least 3 rows for resident_id=1")

    def test_5_multiple_residents_one_model() -> None:
        records = [
            _resident_record(1, MODEL_NAME, 45.0, "Early Stage", {**_base_metadata("test5"), "r": 1}),
            _resident_record(2, MODEL_NAME, 60.0, "Progressing", {**_base_metadata("test5"), "r": 2}),
            _resident_record(3, MODEL_NAME, 82.0, "Ready", {**_base_metadata("test5"), "r": 3}),
        ]
        write_predictions(client, records)
        with client.connect() as conn:
            result = conn.execute(text(
                "SELECT * FROM ml_predictions WHERE entity_type='resident' AND model_name=:mn ORDER BY score"
            ), {"mn": MODEL_NAME})
            rows = [dict(r._mapping) for r in result]
        selected = [r for r in rows if r["entity_id"] in {1, 2, 3}]
        _assert(len(selected) >= 3, "expected at least residents 1,2,3")

    def test_6_org_insight_null_entity_id() -> None:
        write_predictions(client, [_org_insight_record()])
        rows = _rows_with_run_id(client, TABLE_PREDICTIONS)
        match = [r for r in rows if r["entity_type"] == "org_insight"
                 and r["entity_id"] is None and r["model_name"] == "social-media-content"]
        _assert(len(match) == 1, "expected one org_insight row with null entity_id")

    def test_7_metadata_json_readable() -> None:
        rows = _rows_with_run_id(client, TABLE_HISTORY)
        match = [r for r in rows if r["entity_type"] == "resident" and r["entity_id"] == 1
                 and r["model_name"] == MODEL_NAME]
        _assert(len(match) >= 1, "expected at least one history row for resident 1")
        md = match[0]["metadata"]
        if isinstance(md, str):
            md = json.loads(md)
        _assert(isinstance(md, dict), "expected metadata to be a dict")

    def test_8_cleanup() -> None:
        _cleanup_run_rows(client)
        _assert(len(_rows_with_run_id(client, TABLE_PREDICTIONS)) == 0, "ml_predictions cleanup failed")
        _assert(len(_rows_with_run_id(client, TABLE_HISTORY)) == 0, "ml_prediction_history cleanup failed")

    tests = [
        ("Test 1 - Basic write to ml_predictions", test_1_basic_write_to_predictions),
        ("Test 2 - Upsert overwrites, does not duplicate", test_2_upsert_overwrites_no_duplicate),
        ("Test 3 - History table appends, does not overwrite", test_3_history_appends_not_overwrite),
        ("Test 4 - Multiple models per resident", test_4_multiple_models_per_resident),
        ("Test 5 - Multiple residents, one model", test_5_multiple_residents_one_model),
        ("Test 6 - org_insight row with null entity_id", test_6_org_insight_null_entity_id),
        ("Test 7 - Metadata JSON is readable", test_7_metadata_json_readable),
        ("Test 8 - Clean up", test_8_cleanup),
    ]

    for test_name, test_fn in tests:
        run_test(test_name, test_fn)

    print("-" * 60)
    print(f"Passed: {PASS_COUNT} | Failed: {FAIL_COUNT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"FAIL - Preflight/setup: {exc}")
        print("Passed: 0 | Failed: 1")

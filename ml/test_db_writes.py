"""
Integration checks for Supabase prediction-table writes.

Runs 8 ordered tests against:
  - ml_predictions (upsert/current snapshot)
  - ml_prediction_history (append-only history)
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any, Callable

from dotenv import dotenv_values, load_dotenv


def _load_env() -> None:
    """Load env files and ensure minimum vars needed for DB writes are present."""
    ml_dir = Path(__file__).resolve().parent
    repo_root = ml_dir.parent
    env_example_path = ml_dir / ".env.example"
    env_local_path = ml_dir / ".env"
    env_root_path = repo_root / ".env"

    if env_root_path.exists():
        load_dotenv(env_root_path, override=False)
    if env_local_path.exists():
        load_dotenv(env_local_path, override=False)

    # Read template keys so missing local env setup is easier to diagnose.
    template_keys = set()
    if env_example_path.exists():
        template_values = dotenv_values(env_example_path)
        template_keys = {k for k in template_values.keys() if k}

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    missing: list[str] = []
    if not supabase_url:
        missing.append("SUPABASE_URL")
    if not service_key:
        missing.append("SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)")

    if missing:
        template_hint = ""
        if template_keys:
            template_hint = f" Template keys found in ml/.env.example: {', '.join(sorted(template_keys))}."
        raise RuntimeError(
            "Missing required environment variables: "
            f"{', '.join(missing)}. "
            "Set them in your shell or ml/.env (using ml/.env.example as a template)."
            f"{template_hint}"
        )

    # utils_db imports config.py, which supports either key name via fallback.
    # Set both aliases so local shells can provide either one.
    if service_key:
        os.environ.setdefault("SUPABASE_SERVICE_KEY", service_key)
        os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", service_key)

    # Provide harmless defaults so config import does not fail if unrelated vars are absent.
    os.environ.setdefault("SUPABASE_PROJECT_ID", "local-test-project")
    os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "local-test-publishable-key")
    os.environ.setdefault("SUPABASE_ANON_KEY", "local-test-anon-key")
    os.environ.setdefault("SUPABASE_DB_URL", "postgresql://local-test")


_load_env()

# Import after env is loaded.
from utils_db import get_client, now_utc, write_predictions  # noqa: E402


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


def _rows_with_run_id(client: Any, table: str) -> list[dict[str, Any]]:
    response = client.table(table).select("*").contains("metadata", {"test_run_id": RUN_ID}).execute()
    return response.data or []


def _cleanup_run_rows(client: Any) -> None:
    client.table(TABLE_PREDICTIONS).delete().contains("metadata", {"test_run_id": RUN_ID}).execute()
    client.table(TABLE_HISTORY).delete().contains("metadata", {"test_run_id": RUN_ID}).execute()


def _preflight_tables_exist(client: Any) -> None:
    try:
        client.table(TABLE_PREDICTIONS).select("id").limit(1).execute()
        client.table(TABLE_HISTORY).select("id").limit(1).execute()
    except Exception as exc:  # pragma: no cover - integration preflight path
        raise RuntimeError(
            "Preflight failed: required tables were not found or are not accessible. "
            "Run the migration/CREATE TABLE SQL for ml_predictions and ml_prediction_history first."
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
        metadata.update(
            {
                "total_visits": 29,
                "visits_per_month": 1.8,
                "total_sessions": 52,
            }
        )
        record = _resident_record(
            resident_id=1,
            model_name=MODEL_NAME,
            score=73.2,
            score_label="Progressing",
            metadata=metadata,
        )
        write_predictions(client, [record])

        rows = _rows_with_run_id(client, TABLE_PREDICTIONS)
        match = [
            r
            for r in rows
            if r.get("entity_type") == "resident"
            and r.get("entity_id") == 1
            and r.get("model_name") == MODEL_NAME
            and r.get("metadata", {}).get("test_case") == "test1"
        ]
        _assert(len(match) == 1, "expected one matching ml_predictions row")

    def test_2_upsert_overwrites_no_duplicate() -> None:
        metadata = _base_metadata("test2")
        metadata.update({"total_visits": 30, "visits_per_month": 2.0, "total_sessions": 55})
        record = _resident_record(
            resident_id=1,
            model_name=MODEL_NAME,
            score=75.0,
            score_label="Ready",
            metadata=metadata,
        )
        write_predictions(client, [record])

        rows = client.table(TABLE_PREDICTIONS).select("*").eq("entity_type", "resident").eq("entity_id", 1).eq(
            "model_name", MODEL_NAME
        ).execute().data or []
        _assert(len(rows) == 1, "expected exactly one upserted row")
        _assert(float(rows[0]["score"]) == 75.0, "expected score to be overwritten to 75.0")

    def test_3_history_appends_not_overwrite() -> None:
        record_a = _resident_record(
            resident_id=1,
            model_name=MODEL_NAME,
            score=61.0,
            score_label="Progressing",
            metadata={**_base_metadata("test3"), "variant": "a"},
        )
        record_b = _resident_record(
            resident_id=1,
            model_name=MODEL_NAME,
            score=62.5,
            score_label="Progressing",
            metadata={**_base_metadata("test3"), "variant": "b"},
        )
        write_predictions(client, [record_a])
        write_predictions(client, [record_b])

        rows = _rows_with_run_id(client, TABLE_HISTORY)
        match = [
            r
            for r in rows
            if r.get("entity_type") == "resident"
            and r.get("entity_id") == 1
            and r.get("model_name") == MODEL_NAME
            and r.get("metadata", {}).get("test_case") == "test3"
        ]
        _assert(len(match) == 2, "expected exactly 2 history rows for test3")

    def test_4_multiple_models_per_resident() -> None:
        models = [
            ("reintegration-readiness", 74.0, "Progressing"),
            ("incident-early-warning-selfharm", 22.0, "Low"),
            ("incident-early-warning-runaway", 35.0, "Medium"),
        ]
        records = []
        for model_name, score, label in models:
            records.append(
                _resident_record(
                    resident_id=1,
                    model_name=model_name,
                    score=score,
                    score_label=label,
                    metadata={**_base_metadata("test4"), "model_marker": model_name},
                )
            )
        write_predictions(client, records)

        rows = _rows_with_run_id(client, TABLE_PREDICTIONS)
        match = [r for r in rows if r.get("entity_type") == "resident" and r.get("entity_id") == 1 and r.get("metadata", {}).get("test_case") == "test4"]
        model_names = sorted({r.get("model_name") for r in match})
        _assert(len(match) == 3, "expected 3 rows for resident_id=1")
        _assert(
            model_names == sorted([m[0] for m in models]),
            "expected one row per specified model_name",
        )

    def test_5_multiple_residents_one_model() -> None:
        records = [
            _resident_record(1, MODEL_NAME, 45.0, "Early Stage", {**_base_metadata("test5"), "resident_marker": 1}),
            _resident_record(2, MODEL_NAME, 60.0, "Progressing", {**_base_metadata("test5"), "resident_marker": 2}),
            _resident_record(3, MODEL_NAME, 82.0, "Ready", {**_base_metadata("test5"), "resident_marker": 3}),
        ]
        write_predictions(client, records)

        rows = client.table(TABLE_PREDICTIONS).select("*").eq("entity_type", "resident").eq("model_name", MODEL_NAME).order(
            "score", desc=False
        ).execute().data or []
        selected = [r for r in rows if r.get("entity_id") in {1, 2, 3}]
        _assert(len(selected) >= 3, "expected at least residents 1,2,3 for model")
        ids_in_order = [r.get("entity_id") for r in selected[:3]]
        _assert(ids_in_order == [1, 2, 3], f"expected resident order [1,2,3], got {ids_in_order}")

    def test_6_org_insight_null_entity_id() -> None:
        write_predictions(client, [_org_insight_record()])

        rows = _rows_with_run_id(client, TABLE_PREDICTIONS)
        match = [
            r
            for r in rows
            if r.get("entity_type") == "org_insight"
            and r.get("entity_id") is None
            and r.get("model_name") == "social-media-content"
            and r.get("metadata", {}).get("test_case") == "test6"
        ]
        _assert(len(match) == 1, "expected one org_insight row with null entity_id")
        findings = match[0].get("metadata", {}).get("top_findings", [])
        _assert(isinstance(findings, list) and len(findings) >= 1, "expected non-empty top_findings array")

    def test_7_metadata_json_readable() -> None:
        # Test 2 upserts over Test 1 in current table, so read preserved Test 1 record from history.
        rows = _rows_with_run_id(client, TABLE_HISTORY)
        match = [
            r
            for r in rows
            if r.get("entity_type") == "resident"
            and r.get("entity_id") == 1
            and r.get("model_name") == MODEL_NAME
            and r.get("metadata", {}).get("test_case") == "test1"
        ]
        _assert(len(match) == 1, "expected one preserved Test 1 history row")
        md = match[0].get("metadata", {})
        _assert(md.get("total_visits") == 29, "expected metadata.total_visits == 29")
        _assert(float(md.get("visits_per_month")) == 1.8, "expected metadata.visits_per_month == 1.8")

    def test_8_cleanup() -> None:
        _cleanup_run_rows(client)
        predictions_remaining = _rows_with_run_id(client, TABLE_PREDICTIONS)
        history_remaining = _rows_with_run_id(client, TABLE_HISTORY)
        _assert(len(predictions_remaining) == 0, "ml_predictions cleanup failed")
        _assert(len(history_remaining) == 0, "ml_prediction_history cleanup failed")

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

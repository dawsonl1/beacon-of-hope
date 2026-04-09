"""
db.py — Read-only database access for the AI harness.
Provides tool functions that Claude/GPT calls during agentic loops.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from ai_harness.config import DATABASE_URL_READONLY

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(DATABASE_URL_READONLY, pool_pre_ping=True)
    return _engine


def fetch_voice_guide() -> dict | None:
    with get_engine().connect() as conn:
        row = conn.execute(text("SELECT * FROM voice_guide LIMIT 1")).mappings().first()
        return dict(row) if row else None


def fetch_settings() -> dict | None:
    with get_engine().connect() as conn:
        row = conn.execute(text("SELECT * FROM social_media_settings LIMIT 1")).mappings().first()
        return dict(row) if row else None


def fetch_hashtags(pillar: str | None = None, platform: str | None = None) -> list[dict]:
    query = "SELECT * FROM hashtag_sets WHERE 1=1"
    params = {}
    if pillar:
        query += " AND (pillar = :pillar OR pillar = 'all')"
        params["pillar"] = pillar
    if platform:
        query += " AND (platform = :platform OR platform = 'all')"
        params["platform"] = platform
    with get_engine().connect() as conn:
        rows = conn.execute(text(query), params).mappings().all()
        return [dict(r) for r in rows]


def fetch_unused_photos(limit: int = 10) -> list[dict]:
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT * FROM media_library
                WHERE consent_confirmed = true
                ORDER BY used_count ASC, uploaded_at DESC
                LIMIT :limit
            """),
            {"limit": limit},
        ).mappings().all()
        return [dict(r) for r in rows]


def fetch_unused_facts(limit: int = 5) -> list[dict]:
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT * FROM content_facts
                WHERE is_active = true
                ORDER BY usage_count ASC, added_at DESC
                LIMIT :limit
            """),
            {"limit": limit},
        ).mappings().all()
        return [dict(r) for r in rows]


def fetch_talking_points(topic: str | None = None) -> list[dict]:
    query = "SELECT * FROM content_talking_points WHERE is_active = true"
    params = {}
    if topic:
        query += " AND topic = :topic"
        params["topic"] = topic
    query += " ORDER BY usage_count ASC"
    with get_engine().connect() as conn:
        rows = conn.execute(text(query), params).mappings().all()
        return [dict(r) for r in rows]


def fetch_cta_config() -> dict | None:
    with get_engine().connect() as conn:
        row = conn.execute(
            text("SELECT * FROM cta_configs WHERE is_active = true ORDER BY priority ASC LIMIT 1")
        ).mappings().first()
        return dict(row) if row else None


def fetch_pillar_mix(days: int = 14) -> dict:
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT content_pillar, COUNT(*) as cnt
                FROM automated_posts
                WHERE created_at >= NOW() - INTERVAL ':days days'
                  AND status NOT IN ('rejected')
                GROUP BY content_pillar
            """.replace(":days", str(int(days)))),
        ).mappings().all()
        return {r["content_pillar"]: r["cnt"] for r in rows}


def fetch_awareness_dates(next_days: int = 7) -> list[dict]:
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT * FROM awareness_dates
                WHERE is_active = true
                  AND (
                    (date_start <= CURRENT_DATE + INTERVAL ':days days' AND date_end >= CURRENT_DATE)
                    OR (date_start BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ':days days')
                  )
                ORDER BY date_start
            """.replace(":days", str(int(next_days)))),
        ).mappings().all()
        return [dict(r) for r in rows]


def fetch_scheduled_count() -> int:
    with get_engine().connect() as conn:
        row = conn.execute(
            text("SELECT COUNT(*) as cnt FROM automated_posts WHERE status IN ('scheduled', 'ready_to_publish')")
        ).mappings().first()
        return row["cnt"] if row else 0


def fetch_approved_examples(pillar: str, platform: str, limit: int = 3) -> list[dict]:
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT content, content_pillar, platform, engagement_likes, engagement_shares, engagement_comments
                FROM automated_posts
                WHERE status = 'published'
                  AND content_pillar = :pillar
                  AND platform = :platform
                  AND content IS NOT NULL
                ORDER BY (COALESCE(engagement_likes,0) + COALESCE(engagement_shares,0) + COALESCE(engagement_comments,0)) DESC
                LIMIT :limit
            """),
            {"pillar": pillar, "platform": platform, "limit": limit},
        ).mappings().all()
        return [dict(r) for r in rows]

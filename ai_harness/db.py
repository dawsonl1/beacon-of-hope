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


# ── Newsletter helpers ──────────────────────────────────────────────────────


def fetch_monthly_published_posts(year: int, month: int) -> list[dict]:
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT content, content_pillar, platform,
                       COALESCE(engagement_likes,0) + COALESCE(engagement_shares,0) + COALESCE(engagement_comments,0) as total_engagement
                FROM automated_posts
                WHERE status = 'published'
                  AND EXTRACT(YEAR FROM created_at) = :year
                  AND EXTRACT(MONTH FROM created_at) = :month
                ORDER BY total_engagement DESC
                LIMIT 5
            """),
            {"year": year, "month": month},
        ).mappings().all()
        return [dict(r) for r in rows]


def fetch_monthly_donation_stats(year: int, month: int) -> dict:
    with get_engine().connect() as conn:
        row = conn.execute(
            text("""
                SELECT COALESCE(SUM(amount), 0) as total_amount,
                       COUNT(DISTINCT supporter_id) as donor_count,
                       COUNT(*) as donation_count
                FROM donations
                WHERE EXTRACT(YEAR FROM donation_date) = :year
                  AND EXTRACT(MONTH FROM donation_date) = :month
            """),
            {"year": year, "month": month},
        ).mappings().first()
        return dict(row) if row else {"total_amount": 0, "donor_count": 0, "donation_count": 0}


def fetch_monthly_resident_metrics(year: int, month: int) -> dict | None:
    with get_engine().connect() as conn:
        # Try exact month first, fall back to most recent month with data
        row = conn.execute(
            text("""
                SELECT SUM(active_residents) as active_residents,
                       AVG(avg_education_progress) as avg_education_progress,
                       AVG(avg_health_score) as avg_health_score
                FROM safehouse_monthly_metrics
                WHERE month_start = (
                    SELECT MAX(month_start) FROM safehouse_monthly_metrics
                    WHERE month_start <= make_date(:year, :month, 1)
                )
            """),
            {"year": year, "month": month},
        ).mappings().first()
        # If no data at or before requested month, use the latest available
        if row and row["active_residents"] is None:
            row = conn.execute(
                text("""
                    SELECT SUM(active_residents) as active_residents,
                           AVG(avg_education_progress) as avg_education_progress,
                           AVG(avg_health_score) as avg_health_score
                    FROM safehouse_monthly_metrics
                    WHERE month_start = (SELECT MAX(month_start) FROM safehouse_monthly_metrics)
                """),
            ).mappings().first()
        return dict(row) if row else None


def fetch_upcoming_events(days: int = 30) -> list[dict]:
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT title, event_type, event_date
                FROM calendar_events
                WHERE event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL ':days days'
                  AND status = 'Scheduled'
                ORDER BY event_date
                LIMIT 10
            """.replace(":days", str(int(days)))),
        ).mappings().all()
        return [dict(r) for r in rows]


def fetch_impact_snapshot() -> dict | None:
    with get_engine().connect() as conn:
        row = conn.execute(
            text("""
                SELECT *
                FROM public_impact_snapshots
                WHERE is_published = true
                ORDER BY snapshot_date DESC
                LIMIT 1
            """)
        ).mappings().first()
        return dict(row) if row else None


def fetch_best_timing(platform: str, limit: int = 3) -> list[dict]:
    """Return top ML-predicted day/hour combos for a platform from ml_predictions."""
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("""
                SELECT metadata::jsonb->>'day' as day,
                       (metadata::jsonb->>'hour')::int as hour,
                       score
                FROM ml_predictions
                WHERE model_name = 'social-media-timing'
                  AND metadata::jsonb->>'platform' = :platform
                ORDER BY score DESC
                LIMIT :limit
            """),
            {"platform": platform, "limit": limit},
        ).mappings().all()
        return [dict(r) for r in rows]

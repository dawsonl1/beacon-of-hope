"""
photo_selector.py — Agentic photo selection using GPT vision.
Picks the best photo from the media library for a given post.
"""

import json
import logging
from ai_harness import db
from ai_harness.llm import build_system_prompt, run_tool_loop

logger = logging.getLogger(__name__)

PHOTO_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_photos",
            "description": "Returns photos from the media library matching filters. Returns metadata (id, caption, activity_type, used_count) but NOT the image itself.",
            "parameters": {
                "type": "object",
                "properties": {
                    "activity_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Filter by activity types (art_therapy, sports, meal, outing, celebration, daily_life, facility, other)",
                    },
                    "limit": {"type": "integer", "default": 10},
                },
                "required": [],
            },
        },
    },
]

TOOL_HANDLERS = {
    "query_photos": lambda activity_types=None, limit=10: _query_photos(activity_types, limit),
}


def _query_photos(activity_types: list[str] | None = None, limit: int = 10) -> list[dict]:
    photos = db.fetch_unused_photos(limit=50)
    if activity_types:
        photos = [p for p in photos if p.get("activity_type") in activity_types]
    return [
        {
            "media_library_item_id": p["media_library_item_id"],
            "caption": p.get("caption", ""),
            "activity_type": p.get("activity_type", ""),
            "used_count": p.get("used_count", 0),
        }
        for p in photos[:limit]
    ]


def select_photo(pillar: str, platform: str, post_description: str) -> dict:
    """
    Uses GPT to pick the best photo for a post.
    For now uses metadata only (caption + activity type).
    Vision-based selection can be added later when we serve images.
    """
    system_prompt = build_system_prompt() + """

## Your Role: Photo Editor
You are selecting the best photo from the media library for a social media post.
Consider the post's pillar, tone, and message when choosing. Pick photos whose
caption and activity type best support the post's content.
"""

    user_prompt = f"""Select the best photo for this post:
- Pillar: {pillar}
- Platform: {platform}
- Post description: {post_description}

Use the query_photos tool to browse available photos, then choose the best one.

Return ONLY a JSON object with:
- "photo_id": the media_library_item_id of the chosen photo
- "reasoning": why you chose this photo
"""

    result = run_tool_loop(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        tools=PHOTO_TOOLS,
        tool_handlers=TOOL_HANDLERS,
    )

    cleaned = result.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse photo selection: {cleaned[:200]}")
        # Fallback: pick the least-used photo
        photos = db.fetch_unused_photos(limit=1)
        if photos:
            return {"photo_id": photos[0]["media_library_item_id"], "reasoning": "Fallback: least-used photo"}
        return {"photo_id": None, "reasoning": "No photos available"}

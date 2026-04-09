"""
planner.py — Agentic content planning.
Uses GPT with tool use to decide what posts to generate today.
"""

import json
import logging
from ai_harness import db
from ai_harness.llm import build_system_prompt, run_tool_loop

logger = logging.getLogger(__name__)

# Tool definitions for OpenAI function calling
PLANNER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weekly_target",
            "description": "Returns the configured posts-per-week target and active platforms.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_pillar_mix",
            "description": "Returns the pillar distribution over the last N days vs. target ratios.",
            "parameters": {
                "type": "object",
                "properties": {"days": {"type": "integer", "description": "Lookback window in days", "default": 14}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_scheduled_count",
            "description": "Returns how many posts are currently scheduled or ready to publish this week.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_unused_photos",
            "description": "Returns recent photos from the media library that haven't been used in posts yet.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "default": 10}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_unused_facts",
            "description": "Returns curated facts that haven't been used recently, with their categories and sources.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "default": 5}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_talking_points",
            "description": "Returns org-approved talking points for the Solution pillar.",
            "parameters": {
                "type": "object",
                "properties": {"topic": {"type": "string", "description": "Optional topic filter"}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_awareness_dates",
            "description": "Returns upcoming awareness dates and events in the next N days.",
            "parameters": {
                "type": "object",
                "properties": {"next_days": {"type": "integer", "default": 7}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cta_config",
            "description": "Returns the current highest-priority active call-to-action (fundraising goal or volunteer need).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

# Map tool names to handler functions
TOOL_HANDLERS = {
    "get_weekly_target": lambda: _get_weekly_target(),
    "get_pillar_mix": lambda days=14: _get_pillar_mix(days),
    "get_scheduled_count": lambda: {"scheduled_count": db.fetch_scheduled_count()},
    "get_unused_photos": lambda limit=10: db.fetch_unused_photos(limit),
    "get_unused_facts": lambda limit=5: db.fetch_unused_facts(limit),
    "get_awareness_dates": lambda next_days=7: db.fetch_awareness_dates(next_days),
    "get_talking_points": lambda topic=None: db.fetch_talking_points(topic),
    "get_cta_config": lambda: db.fetch_cta_config() or {"error": "No active CTA configured"},
}


def _get_weekly_target() -> dict:
    settings = db.fetch_settings()
    if not settings:
        return {"posts_per_week": 10, "platforms_active": ["instagram", "facebook"]}
    platforms = settings.get("platforms_active", '["instagram","facebook"]')
    if isinstance(platforms, str):
        try:
            platforms = json.loads(platforms)
        except json.JSONDecodeError:
            platforms = ["instagram", "facebook"]
    return {
        "posts_per_week": settings.get("posts_per_week", 10),
        "platforms_active": platforms,
    }


def _get_pillar_mix(days: int = 14) -> dict:
    settings = db.fetch_settings()
    actual = db.fetch_pillar_mix(days)
    target = {}
    if settings:
        target = {
            "safehouse_life": settings.get("pillar_ratio_safehouse_life", 30),
            "the_problem": settings.get("pillar_ratio_the_problem", 25),
            "the_solution": settings.get("pillar_ratio_the_solution", 20),
            "donor_impact": settings.get("pillar_ratio_donor_impact", 15),
            "call_to_action": settings.get("pillar_ratio_call_to_action", 10),
        }
    return {"actual_last_n_days": actual, "target_ratios_percent": target, "lookback_days": days}


def plan_content(max_posts: int = 10) -> list[dict]:
    """
    Uses GPT with tools to plan what posts to generate.
    Returns a list of post assignments.
    """
    system_prompt = build_system_prompt() + """

## Your Role: Content Planner
You are planning what social media posts to generate today. Use the tools to understand:
- What's the weekly target and which platforms are active?
- What's the current pillar mix vs. target ratios?
- How many posts are already scheduled?
- What raw material is available (photos, facts, talking points, CTAs)?

Then decide what posts to generate to maintain the target pillar distribution.
"""

    user_prompt = f"""Plan today's content generation batch. Max {max_posts} posts.

Use the tools to check the current state, then return a JSON object with a "plan" array.
Each item in the plan should have:
- "pillar": one of safehouse_life, the_problem, the_solution, donor_impact, call_to_action
- "platform": one of instagram, facebook, twitter
- "photo_id": integer or null (media_library_item_id for safehouse_life posts)
- "fact_id": integer or null (content_fact_id for problem/solution posts)
- "talking_point_id": integer or null (for solution posts)
- "reasoning": short explanation of why this post was chosen

Return ONLY the JSON object."""

    result = run_tool_loop(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        tools=PLANNER_TOOLS,
        tool_handlers=TOOL_HANDLERS,
    )

    # Strip markdown code fences if present
    cleaned = result.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)

    try:
        parsed = json.loads(cleaned)
        return parsed.get("plan", [])
    except json.JSONDecodeError:
        logger.error(f"Failed to parse planner response: {cleaned[:200]}")
        return []

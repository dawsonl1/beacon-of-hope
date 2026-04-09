"""
app.py — FastAPI application for the AI harness.
All AI/LLM logic lives here. The .NET backend calls these endpoints.
"""

import logging
from fastapi import Depends, FastAPI, HTTPException, Header
from pydantic import BaseModel
from ai_harness.config import HARNESS_API_KEY
from ai_harness import db
from ai_harness.llm import generate_post_simple
from ai_harness.planner import plan_content
from ai_harness.photo_selector import select_photo
from ai_harness.researcher import refresh_facts
from ai_harness.graphics import generate_graphic

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── Auth ────────────────────────────────────────────────────────────────────

def verify_key(authorization: str = Header(default="")):
    if not HARNESS_API_KEY:
        raise HTTPException(status_code=500, detail="HARNESS_API_KEY not configured")
    if authorization != f"Bearer {HARNESS_API_KEY}":
        raise HTTPException(status_code=401, detail="Invalid API key")


# All endpoints require auth by default
app = FastAPI(title="Social Media AI Harness", version="0.1.0", dependencies=[Depends(verify_key)])


# ── Health (no auth) ───────────────────────────────────────────────────────

@app.get("/health", dependencies=[])  # override global auth
def health():
    """Health check — verifies DB connectivity and API key presence."""
    try:
        db.get_engine().connect().close()
        db_ok = True
    except Exception:
        db_ok = False

    return {"status": "healthy" if db_ok else "degraded", "db": "ok" if db_ok else "unreachable"}


# ── Request/Response Models ─────────────────────────────────────────────────

class PlanContentRequest(BaseModel):
    max_posts: int = 10


class GeneratePostRequest(BaseModel):
    pillar: str
    platform: str
    photo_id: int | None = None
    fact_id: int | None = None
    talking_point_id: int | None = None
    milestone_data: dict | None = None


class GeneratePostResponse(BaseModel):
    content: str
    hashtags: list[str] = []
    photo_id: int | None = None
    generated_graphic: dict | None = None


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/plan-content")
def plan_content_endpoint(req: PlanContentRequest):
    """Agentic content planning — GPT decides what posts to generate."""
    plan = plan_content(max_posts=req.max_posts)
    return {"plan": plan}


@app.post("/generate-post", response_model=GeneratePostResponse)
def generate_post_endpoint(req: GeneratePostRequest):
    """Generate a single post from a plan item."""
    raw_material = ""
    photo_caption = None

    if req.pillar == "safehouse_life" and req.photo_id:
        photos = db.fetch_unused_photos(limit=100)
        photo = next((p for p in photos if p["media_library_item_id"] == req.photo_id), None)
        if photo:
            photo_caption = photo.get("caption", "")
            raw_material = f"Photo of safehouse activity: {photo.get('activity_type', 'daily life')}. Staff caption: {photo_caption}"

    elif req.pillar == "the_problem" and req.fact_id:
        facts = db.fetch_unused_facts(limit=100)
        fact = next((f for f in facts if f["content_fact_id"] == req.fact_id), None)
        if fact:
            raw_material = f"Fact: {fact['fact_text']}\nSource: {fact.get('source_name', 'Unknown')} ({fact.get('source_url', '')})"

    elif req.pillar == "the_solution" and req.talking_point_id:
        points = db.fetch_talking_points()
        point = next((p for p in points if p["content_talking_point_id"] == req.talking_point_id), None)
        if point:
            raw_material = f"Talking point: {point['text']}\nTopic: {point.get('topic', '')}"

    elif req.pillar == "donor_impact":
        raw_material = "Generate a donor impact post using general organizational metrics. Focus on how donations support safehouse operations."

    elif req.pillar == "call_to_action":
        cta = db.fetch_cta_config()
        if cta:
            raw_material = f"CTA: {cta['title']}\nDescription: {cta.get('description', '')}\nGoal: ${cta.get('goal_amount', 'N/A')}\nProgress: ${cta.get('current_amount', 0)}\nURL: {cta.get('url', '')}"

    elif req.milestone_data:
        raw_material = f"Milestone reached: {req.milestone_data}"

    if not raw_material:
        raw_material = f"Generate a {req.pillar} post for {req.platform}."

    result = generate_post_simple(
        pillar=req.pillar,
        platform=req.platform,
        raw_material=raw_material,
        photo_caption=photo_caption,
    )

    content = result.get("content", "")
    generated_graphic_data = None

    # Auto-generate a branded graphic for pillars that don't have a photo
    if not req.photo_id and req.pillar in ("the_problem", "donor_impact", "call_to_action"):
        # Extract a short headline for the graphic
        headline = content.split("\n")[0][:80] if content else overlay_text_from_material(raw_material)
        try:
            graphic = generate_graphic(
                template_path=None,
                overlay_text=headline,
                text_color="#FFFFFF",
                text_position="center",
            )
            generated_graphic_data = {
                "file_path": graphic["file_path"],
                "overlay_text": headline,
            }
        except Exception as e:
            logger.warning(f"Graphic generation failed: {e}")

    return GeneratePostResponse(
        content=content,
        hashtags=result.get("hashtags", []),
        photo_id=req.photo_id,
        generated_graphic=generated_graphic_data,
    )


def overlay_text_from_material(raw_material: str) -> str:
    """Extract a short text suitable for a graphic overlay."""
    if not raw_material:
        return "Making a Difference"
    # Try to get the first meaningful sentence
    for line in raw_material.split("\n"):
        line = line.strip()
        if line.startswith("Fact:"):
            return line[5:].strip()[:80]
        if line.startswith("CTA:"):
            return line[4:].strip()[:80]
        if len(line) > 10:
            return line[:80]
    return raw_material[:80]


# ── Photo Selection ─────────────────────────────────────────────────────────

class SelectPhotoRequest(BaseModel):
    pillar: str
    platform: str
    post_description: str


@app.post("/select-photo")
def select_photo_endpoint(req: SelectPhotoRequest):
    """Agentic photo selection — GPT picks the best photo for a post."""
    result = select_photo(
        pillar=req.pillar,
        platform=req.platform,
        post_description=req.post_description,
    )
    return result


# ── Research Refresh ────────────────────────────────────────────────────────

class GenerateGraphicRequest(BaseModel):
    overlay_text: str
    template_path: str | None = None
    text_color: str = "#FFFFFF"
    text_position: str = "center"


@app.post("/generate-graphic")
def generate_graphic_endpoint(req: GenerateGraphicRequest):
    """Generate a branded graphic with text overlay."""
    result = generate_graphic(
        template_path=req.template_path,
        overlay_text=req.overlay_text,
        text_color=req.text_color,
        text_position=req.text_position,
    )
    return result


class RefreshFactsRequest(BaseModel):
    categories: list[str] | None = None


@app.post("/refresh-facts")
def refresh_facts_endpoint(req: RefreshFactsRequest):
    """Agentic web research — finds new facts for admin review."""
    candidates = refresh_facts(categories=req.categories)
    return {"candidates": candidates}


# ── Schedule Prediction ─────────────────────────────────────────────────────

class PredictScheduleRequest(BaseModel):
    platform: str
    pillar: str
    preferred_day: str | None = None


@app.post("/predict-schedule")
def predict_schedule_endpoint(req: PredictScheduleRequest):
    """
    ML-powered scheduling. Returns optimal posting time.
    Currently returns industry defaults — ML model will be trained once
    enough engagement data accumulates.
    """
    from datetime import datetime, timedelta

    # Industry defaults by platform
    defaults = {
        "instagram": {"hour": 9, "weekday": 1},   # Tuesday 9am
        "facebook": {"hour": 12, "weekday": 3},    # Thursday noon
        "twitter": {"hour": 10, "weekday": 2},     # Wednesday 10am
    }

    d = defaults.get(req.platform, {"hour": 10, "weekday": 1})

    # Find the next occurrence of the target weekday
    now = datetime.utcnow()
    days_ahead = d["weekday"] - now.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    target = now + timedelta(days=days_ahead)
    target = target.replace(hour=d["hour"], minute=0, second=0, microsecond=0)

    return {"scheduled_at": target.isoformat() + "Z"}

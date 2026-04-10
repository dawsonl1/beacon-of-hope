"""
app.py — FastAPI application for the AI harness.
All AI/LLM logic lives here. The .NET backend calls these endpoints.
Includes: content planning, post generation, photo selection, newsletter generation.
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
    ML-powered scheduling. Queries the pre-computed timing predictions
    from ml_predictions (written nightly by the ML pipeline) to find the
    optimal day/hour for the given platform, then returns the next
    occurrence of that slot within 7 days of the frozen app date.
    Falls back to industry defaults if no ML predictions exist.
    """
    from datetime import datetime, timedelta
    from ai_harness.config import APP_TODAY

    DAY_TO_WEEKDAY = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
        "Friday": 4, "Saturday": 5, "Sunday": 6,
    }

    # Try ML predictions first (platform names in DB are title-case)
    platform_title = req.platform.title() if req.platform else ""
    best = db.fetch_best_timing(platform_title, limit=1)

    if best and best[0].get("day") in DAY_TO_WEEKDAY:
        target_weekday = DAY_TO_WEEKDAY[best[0]["day"]]
        target_hour = int(best[0]["hour"])
    else:
        # Fallback: industry defaults
        defaults = {
            "instagram": {"hour": 9, "weekday": 1},
            "facebook": {"hour": 12, "weekday": 3},
            "twitter": {"hour": 10, "weekday": 2},
        }
        d = defaults.get(req.platform, {"hour": 10, "weekday": 1})
        target_weekday = d["weekday"]
        target_hour = d["hour"]

    # Find next occurrence of that weekday within 7 days of frozen date
    days_ahead = target_weekday - APP_TODAY.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    target = APP_TODAY + timedelta(days=days_ahead)
    target = target.replace(hour=target_hour, minute=0, second=0, microsecond=0)

    return {"scheduled_at": target.isoformat() + "Z"}


# ── Newsletter Generation ──────────────────────────────────────────────────

class GenerateNewsletterRequest(BaseModel):
    year: int | None = None
    month: int | None = None


@app.post("/generate-newsletter")
def generate_newsletter_endpoint(req: GenerateNewsletterRequest):
    """Generate a monthly newsletter using GPT, aggregating data from the DB."""
    from datetime import datetime
    from ai_harness.llm import build_system_prompt
    from ai_harness.config import OPENAI_API_KEY, OPENAI_MODEL, APP_TODAY
    from openai import OpenAI
    year = req.year or APP_TODAY.year
    month = req.month or APP_TODAY.month

    # Aggregate monthly data
    posts = db.fetch_monthly_published_posts(year, month)
    donations = db.fetch_monthly_donation_stats(year, month)
    metrics = db.fetch_monthly_resident_metrics(year, month)
    events = db.fetch_upcoming_events(days=30)
    impact = db.fetch_impact_snapshot()
    cta = db.fetch_cta_config()
    voice = db.fetch_voice_guide()

    # Build data context for GPT
    month_name = datetime(year, month, 1).strftime("%B %Y")
    data_context = f"Newsletter for: {month_name}\n\n"

    if posts:
        data_context += "TOP POSTS THIS MONTH:\n"
        for p in posts[:3]:
            data_context += f"- [{p.get('platform','?')}] {(p.get('content','')[:150])}\n"
        data_context += "\n"

    data_context += f"DONATION STATS:\n"
    data_context += f"- Total raised: ${donations.get('total_amount', 0):,.2f}\n"
    data_context += f"- Unique donors: {donations.get('donor_count', 0)}\n"
    data_context += f"- Total donations: {donations.get('donation_count', 0)}\n\n"

    if metrics:
        data_context += f"SAFEHOUSE METRICS:\n"
        data_context += f"- Active residents: {metrics.get('active_residents', 'N/A')}\n"
        if metrics.get('avg_education_progress'):
            data_context += f"- Avg education progress: {metrics['avg_education_progress']:.0f}%\n"
        if metrics.get('avg_health_score'):
            data_context += f"- Avg health score: {metrics['avg_health_score']:.1f}\n"
        data_context += "\n"

    if events:
        data_context += "UPCOMING EVENTS:\n"
        for e in events[:5]:
            data_context += f"- {e.get('title','?')} ({e.get('event_type','')}) — {e.get('event_date','')}\n"
        data_context += "\n"

    if impact:
        data_context += "IMPACT SNAPSHOT:\n"
        for k, v in impact.items():
            if k not in ('snapshot_date', 'is_published', 'public_impact_snapshot_id') and v is not None:
                data_context += f"- {k.replace('_', ' ').title()}: {v}\n"
        data_context += "\n"

    if cta:
        data_context += f"CURRENT CTA: {cta.get('title','')}\n"
        data_context += f"- Goal: ${cta.get('goal_amount', 'N/A')} | Progress: ${cta.get('current_amount', 0)}\n"
        data_context += f"- URL: {cta.get('url', '')}\n\n"

    org_desc = voice.get("org_description", "Beacon of Hope — a safehouse for at-risk youth") if voice else "Beacon of Hope"
    tone = voice.get("tone_description", "warm, hopeful, professional") if voice else "warm, hopeful, professional"

    system_prompt = f"""You are a newsletter writer for {org_desc}.
Tone: {tone}

HARD RULES:
- Never reference residents by name or any identifiable information.
- Never use guilt-based language ("you could have done more", "children are suffering because of you").
- Focus on hope, impact, and community.
- Keep it concise — readers scan newsletters quickly."""

    user_prompt = f"""{data_context}

Generate a monthly newsletter email. Return valid JSON with exactly these fields:
- "subject": A compelling email subject line (under 60 chars)
- "html_content": Complete HTML email with inline CSS. Structure: hero section with month/year, impact numbers in a grid, highlights from the month, upcoming events if any, a donate CTA button, and a footer with {{{{unsubscribe_url}}}} placeholder.
- "plain_text": Plain text version of the same content.

Design guidelines:
- Use inline CSS only (no <style> tags — email clients strip them).
- Brand colors:
  - Sage green (primary accent): #0f8f7d — use for buttons, links, and highlights.
  - Deep navy (headings): #0f1b2d — use for headlines and strong text.
  - Cream (background): #f8f7f3 — use for the email body background.
  - White: #ffffff — use for content card backgrounds.
  - Rose (warm accent): #cb5768 — use sparingly for emphasis or secondary elements.
  - Amber (highlight): #ff9f43 — use for impact numbers or callout badges.
  - Muted text: #526178 — use for secondary/body text.
- Fonts: Use 'Plus Jakarta Sans', system-ui, sans-serif for body text. Use Georgia, serif for headings (as a web-safe fallback for the brand display font).
- Max width 600px, centered. Mobile-friendly with single-column layout.
- The donate button should be sage green (#0f8f7d) with white text, rounded corners.
- Impact numbers grid should use amber (#ff9f43) or sage (#0f8f7d) for the numbers.
- The donate button should link to {{{{donate_url}}}}.
- Include {{{{unsubscribe_url}}}} in the footer for the unsubscribe link."""

    client = OpenAI(api_key=OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0.7,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    import json
    result = json.loads(resp.choices[0].message.content)
    return result

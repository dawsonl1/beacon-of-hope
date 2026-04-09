"""
llm.py — Core LLM interaction layer.
Handles prompt assembly, tool-use loop, and OpenAI API calls.
"""

import json
import logging
from openai import OpenAI
from ai_harness.config import OPENAI_API_KEY, OPENAI_MODEL, MAX_TOOL_ROUNDS
from ai_harness import db

logger = logging.getLogger(__name__)

client = OpenAI(api_key=OPENAI_API_KEY)


def build_system_prompt() -> str:
    """Assembles the system prompt from the voice guide + hard rules."""
    guide = db.fetch_voice_guide()
    if not guide:
        return "You are a social media content writer for a nonprofit organization."

    parts = []
    parts.append("You are the social media content writer for a nonprofit organization.")
    parts.append("")

    if guide.get("org_description"):
        parts.append(f"## About the Organization\n{guide['org_description']}")

    if guide.get("tone_description"):
        parts.append(f"## Tone & Voice\n{guide['tone_description']}")

    if guide.get("preferred_terms"):
        parts.append(f"## Preferred Terms\n{guide['preferred_terms']}")

    if guide.get("avoided_terms"):
        parts.append(f"## Terms & Patterns to Avoid\n{guide['avoided_terms']}")

    if guide.get("structural_rules"):
        parts.append(f"## Structural Rules\n{guide['structural_rules']}")

    if guide.get("visual_rules"):
        parts.append(f"## Visual Rules\n{guide['visual_rules']}")

    parts.append("")
    parts.append("## Hard Rules")
    parts.append("- NEVER reference specific residents by name or identifiable details.")
    parts.append("- NEVER use guilt-based or shame-based language.")
    parts.append("- NEVER pull from resident/case management data.")
    parts.append("- Always end awareness/problem posts with hope or a path forward.")
    parts.append("- Each post serves exactly ONE content pillar.")

    return "\n\n".join(parts)


def run_tool_loop(
    system_prompt: str,
    user_prompt: str,
    tools: list[dict],
    tool_handlers: dict,
) -> str:
    """
    Runs the OpenAI tool-use loop:
    1. Call the API with messages + tools
    2. If model returns tool_calls, execute them
    3. Append results, call again
    4. Repeat until model returns a final message (no tool calls)

    Returns the final text response from the model.
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    for round_num in range(MAX_TOOL_ROUNDS):
        logger.info(f"Tool loop round {round_num + 1}")

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            tools=tools if tools else None,
            temperature=0.7,
        )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls" or choice.message.tool_calls:
            # Model wants to call tools
            messages.append(choice.message)

            for tool_call in choice.message.tool_calls:
                fn_name = tool_call.function.name
                fn_args = json.loads(tool_call.function.arguments)
                logger.info(f"  Tool call: {fn_name}({fn_args})")

                handler = tool_handlers.get(fn_name)
                if handler:
                    try:
                        result = handler(**fn_args)
                        result_str = json.dumps(result, default=str)
                    except Exception as e:
                        logger.error(f"  Tool error: {e}")
                        result_str = json.dumps({"error": str(e)})
                else:
                    result_str = json.dumps({"error": f"Unknown tool: {fn_name}"})

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_str,
                })
        else:
            # Model returned final response
            return choice.message.content or ""

    logger.warning("Max tool rounds reached, returning last response")
    return messages[-1].get("content", "") if isinstance(messages[-1], dict) else ""


def generate_post_simple(
    pillar: str,
    platform: str,
    raw_material: str,
    photo_caption: str | None = None,
) -> dict:
    """
    Generates a single post without agentic tool use.
    Used by /generate-post for straightforward post creation.
    """
    system_prompt = build_system_prompt()

    # Fetch hashtags for this pillar + platform
    hashtags = db.fetch_hashtags(pillar=pillar, platform=platform)
    hashtag_list = []
    for h in hashtags:
        try:
            parsed = json.loads(h.get("hashtags", "[]"))
            hashtag_list.extend(parsed)
        except (json.JSONDecodeError, TypeError):
            pass

    # Fetch few-shot examples
    examples = db.fetch_approved_examples(pillar, platform, limit=3)
    examples_text = ""
    if examples:
        examples_text = "\n\n## Example posts that performed well:\n"
        for i, ex in enumerate(examples, 1):
            examples_text += f"\n### Example {i}:\n{ex.get('content', '')}\n"

    # Platform constraints
    platform_rules = {
        "instagram": "Max 2200 chars, sweet spot 150-300 words. 5-10 hashtags. Visual-first — the photo IS the post. Emotional, storytelling tone.",
        "facebook": "Longer-form OK (up to 500 words). 2-3 hashtags max. Can include links. Informational, community-building tone.",
        "twitter": "280 chars hard limit. 1-2 hashtags max. Punchy, single-idea. Link in reply not main tweet.",
    }

    pillar_goals = {
        "safehouse_life": "Humanize the org, show the good happening. Warm, joyful, hopeful tone.",
        "the_problem": "Educate followers about trafficking/abuse. Serious but not hopeless — MUST end with hope or a path forward.",
        "the_solution": "Build credibility, show what the org does. Confident, specific, credible tone.",
        "donor_impact": "Show supporters their money matters. Grateful, specific, connecting dollars to operations.",
        "call_to_action": "Convert followers to donors/volunteers. Urgent but not desperate, specific about what's needed.",
    }

    user_prompt = f"""Generate a social media post for {platform}.

## Content Pillar: {pillar}
Goal: {pillar_goals.get(pillar, '')}

## Raw Material
{raw_material}

{f'## Photo Caption (from staff upload): {photo_caption}' if photo_caption else ''}

## Platform Rules
{platform_rules.get(platform, '')}

## Available Hashtags
{', '.join(hashtag_list) if hashtag_list else 'Use relevant hashtags for this topic.'}

{examples_text}

Return ONLY a JSON object with these fields:
- "content": the complete post text including hashtags
- "hashtags": array of hashtags used
"""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content or "{}"
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"content": text, "hashtags": []}

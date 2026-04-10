"""
researcher.py — Agentic web research for new facts.
Uses GPT with web search tool to find and extract statistics.
"""

import json
import logging
import re
import httpx
from openai import OpenAI
from ai_harness import db
from ai_harness.config import OPENAI_API_KEY, OPENAI_MODEL
from ai_harness.llm import build_system_prompt, run_tool_loop

logger = logging.getLogger(__name__)

RESEARCH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for information. Returns titles, snippets, and URLs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_existing_facts",
            "description": "Returns facts already in the database so you don't suggest duplicates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Optional category filter"},
                },
                "required": [],
            },
        },
    },
]


_DDG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}


def _web_search(query: str) -> list[dict]:
    """
    Web search using DuckDuckGo HTML (no API key needed).
    Returns top results with title, snippet, and URL.
    """
    try:
        resp = httpx.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers=_DDG_HEADERS,
            timeout=15,
            follow_redirects=True,
        )
        logger.info(f"DDG search '{query[:50]}' status={resp.status_code} body_len={len(resp.text)}")

        results = []
        text = resp.text
        links = re.findall(r'<a rel="nofollow" class="result__a" href="(.*?)">(.*?)</a>', text)
        snippets = re.findall(r'<a class="result__snippet".*?>(.*?)</a>', text, re.DOTALL)

        for i, (url, title) in enumerate(links[:8]):
            snippet = snippets[i].strip() if i < len(snippets) else ""
            snippet = re.sub(r'<.*?>', '', snippet)
            results.append({
                "title": re.sub(r'<.*?>', '', title),
                "url": url,
                "snippet": snippet[:300],
            })

        if not results:
            logger.warning(f"DDG returned no parsed results for '{query[:50]}'")

        return results
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return [{"error": str(e), "query": query}]


def _get_existing_facts(category: str | None = None) -> list[dict]:
    if category:
        facts = [f for f in db.fetch_unused_facts(limit=100) if f.get("category") == category]
    else:
        facts = db.fetch_unused_facts(limit=100)
    return [{"fact_text": f["fact_text"], "source_name": f.get("source_name")} for f in facts]


TOOL_HANDLERS = {
    "web_search": lambda query: _web_search(query),
    "get_existing_facts": lambda category=None: _get_existing_facts(category),
}


def _extract_json(text: str) -> dict | None:
    """Try multiple strategies to extract JSON from GPT's free-form response."""
    # Strategy 1: direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # Strategy 2: find JSON inside markdown code fences
    fence = re.search(r'```(?:json)?\s*\n?(.*?)```', text, re.DOTALL)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: find the first { ... } block
    brace = re.search(r'\{.*\}', text, re.DOTALL)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            pass

    return None


def _structured_extract(raw_text: str) -> list[dict]:
    """Use a second GPT call with response_format=json_object to extract structured facts."""
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "Extract fact candidates from the text. Return a JSON object with a 'candidates' array. Each item: {fact_text, source_name, source_url, category}."},
                {"role": "user", "content": raw_text},
            ],
        )
        parsed = json.loads(resp.choices[0].message.content or "{}")
        return parsed.get("candidates", [])
    except Exception as e:
        logger.error(f"Structured extraction failed: {e}")
        return []


def refresh_facts(categories: list[str] | None = None) -> list[dict]:
    """
    Uses GPT with web search to find new facts and statistics.
    Returns candidate facts for admin review.
    """
    if not categories:
        categories = ["trafficking_stats", "rehabilitation", "regional"]

    system_prompt = build_system_prompt() + """

## Your Role: Researcher
You are researching current statistics about human trafficking, child abuse,
and rehabilitation outcomes. Your job is to find credible, recent facts from
trusted sources (UNICEF, ILO, US State Department, IJM, WHO, academic journals).

Rules:
- Only extract facts you can attribute to a specific, credible source
- Skip facts from news articles unless they cite an original source
- Check existing facts to avoid duplicates
- Prefer recent statistics (last 2-3 years)
- Search for at least 2-3 different queries to get broad coverage
"""

    user_prompt = f"""Search for new facts and statistics in these categories: {', '.join(categories)}

Use the web_search tool multiple times with different queries to find current information.
Use get_existing_facts to check what's already in the database and avoid duplicates.

After researching, return a JSON object with a "candidates" array. Each candidate:
- "fact_text": the exact statistic or claim
- "source_name": who published it (e.g. "UNICEF", "ILO")
- "source_url": link to the source
- "category": one of trafficking_stats, abuse_stats, rehabilitation, policy, regional
"""

    logger.info(f"Starting research refresh for categories: {categories}")

    result = run_tool_loop(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        tools=RESEARCH_TOOLS,
        tool_handlers=TOOL_HANDLERS,
    )

    logger.info(f"Tool loop returned {len(result)} chars")

    # Try to parse the response as JSON
    parsed = _extract_json(result)
    if parsed and parsed.get("candidates"):
        logger.info(f"Parsed {len(parsed['candidates'])} candidates from tool loop")
        return parsed["candidates"]

    # If direct parsing failed but we got text, use a structured extraction pass
    if result and len(result) > 50:
        logger.info("Direct parse failed, trying structured extraction")
        candidates = _structured_extract(result)
        if candidates:
            logger.info(f"Structured extraction found {len(candidates)} candidates")
            return candidates

    logger.warning(f"Research refresh returned no candidates. Raw response: {result[:300]}")
    return []

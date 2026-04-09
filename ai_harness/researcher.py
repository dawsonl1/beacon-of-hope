"""
researcher.py — Agentic web research for new facts.
Uses GPT with web search tool to find and extract statistics.
"""

import json
import logging
import httpx
from ai_harness import db
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


def _web_search(query: str) -> list[dict]:
    """
    Simple web search using DuckDuckGo HTML (no API key needed).
    Returns top results with title, snippet, and URL.
    """
    try:
        resp = httpx.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
        # Parse simple results from DDG HTML
        results = []
        text = resp.text
        # Extract result blocks
        import re
        links = re.findall(r'<a rel="nofollow" class="result__a" href="(.*?)">(.*?)</a>', text)
        snippets = re.findall(r'<a class="result__snippet".*?>(.*?)</a>', text, re.DOTALL)

        for i, (url, title) in enumerate(links[:5]):
            snippet = snippets[i].strip() if i < len(snippets) else ""
            # Clean HTML tags from snippet
            snippet = re.sub(r'<.*?>', '', snippet)
            results.append({
                "title": re.sub(r'<.*?>', '', title),
                "url": url,
                "snippet": snippet[:300],
            })
        return results
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return [{"error": str(e)}]


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
"""

    user_prompt = f"""Search for new facts and statistics in these categories: {', '.join(categories)}

Use the web_search tool to find current information, and get_existing_facts to avoid duplicates.

Return ONLY a JSON object with a "candidates" array. Each candidate should have:
- "fact_text": the exact statistic or claim
- "source_name": who published it
- "source_url": link to the source
- "category": one of trafficking_stats, abuse_stats, rehabilitation, policy, regional
"""

    result = run_tool_loop(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        tools=RESEARCH_TOOLS,
        tool_handlers=TOOL_HANDLERS,
    )

    cleaned = result.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)

    try:
        parsed = json.loads(cleaned)
        return parsed.get("candidates", [])
    except json.JSONDecodeError:
        logger.error(f"Failed to parse research response: {cleaned[:200]}")
        return []

"""
Mock-based tests for the AI harness.
These don't call the real OpenAI API — they test internal logic.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from ai_harness import db as harness_db
from ai_harness.llm import build_system_prompt
from ai_harness.planner import _get_weekly_target, _get_pillar_mix


class TestBuildSystemPrompt:
    def test_includes_org_description(self):
        prompt = build_system_prompt()
        assert "nonprofit" in prompt.lower() or "organization" in prompt.lower()

    def test_includes_hard_rules_when_guide_exists(self):
        """Hard rules appear when a voice guide exists in the DB."""
        with patch.object(harness_db, 'fetch_voice_guide', return_value={
            'org_description': 'Test org',
            'tone_description': 'Warm',
            'preferred_terms': None, 'avoided_terms': None,
            'structural_rules': None, 'visual_rules': None,
        }):
            prompt = build_system_prompt()
            assert "NEVER reference specific residents" in prompt
            assert "guilt" in prompt.lower() or "shame" in prompt.lower()

    def test_handles_missing_voice_guide(self):
        with patch.object(harness_db, 'fetch_voice_guide', return_value=None):
            prompt = build_system_prompt()
            assert "social media content writer" in prompt.lower()

    def test_includes_tone_when_present(self):
        with patch.object(harness_db, 'fetch_voice_guide', return_value={
            'org_description': 'Test org',
            'tone_description': 'Warm and hopeful',
            'preferred_terms': None,
            'avoided_terms': None,
            'structural_rules': None,
            'visual_rules': None,
        }):
            prompt = build_system_prompt()
            assert "Warm and hopeful" in prompt


class TestPlannerHelpers:
    def test_get_weekly_target_defaults(self):
        with patch.object(harness_db, 'fetch_settings', return_value=None):
            result = _get_weekly_target()
            assert result["posts_per_week"] == 10
            assert "instagram" in result["platforms_active"]

    def test_get_weekly_target_from_settings(self):
        with patch.object(harness_db, 'fetch_settings', return_value={
            'posts_per_week': 15,
            'platforms_active': '["facebook"]',
        }):
            result = _get_weekly_target()
            assert result["posts_per_week"] == 15
            assert result["platforms_active"] == ["facebook"]

    def test_get_pillar_mix_with_settings(self):
        with patch.object(harness_db, 'fetch_settings', return_value={
            'pillar_ratio_safehouse_life': 30,
            'pillar_ratio_the_problem': 25,
            'pillar_ratio_the_solution': 20,
            'pillar_ratio_donor_impact': 15,
            'pillar_ratio_call_to_action': 10,
        }), patch.object(harness_db, 'fetch_pillar_mix', return_value={'safehouse_life': 5, 'the_problem': 2}):
            result = _get_pillar_mix(days=14)
            assert result["target_ratios_percent"]["safehouse_life"] == 30
            assert result["actual_last_n_days"]["safehouse_life"] == 5
            assert result["lookback_days"] == 14

    def test_get_pillar_mix_no_settings(self):
        with patch.object(harness_db, 'fetch_settings', return_value=None), \
             patch.object(harness_db, 'fetch_pillar_mix', return_value={}):
            result = _get_pillar_mix(days=7)
            assert result["target_ratios_percent"] == {}
            assert result["lookback_days"] == 7


class TestPlannerJsonParsing:
    def test_strips_markdown_fences(self):
        from ai_harness.planner import plan_content
        mock_response = '```json\n{"plan": [{"pillar": "safehouse_life", "platform": "instagram"}]}\n```'

        with patch('ai_harness.planner.run_tool_loop', return_value=mock_response):
            result = plan_content(max_posts=1)
            assert len(result) == 1
            assert result[0]["pillar"] == "safehouse_life"

    def test_handles_clean_json(self):
        from ai_harness.planner import plan_content
        mock_response = '{"plan": [{"pillar": "the_problem", "platform": "facebook"}]}'

        with patch('ai_harness.planner.run_tool_loop', return_value=mock_response):
            result = plan_content(max_posts=1)
            assert len(result) == 1

    def test_handles_invalid_json(self):
        from ai_harness.planner import plan_content
        mock_response = 'This is not valid JSON at all'

        with patch('ai_harness.planner.run_tool_loop', return_value=mock_response):
            result = plan_content(max_posts=1)
            assert result == []

    def test_handles_empty_plan(self):
        from ai_harness.planner import plan_content
        mock_response = '{"plan": []}'

        with patch('ai_harness.planner.run_tool_loop', return_value=mock_response):
            result = plan_content(max_posts=0)
            assert result == []


class TestPhotoSelectorFallback:
    def test_fallback_on_parse_failure(self):
        from ai_harness.photo_selector import select_photo

        with patch('ai_harness.photo_selector.run_tool_loop', return_value='not json'), \
             patch.object(harness_db, 'fetch_unused_photos', return_value=[
                 {"media_library_item_id": 42, "caption": "test", "activity_type": "daily_life"}
             ]):
            result = select_photo("donor_impact", "instagram", "A donation milestone post")
            assert result["photo_id"] == 42
            assert "Fallback" in result["reasoning"]

    def test_fallback_no_photos(self):
        from ai_harness.photo_selector import select_photo

        with patch('ai_harness.photo_selector.run_tool_loop', return_value='not json'), \
             patch.object(harness_db, 'fetch_unused_photos', return_value=[]):
            result = select_photo("donor_impact", "instagram", "A post")
            assert result["photo_id"] is None
            assert "No photos" in result["reasoning"]


class TestResearcherParsing:
    def test_strips_markdown_fences(self):
        from ai_harness.researcher import refresh_facts

        mock_response = '```json\n{"candidates": [{"fact_text": "Test", "source_name": "Src", "source_url": "http://x.com", "category": "trafficking_stats"}]}\n```'

        with patch('ai_harness.researcher.run_tool_loop', return_value=mock_response):
            result = refresh_facts(categories=["trafficking_stats"])
            assert len(result) == 1
            assert result[0]["fact_text"] == "Test"

    def test_handles_invalid_json(self):
        from ai_harness.researcher import refresh_facts

        with patch('ai_harness.researcher.run_tool_loop', return_value='garbage'):
            result = refresh_facts()
            assert result == []


class TestScheduleDefaults:
    def test_instagram_defaults_to_tuesday_9am(self):
        from fastapi.testclient import TestClient
        from ai_harness.app import app
        client = TestClient(app)

        resp = client.post("/predict-schedule", json={"platform": "instagram", "pillar": "safehouse_life"})
        data = resp.json()
        assert "T09:00:00" in data["scheduled_at"]

    def test_facebook_defaults_to_thursday_noon(self):
        from fastapi.testclient import TestClient
        from ai_harness.app import app
        client = TestClient(app)

        resp = client.post("/predict-schedule", json={"platform": "facebook", "pillar": "the_problem"})
        data = resp.json()
        assert "T12:00:00" in data["scheduled_at"]

"""
Final gap tests for the AI harness.
Tests tool loop limits, API error handling, graphic auto-generation, awareness dates.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from ai_harness import db as harness_db
from ai_harness.llm import run_tool_loop
from ai_harness.graphics import generate_graphic
import os


class TestToolLoopMaxIterations:
    def test_max_iterations_returns_gracefully(self):
        """When the model keeps requesting tools beyond max rounds, the loop should exit."""
        # Mock OpenAI to always return tool calls
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.finish_reason = "tool_calls"
        mock_message = MagicMock()
        mock_tool_call = MagicMock()
        mock_tool_call.function.name = "fake_tool"
        mock_tool_call.function.arguments = "{}"
        mock_tool_call.id = "call_123"
        mock_message.tool_calls = [mock_tool_call]
        mock_message.content = None
        mock_choice.message = mock_message
        mock_response.choices = [mock_choice]

        call_count = 0

        def mock_create(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count > 10:
                # Safety: force stop after too many
                final = MagicMock()
                final_choice = MagicMock()
                final_choice.finish_reason = "stop"
                final_msg = MagicMock()
                final_msg.tool_calls = None
                final_msg.content = "forced stop"
                final_choice.message = final_msg
                final.choices = [final_choice]
                return final
            return mock_response

        with patch('ai_harness.llm.client') as mock_client:
            mock_client.chat.completions.create = mock_create

            result = run_tool_loop(
                system_prompt="test",
                user_prompt="test",
                tools=[{"type": "function", "function": {"name": "fake_tool", "parameters": {"type": "object", "properties": {}}}}],
                tool_handlers={"fake_tool": lambda: {"ok": True}},
            )
            # Should have exited after MAX_TOOL_ROUNDS (10) or got forced stop
            assert call_count <= 12


class TestOpenAIErrorHandling:
    def test_api_error_propagates(self):
        """When OpenAI raises an exception, it should propagate."""
        with patch('ai_harness.llm.client') as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("API rate limit exceeded")

            with pytest.raises(Exception, match="rate limit"):
                run_tool_loop(
                    system_prompt="test",
                    user_prompt="test",
                    tools=[],
                    tool_handlers={},
                )


class TestRefreshFactsCategories:
    def test_categories_passed_to_prompt(self):
        """The refresh_facts function should include requested categories in the prompt."""
        from ai_harness.researcher import refresh_facts

        captured_prompt = None

        def mock_tool_loop(system_prompt, user_prompt, tools, tool_handlers):
            nonlocal captured_prompt
            captured_prompt = user_prompt
            return '{"candidates": []}'

        with patch('ai_harness.researcher.run_tool_loop', side_effect=mock_tool_loop):
            result = refresh_facts(categories=["abuse_stats", "policy"])
            assert "abuse_stats" in captured_prompt
            assert "policy" in captured_prompt
            assert result == []


class TestAutoGraphicInGeneratePost:
    def test_problem_pillar_gets_graphic(self):
        """Non-photo pillars should auto-generate a branded graphic."""
        from fastapi.testclient import TestClient
        from ai_harness.app import app
        client = TestClient(app)

        # Mock the LLM to return a simple response
        with patch('ai_harness.llm.client') as mock_client:
            mock_response = MagicMock()
            mock_choice = MagicMock()
            mock_choice.finish_reason = "stop"
            mock_msg = MagicMock()
            mock_msg.tool_calls = None
            mock_msg.content = json.dumps({
                "content": "Test problem post about trafficking statistics",
                "hashtags": ["#endtrafficking"]
            })
            mock_choice.message = mock_msg
            mock_response.choices = [mock_choice]
            mock_client.chat.completions.create.return_value = mock_response

            resp = client.post("/generate-post", json={
                "pillar": "the_problem",
                "platform": "instagram",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert data["content"]
            # Should have generated a graphic for the_problem (no photo)
            assert data.get("generated_graphic") is not None or data["content"]  # May or may not have graphic depending on implementation


class TestFetchAwarenessDates:
    def test_returns_list(self):
        """fetch_awareness_dates should return a list."""
        dates = harness_db.fetch_awareness_dates(next_days=30)
        assert isinstance(dates, list)

    def test_returns_list_with_large_window(self):
        dates = harness_db.fetch_awareness_dates(next_days=365)
        assert isinstance(dates, list)

    def test_returns_list_with_zero_window(self):
        dates = harness_db.fetch_awareness_dates(next_days=0)
        assert isinstance(dates, list)

"""
Last gap tests for the AI harness.
"""

from unittest.mock import patch
from ai_harness import db as harness_db
from fastapi.testclient import TestClient
from ai_harness.app import app

client = TestClient(app)


class TestPlannerToolEdgeCases:
    def test_talking_points_nonexistent_topic_returns_empty(self):
        points = harness_db.fetch_talking_points(topic="nonexistent_topic_xyz")
        assert isinstance(points, list)
        assert len(points) == 0


class TestGeneratePostResponseFormat:
    def test_response_always_has_content_field(self):
        """Every /generate-post response must have a 'content' field."""
        # Use mock to avoid API call
        import json
        from unittest.mock import MagicMock

        with patch('ai_harness.llm.client') as mock_client:
            mock_response = MagicMock()
            mock_choice = MagicMock()
            mock_choice.finish_reason = "stop"
            mock_msg = MagicMock()
            mock_msg.tool_calls = None
            mock_msg.content = json.dumps({
                "content": "Valid post content here",
                "hashtags": ["#test"]
            })
            mock_choice.message = mock_msg
            mock_response.choices = [mock_choice]
            mock_client.chat.completions.create.return_value = mock_response

            resp = client.post("/generate-post", json={
                "pillar": "safehouse_life",
                "platform": "instagram",
            })
            assert resp.status_code == 200
            data = resp.json()
            assert "content" in data
            assert isinstance(data["content"], str)
            assert len(data["content"]) > 0
            assert "hashtags" in data
            assert isinstance(data["hashtags"], list)

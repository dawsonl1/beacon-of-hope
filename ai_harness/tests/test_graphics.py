"""
Tests for branded graphic compositing.
"""

import os
import pytest
from ai_harness.graphics import generate_graphic
from fastapi.testclient import TestClient
from ai_harness.app import app

client = TestClient(app)


class TestGraphicGeneration:
    def test_generates_file(self):
        result = generate_graphic(None, "Test overlay text")
        assert result["file_path"].endswith(".jpg")
        assert os.path.exists(result["absolute_path"])
        os.remove(result["absolute_path"])

    def test_file_has_content(self):
        result = generate_graphic(None, "Content check")
        size = os.path.getsize(result["absolute_path"])
        assert size > 1000  # Should be at least 1KB
        os.remove(result["absolute_path"])

    def test_short_text(self):
        result = generate_graphic(None, "$15,000")
        assert os.path.exists(result["absolute_path"])
        os.remove(result["absolute_path"])

    def test_long_text(self):
        long_text = "This is a very long text that should wrap across multiple lines in the generated graphic image to test word wrapping behavior"
        result = generate_graphic(None, long_text)
        assert os.path.exists(result["absolute_path"])
        os.remove(result["absolute_path"])

    def test_custom_colors(self):
        result = generate_graphic(None, "Color test", text_color="#FF0000")
        assert os.path.exists(result["absolute_path"])
        os.remove(result["absolute_path"])

    def test_bottom_left_position(self):
        result = generate_graphic(None, "Bottom left", text_position="bottom_left")
        assert os.path.exists(result["absolute_path"])
        os.remove(result["absolute_path"])

    def test_top_center_position(self):
        result = generate_graphic(None, "Top center", text_position="top_center")
        assert os.path.exists(result["absolute_path"])
        os.remove(result["absolute_path"])

    def test_nonexistent_template_falls_back(self):
        result = generate_graphic("/nonexistent/template.png", "Fallback test")
        assert os.path.exists(result["absolute_path"])
        os.remove(result["absolute_path"])


class TestGraphicEndpoint:
    def test_generate_graphic_endpoint(self):
        resp = client.post("/generate-graphic", json={
            "overlay_text": "Endpoint test graphic",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["file_path"].endswith(".jpg")
        # Clean up
        if os.path.exists(data.get("absolute_path", "")):
            os.remove(data["absolute_path"])

    def test_generate_graphic_with_all_options(self):
        resp = client.post("/generate-graphic", json={
            "overlay_text": "Full options test",
            "text_color": "#00FF00",
            "text_position": "bottom_left",
        })
        assert resp.status_code == 200

"""
Tests for the AI harness endpoints.
These hit the real OpenAI API — they cost money but verify real behavior.
Run with: cd ai_harness && ../.venv/bin/pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
from ai_harness.app import app

client = TestClient(app)


class TestHealth:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["db"] == "ok"
        assert data["openai_key"] == "configured"


class TestGeneratePost:
    def test_generate_safehouse_life_post(self):
        resp = client.post("/generate-post", json={
            "pillar": "safehouse_life",
            "platform": "instagram",
            "photo_id": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]
        assert len(data["content"]) > 50
        assert data["photo_id"] == 1

    def test_generate_problem_post_with_fact(self):
        resp = client.post("/generate-post", json={
            "pillar": "the_problem",
            "platform": "facebook",
            "fact_id": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]
        assert len(data["content"]) > 50

    def test_generate_solution_post_with_talking_point(self):
        resp = client.post("/generate-post", json={
            "pillar": "the_solution",
            "platform": "instagram",
            "talking_point_id": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]

    def test_generate_cta_post(self):
        resp = client.post("/generate-post", json={
            "pillar": "call_to_action",
            "platform": "instagram",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]

    def test_generate_donor_impact_post(self):
        resp = client.post("/generate-post", json={
            "pillar": "donor_impact",
            "platform": "facebook",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]


class TestPlanContent:
    def test_plan_returns_posts(self):
        resp = client.post("/plan-content", json={"max_posts": 3})
        assert resp.status_code == 200
        data = resp.json()
        assert "plan" in data
        assert len(data["plan"]) > 0
        # Each plan item should have required fields
        for item in data["plan"]:
            assert "pillar" in item
            assert "platform" in item

    def test_plan_respects_max(self):
        resp = client.post("/plan-content", json={"max_posts": 2})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["plan"]) <= 2


class TestSelectPhoto:
    def test_select_photo_returns_id(self):
        resp = client.post("/select-photo", json={
            "pillar": "donor_impact",
            "platform": "instagram",
            "post_description": "Celebrating reaching $15,000 in donations this month",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "photo_id" in data
        assert data["photo_id"] is not None
        assert "reasoning" in data


class TestPredictSchedule:
    def test_predict_returns_timestamp(self):
        resp = client.post("/predict-schedule", json={
            "platform": "instagram",
            "pillar": "safehouse_life",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "scheduled_at" in data
        assert "T" in data["scheduled_at"]  # ISO format

    def test_predict_different_platforms(self):
        for platform in ["instagram", "facebook", "twitter"]:
            resp = client.post("/predict-schedule", json={
                "platform": platform,
                "pillar": "the_problem",
            })
            assert resp.status_code == 200


class TestRefreshFacts:
    def test_refresh_returns_candidates(self):
        resp = client.post("/refresh-facts", json={
            "categories": ["trafficking_stats"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "candidates" in data
        # May be empty if web search returns nothing useful, but shouldn't error

"""
Edge case tests for the AI harness.
Tests error handling, missing data, and fallback behavior.
"""

import pytest
from fastapi.testclient import TestClient
from ai_harness.app import app

client = TestClient(app)


class TestGeneratePostEdgeCases:
    def test_generate_with_no_material(self):
        """Post generation should still work even with no specific source material."""
        resp = client.post("/generate-post", json={
            "pillar": "donor_impact",
            "platform": "instagram",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]
        assert len(data["content"]) > 20

    def test_generate_with_nonexistent_photo_id(self):
        """Should still generate a post even if photo_id doesn't match anything."""
        resp = client.post("/generate-post", json={
            "pillar": "safehouse_life",
            "platform": "instagram",
            "photo_id": 99999,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]

    def test_generate_with_nonexistent_fact_id(self):
        """Should still generate a post even if fact_id doesn't match."""
        resp = client.post("/generate-post", json={
            "pillar": "the_problem",
            "platform": "facebook",
            "fact_id": 99999,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]

    def test_generate_with_milestone_data(self):
        """Should handle milestone_data correctly."""
        resp = client.post("/generate-post", json={
            "pillar": "donor_impact",
            "platform": "instagram",
            "milestone_data": {
                "metric": "monthly_donation_total",
                "value": 15000,
                "label": "We just crossed $15,000 in donations this month!"
            },
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]

    def test_generate_all_pillars(self):
        """Every pillar should produce valid output."""
        for pillar in ["safehouse_life", "the_problem", "the_solution", "donor_impact", "call_to_action"]:
            resp = client.post("/generate-post", json={
                "pillar": pillar,
                "platform": "instagram",
            })
            assert resp.status_code == 200, f"Failed for pillar: {pillar}"
            assert resp.json()["content"], f"Empty content for pillar: {pillar}"

    def test_generate_all_platforms(self):
        """Every platform should produce valid output."""
        for platform in ["instagram", "facebook", "twitter"]:
            resp = client.post("/generate-post", json={
                "pillar": "safehouse_life",
                "platform": platform,
            })
            assert resp.status_code == 200, f"Failed for platform: {platform}"
            assert resp.json()["content"], f"Empty content for platform: {platform}"


class TestPlanContentEdgeCases:
    def test_plan_with_zero_max(self):
        """Should return empty plan when max_posts is 0."""
        resp = client.post("/plan-content", json={"max_posts": 0})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["plan"]) == 0

    def test_plan_with_large_max(self):
        """Should not crash with a large max_posts value."""
        resp = client.post("/plan-content", json={"max_posts": 50})
        assert resp.status_code == 200
        data = resp.json()
        assert "plan" in data


class TestSelectPhotoEdgeCases:
    def test_select_photo_for_problem_pillar(self):
        """Photo selection should work for any pillar."""
        resp = client.post("/select-photo", json={
            "pillar": "the_problem",
            "platform": "facebook",
            "post_description": "An awareness post about trafficking statistics",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "photo_id" in data


class TestPredictScheduleEdgeCases:
    def test_unknown_platform_still_works(self):
        """Should return a reasonable default for unknown platforms."""
        resp = client.post("/predict-schedule", json={
            "platform": "tiktok",
            "pillar": "safehouse_life",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "scheduled_at" in data

    def test_with_preferred_day(self):
        """Should accept preferred_day parameter."""
        resp = client.post("/predict-schedule", json={
            "platform": "instagram",
            "pillar": "the_problem",
            "preferred_day": "Monday",
        })
        assert resp.status_code == 200

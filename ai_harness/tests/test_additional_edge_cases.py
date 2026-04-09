"""
Additional edge case tests for the AI harness.
Tests empty DB states, voice guide updates, and concurrent behavior.
"""

import pytest
from fastapi.testclient import TestClient
from ai_harness.app import app
from ai_harness import db as harness_db

client = TestClient(app)


class TestEmptyFactDatabase:
    def test_generate_problem_post_with_no_facts(self):
        """The problem pillar should still produce a post even if no specific fact is provided."""
        resp = client.post("/generate-post", json={
            "pillar": "the_problem",
            "platform": "instagram",
            # No fact_id provided
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]
        assert len(data["content"]) > 20

    def test_generate_solution_post_with_no_talking_point(self):
        """The solution pillar should still produce a post even without a talking point."""
        resp = client.post("/generate-post", json={
            "pillar": "the_solution",
            "platform": "facebook",
            # No talking_point_id
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"]


class TestVoiceGuideIntegration:
    def test_voice_guide_loaded_in_generation(self):
        """Posts should reflect the voice guide tone — check that the guide is being used."""
        # The voice guide says to use "residents" not "victims"
        # and to be "warm, hopeful, direct"
        resp = client.post("/generate-post", json={
            "pillar": "safehouse_life",
            "platform": "instagram",
            "photo_id": 1,
        })
        assert resp.status_code == 200
        content = resp.json()["content"].lower()
        # Should not contain prohibited terms (the voice guide says to avoid these)
        # Note: we can't guarantee the LLM perfectly follows instructions every time,
        # but it should generally avoid explicit guilt language
        assert "because you didn't give" not in content

    def test_voice_guide_fetched_from_db(self):
        """The DB function should return the voice guide."""
        guide = harness_db.fetch_voice_guide()
        assert guide is not None
        assert guide.get("org_description") or guide.get("tone_description")


class TestDatabaseFunctions:
    def test_fetch_unused_photos_returns_list(self):
        photos = harness_db.fetch_unused_photos(limit=5)
        assert isinstance(photos, list)

    def test_fetch_unused_facts_returns_list(self):
        facts = harness_db.fetch_unused_facts(limit=5)
        assert isinstance(facts, list)

    def test_fetch_talking_points_returns_list(self):
        points = harness_db.fetch_talking_points()
        assert isinstance(points, list)

    def test_fetch_talking_points_with_topic_filter(self):
        points = harness_db.fetch_talking_points(topic="counseling")
        assert isinstance(points, list)
        for p in points:
            assert p["topic"] == "counseling"

    def test_fetch_hashtags_returns_list(self):
        tags = harness_db.fetch_hashtags(pillar="safehouse_life", platform="instagram")
        assert isinstance(tags, list)

    def test_fetch_cta_config_returns_dict_or_none(self):
        cta = harness_db.fetch_cta_config()
        assert cta is None or isinstance(cta, dict)

    def test_fetch_settings_returns_dict_or_none(self):
        settings = harness_db.fetch_settings()
        assert settings is None or isinstance(settings, dict)

    def test_fetch_pillar_mix_returns_dict(self):
        mix = harness_db.fetch_pillar_mix(days=14)
        assert isinstance(mix, dict)

    def test_fetch_scheduled_count_returns_int(self):
        count = harness_db.fetch_scheduled_count()
        assert isinstance(count, int)
        assert count >= 0

    def test_fetch_approved_examples_returns_list(self):
        examples = harness_db.fetch_approved_examples("safehouse_life", "instagram", limit=3)
        assert isinstance(examples, list)


class TestConcurrentRequests:
    def test_two_generate_posts_dont_interfere(self):
        """Two concurrent generation requests should both succeed."""
        import concurrent.futures

        def gen(pillar, platform):
            return client.post("/generate-post", json={
                "pillar": pillar,
                "platform": platform,
            })

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            f1 = pool.submit(gen, "safehouse_life", "instagram")
            f2 = pool.submit(gen, "the_problem", "facebook")
            r1 = f1.result(timeout=60)
            r2 = f2.result(timeout=60)

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["content"] != r2.json()["content"]


class TestHealthEndpoint:
    def test_health_check_fields(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["db"] == "ok"
        assert data["openai_key"] == "configured"

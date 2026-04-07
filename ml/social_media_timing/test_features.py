from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.social_media_timing.features import FEATURE_COLUMNS, build_features


class BuildFeaturesTests(unittest.TestCase):
    def test_returns_raw_columns_and_drops_missing_targets(self) -> None:
        raw = pd.DataFrame(
            [
                {
                    "platform": "Instagram",
                    "post_hour": "10",
                    "day_of_week": "Saturday",
                    "media_type": "Photo",
                    "is_boosted": "yes",
                    "boost_budget_php": None,
                    "has_call_to_action": True,
                    "post_type": "Campaign",
                    "engagement_rate": "0.12",
                },
                {
                    "platform": "Facebook",
                    "post_hour": "14",
                    "day_of_week": "Monday",
                    "media_type": "Video",
                    "is_boosted": "no",
                    "boost_budget_php": "250.5",
                    "has_call_to_action": False,
                    "post_type": "ThankYou",
                    "engagement_rate": None,
                },
            ]
        )

        X, y = build_features(raw)

        self.assertEqual(list(X.columns), FEATURE_COLUMNS)
        self.assertEqual(len(X), 1)
        self.assertEqual(len(y), 1)
        self.assertEqual(float(y.iloc[0]), 0.12)
        self.assertEqual(int(X.iloc[0]["is_weekend"]), 1)
        self.assertEqual(int(X.iloc[0]["is_boosted"]), 1)
        self.assertEqual(float(X.iloc[0]["boost_budget_php"]), 0.0)

    def test_missing_columns_get_safe_defaults(self) -> None:
        raw = pd.DataFrame(
            [
                {
                    "platform": "WhatsApp",
                    "day_of_week": "Tuesday",
                    "engagement_rate": 0.08,
                }
            ]
        )

        X, y = build_features(raw)

        self.assertEqual(len(X), 1)
        self.assertEqual(float(y.iloc[0]), 0.08)
        self.assertEqual(int(X.iloc[0]["post_hour"]), 0)
        self.assertEqual(int(X.iloc[0]["has_call_to_action"]), 0)
        self.assertEqual(str(X.iloc[0]["media_type"]), "None")


if __name__ == "__main__":
    unittest.main()

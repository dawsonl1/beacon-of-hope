from __future__ import annotations

import unittest

import pandas as pd

from ml.donor_churn.features import build_donor_feature_frame, compute_rule_tier


class DonorChurnFeatureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.supporters = pd.DataFrame(
            [
                {
                    "supporter_id": 1,
                    "status": "Active",
                    "acquisition_channel": "Church",
                    "relationship_type": "Local",
                },
                {
                    "supporter_id": 2,
                    "status": "Inactive",
                    "acquisition_channel": "Website",
                    "relationship_type": "PartnerOrganization",
                },
                {
                    "supporter_id": 3,
                    "status": "Active",
                    "acquisition_channel": "SocialMedia",
                    "relationship_type": "International",
                },
            ]
        )

        self.donations = pd.DataFrame(
            [
                {
                    "supporter_id": 1,
                    "donation_type": "Monetary",
                    "donation_date": "2025-01-01",
                    "amount": 1000,
                    "is_recurring": True,
                    "campaign_name": "Holiday2025",
                },
                {
                    "supporter_id": 1,
                    "donation_type": "Monetary",
                    "donation_date": "2025-03-01",
                    "amount": 1200,
                    "is_recurring": True,
                    "campaign_name": "SpringDrive",
                },
                {
                    "supporter_id": 1,
                    "donation_type": "InKind",
                    "donation_date": "2025-04-01",
                    "amount": 0,
                    "is_recurring": False,
                    "campaign_name": "IgnoredCampaign",
                },
                {
                    "supporter_id": 2,
                    "donation_type": "Monetary",
                    "donation_date": "2024-01-01",
                    "amount": 500,
                    "is_recurring": False,
                    "campaign_name": "Holiday2025",
                },
            ]
        )

        self.social_posts = pd.DataFrame(
            [
                {"campaign_name": "Holiday2025", "created_at": "2025-01-15"},
                {"campaign_name": "SpringDrive", "created_at": "2025-03-15"},
                {"campaign_name": "BackToSchool", "created_at": "2025-09-01"},
            ]
        )

    def test_build_donor_feature_frame_returns_one_row_per_monetary_donor(self) -> None:
        frame = build_donor_feature_frame(
            supporters=self.supporters,
            donations=self.donations,
            social_posts=self.social_posts,
            as_of_date="2025-10-01",
        )
        self.assertEqual(sorted(frame["supporter_id"].tolist()), [1, 2])

    def test_build_donor_feature_frame_computes_expected_rfm_and_campaign_metrics(self) -> None:
        frame = build_donor_feature_frame(
            supporters=self.supporters,
            donations=self.donations,
            social_posts=self.social_posts,
            as_of_date="2025-10-01",
        ).set_index("supporter_id")

        donor_1 = frame.loc[1]
        self.assertEqual(int(donor_1["frequency"]), 2)
        self.assertEqual(float(donor_1["monetary_total"]), 2200.0)
        self.assertEqual(float(donor_1["monetary_last"]), 1200.0)
        self.assertEqual(int(donor_1["is_recurring"]), 1)
        self.assertAlmostEqual(float(donor_1["campaign_response_rate"]), 2 / 3, places=4)
        self.assertEqual(int(donor_1["missed_campaigns"]), 1)

    def test_build_donor_feature_frame_handles_single_donation_and_missing_campaign_data(self) -> None:
        frame = build_donor_feature_frame(
            supporters=self.supporters,
            donations=self.donations,
            social_posts=pd.DataFrame(columns=["campaign_name", "created_at"]),
            as_of_date="2025-10-01",
        ).set_index("supporter_id")

        donor_2 = frame.loc[2]
        self.assertEqual(float(donor_2["avg_gap_days"]), 0.0)
        self.assertEqual(float(donor_2["gap_trend"]), 0.0)
        self.assertEqual(float(donor_2["amount_trend"]), 0.0)
        self.assertEqual(float(donor_2["campaign_response_rate"]), 0.0)
        self.assertEqual(float(donor_2["missed_campaigns"]), 0.0)

    def test_compute_rule_tier_matches_thresholds(self) -> None:
        self.assertEqual(compute_rule_tier(recency_days=200, gap_trend=0), "Critical")
        self.assertEqual(compute_rule_tier(recency_days=120, gap_trend=0), "High")
        self.assertEqual(compute_rule_tier(recency_days=45, gap_trend=0), "Medium")
        self.assertEqual(compute_rule_tier(recency_days=10, gap_trend=31), "Medium")
        self.assertEqual(compute_rule_tier(recency_days=10, gap_trend=0), "Low")


if __name__ == "__main__":
    unittest.main()

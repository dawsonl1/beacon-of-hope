from __future__ import annotations

import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from ml.incident_early_warning.features import (
    build_feature_frame,
    build_targets,
)
from ml.incident_early_warning.infer import (
    MODEL_NAME_INCIDENT_RUNAWAY,
    MODEL_NAME_INCIDENT_SELFHARM,
    _build_records,
)


class IncidentFeatureTests(unittest.TestCase):
    def test_build_feature_frame_coerces_booleans_and_nulls(self) -> None:
        residents = pd.DataFrame(
            [
                {
                    "resident_id": 1,
                    "date_of_birth": "2010-01-01",
                    "date_of_admission": "2025-01-01",
                    "initial_risk_level": "High",
                    "sub_cat_sexual_abuse": "true",
                    "sub_cat_trafficked": None,
                    "sub_cat_osaec": False,
                    "sub_cat_physical_abuse": 1,
                    "has_special_needs": "yes",
                    "is_pwd": "0",
                    "family_low_income": True,
                    "family_single_parent": "false",
                    "case_category": "Neglected",
                }
            ]
        )

        X = build_feature_frame(residents)
        row = X.iloc[0].to_dict()

        self.assertEqual(int(row["initial_risk_num"]), 3)
        self.assertGreater(float(row["age_at_admission"]), 0.0)
        self.assertEqual(int(row["sub_cat_sexual_abuse"]), 1)
        self.assertEqual(int(row["sub_cat_trafficked"]), 0)
        self.assertEqual(int(row["sub_cat_physical_abuse"]), 1)
        self.assertEqual(int(row["has_special_needs"]), 1)
        self.assertEqual(int(row["is_pwd"]), 0)
        self.assertEqual(int(row["family_vulnerability_score"]), 1)
        self.assertIn("case_category_Neglected", X.columns)
        self.assertEqual(int(row["case_category_Neglected"]), 1)

    def test_build_targets_flags_residents_with_incidents(self) -> None:
        residents = pd.DataFrame([{"resident_id": 1}, {"resident_id": 2}, {"resident_id": 3}])
        incidents = pd.DataFrame(
            [
                {"resident_id": 1, "incident_type": "SelfHarm"},
                {"resident_id": 2, "incident_type": "RunawayAttempt"},
                {"resident_id": 2, "incident_type": "Other"},
            ]
        )

        targets = build_targets(residents, incidents)
        targets = targets.set_index("resident_id")
        self.assertEqual(int(targets.loc[1, "has_self_harm"]), 1)
        self.assertEqual(int(targets.loc[1, "has_runaway"]), 0)
        self.assertEqual(int(targets.loc[2, "has_self_harm"]), 0)
        self.assertEqual(int(targets.loc[2, "has_runaway"]), 1)
        self.assertEqual(int(targets.loc[3, "has_self_harm"]), 0)
        self.assertEqual(int(targets.loc[3, "has_runaway"]), 0)


class IncidentInferenceContractTests(unittest.TestCase):
    def test_build_records_creates_two_rows_per_resident(self) -> None:
        features = pd.DataFrame(
            [
                {"resident_id": 10, "initial_risk_num": 4, "sub_cat_sexual_abuse": 1, "sub_cat_trafficked": 0},
                {"resident_id": 11, "initial_risk_num": 2, "sub_cat_sexual_abuse": 0, "sub_cat_trafficked": 1},
            ]
        )
        selfharm_scores = np.array([0.81, 0.25])
        runaway_scores = np.array([0.34, 0.76])

        with patch("ml.incident_early_warning.infer.now_utc", return_value="2026-01-01T00:00:00+00:00"):
            records = _build_records(features, selfharm_scores, runaway_scores, "20260407")

        self.assertEqual(len(records), 4)
        names = sorted({r["model_name"] for r in records})
        self.assertEqual(names, [MODEL_NAME_INCIDENT_RUNAWAY, MODEL_NAME_INCIDENT_SELFHARM])
        for resident_id in [10, 11]:
            resident_rows = [r for r in records if r["entity_id"] == resident_id]
            self.assertEqual(len(resident_rows), 2)
            self.assertEqual({r["entity_type"] for r in resident_rows}, {"resident"})
            self.assertTrue(all(isinstance(r["metadata"], dict) for r in resident_rows))


if __name__ == "__main__":
    unittest.main()

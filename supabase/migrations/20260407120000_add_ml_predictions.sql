-- ============================================================
-- 002_ml_predictions.sql
-- Creates the two ML output tables.
-- ============================================================

-- ml_predictions
-- Current score per entity per model.
-- Upserted nightly by GitHub Actions.
-- Always one row per entity per model; same row overwritten each night.
-- .NET reads from this table for live scores on profile pages and dashboards.
CREATE TABLE IF NOT EXISTS ml_predictions (
    id                bigserial         PRIMARY KEY,

    -- What is being scored
    entity_type       text              NOT NULL,
    -- "resident"        -> scored by reintegration-readiness, reintegration-drivers,
    --                      incident-early-warning-selfharm, incident-early-warning-runaway
    -- "supporter"       -> scored by donor-churn
    -- "platform_timing" -> scored by social-media-timing (pre-computed matrix)
    -- "org_insight"     -> scored by social-media-content, reintegration-drivers

    entity_id         integer,
    -- resident_id or supporter_id
    -- NULL for platform_timing and org_insight rows

    -- Which model produced this
    model_name        text              NOT NULL,
    -- "reintegration-readiness"
    -- "reintegration-drivers"
    -- "donor-churn"
    -- "social-media-content"
    -- "social-media-timing"
    -- "incident-early-warning-selfharm"
    -- "incident-early-warning-runaway"

    model_version     text,
    -- Date the .sav was trained e.g. "20240415"
    -- Populated from metadata.json by the infer job

    -- The prediction
    score             numeric(6, 2),
    -- 0-100 for resident and supporter models
    -- 0.0-1.0 engagement rate for social-media-timing
    -- NULL for org_insight rows

    score_label       text,
    -- "Ready" / "Progressing" / "Early Stage" / "Not Ready"  -> reintegration-readiness
    -- "Critical" / "High" / "Medium" / "Low"                 -> donor-churn, incident models
    -- "content_strategy"                                      -> social-media-content
    -- "WhatsApp_Tuesday_10" etc.                              -> social-media-timing

    -- When it was scored
    predicted_at      timestamptz       NOT NULL DEFAULT now(),

    -- Supporting detail for the frontend
    -- Sub-scores, feature values, plain-language findings, recommended protocols, etc.
    -- Frontend reads this JSON directly; no extra queries needed
    metadata          jsonb,

    -- Unique constraint: one current score per entity per model
    -- Used by the upsert in infer jobs
    UNIQUE (entity_type, entity_id, model_name)
);

-- Indexes for the most common query patterns
CREATE INDEX IF NOT EXISTS idx_ml_predictions_entity
    ON ml_predictions (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_model_score
    ON ml_predictions (model_name, score DESC);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_label
    ON ml_predictions (model_name, score_label);

-- ml_prediction_history
-- Every score ever written: append-only, never updated or deleted.
-- One new row per entity per model per nightly run.
-- .NET reads from this table to render trajectory graphs on the frontend.
-- Same schema as ml_predictions but no unique constraint.
CREATE TABLE IF NOT EXISTS ml_prediction_history (
    id                bigserial         PRIMARY KEY,

    entity_type       text              NOT NULL,
    entity_id         integer,
    model_name        text              NOT NULL,
    model_version     text,
    score             numeric(6, 2),
    score_label       text,
    predicted_at      timestamptz       NOT NULL DEFAULT now(),
    metadata          jsonb

    -- NO unique constraint: every nightly run appends a new row
    -- This is intentional; do not add a unique constraint here
);

-- Indexes for trajectory graph queries
-- Most common: all scores for one entity+model ordered by date
CREATE INDEX IF NOT EXISTS idx_ml_history_entity_model
    ON ml_prediction_history (entity_type, entity_id, model_name, predicted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_history_model
    ON ml_prediction_history (model_name, predicted_at DESC);

-- Row Level Security
-- Authenticated staff can read both tables.
-- Only the service role (GitHub Actions) can write.
-- The service key used by GitHub Actions bypasses RLS automatically.
ALTER TABLE ml_predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_prediction_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ml_predictions"
    ON ml_predictions FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read ml_prediction_history"
    ON ml_prediction_history FOR SELECT
    USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- All writes come from the GitHub Actions service key which bypasses RLS.

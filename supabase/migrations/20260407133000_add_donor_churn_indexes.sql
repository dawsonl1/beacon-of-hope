-- Donor churn ETL performance indexes
-- Additive migration only; no schema-breaking changes.

create index if not exists donations_supporter_type_date_idx
  on public.donations (supporter_id, donation_type, donation_date);

create index if not exists donations_campaign_name_idx
  on public.donations (campaign_name);

create index if not exists social_posts_campaign_created_idx
  on public.social_media_posts (campaign_name, created_at);

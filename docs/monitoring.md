# Monitoring & logging

How this project watches itself. Every cron, alert, log source, and database
table that contributes to observability, written so that a future Dawson (or
future Claude) can trace any symptom back to its source in one read.

Server: `129.146.129.59` (Oracle Cloud, Always-Free tier)
Domain: `intex2.dawsonsprojects.com` (admin) / `beaconofhope.dawsonsprojects.com` (public)
OS: Ubuntu 24.04, systemd-managed services

---

## 1. System layout

Three processes run as systemd services on the VM. They're independent — each has its own logs, its own port, and its own health check.

| Service | Unit file | Port | Purpose |
|---|---|---|---|
| `intex2.service` | `/etc/systemd/system/intex2.service` | `localhost:5000` | .NET Web API (backend, admin UI) |
| `ai-harness.service` | `/etc/systemd/system/ai-harness.service` | `localhost:8001` | FastAPI — OpenAI-backed content generation |
| `vanna-service.service` | `/etc/systemd/system/vanna-service.service` | `localhost:8002` | FastAPI — NL-to-SQL chatbot |

Nginx is the public entry point and reverse-proxies to `intex2`. Postgres 16 runs locally on `5432`.

---

## 2. Monitoring crons (ubuntu's crontab)

```
2-59/5 * * * * /opt/keepalive.sh
0 8 1 * * /opt/keepalive-report.sh
15 0 * * * /opt/daily-stats-collector.sh
0 2 * * * /opt/backup-databases.sh >> /var/log/keepalive/backup.log 2>&1
0 4 * * * /opt/reset-demo.sh
```

Plus a systemd timer (not in crontab):
```
geoipupdate.timer       On Calendar: Wed, Sat (America/New_York) + 3h jitter
```

Everything below expands on these.

---

## 3. `/opt/keepalive.sh` — the heartbeat

Runs every 5 minutes at `:02, :07, :12…`. Does three things in this order:

### 3.1 Service health checks

```bash
backend=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:5000/api/auth/me)
harness=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8001/health)
vanna=$(curl   -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8002/health)
nginx=$(curl   -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost/)
pg=$(sudo -u postgres pg_isready -q && echo ok || echo down)
```

Any non-200 (for backend) or code `000` (for the Python services / nginx) counts as a failure. Postgres is checked via `pg_isready`.

### 3.2 Resource checks

- Disk usage > 85% → alert
- Swap usage > 75% → alert
- Memory available < 50 MB → alert

### 3.3 Crash detection

Tracks `systemctl show <service> --property=NRestarts`. If any of the three services' restart count increased since the last keepalive run, alert.

### 3.4 Anti-reclamation workload

After the checks, starts two background jobs:

```bash
nice -n 19 stress-ng --cpu $(nproc) --timeout 90s &
curl -s --max-time 80 "https://speed.cloudflare.com/__down?bytes=10000000" &
```

- `stress-ng --cpu 2` saturates both cores for 90 s. `nice -n 19` ensures real HTTP requests preempt it instantly.
- `curl` pulls 10 MB from Cloudflare's speedtest endpoint. Feeds the network metric.

Duty cycle: 90 s / 300 s = 30% sustained CPU + ~5 MB/s network bursts. Clears Oracle's 20% reclamation threshold at the 95th percentile.

While the workload runs, the script measures CPU and network for 2 s and appends one line to `/var/log/keepalive/stats-YYYY-MM.csv`:

```
2026-04-13T18:47,100,4972     # timestamp,cpu_pct,kbps
```

### 3.5 Alerting

If any failure was found AND no alert has been sent in the last hour (`/tmp/keepalive-alert-sent` mtime check), sends an email via SendGrid:

- **From:** `Oracle VM Monitor <healthcheck@dawsonsprojects.com>`
- **To:** `dawsonlpitcher@gmail.com`
- **Subject:** `intex2.dawsonsprojects.com - Alert`

The 1-hour cooldown prevents alert floods during extended outages.

---

## 4. `/opt/daily-stats-collector.sh` — aggregation + early warning

Runs at `00:15 UTC` every day. Processes *yesterday's* data.

### 4.1 What it collects

**From `/var/log/keepalive/stats-YYYY-MM.csv`:**
- `cpu_p95`, `net_p95` — 95th percentile over ~288 samples/day
- `cpu_avg`, `cpu_max`
- `data_points` (sample count)

**From Cloudflare GraphQL API** (token at `/opt/cloudflare-token`):
- Unique visitor IPs
- Page views, total requests
- Top countries, top browsers

**From `/var/log/nginx/access.log*`:**
- Top paths, top referrers, top IPs
- **Filtered:** Oracle CIDRs (QualysGuard), known vulnerability probes (`.env`, `/wp-*`, `/dana-na/*`, `/console/login/*`, the `/2015/users/N/...` family, etc.), referrers that are just this server's own IP or contain XSS payloads.

### 4.2 Where it lands: `vm_daily_stats`

Lives in the `dawsonsprojects` database (separate from the app's `intex2` DB so reports and apps don't share a failure domain).

```sql
CREATE TABLE vm_daily_stats (
  date                DATE PRIMARY KEY,
  cf_unique_visitors  INT,
  cf_page_views       INT,
  cf_total_requests   INT,
  cf_countries        JSONB,   -- {country_code: request_count}
  cf_browsers         JSONB,
  top_pages           JSONB,   -- {path: hit_count}, top 20
  top_referrers       JSONB,   -- top 20
  top_ips             JSONB,   -- top 20
  cpu_avg             NUMERIC,
  cpu_max             NUMERIC,
  cpu_p95             NUMERIC,
  net_p95             INT,
  data_points         INT
);
```

`ON CONFLICT (date) DO UPDATE` on insert, so re-running the collector backfills cleanly.

### 4.3 Early-warning alert

After inserting, the collector checks yesterday's p95s against Oracle's 20% reclamation threshold. If either is below:

- Email subject: `intex2 - reclamation risk (p95 below threshold)`
- Tells you which metric failed and suggests checking cron + `stress-ng`

This catches silent keepalive failures within ~24 hours, well before Oracle's 7-day reclamation window closes.

---

## 5. `/opt/keepalive-report.sh` — monthly report

Fires at `08:00 UTC on the 1st of each month` for the previous calendar month. Pulls from both `vm_daily_stats` (reclamation + raw traffic) and `visit_events` (real human visitors).

### 5.1 Sections (in order)

1. **Status banner** — green "All healthy" or red "Reclamation risk" based on monthly p95s.
2. **Real human visitors** — unique humans, pageviews, repeat-visit breakdown, pages humans viewed. Pulls from `visit_events WHERE verdict='human'` and **excludes** fingerprints in the `KNOWN_VISITORS` dict (currently just Dawson).
3. **Known visitors (excluded from count)** — your own activity, shown separately.
4. **Where they came from** — city / region / country + ISP/ASN for the non-known humans.
5. **Bot activity** — count of `verdict='bot'` and `verdict='uncertain'` pageviews. Summary only.
6. **Oracle reclamation status** — CPU p95, Net p95 with SAFE/AT RISK badges, CPU avg/max, days tracked.
7. **Raw request volume (Cloudflare)** — context only; explicitly labeled as including bots.
8. **Request log (nginx)** — top paths/referrers/IPs (scrubbed) for security visibility, not visitor counts.

### 5.2 Styling

HTML email with inline CSS. Brand palette: sage `#0f8f7d`, navy `#0f1b2d`, rose `#cb5768`, amber `#ff9f43`, cream `#f8f7f3`. Plain-text fallback included in the same SendGrid payload.

### 5.3 Tagging additional known visitors

Edit the `KNOWN_VISITORS` dict in `/opt/keepalive-report.sh`:

```python
KNOWN_VISITORS = {
    "a379564cace222423f901bd99c7d7413": "Dawson",
    # "abc123...": "Mom",
}
```

Fingerprints are `fingerprint_hash` values from `visit_events`.

---

## 6. `/opt/reset-demo.sh` — nightly demo reset

Runs at `04:00 UTC`. Stops `intex2.service`, reseeds the demo DB, starts the service. Takes ~70 seconds end-to-end (stop at `:00:01`, fully listening again at `:01:11`).

This is why the keepalive cron runs at `:02, :07, :12…` — to skip the reset window and avoid firing false-alarm `HTTP 000` emails.

---

## 7. `/opt/backup-databases.sh` — nightly backup

Runs at `02:00 UTC`. Output appended to `/var/log/keepalive/backup.log`. Backs up both the `intex2` and `dawsonsprojects` Postgres databases.

---

## 8. Visitor tracking pipeline

The marquee monitoring feature: server logs can't tell bots from humans, so the app collects first-party interaction signals directly from each real browser.

### 8.1 Data flow

```
browser navigates
        │
        ▼
VisitTracker (React)  ──── consent check ────▶  if no analytics consent, stop
        │
        ▼
  wait for interaction:
  2s focus + scroll/pointer/key/touch
          OR 10s of focus (timeout fallback)
        │
        ▼
parallel:                                     (all open-source, MIT)
  • GET /api/track/token                       (HMAC-signed, IP-bound, 10-min TTL)
  • BotD automation detection                  (@fingerprintjs/botd)
  • ThumbmarkJS browser fingerprint            (@thumbmarkjs/thumbmarkjs)
  • read/create boh_visitor_id cookie          (first-party, 1-year)
        │
        ▼
POST /api/track/visit  (navigator.sendBeacon preferred — survives tab close)
        │
        ▼
TrackingEndpoints.cs
  • validate token (HMAC + IP + timestamp)
  • read CF headers: cf-connecting-ip, cf-bot-score
  • geo lookup: GeoIpService → MaxMind .mmdb files (offline)
  • assign verdict (see below)
  • resolve visitor_id (cookie → fingerprint hash → new UUID)
  • INSERT visit_events row
```

### 8.2 The `visit_events` table

Lives in the app's `intex2` Postgres database. Defined in `backend/Models/VisitEvent.cs`, migrated by `20260413192315_AddVisitEvents`.

```sql
CREATE TABLE visit_events (
  id                 BIGSERIAL PRIMARY KEY,
  timestamp          TIMESTAMPTZ DEFAULT NOW(),

  -- identity
  visitor_id         UUID NOT NULL,
  fingerprint_hash   VARCHAR(128),
  ip_hash            VARCHAR(64),           -- salted SHA-256, raw IP never stored
  is_new_visitor     BOOLEAN,

  -- request
  path               VARCHAR(2048),
  referrer           VARCHAR(2048),
  user_agent         VARCHAR(1024),
  language           VARCHAR(32),
  timezone           VARCHAR(64),

  -- verdict
  verdict            VARCHAR(16),           -- 'Human' | 'LikelyHuman' | 'Uncertain' | 'Bot'
  bot_signals        JSONB,
  cf_bot_score       INT,
  interaction_ms     INT,
  scroll_depth_pct   INT,

  -- geolocation (MaxMind GeoLite2, offline)
  country            VARCHAR(2),
  city               VARCHAR(128),
  region             VARCHAR(128),
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  asn                BIGINT,
  asn_org            VARCHAR(256)
);

CREATE INDEX idx_visit_events_timestamp    ON visit_events(timestamp);
CREATE INDEX idx_visit_events_visitor      ON visit_events(visitor_id);
CREATE INDEX idx_visit_events_verdict      ON visit_events(verdict);
CREATE INDEX idx_visit_events_fingerprint  ON visit_events(fingerprint_hash);
```

### 8.3 Verdict logic (`TrackingEndpoints.AssignVerdict`)

| Condition | Verdict |
|---|---|
| BotD flagged automation | `Bot` |
| Cloudflare bot score ≤ 10 | `Bot` |
| BotD clean + interaction ≥ 2 s + (scroll OR click) + CF score ≥ 30 (or null) | `Human` |
| BotD clean + CF clean but no interaction | `LikelyHuman` |
| Anything else | `Uncertain` |

### 8.4 Consent gating

`VisitTracker.tsx` reads `useCookieConsent()` and only fires if `categories.analytics === true`. If the user revokes analytics later, `boh_visitor_id` is deleted on the next navigation via `deleteAnalyticsCookies()`.

Non-consenting visitors are invisible to the report — correct behavior under GDPR/ePrivacy for a first-party analytics beacon that collects a fingerprint.

### 8.5 Security

- **HMAC token:** beacon endpoint requires a short-lived (10-min) token issued by `/api/track/token`. Token is bound to the caller's IP. Prevents direct forgery.
- **IP is hashed** (SHA-256 with salt from `VisitTracking:IpHashSalt` config key). Raw IP never hits disk.
- **No PII stored** — no names, emails, account linkages.

### 8.6 Retention

`DataRetentionJob` (runs monthly on service startup + every 30 days) deletes `visit_events` with `timestamp < NOW() - 12 months`. Uses real `DateTime.UtcNow`, not `AppConstants.DataCutoffUtc`, because these are real-time operational records.

---

## 9. Geolocation (MaxMind GeoLite2)

Offline IP-to-city and IP-to-ASN databases.

| File | Size | Purpose |
|---|---|---|
| `/opt/geoip/GeoLite2-City.mmdb` | ~65 MB | country, region, city, lat/lng |
| `/opt/geoip/GeoLite2-ASN.mmdb` | ~11 MB | ASN number, org name (ISP/carrier) |

**Refresh:** `geoipupdate.timer` runs Wed + Sat with 3-hour random jitter. Config at `/etc/GeoIP.conf` (chmod 600, has your MaxMind AccountID + LicenseKey).

**Backend consumer:** `backend/Services/GeoIpService.cs` loads both files as a singleton at startup. If either file is missing, lookups return all-nulls gracefully — no crash, just empty geo columns.

**Independent from the MaxMind API at request time.** No network call per visit; no rate limit; no third party sees your visitors' IPs.

---

## 10. Log sources

Where to look when something's wrong.

| What | Where | How to read |
|---|---|---|
| Backend (.NET) logs | systemd journal for `intex2.service` | `journalctl -u intex2.service -f` |
| AI Harness logs | `ai-harness.service` | `journalctl -u ai-harness.service -n 200` |
| Vanna logs | `vanna-service.service` | same pattern |
| Nginx access (all requests) | `/var/log/nginx/access.log{,.1}` | |
| Nginx errors | `/var/log/nginx/error.log{,.1}` | |
| Keepalive CSV | `/var/log/keepalive/stats-YYYY-MM.csv` | timestamp, cpu%, kbps |
| Backup log | `/var/log/keepalive/backup.log` | |
| Demo reset log | `/var/log/keepalive/reset.log` | |
| Keepalive alerts cooldown | `/tmp/keepalive-alert-sent` | file mtime = last alert time |
| Crash-count snapshot | `/tmp/keepalive-restarts` | used to diff NRestarts |
| geoipupdate | `journalctl -u geoipupdate.service` | fires twice weekly |

---

## 11. Databases

Two Postgres 16 databases on the VM, same cluster.

### `intex2`
Owned by the .NET backend via EF Core. Holds **all business data** plus:
- `visit_events` — visitor tracking (see §8.2)
- `__EFMigrationsHistory` — EF Core migration state

Applied migrations at startup via `MigrateAsync()`. Schema changes: edit C# models → `dotnet ef migrations add <Name>` → deploy; backend runs the migration on next boot.

### `dawsonsprojects`
Owned by monitoring scripts. Holds:
- `vm_daily_stats` — one row per day (see §4.2). Written by `daily-stats-collector.sh`, read by `keepalive-report.sh`.

Schema is managed manually — no migration tool. Changes: `sudo -u postgres psql -d dawsonsprojects -c "ALTER TABLE ..."`.

---

## 12. Alert destinations

All alerts go to **`dawsonlpitcher@gmail.com`** via SendGrid.

| Alert | Sender | Subject | Trigger |
|---|---|---|---|
| Service/resource failure | `healthcheck@dawsonsprojects.com` | `intex2.dawsonsprojects.com - Alert` | keepalive.sh finds any failed check, rate-limited to 1/hour |
| Reclamation risk | `healthcheck@dawsonsprojects.com` | `intex2 - reclamation risk (p95 below threshold)` | daily-stats-collector.sh detects yesterday's CPU or Net p95 below 20% |
| Monthly report | `healthcheck@dawsonsprojects.com` | `intex2 Monthly Report — <Month YYYY>` | 1st of month at 08:00 UTC |

SendGrid API key is hardcoded into the cron scripts (`/opt/keepalive.sh`, `/opt/keepalive-report.sh`, `/opt/daily-stats-collector.sh`) and the backend production config. Documented in `docs/ACCESS.local.md`.

---

## 13. What is NOT monitored (intentionally)

- **Real-time dashboard.** No "live visitors right now" view. Monthly email + daily alerts are the interface.
- **Per-session funnel analysis.** The data's there in `visit_events` (ordered by timestamp per `visitor_id`), but no UI surfaces it yet.
- **Application-level error tracking.** No Sentry equivalent. Exceptions go to `journalctl -u intex2.service`.
- **Uptime from outside the network.** There's no external probe (e.g. UptimeRobot). The keepalive is on the same VM it monitors — if the VM goes dark entirely, no email fires. Oracle's billing console is the ultimate backstop.
- **Synthetic user tests.** No Playwright/Puppeteer runs against prod on a schedule.

All of these are additions worth considering if the site ever matters more than it does now.

---

## 14. Adding a new check

Pattern for a new health signal:

1. **One-off:** add a `curl` / `pg_isready` / `systemctl is-active` check to `/opt/keepalive.sh`, append to `FAILURES=...`.
2. **Daily metric:** add a column to `vm_daily_stats`, populate from `/opt/daily-stats-collector.sh`, surface in `/opt/keepalive-report.sh`.
3. **Visitor signal:** add a column to `visit_events` + EF migration, populate in `TrackingEndpoints.cs`, filter in the monthly report Python block.

Keep everything in script files on the VM in sync with repo copies under `/docs/` or committed scripts. If you edit a script live on the server, remember to mirror it back into the repo so it doesn't drift.

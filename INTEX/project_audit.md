# Project Audit — Beacon of Hope

**Date:** 2026-04-07
**Auditor:** Claude (strict mode — only DONE if 100% grade-ready)

Status key: **DONE** = production-ready, no issues | **PARTIAL** = started but has gaps or bugs | **NOT STARTED** = doesn't exist

---

## IS 413 — Enterprise Application Development

### Public Pages

| Page | Status | Details |
|------|--------|---------|
| Home / Landing Page | **PARTIAL** | Page is built with hero, counters, CTAs, testimonials, mission section. **Issue:** "Give Today" button is `href="#"` (dead link at line 280 of HomePage.tsx). A non-functional CTA on the main landing page is not grade-ready. |
| Impact / Donor Dashboard | **PARTIAL** | Charts, stats, donation trends all wired to real API. **Issue:** "Donate Now" CTA at bottom is `href="#"` (dead link at line 289 of ImpactPage.tsx). |
| Login Page | **DONE** | Full login form with email/password, validation, error handling, "Remember Me" checkbox, redirects to returnUrl. |
| Privacy Policy Page | **DONE** | Detailed 12-section GDPR-compliant policy, customized for Beacon of Hope, covers minors' data, Philippine DPA, third-party services. Linked from footer. |
| Cookie Consent | **DONE** | Three-option banner (Reject / Manage / Accept All), preference modal with per-category toggles (necessary, analytics, functional), Google Analytics conditionally loaded based on consent. Fully functional, not just cosmetic. |

### Admin Pages (Authenticated)

| Page | Status | Details |
|------|--------|---------|
| Admin Dashboard | **PARTIAL** | KPI cards, charts, recent donations, active residents trend all wired to API. **Issues:** (1) Three quick-action buttons ("Add Resident", "Log Donation", "New Recording") have **no onClick handlers** — they do nothing when clicked (AdminDashboard.tsx:156-167). (2) Sidebar links to `/admin/settings` which has **no route or component** — clicking it causes a blank/404 page. |
| Caseload Inventory | **DONE** | List with search (debounced), filters (status, safehouse, category, risk level), sorting, pagination. Create/edit forms with 40+ fields. Detail page with collapsible sections. Delete with confirmation dialog. Full CRUD via API. |
| Process Recordings | **DONE** | List with resident filter, sorting, pagination (15/page). Create/edit forms capturing session type, emotional state, narrative, interventions, follow-up. Detail page. Delete with confirmation. Full CRUD via API. |
| Home Visitations & Case Conferences | **DONE** | Visitation list with visit-type filter, safety concerns toggle, pagination. Full CRUD for visitations. Case conferences shown in tabs (upcoming/past). Detail view for each visitation. |
| Donors & Contributions | **PARTIAL** | Tabbed view (Supporters + Donations) with search, filtering, pagination. Full CRUD for both supporters and donations. **Issue:** The rubric requires "viewing donation allocations across safehouses and program areas" — the DonorsPage does **not** show allocation data. Backend has `/api/admin/allocations/by-program` and `/api/admin/allocations/by-safehouse` endpoints but they are not surfaced in the Donors UI. |
| Reports & Analytics | **DONE** | Tabbed reports: overview KPIs, donations by source/campaign, resident outcomes (education/health), safehouse comparison with reintegration rates. All wired to real API data. |

### Admin Layout & Navigation

| Item | Status | Details |
|------|--------|---------|
| AdminLayout sidebar | **PARTIAL** | Navigation works for all real pages. **Issues:** (1) "Settings" link points to `/admin/settings` which doesn't exist. (2) "Edit Profile" button has no onClick handler (AdminLayout.tsx:85). |

### Backend API

| Category | Status | Details |
|----------|--------|---------|
| Public read endpoints | **DONE** | 7 impact endpoints + health check. All return real DB data. |
| Admin read endpoints | **DONE** | Metrics, resident list/detail/filter-options, donations, trends, reports, conferences, recordings, supporters, allocations. ~30 GET endpoints. |
| CRUD endpoints (POST/PUT/DELETE) | **DONE** | Full CUD for residents, supporters, donations, visitations, recordings. All protected with appropriate auth. |
| Input validation | **PARTIAL** | Login validates email/password presence. Resident POST checks body not null. Recording POST checks ResidentId. **Missing:** No field-level validation (empty strings, negative amounts, invalid dates, email format, phone format accepted without error). No DataAnnotations or FluentValidation on DTOs. |
| Error handling | **PARTIAL** | 401/403 handled correctly. Basic null checks. No structured error response format for validation failures. |
| Pagination | **DONE** | Consistent across all list endpoints (default 20, max 100). |

### Frontend Infrastructure

| Item | Status | Details |
|------|--------|---------|
| API utility (`apiFetch`) | **DONE** | Centralized, includes credentials, handles 401 events. |
| Routing | **DONE** | All pages routed. Admin routes lazy-loaded. Protected routes with role checks. |
| Loading states | **DONE** | All data-fetching pages show loading indicators. |
| Confirmation dialogs | **DONE** | DeleteConfirmDialog component used before all delete operations. |
| Pagination component | **DONE** | Reusable Pagination component used across list pages. |
| Search / filter components | **DONE** | Debounced search, dropdown filters, URL-persisted filter state. |

### Donor Role Portal

| Item | Status | Details |
|------|--------|---------|
| Donor-specific authenticated view | **NOT STARTED** | Rubric says "Only authenticated users who are donors should be able to see their donor history and the impact of those donations." No donor-facing portal exists. The Donor role is seeded but there is no page or route for donor-role users to see their own history. When a Donor logs in they get redirected but there's nothing for them to see. |

---

## IS 414 — Security (20 pts)

| Requirement | Points | Status | Details |
|-------------|--------|--------|---------|
| HTTPS/TLS | 1 | **PARTIAL** | `app.UseHttpsRedirection()` is in code. Vercel auto-provides HTTPS. Azure provides HTTPS. **But:** Cannot verify until deployed. Code is ready. |
| HTTP → HTTPS redirect | 0.5 | **PARTIAL** | `UseHttpsRedirection()` enabled in Program.cs. Vercel auto-redirects. Needs deployment verification. |
| Authentication (username/password) | 3 | **DONE** | ASP.NET Identity with login endpoint, login page with validation/error handling, session cookies (HttpOnly, Secure, SameSite=Lax), 8hr expiry with sliding. |
| Better password policy | 1 | **DONE** | MinLength=12, RequireUppercase, RequireLowercase, RequireDigit, RequireNonAlphanumeric. Exceeds defaults. Lockout after 5 failed attempts (15 min). |
| Pages/APIs require auth | 1 | **DONE** | All `/api/admin/*` require authorization. Public endpoints (impact, login, health) correctly open. Frontend uses ProtectedRoute with role checks. 401 responses trigger logout. |
| RBAC — admin can CUD | 1.5 | **DONE** | AdminOnly policy on all POST/PUT/DELETE endpoints for residents, supporters, donations. Staff allowed for recording creation. Donor role exists but no CUD access. |
| Confirmation to delete | 1 | **DONE** | DeleteConfirmDialog used on all detail pages before DELETE API calls. |
| Credentials stored securely | 1 | **PARTIAL** | `.env.example` templates with placeholders. `.env` in `.gitignore`. **Issue:** `appsettings.Development.json` is committed to git and contains local Supabase JWT key (line 13). While it's a local dev key, graders may flag it. Production connection string in appsettings.json is empty (good). |
| Privacy policy | 1 | **DONE** | Full GDPR-compliant privacy policy page, customized for Beacon of Hope, linked from footer. |
| Cookie consent (fully functional) | 1 | **DONE** | Functional consent with per-category toggles. Analytics cookies blocked until consent given. Not cosmetic. |
| CSP header | 2 | **DONE** | Content-Security-Policy header set in middleware with: default-src, script-src, style-src, img-src, connect-src, font-src, frame-ancestors, form-action, base-uri. Plus X-Content-Type-Options, X-Frame-Options, Referrer-Policy. |
| Deployed publicly | 4 | **NOT STARTED** | CI/CD workflow exists for backend → Azure. Vercel config exists for frontend. **But nothing is actually deployed and verified working yet.** |
| Additional security features | 2 | **PARTIAL** | Have: (1) HttpOnly cookies ✓, (2) Account lockout ✓, (3) Cache-Control on auth endpoints ✓, (4) Real PostgreSQL for both operational + identity DB ✓. **Missing:** No HSTS header (`UseHsts` not called, no Strict-Transport-Security header). No third-party auth (Google, etc.). No 2FA/MFA. No browser-accessible cookie for user preferences (theme cookie exists in consent system but not actually implemented as a functional setting). No explicit data sanitization/encoding beyond what EF Core provides. |

### Security Summary

| Category | Points Available | Points Estimated |
|----------|-----------------|-----------------|
| Confidentiality (HTTPS + redirect) | 1.5 | 0 (not deployed) |
| Authentication | 5 | 5 |
| RBAC | 1.5 | 1.5 |
| Integrity | 1 | 1 |
| Credentials | 1 | 0.75 (dev key in git) |
| Privacy | 2 | 2 |
| CSP | 2 | 2 |
| Deployed | 4 | 0 (not deployed) |
| Additional | 2 | 0.5 (lockout + real DB) |
| **Total** | **20** | **~12.75 (blocked by deployment)** |

---

## IS 455 — Machine Learning (20 pts)

### Pipeline Status

| Pipeline | Domain | Type | Notebook | Model File | Inference Script | Web Integration | Status |
|----------|--------|------|----------|-----------|-----------------|----------------|--------|
| Reintegration Readiness | Case Mgmt | Predictive | ✅ 8 code cells, 300 lines | ✅ `reintegration-readiness.sav` (2KB) | ✅ `reintegration_infer.py` | ❌ No API endpoint, no UI | **PARTIAL** |
| Reintegration Drivers | Case Mgmt | Explanatory | ✅ 7 code cells, 174 lines | ✅ `reintegration-drivers.sav` (52KB) | ✅ `reintegration_drivers_infer.py` | ❌ No API endpoint, no UI | **PARTIAL** |
| Donor Churn | Donor | Predictive | ❌ Empty notebook | ❌ Empty stub `.sav` | ❌ None | ❌ None | **NOT STARTED** |
| Social Media Content | Outreach | Explanatory | ❌ Empty notebook | ❌ Empty stub `.sav` | ❌ None | ❌ None | **NOT STARTED** |
| Social Media Timing | Outreach | Predictive | ❌ Empty notebook | ❌ Empty stub `.sav` | ❌ None | ❌ None | **NOT STARTED** |
| Incident Early Warning | Case Mgmt | Predictive | ❌ Empty notebook | ❌ Empty stub `.sav` | ❌ None | ❌ None | **NOT STARTED** |

### What Exists for Reintegration Pipelines

- **Training notebooks** exist with code for feature engineering, model training, evaluation
- **Inference scripts** write predictions to `ml_predictions` and `ml_prediction_history` tables in Supabase
- **Feature engineering** includes trauma scores, session rates, health trends, education metrics
- **`run_predictions.py`** entry point exists for nightly batch scoring
- **Config** (`config.py`) defines all table names, model paths, thresholds

### What's Missing for Reintegration Pipelines to be DONE

- No backend API endpoint serves ML predictions to the frontend
- No frontend page/widget displays predictions or driver insights
- No scheduled job (GitHub Actions cron, etc.) to run nightly predictions
- Notebooks need verification that they run end-to-end without errors
- Rubric requires "deployed and accessible" and "integrated with the web application in a meaningful way"

### What's Missing for Remaining 4 Pipelines

- Everything — notebooks are empty stubs with no code

---

## Deployment

| Component | Target | Status | Details |
|-----------|--------|--------|---------|
| Frontend | Vercel | **NOT STARTED** | `vercel.json` exists with SPA rewrite rule. `.env.production` has empty values. Need to configure env vars and verify deployment. |
| Backend | Azure | **NOT STARTED** | GitHub Actions workflow exists (`deploy-backend.yml`) triggered on push to main. App name configured as `intex-backend`. Need `AZURE_WEBAPP_PUBLISH_PROFILE` secret. |
| Database | Supabase Cloud | **NOT STARTED** | Supabase project exists (`eetsyddzvjcqdihgvvew`). Migrations and seed data ready. Need to verify cloud DB has schema + data. |
| Production env vars | All platforms | **NOT STARTED** | Need to set connection strings, Supabase keys on Azure and Vercel. |

---

## Known Bugs & Issues (Must Fix)

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | **HIGH** | `HomePage.tsx:280` | "Give Today" button is `href="#"` — dead link on main landing page |
| 2 | **HIGH** | `ImpactPage.tsx:289` | "Donate Now" button is `href="#"` — dead link |
| 3 | **HIGH** | `AdminDashboard.tsx:156-167` | Three quick-action buttons (Add Resident, Log Donation, New Recording) have no onClick handlers — they do nothing |
| 4 | **MEDIUM** | `AdminLayout.tsx:65` | Sidebar "Settings" link goes to `/admin/settings` — route doesn't exist, causes 404 |
| 5 | **LOW** | `AdminLayout.tsx:85` | "Edit Profile" button has no onClick handler |
| 6 | **MEDIUM** | `DonorsPage.tsx` | No donation allocation view (required by rubric: "viewing donation allocations across safehouses and program areas") |
| 7 | **LOW** | Backend DTOs | No field-level input validation — empty strings, negative amounts, bad dates all accepted |
| 8 | **HIGH** | N/A | No donor-role portal — rubric requires donors to see their own history and donation impact |
| 9 | **MEDIUM** | Backend `Program.cs` | No HSTS header — worth points under "additional security features" |

---

## Summary — What's Grade-Ready vs. What's Not

### Grade-Ready (DONE)

- ✅ Login page with validation and error handling
- ✅ Privacy policy page (GDPR-compliant, customized)
- ✅ Cookie consent (fully functional, not cosmetic)
- ✅ ASP.NET Identity auth with strong password policy + lockout
- ✅ RBAC (Admin/Staff/Donor roles, AdminOnly on CUD endpoints)
- ✅ Delete confirmation dialogs on all entities
- ✅ CSP header + X-Frame-Options + X-Content-Type-Options + Referrer-Policy
- ✅ Caseload Inventory — full CRUD, search, filter, pagination
- ✅ Process Recordings — full CRUD with all required fields
- ✅ Home Visitations & Case Conferences — full CRUD + conference view
- ✅ Reports & Analytics — donations, outcomes, safehouse comparison, reintegration
- ✅ 56 backend API endpoints (7 public, 49 admin-protected)
- ✅ Backend + frontend test suites (8 backend test files, 36 frontend test files)

### Needs Fixes (PARTIAL)

- ⚠️ Home page — fix dead "Give Today" link
- ⚠️ Impact page — fix dead "Donate Now" link
- ⚠️ Admin Dashboard — wire up quick-action buttons
- ⚠️ Admin sidebar — remove or implement Settings link
- ⚠️ Donors page — add allocation view
- ⚠️ Reintegration ML pipelines — need API endpoint + frontend integration
- ⚠️ Credentials — dev Supabase key committed in appsettings.Development.json
- ⚠️ Additional security features — add HSTS, consider theme cookie, etc.

### Not Started (Blocking)

- ❌ **Deployment** (frontend, backend, database) — blocks 5.5 pts (HTTPS + availability)
- ❌ **Donor portal** — authenticated donors seeing their own history/impact
- ❌ **4 ML pipelines** (donor churn, social media content, social media timing, incident warning) — empty notebooks
- ❌ **ML web integration** — no predictions shown anywhere in the app
- ❌ **HSTS header**
- ❌ **Third-party auth / 2FA** (for additional security points)

---

## Priority Order (What to Work On Next)

1. **Deploy everything** — unblocks 5.5 security points (HTTPS + availability) and IS 401 "one working deployed page"
2. **Fix known bugs** (#1-5 above) — quick wins, makes existing pages grade-ready
3. **Add donation allocation view** to Donors page — rubric requirement
4. **Integrate ML predictions into the web app** — API endpoint + dashboard widget for reintegration scores
5. **Build remaining ML pipelines** (donor churn, social media × 2, incident warning)
6. **Add HSTS header** — easy additional security points
7. **Build donor portal** — authenticated donor view of their own history
8. **Consider additional security** — third-party auth, 2FA, theme cookie, data sanitization

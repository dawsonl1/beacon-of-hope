# Security Audit — Beacon of Hope (intex2-1)

**Audit Date:** April 9, 2026
**Live URL:** [https://intex2-1.vercel.app](https://intex2-1.vercel.app)
**Backend:** Azure App Service (.NET 10) — `intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net`
**Database:** Azure PostgreSQL — `intex-db.postgres.database.azure.com`

---

## Rubric Scorecard


| #   | Requirement                             | Pts    | Status                | Confidence |
| --- | --------------------------------------- | ------ | --------------------- | ---------- |
| 1   | Confidentiality — HTTPS/TLS             | 1      | ✅ MET                 | High       |
| 2   | Confidentiality — HTTP → HTTPS redirect | 0.5    | ✅ MET                 | High       |
| 3   | Auth — Username/password authentication | 3      | ✅ MET                 | High       |
| 4   | Auth — Require better passwords         | 1      | ❌ NOT MET             | High       |
| 5   | Auth — Pages/API endpoints require auth | 1      | ✅ MET                 | High       |
| 6   | Auth — RBAC: Admin CUD only             | 1.5    | ✅ MET                 | High       |
| 7   | Integrity — Confirmation to delete      | 1      | ✅ MET                 | High       |
| 8   | Credentials — Stored securely           | 1      | ⚠️ AT RISK            | High       |
| 9   | Privacy — Privacy policy                | 1      | ✅ MET                 | High       |
| 10  | Privacy — GDPR cookie consent           | 1      | ✅ MET                 | High       |
| 11  | Attack Mitigations — CSP header         | 2      | ❌ NOT MET on frontend | High       |
| 12  | Availability — Deployed publicly        | 4      | ✅ MET                 | High       |
| 13  | Additional security features            | 2      | ⚠️ PARTIAL            | Medium     |
|     | **Estimated Total**                     | **20** | **~15.5–17 / 20**     |            |


---

## Detailed Findings Per Rubric Item

---

### 1. Confidentiality — HTTPS/TLS (1 pt) ✅ MET

**Evidence:**

- Vercel serves the frontend over HTTPS automatically (verified: `HTTP/2 200` on `https://intex2-1.vercel.app`).
- Backend on Azure App Service also served over HTTPS.
- Database connection uses `SslMode=Require` in production.

**No action needed.**

---

### 2. Confidentiality — HTTP → HTTPS Redirect (0.5 pt) ✅ MET

**Evidence:**

- Vercel returns **308 Permanent Redirect** from `http://` to `https://` (verified live).
- Backend has `app.UseHttpsRedirection()` at `backend/Program.cs:130`.

**No action needed.**

---

### 3. Auth — Username/Password Authentication (3 pts) ✅ MET

**Evidence:**

- ASP.NET Identity configured in `backend/Program.cs:25-41` with PostgreSQL.
- Cookie-based auth with cookie name `BeaconAuth`.
- Login: `POST /api/auth/login` (no auth required — correct).
- Register: `POST /api/auth/register` (no auth required — correct).
- Me: `GET /api/auth/me` (no auth required — correct, returns status).
- Logout: `POST /api/auth/logout` (requires auth — correct).
- Account lockout: 5 failed attempts → 15-minute lockout (`backend/Program.cs:34-37`).
- Cookie security: HttpOnly, Secure=Always in production, SameSite=None, 8-hour expiry with sliding expiration (`backend/Program.cs:47-74`).

**No action needed.**

---

### 4. Auth — Require Better Passwords (1 pt) ❌ NOT MET

**Current config** (`backend/Program.cs:28-32`):

```csharp
opts.Password.RequiredLength = 12;
opts.Password.RequireUppercase = true;
opts.Password.RequireLowercase = true;
opts.Password.RequireDigit = true;
opts.Password.RequireNonAlphanumeric = true;
```

**Problem:** Class instruction requires password length **greater than 14**. Current minimum is 12.

**Implementation Plan:**

1. Change `RequiredLength = 12` → `RequiredLength = 15` in `backend/Program.cs:28`.
2. Update any frontend validation that enforces minimum password length to match (check `LoginPage.tsx`, `RegisterPage.tsx`, or any registration form).
3. Verify existing seeded test accounts (`IdentitySeeder.cs`) have passwords meeting the new requirement — current passwords are `Test1234!@#$` (12 chars), which would **fail** the new policy. Must update seed passwords to 15+ chars.
4. Run tests to ensure registration/login flows still work.

---

### 5. Auth — Pages/API Endpoints Require Auth Where Needed (1 pt) ✅ MET

**Evidence — All ~100+ endpoints audited:**


| Endpoint Group                                      | Auth Requirement        | Status    |
| --------------------------------------------------- | ----------------------- | --------- |
| Auth (login, register, me)                          | None                    | ✅ Correct |
| Public (health, impact, volunteer, partner, donate) | None                    | ✅ Correct |
| Newsletter (subscribe, unsubscribe)                 | None                    | ✅ Correct |
| Admin (users, partners, residents, metrics)         | Admin/Staff             | ✅ Correct |
| Staff (tasks, calendar, safehouses)                 | Admin/Staff             | ✅ Correct |
| Incidents (CRUD + ML predictions)                   | Admin/Staff             | ✅ Correct |
| Residents (education, health, intervention)         | Admin/Staff             | ✅ Correct |
| Visitations & Conferences                           | Admin/Staff             | ✅ Correct |
| Donations & Allocations                             | AdminOnly / Admin/Staff | ✅ Correct |
| Recordings                                          | Admin/Staff             | ✅ Correct |
| Supporters                                          | AdminOnly               | ✅ Correct |
| Outreach                                            | Admin/Staff             | ✅ Correct |
| Donor Portal (my-donations)                         | Authenticated           | ✅ Correct |
| Newsletter Admin (CRUD, send)                       | Admin/Staff             | ✅ Correct |
| Settings (OKR goal)                                 | Admin/Staff             | ✅ Correct |


**Unauthenticated users can access:** Home page, Impact page, Privacy policy, Login, Register, Donate, Volunteer signup, Partner signup, Newsletter subscribe/unsubscribe, Health check.

**No action needed.**

---

### 6. Auth — RBAC: Admin CUD Only (1.5 pts) ✅ MET

**Evidence:**

- **4 roles defined** in `backend/Data/IdentitySeeder.cs:17`: Admin, Staff, Donor, SocialMediaManager.
- **AdminOnly policy** configured in `backend/Program.cs:76-79`.
- All CUD (Create/Update/Delete) endpoints require Admin or Admin/Staff authorization.
- Staff access is further scoped by safehouse assignment via `SafehouseAuth.cs`.
- Donor role can only view their own donation history (`/api/donor/my-donations`).
- Frontend enforces role-based UI: Admin sees full dashboard, Donor sees donor portal, unauthenticated sees public pages.
- `ProtectedRoute` component (`frontend/src/components/ProtectedRoute.tsx`) enforces `allowedRoles` on routes.

**No action needed.**

---

### 7. Integrity — Confirmation to Delete (1 pt) ✅ MET

**Evidence:**

- Reusable `DeleteConfirmDialog` component at `frontend/src/components/admin/DeleteConfirmDialog.tsx`.
- Used in **all 8 delete operations**: Resident, Incident, Supporter, Visitation, Recording, Partner, Donation, User.
- Modal includes warning icon, descriptive message, Cancel/Delete buttons, and loading state.

**No action needed.**

---

### 8. Credentials — Stored Securely (1 pt) ⚠️ AT RISK

**What's good:**

- `backend/appsettings.json` has empty strings for all secrets (correct pattern).
- `.env.example` files exist with placeholder values.
- `.gitignore` excludes `.env`, `.env.local`, `dp-keys/`.
- Production credentials injected via Azure environment variables.
- GitHub Actions use secrets (`AZURE_WEBAPP_PUBLISH_PROFILE`, `INTEX_AI_HARNESS_SCM_CREDENTIALS`).

**What's bad:**


| Issue                                | Severity | File                                   | Line  |
| ------------------------------------ | -------- | -------------------------------------- | ----- |
| **Real Azure DB password committed** | CRITICAL | `backend/appsettings.Development.json` | 9     |
| Dev API key committed                | Medium   | `backend/appsettings.Local.json`       | 13    |
| Hardcoded seed passwords in source   | Low      | `backend/Data/IdentitySeeder.cs`       | 26-33 |


**The critical issue:** `backend/appsettings.Development.json` contains the **real Azure PostgreSQL password** (`Blubberclockrainbowbuffal0!`) and is tracked in git. Even though `.gitignore` lists it, it was previously committed and exists in git history.

**Implementation Plan:**

1. Run `git rm --cached backend/appsettings.Development.json` to untrack it.
2. Confirm `backend/appsettings.Development.json` is in `.gitignore` (it is at line 21).
3. Leave the database password the same
4. Accept the risk of seeded passwords
5. For the video: clearly show that production credentials are in Azure App Service environment variables, not in code.

---

### 9. Privacy — Privacy Policy (1 pt) ✅ MET

**Evidence:**

- Full privacy policy page at `frontend/src/pages/PrivacyPolicyPage.tsx` (298 lines).
- **12 sections** covering: data collection, usage, minors' protection, data sharing, international transfers, retention, user rights, cookies, security measures, breach notification, contact info, policy changes.
- **Customized for Beacon of Hope**: References Guam location, child welfare, specific data types (residents, donors, staff), Azure West US 2, Vercel CDN.
- **Linked in footer**: `frontend/src/components/Footer.tsx:32`.
- Last updated: April 6, 2026.

**No action needed.**

---

### 10. Privacy — GDPR Cookie Consent (1 pt) ✅ MET

**Evidence:**

- Cookie consent banner: `frontend/src/components/CookieConsent.tsx`.
- Preferences modal with category toggles: `frontend/src/components/CookiePreferencesModal.tsx`.
- Context provider: `frontend/src/contexts/CookieConsentContext.tsx` (136 lines).
- **Fully functional** (not just cosmetic):
  - Three categories: Necessary (always on), Analytics (toggleable), Functional (toggleable).
  - When analytics revoked: Google Analytics cookies (`_ga`, `_gid`, `_gat`, `_ga_`*) are deleted.
  - Consent stored in `boh_cookie_consent` cookie with version, timestamp, and category flags.
  - "Cookie Settings" button in footer allows re-opening preferences.

**For the video:** Clearly state this is **fully functional**, not cosmetic.

---

### 11. Attack Mitigations — CSP Header (2 pts) ❌ NOT MET on Frontend

**This is a critical gap.** The rubric says graders will check the CSP **header** in browser dev tools. When users visit the site, they're hitting Vercel (the frontend). The backend CSP only applies to API responses.

**Backend CSP** (exists but insufficient for grading):

- Configured at `backend/Program.cs:156-167` as HTTP header middleware.
- Policy:
  ```
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://www.google-analytics.com https://generativelanguage.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self'
  ```

**Frontend CSP** (missing):

- **Verified live:** `https://intex2-1.vercel.app` returns **no CSP header**.
- No CSP configured in `frontend/vercel.json`.
- No CSP `<meta>` tag in `frontend/index.html` (and meta tag wouldn't count per rubric anyway).

**Implementation Plan:**

1. Add security headers to `frontend/vercel.json`:
  ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "Content-Security-Policy",
             "value": "default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://generativelanguage.googleapis.com https://intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"
           },
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           },
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           },
           {
             "key": "Referrer-Policy",
             "value": "strict-origin-when-cross-origin"
           }
         ]
       }
     ]
   }
  ```
2. Test thoroughly — CSP can break the site if sources are wrong. Must include the backend API URL in `connect-src`.
3. Redeploy frontend to Vercel.
4. Verify in browser dev tools that the header appears on page load.

---

### 12. Availability — Deployed Publicly (4 pts) ✅ MET

**Evidence:**

- Frontend live at `https://intex2-1.vercel.app` (verified, returns 200).
- Backend live at `https://intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net`.
- CI/CD via GitHub Actions: `deploy-backend.yml` deploys on push to main.
- Database on Azure PostgreSQL Flexible Server.

**No action needed.**

---

### 13. Additional Security Features (2 pts) ⚠️ PARTIAL

**Currently implemented extras:**


| Feature                                      | Status        | Evidence                                                                                                                                                                                                                    |
| -------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HSTS**                                     | ✅ Implemented | Vercel returns `strict-transport-security: max-age=63072000; includeSubDomains; preload`. Backend also calls `app.UseHsts()` (`Program.cs:131`).                                                                            |
| **Browser-accessible cookie for UI setting** | ✅ Implemented | `boh_cookie_consent` and `boh_theme` cookies are non-HttpOnly, accessible to JavaScript. Used by React for cookie preferences and theme. (`frontend/src/utils/cookies.ts`, `CookieConsentContext.tsx`)                      |
| **Security headers beyond CSP**              | ✅ Implemented | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` set in backend (`Program.cs:169-171`). Auth endpoints have `Cache-Control: no-store` (`Program.cs:179-181`). |
| **Data sanitization (React default)**        | ✅ Partial     | React auto-escapes JSX. No `dangerouslySetInnerHTML` usage found. No explicit sanitization library.                                                                                                                         |
| **Production DBMS (not SQLite)**             | ✅ Implemented | Azure PostgreSQL Flexible Server for both operational and identity databases.                                                                                                                                               |
| **Account lockout**                          | ✅ Implemented | 5 attempts → 15-min lockout (`Program.cs:34-37`).                                                                                                                                                                           |
| **Safehouse-scoped authorization**           | ✅ Implemented | Staff see only data from assigned safehouses (`SafehouseAuth.cs`).                                                                                                                                                          |


**NOT implemented extras:**


| Feature                                | Status            | Notes                                                                                                        |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| **Third-party auth (OAuth/SSO)**       | ❌ Not implemented | No Google/GitHub/etc. login.                                                                                 |
| **Two-factor / MFA**                   | ❌ Not implemented | No 2FA/MFA support.                                                                                          |
| **Docker containers for deployment**   | ❌ Not implemented | Only local dev Docker Compose exists (`docker-compose.dev.yml`). Production uses Azure App Service directly. |
| **Explicit data sanitization library** | ❌ Not implemented | No DOMPurify or similar. Relies on React defaults only.                                                      |


---

## Summary: What Needs to Be Done

### Must-Fix (Rubric Points at Stake)


| Priority        | Item                                              | Points at Risk | Effort             |
| --------------- | ------------------------------------------------- | -------------- | ------------------ |
| 🔴 **Critical** | Fix password min length (12 → 15)                 | 1 pt           | ~30 min            |
| 🔴 **Critical** | Add CSP header to Vercel frontend (`vercel.json`) | 2 pts          | ~1-2 hrs (testing) |
| 🟡 **High**     | remove `appsettings.Development.json` from git    | 1 pt           | ~30 min            |


### Should-Fix (Strengthens Existing Points)


| Priority | Item                                                                                             | Impact                                |
| -------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 🟡       | Add security headers to `vercel.json` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy) | Stronger security posture for graders |


### Nice-to-Have (Additional Points)


| Priority | Item                                 | Potential Points |
| -------- | ------------------------------------ | ---------------- |
| 🟢       | Add Google OAuth (third-party auth)  | +0.5–1 pt        |
| 🟢       | Add basic TOTP 2FA/MFA               | +0.5–1 pt        |
| 🟢       | Add DOMPurify for input sanitization | +0.25–0.5 pt     |



---

## Extra Features Beyond Rubric (Already Implemented)

These are security features we have that go beyond what the rubric explicitly asks for:

1. **Account lockout protection** — 5 failed login attempts trigger 15-minute lockout.
2. **Safehouse-scoped authorization** — Staff users are restricted to data from their assigned safehouses only, not just role-based but data-scoped.
3. **Auth response cache prevention** — `Cache-Control: no-store` on `/api/auth` endpoints prevents cached auth responses.
4. **Cookie SameSite/Secure enforcement** — Production cookies use `Secure=Always` and `SameSite=None` with `HttpOnly`.
5. **Login redirect validation** — Frontend validates `returnUrl` matches user's role before redirecting post-login.
6. **Session-only auth storage** — Auth cached in `sessionStorage` (not `localStorage`), cleared on browser close.
7. **CI/CD security** — GitHub Actions deploy via publish profiles/SCM credentials stored as GitHub Secrets.
8. **Data Protection API** — ASP.NET Data Protection keys persisted to filesystem with application-specific isolation.

---

## Extra Features We Could Implement

These are additional security features not currently present that could earn points or strengthen the app:

1. **Google OAuth / SSO** — Add "Sign in with Google" button. ASP.NET Identity supports this natively via `AddGoogle()`. Moderate effort.
2. **TOTP-based 2FA/MFA** — ASP.NET Identity has built-in support for authenticator app codes. Must keep grader accounts without 2FA per rubric. Moderate effort.
3. **Rate limiting** — Add `Microsoft.AspNetCore.RateLimiting` middleware to prevent brute-force attacks on login and API abuse. Low effort.
4. **DOMPurify sanitization** — Add explicit input sanitization for user-generated text fields (notes, descriptions). Low effort.
5. **Permissions-Policy header** — Restrict browser features like camera, microphone, geolocation. Trivial effort.
6. **Subresource Integrity (SRI)** — Add integrity hashes to external script/stylesheet tags. Low effort.
7. **CORS tightening** — Replace `.AllowAnyHeader()` and `.AllowAnyMethod()` with specific allowed values. Low effort.
8. **Security.txt** — Add `/.well-known/security.txt` with vulnerability reporting info. Trivial effort.
9. **Dockerized production deployment** — Create Dockerfile for backend and deploy as container on Azure Container Apps. High effort.
10. **Audit logging** — Log security-relevant events (login attempts, role changes, data deletions) to a separate table. Moderate effort.

---

## Files Referenced


| File                                                    | Relevant Lines | Topic                                  |
| ------------------------------------------------------- | -------------- | -------------------------------------- |
| `backend/Program.cs`                                    | 25-41          | Identity config                        |
| `backend/Program.cs`                                    | 28             | Password length (needs change)         |
| `backend/Program.cs`                                    | 47-74          | Cookie config                          |
| `backend/Program.cs`                                    | 76-79          | AdminOnly policy                       |
| `backend/Program.cs`                                    | 81-97          | CORS config                            |
| `backend/Program.cs`                                    | 130-131        | HTTPS redirect + HSTS                  |
| `backend/Program.cs`                                    | 154-181        | Security headers + CSP                 |
| `backend/Data/IdentitySeeder.cs`                        | 17, 24-33      | Roles + seed passwords                 |
| `backend/Endpoints/AuthEndpoints.cs`                    | 13-158         | Auth endpoints                         |
| `backend/Endpoints/SafehouseAuth.cs`                    | all            | Safehouse scoping                      |
| `backend/appsettings.Development.json`                  | 9              | ⚠️ Exposed DB password                 |
| `frontend/vercel.json`                                  | all            | Deployment config (needs CSP)          |
| `frontend/src/components/CookieConsent.tsx`             | all            | Cookie consent banner                  |
| `frontend/src/contexts/CookieConsentContext.tsx`        | all            | Cookie consent logic                   |
| `frontend/src/components/CookiePreferencesModal.tsx`    | all            | Cookie preferences                     |
| `frontend/src/pages/PrivacyPolicyPage.tsx`              | all            | Privacy policy                         |
| `frontend/src/components/Footer.tsx`                    | 32-35          | Privacy policy + cookie settings links |
| `frontend/src/components/ProtectedRoute.tsx`            | all            | Route protection                       |
| `frontend/src/components/admin/DeleteConfirmDialog.tsx` | all            | Delete confirmation                    |
| `frontend/src/contexts/AuthContext.tsx`                 | all            | Auth state management                  |
| `frontend/src/utils/cookies.ts`                         | all            | Browser-accessible cookies             |



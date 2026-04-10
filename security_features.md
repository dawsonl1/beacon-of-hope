# Security Features — File Locations & Line Numbers

Use **Cmd+F** and search for `[SECURITY-N]` (e.g., `[SECURITY-3]`) in any file to find the relevant code.

---

## Rubric Item Index

### [SECURITY-1] Confidentiality — HTTPS/TLS (1 pt)

| File | Lines | Description |
|------|-------|-------------|
| `backend/Program.cs` | ~140 | `app.UseHttpsRedirection()` — forces HTTPS on backend |
| `frontend/vercel.json` | (deployment) | Vercel provides automatic TLS certificates |
| Vercel live response | — | Verified: `HTTP/2 200` over HTTPS |

---

### [SECURITY-2] Confidentiality — HTTP → HTTPS Redirect (0.5 pt)

| File | Lines | Description |
|------|-------|-------------|
| `backend/Program.cs` | ~140 | `app.UseHttpsRedirection()` redirects HTTP → HTTPS |
| Vercel (platform) | — | Returns **308 Permanent Redirect** from http to https |

---

### [SECURITY-3] Auth — Username/Password Authentication (3 pts)

| File | Lines | Description |
|------|-------|-------------|
| `backend/Program.cs` | ~27-47 | ASP.NET Identity configuration with PostgreSQL |
| `backend/Program.cs` | ~51-80 | Cookie-based session configuration (HttpOnly, Secure, SameSite) |
| `backend/Endpoints/AuthEndpoints.cs` | 13-59 | `POST /api/auth/login` — email/password login |
| `backend/Endpoints/AuthEndpoints.cs` | 70-130 | `POST /api/auth/register` — user registration |
| `backend/Endpoints/AuthEndpoints.cs` | 135-165 | `GET /api/auth/me` — session verification |
| `frontend/src/contexts/AuthContext.tsx` | all | Frontend auth state management & session caching |

---

### [SECURITY-4] Auth — Require Better Passwords (1 pt)

| File | Lines | Description |
|------|-------|-------------|
| `backend/Program.cs` | ~31 | `RequiredLength = 14` — minimum 14 characters (per class instruction: prioritize length) |
| `backend/Program.cs` | ~32-36 | Other password options (uppercase, lowercase, digit, non-alphanumeric all set per policy) |

---

### [SECURITY-5] Auth — Pages/API Endpoints Require Auth (1 pt)

| File | Lines | Description |
|------|-------|-------------|
| `backend/Program.cs` | ~196-197 | `app.UseAuthentication()` / `app.UseAuthorization()` middleware |
| `backend/Endpoints/AuthEndpoints.cs` | 13, 70, 135 | Login, register, me — correctly public (no auth) |
| `backend/Endpoints/AuthEndpoints.cs` | 64 | Logout — requires auth (correct) |
| `backend/Endpoints/AdminEndpoints.cs` | throughout | All admin endpoints require Admin/Staff role |
| `backend/Endpoints/DonationEndpoints.cs` | throughout | All donation CRUD requires AdminOnly |
| `backend/Endpoints/IncidentEndpoints.cs` | throughout | All incident CRUD requires Admin/Staff |
| `backend/Endpoints/ResidentEndpoints.cs` | throughout | All resident CRUD requires Admin/Staff |
| `backend/Endpoints/SupporterEndpoints.cs` | throughout | All supporter CRUD requires AdminOnly |
| `backend/Endpoints/VisitationEndpoints.cs` | throughout | All visitation CRUD requires Admin/Staff |
| `backend/Endpoints/RecordingEndpoints.cs` | throughout | All recording CRUD requires Admin/Staff |
| `backend/Endpoints/CaseConferenceEndpoints.cs` | throughout | All conference CRUD requires Admin/Staff |
| `backend/Endpoints/StaffEndpoints.cs` | throughout | All staff endpoints require Admin/Staff |
| `backend/Endpoints/ReportEndpoints.cs` | throughout | All reports require Admin/Staff |
| `backend/Endpoints/OutreachEndpoints.cs` | throughout | All outreach requires Admin/Staff |
| `backend/Endpoints/NewsletterEndpoints.cs` | 19, 56 | Subscribe/unsubscribe — correctly public |
| `backend/Endpoints/NewsletterEndpoints.cs` | 93+ | Admin newsletter CRUD — requires Admin/Staff |
| `backend/Endpoints/PublicEndpoints.cs` | throughout | Impact data, health check — correctly public |
| `backend/Endpoints/DonorPortalEndpoints.cs` | 74 | My-donations — requires auth |
| `frontend/src/components/ProtectedRoute.tsx` | all | Frontend route guard — redirects to /login |

---

### [SECURITY-6] Auth — RBAC: Admin CUD Only (1.5 pts)

| File | Lines | Description |
|------|-------|-------------|
| `backend/Program.cs` | ~82-85 | `AdminOnly` authorization policy definition |
| `backend/Data/IdentitySeeder.cs` | 17 | Role definitions: Admin, Staff, Donor, SocialMediaManager |
| `backend/Endpoints/SafehouseAuth.cs` | all | Safehouse-scoped authorization (staff see only assigned data) |
| `backend/Endpoints/AuthEndpoints.cs` | ~120 | New users assigned "Donor" role (least privilege) |
| `frontend/src/components/ProtectedRoute.tsx` | 33-38 | `allowedRoles` enforcement on frontend routes |
| `frontend/src/App.tsx` | ~156-207 | Route definitions: Admin/Staff → /admin, Donor → /donor |

---

### [SECURITY-7] Integrity — Confirmation to Delete (1 pt)

| File | Lines | Description |
|------|-------|-------------|
| `frontend/src/components/admin/DeleteConfirmDialog.tsx` | all | Reusable confirmation modal for all delete operations |
| `frontend/src/pages/admin/ResidentDetailPage.tsx` | (uses DeleteConfirmDialog) | Delete resident confirmation |
| `frontend/src/pages/admin/IncidentDetailPage.tsx` | (uses DeleteConfirmDialog) | Delete incident confirmation |
| `frontend/src/pages/admin/SupporterDetailPage.tsx` | (uses DeleteConfirmDialog) | Delete supporter confirmation |
| `frontend/src/pages/admin/VisitationDetailPage.tsx` | (uses DeleteConfirmDialog) | Delete visitation confirmation |
| `frontend/src/pages/admin/RecordingDetailPage.tsx` | (uses DeleteConfirmDialog) | Delete recording confirmation |
| `frontend/src/pages/admin/PartnerDetailPage.tsx` | (uses DeleteConfirmDialog) | Delete partner confirmation |
| `frontend/src/pages/admin/DonationFormPage.tsx` | (uses DeleteConfirmDialog) | Delete donation confirmation |
| `frontend/src/pages/admin/UsersPage.tsx` | (uses DeleteConfirmDialog) | Delete user confirmation |

---

### [SECURITY-8] Credentials — Stored Securely (1 pt)

| File | Lines | Description |
|------|-------|-------------|
| `backend/appsettings.json` | all | Base config — all secret fields are empty strings |
| `backend/.env.example` | all | Template with placeholders — no real values |
| `.gitignore` | 14-21 | Excludes `.env`, `.env.local`, `appsettings.Development.json` |
| Azure App Service | (deployment) | Production credentials set as OS-level environment variables |
| GitHub Actions | (workflows) | Deploy secrets stored as GitHub repository secrets |

---

### [SECURITY-9] Privacy — Privacy Policy (1 pt)

| File | Lines | Description |
|------|-------|-------------|
| `frontend/src/pages/PrivacyPolicyPage.tsx` | all (298 lines) | Full GDPR-compliant policy with 12 sections |
| `frontend/src/components/Footer.tsx` | 32 | `<Link to="/privacy-policy">` — linked from footer on every page |

---

### [SECURITY-10] Privacy — GDPR Cookie Consent (1 pt)

| File | Lines | Description |
|------|-------|-------------|
| `frontend/src/components/CookieConsent.tsx` | all | Cookie consent banner (Accept All / Reject / Manage) |
| `frontend/src/components/CookiePreferencesModal.tsx` | all | Category-level toggle modal (Necessary, Analytics, Functional) |
| `frontend/src/contexts/CookieConsentContext.tsx` | all | Consent state management, cookie read/write, analytics cleanup |
| `frontend/src/utils/cookies.ts` | 15-27 | `deleteAnalyticsCookies()` — removes GA cookies on revocation |
| `frontend/src/components/Footer.tsx` | 33-35 | "Cookie Settings" button reopens preferences modal |

**Status: FULLY FUNCTIONAL** (not cosmetic). When analytics consent is revoked, Google Analytics cookies are actively deleted.

---

### [SECURITY-11] Attack Mitigations — CSP Header (2 pts)

| File | Lines | Description |
|------|-------|-------------|
| `frontend/vercel.json` | headers section | **CSP header on frontend** — graders check this in browser dev tools on page load |
| `backend/Program.cs` | ~163-177 | CSP header on backend API responses |

**CSP Policy (both locations):**
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

The frontend `vercel.json` CSP also includes the backend API URL in `connect-src` so API calls work.

---

### [SECURITY-12] Availability — Deployed Publicly (4 pts)

| File | Lines | Description |
|------|-------|-------------|
| `frontend/vercel.json` | all | Vercel deployment config (API rewrites to Azure backend) |
| `.github/workflows/deploy-backend.yml` | all | CI/CD: auto-deploy backend to Azure on push to main |
| Frontend URL | — | https://intex2-1.vercel.app |
| Backend URL | — | https://intex-backend-hehbb8gwb2e3b8b6.westus2-01.azurewebsites.net |

---

### [SECURITY-13] Additional Security Features (2 pts)

| Label | File | Lines | Description |
|-------|------|-------|-------------|
| **[SECURITY-13a]** Account lockout | `backend/Program.cs` | ~40-42 | 5 failed attempts → 15-min lockout |
| **[SECURITY-13b]** HSTS | `backend/Program.cs` | ~142 | `app.UseHsts()` — 1-year Strict-Transport-Security |
| **[SECURITY-13b]** HSTS (Vercel) | Vercel platform | — | `max-age=63072000; includeSubDomains; preload` |
| **[SECURITY-13c]** Security headers | `backend/Program.cs` | ~177-181 | X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| **[SECURITY-13c]** Security headers | `frontend/vercel.json` | headers section | Same headers also set on frontend responses |
| **[SECURITY-13d]** Browser-accessible cookie | `frontend/src/utils/cookies.ts` | all | Non-HttpOnly cookies (`boh_cookie_consent`, `boh_theme`) used by React for UI preferences |
| **[SECURITY-13e]** Production DBMS | `backend/Program.cs` | ~21-23 | Azure PostgreSQL Flexible Server (not SQLite) for both operational and identity databases |
| **[SECURITY-13f]** Data sanitization | React framework | — | React auto-escapes all JSX output; no `dangerouslySetInnerHTML` usage in codebase |

---

## Optional Features NOT Yet Implemented

These could be added for additional points:

- **Third-party auth (OAuth/SSO)** — e.g., Google Sign-In via `AddGoogle()` in ASP.NET Identity
- **Two-factor / MFA** — ASP.NET Identity has built-in TOTP authenticator support
- **Docker containers** — Dockerize backend for Azure Container Apps deployment
- **Rate limiting** — `Microsoft.AspNetCore.RateLimiting` middleware for login/API abuse prevention
- **Permissions-Policy header** — restrict browser features (camera, microphone, geolocation)
- **DOMPurify sanitization** — explicit input sanitization library for user-generated content

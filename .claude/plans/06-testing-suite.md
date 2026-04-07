# Plan 06 — Comprehensive Testing Suite

## Overview

Testing pyramid for Beacon of Hope: unit tests at the base, integration tests in the middle, E2E tests at the top.

| Layer | Framework | What it tests | Count target |
|-------|-----------|---------------|-------------|
| Backend Unit | xUnit + Moq | Endpoint logic, auth, validation, mapping | ~120 tests |
| Backend Integration | xUnit + WebApplicationFactory + TestContainers | Full HTTP pipeline with real DB | ~80 tests |
| Frontend Unit | Vitest + React Testing Library | Components, hooks, contexts, utils | ~100 tests |
| Frontend Integration | Vitest + MSW (Mock Service Worker) | Pages rendering with mocked API | ~60 tests |
| E2E | Playwright | Full user flows across browser | ~30 tests |
| **Total** | | | **~390 tests** |

---

## Layer 1: Backend Unit Tests

**Project:** `backend.Tests/` (xUnit)

### 1.1 Auth Endpoints (12 tests)
| Test | What it verifies |
|------|-----------------|
| Login_ValidCredentials_ReturnsUserInfo | 200 with email, roles |
| Login_InvalidPassword_Returns401 | 401 Unauthorized |
| Login_NonexistentUser_Returns401 | 401, no info leak about user existence |
| Login_LockedOutAccount_Returns423 | 423 after 5 failed attempts |
| Login_MissingEmail_Returns400 | Validation error |
| Login_MissingPassword_Returns400 | Validation error |
| Logout_Authenticated_Returns200 | Signs out, clears cookie |
| Logout_Unauthenticated_Returns401 | Cannot logout without session |
| Me_Authenticated_ReturnsUserInfo | 200 with user data |
| Me_Unauthenticated_ReturnsNotAuthenticated | 200 with isAuthenticated: false |
| PasswordPolicy_TooShort_Rejected | < 12 chars fails |
| PasswordPolicy_NoSpecialChar_Rejected | Missing special char fails |

### 1.2 Authorization / RBAC (18 tests)
| Test | What it verifies |
|------|-----------------|
| PublicEndpoints_NoAuth_Returns200 | /api/health, /api/impact/* all work unauthenticated |
| AdminReadEndpoints_NoAuth_Returns401 | /api/admin/metrics, residents, etc. require auth |
| AdminReadEndpoints_StaffRole_Returns200 | Staff can read admin data |
| AdminReadEndpoints_DonorRole_Returns403 | Donor cannot access admin read endpoints |
| AdminCUD_AdminRole_Returns200 | Admin can create/update/delete |
| AdminCUD_StaffRole_Returns403 | Staff cannot create/update/delete residents |
| AdminCUD_DonorRole_Returns403 | Donor cannot CUD |
| AdminCUD_Unauthenticated_Returns401 | No auth = 401 |
| RecordingCreate_StaffRole_Returns200 | Staff CAN create recordings (explicit policy) |
| RecordingDelete_StaffRole_Returns403 | Staff cannot delete recordings |
| DeleteResident_AdminOnly_Returns200 | Only admin can delete |
| DeleteDonation_AdminOnly_Returns200 | Only admin can delete |
| DeleteSupporter_AdminOnly_Returns200 | Only admin can delete |
| DeleteVisitation_AdminOnly_Returns200 | Only admin can delete |
| DeleteRecording_AdminOnly_Returns200 | Only admin can delete |
| CorsHeaders_AllowedOrigin_Present | Vercel domain gets CORS headers |
| CorsHeaders_DisallowedOrigin_Blocked | Random origin gets no CORS |
| CspHeader_Present_OnEveryResponse | Content-Security-Policy header exists |

### 1.3 Public API Endpoints (14 tests)
| Test | What it verifies |
|------|-----------------|
| Health_ReturnsStatusAndDbInfo | Returns status, database, environment, endpoints |
| ImpactSummary_ReturnsAggregatedData | totalResidents, activeSafehouses, totalDonations, reintegrationRate |
| ImpactSummary_NoPII | No names, birthdates, case numbers in response |
| DonationsByMonth_ReturnsSortedData | Ordered by year, month ascending |
| DonationsByMonth_EmptyDb_ReturnsEmptyArray | Graceful on no data |
| AllocationsByProgram_GroupsCorrectly | Sum of allocations by program area |
| EducationTrends_ReturnsMonthlyAvg | avgProgress per month |
| HealthTrends_ReturnsAllScores | avgHealth, avgNutrition, avgSleep, avgEnergy |
| Safehouses_ReturnsAll | Returns all safehouses with capacity/occupancy |
| Safehouses_NoPII | No resident details in response |
| Snapshots_OnlyPublished | Only returns is_published = true |
| Snapshots_OrderedByDate | Newest first |
| Snapshots_MaxResults | Returns at most 12 |
| AllEndpoints_ReturnJson | Content-Type: application/json |

### 1.4 Admin CRUD — Residents (16 tests)
| Test | What it verifies |
|------|-----------------|
| ListResidents_DefaultPagination | Returns page 1, pageSize 20 |
| ListResidents_SearchByCode | search=LS-0001 filters correctly |
| ListResidents_FilterByCaseStatus | caseStatus=Active filters correctly |
| ListResidents_FilterBySafehouse | safehouseId=1 filters correctly |
| ListResidents_FilterByCategory | caseCategory=Neglected filters correctly |
| ListResidents_FilterByRiskLevel | riskLevel=Critical filters correctly |
| ListResidents_MultipleFilters | Combines filters with AND logic |
| ListResidents_SortByAdmission | sortBy=admission, sortDir=desc works |
| ListResidents_PaginationMetadata | totalCount, page, pageSize in response |
| GetResident_ValidId_ReturnsAllFields | All 49 fields present |
| GetResident_InvalidId_Returns404 | Nonexistent ID returns 404 |
| CreateResident_ValidData_Returns200 | Creates and returns new resident |
| CreateResident_MissingRequired_Returns400 | Validation error on missing fields |
| UpdateResident_ValidData_Returns200 | Updates resident fields |
| UpdateResident_InvalidId_Returns404 | Nonexistent ID returns 404 |
| DeleteResident_ValidId_Returns200 | Deletes resident |

### 1.5 Admin CRUD — Recordings (12 tests)
| Test | What it verifies |
|------|-----------------|
| ListRecordings_NoFilter_ReturnsAll | Paginated list |
| ListRecordings_FilterByResident | residentId param works |
| ListRecordings_Chronological | Ordered by session_date |
| GetRecording_ReturnsAllFields | All fields including narrative |
| CreateRecording_ValidData_Returns200 | Creates recording |
| CreateRecording_InvalidResident_Returns400 | Nonexistent resident rejected |
| UpdateRecording_Returns200 | Updates recording |
| DeleteRecording_Returns200 | Deletes recording |
| EmotionalTrends_ReturnsTimeSeries | Ordered emotional state data |
| EmotionalTrends_MissingResidentId_Returns400 | Required param validation |
| NarrativeField_LongText_Accepted | 10000+ char narrative works |
| RecordingList_NarrativePreview_Truncated | Preview is max 120 chars |

### 1.6 Admin CRUD — Visitations (10 tests)
| Test | What it verifies |
|------|-----------------|
| ListVisitations_DefaultPagination | Paginated list |
| ListVisitations_FilterByResident | residentId filter works |
| ListVisitations_FilterByVisitType | visitType filter works |
| ListVisitations_SafetyOnly | safetyOnly=true filter works |
| GetVisitation_ReturnsAllFields | Full visitation detail |
| CreateVisitation_ValidData_Returns200 | Creates visitation |
| UpdateVisitation_Returns200 | Updates visitation |
| DeleteVisitation_Returns200 | Deletes visitation |
| Conferences_ReturnsUpcomingAndPast | Separated by date |
| Conferences_OrderedByDate | Most recent first |

### 1.7 Admin CRUD — Supporters & Donations (16 tests)
| Test | What it verifies |
|------|-----------------|
| ListSupporters_DefaultPagination | Returns paginated list with totalDonated |
| ListSupporters_FilterByType | supporterType param works |
| ListSupporters_FilterByStatus | status param works |
| ListSupporters_Search | search param searches displayName, email |
| GetSupporter_IncludesDonationHistory | Returns donations array |
| CreateSupporter_ValidData_Returns200 | Creates supporter |
| UpdateSupporter_Returns200 | Updates supporter |
| DeleteSupporter_Returns200 | Deletes supporter |
| ListDonations_DefaultPagination | Paginated list with supporter name |
| ListDonations_FilterBySupporterId | supporterId filter works |
| ListDonations_FilterByType | donationType filter works |
| ListDonations_FilterByDateRange | dateFrom/dateTo filters work |
| CreateDonation_ValidData_Returns200 | Creates donation |
| UpdateDonation_Returns200 | Updates donation |
| DeleteDonation_Returns200 | Deletes donation |
| AllocationsByProgram_ReturnsGrouped | Grouped allocation totals |

### 1.8 Admin Reports (10 tests)
| Test | What it verifies |
|------|-----------------|
| Metrics_ReturnsAllFields | activeResidents, openIncidents, monthlyDonations, upcomingConferences |
| DonationsBySource_GroupsCorrectly | By channel_source |
| DonationsByCampaign_GroupsCorrectly | By campaign_name |
| ResidentOutcomes_ReturnsReintegrationStats | Success rate, by type |
| SafehouseComparison_ReturnsPerSafehouse | Occupancy, incidents, recordings per safehouse |
| ReintegrationRates_ByTypeAndSafehouse | Broken down by reintegration type |
| FilterOptions_ReturnsDistinctValues | Case statuses, safehouses, categories, risk levels, workers |
| ActiveResidentsTrend_ReturnsMonthly | Monthly active resident counts |
| FlaggedCasesTrend_ReturnsMonthly | Monthly incident counts |
| ResidentsList_ReturnsLightweight | Just id, internalCode for dropdowns |

### 1.9 EntityMapper (5 tests)
| Test | What it verifies |
|------|-----------------|
| MapResident_AllFieldsCopied | All 48 properties mapped |
| MapRecording_AllFieldsCopied | All 14 properties mapped |
| MapSupporter_AllFieldsCopied | All 12 properties mapped |
| MapDonation_AllFieldsCopied | All 11 properties mapped |
| MapVisitation_AllFieldsCopied | All 13 properties mapped |

---

## Layer 2: Backend Integration Tests

**Project:** `backend.IntegrationTests/` (xUnit + WebApplicationFactory)

Uses a real PostgreSQL database (TestContainers or local Supabase) for true integration testing.

### 2.1 Database Operations (15 tests)
| Test | What it verifies |
|------|-----------------|
| SeedData_AllTablesPopulated | All 17 tables have expected row counts |
| Residents_CRUD_FullCycle | Create → Read → Update → Delete |
| Recordings_CRUD_FullCycle | Create → Read → Update → Delete |
| Visitations_CRUD_FullCycle | Create → Read → Update → Delete |
| Supporters_CRUD_FullCycle | Create → Read → Update → Delete |
| Donations_CRUD_FullCycle | Create → Read → Update → Delete |
| Residents_ForeignKey_SafehouseExists | FK constraint enforced |
| Donations_ForeignKey_SupporterExists | FK constraint enforced |
| Recordings_ForeignKey_ResidentExists | FK constraint enforced |
| Visitations_ForeignKey_ResidentExists | FK constraint enforced |
| Donations_CascadeDelete_Allocations | Deleting donation cascades to allocations |
| Residents_FilterCombination_Correct | Complex filter returns correct results |
| Donations_DateRange_Correct | Date filtering returns correct results |
| Identity_TablesCreated | ASP.NET Identity migration applied |
| Seeder_CreatesTestAccounts | 3 test accounts exist with correct roles |

### 2.2 Auth Integration (10 tests)
| Test | What it verifies |
|------|-----------------|
| Login_SetsAuthCookie | Response includes Set-Cookie header |
| Cookie_ValidSession_Authenticated | Subsequent requests with cookie are authenticated |
| Cookie_Expired_Returns401 | Expired cookie rejected |
| Logout_ClearsCookie | Cookie removed after logout |
| RBAC_AdminCanCUD | Full CRUD flow with admin cookie |
| RBAC_StaffCanRead | Read-only with staff cookie |
| RBAC_DonorBlocked | Admin endpoints rejected for donor |
| Lockout_AfterFiveFailures | Account locked for 15 minutes |
| PasswordPolicy_EnforcedOnRegistration | Weak passwords rejected |
| ConcurrentSessions_Work | Multiple sessions for same user |

### 2.3 Security Headers (5 tests)
| Test | What it verifies |
|------|-----------------|
| CSP_HeaderPresent | Content-Security-Policy on all responses |
| XFrameOptions_Present | X-Frame-Options: DENY |
| XContentTypeOptions_Present | X-Content-Type-Options: nosniff |
| ReferrerPolicy_Present | Referrer-Policy: strict-origin-when-cross-origin |
| CORS_CorrectOrigins | Only allowed origins get CORS headers |

---

## Layer 3: Frontend Unit Tests

**Framework:** Vitest + React Testing Library + jsdom

### 3.1 Utility Functions (8 tests)
| Test | What it verifies |
|------|-----------------|
| formatDate_ValidDate_FormatsCorrectly | "2024-03-15" → "Mar 15, 2024" |
| formatDate_Null_ReturnsDash | null → "—" |
| formatDate_Undefined_ReturnsDash | undefined → "—" |
| formatAmount_ValidNumber_FormatsCorrectly | 1234.56 → "₱1,234.56" |
| formatAmount_Null_ReturnsDash | null → "—" |
| formatMonthLabel_FormatsCorrectly | (2024, 3) → "Mar 24" |
| cookies_SetAndGet | setCookie/getCookie roundtrip |
| cookies_Delete | deleteCookie removes cookie |

### 3.2 Domain Constants (5 tests)
| Test | What it verifies |
|------|-----------------|
| CASE_STATUSES_ContainsExpectedValues | Active, Closed, Discharged |
| RISK_LEVELS_ContainsExpectedValues | Critical, High, Medium, Low |
| SUPPORTER_TYPES_ContainsExpectedValues | All 4 types |
| DONATION_TYPES_ContainsExpectedValues | All 5 types |
| VISIT_TYPES_ContainsExpectedValues | All 5 types |

### 3.3 API Helper (6 tests)
| Test | What it verifies |
|------|-----------------|
| apiFetch_Success_ReturnsData | Resolves with JSON data |
| apiFetch_404_ThrowsError | Rejects with error message |
| apiFetch_500_ThrowsError | Rejects with error message |
| apiFetch_NetworkError_ThrowsError | Rejects on network failure |
| apiFetch_IncludesCredentials | fetch called with credentials: 'include' |
| getApiUrl_ReturnsConfiguredUrl | Returns VITE_API_URL or default |

### 3.4 AuthContext (10 tests)
| Test | What it verifies |
|------|-----------------|
| AuthProvider_ChecksSession_OnMount | Calls /api/auth/me on mount |
| AuthProvider_SetsUser_WhenAuthenticated | User state populated |
| AuthProvider_NullUser_WhenUnauthenticated | User is null |
| Login_Success_SetsUser | login() updates user state |
| Login_Failure_ThrowsError | login() with bad creds throws |
| Logout_ClearsUser | logout() sets user to null |
| IsAdmin_TrueForAdmin | Role check works |
| IsAdmin_FalseForStaff | Role check works |
| Loading_TrueWhileChecking | loading state during /me call |
| Loading_FalseAfterCheck | loading false after /me resolves |

### 3.5 CookieConsentContext (8 tests)
| Test | What it verifies |
|------|-----------------|
| DefaultState_NoConsent | No cookie → no consent |
| AcceptAll_SetsAllCategories | All categories true |
| RejectNonEssential_OnlyNecessary | Only necessary true |
| ManagePreferences_ToggleAnalytics | Individual category toggle |
| Consent_PersistsInCookie | Cookie written on accept |
| Consent_RestoredFromCookie | Cookie read on mount |
| RevokeConsent_ClearsCategories | Revoke sets all to false |
| PolicyVersion_TrackedInCookie | Version number in cookie |

### 3.6 ProtectedRoute (6 tests)
| Test | What it verifies |
|------|-----------------|
| Authenticated_RendersChildren | User present → shows content |
| Unauthenticated_RedirectsToLogin | No user → redirect to /login |
| WrongRole_RedirectsToLogin | Donor accessing admin → redirect |
| Loading_ShowsSpinner | While auth checking, shows loader |
| ReturnUrl_IncludedInRedirect | /login?returnUrl=/admin/caseload |
| AdminRole_AccessesAdminRoutes | Admin user → content rendered |

### 3.7 Shared Components (12 tests)
| Test | What it verifies |
|------|-----------------|
| Header_ShowsLoginWhenUnauthenticated | "Login" link visible |
| Header_ShowsUserNameWhenAuthenticated | User name displayed |
| Header_LogoutButton_CallsLogout | Logout triggers auth context |
| Footer_PrivacyLink_PointsCorrectly | Links to /privacy-policy |
| Footer_CookieSettings_OpensModal | Button triggers cookie preferences |
| CookieConsent_ShowsOnFirstVisit | Banner appears without cookie |
| CookieConsent_HiddenAfterAccept | Banner hidden after accept |
| CookieConsent_ManagePreferences_OpensModal | Opens preferences modal |
| DeleteConfirmDialog_ShowsMessage | Displays confirmation text |
| DeleteConfirmDialog_Confirm_CallsOnConfirm | Confirm button triggers callback |
| DeleteConfirmDialog_Cancel_CallsOnCancel | Cancel button triggers callback |
| Pagination_RendersCorrectPages | Correct page numbers displayed |

### 3.8 useApiFetch Hook (5 tests)
| Test | What it verifies |
|------|-----------------|
| ReturnsLoadingTrue_Initially | loading true before resolve |
| ReturnsData_OnSuccess | data populated after fetch |
| ReturnsError_OnFailure | error message set on reject |
| NullUrl_SkipsFetch | No fetch when url is null |
| RefetchesOnUrlChange | New fetch when url changes |

---

## Layer 4: Frontend Integration Tests

**Framework:** Vitest + MSW (Mock Service Worker) + React Testing Library

### 4.1 Page Rendering (19 tests, one per page)
| Test | What it verifies |
|------|-----------------|
| HomePage_RendersAllSections | Hero, impact stats, mission, testimonial, CTA |
| ImpactPage_RendersCharts | Stats banner, donation chart, allocation chart |
| LoginPage_RendersForm | Email, password inputs, submit button |
| PrivacyPolicyPage_RendersContent | All 12 sections, TOC |
| AdminDashboard_RendersMetrics | 4 metric cards, table, charts |
| CaseloadPage_RendersTable | Filter bar, table, pagination |
| ResidentDetailPage_RendersSections | 9 collapsible sections |
| ResidentFormPage_RendersFields | All form fields present |
| ProcessRecordingsPage_RendersList | Recording list with filters |
| RecordingDetailPage_RendersAllFields | Session info, narrative, emotional state |
| RecordingFormPage_RendersInputs | All form inputs present |
| VisitationsPage_RendersTabs | Two tabs (Visitations + Conferences) |
| VisitationDetailPage_RendersInfo | Visit info, safety concerns |
| VisitationFormPage_RendersDropdowns | Visit type, cooperation level dropdowns |
| DonorsPage_RendersTabs | Supporters + Donations tabs |
| SupporterDetailPage_RendersDonationHistory | Profile + donations table |
| SupporterFormPage_RendersFields | Type, status, contact fields |
| DonationFormPage_ChangesWithType | Type selector changes visible fields |
| ReportsPage_RendersTabs | 4 tabs with charts |

### 4.2 User Flows (12 tests)
| Test | What it verifies |
|------|-----------------|
| Login_SubmitValid_RedirectsToAdmin | Login → admin dashboard |
| Login_SubmitInvalid_ShowsError | Error message displayed |
| Caseload_SearchFilters_UpdateTable | Type in search → table updates |
| Caseload_ClickRow_NavigatesToDetail | Click resident → detail page |
| Caseload_CreateResident_FormSubmits | Fill form → submit → success |
| Recordings_FilterByResident_Updates | Select resident → list filters |
| Visitations_TabSwitch_ShowsContent | Click tab → content changes |
| Donors_AddSupporter_FormSubmits | Fill form → submit → success |
| Donors_LogDonation_TypeChangesFields | Select monetary → amount appears |
| Reports_TabSwitch_LoadsData | Click tab → data fetches |
| DeleteResident_Confirm_Deletes | Confirm dialog → API call |
| DeleteResident_Cancel_Aborts | Cancel dialog → no API call |

---

## Layer 5: E2E Tests

**Framework:** Playwright

### 5.1 Public Pages (8 tests)
| Test | What it verifies |
|------|-----------------|
| HomePage_Loads_ShowsHero | Title, CTA buttons visible |
| HomePage_ImpactStats_Animate | Counters animate on scroll |
| ImpactPage_Charts_Render | Charts visible with data |
| ImpactPage_Navigate_FromHome | Click "See Our Impact" → impact page |
| LoginPage_Accessible_FromHeader | Click "Login" → login page |
| PrivacyPolicy_Accessible_FromFooter | Click footer link → privacy page |
| CookieConsent_Appears_OnFirstVisit | Banner shows, can accept/decline |
| CookieConsent_Remembered_OnRevisit | No banner on second visit after accept |

### 5.2 Auth Flows (6 tests)
| Test | What it verifies |
|------|-----------------|
| Login_Admin_RedirectsToDashboard | admin@ login → /admin |
| Login_Staff_RedirectsToDashboard | staff@ login → /admin |
| Login_InvalidCreds_ShowsError | Wrong password → error message |
| Admin_ProtectedRoutes_RequireAuth | Direct /admin URL → redirect to /login |
| Logout_RedirectsToHome | Click logout → back to / |
| Session_Persists_OnRefresh | Refresh page → still logged in |

### 5.3 Admin CRUD Flows (10 tests)
| Test | What it verifies |
|------|-----------------|
| Caseload_FullCRUD | Login → create resident → view → edit → delete |
| Recordings_CreateAndView | Login → new recording → view in list |
| Visitations_CreateWithSafetyConcern | Create visitation with safety flag |
| Visitations_CaseConferences_Tab | Switch to conferences tab, view upcoming |
| Donors_CreateSupporter_ViewProfile | Add supporter → view profile |
| Donors_LogDonation_ViewInHistory | Log donation → appears in supporter history |
| Reports_AllTabs_HaveData | Navigate all 4 report tabs |
| Delete_ShowsConfirmation | Delete button → confirmation dialog |
| Delete_Cancel_KeepsRecord | Cancel delete → record still exists |
| NonAdmin_CannotDelete | Staff user → no delete buttons visible |

### 5.4 Responsive & Accessibility (6 tests)
| Test | What it verifies |
|------|-----------------|
| Mobile_HomePage_ResponsiveLayout | 375px width renders correctly |
| Mobile_AdminSidebar_Collapses | Sidebar collapses on mobile |
| Lighthouse_Accessibility_Score | ≥ 90 on every public page |
| KeyboardNavigation_LoginForm | Tab through fields, Enter to submit |
| ScreenReader_ImpactStats_Readable | aria-labels on charts |
| ColorContrast_AllPages_Pass | WCAG AA contrast ratios |

---

## Test Infrastructure

### Directory Structure
```
backend.Tests/
  Auth/
    LoginTests.cs
    RBACTests.cs
  Endpoints/
    PublicEndpointTests.cs
    ResidentTests.cs
    RecordingTests.cs
    VisitationTests.cs
    SupporterTests.cs
    DonationTests.cs
    ReportTests.cs
  Mapping/
    EntityMapperTests.cs
  Helpers/
    TestWebApplicationFactory.cs
    AuthHelper.cs

backend.IntegrationTests/
  DatabaseTests.cs
  AuthIntegrationTests.cs
  SecurityHeaderTests.cs
  Helpers/
    IntegrationTestBase.cs

frontend/
  src/__tests__/
    utils/
      constants.test.ts
      cookies.test.ts
      api.test.ts
    contexts/
      AuthContext.test.tsx
      CookieConsentContext.test.tsx
    components/
      Header.test.tsx
      Footer.test.tsx
      CookieConsent.test.tsx
      ProtectedRoute.test.tsx
      DeleteConfirmDialog.test.tsx
      Pagination.test.tsx
    hooks/
      useApiFetch.test.ts
    pages/
      HomePage.test.tsx
      ImpactPage.test.tsx
      LoginPage.test.tsx
      PrivacyPolicyPage.test.tsx
      admin/
        CaseloadPage.test.tsx
        ResidentDetailPage.test.tsx
        ResidentFormPage.test.tsx
        ProcessRecordingsPage.test.tsx
        RecordingDetailPage.test.tsx
        RecordingFormPage.test.tsx
        VisitationsPage.test.tsx
        VisitationDetailPage.test.tsx
        VisitationFormPage.test.tsx
        DonorsPage.test.tsx
        SupporterDetailPage.test.tsx
        SupporterFormPage.test.tsx
        DonationFormPage.test.tsx
        ReportsPage.test.tsx
  e2e/
    public-pages.spec.ts
    auth-flows.spec.ts
    admin-crud.spec.ts
    responsive-a11y.spec.ts
  vitest.config.ts
  playwright.config.ts

```

### Packages to Install
**Backend:**
- `xUnit` + `xUnit.runner.visualstudio`
- `Microsoft.AspNetCore.Mvc.Testing` (WebApplicationFactory)
- `Moq` (mocking)
- `FluentAssertions` (readable assertions)
- `Testcontainers.PostgreSql` (optional, for real DB integration tests)

**Frontend:**
- `vitest` + `@vitest/ui`
- `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event`
- `jsdom`
- `msw` (Mock Service Worker)
- `@playwright/test` (E2E)

### CI Integration
Tests should run on every PR via GitHub Actions:
```yaml
# .github/workflows/test.yml
- Backend unit tests: dotnet test backend.Tests/
- Backend integration tests: dotnet test backend.IntegrationTests/
- Frontend unit + integration: cd frontend && npx vitest run
- E2E (on merge to main): npx playwright test
```

---

## Definition of Done

- [ ] All test projects created and configured
- [ ] All ~390 tests written and passing
- [ ] CI workflow runs tests on PR
- [ ] Coverage report generated (target: 80%+ line coverage)
- [ ] Test helper utilities reusable for future tests
- [ ] MSW handlers match all 52 API endpoints
- [ ] Playwright tests run against local dev environment

---

## Requirements Traceability Matrix

Maps every graded rubric line item to existing test(s) in this plan. **GAP** = no test currently covers the requirement.

### IS 413 — Required Pages & Functionality

| Rubric Item | Test(s) | Coverage |
|-------------|---------|----------|
| **Home / Landing Page** | 4.1 `HomePage_RendersAllSections`, 5.1 `HomePage_Loads_ShowsHero`, `HomePage_ImpactStats_Animate` | COVERED |
| **Impact / Donor-Facing Dashboard** | 4.1 `ImpactPage_RendersCharts`, 5.1 `ImpactPage_Charts_Render`, `ImpactPage_Navigate_FromHome`, 1.3 public API tests (8 tests) | COVERED |
| **Login Page** | 4.1 `LoginPage_RendersForm`, 4.2 `Login_SubmitValid_RedirectsToAdmin`, `Login_SubmitInvalid_ShowsError`, 5.2 auth flow tests (6 tests) | COVERED |
| **Privacy Policy Page** | 4.1 `PrivacyPolicyPage_RendersContent`, 3.7 `Footer_PrivacyLink_PointsCorrectly`, 5.1 `PrivacyPolicy_Accessible_FromFooter` | COVERED |
| **Cookie Consent** | 3.5 CookieConsentContext (8 tests), 3.7 `CookieConsent_ShowsOnFirstVisit` / `HiddenAfterAccept` / `ManagePreferences_OpensModal`, 5.1 `CookieConsent_Appears_OnFirstVisit` / `CookieConsent_Remembered_OnRevisit` | COVERED |
| **Admin Dashboard** | 4.1 `AdminDashboard_RendersMetrics`, 1.8 Admin Reports (10 tests) | COVERED |
| **Caseload Inventory — list/filter/search/pagination** | 1.4 Residents (16 tests incl. search, filter, pagination, sort), 4.1 `CaseloadPage_RendersTable`, 4.2 `Caseload_SearchFilters_UpdateTable`, `Caseload_ClickRow_NavigatesToDetail` | COVERED |
| **Caseload Inventory — CRUD** | 1.4 Create/Update/Delete residents, 2.1 `Residents_CRUD_FullCycle`, 4.2 `Caseload_CreateResident_FormSubmits`, 5.3 `Caseload_FullCRUD` | COVERED |
| **Process Recordings — list/filter/chronological** | 1.5 Recordings (12 tests), 4.1 `ProcessRecordingsPage_RendersList`, 4.2 `Recordings_FilterByResident_Updates` | COVERED |
| **Process Recordings — CRUD** | 1.5 Create/Update/Delete recordings, 2.1 `Recordings_CRUD_FullCycle`, 5.3 `Recordings_CreateAndView` | COVERED |
| **Home Visitation & Case Conferences** | 1.6 Visitations (10 tests), 4.1 `VisitationsPage_RendersTabs` / `VisitationDetailPage_RendersInfo` / `VisitationFormPage_RendersDropdowns`, 4.2 `Visitations_TabSwitch_ShowsContent`, 5.3 `Visitations_CreateWithSafetyConcern` / `Visitations_CaseConferences_Tab` | COVERED |
| **Donors & Contributions — CRUD + allocations** | 1.7 Supporters & Donations (16 tests), 4.1 `DonorsPage_RendersTabs` / `SupporterDetailPage_RendersDonationHistory` / `SupporterFormPage_RendersFields` / `DonationFormPage_ChangesWithType`, 4.2 `Donors_AddSupporter_FormSubmits` / `Donors_LogDonation_TypeChangesFields`, 5.3 `Donors_CreateSupporter_ViewProfile` / `Donors_LogDonation_ViewInHistory` | COVERED |
| **Reports & Analytics** | 1.8 Admin Reports (10 tests), 4.1 `ReportsPage_RendersTabs`, 4.2 `Reports_TabSwitch_LoadsData`, 5.3 `Reports_AllTabs_HaveData` | COVERED |
| **Pagination (general)** | 1.4 `ListResidents_DefaultPagination` / `ListResidents_PaginationMetadata`, 3.7 `Pagination_RendersCorrectPages` | COVERED |
| **Validation & error handling** | 1.4 `CreateResident_MissingRequired_Returns400`, 1.5 `CreateRecording_InvalidResident_Returns400`, 3.3 API error tests | COVERED |

### IS 414 — Security Rubric (20 pts)

| Rubric Item | Pts | Test(s) | Coverage |
|-------------|-----|---------|----------|
| **HTTPS/TLS** | 1 | None | **GAP** — No test verifies that the deployed site serves over HTTPS with a valid TLS certificate. Add an E2E or smoke test that hits the production URL and asserts `https://` and a valid cert. |
| **HTTP → HTTPS redirect** | 0.5 | None | **GAP** — No test verifies that an HTTP request is 301/302 redirected to HTTPS. Add a deployment smoke test (e.g., `curl -I http://...` asserts 301 to `https://`). |
| **Authentication (username/password)** | 3 | 1.1 Auth Endpoints (12 tests), 2.2 Auth Integration (10 tests), 3.4 AuthContext (10 tests), 5.2 Auth Flows (6 tests) | COVERED |
| **Better passwords** | 1 | 1.1 `PasswordPolicy_TooShort_Rejected` / `PasswordPolicy_NoSpecialChar_Rejected`, 2.2 `PasswordPolicy_EnforcedOnRegistration` | COVERED — but see note below* |
| **Pages/APIs require auth where needed** | 1 | 1.2 `AdminReadEndpoints_NoAuth_Returns401` / `AdminCUD_Unauthenticated_Returns401`, 3.6 ProtectedRoute (6 tests), 5.2 `Admin_ProtectedRoutes_RequireAuth` | COVERED |
| **RBAC — only admin can CUD** | 1.5 | 1.2 `AdminCUD_AdminRole_Returns200` / `AdminCUD_StaffRole_Returns403` / `AdminCUD_DonorRole_Returns403`, 2.2 `RBAC_AdminCanCUD` / `RBAC_StaffCanRead` / `RBAC_DonorBlocked`, 5.3 `NonAdmin_CannotDelete` | COVERED |
| **Delete confirmation** | 1 | 3.7 `DeleteConfirmDialog_ShowsMessage` / `Confirm_CallsOnConfirm` / `Cancel_CallsOnCancel`, 4.2 `DeleteResident_Confirm_Deletes` / `DeleteResident_Cancel_Aborts`, 5.3 `Delete_ShowsConfirmation` / `Delete_Cancel_KeepsRecord` | COVERED |
| **Credentials not in repo** | 1 | None | **GAP** — No test scans the repository for leaked secrets. Add a CI step or test that runs a regex scan (e.g., `git log --all -p` grepped for connection strings, API keys, passwords) and asserts zero matches. |
| **Privacy policy** | 1 | 4.1 `PrivacyPolicyPage_RendersContent` (12 sections, TOC), 3.7 `Footer_PrivacyLink_PointsCorrectly`, 5.1 `PrivacyPolicy_Accessible_FromFooter` | COVERED |
| **Cookie consent (fully functional)** | 1 | 3.5 CookieConsentContext (8 tests including `AcceptAll_SetsAllCategories`, `RejectNonEssential_OnlyNecessary`, `ManagePreferences_ToggleAnalytics`, persistence), 5.1 `CookieConsent_Appears_OnFirstVisit` / `CookieConsent_Remembered_OnRevisit` | PARTIAL — Tests verify the consent UI and cookie storage, but no test asserts that analytics/tracking cookies are actually **blocked** until consent is granted. Add a test that checks no third-party cookies are set before the user accepts. |
| **CSP header** | 2 | 1.2 `CspHeader_Present_OnEveryResponse`, 2.3 `CSP_HeaderPresent` | PARTIAL — Tests assert the header exists, but no test validates that the header **value** contains appropriate directives (`default-src`, `script-src`, etc.) and is not overly permissive (e.g., no `unsafe-inline` / `unsafe-eval` unless justified). Add a test that parses the CSP value and checks for required directives. |
| **Deployed publicly** | 4 | None | **GAP** — No smoke test hits the deployed URL and asserts HTTP 200. Add a post-deployment smoke test in CI that curls both frontend and backend production URLs. |
| **Additional security features** | 2 | 2.3 `XFrameOptions_Present` / `XContentTypeOptions_Present` / `ReferrerPolicy_Present`, 1.2 CORS tests | PARTIAL — Extra security headers are tested, but if the team adds third-party auth (Google OAuth), 2FA/MFA, HSTS, browser-cookie user settings, or data sanitization, **no tests exist yet** for those features. Tests must be added alongside each feature implemented. |

> *\*Better passwords note:* The rubric states this is "STRICTLY graded" per class instruction. Ensure tests assert the exact policy taught in class (e.g., minimum length of 12+, requires uppercase, lowercase, digit, special character, no common passwords). Current tests only check length and special char -- **add tests for uppercase, lowercase, and digit requirements** to match the full policy.

### IS 401 — Accessibility & Responsiveness

| Rubric Item | Pts Context | Test(s) | Coverage |
|-------------|-------------|---------|----------|
| **Lighthouse accessibility >= 90% on every page** | Thursday deliverable | 5.4 `Lighthouse_Accessibility_Score` | PARTIAL — The test description says "every public page" but does not explicitly list all pages. Ensure the test iterates over ALL pages: Home, Impact, Login, Privacy Policy, Admin Dashboard, Caseload, Recordings, Visitations, Donors, Reports. Currently only "every public page" is mentioned; **admin pages must also be included**. |
| **Responsiveness on all pages** | Thursday deliverable | 5.4 `Mobile_HomePage_ResponsiveLayout` / `Mobile_AdminSidebar_Collapses` | **GAP** — Only 2 pages tested for responsive layout (Home and Admin sidebar). Need responsive layout tests for ALL pages: Impact, Login, Privacy Policy, Caseload, Recordings, Visitations, Donors, Reports. Add Playwright viewport tests at 375px and 1440px for each. |

### IS 455 — Machine Learning

| Rubric Item | Test(s) | Coverage |
|-------------|---------|----------|
| ML pipeline endpoints (predictions API) | None | **GAP** — No tests exist for ML prediction endpoints. Once pipelines are deployed as API endpoints, add backend unit + integration tests for each prediction endpoint (valid input returns prediction, invalid input returns 400, endpoint requires auth if applicable). |

### Video Demo Coverage

The video cannot be tested directly, but the following features that must be demonstrated in the video **do** have automated tests validating they work:

- Authentication login/logout flow: 38+ tests across all layers
- RBAC enforcement: 18+ tests
- CRUD operations with delete confirmation: 30+ tests
- Cookie consent: 11+ tests
- CSP header presence: 2 tests
- Privacy policy page: 3 tests

Features that will be demoed but **lack automated validation**:
- HTTPS/TLS and redirect (deployment-dependent)
- Credentials handling (process-dependent, not runtime-testable)
- Any additional security features (tests must be added when features are built)

### Summary of Gaps to Close

| # | Gap | Priority | Suggested Fix |
|---|-----|----------|---------------|
| 1 | HTTPS/TLS verification | HIGH (1 pt) | Add deployment smoke test: `fetch('https://yourdomain.com')` asserts 200 and valid cert |
| 2 | HTTP → HTTPS redirect | HIGH (0.5 pt) | Add deployment smoke test: `fetch('http://yourdomain.com', { redirect: 'manual' })` asserts 301 to HTTPS |
| 3 | Credentials not in repo | HIGH (1 pt) | Add CI test that greps the codebase for patterns like `password=`, `connectionstring=`, API key formats, and `.env` file contents; assert zero matches |
| 4 | Deployed publicly smoke test | HIGH (4 pt) | Add post-deploy CI step that curls production frontend and backend URLs, asserts 200 |
| 5 | Cookie consent blocks cookies before acceptance | MEDIUM (1 pt) | Add E2E test: fresh browser → navigate → assert zero non-essential cookies → accept → assert analytics cookies now present |
| 6 | CSP header value validation | MEDIUM (2 pt) | Extend existing CSP tests to parse the header value and assert `default-src`, `script-src`, `style-src` are present and reasonably restrictive |
| 7 | Better passwords — full policy | MEDIUM (1 pt) | Add unit tests for uppercase, lowercase, and digit requirements in addition to existing length and special char tests |
| 8 | Responsive layout — all pages | MEDIUM (graded in 401) | Add Playwright tests at 375px and 1440px for all 10+ pages, not just Home and Admin sidebar |
| 9 | Lighthouse accessibility — all pages | MEDIUM (graded in 401) | Ensure Lighthouse test iterates over every route including all admin pages, not just public ones |
| 10 | ML prediction endpoints | LOW (when built) | Add tests for each ML API endpoint once deployed |
| 11 | Additional security feature tests | LOW (when built) | Add tests alongside each additional security feature (Google OAuth, 2FA, HSTS, dark mode cookie, sanitization, etc.) |

---

## Architecture Review

### 1. Backend Testability: The 1700-line Program.cs Problem

Program.cs contains all 52 endpoints as inline minimal API lambdas. This creates three specific testing difficulties:

**Problem A: No unit-testable logic.** Every endpoint lambda captures `AppDbContext` directly. There is no service layer, repository, or handler class to instantiate in isolation. The plan lists ~120 "unit tests" but with the current architecture, every backend test must spin up `WebApplicationFactory` because the endpoint logic is inseparable from the HTTP pipeline and EF context. These are integration tests wearing a unit test label.

**Problem B: WebApplicationFactory overhead.** `WebApplicationFactory<Program>` works with minimal APIs, but creating one per test class means each class boots the full DI container including Identity, CORS, and the security header middleware. For 120+ tests this will be slow unless the factory is shared via `IClassFixture<>`.

**Problem C: EntityMapper is the only truly unit-testable code.** The `EntityMapper` static class (5 tests) is the single piece of logic that can be tested without HTTP or database. Everything else requires a running pipeline.

**Recommendations:**

- Do NOT refactor endpoints into separate files before writing tests. That is scope creep. Instead, accept that "backend unit tests" are really lightweight integration tests via `WebApplicationFactory` and own that terminology.
- Create a single `TestWebApplicationFactory` that replaces the real database connection with a TestContainers PostgreSQL instance (see section 3 below). Share it across all test classes using xUnit `ICollectionFixture<>` so the container starts once per test run, not once per class.
- For the EntityMapper tests, test those as true unit tests in a separate project or folder with zero infrastructure dependencies.
- If the project grows beyond this course, the next step would be extracting endpoint handlers into static methods that take explicit parameters (e.g., `static async Task<IResult> GetResident(int id, AppDbContext db)`) which can be called directly in tests. But this is not necessary for the current scope.

### 2. Frontend Test Setup: MSW Handler Organization

The plan requires MSW handlers for all 52 endpoints. Dumping them into a single file will be unmaintainable.

**Recommended handler file structure:**
```
frontend/src/__tests__/
  mocks/
    handlers/
      auth.ts          -- /api/auth/login, /api/auth/logout, /api/auth/me
      public.ts        -- /api/health, /api/impact/*
      residents.ts     -- /api/admin/residents*
      recordings.ts    -- /api/admin/recordings*
      visitations.ts   -- /api/admin/visitations*, /api/admin/conferences
      supporters.ts    -- /api/admin/supporters*
      donations.ts     -- /api/admin/donations*, /api/admin/allocations*
      reports.ts       -- /api/admin/reports/*, /api/admin/metrics, trends
      index.ts         -- Re-exports all handlers as a flat array
    data/
      residents.ts     -- Factory functions: makeResident(), makeResidentList()
      recordings.ts    -- makeRecording(), etc.
      supporters.ts
      donations.ts
      visitations.ts
    server.ts          -- setupServer(...allHandlers)
  helpers/
    renderWithProviders.tsx   -- Wraps component in AuthProvider, Router, etc.
    mockAuth.ts               -- Utilities to set authenticated/unauthenticated state
```

**Critical helper: `renderWithProviders`.** Almost every page test needs `BrowserRouter`, `AuthProvider`, and possibly `CookieConsentProvider`. Without a shared render utility, every test file will duplicate 15 lines of provider wrapping. This helper should accept an options object:

```tsx
renderWithProviders(<CaseloadPage />, {
  route: '/admin/caseload',
  user: { email: 'admin@test.com', roles: ['Admin'] },  // pre-sets auth state
});
```

**Critical helper: `mockAuth.ts`.** The `AuthContext` calls `/api/auth/me` on mount. Every test that renders inside `AuthProvider` will hit that endpoint. The MSW auth handler must default to returning `{ isAuthenticated: false }` and provide a way to override it per test (e.g., `server.use(http.get('/api/auth/me', () => HttpResponse.json(adminUser))))`).

**Handler data factories vs static fixtures.** Use factory functions (`makeResident({ overrides })`) rather than static JSON fixtures. Factories make it trivial to generate variations (resident with missing fields, resident with specific risk level) without maintaining dozens of fixture files.

### 3. Database Strategy: TestContainers Is the Only Correct Choice

The plan mentions "TestContainers or local Supabase" for integration tests. This needs to be a firm decision, not an either/or.

**In-memory SQLite will NOT work.** The codebase uses:
- `DateOnly` properties extensively (50+ columns across 17 tables). SQLite has no native `date` type and the EF Core SQLite provider's `DateOnly` support is fragile.
- `DateOnly.DayNumber` arithmetic in LINQ queries (line 932: `r.DateClosed!.Value.DayNumber - r.DateOfAdmission!.Value.DayNumber`). This translates to PostgreSQL's date subtraction but will throw at runtime on SQLite because SQLite has no concept of `DayNumber`.
- `DateOnly` comparisons in `Where` clauses (line 1378: `d.DonationDate >= dateFrom.Value`). These rely on PostgreSQL's native date comparison operators.
- Npgsql-specific connection string handling (Supabase pooler configuration).

**EF Core InMemory provider will also fail.** It does not enforce foreign key constraints, which means the 5 FK-related integration tests (section 2.1) would be meaningless. It also does not support raw SQL or provider-specific translations.

**Decision: Use TestContainers.PostgreSql unconditionally.** It provides:
- Exact PostgreSQL behavior including `DateOnly` handling, FK constraints, and cascade deletes.
- Isolated, disposable containers per test run (no shared state pollution).
- No dependency on a running Supabase instance (which would break CI and other developers' machines).
- Realistic migration testing: apply `dotnet ef` migrations to the container to verify schema correctness.

**Implementation pattern:**
```csharp
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        // Apply migrations + seed minimal data here
    }

    public async Task DisposeAsync() => await _container.DisposeAsync();
}

[CollectionDefinition("Postgres")]
public class PostgresCollection : ICollectionFixture<PostgresFixture> { }
```

All integration test classes use `[Collection("Postgres")]` to share the single container. Each test should use transactions that roll back to avoid cross-test contamination.

### 4. Test Data Management

The seed.sql is 8152 lines. Loading this for every test run is wasteful and makes tests dependent on specific row IDs that could change.

**Recommendation: Two-tier seeding strategy.**

**Tier 1 -- Structural seed (run once per container).** Apply migrations and insert minimal reference data: safehouses (needed for FK constraints), the 3 Identity test accounts, and a handful of residents/supporters (5-10 each). This is a small, hand-written SQL file or a C# seeder method. It runs in `PostgresFixture.InitializeAsync()`.

**Tier 2 -- Per-test data (created inline).** Each test creates the specific data it needs via the API or direct EF inserts, wrapped in a transaction that rolls back after the test. This ensures:
- Tests are independent and can run in any order.
- Tests document their own preconditions (you can read the test and see exactly what data exists).
- No mystery failures when someone adds a row to seed.sql that breaks an assertion about `totalCount`.

**The full seed.sql should only be used for E2E tests** where Playwright needs a populated UI. Even then, it should be loaded once into a shared test database, not per-test.

**Anti-pattern to avoid:** Tests that assert on specific counts from seed data (e.g., "totalResidents should be 247"). These break every time seed data changes. Instead, assert on relative changes: "after creating a resident, count increased by 1."

### 5. CI Performance

**Estimated timing breakdown:**

| Layer | Test count | Estimated time | Notes |
|-------|-----------|---------------|-------|
| Backend unit (EntityMapper) | 5 | 2s | Pure C#, no infra |
| Backend integration (WAF + TestContainers) | ~200 | 60-90s | Container startup ~10s, then fast |
| Frontend unit (Vitest) | ~100 | 15-20s | jsdom, no network |
| Frontend integration (Vitest + MSW) | ~60 | 20-30s | MSW intercepts are fast |
| E2E (Playwright) | ~30 | 3-5 min | Browser automation, network round-trips |
| **Total** | ~390 | **5-7 min** | |

**Parallelization strategy:**
- Backend and frontend test jobs should run as separate parallel CI jobs. They have zero dependencies on each other.
- Within backend: xUnit runs tests in parallel by default (one class per thread). The `ICollectionFixture` ensures the Postgres container is shared. No further tuning needed.
- Within frontend: Vitest runs in parallel by default. MSW handlers are per-worker so there are no shared state issues.
- Playwright: Use `workers: 4` in playwright.config.ts. Playwright's built-in sharding can split across CI matrix jobs if 5 minutes becomes a bottleneck.

**E2E gating strategy:**
- Run backend + frontend tests on every PR (fast feedback, ~2 min with parallel jobs).
- Run E2E tests on every PR but mark them as `allow-failure` / non-blocking for the first few weeks while they stabilize. Flaky E2E tests that block PRs will train developers to ignore CI.
- Once stable, make E2E required on PRs targeting `main`. On feature branches, run E2E only if files in `frontend/src/pages/` or `backend/Program.cs` changed (path-based triggering).

**CI workflow structure (GitHub Actions):**
```yaml
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      # No need -- TestContainers manages its own Docker container
    steps:
      - dotnet test backend.Tests/
      - dotnet test backend.IntegrationTests/

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - npm ci
      - npx vitest run

  e2e:
    needs: [backend-tests, frontend-tests]  # Only run if unit/integration pass
    runs-on: ubuntu-latest
    steps:
      - # Start backend + frontend
      - npx playwright test
```

### 6. Future Extensibility

**Current plan score: Good but fragile.** The directory structure mirrors the domain (residents, recordings, etc.) which is correct. However, the plan lacks conventions that guide developers.

**What is missing:**

**A. Naming convention document.** Tests should follow: `[Method]_[Scenario]_[ExpectedResult]`. The plan uses this convention already -- formalize it so new tests follow it.

**B. One-endpoint, one-test-file mapping for backend.** When a developer adds `/api/admin/partners`, they should know to create `backend.Tests/Endpoints/PartnerTests.cs`. The current structure supports this. Keep it.

**C. MSW handler registration is the weak link.** If a developer adds a new endpoint but forgets to add an MSW handler, frontend integration tests will fail with cryptic "fetch failed" errors. Mitigation: the MSW `server` setup should use `onUnhandledRequest: 'error'` so any unmocked endpoint immediately throws a clear error message identifying the missing handler.

**D. Test template/snippet.** Create a single example test file for each layer (one backend endpoint test, one frontend component test, one MSW page test) that serves as a copy-paste starting point. Developers working on a deadline will copy patterns, not read documentation.

**E. Coverage enforcement.** The plan targets 80% line coverage but does not specify how to enforce it. Add `--coverage.thresholds.lines 80` to the Vitest config and a Coverlet threshold to the backend test projects. Otherwise the target is aspirational, not enforced.

### Summary of Key Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Backend "unit" tests | Accept they are integration tests via WAF | No service layer exists to unit test |
| Database provider | TestContainers.PostgreSql, no SQLite | DateOnly, DayNumber, FK constraints |
| Test container lifecycle | ICollectionFixture, one container per run | Fast startup, shared across classes |
| Test data | Minimal structural seed + per-test inline data | Independence, readability |
| MSW organization | Domain-split handler files + factory functions | Maintainability at 52 endpoints |
| Frontend test helper | Shared `renderWithProviders` + `mockAuth` | Eliminate 15-line boilerplate per test |
| CI parallelism | 3 parallel jobs: backend, frontend, E2E | ~2 min for PR checks, ~5-7 min total |
| E2E gating | Non-blocking initially, required once stable | Avoids training devs to ignore CI |
| Unhandled requests | MSW `onUnhandledRequest: 'error'` | Catch missing handlers immediately |
| Do NOT refactor | Keep Program.cs as-is for testing scope | Scope discipline |

---

## Coverage Gap Analysis

Full audit of all 51 API endpoints in `backend/Program.cs`, all 20 frontend routes in `frontend/src/App.tsx`, and all components -- cross-referenced against every test listed in the plan above. Organized by severity.

---

### CRITICAL Severity

#### C1. Five endpoints have zero test coverage

The following endpoints exist in `Program.cs` but have **no test** in any layer of this plan:

| # | Endpoint | What it does | Risk if untested |
|---|----------|-------------|-----------------|
| 1 | `GET /api/admin/recent-donations` | Dashboard widget -- 5 most recent donations with supporter name | Widget silently shows wrong data, wrong order, or crashes on empty DB; dashboard renders with a blank/broken card |
| 2 | `GET /api/admin/donations-by-channel` | Groups supporters by acquisition channel for dashboard chart | Chart shows incorrect channel breakdown; admin makes wrong outreach decisions based on bad data |
| 3 | `GET /api/admin/allocations/by-program` | Admin-side allocation totals by program area | Reports tab shows wrong allocation data. This is a *separate* endpoint from the public `/api/impact/allocations-by-program` |
| 4 | `GET /api/admin/allocations/by-safehouse` | Allocation totals grouped by safehouse with safehouse names | Reports tab shows wrong per-safehouse financials; safehouse name join could return null |
| 5 | `GET /api/admin/residents-list` | Lightweight dropdown data (id, internalCode, caseStatus) | Every dropdown for resident selection (recording forms, visitation forms) breaks silently |

**Note:** Section 1.8 lists `ResidentsList_ReturnsLightweight` but it is grouped under "Admin Reports" without a clear mapping to the actual endpoint path `/api/admin/residents-list`. Verify this test actually targets the correct endpoint. If it does, remove item 5 from this list.

**Suggested tests to add:**
- `RecentDonations_Returns5MostRecent` -- verify ordering by date descending and limit of 5
- `RecentDonations_EmptyDb_ReturnsEmptyArray`
- `RecentDonations_IncludesSupporterName` -- verify the join to Supporters table
- `DonationsByChannel_GroupsCorrectly` -- verify grouping and count
- `DonationsByChannel_NullChannels_Excluded` -- the endpoint filters `WHERE AcquisitionChannel != null`
- `AdminAllocationsByProgram_ReturnsGrouped` -- distinct test name from the public impact test
- `AdminAllocationsBySafehouse_ReturnsGroupedWithNames` -- verify safehouse name join
- `AdminAllocationsBySafehouse_NullSafehouseId_Excluded`

#### C2. No malformed JSON / request body deserialization tests

Every `MapPost` and `MapPut` endpoint calls `ReadFromJsonAsync<T>()`. The plan tests missing fields and null bodies, but never tests:
- Truncated/invalid JSON (`{broken`)
- Wrong Content-Type header (form-encoded instead of JSON)
- Completely empty request body (0 bytes)
- Extremely large request bodies

**Risk:** A malformed request could return a raw 500 with a stack trace leaking internal file paths and framework version. In production, this is an information disclosure vulnerability.

**Suggested tests:**
- `CreateResident_MalformedJson_Returns400` -- send `{broken` as body
- `CreateResident_WrongContentType_Returns415` -- send `application/x-www-form-urlencoded`
- `CreateResident_EmptyBody_Returns400` -- send 0-byte body
- `UpdateRecording_MalformedJson_Returns400`
- `CreateDonation_MalformedJson_Returns400`
- `CreateSupporter_MalformedJson_Returns400`

#### C3. Visitation POST/PUT has no input validation (unlike all other entities)

`POST /api/admin/visitations` binds directly to the EF entity `HomeVisitation body` -- not a DTO like `RecordingRequest` or `ResidentRequest`. There is **no null check** on the body, **no FK validation** on `ResidentId`, and no validation at all.

Compare to recordings, which check `body.ResidentId > 0` and verify the resident exists in the database before inserting.

**Risk:** Creating a visitation with `ResidentId = 999999` (non-existent) succeeds and creates orphaned data, OR throws an unhandled FK constraint exception that surfaces as a raw 500 to the user. Neither outcome is acceptable.

**Suggested tests:**
- `CreateVisitation_NullBody_Returns400` -- currently will likely throw NullReferenceException (500)
- `CreateVisitation_InvalidResidentId_ReturnsBadRequestOr500` -- document and fix actual behavior
- `UpdateVisitation_NonexistentId_Returns404` -- already implied but not explicitly listed

#### C4. Authorization policy gaps -- Donor role can mutate data on some endpoints

The test plan (section 1.2) states "Donor cannot CUD" and tests generic admin CUD rejection for donors. But several endpoints use only `.RequireAuthorization()` (any authenticated role) instead of role-specific policies:

| Endpoint | Actual auth policy | Problem |
|----------|-------------------|---------|
| `PUT /api/admin/recordings/{id}` | `.RequireAuthorization()` | Any authenticated user including Donor role can update recordings |
| `PUT /api/admin/visitations/{id}` | `.RequireAuthorization()` | Any authenticated user can update visitations |
| `POST /api/admin/visitations` | `.RequireAuthorization()` | Any authenticated user can create visitations |

The RBAC tests in section 1.2 test generic categories ("AdminCUD_DonorRole_Returns403") but may not exercise these specific endpoints individually.

**Risk:** A user with only the Donor role can modify sensitive case data (recordings and visitations) if they discover the API endpoint. This is a privilege escalation vulnerability.

**Suggested tests:**
- `UpdateRecording_DonorRole_Returns403`
- `CreateVisitation_DonorRole_Returns403`
- `UpdateVisitation_DonorRole_Returns403`
- (And potentially fix the actual endpoint policies in `Program.cs` to use `RequireRole`)

---

### HIGH Severity

#### H1. No tests for ID edge cases (zero, negative, INT_MAX)

All `{id:int}` endpoints are tested with valid IDs and nonexistent IDs, but never with boundary values like 0, -1, or 2147483647.

**Risk:** `id=0` could match a default PK in some ORMs; `id=-1` could cause unexpected EF Core behavior. These are common penetration testing checks.

**Suggested tests:**
- `GetResident_ZeroId_Returns404`
- `GetResident_NegativeId_Returns404`
- `DeleteResident_ZeroId_Returns404`
- `GetRecording_NegativeId_Returns404`

#### H2. No pagination boundary tests

The residents endpoint clamps `page < 1` to 1 and `pageSize > 100` to 100, but no test verifies these clamps. The recordings endpoint has no default for `pageSize` -- passing 0 could produce unexpected results.

**Risk:** `pageSize=0` on recordings could cause a divide-by-zero, return all records (performance/memory bomb), or return empty results. `page=999999` should return empty items, not error.

**Suggested tests:**
- `ListResidents_PageSizeZero_DefaultsTo20`
- `ListResidents_PageSize101_ClampedTo100`
- `ListResidents_PageNegative_DefaultsToPage1`
- `ListResidents_PageBeyondLastPage_ReturnsEmptyItems`
- `ListRecordings_PageSizeZero_Handled` -- document behavior
- `ListRecordings_PageSizeNegative_DefaultsTo20`

#### H3. Supporters `acquisitionChannel` filter has no test

`GET /api/admin/supporters` accepts `acquisitionChannel` as a filter parameter, but the test plan (section 1.7) only covers `supporterType`, `status`, and `search`.

**Risk:** Filter is silently ignored or broken; admins cannot segment supporters by acquisition channel in the UI.

**Suggested test:**
- `ListSupporters_FilterByAcquisitionChannel_FiltersCorrectly`

#### H4. Five frontend components have no unit tests

These components exist in `frontend/src/components/` or `frontend/src/layouts/` but are absent from the test plan:

| Component | Risk if untested |
|-----------|-----------------|
| `CookiePreferencesModal.tsx` | Modal fails to open/close or save category preferences; GDPR compliance broken |
| `ChartTooltip.tsx` | All chart tooltips render incorrectly or crash on hover |
| `ApiError.tsx` | Error states across the app render blank or crash instead of showing a useful message |
| `AnalyticsLoader.tsx` | Google Analytics scripts load before consent is granted, violating the privacy policy |
| `AdminLayout.tsx` | Sidebar navigation, outlet rendering, or responsive collapse breaks -- affecting every admin page |

**Suggested tests:**
- `CookiePreferencesModal_OpensAndCloses`
- `CookiePreferencesModal_TogglesIndividualCategories`
- `CookiePreferencesModal_SavesPreferences`
- `ChartTooltip_RendersLabelAndValue`
- `ApiError_RendersErrorMessage`
- `ApiError_ShowsRetryButton` (if applicable)
- `AnalyticsLoader_NoScriptsLoaded_WithoutConsent`
- `AnalyticsLoader_LoadsGA_AfterConsent`
- `AdminLayout_RendersSidebar`
- `AdminLayout_RendersOutletContent`
- `AdminLayout_SidebarCollapsesOnMobile`

#### H5. No test for `/privacy` redirect route

`App.tsx` line 55 defines `<Navigate to="/privacy-policy" replace />` for the `/privacy` path. No test in any layer verifies this redirect.

**Risk:** External links or bookmarks pointing to `/privacy` show a blank page instead of redirecting.

**Suggested test (E2E or frontend integration):**
- `PrivacyRoute_RedirectsToPrivacyPolicy`

#### H6. No tests for recordings `sortBy` parameter

`GET /api/admin/recordings` accepts `sortBy` with values `date_asc`, `worker`, and default `date_desc`. No test in section 1.5 covers sorting.

**Risk:** Sort options in the recordings UI do nothing; recordings always display in default order regardless of user selection.

**Suggested tests:**
- `ListRecordings_SortByDateAsc_ReturnsChronological`
- `ListRecordings_SortByWorker_GroupsByWorker`
- `ListRecordings_InvalidSortBy_DefaultsToDateDesc`

---

### MEDIUM Severity

#### M1. No XSS or special character tests for search/text fields

Search endpoints use `.Contains()` which is parameterized by EF Core (safe from SQL injection), but no test verifies that special characters in search terms or text fields work correctly.

**Risk:** Users with names like "O'Brien" cannot be found via search. HTML/script injection in text fields like `NotesRestricted` or `SessionNarrative` could be stored and rendered unsanitized in the frontend.

**Suggested tests:**
- `ListResidents_SearchWithApostrophe_ReturnsResults`
- `ListResidents_SearchWithHtmlTags_NoError`
- `ListSupporters_SearchWithSpecialChars_NoError`
- `CreateResident_XssInNotes_StoredAsPlainText` -- verify `<script>alert(1)</script>` is stored verbatim
- `CreateRecording_HtmlInNarrative_StoredAsPlainText`

#### M2. No test for database-down / unreachable scenarios

The health endpoint has a try/catch for DB failures, but no test verifies the `"degraded"` response. No other endpoint is tested for DB unavailability.

**Risk:** When Supabase has downtime, every endpoint returns raw 500 errors with stack traces instead of graceful error responses.

**Suggested tests:**
- `Health_DbUnavailable_ReturnsDegradedStatus` -- mock/disable DB, assert `status: "degraded"`
- `ImpactSummary_DbError_Returns500WithJsonError` -- verify no raw HTML stack trace

#### M3. No concurrent operation tests

No test verifies behavior when two requests operate on the same record simultaneously.

**Risk:** Two social workers editing the same resident lose each other's changes (last-write-wins without detection). Deleting a resident while another user has the edit form open causes a 500 on save.

**Suggested tests:**
- `UpdateResident_ConcurrentEdits_BothSucceed` -- verify no crash, last write wins
- `DeleteResident_ThenUpdate_Returns404`

#### M4. No test for `RememberMe` flag on login

`LoginRequest` has a `RememberMe` boolean passed to `PasswordSignInAsync`, but no test verifies it actually affects session persistence.

**Risk:** "Remember me" checkbox in the login form is non-functional; sessions always expire after 8 hours regardless.

**Suggested tests:**
- `Login_RememberMeTrue_ExtendsCookieExpiration`
- `Login_RememberMeFalse_SessionCookieOnly`

#### M5. Incomplete cascading delete tests

Integration tests cover `Donations_CascadeDelete_Allocations`, but no test covers what happens when deleting:
- A resident that has recordings, visitations, education records, health records, incident reports, and intervention plans
- A supporter that has donations (which in turn have allocations)

**Risk:** Delete returns a raw 500 FK constraint error to the user, or cascading deletes destroy more associated data than intended.

**Suggested tests:**
- `DeleteResident_WithRecordings_DocumentBehavior` -- assert cascade or FK block
- `DeleteResident_WithVisitations_DocumentBehavior`
- `DeleteResident_WithEducationRecords_DocumentBehavior`
- `DeleteSupporter_WithDonations_DocumentBehavior`

#### M6. No test for Suspense fallback during lazy loading

Admin pages are wrapped in `<Suspense fallback={<div>Loading...</div>}>`. No test verifies the loading state renders during chunk download.

**Risk:** Users on slow connections see a blank white screen while admin page chunks download.

**Suggested test:**
- `AdminRoute_ShowsLoadingFallback_DuringChunkLoad`

#### M7. No test for DonationFormPage supporter pre-selection

Routes `donations/new` and `donations/:id/edit` exist but no test verifies that the form pre-selects a supporter when navigated from a supporter detail page.

**Risk:** "Log Donation" button from a supporter's profile opens a blank donation form with no supporter selected, forcing manual re-selection.

**Suggested tests:**
- `DonationForm_PreSelectsSupporter_FromQueryParam`
- `DonationForm_EditMode_LoadsExistingDonation`

---

### LOW Severity

#### L1. No test for `formatAmount` with edge-case numbers

Utility tests cover valid numbers and null but not 0, negative values, or very large numbers.

**Suggested tests:**
- `formatAmount_Zero_ReturnsCurrencyZero`
- `formatAmount_Negative_FormatsWithMinusSign`
- `formatAmount_VeryLargeNumber_FormatsCorrectly` -- e.g., 999999999.99

#### L2. No test for cache-control headers on auth endpoints

Middleware at lines 114-122 of Program.cs sets `Cache-Control: no-store, no-cache, must-revalidate` and `Pragma: no-cache` on all `/api/auth/*` paths. No test in section 2.3 covers this.

**Risk:** Browser caches login/logout/me responses; pressing the back button after logout reveals the previous user's session data.

**Suggested tests:**
- `AuthEndpoints_HaveCacheControlNoStore`
- `AuthEndpoints_HavePragmaNoCache`

#### L3. No E2E test for admin dashboard widgets

E2E tests (section 5.3) cover CRUD flows and report tabs but do not verify the dashboard's recent-donations table or donations-by-channel chart render with actual data.

**Suggested tests:**
- `AdminDashboard_RecentDonationsWidget_ShowsData`
- `AdminDashboard_DonationsByChannelChart_Renders`

#### L4. No test for unknown/catch-all routes (404 handling)

Neither frontend nor E2E tests verify what happens when navigating to `/nonexistent-page` or `/admin/nonexistent-page`. The `App.tsx` routes have no catch-all `<Route path="*">`.

**Risk:** Users who mistype a URL see a completely blank page with no navigation, unable to get back to the app.

**Suggested tests:**
- `UnknownPublicRoute_ShowsNotFoundOrRedirects`
- `UnknownAdminRoute_ShowsNotFoundOrRedirects`

#### L5. No test for cookie security attributes

Integration tests verify the auth cookie is set and cleared, but do not inspect the `HttpOnly`, `SameSite=Lax`, and `Secure` flags configured in `Program.cs` lines 33-38.

**Risk:** If these attributes are accidentally removed in a future change, the cookie becomes vulnerable to XSS theft (no HttpOnly) or CSRF (wrong SameSite).

**Suggested tests:**
- `AuthCookie_HasHttpOnlyFlag`
- `AuthCookie_HasSameSiteLax`
- `AuthCookie_HasSecureFlag_InProduction`

#### L6. No test for supporter search across all 5 fields

The test plan lists `ListSupporters_Search` as a single test, but the endpoint searches across `displayName`, `firstName`, `lastName`, `organizationName`, and `email`. One test may only cover one search field.

**Suggested tests:**
- `ListSupporters_SearchByFirstName_Matches`
- `ListSupporters_SearchByOrganizationName_Matches`
- `ListSupporters_SearchByEmail_Matches`

---

### Gap Analysis Summary

| Severity | Gap count | New tests to add |
|----------|-----------|-----------------|
| Critical | 4 gaps | ~20 tests |
| High | 6 gaps | ~20 tests |
| Medium | 7 gaps | ~16 tests |
| Low | 6 gaps | ~13 tests |
| **Total** | **23 gaps** | **~69 tests** |

Addressing all gaps would bring the test target from ~390 to ~459 and significantly reduce risk of regressions in endpoint correctness, authorization enforcement, input validation, error handling, and frontend reliability.

---

## Final Review Verdict

**Reviewer:** Claude Opus 4.6 (1M context) — Full codebase cross-reference performed against `backend/Program.cs` (1718 lines, 51 endpoints), `frontend/src/App.tsx` (20 routes), all components, hooks, contexts, utils, models, and CI configuration.

### Are the 23 identified gaps comprehensive enough?

**Yes, with five minor additions noted below.** The gap analysis is thorough and correctly identifies the most consequential omissions. The critical findings (C1-C4) are real -- I verified each one against the actual source. A few small items the reviewers missed:

**Additional Gap G1: `domain.ts` constants are richer than the test plan assumes.**
The plan (section 3.2) lists 5 constant tests covering CASE_STATUSES, RISK_LEVELS, SUPPORTER_TYPES, DONATION_TYPES, and VISIT_TYPES. But `frontend/src/domain.ts` actually exports 9 constant arrays: the 5 listed plus SUPPORTER_STATUSES, COOPERATION_LEVELS, SESSION_TYPES, REINTEGRATION_TYPES, REINTEGRATION_STATUSES, and ACQUISITION_CHANNELS. Four of these are missing test coverage. Severity: LOW -- these are static arrays unlikely to break, but snapshot-testing them guards against accidental deletion.

**Additional Gap G2: `useConsentGate` and `useConsentScript` hooks have no tests.**
The plan covers `useApiFetch` (section 3.8) but misses these two custom hooks. `useConsentScript` is the mechanism that injects/removes analytics scripts based on consent. It is the functional core of GDPR compliance. If it breaks, analytics load without consent or never load at all. Severity: MEDIUM -- directly relates to cookie consent rubric points.

Suggested tests:
- `useConsentGate_ReturnsFalse_WhenNoConsent`
- `useConsentGate_ReturnsTrue_WhenConsentGiven`
- `useConsentScript_InjectsScript_WhenAllowed`
- `useConsentScript_RemovesScript_WhenRevoked`
- `useConsentScript_DeletesAnalyticsCookies_WhenRevoked`

**Additional Gap G3: `deleteAnalyticsCookies` in `cookies.ts` has no test.**
The plan (section 3.1) tests `setCookie`, `getCookie`, and `deleteCookie`, but `deleteAnalyticsCookies()` -- which handles the `_ga`/`_gid`/`_gat` wildcard cleanup -- is untested. This is the function that actually purges tracking cookies when consent is revoked. Severity: MEDIUM.

Suggested tests:
- `deleteAnalyticsCookies_RemovesGaCookies`
- `deleteAnalyticsCookies_IgnoresNonAnalyticsCookies`

**Additional Gap G4: `apiFetch` dispatches `auth:unauthorized` event on 401 -- untested.**
The plan (section 3.3) tests that `apiFetch` throws on 404 and 500, but the 401 path is special: it dispatches `window.dispatchEvent(new Event('auth:unauthorized'))` which `AuthContext` listens for to auto-logout the user. No test verifies this event dispatch or that `AuthContext` handles it. Severity: MEDIUM -- a silent auto-logout regression would leave users staring at broken admin pages after session expiry.

Suggested tests:
- `apiFetch_401_DispatchesUnauthorizedEvent`
- `AuthContext_LogsOutOnUnauthorizedEvent`

**Additional Gap G5: `useReveal` hook (IntersectionObserver animation) has no test.**
Severity: LOW -- cosmetic scroll-reveal animation. Unlikely to affect grading but included for completeness.

### Do the architecture recommendations conflict with each other?

**No.** The six architecture recommendations are internally consistent:
- "Accept backend tests are integration tests" (Rec 1) aligns with "Use TestContainers unconditionally" (Rec 3) and "Share via ICollectionFixture" (Rec 3).
- "Do NOT refactor Program.cs" (Rec 1) aligns with the test count estimates (Rec 5).
- The MSW handler organization (Rec 2) and test data factory pattern (Rec 4) are complementary approaches to the same problem (test data management) on different sides of the stack.
- The CI parallelization strategy (Rec 5) correctly separates backend and frontend as independent jobs, which is consistent with everything else.

One minor clarification: Recommendation 4 says "the full seed.sql should only be used for E2E tests" while Recommendation 3's `PostgresFixture.InitializeAsync()` says "apply migrations + seed minimal data here." These are not contradictory -- they describe two different seeding tiers -- but the implementer should be warned explicitly that the E2E Playwright tests need their own database setup step that loads seed.sql, separate from the backend integration test container.

### Is ~459 tests realistic for the codebase size?

**Yes.** The codebase has 51 API endpoints, 20 frontend routes, 14 components, 4 contexts/hooks, and 3 utility modules. At roughly 9 tests per endpoint and 5 tests per page/component, ~459 is a reasonable density for a course project aiming at 80% coverage. The ratio breaks down to:
- Backend: ~200 tests / 51 endpoints = ~4 tests per endpoint (reasonable for CRUD + auth + edge cases)
- Frontend: ~160 tests / 20 pages + 14 components = ~5 tests per UI unit (reasonable)
- E2E: ~30 tests covering critical user flows (appropriate -- more would be slow)
- Gap tests: ~69 additional = ~15% increase, well within scope

The main risk is not the count but the time to write them. At ~15 minutes per test (including setup code), this is roughly 115 hours of work. For a team of 4-5 students, that is 23-29 hours each -- tight but achievable if they use the recommended helper utilities and factory patterns.

### Infrastructure/tooling issues not addressed

The plan identifies the right packages and CI structure but misses several practical setup steps:

1. **No `vitest.config.ts` or `playwright.config.ts` exists yet.** The plan lists them in the directory structure but provides no content. The implementer needs concrete configuration, especially for: `vitest` setup file path (to initialize MSW `server.listen()`), jsdom environment, coverage thresholds, and path aliases matching `vite.config.ts`.

2. **No `test` script in `package.json`.** Currently `package.json` has `dev`, `build`, `lint`, `preview` -- no `test` or `test:e2e` scripts. These must be added.

3. **Playwright browser installation.** CI needs `npx playwright install --with-deps chromium` before running E2E tests. This is not mentioned anywhere in the plan. Without it, the E2E job will fail immediately.

4. **Docker required for TestContainers in CI.** GitHub Actions `ubuntu-latest` has Docker pre-installed, so this works. But if any team member runs tests locally on macOS, they need Docker Desktop running. The plan should note this prerequisite.

5. **No backend test project exists yet.** There is no `backend.Tests/` or `backend.IntegrationTests/` directory. These need `dotnet new xunit` scaffolding, a project reference to `backend.csproj`, and the NuGet packages listed in the plan.

6. **CI workflow does not run tests.** The only existing workflow (`deploy-backend.yml`) just builds and deploys -- no test step. A new `test.yml` workflow file must be created from scratch.

7. **No `.env.test` or test environment configuration.** E2E tests need `VITE_API_URL` pointing to the local backend. The plan does not specify how to configure this for Playwright runs.

These are all straightforward to resolve but represent real blockers that would stop a developer from running tests on day one.

### Critical security tests still missing?

The gap analysis already covers the most important ones (RBAC holes in C4, malformed input in C2, cookie security in L5). After reviewing the full `Program.cs`, I found one additional concern:

**Rate limiting on login endpoint.** The lockout mechanism (5 attempts / 15 minutes) is tested, but there is no rate limiting middleware on the `/api/auth/login` endpoint itself. An attacker could enumerate valid email addresses by observing response time differences (locked vs. non-existent accounts). The plan does test `Login_NonexistentUser_Returns401` and `Login_LockedOutAccount_Returns423` -- these return different status codes, which is an enumeration vector. This is an application design issue more than a testing gap, but a test documenting the behavior would be valuable:
- `Login_LockedOut_SameResponseTimeAs_NonexistentUser` (timing attack mitigation)

This is a LOW priority item for a course project but worth noting.

### Conclusion

**The plan is ready for implementation.** The original 390-test plan plus the 23-gap analysis covers the vast majority of the codebase. The five additional gaps identified above add approximately 12 more tests (bringing the total to ~471), none of which are blockers.

The highest-priority action items before writing any tests are:
1. Create `backend.Tests/` and `backend.IntegrationTests/` projects with correct package references
2. Add `vitest.config.ts` with jsdom, setup file, and coverage thresholds
3. Add `playwright.config.ts` with base URL, browser, and worker configuration
4. Add `"test"` and `"test:e2e"` scripts to `frontend/package.json`
5. Create `.github/workflows/test.yml` CI workflow
6. Install Docker Desktop on all team member machines (for TestContainers)

Once infrastructure is in place, implement tests in priority order: Critical gaps first, then the original plan layers bottom-up (backend unit -> backend integration -> frontend unit -> frontend integration -> E2E).

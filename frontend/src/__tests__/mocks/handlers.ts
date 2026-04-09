import { http, HttpResponse } from 'msw';
import {
  mockUser,
  mockImpactSummary,
  mockDonationsByMonth,
  mockAllocationsByProgram,
  mockMetrics,
  mockRecentDonations,
  mockActiveResidentsTrend,
  mockFlaggedCasesTrend,
  mockDonationsByChannel,
  mockPagedResidents,
  mockFilterOptions,
  mockPagedSupporters,
  mockPagedDonations,
  mockRecordings,
  mockVisitations,
  mockConferences,
  mockResidentDetail,
  mockVisitationDetail,
  mockRecordingDetail,
  mockSupporterDetail,
  mockHealthTrends,
  mockEducationTrends,
  mockDonationsBySource,
  mockDonationsByCampaign,
  mockOutcomes,
  mockSafehouseComparison,
} from './data';

const API = 'http://localhost:5001';

/* ── Auth handlers ──────────────────────────────────────── */
export const authHandlers = [
  http.get(`${API}/api/auth/me`, () =>
    HttpResponse.json({ isAuthenticated: true, ...mockUser }),
  ),

  http.post(`${API}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'admin@beaconofhope.org' && body.password === 'ValidPassword1!') {
      return HttpResponse.json(mockUser);
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API}/api/auth/logout`, () =>
    HttpResponse.json({ message: 'Logged out' }),
  ),
];

/* ── Public / Impact handlers ───────────────────────────── */
export const publicHandlers = [
  http.get(`${API}/api/health`, () =>
    HttpResponse.json({ status: 'Healthy', database: 'Connected' }),
  ),

  http.get(`${API}/api/impact/summary`, () =>
    HttpResponse.json(mockImpactSummary),
  ),

  http.get(`${API}/api/impact/donations-by-month`, () =>
    HttpResponse.json(mockDonationsByMonth),
  ),

  http.get(`${API}/api/impact/allocations-by-program`, () =>
    HttpResponse.json(mockAllocationsByProgram),
  ),

  http.get(`${API}/api/impact/education-trends`, () =>
    HttpResponse.json(mockEducationTrends),
  ),

  http.get(`${API}/api/impact/health-trends`, () =>
    HttpResponse.json(mockHealthTrends),
  ),

  http.get(`${API}/api/impact/safehouses`, () =>
    HttpResponse.json(mockSafehouseComparison),
  ),
];

/* ── Admin handlers ─────────────────────────────────────── */
export const adminHandlers = [
  http.get(`${API}/api/admin/metrics`, () =>
    HttpResponse.json(mockMetrics),
  ),

  http.get(`${API}/api/admin/residents`, () =>
    HttpResponse.json(mockPagedResidents),
  ),

  // Also handle the dashboard endpoint that returns array directly
  http.get(`${API}/api/admin/residents/filter-options`, () =>
    HttpResponse.json(mockFilterOptions),
  ),

  http.get(`${API}/api/admin/residents/:id`, () =>
    HttpResponse.json(mockResidentDetail),
  ),

  http.post(`${API}/api/admin/residents`, () =>
    HttpResponse.json(mockResidentDetail),
  ),

  http.put(`${API}/api/admin/residents/:id`, () =>
    HttpResponse.json(mockResidentDetail),
  ),

  http.delete(`${API}/api/admin/residents/:id`, () =>
    HttpResponse.json({ message: 'Deleted' }),
  ),

  http.get(`${API}/api/admin/recent-donations`, () =>
    HttpResponse.json(mockRecentDonations),
  ),

  http.get(`${API}/api/admin/active-residents-trend`, () =>
    HttpResponse.json(mockActiveResidentsTrend),
  ),

  http.get(`${API}/api/admin/flagged-cases-trend`, () =>
    HttpResponse.json(mockFlaggedCasesTrend),
  ),

  http.get(`${API}/api/admin/donations-by-channel`, () =>
    HttpResponse.json(mockDonationsByChannel),
  ),

  http.get(`${API}/api/admin/supporters`, () =>
    HttpResponse.json(mockPagedSupporters),
  ),

  http.get(`${API}/api/admin/supporters/:id`, () =>
    HttpResponse.json({
      supporter: mockSupporterDetail,
      donations: mockPagedDonations.items,
    }),
  ),

  http.get(`${API}/api/admin/supporters/:id/donations`, () =>
    HttpResponse.json(mockPagedDonations.items),
  ),

  http.post(`${API}/api/admin/supporters`, () =>
    HttpResponse.json(mockSupporterDetail),
  ),

  http.put(`${API}/api/admin/supporters/:id`, () =>
    HttpResponse.json(mockSupporterDetail),
  ),

  http.delete(`${API}/api/admin/supporters/:id`, () =>
    HttpResponse.json({ message: 'Deleted' }),
  ),

  http.get(`${API}/api/admin/donations`, () =>
    HttpResponse.json(mockPagedDonations),
  ),

  http.get(`${API}/api/admin/donations/:id`, () =>
    HttpResponse.json(mockPagedDonations.items[0]),
  ),

  http.post(`${API}/api/admin/donations`, () =>
    HttpResponse.json(mockPagedDonations.items[0]),
  ),

  http.put(`${API}/api/admin/donations/:id`, () =>
    HttpResponse.json(mockPagedDonations.items[0]),
  ),

  http.get(`${API}/api/admin/recordings`, () =>
    HttpResponse.json(mockRecordings),
  ),

  http.get(`${API}/api/admin/recordings/:id`, () =>
    HttpResponse.json(mockRecordingDetail),
  ),

  http.post(`${API}/api/admin/recordings`, () =>
    HttpResponse.json(mockRecordingDetail),
  ),

  http.put(`${API}/api/admin/recordings/:id`, () =>
    HttpResponse.json(mockRecordingDetail),
  ),

  http.delete(`${API}/api/admin/recordings/:id`, () =>
    HttpResponse.json({ message: 'Deleted' }),
  ),

  http.get(`${API}/api/admin/visitations`, () =>
    HttpResponse.json(mockVisitations),
  ),

  http.get(`${API}/api/admin/visitations/:id`, () =>
    HttpResponse.json(mockVisitationDetail),
  ),

  http.post(`${API}/api/admin/visitations`, () =>
    HttpResponse.json(mockVisitationDetail),
  ),

  http.put(`${API}/api/admin/visitations/:id`, () =>
    HttpResponse.json(mockVisitationDetail),
  ),

  http.delete(`${API}/api/admin/visitations/:id`, () =>
    HttpResponse.json({ message: 'Deleted' }),
  ),

  http.get(`${API}/api/admin/conferences`, () =>
    HttpResponse.json(mockConferences),
  ),

  http.get(`${API}/api/admin/reports/donations-by-source`, () =>
    HttpResponse.json(mockDonationsBySource),
  ),

  http.get(`${API}/api/admin/reports/donations-by-campaign`, () =>
    HttpResponse.json(mockDonationsByCampaign),
  ),

  http.get(`${API}/api/admin/reports/resident-outcomes`, () =>
    HttpResponse.json(mockOutcomes),
  ),

  http.get(`${API}/api/admin/reports/safehouse-comparison`, () =>
    HttpResponse.json(mockSafehouseComparison),
  ),
];

/* ── New Phase 1-4 handlers ─────────────────────────────── */
export const newFeatureHandlers = [
  http.get(`${API}/api/staff/tasks`, () =>
    HttpResponse.json([]),
  ),
  http.post(`${API}/api/staff/tasks`, () =>
    HttpResponse.json({ staffTaskId: 1 }),
  ),
  http.put(`${API}/api/staff/tasks/:id`, () =>
    HttpResponse.json({ updated: true }),
  ),
  http.get(`${API}/api/staff/calendar`, () =>
    HttpResponse.json([]),
  ),
  http.post(`${API}/api/staff/calendar`, () =>
    HttpResponse.json({ calendarEventId: 1 }),
  ),
  http.put(`${API}/api/staff/calendar/:id`, () =>
    HttpResponse.json({ updated: true }),
  ),
  http.delete(`${API}/api/staff/calendar/:id`, () =>
    HttpResponse.json({ cancelled: true }),
  ),
  http.get(`${API}/api/admin/incidents`, () =>
    HttpResponse.json({ total: 2, page: 1, pageSize: 20, items: [
      { incidentId: 1, residentId: 1, residentCode: 'LS-0001', incidentDate: '2026-04-08', incidentType: 'Behavioral', severity: 'Medium', resolved: false, followUpRequired: true },
      { incidentId: 2, residentId: 2, residentCode: 'LS-0002', incidentDate: '2026-04-07', incidentType: 'Security', severity: 'High', resolved: true, followUpRequired: false },
    ]}),
  ),
  http.get(`${API}/api/admin/incidents/:id`, () =>
    HttpResponse.json({ incidentId: 1, residentId: 1, residentCode: 'LS-0001', incidentDate: '2026-04-08', incidentType: 'Behavioral', severity: 'Medium', description: 'Test incident', resolved: false, followUpRequired: true }),
  ),
  http.post(`${API}/api/admin/incidents`, () =>
    HttpResponse.json({ incidentId: 99 }),
  ),
  http.put(`${API}/api/admin/incidents/:id`, () =>
    HttpResponse.json({ updated: true }),
  ),
  http.delete(`${API}/api/admin/incidents/:id`, () =>
    HttpResponse.json({ deleted: true }),
  ),
  http.get(`${API}/api/admin/education-records`, () =>
    HttpResponse.json([]),
  ),
  http.post(`${API}/api/admin/education-records`, () =>
    HttpResponse.json({ educationRecordId: 1 }),
  ),
  http.get(`${API}/api/admin/health-records`, () =>
    HttpResponse.json([]),
  ),
  http.post(`${API}/api/admin/health-records`, () =>
    HttpResponse.json({ healthRecordId: 1 }),
  ),
  http.get(`${API}/api/admin/intervention-plans`, () =>
    HttpResponse.json([
      { planId: 1, residentId: 1, residentCode: 'LS-0001', planCategory: 'Education', planDescription: 'Test plan', status: 'Open', caseConferenceDate: '2026-04-15' },
    ]),
  ),
  http.get(`${API}/api/admin/post-placement`, () =>
    HttpResponse.json([
      { residentId: 1, internalCode: 'LS-0001', reintegrationType: 'Family Reunification', caseStatus: 'Closed', totalVisits: 3 },
    ]),
  ),
  http.get(`${API}/api/admin/post-placement/summary`, () =>
    HttpResponse.json({ total: 5, byType: [{ type: 'Family Reunification', count: 3 }], byStatus: [{ status: 'Closed', count: 5 }] }),
  ),
  http.get(`${API}/api/admin/residents/unclaimed`, () =>
    HttpResponse.json([]),
  ),
  http.get(`${API}/api/admin/residents-list`, () =>
    HttpResponse.json([
      { residentId: 1, internalCode: 'LS-0001', caseStatus: 'Active' },
      { residentId: 2, internalCode: 'LS-0002', caseStatus: 'Active' },
    ]),
  ),
  http.get(`${API}/api/ml/predictions/:entityType/:entityId`, () =>
    HttpResponse.json([
      { id: 1, modelName: 'incident-early-warning-selfharm', score: 31, scoreLabel: 'Medium', predictedAt: '2026-04-08' },
      { id: 2, modelName: 'incident-early-warning-runaway', score: 27, scoreLabel: 'Medium', predictedAt: '2026-04-08' },
      { id: 3, modelName: 'reintegration-readiness', score: 3, scoreLabel: 'Not Ready', predictedAt: '2026-04-08' },
    ]),
  ),
  http.get(`${API}/api/admin/recordings/emotional-trends`, () =>
    HttpResponse.json([
      { sessionDate: '2026-01-01', emotionalStateObserved: 'Angry', emotionalStateEnd: 'Hopeful' },
      { sessionDate: '2026-02-01', emotionalStateObserved: 'Sad', emotionalStateEnd: 'Calm' },
    ]),
  ),
  http.get(`${API}/api/admin/users`, () =>
    HttpResponse.json([
      { id: '1', email: 'admin@beaconofhope.org', firstName: 'Director', lastName: 'Reyes', roles: ['Admin'], safehouses: [] },
      { id: '2', email: 'staff@beaconofhope.org', firstName: 'Elena', lastName: 'Reyes', roles: ['Staff'], safehouses: [] },
    ]),
  ),
];

// ── Deepened report endpoints ────────────
export const deepReportHandlers = [
  http.get(`${API}/api/impact/education-summary`, () =>
    HttpResponse.json({
      enrollmentBreakdown: [{ status: 'Enrolled', count: 30 }, { status: 'Not Enrolled', count: 5 }],
      completionBreakdown: [{ status: 'Completed', count: 20 }, { status: 'In Progress', count: 15 }],
    }),
  ),
  http.get(`${API}/api/admin/reports/safehouse-trends`, () =>
    HttpResponse.json([
      { safehouseCode: 'SH-001', year: 2025, month: 10, incidents: 3 },
      { safehouseCode: 'SH-001', year: 2025, month: 11, incidents: 2 },
      { safehouseCode: 'SH-002', year: 2025, month: 10, incidents: 1 },
      { safehouseCode: 'SH-002', year: 2025, month: 11, incidents: 4 },
    ]),
  ),
];

// ── AAR Report ──────────────────────────
export const aarHandlers = [
  http.get(`${API}/api/admin/reports/aar-summary`, () =>
    HttpResponse.json({
      categories: [
        { category: 'Caring', serviceCount: 150, beneficiaryCount: 45, services: [{ service: 'Health & Wellbeing Records', count: 100, beneficiaries: 40 }, { service: 'Intervention Plans', count: 50, beneficiaries: 30 }] },
        { category: 'Healing', serviceCount: 200, beneficiaryCount: 52, services: [{ service: 'Counseling Sessions', count: 200, beneficiaries: 52 }] },
        { category: 'Teaching', serviceCount: 180, beneficiaryCount: 48, services: [{ service: 'Education Records', count: 180, beneficiaries: 48 }] },
      ],
      totalBeneficiaries: 62,
    }),
  ),
];

// ── Intervention plans / conferences ─────
export const conferenceHandlers = [
  http.get(`${API}/api/admin/intervention-plans`, () =>
    HttpResponse.json([
      { planId: 1, residentId: 1, residentCode: 'R-001', planCategory: 'Rehabilitation', planDescription: 'Quarterly review', status: 'Open', caseConferenceDate: '2026-05-01', targetDate: null, targetValue: null, servicesProvided: null },
      { planId: 2, residentId: 2, residentCode: 'R-002', planCategory: 'Education', planDescription: 'School enrollment', status: 'Achieved', caseConferenceDate: '2026-01-15', targetDate: null, targetValue: null, servicesProvided: null },
    ]),
  ),
  http.post(`${API}/api/admin/intervention-plans`, () =>
    HttpResponse.json({ planId: 99 }),
  ),
  http.get(`${API}/api/admin/residents-list`, () =>
    HttpResponse.json([
      { residentId: 1, internalCode: 'R-001', caseStatus: 'Active' },
      { residentId: 2, internalCode: 'R-002', caseStatus: 'Active' },
    ]),
  ),
];

export const handlers = [...authHandlers, ...publicHandlers, ...adminHandlers, ...newFeatureHandlers, ...conferenceHandlers, ...deepReportHandlers, ...aarHandlers];

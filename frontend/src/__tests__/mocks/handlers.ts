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

const API = 'http://localhost:5000';

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

export const handlers = [...authHandlers, ...publicHandlers, ...adminHandlers];

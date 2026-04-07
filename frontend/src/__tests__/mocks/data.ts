/* ── Mock data used across MSW handlers and tests ────────── */

export const mockUser = {
  email: 'admin@beaconofhope.org',
  firstName: 'Jane',
  lastName: 'Doe',
  roles: ['Admin'],
};

export const mockStaffUser = {
  email: 'staff@beaconofhope.org',
  firstName: 'John',
  lastName: 'Smith',
  roles: ['Staff'],
};

export const mockImpactSummary = {
  totalResidents: 124,
  activeSafehouses: 5,
  totalDonations: 4500000,
  reintegrationRate: 78,
};

export const mockDonationsByMonth = [
  { year: 2025, month: 10, total: 12000 },
  { year: 2025, month: 11, total: 14000 },
  { year: 2025, month: 12, total: 11000 },
];

export const mockAllocationsByProgram = [
  { area: 'Education', amount: 45000 },
  { area: 'Health', amount: 38000 },
  { area: 'Counseling', amount: 32000 },
];

export const mockMetrics = {
  activeResidents: 42,
  openIncidents: 7,
  criticalIncidents: 2,
  highIncidents: 3,
  monthlyDonations: 14200,
  monthlyDonationCount: 18,
  donationChange: 10.7,
  upcomingConferences: 3,
  nextConference: '2026-04-15',
};

export const mockResidents = [
  {
    internalCode: 'LS-0001',
    safehouse: 'Safe Haven Luzon',
    caseCategory: 'Trafficking',
    currentRiskLevel: 'Critical',
    dateOfAdmission: '2024-01-15',
    assignedSocialWorker: 'Maria Cruz',
    lastSession: '2026-04-01',
  },
];

export const mockRecentDonations = [
  {
    supporter: 'John Patron',
    donationType: 'Monetary',
    amount: 5000,
    estimatedValue: null,
    donationDate: '2026-04-01',
    campaignName: 'Spring Drive',
  },
];

export const mockActiveResidentsTrend = [
  { year: 2025, month: 10, count: 38 },
  { year: 2025, month: 11, count: 40 },
  { year: 2025, month: 12, count: 42 },
];

export const mockFlaggedCasesTrend = [
  { year: 2025, month: 10, count: 5 },
  { year: 2025, month: 11, count: 6 },
  { year: 2025, month: 12, count: 7 },
];

export const mockDonationsByChannel = [
  { channel: 'Online', count: 25000 },
  { channel: 'Event', count: 15000 },
];

export const mockPagedResidents = {
  items: [
    {
      residentId: 1,
      internalCode: 'LS-0001',
      caseControlNo: 'CC-001',
      safehouseId: 1,
      safehouse: 'Safe Haven Luzon',
      caseStatus: 'Active',
      caseCategory: 'Trafficking',
      currentRiskLevel: 'Critical',
      dateOfAdmission: '2024-01-15',
      assignedSocialWorker: 'Maria Cruz',
      sex: 'Female',
      presentAge: '14',
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 20,
};

export const mockFilterOptions = {
  caseStatuses: ['Active', 'Closed', 'Discharged'],
  safehouses: [{ safehouseId: 1, label: 'Safe Haven Luzon' }],
  categories: ['Trafficking', 'Neglect'],
  riskLevels: ['Critical', 'High', 'Medium', 'Low'],
  socialWorkers: ['Maria Cruz'],
};

export const mockPagedSupporters = {
  items: [
    {
      supporterId: 1,
      supporterType: 'MonetaryDonor',
      displayName: 'John Patron',
      organizationName: null,
      firstName: 'John',
      lastName: 'Patron',
      email: 'john@example.com',
      phone: '+1234567890',
      region: 'Hagatna',
      country: 'Guam',
      status: 'Active',
      acquisitionChannel: 'Direct',
      totalDonated: 50000,
      lastDonationDate: '2026-04-01',
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 20,
};

export const mockPagedDonations = {
  items: [
    {
      donationId: 1,
      supporterId: 1,
      supporterName: 'John Patron',
      donationType: 'Monetary',
      donationDate: '2026-04-01',
      amount: 5000,
      estimatedValue: null,
      currencyCode: 'PHP',
      impactUnit: null,
      isRecurring: false,
      campaignName: 'Spring Drive',
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 20,
};

export const mockRecordings = {
  items: [
    {
      recordingId: 1,
      residentId: 1,
      residentCode: 'LS-0001',
      sessionDate: '2026-04-01',
      socialWorker: 'Maria Cruz',
      sessionType: 'Individual',
      sessionDurationMinutes: 60,
      emotionalStateObserved: 'Coping',
      emotionalStateEnd: 'Stable',
      narrativePreview: 'Session went well with notable progress.',
      progressNoted: true,
      concernsFlagged: false,
      referralMade: false,
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 15,
};

export const mockVisitations = {
  items: [
    {
      visitationId: 1,
      residentId: 1,
      residentCode: 'LS-0001',
      visitDate: '2026-04-01',
      socialWorker: 'Maria Cruz',
      visitType: 'Routine Follow-Up',
      locationVisited: 'Family home',
      safetyConcernsNoted: false,
      followUpNeeded: true,
      visitOutcome: 'Positive',
      familyCooperationLevel: 'Cooperative',
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 15,
};

export const mockConferences = {
  upcoming: [
    {
      planId: 1,
      residentId: 1,
      residentCode: 'LS-0001',
      planCategory: 'Reintegration',
      planDescription: 'Family reunification review',
      caseConferenceDate: '2026-04-15',
      status: 'Scheduled',
    },
  ],
  past: [],
};

export const mockResidentDetail = {
  residentId: 1,
  caseControlNo: 'CC-001',
  internalCode: 'LS-0001',
  safehouseId: 1,
  safehouse: 'Safe Haven Luzon',
  caseStatus: 'Active',
  sex: 'Female',
  dateOfBirth: '2010-03-15',
  birthStatus: null,
  placeOfBirth: 'Manila',
  religion: 'Catholic',
  caseCategory: 'Trafficking',
  currentRiskLevel: 'Critical',
  dateOfAdmission: '2024-01-15',
  assignedSocialWorker: 'Maria Cruz',
};

export const mockVisitationDetail = {
  visitationId: 1,
  residentId: 1,
  residentCode: 'LS-0001',
  visitDate: '2026-04-01',
  socialWorker: 'Maria Cruz',
  visitType: 'Routine Follow-Up',
  locationVisited: 'Family home',
  familyMembersPresent: 'Mother, Aunt',
  purpose: 'Routine check',
  observations: 'Good progress',
  familyCooperationLevel: 'Cooperative',
  safetyConcernsNoted: false,
  followUpNeeded: true,
  followUpNotes: 'Schedule next visit',
  visitOutcome: 'Positive',
};

export const mockRecordingDetail = {
  recordingId: 1,
  residentId: 1,
  residentCode: 'LS-0001',
  sessionDate: '2026-04-01',
  socialWorker: 'Maria Cruz',
  sessionType: 'Individual',
  sessionDurationMinutes: 60,
  emotionalStateObserved: 'Coping',
  emotionalStateEnd: 'Stable',
  sessionNarrative: 'Full session narrative here.',
  interventionsApplied: 'CBT techniques',
  followUpActions: 'Continue weekly sessions',
  progressNoted: true,
  concernsFlagged: false,
  referralMade: false,
  notesRestricted: null,
};

export const mockSupporterDetail = {
  supporterId: 1,
  supporterType: 'MonetaryDonor',
  displayName: 'John Patron',
  organizationName: null,
  firstName: 'John',
  lastName: 'Patron',
  relationshipType: null,
  email: 'john@example.com',
  phone: '+1234567890',
  region: 'Hagatna',
  country: 'Guam',
  status: 'Active',
  acquisitionChannel: 'Direct',
  firstDonationDate: '2025-01-01',
  createdAt: '2025-01-01',
  totalDonated: 50000,
};

export const mockSummaryData = {
  totalResidents: 124,
  activeResidents: 42,
  activeSafehouses: 5,
  totalDonations: 4500000,
  completedReintegrations: 97,
  reintegrationRate: 78,
};

export const mockHealthTrends = [
  { year: 2025, month: 11, avgHealth: 85, avgNutrition: 80, avgSleep: 75, avgEnergy: 70 },
  { year: 2025, month: 12, avgHealth: 87, avgNutrition: 82, avgSleep: 78, avgEnergy: 73 },
];

export const mockEducationTrends = [
  { year: 2025, month: 11, avgProgress: 78 },
  { year: 2025, month: 12, avgProgress: 81 },
];

export const mockDonationsBySource = [
  { source: 'Online', total: 120000, count: 45 },
  { source: 'Event', total: 80000, count: 20 },
];

export const mockDonationsByCampaign = [
  { campaign: 'Spring Drive', total: 95000, count: 30 },
  { campaign: 'Year End', total: 75000, count: 25 },
];

export const mockOutcomes = {
  totalResidents: 124,
  completedReintegrations: 97,
  successRate: 78,
  avgLengthOfStayDays: 540,
  byType: [
    { type: 'Family Reunification', count: 60 },
    { type: 'Foster Care', count: 25 },
    { type: 'Independent Living', count: 12 },
  ],
};

export const mockSafehouseComparison = [
  {
    safehouseId: 1,
    safehouseCode: 'SH-LUZ',
    name: 'Safe Haven Luzon',
    city: 'Manila',
    status: 'Active',
    capacityGirls: 20,
    currentOccupancy: 18,
    occupancyPct: 90,
    activeResidents: 18,
    incidents: 3,
    recordings: 45,
    avgEducation: 82,
    avgHealth: 87,
  },
];

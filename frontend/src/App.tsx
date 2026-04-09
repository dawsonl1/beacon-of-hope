import { lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo, ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Wraps lazy() to auto-reload on chunk load failure (stale deployment).
// After a new Vercel deploy, old chunk filenames no longer exist. The server
// returns index.html instead, causing a MIME type error. This catches that
// and reloads the page once so the browser fetches the new chunks.
function lazyRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const reloaded = sessionStorage.getItem('chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise<never>(() => {}); // never resolves — page is reloading
      }
      sessionStorage.removeItem('chunk_reload');
      throw err; // already retried once, let error boundary handle it
    })
  );
}
import { AuthProvider } from './contexts/AuthContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import CookiePreferencesModal from './components/CookiePreferencesModal';
import AnalyticsLoader from './components/AnalyticsLoader';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import ChatWidget from './components/ChatWidget';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React error boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'var(--font-body)', gap: '1rem' }}>
          <p style={{ color: 'var(--color-slate)', fontSize: '1.1rem' }}>Something went wrong.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
// Public pages — eagerly loaded (common entry points)
import HomePage from './pages/HomePage';
import ImpactPage from './pages/ImpactPage';
import LoginPage from './pages/LoginPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
// SignupPage removed — donors get accounts after donating
const NewsletterPage = lazyRetry(() => import('./pages/NewsletterPage'));
const VolunteerPage = lazyRetry(() => import('./pages/VolunteerPage'));
const PartnerPage = lazyRetry(() => import('./pages/PartnerPage'));
// Admin pages — lazy loaded (code-split)
const AdminLayout = lazyRetry(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazyRetry(() => import('./pages/AdminDashboard'));
const ReportsPage = lazyRetry(() => import('./pages/admin/ReportsPage'));
const VisitationsPage = lazyRetry(() => import('./pages/admin/VisitationsPage'));
const VisitationDetailPage = lazyRetry(() => import('./pages/admin/VisitationDetailPage'));
const VisitationFormPage = lazyRetry(() => import('./pages/admin/VisitationFormPage'));
const CaseloadPage = lazyRetry(() => import('./pages/admin/CaseloadPage'));
const ResidentDetailPage = lazyRetry(() => import('./pages/admin/ResidentDetailPage'));
const ResidentFormPage = lazyRetry(() => import('./pages/admin/ResidentFormPage'));
const ProcessRecordingsPage = lazyRetry(() => import('./pages/admin/ProcessRecordingsPage'));
const RecordingDetailPage = lazyRetry(() => import('./pages/admin/RecordingDetailPage'));
const RecordingFormPage = lazyRetry(() => import('./pages/admin/RecordingFormPage'));
const DonorsPage = lazyRetry(() => import('./pages/admin/DonorsPage'));
const SupporterDetailPage = lazyRetry(() => import('./pages/admin/SupporterDetailPage'));
const SupporterFormPage = lazyRetry(() => import('./pages/admin/SupporterFormPage'));
const PartnerDetailPage = lazyRetry(() => import('./pages/admin/PartnerDetailPage'));
const PartnerFormPage = lazyRetry(() => import('./pages/admin/PartnerFormPage'));
const DonationFormPage = lazyRetry(() => import('./pages/admin/DonationFormPage'));
const UsersPage = lazyRetry(() => import('./pages/admin/UsersPage'));
const StaffTasksPage = lazyRetry(() => import('./pages/admin/StaffTasksPage'));
const CalendarPage = lazyRetry(() => import('./pages/admin/CalendarPage'));
const IncidentsPage = lazyRetry(() => import('./pages/admin/IncidentsPage'));
const IncidentFormPage = lazyRetry(() => import('./pages/admin/IncidentFormPage'));
const IncidentDetailPage = lazyRetry(() => import('./pages/admin/IncidentDetailPage'));
const CaseQueuePage = lazyRetry(() => import('./pages/admin/CaseQueuePage'));
const CaseConferencesPage = lazyRetry(() => import('./pages/admin/CaseConferencesPage'));
const EducationRecordFormPage = lazyRetry(() => import('./pages/admin/EducationRecordFormPage'));
const HealthRecordFormPage = lazyRetry(() => import('./pages/admin/HealthRecordFormPage'));
const PostPlacementPage = lazyRetry(() => import('./pages/admin/PostPlacementPage'));
const DonorPortal = lazyRetry(() => import('./pages/DonorPortal'));
const DonatePage = lazyRetry(() => import('./pages/DonatePage'));
const DonateSuccessPage = lazyRetry(() => import('./pages/DonateSuccessPage'));
const NotFoundPage = lazyRetry(() => import('./pages/NotFoundPage'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
      Loading...
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
      <Footer />
      <ChatWidget />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <CookieConsentProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/impact" element={<PublicLayout><ImpactPage /></PublicLayout>} />
            <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
            <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
            <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/signup" element={<Navigate to="/donate" replace />} />
            <Route path="/newsletter" element={<PublicLayout><NewsletterPage /></PublicLayout>} />
            <Route path="/volunteer" element={<PublicLayout><VolunteerPage /></PublicLayout>} />
            <Route path="/partner" element={<PublicLayout><PartnerPage /></PublicLayout>} />
            <Route path="/donate" element={<PublicLayout><DonatePage /></PublicLayout>} />
            <Route path="/donate/success" element={<PublicLayout><DonateSuccessPage /></PublicLayout>} />

            {/* Donor portal */}
            <Route path="/donor" element={
              <ProtectedRoute allowedRoles={['Donor']}>
                <PublicLayout><DonorPortal /></PublicLayout>
              </ProtectedRoute>
            } />

            {/* Admin portal — lazy-loaded with Suspense */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminLayout />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="tasks" element={<StaffTasksPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="incidents/new" element={<IncidentFormPage />} />
              <Route path="incidents/:id" element={<IncidentDetailPage />} />
              <Route path="incidents/:id/edit" element={<IncidentFormPage />} />
              <Route path="queue" element={<CaseQueuePage />} />
              <Route path="conferences" element={<CaseConferencesPage />} />
              <Route path="post-placement" element={<PostPlacementPage />} />
              <Route path="caseload" element={<CaseloadPage />} />
              <Route path="caseload/new" element={<ResidentFormPage />} />
              <Route path="caseload/:id" element={<ResidentDetailPage />} />
              <Route path="caseload/:id/edit" element={<ResidentFormPage />} />
              <Route path="caseload/:id/education/new" element={<EducationRecordFormPage />} />
              <Route path="caseload/:id/health/new" element={<HealthRecordFormPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="visitations" element={<VisitationsPage />} />
              <Route path="visitations/new" element={<VisitationFormPage />} />
              <Route path="visitations/:id" element={<VisitationDetailPage />} />
              <Route path="visitations/:id/edit" element={<VisitationFormPage />} />
              <Route path="recordings" element={<ProcessRecordingsPage />} />
              <Route path="recordings/new" element={<RecordingFormPage />} />
              <Route path="recordings/:id" element={<RecordingDetailPage />} />
              <Route path="recordings/:id/edit" element={<RecordingFormPage />} />
              <Route path="donors" element={<DonorsPage />} />
              <Route path="donors/new" element={<SupporterFormPage />} />
              <Route path="donors/:id" element={<SupporterDetailPage />} />
              <Route path="donors/:id/edit" element={<SupporterFormPage />} />
              <Route path="partners/new" element={<PartnerFormPage />} />
              <Route path="partners/:id" element={<PartnerDetailPage />} />
              <Route path="partners/:id/edit" element={<PartnerFormPage />} />
              <Route path="donations/new" element={<DonationFormPage />} />
              <Route path="donations/:id/edit" element={<DonationFormPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>

            {/* 404 catch-all */}
            <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
          </Routes>
          <CookieConsent />
          <CookiePreferencesModal />
        </BrowserRouter>
        <AnalyticsLoader />
      </CookieConsentProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

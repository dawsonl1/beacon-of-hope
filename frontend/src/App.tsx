import { lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import CookiePreferencesModal from './components/CookiePreferencesModal';
import AnalyticsLoader from './components/AnalyticsLoader';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

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
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const VolunteerPage = lazy(() => import('./pages/VolunteerPage'));
// Admin pages — lazy loaded (code-split)
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const VisitationsPage = lazy(() => import('./pages/admin/VisitationsPage'));
const VisitationDetailPage = lazy(() => import('./pages/admin/VisitationDetailPage'));
const VisitationFormPage = lazy(() => import('./pages/admin/VisitationFormPage'));
const CaseloadPage = lazy(() => import('./pages/admin/CaseloadPage'));
const ResidentDetailPage = lazy(() => import('./pages/admin/ResidentDetailPage'));
const ResidentFormPage = lazy(() => import('./pages/admin/ResidentFormPage'));
const ProcessRecordingsPage = lazy(() => import('./pages/admin/ProcessRecordingsPage'));
const RecordingDetailPage = lazy(() => import('./pages/admin/RecordingDetailPage'));
const RecordingFormPage = lazy(() => import('./pages/admin/RecordingFormPage'));
const DonorsPage = lazy(() => import('./pages/admin/DonorsPage'));
const SupporterDetailPage = lazy(() => import('./pages/admin/SupporterDetailPage'));
const SupporterFormPage = lazy(() => import('./pages/admin/SupporterFormPage'));
const DonationFormPage = lazy(() => import('./pages/admin/DonationFormPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const StaffTasksPage = lazy(() => import('./pages/admin/StaffTasksPage'));
const CalendarPage = lazy(() => import('./pages/admin/CalendarPage'));
const IncidentsPage = lazy(() => import('./pages/admin/IncidentsPage'));
const IncidentFormPage = lazy(() => import('./pages/admin/IncidentFormPage'));
const IncidentDetailPage = lazy(() => import('./pages/admin/IncidentDetailPage'));
const CaseQueuePage = lazy(() => import('./pages/admin/CaseQueuePage'));
const CaseConferencesPage = lazy(() => import('./pages/admin/CaseConferencesPage'));
const EducationRecordFormPage = lazy(() => import('./pages/admin/EducationRecordFormPage'));
const HealthRecordFormPage = lazy(() => import('./pages/admin/HealthRecordFormPage'));
const PostPlacementPage = lazy(() => import('./pages/admin/PostPlacementPage'));
const DonorPortal = lazy(() => import('./pages/DonorPortal'));
const DonatePage = lazy(() => import('./pages/DonatePage'));
const DonateSuccessPage = lazy(() => import('./pages/DonateSuccessPage'));

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
              <Route path="donations/new" element={<DonationFormPage />} />
              <Route path="donations/:id/edit" element={<DonationFormPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
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

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import CookiePreferencesModal from './components/CookiePreferencesModal';
import AnalyticsLoader from './components/AnalyticsLoader';
import ProtectedRoute from './components/ProtectedRoute';
// Public pages — eagerly loaded (common entry points)
import HomePage from './pages/HomePage';
import ImpactPage from './pages/ImpactPage';
import LoginPage from './pages/LoginPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
// SignupPage removed — donors get accounts after donating
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
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
    <AuthProvider>
      <CookieConsentProvider>
        <BrowserRouter>
          <Routes>
            {/* Public pages */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/impact" element={<PublicLayout><ImpactPage /></PublicLayout>} />
            <Route path="/login" element={<PublicLayout><LoginPage /></PublicLayout>} />
            <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
            <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/signup" element={<Navigate to="/donate" replace />} />
            <Route path="/newsletter" element={<PublicLayout><NewsletterPage /></PublicLayout>} />
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
              <Route path="caseload" element={<CaseloadPage />} />
              <Route path="caseload/new" element={<ResidentFormPage />} />
              <Route path="caseload/:id" element={<ResidentDetailPage />} />
              <Route path="caseload/:id/edit" element={<ResidentFormPage />} />
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
  );
}

export default App;

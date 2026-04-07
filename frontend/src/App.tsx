import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CookieConsentProvider } from './contexts/CookieConsentContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import CookiePreferencesModal from './components/CookiePreferencesModal';
import AnalyticsLoader from './components/AnalyticsLoader';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ImpactPage from './pages/ImpactPage';
import LoginPage from './pages/LoginPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import ReportsPage from './pages/admin/ReportsPage';
import VisitationsPage from './pages/admin/VisitationsPage';
import VisitationDetailPage from './pages/admin/VisitationDetailPage';
import VisitationFormPage from './pages/admin/VisitationFormPage';
import CaseloadPage from './pages/admin/CaseloadPage';
import ResidentDetailPage from './pages/admin/ResidentDetailPage';
import ResidentFormPage from './pages/admin/ResidentFormPage';
import ProcessRecordingsPage from './pages/admin/ProcessRecordingsPage';
import RecordingDetailPage from './pages/admin/RecordingDetailPage';
import RecordingFormPage from './pages/admin/RecordingFormPage';
import DonorsPage from './pages/admin/DonorsPage';
import SupporterDetailPage from './pages/admin/SupporterDetailPage';
import SupporterFormPage from './pages/admin/SupporterFormPage';
import DonationFormPage from './pages/admin/DonationFormPage';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
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

            {/* Admin portal */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
                <AdminLayout />
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

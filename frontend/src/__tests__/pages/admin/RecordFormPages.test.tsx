import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../helpers/renderWithProviders';
import EducationRecordFormPage from '../../../pages/admin/EducationRecordFormPage';
import HealthRecordFormPage from '../../../pages/admin/HealthRecordFormPage';

describe('EducationRecordFormPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<EducationRecordFormPage />, { route: '/admin/caseload/1/education/new' });
    expect(screen.getByText('Update Education Record')).toBeInTheDocument();
  });

  it('shows resident dropdown', () => {
    renderWithProviders(<EducationRecordFormPage />, { route: '/admin/caseload/1/education/new' });
    expect(screen.getByText(/Resident/)).toBeInTheDocument();
  });

  it('shows education level dropdown', () => {
    renderWithProviders(<EducationRecordFormPage />, { route: '/admin/caseload/1/education/new' });
    expect(screen.getByText('Education Level')).toBeInTheDocument();
  });

  it('shows attendance rate input', () => {
    renderWithProviders(<EducationRecordFormPage />, { route: '/admin/caseload/1/education/new' });
    expect(screen.getByText(/Attendance Rate/)).toBeInTheDocument();
  });

  it('shows progress input', () => {
    renderWithProviders(<EducationRecordFormPage />, { route: '/admin/caseload/1/education/new' });
    expect(screen.getAllByText(/Progress/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows save button', () => {
    renderWithProviders(<EducationRecordFormPage />, { route: '/admin/caseload/1/education/new' });
    expect(screen.getByText('Save Education Record')).toBeInTheDocument();
  });
});

describe('HealthRecordFormPage', () => {
  it('renders the page title', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText('Input Health Record')).toBeInTheDocument();
  });

  it('shows weight input', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText(/Weight/)).toBeInTheDocument();
  });

  it('shows height input', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText(/Height/)).toBeInTheDocument();
  });

  it('shows BMI field (auto-calculated)', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText(/BMI/)).toBeInTheDocument();
  });

  it('shows medical checkup checkbox', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText('Medical Checkup Done')).toBeInTheDocument();
  });

  it('shows dental checkup checkbox', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText('Dental Checkup Done')).toBeInTheDocument();
  });

  it('shows psychological checkup checkbox', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText('Psychological Checkup Done')).toBeInTheDocument();
  });

  it('shows save button', () => {
    renderWithProviders(<HealthRecordFormPage />, { route: '/admin/caseload/1/health/new' });
    expect(screen.getByText('Save Health Record')).toBeInTheDocument();
  });
});

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Shield } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Dropdown from '../../components/admin/Dropdown';
import DatePicker from '../../components/admin/DatePicker';
import TextArea from '../../components/admin/TextArea';
import styles from './VisitationFormPage.module.css';

interface SafehouseOption {
  safehouseId: number;
  name: string;
}

interface FilterOptions {
  caseStatuses: string[];
  safehouses: SafehouseOption[];
  categories: string[];
  riskLevels: string[];
  socialWorkers: string[];
}

interface FormData {
  firstName: string;
  lastName: string;
  caseControlNo: string;
  internalCode: string;
  safehouseId: string;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  birthStatus: string;
  placeOfBirth: string;
  religion: string;
  caseCategory: string;
  subCatOrphaned: boolean;
  subCatTrafficked: boolean;
  subCatChildLabor: boolean;
  subCatPhysicalAbuse: boolean;
  subCatSexualAbuse: boolean;
  subCatOsaec: boolean;
  subCatCicl: boolean;
  subCatAtRisk: boolean;
  subCatStreetChild: boolean;
  subCatChildWithHiv: boolean;
  isPwd: boolean;
  pwdType: string;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string;
  familyIs4ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyParentPwd: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string;
  ageUponAdmission: string;
  presentAge: string;
  lengthOfStay: string;
  referralSource: string;
  referringAgencyPerson: string;
  dateColbRegistered: string;
  dateColbObtained: string;
  assignedSocialWorker: string;
  initialCaseAssessment: string;
  dateCaseStudyPrepared: string;
  reintegrationType: string;
  reintegrationStatus: string;
  initialRiskLevel: string;
  currentRiskLevel: string;
  dateEnrolled: string;
  dateClosed: string;
  notesRestricted: string;
}

const today = APP_TODAY_STR;

const EMPTY_FORM: FormData = {
  firstName: '', lastName: '', caseControlNo: '', internalCode: '', safehouseId: '', caseStatus: 'Active',
  sex: 'Female', dateOfBirth: '', birthStatus: '', placeOfBirth: '', religion: '',
  caseCategory: '',
  subCatOrphaned: false, subCatTrafficked: false, subCatChildLabor: false,
  subCatPhysicalAbuse: false, subCatSexualAbuse: false, subCatOsaec: false,
  subCatCicl: false, subCatAtRisk: false, subCatStreetChild: false, subCatChildWithHiv: false,
  isPwd: false, pwdType: '', hasSpecialNeeds: false, specialNeedsDiagnosis: '',
  familyIs4ps: false, familySoloParent: false, familyIndigenous: false,
  familyParentPwd: false, familyInformalSettler: false,
  dateOfAdmission: today, ageUponAdmission: '', presentAge: '', lengthOfStay: '',
  referralSource: '', referringAgencyPerson: '',
  dateColbRegistered: '', dateColbObtained: '',
  assignedSocialWorker: '', initialCaseAssessment: '', dateCaseStudyPrepared: '',
  reintegrationType: '', reintegrationStatus: '',
  initialRiskLevel: '', currentRiskLevel: '',
  dateEnrolled: today, dateClosed: '', notesRestricted: '',
};

const SUB_CAT_FIELDS = [
  { key: 'subCatOrphaned', label: 'Orphaned' },
  { key: 'subCatTrafficked', label: 'Trafficked' },
  { key: 'subCatChildLabor', label: 'Child Labor' },
  { key: 'subCatPhysicalAbuse', label: 'Physical Abuse' },
  { key: 'subCatSexualAbuse', label: 'Sexual Abuse' },
  { key: 'subCatOsaec', label: 'OSAEC' },
  { key: 'subCatCicl', label: 'CICL' },
  { key: 'subCatAtRisk', label: 'At Risk' },
  { key: 'subCatStreetChild', label: 'Street Child' },
  { key: 'subCatChildWithHiv', label: 'Child with HIV' },
] as const;

const FAMILY_FIELDS = [
  { key: 'familyIs4ps', label: '4Ps Beneficiary' },
  { key: 'familySoloParent', label: 'Solo Parent' },
  { key: 'familyIndigenous', label: 'Indigenous' },
  { key: 'familyParentPwd', label: 'Parent with Disability' },
  { key: 'familyInformalSettler', label: 'Informal Settler' },
] as const;

function toPayload(form: FormData) {
  return {
    ...form,
    firstName: form.firstName || null,
    lastName: form.lastName || null,
    safehouseId: form.safehouseId ? parseInt(form.safehouseId, 10) : null,
    dateOfBirth: form.dateOfBirth || null,
    dateOfAdmission: form.dateOfAdmission || null,
    dateColbRegistered: form.dateColbRegistered || null,
    dateColbObtained: form.dateColbObtained || null,
    dateCaseStudyPrepared: form.dateCaseStudyPrepared || null,
    dateEnrolled: form.dateEnrolled || null,
    dateClosed: form.dateClosed || null,
    caseControlNo: form.caseControlNo || null,
    internalCode: form.internalCode || null,
    caseStatus: form.caseStatus || null,
    sex: form.sex || null,
    birthStatus: form.birthStatus || null,
    placeOfBirth: form.placeOfBirth || null,
    religion: form.religion || null,
    caseCategory: form.caseCategory || null,
    pwdType: form.pwdType || null,
    specialNeedsDiagnosis: form.specialNeedsDiagnosis || null,
    ageUponAdmission: form.ageUponAdmission || null,
    presentAge: form.presentAge || null,
    lengthOfStay: form.lengthOfStay || null,
    referralSource: form.referralSource || null,
    referringAgencyPerson: form.referringAgencyPerson || null,
    assignedSocialWorker: form.assignedSocialWorker || null,
    initialCaseAssessment: form.initialCaseAssessment || null,
    reintegrationType: form.reintegrationType || null,
    reintegrationStatus: form.reintegrationStatus || null,
    initialRiskLevel: form.initialRiskLevel || null,
    currentRiskLevel: form.currentRiskLevel || null,
    notesRestricted: form.notesRestricted || null,
  };
}

/* ── Pill toggle for boolean fields ──────────────── */
function PillToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.35rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem',
        fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
        border: checked ? '1px solid var(--color-sage)' : '1px solid rgba(15,27,45,0.12)',
        background: checked ? 'rgba(15,143,125,0.1)' : '#fff',
        color: checked ? 'var(--color-sage)' : 'var(--text-muted)',
        transition: 'all 0.15s',
      }}
    >
      {checked && <span style={{ fontSize: '0.65rem' }}>&#10003;</span>}
      {label}
    </button>
  );
}

export default function ResidentFormPage() {
  useDocumentTitle('Resident Form');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<FilterOptions>('/api/admin/residents/filter-options').then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    apiFetch<Record<string, unknown>>(`/api/admin/residents/${id}`)
      .then((data) => {
        setForm({
          firstName: (data.firstName as string) ?? '',
          lastName: (data.lastName as string) ?? '',
          caseControlNo: (data.caseControlNo as string) ?? '',
          internalCode: (data.internalCode as string) ?? '',
          safehouseId: data.safehouseId != null ? String(data.safehouseId) : '',
          caseStatus: (data.caseStatus as string) ?? '',
          sex: (data.sex as string) ?? '',
          dateOfBirth: (data.dateOfBirth as string) ?? '',
          birthStatus: (data.birthStatus as string) ?? '',
          placeOfBirth: (data.placeOfBirth as string) ?? '',
          religion: (data.religion as string) ?? '',
          caseCategory: (data.caseCategory as string) ?? '',
          subCatOrphaned: !!data.subCatOrphaned, subCatTrafficked: !!data.subCatTrafficked,
          subCatChildLabor: !!data.subCatChildLabor, subCatPhysicalAbuse: !!data.subCatPhysicalAbuse,
          subCatSexualAbuse: !!data.subCatSexualAbuse, subCatOsaec: !!data.subCatOsaec,
          subCatCicl: !!data.subCatCicl, subCatAtRisk: !!data.subCatAtRisk,
          subCatStreetChild: !!data.subCatStreetChild, subCatChildWithHiv: !!data.subCatChildWithHiv,
          isPwd: !!data.isPwd, pwdType: (data.pwdType as string) ?? '',
          hasSpecialNeeds: !!data.hasSpecialNeeds, specialNeedsDiagnosis: (data.specialNeedsDiagnosis as string) ?? '',
          familyIs4ps: !!data.familyIs4ps, familySoloParent: !!data.familySoloParent,
          familyIndigenous: !!data.familyIndigenous, familyParentPwd: !!data.familyParentPwd,
          familyInformalSettler: !!data.familyInformalSettler,
          dateOfAdmission: (data.dateOfAdmission as string) ?? '',
          ageUponAdmission: (data.ageUponAdmission as string) ?? '',
          presentAge: (data.presentAge as string) ?? '',
          lengthOfStay: (data.lengthOfStay as string) ?? '',
          referralSource: (data.referralSource as string) ?? '',
          referringAgencyPerson: (data.referringAgencyPerson as string) ?? '',
          dateColbRegistered: (data.dateColbRegistered as string) ?? '',
          dateColbObtained: (data.dateColbObtained as string) ?? '',
          assignedSocialWorker: (data.assignedSocialWorker as string) ?? '',
          initialCaseAssessment: (data.initialCaseAssessment as string) ?? '',
          dateCaseStudyPrepared: (data.dateCaseStudyPrepared as string) ?? '',
          reintegrationType: (data.reintegrationType as string) ?? '',
          reintegrationStatus: (data.reintegrationStatus as string) ?? '',
          initialRiskLevel: (data.initialRiskLevel as string) ?? '',
          currentRiskLevel: (data.currentRiskLevel as string) ?? '',
          dateEnrolled: (data.dateEnrolled as string) ?? '',
          dateClosed: (data.dateClosed as string) ?? '',
          notesRestricted: (data.notesRestricted as string) ?? '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function u(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (isEdit) {
        await apiFetch(`/api/admin/residents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        navigate(`/admin/caseload/${id}`);
      } else {
        const result = await apiFetch<{ residentId: number }>('/api/admin/residents', { method: 'POST', body: JSON.stringify(payload) });
        navigate(`/admin/caseload/${result.residentId}`);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div></div>;
  }

  return (
    <div className={styles.page}>
      <a href="#" className={styles.backLink} onClick={e => { e.preventDefault(); navigate(isEdit ? `/admin/caseload/${id}` : '/admin/caseload'); }}>
        <ArrowLeft size={16} /> {isEdit ? 'Back to Resident' : 'Back to Caseload'}
      </a>
      <h1 className={styles.title}>{isEdit ? 'Edit Resident' : 'Add New Resident'}</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Admission & Assignment ──────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Admission & Assignment</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>First Name</label>
              <input className={styles.input} value={form.firstName} onChange={e => u('firstName', e.target.value)} placeholder="First name" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Last Name</label>
              <input className={styles.input} value={form.lastName} onChange={e => u('lastName', e.target.value)} placeholder="Last name" />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Safehouse <span className={styles.required}>*</span></div>
              <Dropdown value={form.safehouseId} placeholder="Select safehouse..." options={options?.safehouses.map(s => ({ value: String(s.safehouseId), label: s.name })) ?? []} onChange={v => u('safehouseId', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Case Category <span className={styles.required}>*</span></div>
              <Dropdown value={form.caseCategory} placeholder="Select category..." options={options?.categories.map(c => ({ value: c, label: c })) ?? []} onChange={v => u('caseCategory', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Risk Level <span className={styles.required}>*</span></div>
              <Dropdown value={form.currentRiskLevel} placeholder="Select risk level..." options={options?.riskLevels.map(r => ({ value: r, label: r })) ?? []} onChange={v => { u('currentRiskLevel', v); if (!form.initialRiskLevel) u('initialRiskLevel', v); }} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Assigned Social Worker <span className={styles.required}>*</span></div>
              <Dropdown value={form.assignedSocialWorker} placeholder="Select social worker..." options={options?.socialWorkers.map(sw => ({ value: sw, label: sw })) ?? []} onChange={v => u('assignedSocialWorker', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Date of Admission</div>
              <DatePicker value={form.dateOfAdmission} onChange={v => u('dateOfAdmission', v)} placeholder="Select date..." />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Case Status</div>
              <Dropdown value={form.caseStatus} placeholder="Select status..." options={options?.caseStatuses.map(s => ({ value: s, label: s })) ?? []} onChange={v => u('caseStatus', v)} />
            </div>
          </div>
          {isEdit && (
            <div className={styles.fieldGrid} style={{ marginTop: '0.75rem' }}>
              <div className={styles.field}>
                <label className={styles.label}>Internal Code</label>
                <input className={styles.input} value={form.internalCode} readOnly style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Case Control No.</label>
                <input className={styles.input} value={form.caseControlNo} readOnly style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── Demographics ────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Demographics</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <div className={styles.label}>Sex</div>
              <Dropdown value={form.sex} placeholder="Select..." options={[{ value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }]} onChange={v => u('sex', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Date of Birth</div>
              <DatePicker value={form.dateOfBirth} onChange={v => u('dateOfBirth', v)} placeholder="Select date..." />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Age upon Admission</label>
              <input className={styles.input} type="number" min="0" max="18" value={form.ageUponAdmission} onChange={e => u('ageUponAdmission', e.target.value)} placeholder="e.g. 14" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Place of Birth</label>
              <input className={styles.input} value={form.placeOfBirth} onChange={e => u('placeOfBirth', e.target.value)} placeholder="Village or city" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Religion</label>
              <input className={styles.input} value={form.religion} onChange={e => u('religion', e.target.value)} placeholder="e.g. Catholic" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Birth Status</label>
              <input className={styles.input} value={form.birthStatus} onChange={e => u('birthStatus', e.target.value)} placeholder="e.g. Legitimate" />
            </div>
          </div>
        </div>

        {/* ── Case Classification ─────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Case Classification</h2>
          <div className={styles.label} style={{ marginBottom: '0.5rem' }}>Sub-Categories</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            {SUB_CAT_FIELDS.map(({ key, label }) => (
              <PillToggle key={key} label={label} checked={form[key]} onChange={v => u(key, v)} />
            ))}
          </div>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Referral Source</label>
              <input className={styles.input} value={form.referralSource} onChange={e => u('referralSource', e.target.value)} placeholder="e.g. DSWD, Court Order" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Referring Agency / Person</label>
              <input className={styles.input} value={form.referringAgencyPerson} onChange={e => u('referringAgencyPerson', e.target.value)} placeholder="Name of referring party" />
            </div>
          </div>
        </div>

        {/* ── Health & Special Needs ───────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Health & Special Needs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className={styles.toggleRow}>
              <button type="button" className={`${styles.toggle} ${form.isPwd ? styles.toggleActive : ''}`} onClick={() => u('isPwd', !form.isPwd)} />
              <div>
                <div className={styles.toggleLabel}>Person with Disability (PWD)</div>
              </div>
            </div>
            {form.isPwd && (
              <div className={styles.field} style={{ maxWidth: '350px' }}>
                <label className={styles.label}>PWD Type</label>
                <input className={styles.input} value={form.pwdType} onChange={e => u('pwdType', e.target.value)} placeholder="Type of disability" />
              </div>
            )}
            <div className={styles.toggleRow}>
              <button type="button" className={`${styles.toggle} ${form.hasSpecialNeeds ? styles.toggleActive : ''}`} onClick={() => u('hasSpecialNeeds', !form.hasSpecialNeeds)} />
              <div>
                <div className={styles.toggleLabel}>Has Special Needs</div>
              </div>
            </div>
            {form.hasSpecialNeeds && (
              <div className={styles.field} style={{ maxWidth: '350px' }}>
                <label className={styles.label}>Diagnosis</label>
                <input className={styles.input} value={form.specialNeedsDiagnosis} onChange={e => u('specialNeedsDiagnosis', e.target.value)} placeholder="Diagnosis details" />
              </div>
            )}
          </div>
        </div>

        {/* ── Family Background ───────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Family Background</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {FAMILY_FIELDS.map(({ key, label }) => (
              <PillToggle key={key} label={label} checked={form[key]} onChange={v => u(key, v)} />
            ))}
          </div>
        </div>

        {/* ── Documentation ───────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Documentation</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <div className={styles.label}>COLB Registered</div>
              <DatePicker value={form.dateColbRegistered} onChange={v => u('dateColbRegistered', v)} placeholder="Select date..." />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>COLB Obtained</div>
              <DatePicker value={form.dateColbObtained} onChange={v => u('dateColbObtained', v)} placeholder="Select date..." />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Date Enrolled</div>
              <DatePicker value={form.dateEnrolled} onChange={v => u('dateEnrolled', v)} placeholder="Select date..." />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Date Closed</div>
              <DatePicker value={form.dateClosed} onChange={v => u('dateClosed', v)} placeholder="Select date..." />
            </div>
          </div>
        </div>

        {/* ── Assessment & Planning ────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Assessment & Planning</h2>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Initial Case Assessment</label>
            <TextArea className={styles.textarea} value={form.initialCaseAssessment} onChange={e => u('initialCaseAssessment', e.target.value)} rows={3} placeholder="Brief assessment of the resident's situation..." />
          </div>
          <div className={styles.fieldGrid} style={{ marginTop: '0.75rem' }}>
            <div className={styles.field}>
              <div className={styles.label}>Reintegration Type</div>
              <Dropdown value={form.reintegrationType} placeholder="Not applicable" options={[{ value: 'Family Reunification', label: 'Family Reunification' }, { value: 'Foster Care', label: 'Foster Care' }, { value: 'Independent Living', label: 'Independent Living' }]} onChange={v => u('reintegrationType', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Reintegration Status</div>
              <Dropdown value={form.reintegrationStatus} placeholder="Select status..." options={[{ value: 'Not Started', label: 'Not Started' }, { value: 'In Progress', label: 'In Progress' }, { value: 'Completed', label: 'Completed' }, { value: 'On Hold', label: 'On Hold' }]} onChange={v => u('reintegrationStatus', v)} />
            </div>
          </div>
        </div>

        {/* ── Restricted Notes ─────────────────────── */}
        <div className={styles.formCard}>
          <div className={styles.safetySection}>
            <div className={styles.safetySectionHeader}>
              <Shield size={16} /> Confidential Notes
            </div>
            <div className={styles.field}>
              <TextArea className={styles.textarea} value={form.notesRestricted} onChange={e => u('notesRestricted', e.target.value)} rows={3} placeholder="Restricted notes - only visible to authorized staff..." style={{ background: '#fff' }} />
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────── */}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(isEdit ? `/admin/caseload/${id}` : '/admin/caseload')}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Resident'}
          </button>
        </div>
      </form>
    </div>
  );
}

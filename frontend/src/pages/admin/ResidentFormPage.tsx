import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './ResidentFormPage.module.css';

interface SafehouseOption {
  safehouseId: number;
  safehouseCode: string;
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
  caseControlNo: '', internalCode: '', safehouseId: '', caseStatus: 'Active',
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

export default function ResidentFormPage() {
  useDocumentTitle('Resident Form');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<FilterOptions>('/api/admin/residents/filter-options')
      .then(setOptions)
      .catch(() => {});
  }, []);

  // Staff see only their assigned safehouses (from auth); admins see all
  const userSafehouses: SafehouseOption[] = (user?.safehouses ?? []).map((s) => ({
    safehouseId: s.safehouseId,
    safehouseCode: s.safehouseCode,
    name: s.name,
  }));
  const availableSafehouses =
    isAdmin ? (options?.safehouses ?? []) : userSafehouses;

  // Auto-select safehouse when user has exactly one
  useEffect(() => {
    if (!isEdit && availableSafehouses.length === 1 && !form.safehouseId) {
      setForm((prev) => ({ ...prev, safehouseId: String(availableSafehouses[0].safehouseId) }));
    }
  }, [availableSafehouses.length, isEdit, form.safehouseId]);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    apiFetch<Record<string, unknown>>(`/api/admin/residents/${id}`)
      .then((data) => {
        setForm({
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
          subCatOrphaned: !!data.subCatOrphaned,
          subCatTrafficked: !!data.subCatTrafficked,
          subCatChildLabor: !!data.subCatChildLabor,
          subCatPhysicalAbuse: !!data.subCatPhysicalAbuse,
          subCatSexualAbuse: !!data.subCatSexualAbuse,
          subCatOsaec: !!data.subCatOsaec,
          subCatCicl: !!data.subCatCicl,
          subCatAtRisk: !!data.subCatAtRisk,
          subCatStreetChild: !!data.subCatStreetChild,
          subCatChildWithHiv: !!data.subCatChildWithHiv,
          isPwd: !!data.isPwd,
          pwdType: (data.pwdType as string) ?? '',
          hasSpecialNeeds: !!data.hasSpecialNeeds,
          specialNeedsDiagnosis: (data.specialNeedsDiagnosis as string) ?? '',
          familyIs4ps: !!data.familyIs4ps,
          familySoloParent: !!data.familySoloParent,
          familyIndigenous: !!data.familyIndigenous,
          familyParentPwd: !!data.familyParentPwd,
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

  function updateField(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (isEdit) {
        await apiFetch(`/api/admin/residents/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        navigate(`/admin/caseload/${id}`);
      } else {
        const result = await apiFetch<{ residentId: number }>('/api/admin/residents', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        navigate(`/admin/caseload/${result.residentId}`);
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button
          className={styles.backLink}
          onClick={() => navigate(isEdit ? `/admin/caseload/${id}` : '/admin/caseload')}
        >
          <ArrowLeft size={16} /> Cancel
        </button>
      </div>

      <h1 className={styles.title}>{isEdit ? 'Edit Resident' : 'Add New Resident'}</h1>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* ── Essential Info (always visible, quick entry) ── */}
        <div className={styles.fieldset}>
          <h3 className={styles.legend}>Admission</h3>
          <p className={styles.sectionHint}>Start here — codes are auto-generated on save.</p>
          <div className={styles.fieldGrid}>
            <label className={styles.label}>
              Safehouse *
              <select className={styles.select} value={form.safehouseId} onChange={(e) => updateField('safehouseId', e.target.value)} required>
                <option value="">Select safehouse</option>
                {availableSafehouses.map((s) => (
                  <option key={s.safehouseId} value={String(s.safehouseId)}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Case Category *
              <select className={styles.select} value={form.caseCategory} onChange={(e) => updateField('caseCategory', e.target.value)} required>
                <option value="">Select category</option>
                {options?.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Assigned Social Worker *
              <select className={styles.select} value={form.assignedSocialWorker} onChange={(e) => updateField('assignedSocialWorker', e.target.value)} required>
                <option value="">Select social worker</option>
                {options?.socialWorkers.map((sw) => (
                  <option key={sw} value={sw}>{sw}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Date of Admission
              <input type="date" className={styles.input} value={form.dateOfAdmission} onChange={(e) => updateField('dateOfAdmission', e.target.value)} />
            </label>
            <label className={styles.label}>
              Case Status
              <select className={styles.select} value={form.caseStatus} onChange={(e) => updateField('caseStatus', e.target.value)}>
                <option value="">Select status</option>
                {options?.caseStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {isEdit && (
            <div className={styles.fieldGrid} style={{ marginTop: '0.75rem' }}>
              <label className={styles.label}>
                Internal Code
                <input className={styles.input} value={form.internalCode} readOnly style={{ background: '#f5f5f5' }} />
              </label>
              <label className={styles.label}>
                Case Control No.
                <input className={styles.input} value={form.caseControlNo} readOnly style={{ background: '#f5f5f5' }} />
              </label>
            </div>
          )}
        </div>

        {/* ── About the Resident ── */}
        <div className={styles.fieldset}>
          <h3 className={styles.legend}>About the Resident</h3>
          <div className={styles.fieldGrid}>
            <label className={styles.label}>
              Sex
              <select className={styles.select} value={form.sex} onChange={(e) => updateField('sex', e.target.value)}>
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </label>
            <label className={styles.label}>
              Date of Birth
              <input type="date" className={styles.input} value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
            </label>
            <label className={styles.label}>
              Age upon Admission
              <input className={styles.input} type="number" min="0" max="18" value={form.ageUponAdmission} onChange={(e) => updateField('ageUponAdmission', e.target.value)} placeholder="e.g. 14" />
            </label>
            <label className={styles.label}>
              Place of Birth
              <input className={styles.input} value={form.placeOfBirth} onChange={(e) => updateField('placeOfBirth', e.target.value)} placeholder="Village or city" />
            </label>
            <label className={styles.label}>
              Religion
              <input className={styles.input} value={form.religion} onChange={(e) => updateField('religion', e.target.value)} placeholder="e.g. Catholic" />
            </label>
            <label className={styles.label}>
              Birth Status
              <input className={styles.input} value={form.birthStatus} onChange={(e) => updateField('birthStatus', e.target.value)} placeholder="e.g. Legitimate" />
            </label>
          </div>
        </div>

        {/* ── Case Details ── */}
        <div className={styles.fieldset}>
          <h3 className={styles.legend}>Case Details</h3>
          <div className={styles.checkboxSection}>
            <span className={styles.checkboxLabel}>Sub-Categories (select all that apply)</span>
            <div className={styles.checkboxGrid}>
              {SUB_CAT_FIELDS.map(({ key, label }) => (
                <label key={key} className={styles.checkbox}>
                  <input type="checkbox" checked={form[key]} onChange={(e) => updateField(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.fieldGrid} style={{ marginTop: '1rem' }}>
            <label className={styles.label}>
              Referral Source
              <input className={styles.input} value={form.referralSource} onChange={(e) => updateField('referralSource', e.target.value)} placeholder="e.g. DSWD, Court Order" />
            </label>
            <label className={styles.label}>
              Referring Agency/Person
              <input className={styles.input} value={form.referringAgencyPerson} onChange={(e) => updateField('referringAgencyPerson', e.target.value)} placeholder="Name of referring person or agency" />
            </label>
          </div>
        </div>

        {/* ── Health & Family ── */}
        <div className={styles.fieldset}>
          <h3 className={styles.legend}>Health & Family</h3>
          <div className={styles.checkboxSection}>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={form.isPwd} onChange={(e) => updateField('isPwd', e.target.checked)} />
              <span>Person with Disability (PWD)</span>
            </label>
            {form.isPwd && (
              <div className={styles.conditionalField}>
                <label className={styles.label}>
                  PWD Type
                  <input className={styles.input} value={form.pwdType} onChange={(e) => updateField('pwdType', e.target.value)} placeholder="Type of disability" />
                </label>
              </div>
            )}
            <label className={styles.checkbox}>
              <input type="checkbox" checked={form.hasSpecialNeeds} onChange={(e) => updateField('hasSpecialNeeds', e.target.checked)} />
              <span>Has Special Needs</span>
            </label>
            {form.hasSpecialNeeds && (
              <div className={styles.conditionalField}>
                <label className={styles.label}>
                  Diagnosis
                  <input className={styles.input} value={form.specialNeedsDiagnosis} onChange={(e) => updateField('specialNeedsDiagnosis', e.target.value)} placeholder="Diagnosis details" />
                </label>
              </div>
            )}
          </div>
          <div className={styles.checkboxSection}>
            <span className={styles.checkboxLabel}>Family Background</span>
            <div className={styles.checkboxGrid}>
              {FAMILY_FIELDS.map(({ key, label }) => (
                <label key={key} className={styles.checkbox}>
                  <input type="checkbox" checked={form[key]} onChange={(e) => updateField(key, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Assessment & Notes ── */}
        <div className={styles.fieldset}>
          <h3 className={styles.legend}>Assessment & Notes</h3>
          <div className={styles.fullWidthFields}>
            <label className={styles.label}>
              Initial Case Assessment
              <textarea className={styles.textarea} value={form.initialCaseAssessment} onChange={(e) => updateField('initialCaseAssessment', e.target.value)} rows={3} placeholder="Brief assessment of the resident's situation..." />
            </label>
            <label className={styles.label}>
              Confidential Notes
              <textarea className={styles.textarea} value={form.notesRestricted} onChange={(e) => updateField('notesRestricted', e.target.value)} rows={3} placeholder="Restricted notes — only visible to authorized staff" />
            </label>
          </div>
          <div className={styles.fieldGrid} style={{ marginTop: '0.75rem' }}>
            <label className={styles.label}>
              Reintegration Type
              <select className={styles.select} value={form.reintegrationType} onChange={(e) => updateField('reintegrationType', e.target.value)}>
                <option value="">Not applicable</option>
                <option value="Family Reunification">Family Reunification</option>
                <option value="Foster Care">Foster Care</option>
                <option value="Independent Living">Independent Living</option>
              </select>
            </label>
            <label className={styles.label}>
              Reintegration Status
              <select className={styles.select} value={form.reintegrationStatus} onChange={(e) => updateField('reintegrationStatus', e.target.value)}>
                <option value="">Select status...</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </label>
            <label className={styles.label}>
              Date Enrolled
              <input type="date" className={styles.input} value={form.dateEnrolled} onChange={(e) => updateField('dateEnrolled', e.target.value)} />
            </label>
            <label className={styles.label}>
              Date Closed
              <input type="date" className={styles.input} value={form.dateClosed} onChange={(e) => updateField('dateClosed', e.target.value)} />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => navigate(isEdit ? `/admin/caseload/${id}` : '/admin/caseload')}
          >
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Resident'}
          </button>
        </div>
      </form>
    </div>
  );
}

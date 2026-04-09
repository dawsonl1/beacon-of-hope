import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './VisitationFormPage.module.css';

interface ResidentOption {
  residentId: number;
  internalCode: string | null;
}

interface FormData {
  residentId: number | '';
  recordDate: string;
  educationLevel: string;
  attendanceRate: string;
  progressPercent: string;
  completionStatus: string;
  schoolName: string;
  enrollmentStatus: string;
  notes: string;
}

const emptyForm: FormData = {
  residentId: '',
  recordDate: APP_TODAY_STR,
  educationLevel: '',
  attendanceRate: '',
  progressPercent: '',
  completionStatus: '',
  schoolName: '',
  enrollmentStatus: '',
  notes: '',
};

export default function EducationRecordFormPage() {
  useDocumentTitle('Education Record');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const residentId = params.get('residentId');

  const [form, setForm] = useState<FormData>({ ...emptyForm, residentId: residentId ? Number(residentId) : '' });
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ResidentOption[] | { items: ResidentOption[] }>('/api/admin/residents-list')
      .then(data => setResidents(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.residentId) { setError('Please select a resident.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiFetch('/api/admin/education-records', {
        method: 'POST',
        body: JSON.stringify({
          residentId: Number(form.residentId),
          recordDate: form.recordDate || null,
          educationLevel: form.educationLevel || null,
          attendanceRate: form.attendanceRate ? Number(form.attendanceRate) : null,
          progressPercent: form.progressPercent ? Number(form.progressPercent) : null,
          completionStatus: form.completionStatus || null,
          schoolName: form.schoolName || null,
          enrollmentStatus: form.enrollmentStatus || null,
          notes: form.notes || null,
        }),
      });
      navigate(residentId ? `/admin/caseload/${residentId}` : '/admin/caseload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link to={residentId ? `/admin/caseload/${residentId}` : '/admin/caseload'} className={styles.backLink}>
        <ArrowLeft size={15} />
        Back
      </Link>

      <h1 className={styles.title}>Update Education Record</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Record Details ──────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Record Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>
                Resident <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={form.residentId}
                onChange={e => updateField('residentId', e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select resident...</option>
                {residents.map(r => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.internalCode ?? `#${r.residentId}`}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Record Date</label>
              <input
                type="date"
                className={styles.input}
                value={form.recordDate}
                onChange={e => updateField('recordDate', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>School Name</label>
              <input
                type="text"
                className={styles.input}
                value={form.schoolName}
                onChange={e => updateField('schoolName', e.target.value)}
                placeholder="Name of school"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Education Level</label>
              <select
                className={styles.select}
                value={form.educationLevel}
                onChange={e => updateField('educationLevel', e.target.value)}
              >
                <option value="">Select level...</option>
                <option value="Bridge Program">Bridge Program</option>
                <option value="Secondary Support">Secondary Support</option>
                <option value="Vocational Skills">Vocational Skills</option>
                <option value="Literacy Boost">Literacy Boost</option>
                <option value="Elementary">Elementary</option>
                <option value="High School">High School</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Enrollment Status</label>
              <select
                className={styles.select}
                value={form.enrollmentStatus}
                onChange={e => updateField('enrollmentStatus', e.target.value)}
              >
                <option value="">Select status...</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Not Enrolled">Not Enrolled</option>
                <option value="Graduated">Graduated</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Completion Status</label>
              <select
                className={styles.select}
                value={form.completionStatus}
                onChange={e => updateField('completionStatus', e.target.value)}
              >
                <option value="">Select status...</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Dropped">Dropped</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Progress & Performance ──────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Progress & Performance</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Attendance Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={styles.input}
                value={form.attendanceRate}
                onChange={e => updateField('attendanceRate', e.target.value)}
                placeholder="0 – 100"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={styles.input}
                value={form.progressPercent}
                onChange={e => updateField('progressPercent', e.target.value)}
                placeholder="0 – 100"
              />
            </div>
          </div>
        </div>

        {/* ── Notes ───────────────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Notes</h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Additional Notes</label>
              <textarea
                className={styles.textarea}
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
                placeholder="Any additional notes about the education record..."
              />
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────── */}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Education Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

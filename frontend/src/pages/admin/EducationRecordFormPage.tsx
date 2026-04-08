import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import styles from './VisitationFormPage.module.css';

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
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const residentId = params.get('residentId');

  const [form, setForm] = useState<FormData>({ ...emptyForm, residentId: residentId ? Number(residentId) : '' });
  const [residents, setResidents] = useState<{ residentId: number; internalCode: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<any>('/api/admin/residents-list')
      .then(data => setResidents(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  function handleChange(field: keyof FormData, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.residentId) { setError('Resident is required.'); return; }
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
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className={styles.title}>Update Education Record</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          <label className={styles.label}>
            Resident *
            <select className={styles.select} value={form.residentId} onChange={e => handleChange('residentId', e.target.value ? Number(e.target.value) : '')} required>
              <option value="">Select resident</option>
              {residents.map(r => <option key={r.residentId} value={r.residentId}>{r.internalCode}</option>)}
            </select>
          </label>
          <label className={styles.label}>
            Record Date
            <input type="date" className={styles.input} value={form.recordDate} onChange={e => handleChange('recordDate', e.target.value)} />
          </label>
          <label className={styles.label}>
            Education Level
            <select className={styles.select} value={form.educationLevel} onChange={e => handleChange('educationLevel', e.target.value)}>
              <option value="">Select</option>
              <option value="Bridge Program">Bridge Program</option>
              <option value="Secondary Support">Secondary Support</option>
              <option value="Vocational Skills">Vocational Skills</option>
              <option value="Literacy Boost">Literacy Boost</option>
              <option value="Elementary">Elementary</option>
              <option value="High School">High School</option>
            </select>
          </label>
          <label className={styles.label}>
            School Name
            <input className={styles.input} value={form.schoolName} onChange={e => handleChange('schoolName', e.target.value)} placeholder="School name" />
          </label>
          <label className={styles.label}>
            Attendance Rate (%)
            <input type="number" min="0" max="100" step="0.1" className={styles.input} value={form.attendanceRate} onChange={e => handleChange('attendanceRate', e.target.value)} placeholder="0-100" />
          </label>
          <label className={styles.label}>
            Progress (%)
            <input type="number" min="0" max="100" step="0.1" className={styles.input} value={form.progressPercent} onChange={e => handleChange('progressPercent', e.target.value)} placeholder="0-100" />
          </label>
          <label className={styles.label}>
            Completion Status
            <select className={styles.select} value={form.completionStatus} onChange={e => handleChange('completionStatus', e.target.value)}>
              <option value="">Select</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Dropped">Dropped</option>
              <option value="On Hold">On Hold</option>
            </select>
          </label>
          <label className={styles.label}>
            Enrollment Status
            <select className={styles.select} value={form.enrollmentStatus} onChange={e => handleChange('enrollmentStatus', e.target.value)}>
              <option value="">Select</option>
              <option value="Enrolled">Enrolled</option>
              <option value="Not Enrolled">Not Enrolled</option>
              <option value="Graduated">Graduated</option>
              <option value="Transferred">Transferred</option>
            </select>
          </label>
        </div>

        <label className={styles.label} style={{ marginTop: '0.75rem' }}>
          Notes
          <textarea className={styles.textarea} rows={3} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Additional notes..." />
        </label>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Education Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Dropdown from '../../components/admin/Dropdown';
import DatePicker from '../../components/admin/DatePicker';
import TextArea from '../../components/admin/TextArea';
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
  useDocumentTitle('Education Record');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const residentId = params.get('residentId');
  const taskId = params.get('taskId');
  const fromCalendar = Boolean(taskId);

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
          attendanceRate: form.attendanceRate ? Number(form.attendanceRate) / 100 : null,
          progressPercent: form.progressPercent ? Number(form.progressPercent) : null,
          completionStatus: form.completionStatus || null,
          schoolName: form.schoolName || null,
          enrollmentStatus: form.enrollmentStatus || null,
          notes: form.notes || null,
        }),
      });
      if (taskId) {
        await apiFetch(`/api/staff/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'Completed' }),
        }).catch(() => {});
      }
      navigate(fromCalendar ? '/admin' : residentId ? `/admin/caseload/${residentId}` : '/admin/caseload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <Link to={fromCalendar ? '/admin' : residentId ? `/admin/caseload/${residentId}` : '/admin/caseload'} className={styles.backLink}>
        <ArrowLeft size={16} /> {fromCalendar ? 'Back to Calendar' : 'Back'}
      </Link>
      <h1 className={styles.title}>Update Education Record</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Student Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <div className={styles.label}>Resident <span className={styles.required}>*</span></div>
              <Dropdown
                value={String(form.residentId)}
                placeholder="Select resident"
                options={residents.map(r => ({ value: String(r.residentId), label: r.internalCode }))}
                onChange={v => handleChange('residentId', v ? Number(v) : '')}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Record Date</div>
              <DatePicker value={form.recordDate} onChange={v => handleChange('recordDate', v)} placeholder="Select date..." />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Education Level</div>
              <Dropdown
                value={form.educationLevel}
                placeholder="Select level"
                options={[
                  { value: 'Bridge Program', label: 'Bridge Program' },
                  { value: 'Secondary Support', label: 'Secondary Support' },
                  { value: 'Vocational Skills', label: 'Vocational Skills' },
                  { value: 'Literacy Boost', label: 'Literacy Boost' },
                  { value: 'Elementary', label: 'Elementary' },
                  { value: 'High School', label: 'High School' },
                ]}
                onChange={v => handleChange('educationLevel', v)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>School Name</label>
              <input className={styles.input} value={form.schoolName} onChange={e => handleChange('schoolName', e.target.value)} placeholder="School name" />
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Progress & Status</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Attendance Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" className={styles.input} value={form.attendanceRate} onChange={e => handleChange('attendanceRate', e.target.value)} placeholder="0–100" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Progress (%)</label>
              <input type="number" min="0" max="100" step="0.1" className={styles.input} value={form.progressPercent} onChange={e => handleChange('progressPercent', e.target.value)} placeholder="0–100" />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Completion Status</div>
              <Dropdown
                value={form.completionStatus}
                placeholder="Select status"
                options={[
                  { value: 'In Progress', label: 'In Progress' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Dropped', label: 'Dropped' },
                  { value: 'On Hold', label: 'On Hold' },
                ]}
                onChange={v => handleChange('completionStatus', v)}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Enrollment Status</div>
              <Dropdown
                value={form.enrollmentStatus}
                placeholder="Select status"
                options={[
                  { value: 'Enrolled', label: 'Enrolled' },
                  { value: 'Not Enrolled', label: 'Not Enrolled' },
                  { value: 'Graduated', label: 'Graduated' },
                  { value: 'Transferred', label: 'Transferred' },
                ]}
                onChange={v => handleChange('enrollmentStatus', v)}
              />
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Notes</h2>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Additional Notes</label>
            <TextArea className={styles.textarea} rows={3} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(fromCalendar ? '/admin' : -1 as any)}>Cancel</button>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Education Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

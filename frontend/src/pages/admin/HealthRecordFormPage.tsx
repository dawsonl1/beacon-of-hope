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
  weightKg: string;
  heightCm: string;
  bmi: string;
  nutritionScore: string;
  sleepQualityScore: string;
  energyLevelScore: string;
  generalHealthScore: string;
  medicalCheckupDone: boolean;
  dentalCheckupDone: boolean;
  psychologicalCheckupDone: boolean;
  notes: string;
}

const emptyForm: FormData = {
  residentId: '',
  recordDate: APP_TODAY_STR,
  weightKg: '', heightCm: '', bmi: '',
  nutritionScore: '', sleepQualityScore: '', energyLevelScore: '', generalHealthScore: '',
  medicalCheckupDone: false, dentalCheckupDone: false, psychologicalCheckupDone: false,
  notes: '',
};

const SCORE_OPTIONS = [
  { value: '1', label: '1 — Poor' },
  { value: '2', label: '2 — Fair' },
  { value: '3', label: '3 — Average' },
  { value: '4', label: '4 — Good' },
  { value: '5', label: '5 — Excellent' },
];

const CHECKUP_FIELDS = [
  { key: 'medicalCheckupDone' as const, label: 'Medical Checkup Done' },
  { key: 'dentalCheckupDone' as const, label: 'Dental Checkup Done' },
  { key: 'psychologicalCheckupDone' as const, label: 'Psychological Checkup Done' },
];

export default function HealthRecordFormPage() {
  useDocumentTitle('Health Record');
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

  // Auto-calculate BMI
  useEffect(() => {
    const w = parseFloat(form.weightKg);
    const h = parseFloat(form.heightCm);
    if (w > 0 && h > 0) {
      const bmi = (w / ((h / 100) ** 2)).toFixed(1);
      setForm(prev => ({ ...prev, bmi }));
    }
  }, [form.weightKg, form.heightCm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.residentId) { setError('Resident is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiFetch('/api/admin/health-records', {
        method: 'POST',
        body: JSON.stringify({
          residentId: Number(form.residentId),
          recordDate: form.recordDate || null,
          weightKg: form.weightKg ? Number(form.weightKg) : null,
          heightCm: form.heightCm ? Number(form.heightCm) : null,
          bmi: form.bmi ? Number(form.bmi) : null,
          nutritionScore: form.nutritionScore ? Number(form.nutritionScore) : null,
          sleepQualityScore: form.sleepQualityScore ? Number(form.sleepQualityScore) : null,
          energyLevelScore: form.energyLevelScore ? Number(form.energyLevelScore) : null,
          generalHealthScore: form.generalHealthScore ? Number(form.generalHealthScore) : null,
          medicalCheckupDone: form.medicalCheckupDone,
          dentalCheckupDone: form.dentalCheckupDone,
          psychologicalCheckupDone: form.psychologicalCheckupDone,
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
      <h1 className={styles.title}>Input Health Record</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Resident & Date</h2>
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
          </div>
        </div>

        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Measurements</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Weight (kg)</label>
              <input type="number" step="0.1" className={styles.input} value={form.weightKg} onChange={e => handleChange('weightKg', e.target.value)} placeholder="kg" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Height (cm)</label>
              <input type="number" step="0.1" className={styles.input} value={form.heightCm} onChange={e => handleChange('heightCm', e.target.value)} placeholder="cm" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>BMI (auto-calculated)</label>
              <input type="text" className={`${styles.input} ${styles.readonlyInput}`} value={form.bmi} readOnly tabIndex={-1} />
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Health Scores</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <div className={styles.label}>Nutrition</div>
              <Dropdown value={form.nutritionScore} placeholder="Select score" options={SCORE_OPTIONS} onChange={v => handleChange('nutritionScore', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Sleep Quality</div>
              <Dropdown value={form.sleepQualityScore} placeholder="Select score" options={SCORE_OPTIONS} onChange={v => handleChange('sleepQualityScore', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Energy Level</div>
              <Dropdown value={form.energyLevelScore} placeholder="Select score" options={SCORE_OPTIONS} onChange={v => handleChange('energyLevelScore', v)} />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>General Health</div>
              <Dropdown value={form.generalHealthScore} placeholder="Select score" options={SCORE_OPTIONS} onChange={v => handleChange('generalHealthScore', v)} />
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Checkups Completed</h2>
          <div className={styles.toggleList}>
            {CHECKUP_FIELDS.map(({ key, label }) => (
              <div key={key} className={styles.toggleRow}>
                <button type="button" className={`${styles.toggle} ${form[key] ? styles.toggleActive : ''}`} onClick={() => handleChange(key, !form[key])} />
                <div className={styles.toggleLabel}>{label}</div>
              </div>
            ))}
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
            {saving ? 'Saving...' : 'Save Health Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

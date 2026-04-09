import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Dropdown from '../../components/admin/Dropdown';
import DatePicker from '../../components/admin/DatePicker';
import TextArea from '../../components/admin/TextArea';
import Checkbox from '../../components/admin/Checkbox';
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
              <input type="number" step="0.1" className={styles.input} value={form.bmi} readOnly style={{ background: 'var(--surface-2)', opacity: 0.7 }} />
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Health Scores (1-5)</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Nutrition Score</label>
              <input type="number" min="1" max="5" step="0.1" className={styles.input} value={form.nutritionScore} onChange={e => handleChange('nutritionScore', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Sleep Quality</label>
              <input type="number" min="1" max="5" step="0.1" className={styles.input} value={form.sleepQualityScore} onChange={e => handleChange('sleepQualityScore', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Energy Level</label>
              <input type="number" min="1" max="5" step="0.1" className={styles.input} value={form.energyLevelScore} onChange={e => handleChange('energyLevelScore', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>General Health</label>
              <input type="number" min="1" max="5" step="0.1" className={styles.input} value={form.generalHealthScore} onChange={e => handleChange('generalHealthScore', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Checkups</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Checkbox checked={form.medicalCheckupDone} onChange={v => handleChange('medicalCheckupDone', v)} label="Medical Checkup Done" />
            <Checkbox checked={form.dentalCheckupDone} onChange={v => handleChange('dentalCheckupDone', v)} label="Dental Checkup Done" />
            <Checkbox checked={form.psychologicalCheckupDone} onChange={v => handleChange('psychologicalCheckupDone', v)} label="Psychological Checkup Done" />
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
            {saving ? 'Saving...' : 'Save Health Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

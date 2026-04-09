import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
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
      <h1 className={styles.title}>Input Health Record</h1>

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
            Weight (kg)
            <input type="number" step="0.1" className={styles.input} value={form.weightKg} onChange={e => handleChange('weightKg', e.target.value)} placeholder="kg" />
          </label>
          <label className={styles.label}>
            Height (cm)
            <input type="number" step="0.1" className={styles.input} value={form.heightCm} onChange={e => handleChange('heightCm', e.target.value)} placeholder="cm" />
          </label>
          <label className={styles.label}>
            BMI (auto-calculated)
            <input type="number" step="0.1" className={styles.input} value={form.bmi} readOnly style={{ background: '#f5f5f5' }} />
          </label>
          <label className={styles.label}>
            Nutrition Score (1-10)
            <input type="number" min="1" max="10" step="0.1" className={styles.input} value={form.nutritionScore} onChange={e => handleChange('nutritionScore', e.target.value)} />
          </label>
          <label className={styles.label}>
            Sleep Quality (1-10)
            <input type="number" min="1" max="10" step="0.1" className={styles.input} value={form.sleepQualityScore} onChange={e => handleChange('sleepQualityScore', e.target.value)} />
          </label>
          <label className={styles.label}>
            Energy Level (1-10)
            <input type="number" min="1" max="10" step="0.1" className={styles.input} value={form.energyLevelScore} onChange={e => handleChange('energyLevelScore', e.target.value)} />
          </label>
          <label className={styles.label}>
            General Health (1-10)
            <input type="number" min="1" max="10" step="0.1" className={styles.input} value={form.generalHealthScore} onChange={e => handleChange('generalHealthScore', e.target.value)} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.medicalCheckupDone} onChange={e => handleChange('medicalCheckupDone', e.target.checked)} />
            Medical Checkup Done
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.dentalCheckupDone} onChange={e => handleChange('dentalCheckupDone', e.target.checked)} />
            Dental Checkup Done
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.psychologicalCheckupDone} onChange={e => handleChange('psychologicalCheckupDone', e.target.checked)} />
            Psychological Checkup Done
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
            {saving ? 'Saving...' : 'Save Health Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

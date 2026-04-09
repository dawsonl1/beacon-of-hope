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
    if (!form.residentId) { setError('Please select a resident.'); return; }
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
        <ArrowLeft size={15} />
        Back
      </Link>

      <h1 className={styles.title}>Input Health Record</h1>

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
          </div>
        </div>

        {/* ── Physical Measurements ──────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Physical Measurements</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                className={styles.input}
                value={form.weightKg}
                onChange={e => updateField('weightKg', e.target.value)}
                placeholder="kg"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Height (cm)</label>
              <input
                type="number"
                step="0.1"
                className={styles.input}
                value={form.heightCm}
                onChange={e => updateField('heightCm', e.target.value)}
                placeholder="cm"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>BMI (auto-calculated)</label>
              <input
                type="number"
                step="0.1"
                className={styles.input}
                value={form.bmi}
                readOnly
                style={{ background: '#f5f5f5' }}
              />
            </div>
          </div>
        </div>

        {/* ── Wellness Scores ────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Wellness Scores</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Nutrition (1–10)</label>
              <input
                type="number"
                min="1" max="10" step="0.1"
                className={styles.input}
                value={form.nutritionScore}
                onChange={e => updateField('nutritionScore', e.target.value)}
                placeholder="1 – 10"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Sleep Quality (1–10)</label>
              <input
                type="number"
                min="1" max="10" step="0.1"
                className={styles.input}
                value={form.sleepQualityScore}
                onChange={e => updateField('sleepQualityScore', e.target.value)}
                placeholder="1 – 10"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Energy Level (1–10)</label>
              <input
                type="number"
                min="1" max="10" step="0.1"
                className={styles.input}
                value={form.energyLevelScore}
                onChange={e => updateField('energyLevelScore', e.target.value)}
                placeholder="1 – 10"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>General Health (1–10)</label>
              <input
                type="number"
                min="1" max="10" step="0.1"
                className={styles.input}
                value={form.generalHealthScore}
                onChange={e => updateField('generalHealthScore', e.target.value)}
                placeholder="1 – 10"
              />
            </div>
          </div>
        </div>

        {/* ── Checkups ───────────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Checkups Completed</h2>

          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggle} ${form.medicalCheckupDone ? styles.toggleActive : ''}`}
              onClick={() => updateField('medicalCheckupDone', !form.medicalCheckupDone)}
            />
            <div>
              <div className={styles.toggleLabel}>Medical Checkup</div>
              <div className={styles.toggleSub}>General medical examination completed</div>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggle} ${form.dentalCheckupDone ? styles.toggleActive : ''}`}
              onClick={() => updateField('dentalCheckupDone', !form.dentalCheckupDone)}
            />
            <div>
              <div className={styles.toggleLabel}>Dental Checkup</div>
              <div className={styles.toggleSub}>Dental examination completed</div>
            </div>
          </div>

          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggle} ${form.psychologicalCheckupDone ? styles.toggleActive : ''}`}
              onClick={() => updateField('psychologicalCheckupDone', !form.psychologicalCheckupDone)}
            />
            <div>
              <div className={styles.toggleLabel}>Psychological Checkup</div>
              <div className={styles.toggleSub}>Psychological assessment completed</div>
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
                placeholder="Any additional notes about the health record..."
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
            {saving ? 'Saving...' : 'Save Health Record'}
          </button>
        </div>
      </form>
    </div>
  );
}

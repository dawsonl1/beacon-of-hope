import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { INCIDENT_TYPES, SEVERITY_LEVELS } from '../../domain';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './VisitationFormPage.module.css';

interface ResidentOption {
  residentId: number;
  internalCode: string | null;
}

interface FormData {
  residentId: number | '';
  safehouseId: number | '';
  incidentDate: string;
  incidentType: string;
  severity: string;
  description: string;
  responseTaken: string;
  reportedBy: string;
  resolved: boolean;
  resolutionDate: string;
  followUpRequired: boolean;
}

const emptyForm: FormData = {
  residentId: '',
  safehouseId: '',
  incidentDate: APP_TODAY_STR,
  incidentType: '',
  severity: 'Medium',
  description: '',
  responseTaken: '',
  reportedBy: '',
  resolved: false,
  resolutionDate: '',
  followUpRequired: false,
};

export default function IncidentFormPage() {
  useDocumentTitle('Incident Form');
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { activeSafehouseId, safehouses } = useSafehouse();

  const [form, setForm] = useState<FormData>({ ...emptyForm, safehouseId: activeSafehouseId || '' });
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ResidentOption[] | { items: ResidentOption[] }>('/api/admin/residents-list')
      .then(data => setResidents(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    apiFetch<any>(`/api/admin/incidents/${id}`)
      .then(data => {
        setForm({
          residentId: data.residentId ?? '',
          safehouseId: data.safehouseId ?? '',
          incidentDate: data.incidentDate ?? '',
          incidentType: data.incidentType ?? '',
          severity: data.severity ?? 'Medium',
          description: data.description ?? '',
          responseTaken: data.responseTaken ?? '',
          reportedBy: data.reportedBy ?? '',
          resolved: data.resolved ?? false,
          resolutionDate: data.resolutionDate ?? '',
          followUpRequired: data.followUpRequired ?? false,
        });
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load incident'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.incidentDate) { setError('Please enter an incident date.'); return; }
    if (!form.incidentType) { setError('Please select an incident type.'); return; }
    if (!form.description) { setError('Please enter a description.'); return; }

    setSaving(true);
    try {
      const payload = {
        residentId: form.residentId || null,
        safehouseId: form.safehouseId || null,
        incidentDate: form.incidentDate || null,
        incidentType: form.incidentType || null,
        severity: form.severity || null,
        description: form.description || null,
        responseTaken: form.responseTaken || null,
        reportedBy: form.reportedBy || null,
        resolved: form.resolved,
        resolutionDate: form.resolutionDate || null,
        followUpRequired: form.followUpRequired,
      };

      if (isEdit) {
        await apiFetch(`/api/admin/incidents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        navigate(`/admin/incidents/${id}`);
      } else {
        const result = await apiFetch<{ incidentId: number }>('/api/admin/incidents', { method: 'POST', body: JSON.stringify(payload) });
        navigate(`/admin/incidents/${result.incidentId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/admin/incidents" className={styles.backLink}>
        <ArrowLeft size={15} />
        Back to Incidents
      </Link>

      <h1 className={styles.title}>
        {isEdit ? 'Edit Incident' : 'Report Incident'}
      </h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Incident Details ──────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Incident Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Resident</label>
              <select
                className={styles.select}
                value={form.residentId}
                onChange={e => updateField('residentId', e.target.value ? Number(e.target.value) : '')}
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
              <label className={styles.label}>Safehouse</label>
              <select
                className={styles.select}
                value={form.safehouseId}
                onChange={e => updateField('safehouseId', e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Select safehouse...</option>
                {safehouses.map(s => (
                  <option key={s.safehouseId} value={s.safehouseId}>
                    {s.safehouseCode} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Incident Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                className={styles.input}
                value={form.incidentDate}
                onChange={e => updateField('incidentDate', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Incident Type <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={form.incidentType}
                onChange={e => updateField('incidentType', e.target.value)}
                required
              >
                <option value="">Select type...</option>
                {INCIDENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Severity <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={form.severity}
                onChange={e => updateField('severity', e.target.value)}
                required
              >
                {SEVERITY_LEVELS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reported By</label>
              <input
                type="text"
                className={styles.input}
                value={form.reportedBy}
                onChange={e => updateField('reportedBy', e.target.value)}
                placeholder="Staff name"
              />
            </div>
          </div>
        </div>

        {/* ── Description & Response ────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Description & Response</h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>
                Description <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Describe the incident in detail..."
                required
                style={{ minHeight: '140px' }}
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Response Taken</label>
              <textarea
                className={styles.textarea}
                value={form.responseTaken}
                onChange={e => updateField('responseTaken', e.target.value)}
                placeholder="What actions were taken in response?"
              />
            </div>
          </div>
        </div>

        {/* ── Resolution & Follow-Up ───────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Resolution & Follow-Up</h2>

          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggle} ${form.resolved ? styles.toggleActive : ''}`}
              onClick={() => updateField('resolved', !form.resolved)}
            />
            <div>
              <div className={styles.toggleLabel}>Resolved</div>
              <div className={styles.toggleSub}>
                Mark if this incident has been fully resolved
              </div>
            </div>
          </div>

          {form.resolved && (
            <div className={styles.field} style={{ marginTop: '0.75rem', maxWidth: '280px' }}>
              <label className={styles.label}>Resolution Date</label>
              <input
                type="date"
                className={styles.input}
                value={form.resolutionDate}
                onChange={e => updateField('resolutionDate', e.target.value)}
              />
            </div>
          )}

          <div className={styles.toggleRow} style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className={`${styles.toggle} ${form.followUpRequired ? styles.toggleActive : ''}`}
              onClick={() => updateField('followUpRequired', !form.followUpRequired)}
            />
            <div>
              <div className={styles.toggleLabel}>Follow-Up Required</div>
              <div className={styles.toggleSub}>
                Flag if further action or monitoring is needed
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────── */}
        <div className={styles.actions}>
          <Link to="/admin/incidents" className={styles.cancelBtn}>
            Cancel
          </Link>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Incident' : 'Report Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}

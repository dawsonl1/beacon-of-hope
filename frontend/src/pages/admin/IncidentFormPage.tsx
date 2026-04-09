import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Shield } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY_STR } from '../../constants';
import { INCIDENT_TYPES, SEVERITY_LEVELS } from '../../domain';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Dropdown from '../../components/admin/Dropdown';
import DatePicker from '../../components/admin/DatePicker';
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
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const { activeSafehouseId, safehouses } = useSafehouse();

  const presetResidentId = searchParams.get('residentId');
  const [form, setForm] = useState<FormData>({
    ...emptyForm,
    safehouseId: activeSafehouseId || '',
    residentId: presetResidentId ? Number(presetResidentId) : '',
  });
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<ResidentOption[] | { items: ResidentOption[] }>('/api/admin/residents-list')
      .then(data => setResidents(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
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
        .catch(e => setError(e instanceof Error ? e.message : 'Failed to load incident'));
    }
  }, [id, isEdit]);

  function handleChange(field: keyof FormData, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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

  const severityColor: Record<string, string> = {
    Critical: '#c0392b', High: '#d35400', Medium: '#f39c12', Low: '#27ae60',
  };

  return (
    <div className={styles.page}>
      <Link to="/admin/incidents" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Incidents
      </Link>
      <h1 className={styles.title}>{isEdit ? 'Edit Incident' : 'Report Incident'}</h1>

      <form onSubmit={handleSubmit}>
        {/* ── Incident Details ─────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Incident Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <div className={styles.label}>Resident</div>
              <Dropdown
                value={String(form.residentId)}
                placeholder="Select resident..."
                options={residents.map(r => ({ value: String(r.residentId), label: r.internalCode ?? `#${r.residentId}` }))}
                onChange={v => handleChange('residentId', v ? Number(v) : '')}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Safehouse</div>
              <Dropdown
                value={String(form.safehouseId)}
                placeholder="Select safehouse..."
                options={safehouses.map(s => ({ value: String(s.safehouseId), label: `${s.safehouseCode} — ${s.name}` }))}
                onChange={v => handleChange('safehouseId', v ? Number(v) : '')}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>
                Incident Date <span className={styles.required}>*</span>
              </div>
              <DatePicker value={form.incidentDate} onChange={v => handleChange('incidentDate', v)} placeholder="Select date..." required />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>
                Incident Type <span className={styles.required}>*</span>
              </div>
              <Dropdown
                value={form.incidentType}
                placeholder="Select type..."
                options={INCIDENT_TYPES.map(t => ({ value: t, label: t }))}
                onChange={v => handleChange('incidentType', v)}
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>
                Severity <span className={styles.required}>*</span>
              </div>
              <Dropdown
                value={form.severity}
                placeholder="Select severity..."
                options={SEVERITY_LEVELS.map(s => ({ value: s, label: s }))}
                onChange={v => handleChange('severity', v)}
              />
              {form.severity && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: severityColor[form.severity] || 'inherit', marginTop: '0.2rem' }}>
                  {form.severity === 'Critical' ? 'Immediate action required' :
                   form.severity === 'High' ? 'Urgent attention needed' :
                   form.severity === 'Medium' ? 'Monitor closely' : 'Low priority'}
                </span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Reported By</label>
              <input className={styles.input} value={form.reportedBy} onChange={e => handleChange('reportedBy', e.target.value)} placeholder="Staff name" />
            </div>
          </div>
        </div>

        {/* ── Description & Response ───────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Description & Response</h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>
                Description <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                rows={4}
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                required
                placeholder="Describe what happened, when, and who was involved..."
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Response Taken</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={form.responseTaken}
                onChange={e => handleChange('responseTaken', e.target.value)}
                placeholder="What actions were taken in response to this incident?"
              />
            </div>
          </div>
        </div>

        {/* ── Resolution & Follow-up ──────────────── */}
        <div className={styles.formCard}>
          <div className={styles.safetySection}>
            <div className={styles.safetySectionHeader}>
              <Shield size={16} /> Resolution & Follow-up
            </div>

            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggle} ${form.resolved ? styles.toggleActive : ''}`}
                onClick={() => handleChange('resolved', !form.resolved)}
              />
              <div>
                <div className={styles.toggleLabel}>Resolved</div>
                <div className={styles.toggleSub}>Has this incident been fully resolved?</div>
              </div>
            </div>

            {form.resolved && (
              <div className={styles.field} style={{ maxWidth: '250px', marginBottom: '0.75rem' }}>
                <div className={styles.label}>Resolution Date</div>
                <DatePicker value={form.resolutionDate} onChange={v => handleChange('resolutionDate', v)} placeholder="Select date..." />
              </div>
            )}

            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggle} ${form.followUpRequired ? styles.toggleDanger : ''}`}
                onClick={() => handleChange('followUpRequired', !form.followUpRequired)}
              />
              <div>
                <div className={styles.toggleLabel}>Follow-up Required</div>
                <div className={styles.toggleSub}>A to-do task will be created for the assigned social worker</div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className={styles.error} role="alert"><AlertTriangle size={14} /> {error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate('/admin/incidents')}>Cancel</button>
          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Incident' : 'Report Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}

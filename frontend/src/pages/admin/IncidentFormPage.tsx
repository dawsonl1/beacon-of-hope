import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

  return (
    <div className={styles.page}>
      <Link to="/admin/incidents" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Incidents
      </Link>
      <h1 className={styles.title}>{isEdit ? 'Edit Incident' : 'Report Incident'}</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          <label className={styles.label}>
            Resident
            <select className={styles.select} value={form.residentId} onChange={e => handleChange('residentId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select resident</option>
              {residents.map(r => (
                <option key={r.residentId} value={r.residentId}>{r.internalCode}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Safehouse
            <select className={styles.select} value={form.safehouseId} onChange={e => handleChange('safehouseId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select safehouse</option>
              {safehouses.map(s => (
                <option key={s.safehouseId} value={s.safehouseId}>{s.safehouseCode} - {s.name}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Incident Date *
            <input type="date" className={styles.input} value={form.incidentDate} onChange={e => handleChange('incidentDate', e.target.value)} required />
          </label>

          <label className={styles.label}>
            Incident Type *
            <select className={styles.select} value={form.incidentType} onChange={e => handleChange('incidentType', e.target.value)} required>
              <option value="">Select type</option>
              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className={styles.label}>
            Severity *
            <select className={styles.select} value={form.severity} onChange={e => handleChange('severity', e.target.value)} required>
              {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className={styles.label}>
            Reported By
            <input className={styles.input} value={form.reportedBy} onChange={e => handleChange('reportedBy', e.target.value)} placeholder="Staff name" />
          </label>
        </div>

        <label className={styles.label} style={{ marginTop: '1rem' }}>
          Description *
          <textarea className={styles.textarea} rows={4} value={form.description} onChange={e => handleChange('description', e.target.value)} required placeholder="Describe the incident..." />
        </label>

        <label className={styles.label} style={{ marginTop: '0.75rem' }}>
          Response Taken
          <textarea className={styles.textarea} rows={3} value={form.responseTaken} onChange={e => handleChange('responseTaken', e.target.value)} placeholder="What actions were taken?" />
        </label>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem' }}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.resolved} onChange={e => handleChange('resolved', e.target.checked)} />
            Resolved
          </label>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.followUpRequired} onChange={e => handleChange('followUpRequired', e.target.checked)} />
            Follow-up Required
          </label>
        </div>

        {form.resolved && (
          <label className={styles.label} style={{ marginTop: '0.75rem', maxWidth: '300px' }}>
            Resolution Date
            <input type="date" className={styles.input} value={form.resolutionDate} onChange={e => handleChange('resolutionDate', e.target.value)} />
          </label>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate('/admin/incidents')}>Cancel</button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Incident' : 'Report Incident'}
          </button>
        </div>
      </form>
    </div>
  );
}

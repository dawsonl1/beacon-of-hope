import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { SUPPORTER_TYPES, SUPPORTER_STATUSES, ACQUISITION_CHANNELS } from '../../domain';
import styles from './SupporterFormPage.module.css';

const STATUSES = SUPPORTER_STATUSES;
const CHANNELS = ACQUISITION_CHANNELS;

interface FormData {
  supporterType: string;
  displayName: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  region: string;
  country: string;
  status: string;
  acquisitionChannel: string;
}

const blank: FormData = {
  supporterType: '',
  displayName: '',
  organizationName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  region: '',
  country: '',
  status: 'Active',
  acquisitionChannel: '',
};

export default function SupporterFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>(blank);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    apiFetch<{ supporter: Record<string, unknown> }>(`/api/admin/supporters/${id}`)
      .then(data => {
        const s = data.supporter;
        setForm({
          supporterType: (s.supporterType as string) ?? '',
          displayName: (s.displayName as string) ?? '',
          organizationName: (s.organizationName as string) ?? '',
          firstName: (s.firstName as string) ?? '',
          lastName: (s.lastName as string) ?? '',
          email: (s.email as string) ?? '',
          phone: (s.phone as string) ?? '',
          region: (s.region as string) ?? '',
          country: (s.country as string) ?? '',
          status: (s.status as string) ?? 'Active',
          acquisitionChannel: (s.acquisitionChannel as string) ?? '',
        });
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.supporterType) {
      setError('Please select a supporter type.');
      return;
    }
    if (!form.displayName && !form.firstName) {
      setError('Please provide a display name or first name.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        displayName: form.displayName || `${form.firstName} ${form.lastName}`.trim() || null,
      };
      if (isEdit) {
        await apiFetch(`/api/admin/supporters/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        navigate(`/admin/donors/${id}`);
      } else {
        const result = await apiFetch<{ supporterId: number }>('/api/admin/supporters', { method: 'POST', body: JSON.stringify(body) });
        navigate(`/admin/donors/${result.supporterId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div></div>;
  }

  return (
    <div className={styles.page}>
      <button className={styles.backLink} onClick={() => navigate(isEdit ? `/admin/donors/${id}` : '/admin/donors')}>
        <ArrowLeft size={16} /> {isEdit ? 'Back to Profile' : 'Back to Donors'}
      </button>

      <h1 className={styles.title}>{isEdit ? 'Edit Supporter' : 'New Supporter'}</h1>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={`${styles.field}`}>
            <label>Supporter Type</label>
            <select value={form.supporterType} onChange={e => set('supporterType', e.target.value)}>
              <option value="">Select type...</option>
              {SUPPORTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.field}>
            <label>First Name</label>
            <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
          </div>

          <div className={styles.field}>
            <label>Last Name</label>
            <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Display Name</label>
            <input value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Display name (auto-generated if blank)" />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Organization Name</label>
            <input value={form.organizationName} onChange={e => set('organizationName', e.target.value)} placeholder="Church, company, foundation..." />
          </div>

          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          </div>

          <div className={styles.field}>
            <label>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+63 ..." />
          </div>

          <div className={styles.field}>
            <label>Region</label>
            <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="Region" />
          </div>

          <div className={styles.field}>
            <label>Country</label>
            <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" />
          </div>

          <div className={styles.field}>
            <label>Acquisition Channel</label>
            <select value={form.acquisitionChannel} onChange={e => set('acquisitionChannel', e.target.value)}>
              <option value="">Select channel...</option>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(isEdit ? `/admin/donors/${id}` : '/admin/donors')}>
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Supporter'}
          </button>
        </div>
      </form>
    </div>
  );
}

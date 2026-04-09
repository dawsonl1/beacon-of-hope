import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import Dropdown from '../../components/admin/Dropdown';
import styles from './SupporterFormPage.module.css';

const PARTNER_TYPES = ['Organization', 'Individual'];
const ROLE_TYPES = ['SafehouseOps', 'Education', 'Evaluation', 'Logistics', 'Maintenance', 'FindSafehouse', 'Transport', 'Prospective', 'Other'];
const STATUSES = ['Active', 'Inactive', 'Prospective'];

interface FormData {
  partnerName: string;
  partnerType: string;
  roleType: string;
  contactName: string;
  email: string;
  phone: string;
  region: string;
  status: string;
  notes: string;
}

const blank: FormData = {
  partnerName: '',
  partnerType: 'Organization',
  roleType: '',
  contactName: '',
  email: '',
  phone: '',
  region: '',
  status: 'Prospective',
  notes: '',
};

export default function PartnerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>(blank);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    apiFetch<Record<string, unknown>>(`/api/admin/partners/${id}`)
      .then(p => {
        setForm({
          partnerName: (p.partnerName as string) ?? '',
          partnerType: (p.partnerType as string) ?? 'Organization',
          roleType: (p.roleType as string) ?? '',
          contactName: (p.contactName as string) ?? '',
          email: (p.email as string) ?? '',
          phone: (p.phone as string) ?? '',
          region: (p.region as string) ?? '',
          status: (p.status as string) ?? 'Prospective',
          notes: (p.notes as string) ?? '',
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

    if (!form.partnerName && !form.contactName) {
      setError('Please provide a partner name or contact name.');
      return;
    }
    if (!form.email) {
      setError('Please provide an email address.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        partnerName: form.partnerName || form.contactName,
      };
      if (isEdit) {
        await apiFetch(`/api/admin/partners/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        navigate(`/admin/partners/${id}`);
      } else {
        const result = await apiFetch<{ partnerId: number }>('/api/admin/partners', { method: 'POST', body: JSON.stringify(body) });
        navigate(`/admin/partners/${result.partnerId}`);
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
      <button className={styles.backLink} onClick={() => navigate(isEdit ? `/admin/partners/${id}` : '/admin/donors?tab=partners')}>
        <ArrowLeft size={16} /> {isEdit ? 'Back to Partner' : 'Back to Partners'}
      </button>

      <h1 className={styles.title}>{isEdit ? 'Edit Partner' : 'New Partner'}</h1>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Partner Type</label>
            <Dropdown
              value={form.partnerType}
              placeholder="Select type..."
              options={PARTNER_TYPES.map(t => ({ value: t, label: t }))}
              onChange={(v) => set('partnerType', v)}
            />
          </div>

          <div className={styles.field}>
            <label>Status</label>
            <Dropdown
              value={form.status}
              placeholder="Select status..."
              options={STATUSES.map(s => ({ value: s, label: s }))}
              onChange={(v) => set('status', v)}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Partner / Organization Name</label>
            <input value={form.partnerName} onChange={e => set('partnerName', e.target.value)} placeholder="Organization or individual name" />
          </div>

          <div className={styles.field}>
            <label>Contact Name</label>
            <input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Primary contact person" />
          </div>

          <div className={styles.field}>
            <label>Role Type</label>
            <Dropdown
              value={form.roleType}
              placeholder="Select role..."
              options={ROLE_TYPES.map(r => ({ value: r, label: r }))}
              onChange={(v) => set('roleType', v)}
            />
          </div>

          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          </div>

          <div className={styles.field}>
            <label>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (671) ..." />
          </div>

          <div className={styles.field}>
            <label>Region</label>
            <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="Region" />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." />
          </div>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(isEdit ? `/admin/partners/${id}` : '/admin/donors?tab=partners')}>
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Partner'}
          </button>
        </div>
      </form>
    </div>
  );
}

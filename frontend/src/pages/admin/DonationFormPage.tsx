import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { formatEnumLabel, APP_TODAY_STR } from '../../constants';
import { DONATION_TYPES } from '../../domain';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Dropdown from '../../components/admin/Dropdown';
import DatePicker from '../../components/admin/DatePicker';
import styles from './DonationFormPage.module.css';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

interface SupporterOption {
  supporterId: number;
  displayName: string | null;
}

interface FormData {
  supporterId: string;
  donationType: string;
  donationDate: string;
  currencyCode: string;
  amount: string;
  estimatedValue: string;
  impactUnit: string;
  isRecurring: boolean;
  campaignName: string;
  channelSource: string;
  notes: string;
}

const blank: FormData = {
  supporterId: '',
  donationType: 'Monetary',
  donationDate: APP_TODAY_STR,
  currencyCode: 'USD',
  amount: '',
  estimatedValue: '',
  impactUnit: '',
  isRecurring: false,
  campaignName: '',
  channelSource: '',
  notes: '',
};

export default function DonationFormPage() {
  useDocumentTitle('Donation Form');
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<FormData>({
    ...blank,
    supporterId: searchParams.get('supporterId') || '',
  });
  const [supporters, setSupporters] = useState<SupporterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load supporters list for dropdown
  useEffect(() => {
    apiFetch<{ items: SupporterOption[] }>('/api/admin/supporters?pageSize=500')
      .then(data => setSupporters(data.items))
      .catch(() => {});
  }, []);

  // Load existing donation for edit
  useEffect(() => {
    if (!isEdit) {
      setLoading(false);
      return;
    }
    apiFetch<{ items: Array<Record<string, unknown>> }>(`/api/admin/donations?pageSize=1000`)
      .then(data => {
        const d = data.items.find((item) => String(item.donationId) === id);
        if (d) {
          setForm({
            supporterId: d.supporterId != null ? String(d.supporterId) : '',
            donationType: (d.donationType as string) ?? 'Monetary',
            donationDate: d.donationDate ? String(d.donationDate).slice(0, 10) : '',
            currencyCode: (d.currencyCode as string) ?? 'USD',
            amount: d.amount != null ? String(d.amount) : '',
            estimatedValue: d.estimatedValue != null ? String(d.estimatedValue) : '',
            impactUnit: (d.impactUnit as string) ?? '',
            isRecurring: (d.isRecurring as boolean) ?? false,
            campaignName: (d.campaignName as string) ?? '',
            channelSource: (d.channelSource as string) ?? '',
            notes: (d.notes as string) ?? '',
          });
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set(key: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.supporterId) {
      setError('Please select a supporter.');
      return;
    }
    if (!form.donationDate) {
      setError('Please enter a donation date.');
      return;
    }
    if (form.donationType === 'Monetary' && (!form.amount || parseFloat(form.amount) <= 0)) {
      setError('Please enter an amount greater than zero for monetary donations.');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        supporterId: form.supporterId ? parseInt(form.supporterId) : null,
        donationType: form.donationType || null,
        donationDate: form.donationDate || null,
        channelSource: form.channelSource || null,
        isRecurring: form.isRecurring,
        campaignName: form.campaignName || null,
        notes: form.notes || null,
      };

      // Type-specific fields
      if (form.donationType === 'Monetary') {
        body.currencyCode = form.currencyCode || 'USD';
        body.amount = form.amount ? parseFloat(form.amount) : null;
      } else if (form.donationType === 'InKind') {
        body.impactUnit = form.impactUnit || null;
        body.estimatedValue = form.estimatedValue ? parseFloat(form.estimatedValue) : null;
      } else if (form.donationType === 'Time') {
        body.impactUnit = form.impactUnit || null;
      } else if (form.donationType === 'Skills') {
        body.impactUnit = form.impactUnit || null;
        body.estimatedValue = form.estimatedValue ? parseFloat(form.estimatedValue) : null;
      } else if (form.donationType === 'SocialMedia') {
        body.impactUnit = form.impactUnit || null;
      }

      if (isEdit) {
        await apiFetch(`/api/admin/donations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/admin/donations', { method: 'POST', body: JSON.stringify(body) });
      }
      navigate('/admin/donors?tab=donations');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div></div>;
  }

  const dt = form.donationType;

  return (
    <div className={styles.page}>
      <button className={styles.backLink} onClick={() => navigate('/admin/donors?tab=donations')}>
        <ArrowLeft size={16} /> Back to Donations
      </button>

      <h1 className={styles.title}>{isEdit ? 'Edit Donation' : 'Log Donation'}</h1>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* Supporter selector */}
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Supporter</label>
            <Dropdown
              value={form.supporterId}
              placeholder="Select supporter..."
              options={supporters.map(s => ({ value: String(s.supporterId), label: s.displayName ?? `Supporter #${s.supporterId}` }))}
              onChange={(v) => set('supporterId', v)}
            />
          </div>

          {/* Donation type */}
          <div className={styles.field}>
            <label>Donation Type</label>
            <Dropdown
              value={form.donationType}
              placeholder="Select type..."
              options={DONATION_TYPES.map(t => ({ value: t, label: formatEnumLabel(t) }))}
              onChange={(v) => set('donationType', v)}
            />
          </div>

          {/* Date */}
          <div className={styles.field}>
            <label>Date</label>
            <DatePicker value={form.donationDate} onChange={v => set('donationDate', v)} placeholder="Select date..." />
          </div>

          {/* Type-specific fields */}
          {dt === 'Monetary' && (
            <div className={styles.typeSection}>
              <div className={styles.typeSectionTitle}>Monetary Details</div>
              <div className={styles.typeSectionGrid}>
                <div className={styles.field}>
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className={styles.field}>
                  <label>Currency</label>
                  <Dropdown
                    value={form.currencyCode}
                    placeholder="Select currency..."
                    options={CURRENCIES.map(c => ({ value: c, label: c }))}
                    onChange={(v) => set('currencyCode', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {dt === 'InKind' && (
            <div className={styles.typeSection}>
              <div className={styles.typeSectionTitle}>In-Kind Details</div>
              <div className={styles.typeSectionGrid}>
                <div className={styles.field}>
                  <label>Item Description</label>
                  <input
                    value={form.impactUnit}
                    onChange={e => set('impactUnit', e.target.value)}
                    placeholder="e.g., 20 bags of rice, school supplies, used laptop..."
                  />
                </div>
                <div className={styles.field}>
                  <label>Estimated Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.estimatedValue}
                    onChange={e => set('estimatedValue', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {dt === 'Time' && (
            <div className={styles.typeSection}>
              <div className={styles.typeSectionTitle}>Time Contribution Details</div>
              <div className={styles.typeSectionGrid}>
                <div className={styles.field}>
                  <label>Impact Unit (e.g., "8 hours tutoring")</label>
                  <input
                    value={form.impactUnit}
                    onChange={e => set('impactUnit', e.target.value)}
                    placeholder="Describe the time contribution..."
                  />
                </div>
              </div>
            </div>
          )}

          {dt === 'Skills' && (
            <div className={styles.typeSection}>
              <div className={styles.typeSectionTitle}>Skills Contribution Details</div>
              <div className={styles.typeSectionGrid}>
                <div className={styles.field}>
                  <label>Impact Unit (e.g., "Legal consultation")</label>
                  <input
                    value={form.impactUnit}
                    onChange={e => set('impactUnit', e.target.value)}
                    placeholder="Describe the skills contributed..."
                  />
                </div>
                <div className={styles.field}>
                  <label>Estimated Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.estimatedValue}
                    onChange={e => set('estimatedValue', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {dt === 'SocialMedia' && (
            <div className={styles.typeSection}>
              <div className={styles.typeSectionTitle}>Social Media Advocacy Details</div>
              <div className={styles.typeSectionGrid}>
                <div className={styles.field}>
                  <label>Impact Unit (e.g., "Instagram story, 5k reach")</label>
                  <input
                    value={form.impactUnit}
                    onChange={e => set('impactUnit', e.target.value)}
                    placeholder="Describe the advocacy impact..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common fields */}
          <div className={styles.field}>
            <label>Campaign Name</label>
            <input value={form.campaignName} onChange={e => set('campaignName', e.target.value)} placeholder="Campaign name (optional)" />
          </div>

          <div className={styles.field}>
            <label>Channel Source</label>
            <input value={form.channelSource} onChange={e => set('channelSource', e.target.value)} placeholder="e.g., Website, Event, Direct" />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." />
          </div>

          {/* Recurring toggle */}
          <div className={`${styles.fieldFull}`}>
            <div className={styles.toggle}>
              <button
                type="button"
                className={`${styles.toggleSwitch} ${form.isRecurring ? styles.toggleSwitchOn : ''}`}
                onClick={() => set('isRecurring', !form.isRecurring)}
                aria-pressed={form.isRecurring}
              />
              <span className={styles.toggleLabel}>Recurring donation</span>
            </div>
          </div>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate('/admin/donors?tab=donations')}>
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Donation'}
          </button>
        </div>
      </form>
    </div>
  );
}

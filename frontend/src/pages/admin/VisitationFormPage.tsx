import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { VISIT_TYPES, COOPERATION_LEVELS } from '../../domain';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './VisitationFormPage.module.css';

interface ResidentOption {
  residentId: number;
  internalCode: string | null;
  caseStatus: string | null;
}

interface FormData {
  residentId: number | '';
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string;
  familyMembersPresent: string;
  purpose: string;
  observations: string;
  familyCooperationLevel: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string;
  visitOutcome: string;
}

const emptyForm: FormData = {
  residentId: '',
  visitDate: '',
  socialWorker: '',
  visitType: '',
  locationVisited: '',
  familyMembersPresent: '',
  purpose: '',
  observations: '',
  familyCooperationLevel: '',
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: '',
  visitOutcome: '',
};

export default function VisitationFormPage() {
  useDocumentTitle('Visitation Form');
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>(emptyForm);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load residents list
  useEffect(() => {
    apiFetch<ResidentOption[]>('/api/admin/residents-list')
      .then(setResidents)
      .catch(console.error);
  }, []);

  // Load existing visitation if editing
  useEffect(() => {
    if (!isEditing) {
      setLoading(false);
      return;
    }

    apiFetch<Record<string, unknown>>(`/api/admin/visitations/${id}`)
      .then((data) => {
        setForm({
          residentId: (data.residentId as number) ?? '',
          visitDate: (data.visitDate as string)?.slice(0, 10) ?? '',
          socialWorker: (data.socialWorker as string) ?? '',
          visitType: (data.visitType as string) ?? '',
          locationVisited: (data.locationVisited as string) ?? '',
          familyMembersPresent: (data.familyMembersPresent as string) ?? '',
          purpose: (data.purpose as string) ?? '',
          observations: (data.observations as string) ?? '',
          familyCooperationLevel: (data.familyCooperationLevel as string) ?? '',
          safetyConcernsNoted: (data.safetyConcernsNoted as boolean) ?? false,
          followUpNeeded: (data.followUpNeeded as boolean) ?? false,
          followUpNotes: (data.followUpNotes as string) ?? '',
          visitOutcome: (data.visitOutcome as string) ?? '',
        });
      })
      .catch(() => setError('Failed to load visitation.'))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.residentId) {
      setError('Please select a resident.');
      return;
    }
    if (!form.visitDate) {
      setError('Please enter a visit date.');
      return;
    }
    if (!form.visitType) {
      setError('Please select a visit type.');
      return;
    }

    setSubmitting(true);

    const payload = {
      residentId: Number(form.residentId),
      visitDate: form.visitDate || null,
      socialWorker: form.socialWorker || null,
      visitType: form.visitType || null,
      locationVisited: form.locationVisited || null,
      familyMembersPresent: form.familyMembersPresent || null,
      purpose: form.purpose || null,
      observations: form.observations || null,
      familyCooperationLevel: form.familyCooperationLevel || null,
      safetyConcernsNoted: form.safetyConcernsNoted,
      followUpNeeded: form.followUpNeeded,
      followUpNotes: form.followUpNotes || null,
      visitOutcome: form.visitOutcome || null,
    };

    try {
      if (isEditing) {
        await apiFetch(`/api/admin/visitations/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        navigate(`/admin/visitations/${id}`, { replace: true });
      } else {
        const result = await apiFetch<{ visitationId: number }>('/api/admin/visitations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        navigate(`/admin/visitations/${result.visitationId}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save visitation.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div></div>;
  }

  return (
    <div className={styles.page}>
      <Link to="/admin/visitations" className={styles.backLink}>
        <ArrowLeft size={15} />
        Back to Visitations
      </Link>

      <h1 className={styles.title}>
        {isEditing ? 'Edit Home Visitation' : 'New Home Visitation'}
      </h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Basic Info ──────────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Visit Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label}>
                Resident <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={form.residentId}
                onChange={(e) => updateField('residentId', e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select resident...</option>
                {residents.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.internalCode ?? `#${r.residentId}`} {r.caseStatus ? `(${r.caseStatus})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Visit Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                className={styles.input}
                value={form.visitDate}
                onChange={(e) => updateField('visitDate', e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Social Worker</label>
              <input
                type="text"
                className={styles.input}
                value={form.socialWorker}
                onChange={(e) => updateField('socialWorker', e.target.value)}
                placeholder="Name of social worker"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Visit Type <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={form.visitType}
                onChange={(e) => updateField('visitType', e.target.value)}
                required
              >
                <option value="">Select type...</option>
                {VISIT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Location Visited</label>
              <input
                type="text"
                className={styles.input}
                value={form.locationVisited}
                onChange={(e) => updateField('locationVisited', e.target.value)}
                placeholder="Address or location name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Family Members Present</label>
              <input
                type="text"
                className={styles.input}
                value={form.familyMembersPresent}
                onChange={(e) => updateField('familyMembersPresent', e.target.value)}
                placeholder="e.g. Mother, Grandmother"
              />
            </div>
          </div>
        </div>

        {/* ── Purpose & Observations ─────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Purpose & Observations</h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Purpose of Visit</label>
              <textarea
                className={styles.textarea}
                value={form.purpose}
                onChange={(e) => updateField('purpose', e.target.value)}
                placeholder="Describe the purpose of this visit..."
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Observations</label>
              <textarea
                className={styles.textarea}
                value={form.observations}
                onChange={(e) => updateField('observations', e.target.value)}
                placeholder="Document observations during the visit..."
                style={{ minHeight: '140px' }}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Family Cooperation Level</label>
              <select
                className={styles.select}
                value={form.familyCooperationLevel}
                onChange={(e) => updateField('familyCooperationLevel', e.target.value)}
              >
                <option value="">Select level...</option>
                {COOPERATION_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Safety Concerns ────────────────────────── */}
        <div className={styles.formCard}>
          <div className={styles.safetySection}>
            <div className={styles.safetySectionHeader}>
              <AlertTriangle size={16} />
              Safety Concerns
            </div>
            <div className={styles.toggleRow}>
              <button
                type="button"
                className={`${styles.toggle} ${form.safetyConcernsNoted ? styles.toggleDanger : ''}`}
                onClick={() => updateField('safetyConcernsNoted', !form.safetyConcernsNoted)}
              />
              <div>
                <div className={styles.toggleLabel}>Safety Concerns Noted</div>
                <div className={styles.toggleSub}>
                  Flag if any safety issues were observed during the visit
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Follow-up ──────────────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.formSection}>Follow-Up & Outcome</h2>
          <div className={styles.toggleRow}>
            <button
              type="button"
              className={`${styles.toggle} ${form.followUpNeeded ? styles.toggleActive : ''}`}
              onClick={() => updateField('followUpNeeded', !form.followUpNeeded)}
            />
            <div>
              <div className={styles.toggleLabel}>Follow-Up Needed</div>
              <div className={styles.toggleSub}>
                Mark if a follow-up visit or action is required
              </div>
            </div>
          </div>

          {form.followUpNeeded && (
            <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginTop: '0.75rem' }}>
              <label className={styles.label}>Follow-Up Notes</label>
              <textarea
                className={styles.textarea}
                value={form.followUpNotes}
                onChange={(e) => updateField('followUpNotes', e.target.value)}
                placeholder="Describe the follow-up actions needed..."
              />
            </div>
          )}

          <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginTop: '1rem' }}>
            <label className={styles.label}>Visit Outcome</label>
            <textarea
              className={styles.textarea}
              value={form.visitOutcome}
              onChange={(e) => updateField('visitOutcome', e.target.value)}
              placeholder="Summarize the outcome of this visit..."
            />
          </div>
        </div>

        {/* ── Actions ────────────────────────────────── */}
        <div className={styles.actions}>
          <Link to="/admin/visitations" className={styles.cancelBtn}>
            Cancel
          </Link>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting
              ? 'Saving...'
              : isEditing
                ? 'Update Visitation'
                : 'Create Visitation'}
          </button>
        </div>
      </form>
    </div>
  );
}

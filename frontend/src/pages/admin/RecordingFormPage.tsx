import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RecordingFormPage.module.css';

interface ResidentOption {
  residentId: number;
  internalCode: string;
}

interface RecordingData {
  recordingId: number;
  residentId: number;
  sessionDate: string | null;
  socialWorker: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  sessionNarrative: string | null;
  interventionsApplied: string | null;
  followUpActions: string | null;
  progressNoted: boolean | null;
  concernsFlagged: boolean | null;
  referralMade: boolean | null;
  notesRestricted: string | null;
}

const SESSION_TYPES = [
  'Individual Counseling',
  'Group Therapy',
  'Crisis Intervention',
  'Family Counseling',
  'Art/Play Therapy',
  'Psychoeducation',
  'Assessment',
];

const EMOTIONAL_STATES = [
  'Severe Distress',
  'Distressed',
  'Struggling',
  'Unsettled',
  'Neutral',
  'Coping',
  'Stable',
  'Good',
  'Thriving',
];

export default function RecordingFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [residentId, setResidentId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [socialWorker, setSocialWorker] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [duration, setDuration] = useState('');
  const [emotionalStart, setEmotionalStart] = useState('');
  const [emotionalEnd, setEmotionalEnd] = useState('');
  const [narrative, setNarrative] = useState('');
  const [interventions, setInterventions] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [progressNoted, setProgressNoted] = useState(false);
  const [concernsFlagged, setConcernsFlagged] = useState(false);
  const [referralMade, setReferralMade] = useState(false);

  // Pre-fill social worker name from current user
  useEffect(() => {
    if (!isEdit && user) {
      setSocialWorker(`${user.firstName} ${user.lastName}`.trim());
    }
  }, [user, isEdit]);

  // Load residents for dropdown
  useEffect(() => {
    apiFetch<Array<Record<string, unknown>>>('/api/admin/residents?page=1&pageSize=500&sortBy=code_asc')
      .then((data) => {
        setResidents(
          data.map((r) => ({
            residentId: r.residentId as number,
            internalCode: (r.internalCode as string) ?? '',
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Load existing recording for edit
  const loadRecording = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await apiFetch<RecordingData>(`/api/admin/recordings/${id}`);
      setResidentId(String(r.residentId));
      setSessionDate(r.sessionDate?.slice(0, 10) ?? '');
      setSocialWorker(r.socialWorker ?? '');
      setSessionType(r.sessionType ?? '');
      setDuration(r.sessionDurationMinutes != null ? String(r.sessionDurationMinutes) : '');
      setEmotionalStart(r.emotionalStateObserved ?? '');
      setEmotionalEnd(r.emotionalStateEnd ?? '');
      setNarrative(r.sessionNarrative ?? '');
      setInterventions(r.interventionsApplied ?? '');
      setFollowUp(r.followUpActions ?? '');
      setProgressNoted(r.progressNoted ?? false);
      setConcernsFlagged(r.concernsFlagged ?? false);
      setReferralMade(r.referralMade ?? false);
    } catch {
      setErrorMsg('Failed to load recording.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) loadRecording();
  }, [isEdit, loadRecording]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!residentId) {
      setErrorMsg('Please select a resident.');
      return;
    }
    if (!sessionDate) {
      setErrorMsg('Please enter a session date.');
      return;
    }
    if (!sessionType) {
      setErrorMsg('Please select a session type.');
      return;
    }

    setSaving(true);
    try {
      const body = {
        residentId: Number(residentId),
        sessionDate,
        socialWorker: socialWorker || null,
        sessionType: sessionType || null,
        sessionDurationMinutes: duration ? Number(duration) : null,
        emotionalStateObserved: emotionalStart || null,
        emotionalStateEnd: emotionalEnd || null,
        sessionNarrative: narrative || null,
        interventionsApplied: interventions || null,
        followUpActions: followUp || null,
        progressNoted,
        concernsFlagged,
        referralMade,
        notesRestricted: null as string | null,
      };

      if (isEdit) {
        await apiFetch(`/api/admin/recordings/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        navigate(`/admin/recordings/${id}`, { replace: true });
      } else {
        const result = await apiFetch<{ recordingId: number }>('/api/admin/recordings', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        navigate(`/admin/recordings/${result.recordingId}`, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save recording.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back */}
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate(isEdit ? `/admin/recordings/${id}` : '/admin/recordings')}
      >
        <ArrowLeft size={14} /> {isEdit ? 'Back to recording' : 'Back to recordings'}
      </button>

      {/* Header */}
      <div className={styles.header}>
        <h1>{isEdit ? 'Edit Recording' : 'New Process Recording'}</h1>
        <p className={styles.subtitle}>
          {isEdit
            ? 'Update this counseling session record.'
            : 'Document a counseling session with a resident.'}
        </p>
      </div>

      {/* Privacy Notice */}
      <div className={styles.privacyNotice}>
        <Shield size={14} />
        <span>
          This form captures confidential counseling data about minors. All entries are access-restricted.
        </span>
      </div>

      {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {/* Session Details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>
                Resident <span className={styles.required}>*</span>
              </label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
              >
                <option value="">Select resident...</option>
                {residents.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.internalCode}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>
                Session Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <div className={styles.field}>
              <label>Social Worker</label>
              <input
                type="text"
                value={socialWorker}
                onChange={(e) => setSocialWorker(e.target.value)}
                placeholder="Name of social worker"
              />
            </div>

            <div className={styles.field}>
              <label>
                Session Type <span className={styles.required}>*</span>
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                required
              >
                <option value="">Select type...</option>
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                max="480"
                placeholder="e.g. 45"
              />
            </div>
          </div>
        </div>

        {/* Emotional State */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Emotional State</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Observed at Start</label>
              <select
                value={emotionalStart}
                onChange={(e) => setEmotionalStart(e.target.value)}
              >
                <option value="">Select state...</option>
                {EMOTIONAL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Observed at End</label>
              <select
                value={emotionalEnd}
                onChange={(e) => setEmotionalEnd(e.target.value)}
              >
                <option value="">Select state...</option>
                {EMOTIONAL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Narrative</h2>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Narrative Summary</label>
            <textarea
              className={styles.narrativeField}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Describe the session, observations, topics discussed, and resident's responses..."
            />
          </div>
        </div>

        {/* Interventions */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Interventions &amp; Follow-up</h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>Interventions Applied</label>
              <textarea
                className={styles.textareaField}
                value={interventions}
                onChange={(e) => setInterventions(e.target.value)}
                placeholder="List interventions used during this session (e.g., CBT, Play Therapy, Grounding Techniques)..."
              />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>Follow-up Actions</label>
              <textarea
                className={styles.textareaField}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Describe any follow-up actions needed after this session..."
              />
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Flags</h2>
          <div className={styles.checkboxRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={progressNoted}
                onChange={(e) => setProgressNoted(e.target.checked)}
              />
              <span>Progress Noted</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={concernsFlagged}
                onChange={(e) => setConcernsFlagged(e.target.checked)}
              />
              <span>Concerns Flagged</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={referralMade}
                onChange={(e) => setReferralMade(e.target.checked)}
              />
              <span>Referral Made</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() =>
              navigate(isEdit ? `/admin/recordings/${id}` : '/admin/recordings')
            }
          >
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Recording' : 'Save Recording'}
          </button>
        </div>
      </form>
    </div>
  );
}

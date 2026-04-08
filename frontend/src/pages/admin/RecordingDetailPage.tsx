import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Shield,
  CheckCircle,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../components/ApiError';
import { formatDate } from '../../constants';
import styles from './RecordingDetailPage.module.css';

interface Recording {
  recordingId: number;
  residentId: number;
  residentCode: string | null;
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

const emotionalColor: Record<string, string> = {
  'Severe Distress': '#A5524D',
  'Distressed': '#C4756E',
  'Struggling': '#D48C53',
  'Unsettled': '#D4A853',
  'Neutral': '#8A8078',
  'Coping': '#7A9E7E',
  'Stable': '#5A8A5E',
  'Good': '#4A7A4E',
  'Thriving': '#3A6A3E',
};

function getEmotionalStyle(state: string | null) {
  const color = state ? emotionalColor[state] ?? '#8A8078' : '#8A8078';
  return {
    color,
    background: color + '14',
    borderColor: color + '40',
  };
}

export default function RecordingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.roles.includes('Admin') ?? false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<Recording>(`/api/admin/recordings/${id}`)
      .then(setRecording)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/recordings/${id}`, { method: 'DELETE' });
      navigate('/admin/recordings', { replace: true });
    } catch {
      setError(true);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading recording...</div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className={styles.page}>
        <ApiError message="Unable to load this recording." />
        <button className={styles.backLink} onClick={() => navigate('/admin/recordings')}>
          <ArrowLeft size={14} /> Back to recordings
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back */}
      <button className={styles.backLink} onClick={() => navigate('/admin/recordings')}>
        <ArrowLeft size={14} /> Back to recordings
      </button>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Session Recording</h1>
          <div className={styles.headerMeta}>
            <span>{recording.residentCode ?? 'Unknown Resident'}</span>
            <span>&middot;</span>
            <span>{formatDate(recording.sessionDate)}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && (
            <button
              className={styles.editBtn}
              onClick={() => navigate(`/admin/recordings/${id}/edit`)}
            >
              <Edit3 size={14} /> Edit
            </button>
          )}
          {isAdmin && (
            <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </header>

      {/* Privacy Notice */}
      <div className={styles.privacyNotice}>
        <Shield size={14} />
        <span>
          Confidential counseling record. Do not share or reproduce outside this system.
        </span>
      </div>

      {/* Session Info */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Session Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Date</label>
            <span>{formatDate(recording.sessionDate)}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Social Worker</label>
            <span>{recording.socialWorker ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Session Type</label>
            <span>{recording.sessionType ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Duration</label>
            <span>
              {recording.sessionDurationMinutes != null
                ? `${recording.sessionDurationMinutes} minutes`
                : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Emotional State */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Emotional State</h2>
        <div className={styles.emotionalRow}>
          <div className={styles.emotionalItem}>
            <label>Start of Session</label>
            <span className={styles.emotionalValue} style={getEmotionalStyle(recording.emotionalStateObserved)}>
              <span
                className={styles.emotionalDot}
                style={{ background: getEmotionalStyle(recording.emotionalStateObserved).color }}
              />
              {recording.emotionalStateObserved ?? '--'}
            </span>
          </div>
          <span className={styles.arrow}>&rarr;</span>
          <div className={styles.emotionalItem}>
            <label>End of Session</label>
            <span className={styles.emotionalValue} style={getEmotionalStyle(recording.emotionalStateEnd)}>
              <span
                className={styles.emotionalDot}
                style={{ background: getEmotionalStyle(recording.emotionalStateEnd).color }}
              />
              {recording.emotionalStateEnd ?? '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Session Narrative</h2>
        <div className={styles.narrative}>
          {recording.sessionNarrative || 'No narrative recorded.'}
        </div>
      </div>

      {/* Interventions */}
      {recording.interventionsApplied && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Interventions Applied</h2>
          <div className={styles.textBlock}>{recording.interventionsApplied}</div>
        </div>
      )}

      {/* Follow-up Actions */}
      {recording.followUpActions && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Follow-up Actions</h2>
          <div className={styles.textBlock}>{recording.followUpActions}</div>
        </div>
      )}

      {/* Status Badges */}
      {(recording.progressNoted || recording.concernsFlagged || recording.referralMade) && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Status</h2>
          <div className={styles.badgesRow}>
            {recording.progressNoted && (
              <span className={`${styles.badge} ${styles.badgeProgress}`}>
                <CheckCircle size={12} /> Progress Noted
              </span>
            )}
            {recording.concernsFlagged && (
              <span className={`${styles.badge} ${styles.badgeConcern}`}>
                <AlertTriangle size={12} /> Concerns Flagged
              </span>
            )}
            {recording.referralMade && (
              <span className={`${styles.badge} ${styles.badgeReferral}`}>
                <ArrowRightLeft size={12} /> Referral Made
              </span>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className={styles.overlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Recording</h3>
            <p>
              This will permanently delete this counseling session recording for{' '}
              {recording.residentCode ?? 'this resident'}. This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Recording'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

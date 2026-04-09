import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../constants';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './VisitationDetailPage.module.css';

interface VisitationDetail {
  visitationId: number;
  residentId: number;
  residentCode: string | null;
  visitDate: string | null;
  socialWorker: string | null;
  visitType: string | null;
  locationVisited: string | null;
  familyMembersPresent: string | null;
  purpose: string | null;
  observations: string | null;
  familyCooperationLevel: string | null;
  safetyConcernsNoted: boolean | null;
  followUpNeeded: boolean | null;
  followUpNotes: string | null;
  visitOutcome: string | null;
}

function getVisitTypeClass(type: string | null): string {
  if (!type) return styles.typeRoutine;
  if (type.includes('Initial')) return styles.typeInitial;
  if (type.includes('Routine')) return styles.typeRoutine;
  if (type.includes('Reintegration')) return styles.typeReintegration;
  if (type.includes('Post')) return styles.typePostPlacement;
  if (type.includes('Emergency')) return styles.typeEmergency;
  return styles.typeRoutine;
}

export default function VisitationDetailPage() {
  useDocumentTitle('Visitation Detail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visitation, setVisitation] = useState<VisitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin = user?.roles?.includes('Admin');

  useEffect(() => {
    apiFetch<VisitationDetail>(`/api/admin/visitations/${id}`)
      .then(setVisitation)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/visitations/${id}`, { method: 'DELETE' });
      navigate('/admin/visitations', { replace: true });
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}>Loading visitation...</div></div>;
  }

  if (!visitation) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Visitation not found.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link to="/admin/visitations" className={styles.backLink}>
        <ArrowLeft size={15} />
        Back to Visitations
      </Link>

      {/* ── Header ───────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            Home Visitation — {visitation.residentCode ?? `Resident #${visitation.residentId}`}
          </h1>
          <div className={styles.headerMeta}>
            <span>{formatDate(visitation.visitDate)}</span>
            <span className={`${styles.visitTypeBadge} ${getVisitTypeClass(visitation.visitType)}`}>
              {visitation.visitType ?? 'Unknown Type'}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && (
            <Link to={`/admin/visitations/${id}/edit`} className={styles.editBtn}>
              <Pencil size={14} />
              Edit
            </Link>
          )}
          {isAdmin && (
            <button
              className={styles.deleteBtn}
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </header>

      {showDeleteDialog && (
        <DeleteConfirmDialog
          title="Delete Visitation?"
          message="This visitation record will be permanently deleted. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isDeleting={deleting}
        />
      )}

      {/* ── Visit Info ───────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Visit Information</h2>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Date</span>
            <span className={styles.fieldValue}>{formatDate(visitation.visitDate)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Social Worker</span>
            <span className={styles.fieldValue}>{visitation.socialWorker ?? '--'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Visit Type</span>
            <span className={styles.fieldValue}>{visitation.visitType ?? '--'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Location Visited</span>
            <span className={styles.fieldValue}>{visitation.locationVisited ?? '--'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Family Members Present</span>
            <span className={styles.fieldValue}>{visitation.familyMembersPresent ?? '--'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Family Cooperation Level</span>
            <span className={styles.fieldValue}>{visitation.familyCooperationLevel ?? '--'}</span>
          </div>
          <div className={`${styles.field} ${styles.fieldValueFull}`}>
            <span className={styles.fieldLabel}>Purpose</span>
            <span className={styles.fieldValue}>{visitation.purpose ?? '--'}</span>
          </div>
        </div>
      </div>

      {/* ── Observations ─────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Observations</h2>
        <div className={styles.fieldValue} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {visitation.observations ?? 'No observations recorded.'}
        </div>
      </div>

      {/* ── Safety Concerns ──────────────────────────── */}
      <div className={`${styles.card} ${visitation.safetyConcernsNoted ? styles.safetyCard : ''}`}>
        <h2 className={visitation.safetyConcernsNoted ? styles.safetyHeader : styles.cardTitle}>
          {visitation.safetyConcernsNoted && <AlertTriangle size={18} />}
          Safety Concerns
        </h2>
        {visitation.safetyConcernsNoted ? (
          <span className={styles.safetyBadgeLarge}>
            <AlertTriangle size={14} />
            Safety Concerns Flagged
          </span>
        ) : (
          <span className={styles.safeBadgeLarge}>
            No Safety Concerns
          </span>
        )}
      </div>

      {/* ── Follow-up ────────────────────────────────── */}
      <div className={`${styles.card} ${visitation.followUpNeeded ? styles.followUpCard : ''}`}>
        <h2 className={visitation.followUpNeeded ? styles.followUpHeader : styles.cardTitle}>
          {visitation.followUpNeeded && <Clock size={18} />}
          Follow-Up
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Follow-Up Needed</span>
            <span className={styles.fieldValue}>
              {visitation.followUpNeeded ? 'Yes' : 'No'}
            </span>
          </div>
          {visitation.followUpNotes && (
            <div className={`${styles.field} ${styles.fieldValueFull}`}>
              <span className={styles.fieldLabel}>Follow-Up Notes</span>
              <span className={styles.fieldValue} style={{ whiteSpace: 'pre-wrap' }}>
                {visitation.followUpNotes}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Visit Outcome ────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Visit Outcome</h2>
        <div className={styles.fieldValue} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {visitation.visitOutcome ?? 'No outcome recorded.'}
        </div>
      </div>
    </div>
  );
}

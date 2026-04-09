import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, AlertTriangle, Clock, CheckCircle, ClipboardList, Plus, Loader2 } from 'lucide-react';
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

interface FollowUpTask {
  staffTaskId: number;
  taskType: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  assignedTo: string | null;
}

const TASK_STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  Pending: { color: '#e67e22', bg: '#e67e2218' },
  Snoozed: { color: '#8e44ad', bg: '#8e44ad18' },
  Completed: { color: '#27ae60', bg: '#27ae6018' },
  Dismissed: { color: '#95a5a6', bg: '#95a5a618' },
};

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
  const [searchParams] = useSearchParams();
  const fromResident = searchParams.get('fromResident');
  const backPath = fromResident ? `/admin/caseload/${fromResident}` : '/admin/visitations';
  const backLabel = fromResident ? 'Back to resident' : 'Back to Visitations';
  const { user } = useAuth();
  const [visitation, setVisitation] = useState<VisitationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  const isAdmin = user?.roles?.includes('Admin');

  useEffect(() => {
    apiFetch<VisitationDetail>(`/api/admin/visitations/${id}`)
      .then(setVisitation)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!visitation?.followUpNeeded) return;
    setTasksLoading(true);
    apiFetch<FollowUpTask[]>(`/api/admin/visitations/${id}/tasks`)
      .then(setFollowUpTasks)
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }, [id, visitation?.followUpNeeded]);

  async function handleCreateTask() {
    setCreatingTask(true);
    try {
      await apiFetch(`/api/admin/visitations/${id}/create-task`, { method: 'POST' });
      const tasks = await apiFetch<FollowUpTask[]>(`/api/admin/visitations/${id}/tasks`);
      setFollowUpTasks(tasks);
    } catch {
      // silently fail
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleUpdateTaskStatus(taskId: number, status: string) {
    setUpdatingTaskId(taskId);
    try {
      await apiFetch(`/api/admin/tasks/${taskId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      const tasks = await apiFetch<FollowUpTask[]>(`/api/admin/visitations/${id}/tasks`);
      setFollowUpTasks(tasks);
    } catch {
      // silently fail
    } finally {
      setUpdatingTaskId(null);
    }
  }

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
      <Link to={backPath} className={styles.backLink}>
        <ArrowLeft size={15} />
        {backLabel}
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
          <Link to={`/admin/visitations/${id}/edit`} className={styles.editBtn}>
            <Pencil size={14} />
            Edit
          </Link>
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

      {/* ── Follow-Up Tasks ─────────────────────────── */}
      {visitation.followUpNeeded && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ClipboardList size={16} /> Follow-Up Task
          </h2>
          {tasksLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7f8c8d', fontSize: '0.85rem' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading tasks...
            </div>
          ) : followUpTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {followUpTasks.map(task => {
                const statusStyle = TASK_STATUS_STYLES[task.status] || { color: '#95a5a6', bg: '#95a5a618' };
                const isUpdating = updatingTaskId === task.staffTaskId;
                const isTerminal = task.status === 'Completed' || task.status === 'Dismissed';
                return (
                  <div key={task.staffTaskId} style={{ border: '1px solid #e8e8e8', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#2c3e50' }}>{task.title}</span>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
                        borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {task.status}
                      </span>
                    </div>
                    {task.assignedTo && (
                      <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginBottom: '0.3rem' }}>
                        Assigned to: {task.assignedTo}
                      </div>
                    )}
                    {!isTerminal && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                        {task.status !== 'Completed' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.staffTaskId, 'Completed')}
                            disabled={isUpdating}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600,
                              border: '1px solid #27ae60', borderRadius: '5px', cursor: 'pointer',
                              background: '#fff', color: '#27ae60',
                              opacity: isUpdating ? 0.5 : 1,
                            }}
                          >
                            <CheckCircle size={12} /> Complete
                          </button>
                        )}
                        {task.status !== 'Dismissed' && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.staffTaskId, 'Dismissed')}
                            disabled={isUpdating}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                              padding: '0.3rem 0.7rem', fontSize: '0.75rem', fontWeight: 600,
                              border: '1px solid #95a5a6', borderRadius: '5px', cursor: 'pointer',
                              background: '#fff', color: '#95a5a6',
                              opacity: isUpdating ? 0.5 : 1,
                            }}
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>No follow-up task has been created yet.</span>
              <button
                onClick={handleCreateTask}
                disabled={creatingTask}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  background: 'var(--color-sage, #27ae60)', color: '#fff',
                  opacity: creatingTask ? 0.6 : 1,
                }}
              >
                {creatingTask ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                Create Follow-Up Task
              </button>
            </div>
          )}
        </div>
      )}

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

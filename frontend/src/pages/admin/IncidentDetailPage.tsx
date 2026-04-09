import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Loader2, AlertTriangle, CheckCircle, ClipboardList, Calendar, Plus } from 'lucide-react';
import { apiFetch } from '../../api';
import { formatDate } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './VisitationDetailPage.module.css';

interface IncidentDetail {
  incidentId: number;
  residentId: number | null;
  residentCode: string | null;
  safehouseId: number | null;
  incidentDate: string | null;
  incidentType: string | null;
  severity: string | null;
  description: string | null;
  responseTaken: string | null;
  reportedBy: string | null;
  resolved: boolean;
  resolutionDate: string | null;
  followUpRequired: boolean;
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
  calendarEvent: {
    calendarEventId: number;
    title: string;
    eventDate: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    eventType: string;
  } | null;
}

const TASK_STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  Pending: { color: '#e67e22', bg: '#e67e2218' },
  Snoozed: { color: '#8e44ad', bg: '#8e44ad18' },
  Completed: { color: '#27ae60', bg: '#27ae6018' },
  Dismissed: { color: '#95a5a6', bg: '#95a5a618' },
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#c0392b',
  High: '#d35400',
  Medium: '#f39c12',
  Low: '#27ae60',
};

export default function IncidentDetailPage() {
  useDocumentTitle('Incident Detail');
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromResident = searchParams.get('fromResident');
  const backPath = fromResident ? `/admin/caseload/${fromResident}` : '/admin/incidents';
  const backLabel = fromResident ? 'Back to resident' : 'Back to Incidents';
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [togglingResolved, setTogglingResolved] = useState(false);

  useEffect(() => {
    apiFetch<IncidentDetail>(`/api/admin/incidents/${id}`)
      .then(setIncident)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load incident'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!incident?.followUpRequired) return;
    setTasksLoading(true);
    apiFetch<FollowUpTask[]>(`/api/admin/incidents/${id}/tasks`)
      .then(setFollowUpTasks)
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }, [id, incident?.followUpRequired]);

  async function handleCreateTask() {
    setCreatingTask(true);
    try {
      await apiFetch(`/api/admin/incidents/${id}/create-task`, { method: 'POST' });
      const tasks = await apiFetch<FollowUpTask[]>(`/api/admin/incidents/${id}/tasks`);
      setFollowUpTasks(tasks);
    } catch {
      // silently fail — user will see no task appeared
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleUpdateTaskStatus(taskId: number, status: string) {
    setUpdatingTaskId(taskId);
    try {
      await apiFetch(`/api/admin/tasks/${taskId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      const tasks = await apiFetch<FollowUpTask[]>(`/api/admin/incidents/${id}/tasks`);
      setFollowUpTasks(tasks);
    } catch {
      // silently fail
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function toggleResolved() {
    if (!incident || togglingResolved) return;
    const newResolved = !incident.resolved;
    setIncident({ ...incident, resolved: newResolved });
    setTogglingResolved(true);
    try {
      await apiFetch(`/api/admin/incidents/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved: newResolved }),
      });
    } catch {
      setIncident(incident);
    } finally {
      setTogglingResolved(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/incidents/${id}`, { method: 'DELETE' });
      navigate('/admin/incidents');
    } catch {
      setDeleting(false);
    }
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div></div>;
  if (error) return <div className={styles.page}><p style={{ color: '#c0392b' }}>{error}</p></div>;
  if (!incident) return <div className={styles.page}><p>Incident not found.</p></div>;

  const severityColor = SEVERITY_COLORS[incident.severity || ''] || '#95a5a6';

  return (
    <div className={styles.page}>
      <Link to={backPath} className={styles.backLink}>
        <ArrowLeft size={15} /> {backLabel}
      </Link>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Incident #{incident.incidentId}</h1>
          <div className={styles.headerMeta}>
            {incident.severity && (
              <span style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                background: `${severityColor}18`,
                color: severityColor,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {incident.severity}
              </span>
            )}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: incident.resolved ? '#27ae60' : '#e74c3c',
            }}>
              {incident.resolved ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {incident.resolved ? 'Resolved' : 'Open'}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => navigate(`/admin/incidents/${id}/edit`)}>
            <Edit size={14} /> Edit
          </button>
          {isAdmin && (
            <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Incident Info ─────────────────────── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Incident Details</h3>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Date</span>
            <span className={styles.fieldValue}>{formatDate(incident.incidentDate)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Type</span>
            <span className={styles.fieldValue}>{incident.incidentType || '-'}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Resident</span>
            <span className={styles.fieldValue}>
              {incident.residentId ? (
                <Link to={`/admin/caseload/${incident.residentId}`} style={{ color: 'var(--color-sage)', textDecoration: 'none', fontWeight: 600 }}>
                  {incident.residentCode || `#${incident.residentId}`}
                </Link>
              ) : '-'}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Reported By</span>
            <span className={styles.fieldValue}>{incident.reportedBy || '-'}</span>
          </div>
          {incident.resolved && incident.resolutionDate && (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Resolution Date</span>
              <span className={styles.fieldValue}>{formatDate(incident.resolutionDate)}</span>
            </div>
          )}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Follow-Up Required</span>
            <span className={styles.fieldValue} style={{ fontWeight: 600, color: incident.followUpRequired ? '#e74c3c' : '#27ae60' }}>
              {incident.followUpRequired ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Follow-Up Tasks ─────────────────────── */}
      {incident.followUpRequired && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ClipboardList size={16} /> Follow-Up
          </h3>
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
                    {task.calendarEvent && (
                      <div
                        onClick={() => navigate('/admin/calendar')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          fontSize: '0.8rem', color: '#2980b9', marginTop: '0.5rem',
                          background: '#2980b90a', padding: '0.4rem 0.6rem', borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Calendar size={13} />
                        <span style={{ fontWeight: 600 }}>{task.calendarEvent.title}</span>
                        <span style={{ color: '#7f8c8d' }}>
                          {' '}— {formatDate(task.calendarEvent.eventDate)}
                          {task.calendarEvent.startTime && ` at ${task.calendarEvent.startTime}`}
                        </span>
                        <span style={{
                          marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 600,
                          color: task.calendarEvent.status === 'Completed' ? '#27ae60' : task.calendarEvent.status === 'Cancelled' ? '#e74c3c' : '#2980b9',
                        }}>
                          {task.calendarEvent.status}
                        </span>
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

      {/* ── Description ───────────────────────── */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Description</h3>
        <p className={styles.fieldValue} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0 }}>
          {incident.description || 'No description provided.'}
        </p>
      </div>

      {/* ── Response ──────────────────────────── */}
      {incident.responseTaken && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Response Taken</h3>
          <p className={styles.fieldValue} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, margin: 0 }}>
            {incident.responseTaken}
          </p>
        </div>
      )}

      {/* ── Resolve Toggle ────────────────────── */}
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={toggleResolved}
            disabled={togglingResolved}
            style={{
              position: 'relative',
              width: 44,
              height: 24,
              background: incident.resolved ? 'var(--color-sage, #27ae60)' : 'rgba(15, 27, 45, 0.15)',
              borderRadius: 12,
              cursor: togglingResolved ? 'default' : 'pointer',
              border: 'none',
              transition: 'background 0.25s',
              flexShrink: 0,
              opacity: togglingResolved ? 0.6 : 1,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 20,
              height: 20,
              background: '#fff',
              borderRadius: '50%',
              transition: 'transform 0.25s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              transform: incident.resolved ? 'translateX(20px)' : 'translateX(0)',
            }} />
          </button>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Resolved</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {incident.resolved ? 'This incident has been resolved' : 'Mark this incident as resolved'}
            </div>
          </div>
        </div>
      </div>

      {showDelete && (
        <DeleteConfirmDialog
          title="Delete Incident?"
          message="This will permanently delete this incident report. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          isDeleting={deleting}
        />
      )}
    </div>
  );
}

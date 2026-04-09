import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, Clock, X, Stethoscope, GraduationCap, Heart, AlertTriangle, Home, ClipboardList, CalendarPlus } from 'lucide-react';
import { apiFetch } from '../../api';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './StaffTasksPage.module.css';

interface StaffTaskItem {
  staffTaskId: number;
  residentId: number | null;
  residentCode: string | null;
  safehouseId: number;
  taskType: string;
  title: string;
  description: string | null;
  contextJson: string | null;
  status: string;
  snoozeUntil: string | null;
  dueTriggerDate: string | null;
  createdAt: string;
  sourceEntityType: string | null;
  sourceEntityId: number | null;
}

const TASK_ICON_MAP: Record<string, { icon: typeof Stethoscope; className: string }> = {
  ScheduleDoctor: { icon: Stethoscope, className: 'taskIconDoctor' },
  ScheduleDentist: { icon: Stethoscope, className: 'taskIconDentist' },
  UpdateEducation: { icon: GraduationCap, className: 'taskIconEducation' },
  InputHealthRecords: { icon: Heart, className: 'taskIconHealth' },
  IncidentFollowUp: { icon: AlertTriangle, className: 'taskIconIncident' },
  ScheduleHomeVisit: { icon: Home, className: 'taskIconVisit' },
  ScheduleReintegration: { icon: Home, className: 'taskIconVisit' },
  PostPlacementVisit: { icon: Home, className: 'taskIconVisit' },
};

export default function StaffTasksPage() {
  useDocumentTitle('Tasks');
  const navigate = useNavigate();
  const { activeSafehouseId } = useSafehouse();
  const [tasks, setTasks] = useState<StaffTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeSafehouseId ? `?safehouseId=${activeSafehouseId}` : '';
      const data = await apiFetch<StaffTaskItem[]>(`/api/staff/tasks${params}`);
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function handleAction(taskId: number, action: 'Completed' | 'Dismissed' | 'Snoozed', snoozeDays?: number) {
    try {
      const body: Record<string, unknown> = { status: action };
      if (action === 'Snoozed' && snoozeDays) {
        body.snoozeUntil = new Date(Date.now() + snoozeDays * 86400000).toISOString();
        body.status = undefined;
      }
      await apiFetch(`/api/staff/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      fetchTasks();
    } catch { /* ignore */ }
  }

  function getTaskIcon(taskType: string) {
    const mapping = TASK_ICON_MAP[taskType];
    if (mapping) {
      const Icon = mapping.icon;
      return <div className={`${styles.taskIcon} ${styles[mapping.className]}`}><Icon size={20} /></div>;
    }
    return <div className={`${styles.taskIcon} ${styles.taskIconDefault}`}><ClipboardList size={20} /></div>;
  }

  function parseContext(json: string | null): Record<string, string> {
    if (!json) return {};
    try { return JSON.parse(json); } catch { return {}; }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>To-Do List</h1>
          <p className={styles.subtitle}>Your pending tasks and action items</p>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading tasks...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : tasks.length === 0 ? (
        <div className={styles.empty}>No pending tasks. You're all caught up!</div>
      ) : (
        <div className={styles.taskList}>
          {tasks.map(task => {
            const ctx = parseContext(task.contextJson);
            return (
              <div key={task.staffTaskId} className={styles.taskCard}>
                {getTaskIcon(task.taskType)}
                <div className={styles.taskBody}>
                  <p className={styles.taskTitle}>{task.title}</p>
                  {task.residentId && task.residentCode && (
                    <a
                      href="#"
                      className={styles.residentLink}
                      onClick={e => { e.preventDefault(); navigate(`/admin/caseload/${task.residentId}`); }}
                    >
                      {task.residentCode}
                    </a>
                  )}
                  {task.description && <p className={styles.taskMeta}>{task.description}</p>}
                  {Object.keys(ctx).length > 0 && (
                    <p className={styles.taskContext}>
                      {Object.entries(ctx).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                    </p>
                  )}
                </div>
                <div className={styles.taskActions}>
                  {task.taskType === 'IncidentFollowUp' && task.residentId && (
                    <button
                      className={styles.completeBtn}
                      onClick={() => {
                        const params = new URLSearchParams();
                        params.set('sourceTaskId', String(task.staffTaskId));
                        if (task.residentId) params.set('residentId', String(task.residentId));
                        params.set('title', `Follow-up: ${task.description?.split(' \u2014 ')[0] || 'Incident'}`);
                        navigate(`/admin/calendar?${params.toString()}`);
                      }}
                    >
                      <CalendarPlus size={14} /> Schedule
                    </button>
                  )}
                  <button
                    className={task.taskType === 'IncidentFollowUp' ? styles.snoozeBtn : styles.completeBtn}
                    onClick={() => {
                      if (task.residentId) navigate(`/admin/caseload/${task.residentId}`);
                      else handleAction(task.staffTaskId, 'Completed');
                    }}
                  >
                    <CheckCircle size={14} /> {task.residentId ? 'View' : 'Done'}
                  </button>
                  <button className={styles.snoozeBtn} onClick={() => handleAction(task.staffTaskId, 'Snoozed', 30)}>
                    <Clock size={14} /> Snooze
                  </button>
                  <button className={styles.dismissBtn} onClick={() => handleAction(task.staffTaskId, 'Dismissed')}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

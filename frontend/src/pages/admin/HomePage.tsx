import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, Loader2,
  CheckCircle, Clock, X, Calendar,
  Stethoscope, GraduationCap, Heart, AlertTriangle, Home, ClipboardList,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY, APP_TODAY_STR } from '../../constants';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './HomePage.module.css';

/* ── Types ───────────────────────────────────────── */

interface CalendarEventItem {
  calendarEventId: number;
  staffUserId: string;
  safehouseId: number;
  residentId: number | null;
  residentCode: string | null;
  eventType: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  recurrenceRule: string | null;
  sourceTaskId: number | null;
  status: string;
}

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

interface NewEventForm {
  eventType: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  residentId: string;
}

interface ScheduleForm {
  eventDate: string;
  startTime: string;
}

/* ── Constants ───────────────────────────────────── */

const EVENT_TYPE_STYLES: Record<string, string> = {
  Counseling: 'eventCounseling',
  DoctorApt: 'eventDoctorApt',
  DentistApt: 'eventDentistApt',
  HomeVisit: 'eventHomeVisit',
  CaseConference: 'eventCaseConference',
  GroupTherapy: 'eventGroupTherapy',
  ReintegrationVisit: 'eventReintegrationVisit',
  PostPlacementVisit: 'eventPostPlacementVisit',
};

const TASK_TYPE_TO_EVENT_TYPE: Record<string, string> = {
  ScheduleDoctor: 'DoctorApt',
  ScheduleDentist: 'DentistApt',
  ScheduleHomeVisit: 'HomeVisit',
  ScheduleReintegration: 'ReintegrationVisit',
  PostPlacementVisit: 'PostPlacementVisit',
};

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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM – 7 PM
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ── Helpers ─────────────────────────────────────── */

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }

function fmtDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function hourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function parseContext(json: string | null): Record<string, string> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

/* ── Component ───────────────────────────────────── */

export default function HomePage() {
  useDocumentTitle('Home');
  const navigate = useNavigate();
  const { activeSafehouseId, safehouses } = useSafehouse();

  // Calendar state
  const [view, setView] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date(APP_TODAY));
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    eventType: 'Counseling', title: '', description: '',
    eventDate: APP_TODAY_STR, startTime: '', endTime: '', residentId: '',
  });
  const [residents, setResidents] = useState<{ residentId: number; internalCode: string }[]>([]);

  // Tasks state
  const [tasks, setTasks] = useState<StaffTaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // Drag-and-drop state
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [dropHour, setDropHour] = useState<number | null>(null);

  // Schedule modal state
  const [scheduleTask, setScheduleTask] = useState<StaffTaskItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({ eventDate: APP_TODAY_STR, startTime: '' });

  const dragCounterRef = useRef(0);

  /* ── Data fetching ─────────────────────────────── */

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSafehouseId) params.set('safehouseId', String(activeSafehouseId));
      if (view === 'day') params.set('date', fmtDate(currentDate));
      else params.set('weekStart', fmtDate(getWeekStart(currentDate)));
      const data = await apiFetch<CalendarEventItem[]>(`/api/staff/calendar?${params}`);
      setEvents(data);
    } catch { /* ignore */ } finally { setEventsLoading(false); }
  }, [activeSafehouseId, currentDate, view]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const params = activeSafehouseId ? `?safehouseId=${activeSafehouseId}` : '';
      const data = await apiFetch<StaffTaskItem[]>(`/api/staff/tasks${params}`);
      setTasks(data);
    } catch { /* ignore */ } finally { setTasksLoading(false); }
  }, [activeSafehouseId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    apiFetch<{ items: { residentId: number; internalCode: string }[] }>('/api/admin/residents-list')
      .then(data => setResidents(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  /* ── Calendar actions ──────────────────────────── */

  function navigateDate(delta: number) {
    if (view === 'day') setCurrentDate(addDays(currentDate, delta));
    else setCurrentDate(addDays(currentDate, delta * 7));
  }

  async function handleCreateEvent() {
    if (!newEvent.title || !newEvent.eventDate) return;
    try {
      await apiFetch('/api/staff/calendar', {
        method: 'POST',
        body: JSON.stringify({
          safehouseId: activeSafehouseId || safehouses[0]?.safehouseId || 1,
          residentId: newEvent.residentId ? Number(newEvent.residentId) : null,
          eventType: newEvent.eventType,
          title: newEvent.title,
          description: newEvent.description || null,
          eventDate: newEvent.eventDate,
          startTime: newEvent.startTime || null,
          endTime: newEvent.endTime || null,
        }),
      });
      setShowNewForm(false);
      setNewEvent({ eventType: 'Counseling', title: '', description: '', eventDate: fmtDate(currentDate), startTime: '', endTime: '', residentId: '' });
      fetchEvents();
    } catch { /* ignore */ }
  }

  async function handleUpdateEvent(id: number, updates: Record<string, unknown>) {
    try {
      await apiFetch(`/api/staff/calendar/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      setSelectedEvent(null);
      fetchEvents();
    } catch { /* ignore */ }
  }

  /* ── Task actions ──────────────────────────────── */

  async function handleTaskAction(taskId: number, action: 'Completed' | 'Dismissed' | 'Snoozed', snoozeDays?: number) {
    try {
      const body: Record<string, unknown> = { status: action };
      if (action === 'Snoozed' && snoozeDays) {
        body.snoozeUntil = new Date(Date.now() + snoozeDays * 86400000).toISOString();
        body.status = undefined;
      }
      await apiFetch(`/api/staff/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) });
      fetchTasks();
    } catch { /* ignore */ }
  }

  async function scheduleTaskToCalendar(task: StaffTaskItem, eventDate: string, startTime: string | null) {
    const eventType = TASK_TYPE_TO_EVENT_TYPE[task.taskType] || 'Other';
    try {
      await apiFetch('/api/staff/calendar', {
        method: 'POST',
        body: JSON.stringify({
          safehouseId: task.safehouseId || activeSafehouseId || safehouses[0]?.safehouseId || 1,
          residentId: task.residentId,
          eventType,
          title: task.title,
          description: task.description || null,
          eventDate,
          startTime: startTime || null,
          endTime: null,
          sourceTaskId: task.staffTaskId,
        }),
      });
      fetchEvents();
      fetchTasks();
    } catch { /* ignore */ }
  }

  /* ── Drag-and-drop handlers ────────────────────── */

  function handleDragStart(taskId: number) {
    setDragTaskId(taskId);
  }

  function handleDragEnd() {
    setDragTaskId(null);
    setDropHour(null);
    dragCounterRef.current = 0;
  }

  function handleSlotDragEnter(hour: number) {
    dragCounterRef.current++;
    setDropHour(hour);
  }

  function handleSlotDragLeave() {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setDropHour(null);
      dragCounterRef.current = 0;
    }
  }

  function handleSlotDrop(hour: number) {
    if (!dragTaskId) return;
    const task = tasks.find(t => t.staffTaskId === dragTaskId);
    if (!task) return;
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    scheduleTaskToCalendar(task, fmtDate(currentDate), startTime);
    setDragTaskId(null);
    setDropHour(null);
    dragCounterRef.current = 0;
  }

  function handleScheduleSubmit() {
    if (!scheduleTask || !scheduleForm.eventDate) return;
    scheduleTaskToCalendar(scheduleTask, scheduleForm.eventDate, scheduleForm.startTime || null);
    setScheduleTask(null);
  }

  /* ── Rendering helpers ─────────────────────────── */

  function getEventStyle(eventType: string, status: string) {
    const base = EVENT_TYPE_STYLES[eventType] || 'eventOther';
    const classes = [styles.eventChip, styles[base]];
    if (status === 'Completed') classes.push(styles.eventCompleted);
    return classes.join(' ');
  }

  function renderEventChip(evt: CalendarEventItem) {
    return (
      <div key={evt.calendarEventId} className={getEventStyle(evt.eventType, evt.status)} onClick={() => setSelectedEvent(evt)}>
        {evt.startTime && <span>{evt.startTime}</span>}
        <span>{evt.title}</span>
        {evt.residentCode && <span>({evt.residentCode})</span>}
      </div>
    );
  }

  function getTaskIcon(taskType: string) {
    const mapping = TASK_ICON_MAP[taskType];
    if (mapping) {
      const Icon = mapping.icon;
      return <div className={`${styles.taskIcon} ${styles[mapping.className]}`}><Icon size={18} /></div>;
    }
    return <div className={`${styles.taskIcon} ${styles.taskIconDefault}`}><ClipboardList size={18} /></div>;
  }

  const unscheduled = events.filter(e => !e.startTime && e.status !== 'Completed');
  const scheduled = events.filter(e => e.startTime);

  /* ── Render ────────────────────────────────────── */

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Home</h1>
          <p>{fmtDateDisplay(currentDate)}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.dateControls}>
            <button className={styles.navBtn} onClick={() => navigateDate(-1)}><ChevronLeft size={16} /></button>
            <button className={styles.todayBtn} onClick={() => setCurrentDate(new Date(APP_TODAY))}>Today</button>
            <button className={styles.navBtn} onClick={() => navigateDate(1)}><ChevronRight size={16} /></button>
          </div>
          <div className={styles.viewToggle}>
            <button className={view === 'day' ? styles.viewBtnActive : styles.viewBtn} onClick={() => setView('day')}>Day</button>
            <button className={view === 'week' ? styles.viewBtnActive : styles.viewBtn} onClick={() => setView('week')}>Week</button>
          </div>
          <button className={styles.addBtn} onClick={() => { setNewEvent(e => ({ ...e, eventDate: fmtDate(currentDate) })); setShowNewForm(true); }}>
            <Plus size={14} /> New Event
          </button>
        </div>
      </header>

      {/* Body: calendar + tasks side by side */}
      <div className={styles.body}>
        {/* Calendar panel */}
        <div className={styles.calendarPanel}>
          {eventsLoading ? (
            <div className={styles.loading}><Loader2 size={20} className={styles.spinner} /> Loading calendar...</div>
          ) : view === 'day' ? (
            <>
              {unscheduled.length > 0 && (
                <div className={styles.unscheduledSection}>
                  <div className={styles.sectionLabel}>Unscheduled</div>
                  <div className={styles.unscheduledList}>
                    {unscheduled.map(evt => (
                      <div key={evt.calendarEventId} className={styles.unscheduledCard} onClick={() => setSelectedEvent(evt)}>
                        {evt.title} {evt.residentCode && `(${evt.residentCode})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.dayGrid}>
                {HOURS.map(hour => {
                  const hourStr = hour.toString().padStart(2, '0');
                  const hourEvents = scheduled.filter(e => e.startTime?.startsWith(hourStr));
                  const isDropTarget = dragTaskId !== null && dropHour === hour;
                  return (
                    <div
                      key={hour}
                      className={isDropTarget ? styles.timeSlotDropTarget : styles.timeSlot}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDragEnter={() => handleSlotDragEnter(hour)}
                      onDragLeave={handleSlotDragLeave}
                      onDrop={e => { e.preventDefault(); handleSlotDrop(hour); }}
                    >
                      <div className={styles.timeLabel}>{hourLabel(hour)}</div>
                      <div className={styles.slotContent}>
                        {hourEvents.map(renderEventChip)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={styles.weekGrid}>
              {DAY_NAMES.map((name, i) => {
                const dayDate = addDays(getWeekStart(currentDate), i);
                const dayStr = fmtDate(dayDate);
                const isToday = dayStr === APP_TODAY_STR;
                const dayEvents = events.filter(e => e.eventDate === dayStr);
                return (
                  <div key={name} className={isToday ? styles.weekDayToday : styles.weekDay}>
                    <div className={isToday ? styles.weekDayHeaderToday : styles.weekDayHeader}>
                      {name} {dayDate.getDate()}
                    </div>
                    <div className={styles.weekEventList}>
                      {dayEvents.map(renderEventChip)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks panel */}
        <div className={styles.tasksPanel}>
          <div className={styles.tasksPanelHeader}>
            <h2 className={styles.tasksPanelTitle}>To-Do</h2>
            {tasks.length > 0 && <span className={styles.taskCount}>{tasks.length}</span>}
          </div>
          {tasksLoading ? (
            <div className={styles.loading}><Loader2 size={18} className={styles.spinner} /> Loading...</div>
          ) : tasks.length === 0 ? (
            <div className={styles.emptyTasks}>No pending tasks. You're all caught up!</div>
          ) : (
            <div className={styles.taskList}>
              {tasks.map(task => {
                const ctx = parseContext(task.contextJson);
                const isDragging = dragTaskId === task.staffTaskId;
                return (
                  <div
                    key={task.staffTaskId}
                    className={isDragging ? styles.taskCardDragging : styles.taskCard}
                    draggable
                    onDragStart={() => handleDragStart(task.staffTaskId)}
                    onDragEnd={handleDragEnd}
                  >
                    {getTaskIcon(task.taskType)}
                    <div className={styles.taskBody}>
                      <p className={styles.taskTitle}>{task.title}</p>
                      {task.residentId && task.residentCode && (
                        <a
                          href="#"
                          className={styles.residentLink}
                          onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/caseload/${task.residentId}`); }}
                        >
                          {task.residentCode}
                        </a>
                      )}
                      {task.description && <p className={styles.taskMeta}>{task.description}</p>}
                      {Object.keys(ctx).length > 0 && (
                        <p className={styles.taskContext}>
                          {Object.entries(ctx).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                      <div className={styles.taskActions}>
                        <button
                          className={styles.scheduleBtn}
                          onClick={e => { e.stopPropagation(); setScheduleTask(task); setScheduleForm({ eventDate: fmtDate(currentDate), startTime: '' }); }}
                        >
                          <Calendar size={12} /> Schedule
                        </button>
                        <button
                          className={styles.completeBtn}
                          onClick={e => {
                            e.stopPropagation();
                            if (task.residentId) navigate(`/admin/caseload/${task.residentId}`);
                            else handleTaskAction(task.staffTaskId, 'Completed');
                          }}
                        >
                          <CheckCircle size={12} /> {task.residentId ? 'View' : 'Done'}
                        </button>
                        <button className={styles.snoozeBtn} onClick={e => { e.stopPropagation(); handleTaskAction(task.staffTaskId, 'Snoozed', 30); }}>
                          <Clock size={12} />
                        </button>
                        <button className={styles.dismissBtn} onClick={e => { e.stopPropagation(); handleTaskAction(task.staffTaskId, 'Dismissed'); }}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{selectedEvent.title}</h3>
            <p className={styles.modalMeta}>Type: {selectedEvent.eventType}</p>
            <p className={styles.modalMeta}>Date: {selectedEvent.eventDate}</p>
            {selectedEvent.startTime && <p className={styles.modalMeta}>Time: {selectedEvent.startTime}{selectedEvent.endTime ? ` – ${selectedEvent.endTime}` : ''}</p>}
            {selectedEvent.residentCode && <p className={styles.modalMeta}>Resident: {selectedEvent.residentCode}</p>}
            {selectedEvent.description && <p className={styles.modalMeta}>{selectedEvent.description}</p>}
            <p className={styles.modalMeta}>Status: {selectedEvent.status}</p>
            <div className={styles.modalActions}>
              {selectedEvent.status === 'Scheduled' && (
                <>
                  <button className={styles.modalBtnPrimary} onClick={() => handleUpdateEvent(selectedEvent.calendarEventId, { status: 'Completed' })}>
                    Mark Complete
                  </button>
                  {selectedEvent.eventType === 'Counseling' && (
                    <button className={styles.modalBtn} onClick={() => { navigate(`/admin/recordings/new?residentId=${selectedEvent.residentId || ''}`); setSelectedEvent(null); }}>
                      Log Recording
                    </button>
                  )}
                  {selectedEvent.eventType === 'HomeVisit' && (
                    <button className={styles.modalBtn} onClick={() => { navigate(`/admin/visitations/new?residentId=${selectedEvent.residentId || ''}`); setSelectedEvent(null); }}>
                      Log Visit
                    </button>
                  )}
                  {!selectedEvent.startTime && (
                    <button className={styles.modalBtn} onClick={() => {
                      const time = prompt('Enter start time (HH:MM):', '09:00');
                      if (time) handleUpdateEvent(selectedEvent.calendarEventId, { startTime: time });
                    }}>
                      Set Time
                    </button>
                  )}
                  <button className={styles.modalBtnDanger} onClick={() => handleUpdateEvent(selectedEvent.calendarEventId, { status: 'Cancelled' })}>
                    Cancel Event
                  </button>
                </>
              )}
              <button className={styles.modalBtn} onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule task modal */}
      {scheduleTask && (
        <div className={styles.formOverlay} onClick={() => setScheduleTask(null)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Schedule: {scheduleTask.title}</h3>
            {scheduleTask.residentCode && <p className={styles.modalMeta}>Resident: {scheduleTask.residentCode}</p>}
            <div className={styles.formGrid}>
              <label className={styles.formLabel}>
                Date
                <input type="date" className={styles.formInput} value={scheduleForm.eventDate} onChange={e => setScheduleForm(f => ({ ...f, eventDate: e.target.value }))} />
              </label>
              <label className={styles.formLabel}>
                Start Time (optional)
                <input type="time" className={styles.formInput} value={scheduleForm.startTime} onChange={e => setScheduleForm(f => ({ ...f, startTime: e.target.value }))} />
              </label>
            </div>
            <div className={styles.formActions}>
              <button className={styles.modalBtn} onClick={() => setScheduleTask(null)}>Cancel</button>
              <button className={styles.modalBtnPrimary} onClick={handleScheduleSubmit}>Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* New event form */}
      {showNewForm && (
        <div className={styles.formOverlay} onClick={() => setShowNewForm(false)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>New Event</h3>
            <div className={styles.formGrid}>
              <label className={styles.formLabel}>
                Type
                <select className={styles.formSelect} value={newEvent.eventType} onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}>
                  <option value="Counseling">Counseling</option>
                  <option value="DoctorApt">Doctor Appointment</option>
                  <option value="DentistApt">Dentist Appointment</option>
                  <option value="HomeVisit">Home Visit</option>
                  <option value="CaseConference">Case Conference</option>
                  <option value="GroupTherapy">Group Therapy</option>
                  <option value="ReintegrationVisit">Reintegration Visit</option>
                  <option value="PostPlacementVisit">Post-Placement Visit</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className={styles.formLabel}>
                Resident
                <select className={styles.formSelect} value={newEvent.residentId} onChange={e => setNewEvent({ ...newEvent, residentId: e.target.value })}>
                  <option value="">None</option>
                  {residents.map(r => (
                    <option key={r.residentId} value={r.residentId}>{r.internalCode}</option>
                  ))}
                </select>
              </label>
              <label className={`${styles.formLabel} ${styles.formFull}`}>
                Title
                <input className={styles.formInput} value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" />
              </label>
              <label className={styles.formLabel}>
                Date
                <input type="date" className={styles.formInput} value={newEvent.eventDate} onChange={e => setNewEvent({ ...newEvent, eventDate: e.target.value })} />
              </label>
              <label className={styles.formLabel}>
                Start Time
                <input type="time" className={styles.formInput} value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} />
              </label>
              <label className={styles.formLabel}>
                End Time
                <input type="time" className={styles.formInput} value={newEvent.endTime} onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })} />
              </label>
              <label className={`${styles.formLabel} ${styles.formFull}`}>
                Description
                <input className={styles.formInput} value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Optional" />
              </label>
            </div>
            <div className={styles.formActions}>
              <button className={styles.modalBtn} onClick={() => setShowNewForm(false)}>Cancel</button>
              <button className={styles.modalBtnPrimary} onClick={handleCreateEvent}>Create Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

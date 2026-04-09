import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, Loader2,
  CheckCircle, Clock, X, Calendar,
  Stethoscope, GraduationCap, Heart, AlertTriangle, Home, ClipboardList, User,
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

function fmtWeekRange(d: Date): string {
  const ws = getWeekStart(d);
  const we = addDays(ws, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = ws.toLocaleDateString('en-US', opts);
  const endOpts: Intl.DateTimeFormatOptions = ws.getMonth() === we.getMonth()
    ? { day: 'numeric' }
    : { month: 'short', day: 'numeric' };
  const end = we.toLocaleDateString('en-US', endOpts);
  return `${start} – ${end}, ${we.getFullYear()}`;
}

function fmtDayHeader(d: Date): { name: string; date: number } {
  return {
    name: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.getDate(),
  };
}

interface EventLayout {
  column: number;
  totalCols: number;
}

function toMinutes(time: string | null): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const DEFAULT_DURATION: Record<string, number> = {
  Counseling: 60,
  GroupTherapy: 90,
  DoctorApt: 30,
  DentistApt: 30,
  HomeVisit: 120,
  CaseConference: 60,
  ReintegrationVisit: 90,
  PostPlacementVisit: 60,
  Other: 60,
};

function defaultDuration(eventType: string): number {
  return DEFAULT_DURATION[eventType] ?? 60;
}

function eventEnd(evt: CalendarEventItem): number {
  if (evt.endTime) return toMinutes(evt.endTime);
  return toMinutes(evt.startTime) + defaultDuration(evt.eventType);
}

function computeOverlapLayout(dayEvents: CalendarEventItem[], draggedId: number | null): Map<number, EventLayout> {
  const layout = new Map<number, EventLayout>();
  const sorted = dayEvents
    .filter(e => e.startTime && e.calendarEventId !== draggedId)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || eventEnd(b) - eventEnd(a));

  // Greedy column packing: assign each event to the leftmost column
  // where it doesn't overlap with any event already in that column.
  // columns[i] = end time of the last event placed in column i
  const columns: number[] = [];
  const evtColumns = new Map<number, number>();

  for (const evt of sorted) {
    const start = toMinutes(evt.startTime);
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      if (start >= columns[col]) {
        columns[col] = eventEnd(evt);
        evtColumns.set(evt.calendarEventId, col);
        placed = true;
        break;
      }
    }
    if (!placed) {
      evtColumns.set(evt.calendarEventId, columns.length);
      columns.push(eventEnd(evt));
    }
  }

  // Now group into overlap clusters and find max columns per cluster
  const clusters: CalendarEventItem[][] = [];
  for (const evt of sorted) {
    const start = toMinutes(evt.startTime);
    let placed = false;
    for (const cluster of clusters) {
      const clusterEnd = Math.max(...cluster.map(e => eventEnd(e)));
      if (start < clusterEnd) {
        cluster.push(evt);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([evt]);
  }

  // For each cluster, find the max column used to determine totalCols
  for (const cluster of clusters) {
    const maxCol = Math.max(...cluster.map(e => evtColumns.get(e.calendarEventId) ?? 0));
    const totalCols = maxCol + 1;
    for (const evt of cluster) {
      layout.set(evt.calendarEventId, {
        column: evtColumns.get(evt.calendarEventId) ?? 0,
        totalCols,
      });
    }
  }

  return layout;
}

function parseContext(json: string | null): Record<string, string> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

function formatContextValue(key: string, value: string): string {
  // Format date values nicely
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return value;
}

function formatContextLabel(key: string): string {
  // Clean up camelCase keys into readable labels
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/* ── Component ───────────────────────────────────── */

export default function HomePage() {
  useDocumentTitle('Home');
  const navigate = useNavigate();
  const { activeSafehouseId, safehouses } = useSafehouse();

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date(APP_TODAY));
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const calendarPanelRef = useRef<HTMLDivElement>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    eventType: 'Counseling', title: '', description: '',
    eventDate: APP_TODAY_STR, startTime: '', endTime: '', residentId: '',
  });
  const [residents, setResidents] = useState<{ residentId: number; internalCode: string }[]>([]);

  // Tasks state
  const [tasks, setTasks] = useState<StaffTaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<number>>(new Set());

  // Drag-and-drop state
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [dragEventId, setDragEventId] = useState<number | null>(null);
  const [dropHour, setDropHour] = useState<number | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const dragOffsetY = useRef<number>(0);
  const dropMinuteRef = useRef<number>(0);
  const dropIndicatorRef = useRef<HTMLDivElement | null>(null);

  // All-day expand state (tracks which days are expanded)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Schedule modal state
  const [scheduleTask, setScheduleTask] = useState<StaffTaskItem | null>(null);
  const [setTimeValue, setSetTimeValue] = useState<string>('09:00');
  const [showSetTime, setShowSetTime] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({ eventDate: APP_TODAY_STR, startTime: '' });

  const dragCounterRef = useRef(0);

  /* ── Data fetching ─────────────────────────────── */

  const fetchEvents = useCallback(async (showLoading = true) => {
    if (showLoading) setEventsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSafehouseId) params.set('safehouseId', String(activeSafehouseId));
      params.set('weekStart', fmtDate(getWeekStart(currentDate)));
      const data = await apiFetch<CalendarEventItem[]>(`/api/staff/calendar?${params}`);
      setEvents(data);
    } catch { /* ignore */ } finally { setEventsLoading(false); }
  }, [activeSafehouseId, currentDate]);

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
    setCurrentDate(addDays(currentDate, delta * 7));
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
      fetchEvents(false);
    } catch { /* ignore */ }
  }

  async function handleUpdateEvent(id: number, updates: Record<string, unknown>) {
    // Optimistically update local state
    setEvents(prev => prev.map(e => e.calendarEventId === id ? { ...e, ...updates } as CalendarEventItem : e));
    setSelectedEvent(null);
    try {
      await apiFetch(`/api/staff/calendar/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      fetchEvents(false); // silent background sync
    } catch {
      fetchEvents(false); // revert on error
    }
  }

  /* ── Task actions ──────────────────────────────── */

  async function handleTaskAction(taskId: number, action: 'Completed' | 'Dismissed' | 'Snoozed', snoozeDays?: number) {
    // Animate out first
    setExitingTaskIds(prev => new Set(prev).add(taskId));
    try {
      const body: Record<string, unknown> = { status: action };
      if (action === 'Snoozed' && snoozeDays) {
        body.snoozeUntil = new Date(Date.now() + snoozeDays * 86400000).toISOString();
        body.status = undefined;
      }
      await apiFetch(`/api/staff/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) });
      // Wait for animation to finish before removing from list
      setTimeout(() => {
        setExitingTaskIds(prev => { const next = new Set(prev); next.delete(taskId); return next; });
        fetchTasks();
      }, 300);
    } catch {
      setExitingTaskIds(prev => { const next = new Set(prev); next.delete(taskId); return next; });
    }
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
      fetchEvents(false);
      fetchTasks();
    } catch { /* ignore */ }
  }

  /* ── Drag-and-drop handlers ────────────────────── */

  function handleDragStart(taskId: number) {
    dragOffsetY.current = 0;
    setDragTaskId(taskId);
  }

  function handleDragEnd() {
    setDragTaskId(null);
    setDragEventId(null);
    setDropHour(null);
    setDropDate(null);
    dropMinuteRef.current = 0;
    dropIndicatorRef.current = null;
    dragCounterRef.current = 0;
  }

  function handleSlotDragEnter(hour: number, date?: string) {
    dragCounterRef.current++;
    setDropHour(hour);
    if (date) setDropDate(date);
  }

  function handleSlotDragLeave() {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setDropHour(null);
      setDropDate(null);
      dragCounterRef.current = 0;
    }
  }

  function getQuarterFromEvent(e: React.DragEvent): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const quarter = Math.round((y / rect.height) * 4);
    return [0, 15, 30, 45][Math.min(Math.max(quarter, 0), 3)];
  }

  function formatDropTime(hour: number, minute: number): string | null {
    if (hour < 0) return null;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  function handleSlotDrop(hour: number, date?: string, e?: React.DragEvent) {
    if (!dragTaskId) return;
    const task = tasks.find(t => t.staffTaskId === dragTaskId);
    if (!task) return;
    const minute = e ? getQuarterFromEvent(e) : dropMinuteRef.current;
    const startTime = formatDropTime(hour, minute);
    const targetDate = date || fmtDate(currentDate);
    scheduleTaskToCalendar(task, targetDate, startTime);
    setDragTaskId(null);
    setDropHour(null);
    dropMinuteRef.current = 0;
    setDropDate(null);
    dragCounterRef.current = 0;
  }

  function handleEventDrop(hour: number, date: string, e?: React.DragEvent) {
    if (!dragEventId) return;
    const evt = events.find(ev => ev.calendarEventId === dragEventId);
    const minute = e ? getQuarterFromEvent(e) : dropMinuteRef.current;
    const startTime = formatDropTime(hour, minute);

    // Preserve duration: shift end time by the same amount
    let endTime: string | null = null;
    if (evt && startTime) {
      const duration = getEventDuration(evt);
      const newStartMin = hour * 60 + minute;
      const newEndMin = newStartMin + duration;
      const endH = Math.floor(newEndMin / 60);
      const endM = newEndMin % 60;
      endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    handleUpdateEvent(dragEventId, { startTime, endTime, eventDate: date });
    setDragEventId(null);
    setDropHour(null);
    dropMinuteRef.current = 0;
    setDropDate(null);
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

  function handleEventClick(evt: CalendarEventItem, e: React.MouseEvent) {
    e.stopPropagation();
    const chip = e.currentTarget as HTMLElement;
    const panel = calendarPanelRef.current;
    if (panel) {
      const panelRect = panel.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      setPopoverPos({
        top: chipRect.bottom - panelRect.top + panel.scrollTop + 4,
        left: chipRect.left - panelRect.left,
      });
    } else {
      const rect = chip.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 4, left: rect.left });
    }
    setSelectedEvent(evt);
  }

  function closePopover() {
    setSelectedEvent(null);
    setPopoverPos(null);
    setShowSetTime(false);
  }

  // Close popover on click outside
  useEffect(() => {
    if (!selectedEvent) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedEvent]);

  function getEventDuration(evt: CalendarEventItem): number {
    if (!evt.startTime || !evt.endTime) return defaultDuration(evt.eventType);
    const [sh, sm] = evt.startTime.split(':').map(Number);
    const [eh, em] = evt.endTime.split(':').map(Number);
    return Math.max((eh * 60 + em) - (sh * 60 + sm), 15);
  }

  function getEventMinuteOffset(evt: CalendarEventItem): number {
    if (!evt.startTime) return 0;
    const [, m] = evt.startTime.split(':').map(Number);
    return m;
  }

  function renderEventChip(evt: CalendarEventItem, layout?: EventLayout) {
    const duration = getEventDuration(evt);
    const minuteOffset = getEventMinuteOffset(evt);
    const heightPx = (duration / 60) * 60;
    const topPx = (minuteOffset / 60) * 60;
    const col = layout?.column ?? 0;
    const totalCols = layout?.totalCols ?? 1;
    const widthPct = 100 / totalCols;
    const leftPct = col * widthPct;
    const padding = totalCols > 1 ? 1 : 0;

    return (
      <div
        key={evt.calendarEventId}
        className={`${getEventStyle(evt.eventType, evt.status)} ${dragEventId === evt.calendarEventId ? styles.eventDragging : ''} ${(dragEventId || dragTaskId) && dragEventId !== evt.calendarEventId ? styles.eventDropThrough : ''}`}
        style={{
          position: 'absolute',
          top: `${topPx}px`,
          left: `calc(${leftPct}% + ${padding}px)`,
          width: `calc(${widthPct}% - ${padding * 2}px)`,
          height: `${heightPx}px`,
          minHeight: '18px',
          zIndex: 1,
        }}
        onClick={e => handleEventClick(evt, e)}
        draggable
        onDragStart={e => { e.stopPropagation(); dragOffsetY.current = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top; setTimeout(() => setDragEventId(evt.calendarEventId), 0); }}
        onDragEnd={() => setDragEventId(null)}
      >
        {heightPx >= 40 ? (
          <>
            <span>{evt.title}</span>
            {evt.residentCode && <span>({evt.residentCode})</span>}
            {evt.startTime && <span>{evt.startTime}{evt.endTime ? `–${evt.endTime}` : ''}</span>}
          </>
        ) : (
          <span>{evt.title} {evt.startTime ?? ''}</span>
        )}
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

  // Precompute overlap layouts for all 7 days
  const dayLayouts = useMemo(() => {
    const layouts = new Map<string, Map<number, EventLayout>>();
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(getWeekStart(currentDate), i);
      const dayStr = fmtDate(dayDate);
      const dayEvents = events.filter(e => e.eventDate === dayStr && e.startTime);
      layouts.set(dayStr, computeOverlapLayout(dayEvents, dragEventId));
    }
    return layouts;
  }, [events, currentDate, dragEventId]);

  /* ── Render ────────────────────────────────────── */

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Home</h1>
          <p>{fmtWeekRange(currentDate)}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.dateControls}>
            <button className={styles.navBtn} onClick={() => navigateDate(-1)}><ChevronLeft size={16} /></button>
            <button className={styles.todayBtn} onClick={() => setCurrentDate(new Date(APP_TODAY))}>Today</button>
            <button className={styles.navBtn} onClick={() => navigateDate(1)}><ChevronRight size={16} /></button>
          </div>
          <button className={styles.addBtn} onClick={() => { setNewEvent(e => ({ ...e, eventDate: fmtDate(currentDate) })); setShowNewForm(true); }}>
            <Plus size={14} /> New Event
          </button>
        </div>
      </header>

      {/* Body: calendar + tasks side by side */}
      <div className={styles.body}>
        {/* Calendar panel */}
        <div className={styles.calendarPanel} ref={calendarPanelRef}>
          {eventsLoading ? (
            <div className={styles.loading}><Loader2 size={20} className={styles.spinner} /> Loading calendar...</div>
          ) : (
            <div className={styles.weekGrid}>
              {/* Column headers (sticky) */}
              <div className={styles.weekCorner} />
              {DAY_NAMES.map((_, i) => {
                const dayDate = addDays(getWeekStart(currentDate), i);
                const dayStr = fmtDate(dayDate);
                const isToday = dayStr === APP_TODAY_STR;
                const hdr = fmtDayHeader(dayDate);
                return (
                  <div key={i} className={`${styles.weekColHeader} ${isToday ? styles.weekColHeaderToday : ''}`}>
                    <span className={styles.weekColName}>{hdr.name}</span>
                    <span className={`${styles.weekColDate} ${isToday ? styles.weekColDateToday : ''}`}>{hdr.date}</span>
                  </div>
                );
              })}
              {/* All-day row (sticky) */}
              <div className={styles.allDayLabel}>all-day</div>
              {DAY_NAMES.map((_, i) => {
                const dayDate = addDays(getWeekStart(currentDate), i);
                const dayStr = fmtDate(dayDate);
                const isToday = dayStr === APP_TODAY_STR;
                const dayUnscheduled = unscheduled.filter(e => e.eventDate === dayStr);
                const isExpanded = expandedDays.has(dayStr);
                const MAX_VISIBLE = 4;
                const showCollapsed = !isExpanded && dayUnscheduled.length > MAX_VISIBLE;
                const visibleEvents = showCollapsed ? dayUnscheduled.slice(0, MAX_VISIBLE - 1) : dayUnscheduled;
                const hiddenCount = dayUnscheduled.length - visibleEvents.length;
                return (
                  <div
                    key={`allday-${i}`}
                    className={`${styles.allDayCell} ${isToday ? styles.allDayCellToday : ''}`}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDragEnter={() => handleSlotDragEnter(-1, dayStr)}
                    onDragLeave={handleSlotDragLeave}
                    onDrop={e => { e.preventDefault(); handleSlotDrop(-1, dayStr); }}
                  >
                    {visibleEvents.map(evt => (
                      <div
                        key={evt.calendarEventId}
                        className={styles.allDayChip}
                        draggable
                        onDragStart={e => { dragOffsetY.current = e.clientY - (e.currentTarget as HTMLElement).getBoundingClientRect().top; setTimeout(() => setDragEventId(evt.calendarEventId), 0); }}
                        onDragEnd={() => setDragEventId(null)}
                        onClick={e => handleEventClick(evt, e)}
                      >
                        {evt.title} {evt.residentCode && `(${evt.residentCode})`}
                      </div>
                    ))}
                    {showCollapsed && (
                      <button
                        className={styles.allDayMore}
                        onClick={() => setExpandedDays(prev => { const next = new Set(prev); next.add(dayStr); return next; })}
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                    {isExpanded && dayUnscheduled.length > MAX_VISIBLE && (
                      <button
                        className={styles.allDayMore}
                        onClick={() => setExpandedDays(prev => { const next = new Set(prev); next.delete(dayStr); return next; })}
                      >
                        show less
                      </button>
                    )}
                  </div>
                );
              })}
              {/* Time rows */}
              {HOURS.map(hour => {
                const hourStr = hour.toString().padStart(2, '0');
                return (
                  <React.Fragment key={hour}>
                    <div className={styles.weekTimeLabel}>{hourLabel(hour)}</div>
                    {DAY_NAMES.map((_, i) => {
                      const dayDate = addDays(getWeekStart(currentDate), i);
                      const dayStr = fmtDate(dayDate);
                      const isToday = dayStr === APP_TODAY_STR;
                      const cellEvents = events.filter(e => e.eventDate === dayStr && e.startTime?.startsWith(hourStr));
                      const isDropTarget = dragTaskId !== null && dropHour === hour && dropDate === dayStr;
                      const isEventDropTarget = dragEventId !== null && dropHour === hour && dropDate === dayStr;
                      return (
                        <div
                          key={`${hour}-${i}`}
                          className={`${styles.weekCell} ${isToday ? styles.weekCellToday : ''} ${(isDropTarget || isEventDropTarget) ? styles.weekCellDropTarget : ''}`}
                          onDragOver={e => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            const minute = getQuarterFromEvent(e);
                            dropMinuteRef.current = minute;
                            if (dropIndicatorRef.current) {
                              dropIndicatorRef.current.style.top = `${(minute / 60) * 100}%`;
                              dropIndicatorRef.current.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                            }
                          }}
                          onDragEnter={() => handleSlotDragEnter(hour, dayStr)}
                          onDragLeave={handleSlotDragLeave}
                          onDrop={e => { e.preventDefault(); handleEventDrop(hour, dayStr, e); handleSlotDrop(hour, dayStr, e); }}
                        >
                          {cellEvents.map(evt => {
                            const layout = dayLayouts.get(dayStr)?.get(evt.calendarEventId);
                            return renderEventChip(evt, layout);
                          })}
                          {(isDropTarget || isEventDropTarget) && (
                            <div ref={dropIndicatorRef} className={styles.dropTimeIndicator} style={{ top: '0%' }}>
                              {hour.toString().padStart(2, '0')}:00
                            </div>
                          )}
                          {(dragEventId || dragTaskId) && (
                            <div
                              className={styles.dragOverlay}
                              onDragOver={e => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                const minute = getQuarterFromEvent(e);
                                dropMinuteRef.current = minute;
                                if (dropIndicatorRef.current) {
                                  dropIndicatorRef.current.style.top = `${(minute / 60) * 100}%`;
                                  dropIndicatorRef.current.textContent = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                                }
                              }}
                              onDragEnter={() => handleSlotDragEnter(hour, dayStr)}
                              onDragLeave={handleSlotDragLeave}
                              onDrop={e => { e.preventDefault(); handleEventDrop(hour, dayStr, e); handleSlotDrop(hour, dayStr, e); }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Event detail popover — inside calendar panel so it scrolls with it */}
          {selectedEvent && popoverPos && (
            <div
              ref={popoverRef}
              className={styles.popover}
              style={{ top: popoverPos.top, left: popoverPos.left }}
            >
              <div className={styles.popoverHeader}>
                <div className={`${styles.popoverDot} ${styles[EVENT_TYPE_STYLES[selectedEvent.eventType] || 'eventOther']}`} />
                <h3 className={styles.popoverTitle}>{selectedEvent.title}</h3>
                <button className={styles.popoverClose} onClick={closePopover}><X size={16} /></button>
              </div>
              <div className={styles.popoverBody}>
                <p className={styles.popoverDetail}>
                  {selectedEvent.eventDate}
                  {selectedEvent.startTime && ` · ${selectedEvent.startTime}`}
                  {selectedEvent.endTime && ` – ${selectedEvent.endTime}`}
                </p>
                {selectedEvent.residentCode && (
                  <p className={styles.popoverDetail}>
                    Resident: <a href="#" className={styles.residentLink} onClick={e => { e.preventDefault(); navigate(`/admin/caseload/${selectedEvent.residentId}`); closePopover(); }}>{selectedEvent.residentCode}</a>
                  </p>
                )}
                <p className={styles.popoverDetail}>Type: {selectedEvent.eventType}</p>
                {selectedEvent.description && <p className={styles.popoverDetail}>{selectedEvent.description}</p>}
                <p className={styles.popoverDetail}>Status: <span className={styles.popoverStatus}>{selectedEvent.status}</span></p>
              </div>
              {selectedEvent.status === 'Scheduled' && (
                <div className={styles.popoverActions}>
                  {selectedEvent.residentId && (
                    <button className={styles.modalBtn} onClick={() => { navigate(`/admin/caseload/${selectedEvent.residentId}`); closePopover(); }}>
                      <User size={12} /> View Patient
                    </button>
                  )}
                  <button className={styles.modalBtnPrimary} onClick={() => handleUpdateEvent(selectedEvent.calendarEventId, { status: 'Completed' })}>
                    Complete
                  </button>
                  {selectedEvent.eventType === 'Counseling' && (
                    <button className={styles.modalBtn} onClick={() => { navigate(`/admin/recordings/new?residentId=${selectedEvent.residentId || ''}`); closePopover(); }}>
                      Log Recording
                    </button>
                  )}
                  {selectedEvent.eventType === 'HomeVisit' && (
                    <button className={styles.modalBtn} onClick={() => { navigate(`/admin/visitations/new?residentId=${selectedEvent.residentId || ''}`); closePopover(); }}>
                      Log Visit
                    </button>
                  )}
                  {!selectedEvent.startTime && !showSetTime && (
                    <button className={styles.modalBtn} onClick={() => setShowSetTime(true)}>
                      Set Time
                    </button>
                  )}
                  {!selectedEvent.startTime && showSetTime && (
                    <div className={styles.setTimeRow}>
                      <input
                        type="time"
                        className={styles.setTimeInput}
                        value={setTimeValue}
                        onChange={e => setSetTimeValue(e.target.value)}
                        autoFocus
                      />
                      <button className={styles.modalBtnPrimary} onClick={() => {
                        if (setTimeValue) handleUpdateEvent(selectedEvent.calendarEventId, { startTime: setTimeValue });
                        setShowSetTime(false);
                      }}>
                        Save
                      </button>
                    </div>
                  )}
                  <button className={styles.modalBtnDanger} onClick={() => handleUpdateEvent(selectedEvent.calendarEventId, { status: 'Cancelled' })}>
                    Cancel
                  </button>
                </div>
              )}
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
                    className={`${isDragging ? styles.taskCardDragging : styles.taskCard} ${exitingTaskIds.has(task.staffTaskId) ? styles.taskCardExiting : ''}`}
                    draggable
                    onDragStart={e => {
                      // Create a small drag image so it looks like collapsing to a line
                      const ghost = document.createElement('div');
                      ghost.style.cssText = 'width:120px;height:2px;background:var(--color-sage,#0f8f7d);border-radius:1px;position:absolute;top:-9999px;';
                      document.body.appendChild(ghost);
                      e.dataTransfer.setDragImage(ghost, 60, 1);
                      setTimeout(() => document.body.removeChild(ghost), 0);
                      handleDragStart(task.staffTaskId);
                    }}
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
                          {Object.entries(ctx).map(([k, v]) => `${formatContextLabel(k)}: ${formatContextValue(k, v)}`).join(' · ')}
                        </p>
                      )}
                      <div className={styles.taskActions}>
                        {task.residentId && (
                          <button
                            className={styles.completeBtn}
                            onClick={e => { e.stopPropagation(); navigate(`/admin/caseload/${task.residentId}`); }}
                          >
                            <User size={12} /> View Patient
                          </button>
                        )}
                        <button
                          className={styles.completeBtn}
                          onClick={e => { e.stopPropagation(); handleTaskAction(task.staffTaskId, 'Completed'); }}
                        >
                          <CheckCircle size={12} /> Done
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

      {/* Schedule task modal */}
      {scheduleTask && (
        <div className={styles.formOverlay} onClick={() => setScheduleTask(null)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{scheduleTask.title}</h3>
            {scheduleTask.residentCode && <p className={styles.modalMeta}>Resident: {scheduleTask.residentCode}</p>}
            {scheduleTask.description && <p className={styles.modalMeta}>{scheduleTask.description}</p>}
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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY, APP_TODAY_STR } from '../../constants';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './CalendarPage.module.css';

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

interface NewEventForm {
  eventType: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  residentId: string;
}

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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6am to 7pm

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  useDocumentTitle('Calendar');
  const navigate = useNavigate();
  const { activeSafehouseId, safehouses } = useSafehouse();
  const [view, setView] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(new Date(APP_TODAY));
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    eventType: 'Counseling',
    title: '',
    description: '',
    eventDate: APP_TODAY_STR,
    startTime: '',
    endTime: '',
    residentId: '',
  });
  const [residents, setResidents] = useState<{ residentId: number; internalCode: string }[]>([]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSafehouseId) params.set('safehouseId', String(activeSafehouseId));
      if (view === 'day') {
        params.set('date', formatDate(currentDate));
      } else {
        const ws = getWeekStart(currentDate);
        params.set('weekStart', formatDate(ws));
      }
      const data = await apiFetch<CalendarEventItem[]>(`/api/staff/calendar?${params}`);
      setEvents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId, currentDate, view]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    apiFetch<{ items: { residentId: number; internalCode: string }[] }>('/api/admin/residents-list')
      .then(data => setResidents(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  function navigate_date(delta: number) {
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
      setNewEvent({ eventType: 'Counseling', title: '', description: '', eventDate: formatDate(currentDate), startTime: '', endTime: '', residentId: '' });
      fetchEvents();
    } catch { /* ignore */ }
  }

  async function handleUpdateEvent(id: number, updates: Record<string, unknown>) {
    try {
      await apiFetch(`/api/staff/calendar/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setSelectedEvent(null);
      fetchEvents();
    } catch { /* ignore */ }
  }

  function getEventStyle(eventType: string, status: string) {
    const base = EVENT_TYPE_STYLES[eventType] || 'eventOther';
    const classes = [styles.eventChip, styles[base]];
    if (status === 'Completed') classes.push(styles.eventCompleted);
    return classes.join(' ');
  }

  function renderEventChip(evt: CalendarEventItem) {
    return (
      <div
        key={evt.calendarEventId}
        className={getEventStyle(evt.eventType, evt.status)}
        onClick={() => setSelectedEvent(evt)}
      >
        {evt.startTime && <span>{evt.startTime}</span>}
        <span>{evt.title}</span>
        {evt.residentCode && <span>({evt.residentCode})</span>}
      </div>
    );
  }

  const todayStr = APP_TODAY_STR;
  const unscheduled = events.filter(e => !e.startTime && e.status !== 'Completed');
  const scheduled = events.filter(e => e.startTime);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>Your daily schedule and events</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={styles.viewToggle}>
            <button className={view === 'day' ? styles.viewBtnActive : styles.viewBtn} onClick={() => setView('day')}>Day</button>
            <button className={view === 'week' ? styles.viewBtnActive : styles.viewBtn} onClick={() => setView('week')}>Week</button>
          </div>
          <button className={styles.addBtn} onClick={() => { setNewEvent(e => ({ ...e, eventDate: formatDate(currentDate) })); setShowNewForm(true); }}>
            <Plus size={15} /> New Event
          </button>
        </div>
      </header>

      <div className={styles.controls}>
        <button className={styles.navBtn} onClick={() => navigate_date(-1)}><ChevronLeft size={18} /></button>
        <button className={styles.todayBtn} onClick={() => setCurrentDate(new Date(APP_TODAY))}>Today</button>
        <span className={styles.dateLabel}>
          {view === 'day' ? formatDateDisplay(currentDate) :
            `${formatDate(getWeekStart(currentDate))} - ${formatDate(addDays(getWeekStart(currentDate), 6))}`}
        </span>
        <button className={styles.navBtn} onClick={() => navigate_date(1)}><ChevronRight size={18} /></button>
      </div>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : view === 'day' ? (
        <>
          {unscheduled.length > 0 && (
            <div className={styles.unscheduledSection}>
              <div className={styles.sectionLabel}>Unscheduled</div>
              <div className={styles.unscheduledList}>
                {unscheduled.map(evt => (
                  <div
                    key={evt.calendarEventId}
                    className={styles.unscheduledCard}
                    onClick={() => setSelectedEvent(evt)}
                  >
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
              return (
                <div key={hour} className={styles.timeSlot}>
                  <div className={styles.timeLabel}>{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</div>
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
            const dayStr = formatDate(dayDate);
            const isToday = dayStr === todayStr;
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

      {/* Event detail modal */}
      {selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{selectedEvent.title}</h3>
            <p className={styles.modalMeta}>Type: {selectedEvent.eventType}</p>
            <p className={styles.modalMeta}>Date: {selectedEvent.eventDate}</p>
            {selectedEvent.startTime && <p className={styles.modalMeta}>Time: {selectedEvent.startTime}{selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''}</p>}
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
                  <button className={styles.modalBtn} onClick={() => handleUpdateEvent(selectedEvent.calendarEventId, { status: 'Cancelled' })}>
                    Cancel Event
                  </button>
                </>
              )}
              <button className={styles.modalBtn} onClick={() => setSelectedEvent(null)}>Close</button>
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

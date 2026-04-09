import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Users, Plus, X, AlertTriangle,
  Calendar, Clock, CheckCircle, UserPlus,
} from 'lucide-react';
import { apiFetch } from '../../api';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MlBadge from '../../components/admin/MlBadge';
import styles from './IncidentsPage.module.css';

/* ── Types ────────────────────────────────────────── */

interface ConferenceResident {
  id: number;
  residentId: number;
  residentCode: string | null;
  currentRiskLevel?: string | null;
  assignedSocialWorker?: string | null;
  source: string;
  discussed: boolean;
  notes: string | null;
}

interface Conference {
  conferenceId: number;
  safehouseId: number;
  safehouseName: string | null;
  scheduledDate: string;
  status: string;
  notes: string | null;
  residentCount: number;
  discussedCount: number;
  residents: ConferenceResident[];
}

interface AlertResident {
  residentId: number;
  internalCode: string | null;
  currentRiskLevel: string | null;
  assignedSocialWorker: string | null;
  safehouseId: number | null;
  source: string;
}

interface SafehouseOption {
  safehouseId: number;
  name: string;
}

/* ── Constants ────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#3498db',
  InProgress: '#f39c12',
  Completed: '#27ae60',
  Cancelled: '#95a5a6',
};

const RISK_COLORS: Record<string, string> = {
  Critical: '#c0392b',
  High: '#d35400',
  Medium: '#f39c12',
  Low: '#27ae60',
};

const SOURCE_LABELS: Record<string, string> = {
  Manual: 'Manual',
  NeedsConference: 'Flagged',
  MlAlert: 'ML Alert',
  Both: 'Flagged + ML',
};

/* ── Component ────────────────────────────────────── */

export default function CaseConferencesPage() {
  useDocumentTitle('Case Conferences');
  const navigate = useNavigate();

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [alerts, setAlerts] = useState<AlertResident[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded conference view
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedData, setExpandedData] = useState<Conference | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createSafehouseId, setCreateSafehouseId] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [confData, alertData] = await Promise.all([
        apiFetch<Conference[]>('/api/admin/case-conferences'),
        apiFetch<AlertResident[]>('/api/admin/case-conferences/alerts'),
      ]);
      setConferences(confData);
      setAlerts(alertData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (showCreate && safehouses.length === 0) {
      apiFetch<SafehouseOption[]>('/api/admin/safehouses').then(setSafehouses).catch(() => {});
    }
  }, [showCreate, safehouses.length]);

  async function loadConferenceDetail(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setExpandedLoading(true);
    try {
      const data = await apiFetch<Conference>(`/api/admin/case-conferences/${id}`);
      setExpandedData(data);
    } catch { setExpandedData(null); }
    finally { setExpandedLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createSafehouseId || !createDate) return;
    setCreating(true);
    try {
      await apiFetch('/api/admin/case-conferences', {
        method: 'POST',
        body: JSON.stringify({
          safehouseId: Number(createSafehouseId),
          scheduledDate: createDate,
          notes: createNotes || null,
        }),
      });
      setShowCreate(false);
      setCreateSafehouseId('');
      setCreateDate('');
      setCreateNotes('');
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function scheduleAlertResident(resident: AlertResident) {
    if (!resident.safehouseId) return;
    try {
      // Ensure next Monday conference exists for this safehouse
      const result = await apiFetch<{ conferenceId: number }>('/api/admin/case-conferences/ensure-next', {
        method: 'POST',
        body: JSON.stringify({ safehouseId: resident.safehouseId }),
      });
      // Add resident to it
      await apiFetch(`/api/admin/case-conferences/${result.conferenceId}/residents`, {
        method: 'POST',
        body: JSON.stringify({
          residentIds: [resident.residentId],
          source: resident.source === 'MlAlert' ? 'MlAlert' : 'NeedsConference',
        }),
      });
      fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule');
    }
  }

  async function markDiscussed(confId: number, residentId: number, discussed: boolean) {
    try {
      await apiFetch(`/api/admin/case-conferences/${confId}/residents/${residentId}`, {
        method: 'PUT',
        body: JSON.stringify({ discussed }),
      });
      // Refresh expanded data
      if (expandedId === confId) {
        const data = await apiFetch<Conference>(`/api/admin/case-conferences/${confId}`);
        setExpandedData(data);
      }
      fetchAll();
    } catch {}
  }

  async function updateConferenceStatus(confId: number, status: string) {
    try {
      await apiFetch(`/api/admin/case-conferences/${confId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      fetchAll();
      if (expandedId === confId) {
        const data = await apiFetch<Conference>(`/api/admin/case-conferences/${confId}`);
        setExpandedData(data);
      }
    } catch {}
  }

  const upcoming = conferences.filter(c => c.status === 'Scheduled' || c.status === 'InProgress');
  const past = conferences.filter(c => c.status === 'Completed' || c.status === 'Cancelled');

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Case Conferences</h1>
          <p className={styles.subtitle}>Monday morning team reviews — discuss resident progress and update intervention plans</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreate(s => !s)} style={{ background: 'linear-gradient(120deg, var(--color-sage), #0d7a6b)' , boxShadow: '0 8px 20px rgba(15,143,125,0.22)' }}>
          {showCreate ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New Conference</>}
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {/* ── Create Form ──────────────────────────── */}
      {showCreate && (
        <form onSubmit={handleCreate} style={{ background: '#fff', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Safehouse</label>
            <select value={createSafehouseId} onChange={e => setCreateSafehouseId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.82rem' }}>
              <option value="">Select safehouse...</option>
              {safehouses.map(s => <option key={s.safehouseId} value={s.safehouseId}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Date</label>
            <input type="date" value={createDate} onChange={e => setCreateDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.82rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Notes (optional)</label>
            <input type="text" value={createNotes} onChange={e => setCreateNotes(e.target.value)} placeholder="e.g. Weekly review" style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.82rem' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={creating} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#fff', background: 'var(--color-sage)', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '999px', cursor: 'pointer' }}>
              {creating ? 'Creating...' : 'Create Conference'}
            </button>
          </div>
        </form>
      )}

      {/* ── ML Alert Table ────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={18} style={{ color: '#e74c3c' }} /> Residents Needing Review ({alerts.length}) <MlBadge />
          </h2>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Risk Level</th>
                  <th>Social Worker</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => {
                  const riskColor = RISK_COLORS[a.currentRiskLevel || ''] || '#95a5a6';
                  return (
                    <tr key={a.residentId} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600, color: 'var(--color-sage)' }}>{a.internalCode || `#${a.residentId}`}</td>
                      <td>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: `${riskColor}18`, color: riskColor, textTransform: 'uppercase' }}>
                          {a.currentRiskLevel || '--'}
                        </span>
                      </td>
                      <td>{a.assignedSocialWorker || '--'}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: a.source === 'MlAlert' || a.source === 'Both' ? '#e74c3c' : '#f39c12' }}>
                          {SOURCE_LABELS[a.source] || a.source}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => scheduleAlertResident(a)}
                            title="Add to next Monday's conference"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(15,143,125,0.3)', background: 'rgba(15,143,125,0.08)', color: 'var(--color-sage)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <UserPlus size={12} /> Schedule
                          </button>
                          <button
                            onClick={() => navigate(`/admin/caseload/${a.residentId}`)}
                            title="Review resident profile"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(15,27,45,0.12)', background: '#fff', color: 'var(--text-strong)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Upcoming Conferences ──────────────────── */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={18} /> Upcoming Conferences ({upcoming.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {upcoming.map(conf => (
              <ConferenceCard
                key={conf.conferenceId}
                conf={conf}
                isExpanded={expandedId === conf.conferenceId}
                expandedData={expandedId === conf.conferenceId ? expandedData : null}
                expandedLoading={expandedId === conf.conferenceId && expandedLoading}
                onToggle={() => loadConferenceDetail(conf.conferenceId)}
                onClickResident={(rid) => navigate(`/admin/caseload/${rid}`)}
                onMarkDiscussed={(rid, d) => markDiscussed(conf.conferenceId, rid, d)}
                onUpdateStatus={(s) => updateConferenceStatus(conf.conferenceId, s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Past Conferences ──────────────────────── */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={18} /> Past Conferences ({past.length})
        </h2>
        {past.length === 0 ? (
          <div className={styles.empty}>No past conferences.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
            {past.map(conf => (
              <ConferenceCard
                key={conf.conferenceId}
                conf={conf}
                isExpanded={expandedId === conf.conferenceId}
                expandedData={expandedId === conf.conferenceId ? expandedData : null}
                expandedLoading={expandedId === conf.conferenceId && expandedLoading}
                onToggle={() => loadConferenceDetail(conf.conferenceId)}
                onClickResident={(rid) => navigate(`/admin/caseload/${rid}`)}
                onMarkDiscussed={(rid, d) => markDiscussed(conf.conferenceId, rid, d)}
                onUpdateStatus={(s) => updateConferenceStatus(conf.conferenceId, s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Conference Card ─────────────────────────────── */

interface ConferenceCardProps {
  conf: Conference;
  isExpanded: boolean;
  expandedData: Conference | null;
  expandedLoading: boolean;
  onToggle: () => void;
  onClickResident: (residentId: number) => void;
  onMarkDiscussed: (residentId: number, discussed: boolean) => void;
  onUpdateStatus: (status: string) => void;
}

function ConferenceCard({ conf, isExpanded, expandedData, expandedLoading, onToggle, onClickResident, onMarkDiscussed, onUpdateStatus }: ConferenceCardProps) {
  const color = STATUS_COLORS[conf.status] || '#95a5a6';
  const isActive = conf.status === 'Scheduled' || conf.status === 'InProgress';

  return (
    <div style={{ background: '#fff', border: isExpanded ? '2px solid var(--color-sage)' : '1px solid rgba(15,27,45,0.08)', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Card header — always visible */}
      <div
        style={{ padding: '1rem 1.25rem', cursor: 'pointer' }}
        onClick={onToggle}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(15,143,125,0.02)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} style={{ color: 'var(--color-sage)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-strong)' }}>
              {conf.scheduledDate}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem', borderRadius: '4px', background: `${color}18`, color, textTransform: 'uppercase' }}>
            {conf.status}
          </span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {conf.safehouseName || `Safehouse #${conf.safehouseId}`}
          <span style={{ margin: '0 0.4rem' }}>&middot;</span>
          <Users size={13} style={{ verticalAlign: 'middle', marginRight: '0.2rem' }} />
          {conf.discussedCount}/{conf.residentCount} discussed
        </div>
        {conf.notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontStyle: 'italic' }}>{conf.notes}</div>}
      </div>

      {/* Expanded: resident cards */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(15,27,45,0.06)', padding: '1rem 1.25rem', background: 'rgba(15,27,45,0.015)' }}>
          {expandedLoading ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
            </div>
          ) : expandedData && expandedData.residents.length > 0 ? (
            <>
              {/* Status actions */}
              {isActive && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {conf.status === 'Scheduled' && (
                    <button onClick={() => onUpdateStatus('InProgress')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(243,156,18,0.3)', background: 'rgba(243,156,18,0.08)', color: '#f39c12', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                      Start Meeting
                    </button>
                  )}
                  {conf.status === 'InProgress' && (
                    <button onClick={() => onUpdateStatus('Completed')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(39,174,96,0.3)', background: 'rgba(39,174,96,0.08)', color: '#27ae60', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                      <CheckCircle size={13} /> Complete Meeting
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
                {expandedData.residents.map(r => {
                  const riskColor = RISK_COLORS[r.currentRiskLevel || ''] || '#95a5a6';
                  return (
                    <div
                      key={r.id}
                      style={{
                        background: r.discussed ? 'rgba(39,174,96,0.04)' : '#fff',
                        border: r.discussed ? '1px solid rgba(39,174,96,0.2)' : '1px solid rgba(15,27,45,0.1)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        transition: 'box-shadow 0.15s',
                        position: 'relative',
                      }}
                      onClick={() => onClickResident(r.residentId)}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,27,45,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-sage)' }}>
                          {r.residentCode || `#${r.residentId}`}
                        </span>
                        {r.discussed && <CheckCircle size={14} style={{ color: '#27ae60' }} />}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', background: `${riskColor}18`, color: riskColor, textTransform: 'uppercase' }}>
                          {r.currentRiskLevel || '--'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {SOURCE_LABELS[r.source] || r.source}
                        </span>
                      </div>
                      {r.assignedSocialWorker && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SW: {r.assignedSocialWorker}</div>
                      )}
                      {/* Discussed toggle */}
                      {isActive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onMarkDiscussed(r.residentId, !r.discussed); }}
                          style={{
                            marginTop: '0.5rem',
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
                            border: r.discussed ? '1px solid rgba(39,174,96,0.3)' : '1px solid rgba(15,27,45,0.12)',
                            background: r.discussed ? 'rgba(39,174,96,0.1)' : '#fff',
                            color: r.discussed ? '#27ae60' : 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          <CheckCircle size={11} /> {r.discussed ? 'Discussed' : 'Mark Discussed'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No residents scheduled for this conference.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

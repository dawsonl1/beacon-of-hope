import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Eye, AlertTriangle, Calendar, ClipboardList } from 'lucide-react';
import { apiFetch } from '../../api';
import { formatDate } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Pagination } from '../../components/admin/Pagination';
import styles from './VisitationsPage.module.css';

/* ── Types ──────────────────────────────────────────── */

interface VisitationRow {
  visitationId: number;
  residentId: number;
  residentCode: string | null;
  visitDate: string | null;
  socialWorker: string | null;
  visitType: string | null;
  locationVisited: string | null;
  safetyConcernsNoted: boolean | null;
  followUpNeeded: boolean | null;
  visitOutcome: string | null;
  familyCooperationLevel: string | null;
}

interface VisitationListResponse {
  items: VisitationRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface Conference {
  planId: number;
  residentId: number;
  residentCode: string | null;
  planCategory: string | null;
  planDescription: string | null;
  caseConferenceDate: string | null;
  status: string | null;
}

interface ConferencesResponse {
  upcoming: Conference[];
  past: Conference[];
}

/* ── Constants ──────────────────────────────────────── */

const VISIT_TYPES = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
];

function getVisitTypeClass(type: string | null): string {
  if (!type) return styles.typeRoutine;
  if (type.includes('Initial')) return styles.typeInitial;
  if (type.includes('Routine')) return styles.typeRoutine;
  if (type.includes('Reintegration')) return styles.typeReintegration;
  if (type.includes('Post')) return styles.typePostPlacement;
  if (type.includes('Emergency')) return styles.typeEmergency;
  return styles.typeRoutine;
}

function getCoopClass(level: string | null): string {
  if (!level) return '';
  if (level === 'Cooperative') return styles.coopCooperative;
  if (level.includes('Partially')) return styles.coopPartially;
  if (level === 'Uncooperative') return styles.coopUncooperative;
  if (level === 'Hostile') return styles.coopHostile;
  return '';
}

/* ── Component ──────────────────────────────────────── */

export default function VisitationsPage() {
  useDocumentTitle('Visitations');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'conferences' ? 'conferences' : 'visitations';

  // Visitations state
  const [visitations, setVisitations] = useState<VisitationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [safetyOnly, setSafetyOnly] = useState(false);

  // Conferences state
  const [conferences, setConferences] = useState<ConferencesResponse | null>(null);
  const [confLoading, setConfLoading] = useState(false);

  const pageSize = 15;

  // Fetch visitations
  useEffect(() => {
    if (activeTab !== 'visitations') return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (visitTypeFilter) params.set('visitType', visitTypeFilter);
    if (safetyOnly) params.set('safetyOnly', 'true');

    apiFetch<VisitationListResponse>(`/api/admin/visitations?${params}`)
      .then((data) => {
        setVisitations(data.items);
        setTotalCount(data.totalCount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, page, visitTypeFilter, safetyOnly]);

  // Fetch conferences
  useEffect(() => {
    if (activeTab !== 'conferences') return;
    setConfLoading(true);
    apiFetch<ConferencesResponse>('/api/admin/conferences')
      .then(setConferences)
      .catch(console.error)
      .finally(() => setConfLoading(false));
  }, [activeTab]);

  function switchTab(tab: string) {
    setSearchParams(tab === 'conferences' ? { tab: 'conferences' } : {});
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className={styles.page}>
      {/* ── Header ───────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Home Visitations & Conferences</h1>
          </div>
          <p className={styles.subtitle}>
            Track field visits, family assessments, and case conference schedules
          </p>
        </div>
        {activeTab === 'visitations' && (
          <Link to="/admin/visitations/new" className={styles.newBtn}>
            <Plus size={15} />
            New Visit
          </Link>
        )}
      </header>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'visitations' ? styles.tabActive : ''}`}
          onClick={() => switchTab('visitations')}
        >
          <Eye size={16} />
          Home Visitations
          {totalCount > 0 && <span className={styles.tabCount}>{totalCount}</span>}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'conferences' ? styles.tabActive : ''}`}
          onClick={() => switchTab('conferences')}
        >
          <Calendar size={16} />
          Case Conferences
          {conferences && conferences.upcoming.length > 0 && (
            <span className={styles.tabCount}>{conferences.upcoming.length} upcoming</span>
          )}
        </button>
      </div>

      {/* ── Visitations Tab ──────────────────────────── */}
      {activeTab === 'visitations' && (
        <>
          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={visitTypeFilter}
              onChange={(e) => { setVisitTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Visit Types</option>
              {VISIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              className={`${styles.safetyToggle} ${safetyOnly ? styles.safetyToggleActive : ''}`}
              onClick={() => { setSafetyOnly(!safetyOnly); setPage(1); }}
            >
              <AlertTriangle size={14} />
              Safety Concerns Only
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading visitations...</div>
          ) : visitations.length === 0 ? (
            <div className={styles.tableCard}>
              <div className={styles.emptyState}>
                <ClipboardList size={40} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>No visitations found</p>
                <p className={styles.emptyText}>
                  {safetyOnly || visitTypeFilter
                    ? 'Try adjusting your filters.'
                    : 'Create a new home visitation to get started.'}
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Resident</th>
                      <th>Social Worker</th>
                      <th>Visit Type</th>
                      <th>Cooperation</th>
                      <th>Safety</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitations.map((v) => (
                      <tr
                        key={v.visitationId}
                        className={v.safetyConcernsNoted ? styles.rowSafety : ''}
                      >
                        <td>
                          <Link
                            to={`/admin/visitations/${v.visitationId}`}
                            style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                          >
                            {formatDate(v.visitDate)}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-deep-navy)' }}>
                          {v.residentCode ?? `#${v.residentId}`}
                        </td>
                        <td>{v.socialWorker ?? '--'}</td>
                        <td>
                          <span className={`${styles.visitTypeBadge} ${getVisitTypeClass(v.visitType)}`}>
                            {v.visitType ?? '--'}
                          </span>
                        </td>
                        <td>
                          {v.familyCooperationLevel ? (
                            <span className={`${styles.cooperationBadge} ${getCoopClass(v.familyCooperationLevel)}`}>
                              {v.familyCooperationLevel}
                            </span>
                          ) : '--'}
                        </td>
                        <td>
                          {v.safetyConcernsNoted ? (
                            <span className={styles.safetyBadge}>
                              <AlertTriangle size={12} />
                              Flagged
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-warm-gray)', fontSize: '0.78rem' }}>None</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{v.visitOutcome ?? '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />
              )}
            </div>
          )}
        </>
      )}

      {/* ── Conferences Tab ──────────────────────────── */}
      {activeTab === 'conferences' && (
        <>
          {confLoading ? (
            <div className={styles.loading}>Loading conferences...</div>
          ) : !conferences ? (
            <div className={styles.loading}>Unable to load conferences.</div>
          ) : (
            <>
              {/* Upcoming */}
              <div className={styles.conferenceSection}>
                <h2 className={styles.sectionTitle}>
                  Upcoming Conferences
                  <span className={styles.sectionCount}>({conferences.upcoming.length})</span>
                </h2>
                {conferences.upcoming.length === 0 ? (
                  <div className={styles.tableCard}>
                    <div className={styles.emptyState}>
                      <Calendar size={36} className={styles.emptyIcon} />
                      <p className={styles.emptyTitle}>No upcoming conferences</p>
                      <p className={styles.emptyText}>
                        Case conferences are scheduled via intervention plans.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.conferenceGrid}>
                    {conferences.upcoming.map((c) => (
                      <div key={c.planId} className={`${styles.conferenceCard} ${styles.conferenceUpcoming}`}>
                        <div className={styles.conferenceDate}>
                          {formatDate(c.caseConferenceDate)}
                        </div>
                        <div className={styles.conferenceResident}>
                          Resident: {c.residentCode ?? `#${c.residentId}`}
                        </div>
                        {c.planCategory && (
                          <div className={styles.conferenceCategory}>{c.planCategory}</div>
                        )}
                        {c.planDescription && (
                          <div className={styles.conferenceDesc}>
                            {c.planDescription.length > 120
                              ? c.planDescription.slice(0, 120) + '...'
                              : c.planDescription}
                          </div>
                        )}
                        {c.status && (
                          <span className={styles.conferenceStatus}>{c.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past */}
              <div className={styles.conferenceSection}>
                <h2 className={styles.sectionTitle}>
                  Past Conferences
                  <span className={styles.sectionCount}>({conferences.past.length})</span>
                </h2>
                {conferences.past.length === 0 ? (
                  <div className={styles.tableCard}>
                    <div className={styles.emptyState}>
                      <p className={styles.emptyTitle}>No past conferences</p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.conferenceGrid}>
                    {conferences.past.map((c) => (
                      <div key={c.planId} className={`${styles.conferenceCard} ${styles.conferencePast}`}>
                        <div className={styles.conferenceDate}>
                          {formatDate(c.caseConferenceDate)}
                        </div>
                        <div className={styles.conferenceResident}>
                          Resident: {c.residentCode ?? `#${c.residentId}`}
                        </div>
                        {c.planCategory && (
                          <div className={styles.conferenceCategory}>{c.planCategory}</div>
                        )}
                        {c.planDescription && (
                          <div className={styles.conferenceDesc}>
                            {c.planDescription.length > 120
                              ? c.planDescription.slice(0, 120) + '...'
                              : c.planDescription}
                          </div>
                        )}
                        {c.status && (
                          <span className={styles.conferenceStatus}>{c.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

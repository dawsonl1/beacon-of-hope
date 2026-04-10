import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, ClipboardList } from 'lucide-react';
import { apiFetch } from '../../api';
import { formatDate } from '../../constants';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Pagination from '../../components/admin/Pagination';
import Dropdown from '../../components/admin/Dropdown';
import styles from './VisitationsPage.module.css';

/* ── Types ──────────────────────────────────────────── */

interface VisitationRow {
  visitationId: number;
  residentId: number;
  residentCode: string | null;
  residentFirstName: string | null;
  residentLastName: string | null;
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
  const navigate = useNavigate();
  const { activeSafehouseId } = useSafehouse();

  const [visitations, setVisitations] = useState<VisitationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [safetyOnly, setSafetyOnly] = useState(false);

  const pageSize = 15;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (visitTypeFilter) params.set('visitType', visitTypeFilter);
    if (safetyOnly) params.set('safetyOnly', 'true');
    if (activeSafehouseId) params.set('safehouseId', String(activeSafehouseId));

    apiFetch<VisitationListResponse>(`/api/admin/visitations?${params}`)
      .then((data) => {
        setVisitations(data.items);
        setTotalCount(data.totalCount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, visitTypeFilter, safetyOnly, activeSafehouseId]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className={styles.page}>
      {/* ── Header ───────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Home Visitations</h1>
          </div>
          <p className={styles.subtitle}>
            Track field visits and family assessments
          </p>
        </div>
        <Link to="/admin/visitations/new" className={styles.newBtn}>
          <Plus size={15} />
          New Visit
        </Link>
      </header>
          <div className={styles.filters}>
            <Dropdown
              value={visitTypeFilter}
              placeholder="All Visit Types"
              options={[
                { value: '', label: 'All Visit Types' },
                ...VISIT_TYPES.map((t) => ({ value: t, label: t })),
              ]}
              onChange={(v) => { setVisitTypeFilter(v); setPage(1); }}
              compact
            />
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
                        onClick={() => navigate(`/admin/visitations/${v.visitationId}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ fontWeight: 600 }}>
                          {formatDate(v.visitDate)}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-deep-navy)' }}>
                          {v.residentFirstName && v.residentLastName
                            ? `${v.residentFirstName} ${v.residentLastName[0]}.`
                            : v.residentCode ?? `#${v.residentId}`}
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
    </div>
  );
}

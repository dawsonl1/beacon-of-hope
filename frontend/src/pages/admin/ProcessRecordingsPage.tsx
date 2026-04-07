import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FileText, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiFetch } from '../../api';
import { ApiError } from '../../components/ApiError';
import { formatDate } from '../../constants';
import styles from './ProcessRecordingsPage.module.css';

interface RecordingRow {
  recordingId: number;
  residentId: number;
  residentCode: string | null;
  sessionDate: string | null;
  socialWorker: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  narrativePreview: string | null;
  progressNoted: boolean | null;
  concernsFlagged: boolean | null;
  referralMade: boolean | null;
}

interface RecordingsResponse {
  items: RecordingRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface ResidentOption {
  residentId: number;
  internalCode: string;
  assignedSocialWorker: string | null;
}

const emotionalColor: Record<string, string> = {
  'Severe Distress': '#A5524D',
  'Distressed': '#C4756E',
  'Struggling': '#D48C53',
  'Unsettled': '#D4A853',
  'Neutral': '#8A8078',
  'Coping': '#7A9E7E',
  'Stable': '#5A8A5E',
  'Good': '#4A7A4E',
  'Thriving': '#3A6A3E',
};

function getEmotionalColor(state: string | null): string {
  if (!state) return '#8A8078';
  return emotionalColor[state] ?? '#8A8078';
}

const PAGE_SIZE = 15;

export default function ProcessRecordingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [residentFilter, setResidentFilter] = useState(searchParams.get('residentId') ?? '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'date_desc');
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load resident options for the filter dropdown
  useEffect(() => {
    apiFetch<ResidentOption[]>('/api/admin/residents?page=1&pageSize=500&sortBy=code_asc')
      .then((data) => {
        // The residents endpoint returns objects; extract what we need
        const mapped = (data as unknown as Array<Record<string, unknown>>).map((r) => ({
          residentId: r.residentId as number,
          internalCode: (r.internalCode as string) ?? '',
          assignedSocialWorker: (r.assignedSocialWorker as string) ?? null,
        }));
        setResidents(mapped);
      })
      .catch(() => {
        // Non-critical: filter will just be empty
      });
  }, []);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('sortBy', sortBy);
      if (residentFilter) params.set('residentId', residentFilter);

      const data = await apiFetch<RecordingsResponse>(`/api/admin/recordings?${params}`);
      setRecordings(data.items);
      setTotalCount(data.totalCount);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, residentFilter, sortBy]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // Keep URL params in sync
  useEffect(() => {
    const params: Record<string, string> = {};
    if (page > 1) params.page = String(page);
    if (residentFilter) params.residentId = residentFilter;
    if (sortBy !== 'date_desc') params.sortBy = sortBy;
    setSearchParams(params, { replace: true });
  }, [page, residentFilter, sortBy, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className={styles.page}>
      {error && <ApiError />}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Process Recordings</h1>
          <p className={styles.subtitle}>Counseling session documentation</p>
        </div>
        <button className={styles.newBtn} onClick={() => navigate('/admin/recordings/new')}>
          <Plus size={15} />
          New Recording
        </button>
      </header>

      {/* Privacy Notice */}
      <div className={styles.privacyNotice}>
        <Shield size={14} />
        <span>
          These records contain confidential counseling notes about minors. Access is restricted to
          authorized staff. Do not share or reproduce outside this system.
        </span>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={residentFilter}
          onChange={(e) => {
            setResidentFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Residents</option>
          {residents.map((r) => (
            <option key={r.residentId} value={r.residentId}>
              {r.internalCode}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 150 }}
        >
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="worker">By Social Worker</option>
        </select>
        <span className={styles.countLabel}>
          {totalCount} recording{totalCount !== 1 ? 's' : ''} total
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {!loading && recordings.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={36} />
            <p>No recordings found</p>
            <span>
              {residentFilter
                ? 'Try clearing the resident filter.'
                : 'Create a new recording to get started.'}
            </span>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Resident</th>
                    <th>Social Worker</th>
                    <th>Type</th>
                    <th>Emotional State</th>
                    <th>Summary</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {recordings.map((r) => (
                    <tr
                      key={r.recordingId}
                      className={r.concernsFlagged ? styles.rowFlagged : ''}
                      onClick={() => navigate(`/admin/recordings/${r.recordingId}`)}
                    >
                      <td className={styles.dateCell}>{formatDate(r.sessionDate)}</td>
                      <td>
                        <span className={styles.residentCode}>{r.residentCode ?? '--'}</span>
                      </td>
                      <td>
                        <span className={styles.workerName}>{r.socialWorker ?? '--'}</span>
                      </td>
                      <td>
                        {r.sessionType && (
                          <span className={styles.typeBadge}>{r.sessionType}</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.emotionalCell}>
                          <span
                            className={styles.emotionalDot}
                            style={{ background: getEmotionalColor(r.emotionalStateObserved) }}
                          />
                          {r.emotionalStateObserved ?? '--'}
                        </div>
                      </td>
                      <td>
                        <span className={styles.narrativePreview}>
                          {r.narrativePreview
                            ? r.narrativePreview + (r.narrativePreview.length >= 120 ? '...' : '')
                            : '--'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.flagsCell}>
                          {r.concernsFlagged && (
                            <span className={`${styles.flagBadge} ${styles.flagConcern}`}>
                              <AlertTriangle size={10} />
                              Concern
                            </span>
                          )}
                          {r.progressNoted && (
                            <span className={`${styles.flagBadge} ${styles.flagProgress}`}>
                              <CheckCircle size={10} />
                              Progress
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

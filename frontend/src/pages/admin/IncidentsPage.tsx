import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Pagination from '../../components/admin/Pagination';
import styles from './IncidentsPage.module.css';

interface IncidentRow {
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

const SEVERITY_STYLES: Record<string, string> = {
  Critical: 'severityCritical',
  High: 'severityHigh',
  Medium: 'severityMedium',
  Low: 'severityLow',
};

type Tab = 'open' | 'resolved' | 'all';

export default function IncidentsPage() {
  useDocumentTitle('Incidents');
  const navigate = useNavigate();
  const { activeSafehouseId } = useSafehouse();
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState('');
  const [tab, setTab] = useState<Tab>('open');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const pageSize = 20;

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (activeSafehouseId) params.set('safehouseId', String(activeSafehouseId));
      if (severityFilter) params.set('severity', severityFilter);
      if (tab === 'open') params.set('resolved', 'false');
      if (tab === 'resolved') params.set('resolved', 'true');
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDir) params.set('sortDir', sortDir);
      const data = await apiFetch<{ total: number; items: IncidentRow[] }>(`/api/admin/incidents?${params}`);
      setIncidents(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId, page, severityFilter, tab, sortBy, sortDir]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortBy !== col) return <ChevronDown size={12} className={styles.sortInactive} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className={styles.sortActive} />
      : <ChevronDown size={12} className={styles.sortActive} />;
  }

  function handleTabChange(t: Tab) {
    setTab(t);
    setPage(1);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Incidents</h1>
          <p className={styles.subtitle}>Track and manage incident reports</p>
        </div>
        <button className={styles.addBtn} onClick={() => navigate('/admin/incidents/new')}>
          <Plus size={15} /> Report Incident
        </button>
      </header>

      {/* ── Tabs ─────────────────────────────── */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'open' ? styles.tabActive : ''}`} onClick={() => handleTabChange('open')}>
          Open
        </button>
        <button className={`${styles.tab} ${tab === 'resolved' ? styles.tabActive : ''}`} onClick={() => handleTabChange('resolved')}>
          Resolved
        </button>
        <button className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`} onClick={() => handleTabChange('all')}>
          All
        </button>
      </div>

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}>
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                    Date <SortIcon col="date" />
                  </th>
                  <th>Resident</th>
                  <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                    Type <SortIcon col="type" />
                  </th>
                  <th onClick={() => handleSort('severity')} style={{ cursor: 'pointer' }}>
                    Severity <SortIcon col="severity" />
                  </th>
                  <th onClick={() => handleSort('reportedby')} style={{ cursor: 'pointer' }}>
                    Reported By <SortIcon col="reportedby" />
                  </th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                    Status <SortIcon col="status" />
                  </th>
                  <th>Follow-Up</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                      {tab === 'open' ? 'No open incidents.' : tab === 'resolved' ? 'No resolved incidents.' : 'No incidents match the current filters.'}
                    </td>
                  </tr>
                ) : incidents.map(inc => (
                  <tr key={inc.incidentId} onClick={() => navigate(`/admin/incidents/${inc.incidentId}`)}>
                    <td>{inc.incidentDate || '-'}</td>
                    <td>{inc.residentCode || '-'}</td>
                    <td>{inc.incidentType || '-'}</td>
                    <td>
                      <span className={`${styles.severityBadge} ${styles[SEVERITY_STYLES[inc.severity || ''] || '']}`}>
                        {inc.severity || '-'}
                      </span>
                    </td>
                    <td>{inc.reportedBy || '-'}</td>
                    <td>
                      <span className={`${styles.resolvedBadge} ${inc.resolved ? styles.resolvedYes : styles.resolvedNo}`}>
                        {inc.resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                    <td>{inc.followUpRequired ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {incidents.length > 0 && <Pagination page={page} pageSize={pageSize} totalCount={total} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}

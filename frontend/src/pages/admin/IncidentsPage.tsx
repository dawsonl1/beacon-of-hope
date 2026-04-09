import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
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
  const [resolvedFilter, setResolvedFilter] = useState('');
  const pageSize = 20;

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (activeSafehouseId) params.set('safehouseId', String(activeSafehouseId));
      if (severityFilter) params.set('severity', severityFilter);
      if (resolvedFilter === 'true') params.set('resolved', 'true');
      if (resolvedFilter === 'false') params.set('resolved', 'false');
      const data = await apiFetch<{ total: number; items: IncidentRow[] }>(`/api/admin/incidents?${params}`);
      setIncidents(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId, page, severityFilter, resolvedFilter]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

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

      <div className={styles.filters}>
        <select className={styles.filterSelect} value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}>
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select className={styles.filterSelect} value={resolvedFilter} onChange={e => { setResolvedFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : incidents.length === 0 ? (
        <div className={styles.empty}>No incidents found.</div>
      ) : (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Resident</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Reported By</th>
                  <th>Status</th>
                  <th>Follow-Up</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
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
          <Pagination page={page} pageSize={pageSize} totalCount={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

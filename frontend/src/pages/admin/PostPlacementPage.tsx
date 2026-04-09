import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Pagination from '../../components/admin/Pagination';
import styles from './IncidentsPage.module.css';

interface PostPlacementResident {
  residentId: number;
  internalCode: string | null;
  caseControlNo: string | null;
  safehouseId: number | null;
  safehouse: string | null;
  caseStatus: string | null;
  reintegrationType: string | null;
  reintegrationStatus: string | null;
  dateClosed: string | null;
  assignedSocialWorker: string | null;
  currentRiskLevel: string | null;
  lastVisit: string | null;
  totalVisits: number;
}

interface Summary {
  total: number;
  byType: { type: string | null; count: number }[];
  byStatus: { status: string | null; count: number }[];
}

const TYPE_COLORS: Record<string, string> = {
  'Family Reunification': '#27ae60',
  'Foster Care': '#3498db',
  'Adoption': '#9b59b6',
  'Independent Living': '#e67e22',
};

export default function PostPlacementPage() {
  useDocumentTitle('Post-Placement');
  const navigate = useNavigate();
  const { activeSafehouseId } = useSafehouse();
  const [residents, setResidents] = useState<PostPlacementResident[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeSafehouseId ? `?safehouseId=${activeSafehouseId}` : '';
      const [resData, sumData] = await Promise.all([
        apiFetch<PostPlacementResident[]>(`/api/admin/post-placement${params}`),
        apiFetch<Summary>(`/api/admin/post-placement/summary${params}`),
      ]);
      setResidents(resData);
      setSummary(sumData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Post-Placement Monitoring</h1>
          <p className={styles.subtitle}>Track reintegrated residents and follow-up visits</p>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '12px', padding: '1rem 1.5rem', flex: '1', minWidth: '160px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Total Placed</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-strong)' }}>{summary.total}</div>
              </div>
              {summary.byType.filter(t => t.type).map(t => (
                <div key={t.type} style={{ background: '#fff', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '12px', padding: '1rem 1.5rem', flex: '1', minWidth: '160px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: TYPE_COLORS[t.type || ''] || 'var(--text-muted)' }}>{t.type}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-strong)' }}>{t.count}</div>
                </div>
              ))}
            </div>
          )}

          {/* Residents table */}
          {residents.length === 0 ? (
            <div className={styles.empty}>No reintegrated residents found.</div>
          ) : (
            <>
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Safehouse</th>
                      <th>Pathway</th>
                      <th>Status</th>
                      <th>Date Closed</th>
                      <th>Social Worker</th>
                      <th>Last Visit</th>
                      <th>Visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.slice((page - 1) * pageSize, page * pageSize).map(r => (
                      <tr key={r.residentId} onClick={() => navigate(`/admin/caseload/${r.residentId}`)}>
                        <td style={{ fontWeight: 600, color: 'var(--color-sage)' }}>{r.internalCode || '-'}</td>
                        <td>{r.safehouse || '-'}</td>
                        <td>
                          {r.reintegrationType && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px', background: `${TYPE_COLORS[r.reintegrationType] || '#95a5a6'}18`, color: TYPE_COLORS[r.reintegrationType] || '#95a5a6' }}>
                              {r.reintegrationType}
                            </span>
                          )}
                        </td>
                        <td>{r.caseStatus || '-'}</td>
                        <td>{r.dateClosed || '-'}</td>
                        <td>{r.assignedSocialWorker || '-'}</td>
                        <td>{r.lastVisit || 'None'}</td>
                        <td>{r.totalVisits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={pageSize} totalCount={residents.length} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}

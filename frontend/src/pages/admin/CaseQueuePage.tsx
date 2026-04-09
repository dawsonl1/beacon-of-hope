import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserCheck } from 'lucide-react';
import { apiFetch } from '../../api';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './IncidentsPage.module.css';

interface UnclaimedResident {
  residentId: number;
  internalCode: string | null;
  caseControlNo: string | null;
  safehouseId: number | null;
  safehouse: string | null;
  caseCategory: string | null;
  currentRiskLevel: string | null;
  dateOfAdmission: string | null;
}

const RISK_COLORS: Record<string, string> = {
  Critical: 'severityCritical', High: 'severityHigh', Medium: 'severityMedium', Low: 'severityLow',
};

export default function CaseQueuePage() {
  useDocumentTitle('Case Queue');
  const navigate = useNavigate();
  const { activeSafehouseId } = useSafehouse();
  const [residents, setResidents] = useState<UnclaimedResident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeSafehouseId ? `?safehouseId=${activeSafehouseId}` : '';
      const data = await apiFetch<UnclaimedResident[]>(`/api/admin/residents/unclaimed${params}`);
      setResidents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  async function handleClaim(residentId: number) {
    setClaiming(residentId);
    try {
      await apiFetch(`/api/admin/residents/${residentId}/claim`, { method: 'POST' });
      fetchQueue();
    } catch { /* ignore */ }
    finally { setClaiming(null); }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Case Queue</h1>
          <p className={styles.subtitle}>Unclaimed residents awaiting assignment</p>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : residents.length === 0 ? (
        <div className={styles.empty}>No unclaimed cases. All residents have been assigned.</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Resident</th>
                <th>Case No.</th>
                <th>Safehouse</th>
                <th>Category</th>
                <th>Risk</th>
                <th>Admitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {residents.map(r => (
                <tr key={r.residentId}>
                  <td style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-sage)' }} onClick={() => navigate(`/admin/caseload/${r.residentId}`)}>
                    {r.internalCode || '-'}
                  </td>
                  <td>{r.caseControlNo || '-'}</td>
                  <td>{r.safehouse || '-'}</td>
                  <td>{r.caseCategory || '-'}</td>
                  <td>
                    {r.currentRiskLevel && (
                      <span className={`${styles.severityBadge} ${styles[RISK_COLORS[r.currentRiskLevel] || '']}`}>
                        {r.currentRiskLevel}
                      </span>
                    )}
                  </td>
                  <td>{r.dateOfAdmission || '-'}</td>
                  <td>
                    <button
                      onClick={() => handleClaim(r.residentId)}
                      disabled={claiming === r.residentId}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)',
                        padding: '0.35rem 0.7rem', borderRadius: '8px', border: 'none',
                        background: 'var(--color-sage)', color: '#fff', cursor: 'pointer',
                        opacity: claiming === r.residentId ? 0.6 : 1,
                      }}
                    >
                      <UserCheck size={14} />
                      {claiming === r.residentId ? 'Claiming...' : 'Claim'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

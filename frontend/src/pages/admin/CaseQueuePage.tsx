import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, UserCheck } from 'lucide-react';
import { apiFetch } from '../../api';
import { useSafehouse } from '../../contexts/SafehouseContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './IncidentsPage.module.css';

interface QueueResident {
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

type TabName = 'unclaimed' | 'my-claimed';

export default function CaseQueuePage() {
  useDocumentTitle('Case Queue');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeSafehouseId } = useSafehouse();

  const [activeTab, setActiveTab] = useState<TabName>(
    (searchParams.get('tab') as TabName) || 'unclaimed'
  );

  const [residents, setResidents] = useState<QueueResident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);

  const fetchUnclaimed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = activeSafehouseId ? `?safehouseId=${activeSafehouseId}` : '';
      const data = await apiFetch<QueueResident[]>(`/api/admin/residents/unclaimed${params}`);
      setResidents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId]);

  const fetchMyClaimed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = activeSafehouseId ? `?safehouseId=${activeSafehouseId}` : '';
      const data = await apiFetch<QueueResident[]>(`/api/admin/residents/my-claimed${params}`);
      setResidents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load claimed residents');
    } finally {
      setLoading(false);
    }
  }, [activeSafehouseId]);

  useEffect(() => {
    if (activeTab === 'unclaimed') fetchUnclaimed();
    else fetchMyClaimed();
  }, [activeTab, fetchUnclaimed, fetchMyClaimed]);

  function handleTabChange(tab: TabName) {
    setActiveTab(tab);
    setSearchParams({ tab });
  }

  async function handleClaim(residentId: number) {
    setClaiming(residentId);
    try {
      await apiFetch(`/api/admin/residents/${residentId}/claim`, { method: 'POST' });
      fetchUnclaimed();
    } catch { /* ignore */ }
    finally { setClaiming(null); }
  }

  const emptyMessage = activeTab === 'unclaimed'
    ? 'No unclaimed cases. All residents have been assigned.'
    : 'You have no claimed residents.';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Case Queue</h1>
          <p className={styles.subtitle}>
            {activeTab === 'unclaimed'
              ? 'Unclaimed residents awaiting assignment'
              : 'Residents assigned to you'}
          </p>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'unclaimed' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('unclaimed')}
        >
          Unclaimed
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'my-claimed' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('my-claimed')}
        >
          My Claimed Residents
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : residents.length === 0 ? (
        <div className={styles.empty}>{emptyMessage}</div>
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
                {activeTab === 'unclaimed' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {residents.map(r => (
                <tr
                  key={r.residentId}
                  onClick={activeTab === 'my-claimed' ? () => navigate(`/admin/caseload/${r.residentId}`) : undefined}
                  style={activeTab === 'my-claimed' ? { cursor: 'pointer' } : undefined}
                >
                  <td
                    style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-sage)' }}
                    onClick={() => navigate(`/admin/caseload/${r.residentId}`)}
                  >
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
                  {activeTab === 'unclaimed' && (
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
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

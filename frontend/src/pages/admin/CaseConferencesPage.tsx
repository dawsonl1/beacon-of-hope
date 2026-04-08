import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { apiFetch } from '../../api';
import styles from './IncidentsPage.module.css';

interface ConferenceItem {
  planId: number;
  residentId: number;
  residentCode: string | null;
  planCategory: string | null;
  planDescription: string | null;
  status: string | null;
  caseConferenceDate: string | null;
  targetDate: string | null;
  targetValue: number | null;
  servicesProvided: string | null;
}

export default function CaseConferencesPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ConferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ConferenceItem[]>('/api/admin/intervention-plans');
      setPlans(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const upcoming = plans.filter(p => p.caseConferenceDate && new Date(p.caseConferenceDate) >= new Date());
  const past = plans.filter(p => !p.caseConferenceDate || new Date(p.caseConferenceDate) < new Date());

  const STATUS_COLORS: Record<string, string> = {
    Open: '#3498db', 'In Progress': '#f39c12', Achieved: '#27ae60', Closed: '#95a5a6',
  };

  function PlanCard({ plan }: { plan: ConferenceItem }) {
    const color = STATUS_COLORS[plan.status || ''] || '#95a5a6';
    return (
      <div
        style={{
          background: '#fff', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '12px',
          padding: '1rem 1.25rem', cursor: 'pointer', transition: 'box-shadow 0.2s',
        }}
        onClick={() => navigate(`/admin/caseload/${plan.residentId}`)}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,27,45,0.06)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-sage)', fontSize: '0.9rem' }}>
            {plan.residentCode || `Resident #${plan.residentId}`}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: `${color}18`, color, textTransform: 'uppercase' }}>
            {plan.status}
          </span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
          {plan.planCategory} {plan.caseConferenceDate && `- ${plan.caseConferenceDate}`}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-strong)' }}>
          {plan.planDescription ? (plan.planDescription.length > 100 ? plan.planDescription.slice(0, 100) + '...' : plan.planDescription) : 'No description'}
        </div>
        {plan.targetValue != null && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Target: {plan.targetValue} {plan.targetDate && `by ${plan.targetDate}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Case Conferences</h1>
          <p className={styles.subtitle}>Intervention plans and case conference scheduling</p>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={18} /> Upcoming Conferences ({upcoming.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
                {upcoming.map(p => <PlanCard key={p.planId} plan={p} />)}
              </div>
            </div>
          )}

          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.75rem' }}>
              All Intervention Plans ({past.length})
            </h2>
            {past.length === 0 ? (
              <div className={styles.empty}>No intervention plans found.</div>
            ) : (
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Target</th>
                      <th>Conference Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map(p => (
                      <tr key={p.planId} onClick={() => navigate(`/admin/caseload/${p.residentId}`)}>
                        <td style={{ fontWeight: 600, color: 'var(--color-sage)' }}>{p.residentCode || '-'}</td>
                        <td>{p.planCategory || '-'}</td>
                        <td>{p.planDescription ? (p.planDescription.length > 60 ? p.planDescription.slice(0, 60) + '...' : p.planDescription) : '-'}</td>
                        <td>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: `${STATUS_COLORS[p.status || ''] || '#95a5a6'}18`, color: STATUS_COLORS[p.status || ''] || '#95a5a6', textTransform: 'uppercase' }}>
                            {p.status || '-'}
                          </span>
                        </td>
                        <td>{p.targetValue != null ? p.targetValue : '-'}</td>
                        <td>{p.caseConferenceDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Users, Plus, X, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Pagination from '../../components/admin/Pagination';
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

interface ResidentOption {
  residentId: number;
  internalCode: string;
}

export default function CaseConferencesPage() {
  useDocumentTitle('Case Conferences');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<ConferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Form state — auto-open if scheduleFor param is present
  const scheduleFor = searchParams.get('scheduleFor') || '';
  const [showForm, setShowForm] = useState(!!scheduleFor);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [formResidentId, setFormResidentId] = useState(scheduleFor);
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  useEffect(() => {
    if (showForm && residents.length === 0) {
      apiFetch<ResidentOption[]>('/api/admin/residents-list').then(setResidents).catch(() => {});
    }
  }, [showForm, residents.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formResidentId || !formDate) {
      setFormError('Resident and conference date are required.');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      await apiFetch('/api/admin/intervention-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: Number(formResidentId),
          planCategory: formCategory || null,
          planDescription: formDescription || null,
          caseConferenceDate: formDate,
          status: 'Open',
        }),
      });
      if (scheduleFor) {
        navigate(`/admin/caseload/${scheduleFor}`);
        return;
      }
      setShowForm(false);
      setFormResidentId('');
      setFormCategory('');
      setFormDescription('');
      setFormDate('');
      fetchPlans();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setFormSubmitting(false);
    }
  }

  const upcoming = plans.filter(p => p.caseConferenceDate && new Date(p.caseConferenceDate) >= APP_TODAY);
  const allPast = plans.filter(p => !p.caseConferenceDate || new Date(p.caseConferenceDate) < APP_TODAY);
  const past = allPast.slice((page - 1) * pageSize, page * pageSize);

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
      {scheduleFor && (
        <button
          onClick={() => navigate(`/admin/caseload/${scheduleFor}`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--color-sage)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '0', marginBottom: '0.75rem' }}
        >
          <ArrowLeft size={14} /> Back to Resident
        </button>
      )}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Case Conferences</h1>
          <p className={styles.subtitle}>Intervention plans and case conference scheduling</p>
        </div>
        <button className={styles.addBtn} onClick={() => {
          if (showForm && scheduleFor) { navigate(`/admin/caseload/${scheduleFor}`); return; }
          setShowForm(f => !f);
        }}>
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Schedule Conference</>}
        </button>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label htmlFor="conf-resident" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Resident</label>
            <select id="conf-resident" value={formResidentId} onChange={e => setFormResidentId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}>
              <option value="">Select resident...</option>
              {residents.map(r => <option key={r.residentId} value={r.residentId}>{r.internalCode}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="conf-category" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Category</label>
            <select id="conf-category" value={formCategory} onChange={e => setFormCategory(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }}>
              <option value="">Select...</option>
              <option value="Rehabilitation">Rehabilitation</option>
              <option value="Education">Education</option>
              <option value="Health">Health</option>
              <option value="Reintegration">Reintegration</option>
              <option value="Protection">Protection</option>
            </select>
          </div>
          <div>
            <label htmlFor="conf-date" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Conference Date</label>
            <input id="conf-date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="conf-desc" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>Description</label>
            <textarea id="conf-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }} />
          </div>
          {formError && <div style={{ gridColumn: '1 / -1', color: '#c0392b', fontSize: '0.85rem' }}>{formError}</div>}
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={formSubmitting} className={styles.addBtn}>
              {formSubmitting ? 'Scheduling...' : 'Schedule Conference'}
            </button>
          </div>
        </form>
      )}

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
              All Intervention Plans ({allPast.length})
            </h2>
            {allPast.length === 0 ? (
              <div className={styles.empty}>No intervention plans found.</div>
            ) : (
              <>
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
                <Pagination page={page} pageSize={pageSize} totalCount={allPast.length} onPageChange={setPage} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

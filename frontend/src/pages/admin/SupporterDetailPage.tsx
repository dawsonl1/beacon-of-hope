import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatAmount, formatEnumLabel } from '../../constants';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './SupporterDetailPage.module.css';

interface SupporterDetail {
  supporterId: number;
  supporterType: string | null;
  displayName: string | null;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  relationshipType: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  country: string | null;
  status: string | null;
  acquisitionChannel: string | null;
  firstDonationDate: string | null;
  createdAt: string | null;
  totalDonated: number;
}

interface DonationRow {
  donationId: number;
  donationType: string | null;
  donationDate: string | null;
  amount: number | null;
  estimatedValue: number | null;
  currencyCode: string | null;
  impactUnit: string | null;
  isRecurring: boolean | null;
  campaignName: string | null;
  notes: string | null;
}

interface DetailResponse {
  supporter: SupporterDetail;
  donations: DonationRow[];
}

interface MlPrediction {
  modelName: string;
  score: number;
  scoreLabel: string;
  metadata: string | null;
}

export default function SupporterDetailPage() {
  useDocumentTitle('Supporter Detail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [churn, setChurn] = useState<MlPrediction | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<DetailResponse>(`/api/admin/supporters/${id}`)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));

    apiFetch<MlPrediction[]>(`/api/ml/predictions/supporter/${id}`)
      .then(preds => {
        const c = preds.find(p => p.modelName === 'donor-churn');
        setChurn(c ?? null);
      })
      .catch(() => { /* ML predictions are non-critical */ });
  }, [id]);

  function churnColor(label: string) {
    switch (label) {
      case 'Critical': return '#c0392b';
      case 'High': return '#d35400';
      case 'Medium': return '#f39c12';
      case 'Low': return '#27ae60';
      default: return 'var(--text-muted)';
    }
  }

  function parseRiskFactors(metadata: string | null): string[] {
    if (!metadata) return [];
    try {
      const parsed = JSON.parse(metadata);
      return Array.isArray(parsed.top_risk_factors) ? parsed.top_risk_factors : [];
    } catch {
      return [];
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/supporters/${id}`, { method: 'DELETE' });
      navigate('/admin/donors', { replace: true });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete supporter.');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  function statusBadgeClass(s: string | null) {
    if (!s) return styles.statusInactive;
    const k = s.toLowerCase();
    if (k === 'active') return styles.statusActive;
    if (k === 'lapsed') return styles.statusLapsed;
    return styles.statusInactive;
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div></div>;
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/admin/donors')}><ArrowLeft size={16} /> Back to Donors</button>
        <div className={styles.error}>{error ?? 'Supporter not found'}</div>
      </div>
    );
  }

  const s = data.supporter;
  const name = s.displayName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Unnamed';

  return (
    <div className={styles.page}>
      <button className={styles.backLink} onClick={() => navigate('/admin/donors')}>
        <ArrowLeft size={16} /> Back to Donors
      </button>

      {deleteError && <div className={styles.error}>{deleteError}</div>}

      {/* Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div>
            <h1 className={styles.profileName}>{name}</h1>
            {s.organizationName && <p className={styles.profileOrg}>{s.organizationName}</p>}
          </div>
          {isAdmin && (
            <div className={styles.profileActions}>
              <button className={styles.editBtn} onClick={() => navigate(`/admin/donors/${id}/edit`)}>
                <Pencil size={14} /> Edit
              </button>
              <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Type</label>
            <span>{s.supporterType ? <span className={styles.typeBadge}>{s.supporterType}</span> : '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Status</label>
            <span className={`${styles.statusBadge} ${statusBadgeClass(s.status)}`}>{s.status ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Email</label>
            <span>{s.email ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Phone</label>
            <span>{s.phone ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Region</label>
            <span>{[s.region, s.country].filter(Boolean).join(', ') || '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Acquisition Channel</label>
            <span>{s.acquisitionChannel ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>First Donation</label>
            <span>{formatDate(s.firstDonationDate)}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Member Since</label>
            <span>{formatDate(s.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className={styles.totalCard}>
        <span className={styles.totalLabel}>Lifetime Giving</span>
        <span className={styles.totalAmount}>{formatAmount(s.totalDonated)}</span>
        <span className={styles.totalCount}>{data.donations.length} donation{data.donations.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Retention Risk */}
      {churn && (
        <div className={styles.riskCard}>
          <div className={styles.riskHeader}>
            <h2 className={styles.riskTitle}>Retention Risk</h2>
          </div>
          <div className={styles.riskBody}>
            <div className={styles.riskScore}>
              <span className={styles.riskScoreValue} style={{ color: churnColor(churn.scoreLabel) }}>
                {Math.round(churn.score)}
              </span>
              <span className={styles.riskScoreMax}>/ 100</span>
            </div>
            <span className={styles.riskLabel} style={{
              color: churnColor(churn.scoreLabel),
              background: `${churnColor(churn.scoreLabel)}14`,
              borderColor: `${churnColor(churn.scoreLabel)}40`,
            }}>
              {churn.scoreLabel}
            </span>
          </div>
          {parseRiskFactors(churn.metadata).length > 0 && (
            <div className={styles.riskFactors}>
              <span className={styles.riskFactorsLabel}>Top risk factors</span>
              <ul className={styles.riskFactorsList}>
                {parseRiskFactors(churn.metadata).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Donation History */}
      <h2 className={styles.sectionTitle}>Donation History</h2>
      <div className={styles.tableCard}>
        {data.donations.length === 0 ? (
          <div className={styles.empty}>No donations recorded yet</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Campaign</th>
                  <th>Recurring</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.donations.map(d => (
                  <tr key={d.donationId}>
                    <td>{formatDate(d.donationDate)}</td>
                    <td>{d.donationType ? formatEnumLabel(d.donationType) : '--'}</td>
                    <td className={styles.amountCol}>
                      {d.amount ? formatAmount(d.amount) : d.estimatedValue ? `${formatAmount(d.estimatedValue)} est.` : d.impactUnit ?? '--'}
                    </td>
                    <td>{d.campaignName ?? '--'}</td>
                    <td>{d.isRecurring ? <span className={styles.recurringBadge}>Yes</span> : 'No'}</td>
                    <td>{d.notes ? d.notes.slice(0, 50) + (d.notes.length > 50 ? '...' : '') : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDelete && (
        <DeleteConfirmDialog
          title="Delete Supporter"
          message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          isDeleting={deleting}
        />
      )}
    </div>
  );
}

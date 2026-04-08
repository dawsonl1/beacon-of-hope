import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatAmount, formatEnumLabel } from '../../constants';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
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

export default function SupporterDetailPage() {
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<DetailResponse>(`/api/admin/supporters/${id}`)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

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

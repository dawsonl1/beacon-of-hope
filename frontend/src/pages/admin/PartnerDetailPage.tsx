import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatEnumLabel } from '../../constants';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import styles from './SupporterDetailPage.module.css';

interface PartnerDetail {
  partnerId: number;
  partnerName: string | null;
  partnerType: string | null;
  roleType: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<PartnerDetail>(`/api/admin/partners/${id}`)
      .then(setPartner)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
      navigate('/admin/donors?tab=partners', { replace: true });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete partner.');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  function statusBadgeClass(s: string | null) {
    if (!s) return styles.statusInactive;
    const k = s.toLowerCase();
    if (k === 'active') return styles.statusActive;
    if (k === 'prospective') return styles.statusLapsed;
    return styles.statusInactive;
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div></div>;
  }

  if (error || !partner) {
    return (
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate('/admin/donors?tab=partners')}><ArrowLeft size={16} /> Back to Partners</button>
        <div className={styles.error}>{error ?? 'Partner not found'}</div>
      </div>
    );
  }

  const name = partner.partnerName || partner.contactName || 'Unnamed';

  return (
    <div className={styles.page}>
      <button className={styles.backLink} onClick={() => navigate('/admin/donors?tab=partners')}>
        <ArrowLeft size={16} /> Back to Partners
      </button>

      {deleteError && <div className={styles.error}>{deleteError}</div>}

      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div>
            <h1 className={styles.profileName}>{name}</h1>
            {partner.contactName && partner.partnerName !== partner.contactName && (
              <p className={styles.profileOrg}>Contact: {partner.contactName}</p>
            )}
          </div>
          {isAdmin && (
            <div className={styles.profileActions}>
              <button className={styles.editBtn} onClick={() => navigate(`/admin/partners/${id}/edit`)}>
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
            <label>Partner Type</label>
            <span>{partner.partnerType ? <span className={styles.typeBadge}>{partner.partnerType}</span> : '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Status</label>
            <span className={`${styles.statusBadge} ${statusBadgeClass(partner.status)}`}>{partner.status ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Role</label>
            <span>{partner.roleType ? formatEnumLabel(partner.roleType) : '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Email</label>
            <span>{partner.email ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Phone</label>
            <span>{partner.phone ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Region</label>
            <span>{partner.region ?? '--'}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Partner Since</label>
            <span>{formatDate(partner.startDate)}</span>
          </div>
          {partner.endDate && (
            <div className={styles.infoItem}>
              <label>End Date</label>
              <span>{formatDate(partner.endDate)}</span>
            </div>
          )}
        </div>
      </div>

      {partner.notes && (
        <>
          <h2 className={styles.sectionTitle}>Notes</h2>
          <div className={styles.tableCard}>
            <div style={{ padding: '1rem 1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
              {partner.notes}
            </div>
          </div>
        </>
      )}

      {showDelete && (
        <DeleteConfirmDialog
          title="Delete Partner"
          message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          isDeleting={deleting}
        />
      )}
    </div>
  );
}

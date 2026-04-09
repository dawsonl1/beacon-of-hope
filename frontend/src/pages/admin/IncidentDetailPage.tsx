import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './VisitationDetailPage.module.css';

interface IncidentDetail {
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

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#c0392b',
  High: '#d35400',
  Medium: '#f39c12',
  Low: '#27ae60',
};

export default function IncidentDetailPage() {
  useDocumentTitle('Incident Detail');
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<IncidentDetail>(`/api/admin/incidents/${id}`)
      .then(setIncident)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load incident'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/incidents/${id}`, { method: 'DELETE' });
      navigate('/admin/incidents');
    } catch {
      setDeleting(false);
    }
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div></div>;
  if (error) return <div className={styles.page}><p style={{ color: '#c0392b' }}>{error}</p></div>;
  if (!incident) return <div className={styles.page}><p>Incident not found.</p></div>;

  return (
    <div className={styles.page}>
      <Link to="/admin/incidents" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Incidents
      </Link>

      <div className={styles.headerRow}>
        <h1 className={styles.title}>
          Incident #{incident.incidentId}
          {incident.severity && (
            <span style={{
              display: 'inline-block',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              marginLeft: '0.75rem',
              background: `${SEVERITY_COLORS[incident.severity] || '#95a5a6'}18`,
              color: SEVERITY_COLORS[incident.severity] || '#95a5a6',
              verticalAlign: 'middle',
              textTransform: 'uppercase',
            }}>
              {incident.severity}
            </span>
          )}
        </h1>
        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => navigate(`/admin/incidents/${id}/edit`)}>
            <Edit size={14} /> Edit
          </button>
          {isAdmin && (
            <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date</span>
            <span className={styles.detailValue}>{incident.incidentDate || '-'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Resident</span>
            <span className={styles.detailValue}>
              {incident.residentId ? (
                <Link to={`/admin/caseload/${incident.residentId}`} style={{ color: 'var(--color-sage)', textDecoration: 'none', fontWeight: 600 }}>
                  {incident.residentCode || `#${incident.residentId}`}
                </Link>
              ) : '-'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Type</span>
            <span className={styles.detailValue}>{incident.incidentType || '-'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Reported By</span>
            <span className={styles.detailValue}>{incident.reportedBy || '-'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.detailValue}>
              <span style={{
                color: incident.resolved ? '#27ae60' : '#e74c3c',
                fontWeight: 600,
              }}>
                {incident.resolved ? 'Resolved' : 'Open'}
              </span>
              {incident.resolutionDate && ` (${incident.resolutionDate})`}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Follow-Up Required</span>
            <span className={styles.detailValue}>{incident.followUpRequired ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Description</h3>
        <p className={styles.textContent}>{incident.description || 'No description provided.'}</p>
      </div>

      {incident.responseTaken && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Response Taken</h3>
          <p className={styles.textContent}>{incident.responseTaken}</p>
        </div>
      )}

      {showDelete && (
        <DeleteConfirmDialog
          title="Delete Incident?"
          message="This will permanently delete this incident report. This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          isDeleting={deleting}
        />
      )}
    </div>
  );
}

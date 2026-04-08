import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, ChevronDown, ChevronRight,
  Loader2, User, Briefcase, Heart, Home, Shield, ClipboardList, RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { formatDate } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import styles from './ResidentDetailPage.module.css';

interface ResidentDetail {
  residentId: number;
  caseControlNo: string | null;
  internalCode: string | null;
  safehouseId: number | null;
  safehouse: string | null;
  caseStatus: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  birthStatus: string | null;
  placeOfBirth: string | null;
  religion: string | null;
  caseCategory: string | null;
  subCatOrphaned: boolean | null;
  subCatTrafficked: boolean | null;
  subCatChildLabor: boolean | null;
  subCatPhysicalAbuse: boolean | null;
  subCatSexualAbuse: boolean | null;
  subCatOsaec: boolean | null;
  subCatCicl: boolean | null;
  subCatAtRisk: boolean | null;
  subCatStreetChild: boolean | null;
  subCatChildWithHiv: boolean | null;
  isPwd: boolean | null;
  pwdType: string | null;
  hasSpecialNeeds: boolean | null;
  specialNeedsDiagnosis: string | null;
  familyIs4ps: boolean | null;
  familySoloParent: boolean | null;
  familyIndigenous: boolean | null;
  familyParentPwd: boolean | null;
  familyInformalSettler: boolean | null;
  dateOfAdmission: string | null;
  ageUponAdmission: string | null;
  presentAge: string | null;
  lengthOfStay: string | null;
  referralSource: string | null;
  referringAgencyPerson: string | null;
  dateColbRegistered: string | null;
  dateColbObtained: string | null;
  assignedSocialWorker: string | null;
  initialCaseAssessment: string | null;
  dateCaseStudyPrepared: string | null;
  reintegrationType: string | null;
  reintegrationStatus: string | null;
  initialRiskLevel: string | null;
  currentRiskLevel: string | null;
  dateEnrolled: string | null;
  dateClosed: string | null;
  createdAt: string | null;
  notesRestricted: string | null;
}

const SUB_CAT_LABELS: Record<string, string> = {
  subCatOrphaned: 'Orphaned',
  subCatTrafficked: 'Trafficked',
  subCatChildLabor: 'Child Labor',
  subCatPhysicalAbuse: 'Physical Abuse',
  subCatSexualAbuse: 'Sexual Abuse',
  subCatOsaec: 'OSAEC',
  subCatCicl: 'CICL',
  subCatAtRisk: 'At Risk',
  subCatStreetChild: 'Street Child',
  subCatChildWithHiv: 'Child with HIV',
};

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value || '--'}</span>
    </div>
  );
}

function BoolTag({ label, value }: { label: string; value: boolean | null }) {
  if (!value) return null;
  return <span className={styles.tag}>{label}</span>;
}

function Section({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setOpen(!open)}>
        <div className={styles.sectionLeft}>
          <Icon size={16} className={styles.sectionIcon} />
          <span>{title}</span>
        </div>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

export default function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<ResidentDetail>(`/api/admin/residents/${id}`)
      .then(setResident)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await apiFetch(`/api/admin/residents/${id}`, { method: 'DELETE' });
      navigate('/admin/caseload', { replace: true });
    } catch (err: unknown) {
      setError((err as Error).message);
      setIsDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading resident...</span>
        </div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p>{error ?? 'Resident not found.'}</p>
          <button className={styles.backLink} onClick={() => navigate('/admin/caseload')}>
            <ArrowLeft size={16} /> Back to Caseload
          </button>
        </div>
      </div>
    );
  }

  const activeSubCats = Object.entries(SUB_CAT_LABELS)
    .filter(([key]) => (resident as unknown as Record<string, unknown>)[key] === true);

  return (
    <div className={styles.page}>
      {showDelete && (
        <DeleteConfirmDialog
          title="Delete Resident"
          message={`This will permanently delete resident ${resident.internalCode ?? resident.caseControlNo ?? 'unknown'}. This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          isDeleting={isDeleting}
        />
      )}

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backLink} onClick={() => navigate('/admin/caseload')}>
          <ArrowLeft size={16} /> Back to Caseload
        </button>
        {isAdmin && (
          <div className={styles.actions}>
            <button className={styles.editBtn} onClick={() => navigate(`/admin/caseload/${id}/edit`)}>
              <Edit size={15} /> Edit
            </button>
            <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className={styles.detailHeader}>
        <div>
          <h1 className={styles.title}>{resident.internalCode ?? 'No Code'}</h1>
          <p className={styles.headerMeta}>
            Case #{resident.caseControlNo ?? '--'}
            {resident.safehouse && <> &middot; {resident.safehouse}</>}
          </p>
        </div>
        <div className={styles.headerBadges}>
          {resident.caseStatus && (
            <span className={`${styles.badge} ${styles.badgeStatus}`}>{resident.caseStatus}</span>
          )}
          {resident.currentRiskLevel && (
            <span className={`${styles.badge} ${styles[`badgeRisk${resident.currentRiskLevel}`] ?? styles.badgeRiskDefault}`}>
              {resident.currentRiskLevel} Risk
            </span>
          )}
        </div>
      </div>

      {/* Sections */}
      <Section title="Identity" icon={User} defaultOpen>
        <div className={styles.fieldGrid}>
          <InfoField label="Internal Code" value={resident.internalCode} />
          <InfoField label="Case Control No." value={resident.caseControlNo} />
          <InfoField label="Safehouse" value={resident.safehouse} />
          <InfoField label="Date Enrolled" value={formatDate(resident.dateEnrolled)} />
          <InfoField label="Date Closed" value={formatDate(resident.dateClosed)} />
          <InfoField label="Created" value={formatDate(resident.createdAt)} />
        </div>
      </Section>

      <Section title="Demographics" icon={User}>
        <div className={styles.fieldGrid}>
          <InfoField label="Sex" value={resident.sex} />
          <InfoField label="Date of Birth" value={formatDate(resident.dateOfBirth)} />
          <InfoField label="Birth Status" value={resident.birthStatus} />
          <InfoField label="Place of Birth" value={resident.placeOfBirth} />
          <InfoField label="Religion" value={resident.religion} />
          <InfoField label="Present Age" value={resident.presentAge} />
        </div>
      </Section>

      <Section title="Case Information" icon={Briefcase} defaultOpen>
        <div className={styles.fieldGrid}>
          <InfoField label="Case Category" value={resident.caseCategory} />
          <InfoField label="Case Status" value={resident.caseStatus} />
        </div>
        {activeSubCats.length > 0 && (
          <div className={styles.tagSection}>
            <span className={styles.fieldLabel}>Sub-Categories</span>
            <div className={styles.tagWrap}>
              {activeSubCats.map(([, label]) => (
                <span key={label} className={styles.tag}>{label}</span>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="Disability / Special Needs" icon={Heart}>
        <div className={styles.fieldGrid}>
          <InfoField label="Is PWD" value={resident.isPwd ? 'Yes' : 'No'} />
          <InfoField label="PWD Type" value={resident.pwdType} />
          <InfoField label="Has Special Needs" value={resident.hasSpecialNeeds ? 'Yes' : 'No'} />
          <InfoField label="Diagnosis" value={resident.specialNeedsDiagnosis} />
        </div>
      </Section>

      <Section title="Family Profile" icon={Home}>
        <div className={styles.tagWrap}>
          <BoolTag label="4Ps Beneficiary" value={resident.familyIs4ps} />
          <BoolTag label="Solo Parent" value={resident.familySoloParent} />
          <BoolTag label="Indigenous" value={resident.familyIndigenous} />
          <BoolTag label="Parent with Disability" value={resident.familyParentPwd} />
          <BoolTag label="Informal Settler" value={resident.familyInformalSettler} />
        </div>
        {!resident.familyIs4ps && !resident.familySoloParent && !resident.familyIndigenous
          && !resident.familyParentPwd && !resident.familyInformalSettler && (
          <p className={styles.noData}>No family flags set.</p>
        )}
      </Section>

      <Section title="Admission & Referral" icon={ClipboardList}>
        <div className={styles.fieldGrid}>
          <InfoField label="Date of Admission" value={formatDate(resident.dateOfAdmission)} />
          <InfoField label="Age upon Admission" value={resident.ageUponAdmission} />
          <InfoField label="Length of Stay" value={resident.lengthOfStay} />
          <InfoField label="Referral Source" value={resident.referralSource} />
          <InfoField label="Referring Agency/Person" value={resident.referringAgencyPerson} />
          <InfoField label="COLB Registered" value={formatDate(resident.dateColbRegistered)} />
          <InfoField label="COLB Obtained" value={formatDate(resident.dateColbObtained)} />
        </div>
      </Section>

      <Section title="Social Worker & Assessment" icon={User}>
        <div className={styles.fieldGrid}>
          <InfoField label="Assigned Social Worker" value={resident.assignedSocialWorker} />
          <InfoField label="Initial Assessment" value={resident.initialCaseAssessment} />
          <InfoField label="Case Study Prepared" value={formatDate(resident.dateCaseStudyPrepared)} />
        </div>
      </Section>

      <Section title="Reintegration" icon={RefreshCw}>
        <div className={styles.fieldGrid}>
          <InfoField label="Reintegration Type" value={resident.reintegrationType} />
          <InfoField label="Reintegration Status" value={resident.reintegrationStatus} />
        </div>
      </Section>

      <Section title="Risk Assessment" icon={Shield}>
        <div className={styles.fieldGrid}>
          <InfoField label="Initial Risk Level" value={resident.initialRiskLevel} />
          <InfoField label="Current Risk Level" value={resident.currentRiskLevel} />
        </div>
      </Section>

      {resident.notesRestricted && (
        <Section title="Notes (Restricted)" icon={ClipboardList}>
          <p className={styles.notes}>{resident.notesRestricted}</p>
        </Section>
      )}
    </div>
  );
}

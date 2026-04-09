import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, ChevronDown, ChevronRight,
  Loader2, User, Briefcase, Heart, Home, Shield, ClipboardList, RefreshCw,
  AlertTriangle, Activity, GraduationCap, Stethoscope, Plus, Users,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { formatDate } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './ResidentDetailPage.module.css';

interface MlPrediction {
  id: number;
  modelName: string;
  score: number | null;
  scoreLabel: string | null;
  predictedAt: string;
  metadata: string | null;
}

const ML_SCORE_COLORS: Record<string, string> = {
  Critical: '#c0392b',
  High: '#d35400',
  Medium: '#f39c12',
  Low: '#27ae60',
  Ready: '#27ae60',
  Progressing: '#3498db',
  'Early Stage': '#f39c12',
  'Not Ready': '#c0392b',
};

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
  useDocumentTitle('Resident Detail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const backTo = `/admin/caseload${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const isAdmin = user?.roles?.includes('Admin') ?? false;
  const isStaff = user?.roles?.includes('Staff') ?? false;

  const [resident, setResident] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [predictions, setPredictions] = useState<MlPrediction[]>([]);
  const [educationRecords, setEducationRecords] = useState<any[]>([]);
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [conferences, setConferences] = useState<any[]>([]);
  const [emotionalTrends, setEmotionalTrends] = useState<{ sessionDate: string; emotionalStateObserved: string; emotionalStateEnd: string }[]>([]);

  useEffect(() => {
    setLoading(true);
    apiFetch<ResidentDetail>(`/api/admin/residents/${id}`)
      .then(setResident)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (id) {
      apiFetch<MlPrediction[]>(`/api/ml/predictions/resident/${id}`).then(setPredictions).catch(() => {});
      apiFetch<any[]>(`/api/admin/education-records?residentId=${id}`).then(setEducationRecords).catch(() => {});
      apiFetch<any[]>(`/api/admin/health-records?residentId=${id}`).then(setHealthRecords).catch(() => {});
      apiFetch<{ items: any[] }>(`/api/admin/incidents?residentId=${id}`).then(d => setIncidents(d.items || [])).catch(() => {});
      apiFetch<any[]>(`/api/admin/intervention-plans?residentId=${id}`).then(setConferences).catch(() => {});
      apiFetch<any[]>(`/api/admin/recordings/emotional-trends?residentId=${id}`).then(setEmotionalTrends).catch(() => {});
    }
  }, [id]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await apiFetch(`/api/admin/residents/${id}`, { method: 'DELETE' });
      navigate(backTo, { replace: true });
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
          <button className={styles.backLink} onClick={() => navigate(backTo)}>
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
        <button className={styles.backLink} onClick={() => navigate(backTo)}>
          <ArrowLeft size={16} /> Back to Caseload
        </button>
        {(isAdmin || isStaff) && (
          <div className={styles.actions}>
            <button className={styles.editBtn} onClick={() => navigate(`/admin/caseload/${id}/edit`)}>
              <Edit size={15} /> Edit
            </button>
            {isAdmin && (
              <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>
                <Trash2 size={15} /> Delete
              </button>
            )}
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

      {/* Closed Case Banner */}
      {resident.caseStatus === 'Closed' && (
        <div className={styles.closedBanner}>
          <AlertTriangle size={16} />
          <div>
            <strong>Case Closed</strong>
            <span>This resident's case is closed. Risk assessments are not generated for closed cases.</span>
          </div>
        </div>
      )}

      {/* ML Predictions */}
      {predictions.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {predictions.map(p => {
            const color = ML_SCORE_COLORS[p.scoreLabel || ''] || '#95a5a6';
            const isIncidentModel = p.modelName.includes('incident');
            const isHighRisk = isIncidentModel && (p.scoreLabel === 'High' || p.scoreLabel === 'Critical');
            const label = p.modelName
              .replace('incident-early-warning-', '')
              .replace('reintegration-readiness', 'Reintegration Readiness')
              .replace('selfharm', 'Self-Harm Risk')
              .replace('runaway', 'Runaway Risk');
            return (
              <div
                key={p.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${color}30`,
                  borderRadius: '12px',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  minWidth: '220px',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: `${color}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isIncidentModel ? (
                    <AlertTriangle size={20} style={{ color }} />
                  ) : (
                    <Activity size={20} style={{ color }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    {p.score !== null && (
                      <span style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{Math.round(p.score)}</span>
                    )}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color }}>
                      {p.scoreLabel}
                    </span>
                  </div>
                  {isHighRisk && (
                    <button
                      onClick={() => navigate(`/admin/conferences?scheduleFor=${id}`)}
                      className={styles.scheduleBtn}
                    >
                      Schedule Conference
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sections */}
      <Section title="Identity" icon={User}>
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

      <Section title="Case Information" icon={Briefcase}>
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

      {emotionalTrends.length > 0 && (
        <Section title="Emotional Trajectory" icon={Activity}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem 0' }}>
            {(() => {
              const EMOTIONAL_ORDER = ['Severe Distress', 'Distressed', 'Struggling', 'Unsettled', 'Neutral', 'Coping', 'Stable', 'Good', 'Thriving'];
              const getIndex = (s: string) => EMOTIONAL_ORDER.indexOf(s);
              const getColor = (idx: number) => {
                if (idx <= 1) return '#c0392b';
                if (idx <= 3) return '#e67e22';
                if (idx === 4) return '#95a5a6';
                if (idx <= 6) return '#3498db';
                return '#27ae60';
              };
              return emotionalTrends.slice(-12).map((t, i) => {
                const startIdx = getIndex(t.emotionalStateObserved);
                const endIdx = getIndex(t.emotionalStateEnd);
                const improved = endIdx > startIdx;
                const declined = endIdx < startIdx;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem' }}>
                    <span style={{ minWidth: '80px', color: 'var(--text-muted)', fontWeight: 600 }}>{t.sessionDate}</span>
                    <span style={{ minWidth: '100px', color: getColor(startIdx) }}>{t.emotionalStateObserved || '-'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                    <span style={{ minWidth: '100px', color: getColor(endIdx), fontWeight: 600 }}>{t.emotionalStateEnd || '-'}</span>
                    {improved && <span style={{ color: '#27ae60', fontSize: '0.75rem' }}>+improved</span>}
                    {declined && <span style={{ color: '#c0392b', fontSize: '0.75rem' }}>-declined</span>}
                  </div>
                );
              });
            })()}
          </div>
        </Section>
      )}

      <Section title="Education Records" icon={GraduationCap}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <button
            onClick={() => navigate(`/admin/caseload/${id}/education/new?residentId=${id}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)', padding: '0.35rem 0.7rem', borderRadius: '8px', border: 'none', background: 'var(--color-sage)', color: '#fff', cursor: 'pointer' }}
          >
            <Plus size={14} /> Update Education Record
          </button>
        </div>
        {educationRecords.length === 0 ? (
          <p className={styles.noData}>No education records yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {educationRecords.slice(0, 5).map((r: any) => (
              <div key={r.educationRecordId} style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(15,27,45,0.04)' }}>
                <span style={{ fontWeight: 600, minWidth: '90px' }}>{r.recordDate || '-'}</span>
                <span>{r.educationLevel || '-'}</span>
                <span>Attendance: {r.attendanceRate != null ? `${r.attendanceRate}%` : '-'}</span>
                <span>Progress: {r.progressPercent != null ? `${r.progressPercent}%` : '-'}</span>
                <span>{r.completionStatus || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Health Records" icon={Stethoscope}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <button
            onClick={() => navigate(`/admin/caseload/${id}/health/new?residentId=${id}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-body)', padding: '0.35rem 0.7rem', borderRadius: '8px', border: 'none', background: 'var(--color-sage)', color: '#fff', cursor: 'pointer' }}
          >
            <Plus size={14} /> Input Health Record
          </button>
        </div>
        {healthRecords.length === 0 ? (
          <p className={styles.noData}>No health records yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {healthRecords.slice(0, 5).map((r: any) => (
              <div key={r.healthRecordId} style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(15,27,45,0.04)' }}>
                <span style={{ fontWeight: 600, minWidth: '90px' }}>{r.recordDate || '-'}</span>
                <span>Health: {r.generalHealthScore ?? '-'}/10</span>
                <span>BMI: {r.bmi ?? '-'}</span>
                <span>Nutrition: {r.nutritionScore ?? '-'}/10</span>
                <span>Sleep: {r.sleepQualityScore ?? '-'}/10</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Incidents" icon={AlertTriangle}>
        {incidents.length === 0 ? (
          <p className={styles.noData}>No incidents recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {incidents.slice(0, 5).map((inc: any) => (
              <div
                key={inc.incidentId}
                style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(15,27,45,0.04)', cursor: 'pointer' }}
                onClick={() => navigate(`/admin/incidents/${inc.incidentId}`)}
              >
                <span style={{ fontWeight: 600, minWidth: '90px' }}>{inc.incidentDate || '-'}</span>
                <span>{inc.incidentType || '-'}</span>
                <span style={{ color: inc.severity === 'Critical' ? '#c0392b' : inc.severity === 'High' ? '#d35400' : 'inherit' }}>{inc.severity}</span>
                <span style={{ color: inc.resolved ? '#27ae60' : '#e74c3c' }}>{inc.resolved ? 'Resolved' : 'Open'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Case Conferences" icon={Users}>
        {conferences.length === 0 ? (
          <p className={styles.noData}>No case conferences recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {conferences.slice(0, 5).map((conf: any) => (
              <div
                key={conf.planId}
                style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(15,27,45,0.04)', cursor: 'pointer' }}
                onClick={() => navigate('/admin/conferences')}
              >
                <span style={{ fontWeight: 600, minWidth: '90px' }}>{conf.caseConferenceDate || '-'}</span>
                <span>{conf.planCategory || '-'}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: conf.status === 'Open' ? '#3498db18' : conf.status === 'Achieved' ? '#27ae6018' : '#95a5a618', color: conf.status === 'Open' ? '#3498db' : conf.status === 'Achieved' ? '#27ae60' : '#95a5a6', textTransform: 'uppercase' as const }}>
                  {conf.status || '-'}
                </span>
              </div>
            ))}
            {conferences.length > 5 && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => navigate('/admin/conferences')}>
                View all {conferences.length} conferences...
              </p>
            )}
          </div>
        )}
      </Section>

      {resident.notesRestricted && (
        <Section title="Notes (Restricted)" icon={ClipboardList}>
          <p className={styles.notes}>{resident.notesRestricted}</p>
        </Section>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Loader2, User, Shield, ClipboardList,
  AlertTriangle, Activity, GraduationCap, Plus,
  Calendar, Heart, FileText, Mic, Eye,
} from 'lucide-react';
import { apiFetch } from '../../api';
import { formatDate } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import MlBadge from '../../components/admin/MlBadge';
import Dropdown from '../../components/admin/Dropdown';
import DatePicker from '../../components/admin/DatePicker';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import TextArea from '../../components/admin/TextArea';
import styles from './ResidentDetailPage.module.css';

/* ── Types ───────────────────────────────────────── */

interface MlPrediction {
  id: number;
  modelName: string;
  score: number | null;
  scoreLabel: string | null;
  predictedAt: string;
  metadata: string | null;
}

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

/* ── Constants ───────────────────────────────────── */

const ML_SCORE_COLORS: Record<string, string> = {
  Critical: '#c0392b', High: '#d35400', Medium: '#f39c12', Low: '#27ae60',
  Ready: '#27ae60', Progressing: '#3498db', 'Early Stage': '#f39c12', 'Not Ready': '#c0392b',
};

const SUB_CAT_LABELS: Record<string, string> = {
  subCatOrphaned: 'Orphaned', subCatTrafficked: 'Trafficked', subCatChildLabor: 'Child Labor',
  subCatPhysicalAbuse: 'Physical Abuse', subCatSexualAbuse: 'Sexual Abuse', subCatOsaec: 'OSAEC',
  subCatCicl: 'CICL', subCatAtRisk: 'At Risk', subCatStreetChild: 'Street Child', subCatChildWithHiv: 'Child with HIV',
};

const EMOTIONAL_ORDER = ['Severe Distress', 'Distressed', 'Struggling', 'Unsettled', 'Neutral', 'Coping', 'Stable', 'Good', 'Thriving'];

function emotionalColor(state: string): string {
  const idx = EMOTIONAL_ORDER.indexOf(state);
  if (idx <= 1) return '#c0392b';
  if (idx <= 3) return '#e67e22';
  if (idx === 4) return '#95a5a6';
  if (idx <= 6) return '#3498db';
  return '#27ae60';
}

/* ── Helpers ─────────────────────────────────────── */

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value || '--'}</span>
    </div>
  );
}

interface TimelineEntry {
  type: 'recording' | 'visit' | 'incident' | 'education' | 'health' | 'conference';
  date: string;
  title: string;
  detail?: string;
  id?: number;
  route?: string;
}

/* ── Component ───────────────────────────────────── */

export default function ResidentDetailPage() {
  useDocumentTitle('Resident Detail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

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
  const [recordings, setRecordings] = useState<any[]>([]);
  const [visitations, setVisitations] = useState<any[]>([]);

  // Right panel tab
  const [activeTab, setActiveTab] = useState<'profile' | 'records' | 'incidents' | 'plan'>('profile');

  useEffect(() => {
    setLoading(true);
    apiFetch<ResidentDetail>(`/api/admin/residents/${id}`)
      .then(setResident)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiFetch<MlPrediction[]>(`/api/ml/predictions/resident/${id}`).then(setPredictions).catch(() => {});
    apiFetch<any[]>(`/api/admin/education-records?residentId=${id}`).then(setEducationRecords).catch(() => {});
    apiFetch<any[]>(`/api/admin/health-records?residentId=${id}`).then(setHealthRecords).catch(() => {});
    apiFetch<{ items: any[] }>(`/api/admin/incidents?residentId=${id}`).then(d => setIncidents(d.items || [])).catch(() => {});
    apiFetch<any[]>(`/api/admin/intervention-plans?residentId=${id}`).then(setConferences).catch(() => {});
    apiFetch<any[]>(`/api/admin/recordings/emotional-trends?residentId=${id}`).then(setEmotionalTrends).catch(() => {});
    apiFetch<{ items: any[] }>(`/api/admin/recordings?residentId=${id}`).then(d => setRecordings(Array.isArray(d) ? d : d.items || [])).catch(() => {});
    apiFetch<{ items: any[] }>(`/api/admin/visitations?residentId=${id}`).then(d => setVisitations(Array.isArray(d) ? d : d.items || [])).catch(() => {});
  }, [id]);

  // Build unified timeline from all record types
  const timeline = useMemo<TimelineEntry[]>(() => {
    const items: TimelineEntry[] = [];
    for (const r of recordings.slice(0, 20)) {
      items.push({ type: 'recording', date: r.sessionDate || r.createdAt, title: `Counseling — ${r.sessionType || 'Session'}`, detail: r.socialWorker ? `by ${r.socialWorker}` : undefined, id: r.recordingId, route: `/admin/recordings/${r.recordingId}` });
    }
    for (const v of visitations.slice(0, 20)) {
      items.push({ type: 'visit', date: v.visitDate || v.createdAt, title: `${v.visitType || 'Home'} Visit`, detail: v.socialWorker ? `by ${v.socialWorker}` : undefined, id: v.visitationId, route: `/admin/visitations/${v.visitationId}` });
    }
    for (const i of incidents.slice(0, 20)) {
      items.push({ type: 'incident', date: i.incidentDate, title: `${i.incidentType || 'Incident'} — ${i.severity}`, detail: i.resolved ? 'Resolved' : 'Open', id: i.incidentId, route: `/admin/incidents/${i.incidentId}` });
    }
    for (const e of educationRecords.slice(0, 10)) {
      items.push({ type: 'education', date: e.recordDate, title: `Education — ${e.educationLevel || 'Update'}`, detail: e.attendanceRate != null ? `${Math.round(e.attendanceRate * 100)}% attendance` : undefined });
    }
    for (const h of healthRecords.slice(0, 10)) {
      items.push({ type: 'health', date: h.recordDate, title: 'Health Check', detail: h.generalHealthScore != null ? `Health: ${h.generalHealthScore}/5` : undefined });
    }
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return items.slice(0, 15);
  }, [recordings, visitations, incidents, educationRecords, healthRecords]);

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
    return <div className={styles.page}><div className={styles.loadingState}><Loader2 size={24} className={styles.spinner} /> Loading resident...</div></div>;
  }

  if (error || !resident) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p>{error ?? 'Resident not found.'}</p>
          <button className={styles.backLink} onClick={() => navigate('/admin/caseload')}><ArrowLeft size={16} /> Back to Caseload</button>
        </div>
      </div>
    );
  }

  const activeSubCats = Object.entries(SUB_CAT_LABELS)
    .filter(([key]) => (resident as unknown as Record<string, unknown>)[key] === true);

  const familyFlags = [
    resident.familyIs4ps && '4Ps Beneficiary',
    resident.familySoloParent && 'Solo Parent',
    resident.familyIndigenous && 'Indigenous',
    resident.familyParentPwd && 'Parent with Disability',
    resident.familyInformalSettler && 'Informal Settler',
  ].filter(Boolean) as string[];

  function timelineIcon(type: string) {
    const iconMap: Record<string, { icon: typeof Mic; bg: string; color: string }> = {
      recording: { icon: Mic, bg: 'rgba(52,152,219,0.1)', color: '#3498db' },
      visit: { icon: Eye, bg: 'rgba(15,143,125,0.1)', color: '#0f8f7d' },
      incident: { icon: AlertTriangle, bg: 'rgba(231,76,60,0.1)', color: '#e74c3c' },
      education: { icon: GraduationCap, bg: 'rgba(46,204,113,0.1)', color: '#2ecc71' },
      health: { icon: Heart, bg: 'rgba(230,126,34,0.1)', color: '#e67e22' },
    };
    const m = iconMap[type] || { icon: FileText, bg: 'rgba(149,165,166,0.1)', color: '#95a5a6' };
    const Icon = m.icon;
    return <div className={styles.timelineIcon} style={{ background: m.bg }}><Icon size={14} style={{ color: m.color }} /></div>;
  }

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
        <button className={styles.backLink} onClick={() => navigate('/admin/caseload')}><ArrowLeft size={16} /> Back to Caseload</button>
        {isAdmin && (
          <div className={styles.actions}>
            <button className={styles.editBtn} onClick={() => navigate(`/admin/caseload/${id}/edit`)}><Edit size={14} /> Edit</button>
            <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}><Trash2 size={14} /> Delete</button>
          </div>
        )}
      </div>

      {/* ── Profile header card ────────────────────── */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.headerTitle}>{resident.internalCode ?? 'No Code'}</h1>
            <p className={styles.headerMeta}>
              Case #{resident.caseControlNo ?? '--'}
              {resident.safehouse && <> &middot; {resident.safehouse}</>}
            </p>
          </div>
          <div className={styles.headerBadges}>
            {resident.caseStatus && <span className={`${styles.badge} ${styles.badgeStatus}`}>{resident.caseStatus}</span>}
            {resident.currentRiskLevel && (
              <span className={`${styles.badge} ${styles[`badgeRisk${resident.currentRiskLevel}`] ?? styles.badgeRiskDefault}`}>
                {resident.currentRiskLevel} Risk
              </span>
            )}
          </div>
        </div>

        <div className={styles.headerDetails}>
          {resident.assignedSocialWorker && <span className={styles.headerDetail}><User size={13} /> <span className={styles.headerDetailLabel}>SW:</span> {resident.assignedSocialWorker}</span>}
          {resident.dateOfAdmission && <span className={styles.headerDetail}><Calendar size={13} /> <span className={styles.headerDetailLabel}>Admitted:</span> {formatDate(resident.dateOfAdmission)}</span>}
          {resident.presentAge && <span className={styles.headerDetail}>Age: {resident.presentAge}</span>}
          {resident.caseCategory && <span className={styles.headerDetail}>{resident.caseCategory}</span>}
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionBtnPrimary} onClick={() => navigate(`/admin/recordings/new?residentId=${id}`)}><Mic size={13} /> Log Recording</button>
          <button className={styles.actionBtn} onClick={() => navigate(`/admin/visitations/new?residentId=${id}`)}><Eye size={13} /> Log Visit</button>
          <button className={styles.actionBtn} onClick={() => navigate(`/admin/caseload/${id}/health/new?residentId=${id}`)}><Heart size={13} /> Health Record</button>
          <button className={styles.actionBtn} onClick={() => navigate(`/admin/caseload/${id}/education/new?residentId=${id}`)}><GraduationCap size={13} /> Education Record</button>
        </div>
      </div>

      {/* ── Two-column body ────────────────────────── */}
      <div className={styles.body}>
        {/* ── Left column: active case data ─────── */}
        <div>
          {/* Risk & Predictions */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><Shield size={15} className={styles.cardIcon} /> Risk & Predictions <MlBadge /></div>
            <div className={styles.cardBody}>
              <div className={styles.riskPair}>
                <div className={styles.riskItem}>
                  <span className={styles.riskLabel}>Initial Risk</span>
                  <span className={`${styles.badge} ${styles[`badgeRisk${resident.initialRiskLevel}`] ?? styles.badgeRiskDefault}`}>
                    {resident.initialRiskLevel || '--'}
                  </span>
                </div>
                <div className={styles.riskItem}>
                  <span className={styles.riskLabel}>Current Risk</span>
                  <span className={`${styles.badge} ${styles[`badgeRisk${resident.currentRiskLevel}`] ?? styles.badgeRiskDefault}`}>
                    {resident.currentRiskLevel || '--'}
                  </span>
                </div>
              </div>
              {predictions.length > 0 && (
                <div className={styles.predictionGrid}>
                  {predictions.map(p => {
                    const color = ML_SCORE_COLORS[p.scoreLabel || ''] || '#95a5a6';
                    const isIncident = p.modelName.includes('incident');
                    const label = p.modelName
                      .replace('incident-early-warning-', '').replace('reintegration-readiness', 'Reintegration Readiness')
                      .replace('selfharm', 'Self-Harm Risk').replace('runaway', 'Runaway Risk');
                    const meta = p.metadata ? (() => { try { return JSON.parse(p.metadata); } catch { return null; } })() : null;
                    const riskFactors: string[] = meta?.top_risk_factors ?? [];
                    const protocol: string | null = meta?.recommended_protocol ?? null;
                    return (
                      <div key={p.id} className={styles.predictionCard} style={{ borderColor: `${color}30` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div className={styles.predictionIcon} style={{ background: `${color}18` }}>
                            {isIncident ? <AlertTriangle size={18} style={{ color }} /> : <Activity size={18} style={{ color }} />}
                          </div>
                          <div>
                            <div className={styles.predictionLabel}>{label}</div>
                            <div className={styles.predictionValue}>
                              {p.score !== null && <span className={styles.predictionScore} style={{ color }}>{Math.round(p.score)}</span>}
                              <span className={styles.predictionTier} style={{ color }}>{p.scoreLabel}</span>
                            </div>
                          </div>
                        </div>
                        {riskFactors.length > 0 && (
                          <div className={styles.predictionFactors}>
                            <span className={styles.predictionFactorsLabel}>Key factors:</span>
                            <div className={styles.predictionFactorTags}>
                              {riskFactors.slice(0, 3).map((f, i) => (
                                <span key={i} className={styles.predictionFactorTag}>{f.replace(/_/g, ' ').replace(/sub cat /i, '')}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {protocol && (
                          <div className={styles.predictionProtocol}>{protocol}</div>
                        )}
                        {!isIncident && meta && (
                          <div className={styles.predictionFactors}>
                            <span className={styles.predictionFactorsLabel}>Contributing metrics:</span>
                            <div className={styles.predictionMetrics}>
                              {meta.family_coop_rate != null && <span>Family cooperation: {(meta.family_coop_rate * 100).toFixed(0)}%</span>}
                              {meta.visits_per_month != null && <span>Visits/month: {meta.visits_per_month.toFixed(1)}</span>}
                              {meta.positive_session_rate != null && <span>Positive sessions: {(meta.positive_session_rate * 100).toFixed(0)}%</span>}
                              {meta.health_trend != null && <span>Health trend: {meta.health_trend > 0 ? 'improving' : meta.health_trend < 0 ? 'declining' : 'stable'}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Emotional Trajectory */}
          {emotionalTrends.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}><Activity size={15} className={styles.cardIcon} /> Emotional Trajectory</div>
              <div className={styles.cardBody}>
                {emotionalTrends.slice(-12).map((t, i) => {
                  const startIdx = EMOTIONAL_ORDER.indexOf(t.emotionalStateObserved);
                  const endIdx = EMOTIONAL_ORDER.indexOf(t.emotionalStateEnd);
                  return (
                    <div key={i} className={styles.emotionalRow}>
                      <span className={styles.emotionalDate}>{t.sessionDate}</span>
                      <span className={styles.emotionalState} style={{ color: emotionalColor(t.emotionalStateObserved) }}>{t.emotionalStateObserved || '-'}</span>
                      <span className={styles.emotionalArrow}>&rarr;</span>
                      <span className={styles.emotionalState} style={{ color: emotionalColor(t.emotionalStateEnd), fontWeight: 600 }}>{t.emotionalStateEnd || '-'}</span>
                      {endIdx > startIdx && <span className={styles.emotionalDelta} style={{ color: '#27ae60' }}>+improved</span>}
                      {endIdx < startIdx && <span className={styles.emotionalDelta} style={{ color: '#c0392b' }}>-declined</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Activity Timeline */}
          <div className={styles.card}>
            <div className={styles.cardHeader}><ClipboardList size={15} className={styles.cardIcon} /> Recent Activity</div>
            <div className={styles.cardBody}>
              {timeline.length === 0 ? (
                <p className={styles.noData}>No activity recorded yet.</p>
              ) : (
                timeline.map((item, i) => (
                  <div key={i} className={styles.timelineItem} onClick={() => item.route && navigate(item.route)}>
                    {timelineIcon(item.type)}
                    <div className={styles.timelineBody}>
                      <div className={styles.timelineTitle}>{item.title}</div>
                      <div className={styles.timelineDate}>
                        {formatDate(item.date)}
                        {item.detail && <> &middot; {item.detail}</>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Right column: tabbed reference ────── */}
        <div className={styles.card}>
          <div className={styles.tabBar}>
            {(['profile', 'records', 'incidents', 'plan'] as const).map(tab => (
              <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'profile' ? 'Profile' : tab === 'records' ? 'Records' : tab === 'incidents' ? 'Incidents' : 'Plan'}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            {/* ── Profile tab ──────────────────── */}
            {activeTab === 'profile' && (
              <>
                <p className={styles.sectionLabel}>Demographics</p>
                <div className={styles.fieldGrid}>
                  <InfoField label="Sex" value={resident.sex} />
                  <InfoField label="Date of Birth" value={formatDate(resident.dateOfBirth)} />
                  <InfoField label="Present Age" value={resident.presentAge} />
                  <InfoField label="Place of Birth" value={resident.placeOfBirth} />
                  <InfoField label="Birth Status" value={resident.birthStatus} />
                  <InfoField label="Religion" value={resident.religion} />
                </div>

                <p className={styles.sectionLabel}>Case Info</p>
                <div className={styles.fieldGrid}>
                  <InfoField label="Category" value={resident.caseCategory} />
                  <InfoField label="Status" value={resident.caseStatus} />
                  <InfoField label="Internal Code" value={resident.internalCode} />
                  <InfoField label="Case Control No." value={resident.caseControlNo} />
                </div>
                {activeSubCats.length > 0 && (
                  <div className={styles.tagWrap} style={{ marginTop: '0.5rem' }}>
                    {activeSubCats.map(([, label]) => <span key={label} className={styles.tag}>{label}</span>)}
                  </div>
                )}

                <p className={styles.sectionLabel}>Family</p>
                {familyFlags.length > 0 ? (
                  <div className={styles.tagWrap}>{familyFlags.map(f => <span key={f} className={styles.tag}>{f}</span>)}</div>
                ) : (
                  <p className={styles.noData}>No family flags set.</p>
                )}

                <p className={styles.sectionLabel}>Disability / Special Needs</p>
                <div className={styles.fieldGrid}>
                  <InfoField label="Is PWD" value={resident.isPwd ? 'Yes' : 'No'} />
                  <InfoField label="PWD Type" value={resident.pwdType} />
                  <InfoField label="Special Needs" value={resident.hasSpecialNeeds ? 'Yes' : 'No'} />
                  <InfoField label="Diagnosis" value={resident.specialNeedsDiagnosis} />
                </div>

                <p className={styles.sectionLabel}>Admission & Referral</p>
                <div className={styles.fieldGrid}>
                  <InfoField label="Date of Admission" value={formatDate(resident.dateOfAdmission)} />
                  <InfoField label="Age at Admission" value={resident.ageUponAdmission} />
                  <InfoField label="Length of Stay" value={resident.lengthOfStay} />
                  <InfoField label="Referral Source" value={resident.referralSource} />
                  <InfoField label="Referring Party" value={resident.referringAgencyPerson} />
                  <InfoField label="COLB Registered" value={formatDate(resident.dateColbRegistered)} />
                  <InfoField label="COLB Obtained" value={formatDate(resident.dateColbObtained)} />
                  <InfoField label="Date Enrolled" value={formatDate(resident.dateEnrolled)} />
                  <InfoField label="Date Closed" value={formatDate(resident.dateClosed)} />
                </div>

                {resident.notesRestricted && (
                  <>
                    <p className={styles.sectionLabel}>Restricted Notes</p>
                    <p className={styles.notes}>{resident.notesRestricted}</p>
                  </>
                )}
              </>
            )}

            {/* ── Records tab ──────────────────── */}
            {activeTab === 'records' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className={styles.sectionLabel}>Education</p>
                  <button className={styles.addBtn} onClick={() => navigate(`/admin/caseload/${id}/education/new?residentId=${id}`)}><Plus size={12} /> Add</button>
                </div>
                {educationRecords.length === 0 ? (
                  <p className={styles.noData}>No education records.</p>
                ) : (
                  educationRecords.slice(0, 5).map((r: any) => (
                    <div key={r.educationRecordId} className={styles.recordRow}>
                      <span className={styles.recordDate}>{r.recordDate || '-'}</span>
                      <span>{r.educationLevel || '-'}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{r.attendanceRate != null ? `${Math.round(r.attendanceRate * 100)}%` : '-'}</span>
                    </div>
                  ))
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <p className={styles.sectionLabel}>Health</p>
                  <button className={styles.addBtn} onClick={() => navigate(`/admin/caseload/${id}/health/new?residentId=${id}`)}><Plus size={12} /> Add</button>
                </div>
                {healthRecords.length === 0 ? (
                  <p className={styles.noData}>No health records.</p>
                ) : (
                  healthRecords.slice(0, 5).map((r: any) => (
                    <div key={r.healthRecordId} className={styles.recordRow}>
                      <span className={styles.recordDate}>{r.recordDate || '-'}</span>
                      <span>Health: {r.generalHealthScore ?? '-'}/5</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>BMI: {r.bmi ?? '-'}</span>
                    </div>
                  ))
                )}
              </>
            )}

            {/* ── Incidents tab ────────────────── */}
            {activeTab === 'incidents' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className={styles.sectionLabel}>Incident History</p>
                  <button className={styles.addBtn} onClick={() => navigate(`/admin/incidents/new?residentId=${id}`)}><Plus size={12} /> Report</button>
                </div>
                {incidents.length === 0 ? (
                  <p className={styles.noData}>No incidents recorded.</p>
                ) : (
                  incidents.slice(0, 10).map((inc: any) => {
                    const sevColor = inc.severity === 'Critical' ? '#c0392b' : inc.severity === 'High' ? '#d35400' : inc.severity === 'Medium' ? '#f39c12' : '#27ae60';
                    return (
                      <div key={inc.incidentId} className={`${styles.recordRow} ${styles.recordClickable}`} onClick={() => navigate(`/admin/incidents/${inc.incidentId}`)}>
                        <span className={styles.recordDate}>{inc.incidentDate || '-'}</span>
                        <span>{inc.incidentType || '-'}</span>
                        <span className={styles.severityBadge} style={{ background: `${sevColor}18`, color: sevColor }}>{inc.severity}</span>
                        <span className={styles.statusBadge} style={{ background: inc.resolved ? '#27ae6018' : '#e74c3c18', color: inc.resolved ? '#27ae60' : '#e74c3c', marginLeft: 'auto' }}>
                          {inc.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* ── Plan tab ─────────────────────── */}
            {activeTab === 'plan' && (
              <PlanTab
                resident={resident}
                conferences={conferences}
                setConferences={setConferences}
                id={id!}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Plan Tab Component ────────────────────────── */

const PLAN_CATEGORIES = ['Safety', 'Education', 'Physical Health', 'Psychosocial', 'Legal', 'Reintegration'];
const PLAN_STATUSES = ['Open', 'In Progress', 'Achieved', 'On Hold', 'Closed'];
const PLAN_STATUS_COLORS: Record<string, string> = {
  Open: '#3498db', 'In Progress': '#f39c12', Achieved: '#27ae60', 'On Hold': '#95a5a6', Closed: '#95a5a6',
};

function PlanTab({ resident, conferences, setConferences, id }: {
  resident: ResidentDetail;
  conferences: any[];
  setConferences: (c: any[]) => void;
  id: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [planCategory, setPlanCategory] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [servicesProvided, setServicesProvided] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState('Open');

  function resetForm() {
    setPlanCategory('');
    setPlanDescription('');
    setServicesProvided('');
    setTargetValue('');
    setTargetDate('');
    setStatus('Open');
    setEditingPlan(null);
    setFormError('');
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(plan: any) {
    setPlanCategory(plan.planCategory || '');
    setPlanDescription(plan.planDescription || '');
    setServicesProvided(plan.servicesProvided || '');
    setTargetValue(plan.targetValue != null ? String(plan.targetValue) : '');
    setTargetDate(plan.targetDate || '');
    setStatus(plan.status || 'Open');
    setEditingPlan(plan);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!planCategory) { setFormError('Category is required.'); return; }
    setSaving(true);
    setFormError('');

    const body = {
      residentId: Number(id),
      planCategory,
      planDescription: planDescription || null,
      servicesProvided: servicesProvided || null,
      targetValue: targetValue ? Number(targetValue) : null,
      targetDate: targetDate || null,
      status,
    };

    try {
      if (editingPlan) {
        await apiFetch(`/api/admin/intervention-plans/${editingPlan.planId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/api/admin/intervention-plans', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      const updated = await apiFetch<any[]>(`/api/admin/intervention-plans?residentId=${id}`);
      setConferences(updated);
      setShowForm(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className={styles.sectionLabel}>Reintegration</p>
      <div className={styles.fieldGrid}>
        <InfoField label="Type" value={resident.reintegrationType} />
        <InfoField label="Status" value={resident.reintegrationStatus} />
      </div>

      <p className={styles.sectionLabel}>Social Worker</p>
      <div className={styles.fieldGrid}>
        <InfoField label="Assigned SW" value={resident.assignedSocialWorker} />
        <InfoField label="Case Study Date" value={formatDate(resident.dateCaseStudyPrepared)} />
      </div>
      {resident.initialCaseAssessment && (
        <>
          <p className={styles.sectionLabel}>Initial Assessment</p>
          <p className={styles.notes}>{resident.initialCaseAssessment}</p>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <p className={styles.sectionLabel}>Intervention Plans</p>
        <button className={styles.addBtn} onClick={openCreate}><Plus size={12} /> New Plan</button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} style={{ background: 'rgba(15,143,125,0.03)', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' }}>Category *</label>
              <Dropdown
                value={planCategory}
                placeholder="Select..."
                options={PLAN_CATEGORIES.map(c => ({ value: c, label: c }))}
                onChange={setPlanCategory}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' }}>Status</label>
              <Dropdown
                value={status}
                options={PLAN_STATUSES.map(s => ({ value: s, label: s }))}
                onChange={setStatus}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' }}>Target Value</label>
              <input type="number" step="0.01" value={targetValue} onChange={e => setTargetValue(e.target.value)} placeholder="e.g. 80" style={{ width: '100%', padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(15,27,45,0.12)', fontSize: '0.78rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' }}>Target Date</label>
              <DatePicker value={targetDate} onChange={setTargetDate} />
            </div>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' }}>Description</label>
            <TextArea value={planDescription} onChange={e => setPlanDescription(e.target.value)} rows={2} placeholder="What should be achieved..." style={{ width: '100%', padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(15,27,45,0.12)', fontSize: '0.78rem', resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' }}>Services Provided</label>
            <input type="text" value={servicesProvided} onChange={e => setServicesProvided(e.target.value)} placeholder="e.g. CBT, tutoring, medical checkup" style={{ width: '100%', padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(15,27,45,0.12)', fontSize: '0.78rem' }} />
          </div>
          {formError && <div style={{ color: '#c0392b', fontSize: '0.78rem', marginBottom: '0.3rem' }}>{formError}</div>}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="submit" disabled={saving} style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: 'none', background: 'var(--color-sage)', color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} style={{ padding: '0.3rem 0.7rem', borderRadius: '6px', border: '1px solid rgba(15,27,45,0.12)', background: '#fff', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {conferences.length === 0 ? (
        <p className={styles.noData}>No intervention plans yet.</p>
      ) : (
        conferences.map((plan: any) => {
          const color = PLAN_STATUS_COLORS[plan.status || ''] || '#95a5a6';
          return (
            <div
              key={plan.planId}
              className={`${styles.recordRow} ${styles.recordClickable}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => openEdit(plan)}
            >
              <span className={styles.recordDate}>{plan.targetDate || plan.caseConferenceDate || '-'}</span>
              <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{plan.planCategory || '-'}</span>
              <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plan.planDescription ? (plan.planDescription.length > 50 ? plan.planDescription.slice(0, 50) + '...' : plan.planDescription) : ''}
              </span>
              {plan.targetValue != null && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: {plan.targetValue}</span>
              )}
              <span className={styles.statusBadge} style={{ background: `${color}18`, color, marginLeft: 'auto' }}>{plan.status || '-'}</span>
            </div>
          );
        })
      )}
    </>
  );
}

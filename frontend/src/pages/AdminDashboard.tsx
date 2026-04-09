import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, AlertTriangle, Calendar, UserPlus, DollarSign, FileText, Sparkles, HeartCrack, ShieldAlert, CircleCheckBig } from 'lucide-react';
import { useSafehouse } from '../contexts/SafehouseContext';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api';
import { formatMonthLabel, formatEnumLabel } from '../constants';
import { ChartTooltip } from '../components/ChartTooltip';
import { ApiError } from '../components/ApiError';
import MlBadge from '../components/admin/MlBadge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import styles from './AdminDashboard.module.css';

const channelColors = ['#D4A853', '#4A7A4E', '#7A9E7E', '#5A6B7A', '#C4756E', '#8B6DB0', '#3A8FB7'];

type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

interface ResidentRow {
  code: string;
  safehouse: string;
  category: string;
  riskLevel: Severity;
  admittedDate: string;
  socialWorker: string;
  lastSession: string;
}

interface RecentDonation {
  supporter: string;
  type: string;
  amount: string;
  date: string;
  campaign: string;
}

const severityConfig: Record<Severity, { color: string; bg: string; border: string }> = {
  Low: { color: '#4A7A4E', bg: '#7A9E7E18', border: '#7A9E7E40' },
  Medium: { color: '#A68B3A', bg: '#D4A85318', border: '#D4A85340' },
  High: { color: '#B5713A', bg: '#D48C5318', border: '#D48C5340' },
  Critical: { color: '#A5524D', bg: '#C4756E18', border: '#C4756E40' },
};

/* ── Dashboard ─────────────────────────────────────────── */

interface Metrics {
  activeResidents: number;
  openIncidents: number;
  criticalIncidents: number;
  highIncidents: number;
  monthlyDonations: number;
  monthlyDonationCount: number;
  donationChange: number;
  upcomingConferences: number;
  nextConference: string | null;
  dataAsOf: string | null;
}

interface ApiResident {
  internalCode: string;
  safehouse: string;
  caseCategory: string;
  currentRiskLevel: string;
  dateOfAdmission: string;
  assignedSocialWorker: string;
  lastSession: string | null;
}

interface ApiDonation {
  supporter: string;
  donationType: string;
  amount: number | null;
  estimatedValue: number | null;
  donationDate: string;
  campaignName: string | null;
}

interface MlPredictionSummary {
  entityId: number;
  modelName: string;
  score: number;
  scoreLabel: string;
}

export default function AdminDashboard() {
  useDocumentTitle('Dashboard');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSafehouseId: safehouseId } = useSafehouse();
  const displayRole = user?.roles?.[0] ?? 'Staff';

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [totalResidents, setTotalResidents] = useState(0);
  const [donations, setDonations] = useState<RecentDonation[]>([]);
  const dataDateStr = 'Data as of February 16, 2026';
  const [activeResidentsChart, setActiveResidentsChart] = useState<Array<{ month: string; count: number }>>([]);
  const [flaggedChart, setFlaggedChart] = useState<Array<{ month: string; count: number }>>([]);
  const [channels, setChannels] = useState<Array<{ channel: string; count: number }>>([]);
  const [error, setError] = useState(false);
  const [donorsAtRisk, setDonorsAtRisk] = useState(0);
  const [incidentAlerts, setIncidentAlerts] = useState(0);
  const [reintegrationReady, setReintegrationReady] = useState(0);

  const fetchData = useCallback((shId: number | null) => {
    const onErr = (e: unknown) => { console.error('API fetch failed', e); };
    const onCriticalErr = (e: unknown) => { console.error('API fetch failed', e); setError(true); };
    const sfParam = shId ? `?safehouseId=${shId}` : '';
    const sfAmp = shId ? `&safehouseId=${shId}` : '';

    apiFetch<Metrics>(`/api/admin/metrics${sfParam}`).then(setMetrics).catch(onCriticalErr);

    apiFetch<{ items: ApiResident[]; totalCount: number }>(`/api/admin/residents?pageSize=20${sfAmp}`).then(resp => {
      const data = resp.items ?? [];
      setTotalResidents(resp.totalCount ?? data.length);
      setResidents(data.map(r => {
        let lastSessionStr = 'Unknown';
        if (r.lastSession) {
          const days = Math.floor((Date.now() - new Date(r.lastSession).getTime()) / 86400000);
          lastSessionStr = days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
        }
        return {
          code: r.internalCode,
          safehouse: r.safehouse ?? '',
          category: r.caseCategory ?? '',
          riskLevel: (r.currentRiskLevel ?? 'Low') as Severity,
          admittedDate: r.dateOfAdmission?.slice(0, 10) ?? '',
          socialWorker: r.assignedSocialWorker ?? '',
          lastSession: lastSessionStr,
        };
      }));
    }).catch(onErr);

    apiFetch<ApiDonation[]>('/api/admin/recent-donations').then(data => {
      setDonations(data.map(d => ({
        supporter: d.supporter ?? 'Anonymous',
        type: formatEnumLabel(d.donationType ?? ''),
        amount: d.amount ? `$${Number(d.amount).toLocaleString()}` : d.estimatedValue ? `$${Number(d.estimatedValue).toLocaleString()} est.` : '—',
        date: d.donationDate ? new Date(d.donationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        campaign: d.campaignName ?? '—',
      })));
    }).catch(onErr);

    apiFetch<Array<{ year: number; month: number; count: number }>>(`/api/admin/active-residents-trend${sfParam}`).then(data => {
      setActiveResidentsChart(data.map(d => ({ month: formatMonthLabel(d.year, d.month), count: d.count })));
    }).catch(onErr);

    apiFetch<Array<{ year: number; month: number; count: number }>>(`/api/admin/flagged-cases-trend${sfParam}`).then(data => {
      setFlaggedChart(data.map(d => ({ month: formatMonthLabel(d.year, d.month), count: d.count })));
    }).catch(onErr);

    apiFetch<Array<{ channel: string; count: number }>>('/api/admin/donations-by-channel').then(data => {
      setChannels(data.map(d => ({ channel: formatEnumLabel(d.channel), count: d.count })));
    }).catch(onErr);

    apiFetch<MlPredictionSummary[]>('/api/ml/predictions/supporter/summary').then(data => {
      setDonorsAtRisk(data.filter(d => d.scoreLabel === 'Critical' || d.scoreLabel === 'High').length);
    }).catch(onErr);

    apiFetch<MlPredictionSummary[]>('/api/ml/predictions/resident/summary').then(data => {
      setIncidentAlerts(data.filter(d => d.scoreLabel === 'Critical' || d.scoreLabel === 'High').length);
      setReintegrationReady(data.filter(d => d.scoreLabel === 'Ready').length);
    }).catch(onErr);
  }, []);

  useEffect(() => { fetchData(safehouseId); }, [safehouseId, fetchData]);

  return (
    <div className={styles.page}>
      {error && <ApiError />}

      {/* ── Header ─────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Dashboard</h1>
            <span className={styles.roleBadge}>{displayRole}</span>
          </div>
          <p className={styles.dateText}>{dataDateStr}</p>
        </div>
        <div className={styles.quickActions}>
          <button className={styles.actionBtn} onClick={() => navigate('/admin/caseload/new')}>
            <UserPlus size={15} />
            <span>Add Resident</span>
          </button>
          <button className={styles.actionBtn} onClick={() => navigate('/admin/donations/new')}>
            <DollarSign size={15} />
            <span>Log Donation</span>
          </button>
          <button className={styles.actionBtn} onClick={() => navigate('/admin/recordings/new')}>
            <FileText size={15} />
            <span>New Recording</span>
          </button>
        </div>
      </header>

      {/* ── Metric Cards ───────────────────────────────── */}
      {metrics && <section className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Active Residents</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>{metrics.activeResidents}</span>
          </div>
          <span className={styles.metricSub}>across all safehouses</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Open Incidents</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>{metrics.openIncidents}</span>
            {metrics.criticalIncidents > 0 && (
              <span className={styles.metricDanger}><AlertTriangle size={14} />{metrics.criticalIncidents} critical</span>
            )}
          </div>
          <span className={styles.metricSub}>{metrics.highIncidents} high severity</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Monthly Donations</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>${(Number(metrics.monthlyDonations) / 1000).toFixed(1)}k</span>
            {metrics.donationChange !== 0 && (
              <span className={styles.metricUp}><ArrowUpRight size={14} />{metrics.donationChange > 0 ? '+' : ''}{metrics.donationChange}%</span>
            )}
          </div>
          <span className={styles.metricSub}>{metrics.monthlyDonationCount} donations this month</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Case Conferences</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>{metrics.upcomingConferences}</span>
            {metrics.nextConference && (
              <span className={styles.metricDate}><Calendar size={14} />Next: {new Date(metrics.nextConference!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
          <span className={styles.metricSub}>upcoming</span>
        </div>
      </section>}

      {/* ── ML Insights ──────────────────────────────────── */}
      <section className={styles.mlInsightsCard}>
        <div className={styles.mlInsightsHeader}>
          <Sparkles size={18} className={styles.mlInsightsIcon} />
          <span className={styles.mlInsightsTitle}>ML-Powered Insights</span>
          <MlBadge />
          <button className={styles.mlViewAll} onClick={() => navigate('/admin/reports?tab=ml')}>View Details <ArrowUpRight size={12} /></button>
        </div>
        <div className={styles.mlInsightsDivider} />
        <div className={styles.mlInsightsStats}>
          <div className={styles.mlStat} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/donors')}>
            <div className={styles.mlStatIconRisk}><HeartCrack size={16} /></div>
            <div className={styles.mlStatText}>
              <span className={styles.mlStatNumber}>{donorsAtRisk}</span>
              <span className={styles.mlStatLabel}>donors predicted to churn</span>
            </div>
          </div>
          <div className={styles.mlStat} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/caseload')}>
            <div className={styles.mlStatIconAlert}><ShieldAlert size={16} /></div>
            <div className={styles.mlStatText}>
              <span className={styles.mlStatNumber}>{incidentAlerts}</span>
              <span className={styles.mlStatLabel}>high-risk residents</span>
            </div>
          </div>
          <div className={styles.mlStat} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/caseload')}>
            <div className={styles.mlStatIconReady}><CircleCheckBig size={16} /></div>
            <div className={styles.mlStatText}>
              <span className={styles.mlStatNumber}>{reintegrationReady}</span>
              <span className={styles.mlStatLabel}>predicted reintegration-ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Two-column: Table + Donations ──────────────── */}
      <section className={styles.mainGrid}>
        {/* Residents Table */}
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Girls Impacted</h2>
            <div className={styles.legendRow}>
              {(['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((level) => (
                <span key={level} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: severityConfig[level].color }} />
                  {level}
                </span>
              ))}
            </div>
          </div>
          {residents.length === 0 ? (
            <div className={styles.emptyState}>No resident data for this safehouse</div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Safehouse</th>
                      <th>Category</th>
                      <th>Last Session</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.slice(0, 8).map((r, i) => (
                      <tr key={`${r.code}-${i}`} className={r.riskLevel === 'Critical' ? styles.rowCritical : ''}>
                        <td>
                          <span className={styles.residentCode}>{r.code}</span>
                          <span className={styles.residentWorker}>{r.socialWorker}</span>
                        </td>
                        <td>{r.safehouse}</td>
                        <td>{r.category}</td>
                        <td className={
                          r.lastSession.includes('week') ? styles.cellOverdue : ''
                        }>{r.lastSession}</td>
                        <td>
                          <span
                            className={styles.severityBadge}
                            style={{
                              background: severityConfig[r.riskLevel].bg,
                              color: severityConfig[r.riskLevel].color,
                              borderColor: severityConfig[r.riskLevel].border,
                            }}
                          >
                            <span className={styles.severityDot} style={{ background: severityConfig[r.riskLevel].color }} />
                            {r.riskLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalResidents > 8 && (
                <div className={styles.viewAllRow}>
                  <button className={styles.viewAllBtn} onClick={() => navigate('/admin/caseload')}>
                    View all {totalResidents} residents
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column: Recent Donations + Channel breakdown */}
        <div className={styles.rightCol}>
          <div className={styles.donationsCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Donations</h2>
              <button className={styles.viewAllBtn} onClick={() => navigate('/admin/donors?tab=donations')}>View all</button>
            </div>
            <div className={styles.donationsList}>
              {donations.map((d, i) => (
                <div key={i} className={styles.donationRow}>
                  <div className={styles.donationInfo}>
                    <span className={styles.donationName}>{d.supporter}</span>
                    <span className={styles.donationType}>{d.type}{d.campaign !== '—' ? ` · ${d.campaign}` : ''}</span>
                  </div>
                  <div className={styles.donationRight}>
                    <span className={styles.donationAmount}>{d.amount}</span>
                    <span className={styles.donationDate}>{d.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.channelCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Supporters by Channel</h2>
              <span className={styles.cardSubtitle}>Acquisition source</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channels} layout="vertical" barCategoryGap="25%">
                <XAxis type="number" hide />
                <YAxis dataKey="channel" type="category" tick={{ fontSize: 11, fill: '#8A8078' }} axisLine={false} tickLine={false} width={85} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(212, 168, 83, 0.06)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {channels.map((_, i) => (
                    <Cell key={i} fill={channelColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Charts Row ─────────────────────────────────── */}
      <section className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartMeta}>
            <h2 className={styles.cardTitle}>Active Residents</h2>
            {activeResidentsChart.length >= 2 && (() => {
              const curr = activeResidentsChart[activeResidentsChart.length - 1].count;
              const prev = activeResidentsChart[activeResidentsChart.length - 2].count;
              const diff = curr - prev;
              if (diff === 0) return null;
              return <span className={diff > 0 ? styles.chartCallout : styles.chartCalloutWarning}>{diff > 0 ? '+' : ''}{diff} from last month</span>;
            })()}
          </div>
          {activeResidentsChart.length === 0 ? (
            <div className={styles.emptyState}>No trend data for this safehouse</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activeResidentsChart}>
                <defs>
                  <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1B2838" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#1B2838" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A8078' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A8078' }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 3']} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#1B2838" strokeWidth={2} fill="url(#gradActive)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartMeta}>
            <h2 className={styles.cardTitle}>Incidents Reported</h2>
            {flaggedChart.length > 0 && <span className={styles.chartCalloutWarning}>{metrics?.openIncidents ?? 0} currently open</span>}
          </div>
          {flaggedChart.length === 0 ? (
            <div className={styles.emptyState}>No incident data for this safehouse</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={flaggedChart}>
                <defs>
                  <linearGradient id="gradIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4A853" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#D4A853" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A8078' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8A8078' }} axisLine={false} tickLine={false} domain={[0, 'dataMax + 2']} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#D4A853" strokeWidth={2} fill="url(#gradIncidents)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

    </div>
  );
}

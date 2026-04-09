import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { apiFetch } from '../../api';
import { formatMonthLabel, formatEnumLabel } from '../../constants';
import { ChartTooltip } from '../../components/ChartTooltip';
import KpiCard from '../../components/admin/KpiCard';
import MlBadge from '../../components/admin/MlBadge';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './ReportsPage.module.css';

// ── Palette ──────────────────────────────────────────────
const COLORS = ['#D4A853', '#7A9E7E', '#C4756E', '#4A6FA5', '#9B8EC2', '#D4916E', '#6EB5C4', '#B8A04C'];

// ── Types ────────────────────────────────────────────────
interface MonthRow { year: number; month: number; total: number; count: number }
interface SourceRow { source: string; total: number; count: number }
interface CampaignRow { campaign: string; total: number; count: number }
interface OutcomeData {
  totalResidents: number;
  completedReintegrations: number;
  successRate: number;
  avgLengthOfStayDays: number;
  byType: { type: string; count: number }[];
}
interface EduRow { year: number; month: number; avgProgress: number; avgAttendance: number }
interface HealthRow { year: number; month: number; avgHealth: number; avgNutrition: number; avgSleep: number; avgEnergy: number }
interface SafehouseRow {
  safehouseId: number; safehouseCode: string; name: string; city: string;
  status: string; capacityGirls: number; currentOccupancy: number;
  occupancyPct: number; activeResidents: number; incidents: number;
  recordings: number; avgEducation: number; avgHealth: number;
}
interface SummaryData {
  totalResidents: number; activeResidents: number; activeSafehouses: number;
  totalDonations: number; completedReintegrations: number; reintegrationRate: number;
}

// ── Tab config ───────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'donations', label: 'Donations' },
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'safehouses', label: 'Safehouses' },
  { key: 'aar', label: 'Annual Report' },
  { key: 'ml', label: 'ML Insights' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Loading indicator ────────────────────────────────────
function Loading() {
  return (
    <div className={styles.loading}>
      <span className={styles.loadingDot} />
      Loading data...
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────
function OverviewTab() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [avgHealth, setAvgHealth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, health] = await Promise.all([
          apiFetch<SummaryData>('/api/impact/summary'),
          apiFetch<HealthRow[]>('/api/impact/health-trends'),
        ]);
        if (cancelled) return;
        setSummary(s);
        if (health.length > 0) {
          setAvgHealth(health[health.length - 1].avgHealth);
        }
      } catch (e) {
        console.error('Failed to load overview', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Total Residents"
          value={summary?.totalResidents.toLocaleString() ?? '--'}
          sub={`${summary?.activeResidents ?? 0} currently active`}
          loading={loading}
        />
        <KpiCard
          label="Total Donations"
          value={summary ? `$${summary.totalDonations.toLocaleString()}` : '--'}
          sub="All-time contributions received"
          loading={loading}
        />
        <KpiCard
          label="Reintegration Rate"
          value={summary ? `${summary.reintegrationRate}%` : '--'}
          sub={`${summary?.completedReintegrations ?? 0} completed`}
          loading={loading}
        />
        <KpiCard
          label="Avg Health Score"
          value={avgHealth !== null ? avgHealth.toFixed(1) : '--'}
          sub="Latest monthly average"
          loading={loading}
        />
      </div>
    </>
  );
}

// ── Donations Tab ────────────────────────────────────────
function DonationsTab() {
  const [trends, setTrends] = useState<MonthRow[]>([]);
  const [bySrc, setBySrc] = useState<SourceRow[]>([]);
  const [byCampaign, setByCampaign] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [t, s, c] = await Promise.all([
          apiFetch<MonthRow[]>('/api/impact/donations-by-month'),
          apiFetch<SourceRow[]>('/api/admin/reports/donations-by-source'),
          apiFetch<CampaignRow[]>('/api/admin/reports/donations-by-campaign'),
        ]);
        if (cancelled) return;
        setTrends(t);
        setBySrc(s.map(d => ({ ...d, source: formatEnumLabel(d.source) })));
        setByCampaign(c);
      } catch (e) {
        console.error('Failed to load donations', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Loading />;

  const trendData = trends.map(d => ({
    month: formatMonthLabel(d.year, d.month),
    total: Number(d.total),
  }));

  return (
    <>
      {/* Monthly trend line chart */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Monthly Donation Trends</h3>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#B0A99F" />
              <YAxis tick={{ fontSize: 11 }} stroke="#B0A99F" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip prefix="$" />} />
              <Line type="monotone" dataKey="total" stroke="#D4A853" strokeWidth={2.5} dot={{ r: 3, fill: '#D4A853' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartsRow}>
        {/* By source bar chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Donations by Source</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bySrc.map(d => ({ ...d, total: Number(d.total) }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#B0A99F" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} stroke="#B0A99F" width={100} />
              <Tooltip content={<ChartTooltip prefix="$" />} />
              <Bar dataKey="total" fill="#7A9E7E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By campaign bar chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Donations by Campaign</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCampaign.slice(0, 8).map(d => ({ ...d, total: Number(d.total) }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#B0A99F" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="campaign" tick={{ fontSize: 10 }} stroke="#B0A99F" width={120} />
              <Tooltip content={<ChartTooltip prefix="$" />} />
              <Bar dataKey="total" fill="#4A6FA5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

// ── Outcomes Tab ─────────────────────────────────────────
function OutcomesTab() {
  const [outcomes, setOutcomes] = useState<OutcomeData | null>(null);
  const [edu, setEdu] = useState<EduRow[]>([]);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [o, e, h] = await Promise.all([
          apiFetch<OutcomeData>('/api/admin/reports/resident-outcomes'),
          apiFetch<EduRow[]>('/api/impact/education-trends'),
          apiFetch<HealthRow[]>('/api/impact/health-trends'),
        ]);
        if (cancelled) return;
        setOutcomes(o);
        setEdu(e);
        setHealth(h);
      } catch (e) {
        console.error('Failed to load outcomes', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Loading />;

  const donutData = outcomes?.byType.map(d => ({ name: d.type, value: d.count })) ?? [];
  const eduData = edu.map(d => ({ month: formatMonthLabel(d.year, d.month), avgProgress: d.avgProgress, avgAttendance: d.avgAttendance }));
  const healthData = health.map(d => ({
    month: formatMonthLabel(d.year, d.month),
    health: d.avgHealth,
    nutrition: d.avgNutrition,
    sleep: d.avgSleep,
    energy: d.avgEnergy,
  }));

  const latestEdu = edu.length > 0 ? edu[edu.length - 1] : null;
  const latestHealth = health.length > 0 ? health[health.length - 1] : null;

  return (
    <>
      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Success Rate</div>
          <div className={styles.kpiValue}>{outcomes?.successRate ?? 0}%</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Avg Education Progress</div>
          <div className={styles.kpiValue}>{latestEdu?.avgProgress ?? '-'}%</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Avg Attendance</div>
          <div className={styles.kpiValue}>{latestEdu?.avgAttendance ?? '-'}%</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Avg Health Score</div>
          <div className={styles.kpiValue}>{latestHealth?.avgHealth ?? '-'}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/100</span></div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Avg Length of Stay</div>
          <div className={styles.kpiValue}>{outcomes?.avgLengthOfStayDays ?? '-'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>days</span></div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        {/* Reintegration donut */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Reintegration by Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.donutCenter}>
            <span className={styles.donutBig}>{outcomes?.successRate ?? 0}%</span>
            <span className={styles.donutLabel}>Success Rate</span>
          </div>
          <div className={styles.legend}>
            {donutData.map((d, i) => (
              <span key={d.name} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: COLORS[i % COLORS.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        {/* Education progress line */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Education Progress Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={eduData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#B0A99F" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#B0A99F" tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="avgProgress" stroke="#7A9E7E" strokeWidth={2.5} dot={{ r: 3, fill: '#7A9E7E' }} name="Avg Progress %" />
              <Line type="monotone" dataKey="avgAttendance" stroke="#4A6FA5" strokeWidth={2} dot={{ r: 2, fill: '#4A6FA5' }} name="Avg Attendance %" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Health scores line */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Health Scores Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={healthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#B0A99F" />
            <YAxis tick={{ fontSize: 11 }} stroke="#B0A99F" domain={[0, 100]} label={{ value: 'Score (0–100)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#8A8078' } }} />
            <Tooltip />
            <Line type="monotone" dataKey="health" stroke="#D4A853" strokeWidth={2} dot={{ r: 2 }} name="Health" />
            <Line type="monotone" dataKey="nutrition" stroke="#7A9E7E" strokeWidth={2} dot={{ r: 2 }} name="Nutrition" />
            <Line type="monotone" dataKey="sleep" stroke="#4A6FA5" strokeWidth={2} dot={{ r: 2 }} name="Sleep" />
            <Line type="monotone" dataKey="energy" stroke="#9B8EC2" strokeWidth={2} dot={{ r: 2 }} name="Energy" />
          </LineChart>
        </ResponsiveContainer>
        <div className={styles.legend}>
          {[
            { label: 'Health', color: '#D4A853' },
            { label: 'Nutrition', color: '#7A9E7E' },
            { label: 'Sleep', color: '#4A6FA5' },
            { label: 'Energy', color: '#9B8EC2' },
          ].map(l => (
            <span key={l.label} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Safehouses Tab ───────────────────────────────────────
interface TrendRow { safehouseCode: string; year: number; month: number; incidents: number }

function SafehousesTab() {
  const [data, setData] = useState<SafehouseRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [d, t] = await Promise.all([
          apiFetch<SafehouseRow[]>('/api/admin/reports/safehouse-comparison'),
          apiFetch<TrendRow[]>('/api/admin/reports/safehouse-trends'),
        ]);
        if (!cancelled) { setData(d); setTrends(t); }
      } catch (e) {
        console.error('Failed to load safehouse comparison', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Loading />;

  const occupancyColor = (pct: number) =>
    pct > 95 ? styles.occupancyRed : pct > 80 ? styles.occupancyYellow : styles.occupancyGreen;

  return (
    <>
      {/* Comparison table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.chartTitle}>Safehouse Comparison</h3>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Safehouse</th>
                <th>City</th>
                <th>Occupancy</th>
                <th>Active</th>
                <th>Incidents</th>
                <th>Sessions</th>
                <th>Avg Edu %</th>
                <th>Avg Health</th>
              </tr>
            </thead>
            <tbody>
              {data.map(s => (
                <tr key={s.safehouseId}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-navy)' }}>{s.safehouseCode} {s.name}</td>
                  <td>{s.city}</td>
                  <td>
                    <span>{s.currentOccupancy}/{s.capacityGirls}</span>
                    <div className={styles.occupancyBar}>
                      <div
                        className={`${styles.occupancyFill} ${occupancyColor(s.occupancyPct)}`}
                        style={{ width: `${Math.min(s.occupancyPct, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td>{s.activeResidents}</td>
                  <td>{s.incidents}</td>
                  <td>{s.recordings}</td>
                  <td>{s.avgEducation}%</td>
                  <td>{s.avgHealth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safehouse bar charts */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Occupancy by Safehouse</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="safehouseCode" tick={{ fontSize: 11 }} stroke="#B0A99F" />
              <YAxis tick={{ fontSize: 11 }} stroke="#B0A99F" tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="occupancyPct" fill="#D4A853" radius={[4, 4, 0, 0]} name="Occupancy %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Incidents by Safehouse</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="safehouseCode" tick={{ fontSize: 11 }} stroke="#B0A99F" />
              <YAxis tick={{ fontSize: 11 }} stroke="#B0A99F" />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="incidents" fill="#C4756E" radius={[4, 4, 0, 0]} name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incident Trends by Safehouse */}
      {trends.length > 0 && (() => {
        const codes = [...new Set(trends.map(t => t.safehouseCode))];
        const months = [...new Set(trends.map(t => `${t.year}-${String(t.month).padStart(2, '0')}`))].sort();
        const chartData = months.map(m => {
          const row: Record<string, string | number> = { month: m };
          codes.forEach(code => {
            const match = trends.find(t => t.safehouseCode === code && `${t.year}-${String(t.month).padStart(2, '0')}` === m);
            row[code] = match?.incidents ?? 0;
          });
          return row;
        });
        return (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Incident Trends by Safehouse</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,27,45,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                {codes.map((code, i) => (
                  <Line key={code} type="monotone" dataKey={code} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} name={code} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}
    </>
  );
}

// ── ML Insights Tab ─────────────────────────────────────
interface MlPrediction {
  modelName: string;
  scoreLabel: string;
  metadata: string;
  predictedAt: string;
  entityType?: string;
}

interface TimingSummary {
  scoreLabel: string;
  avgScore: number;
}

function humanize(s: string): string {
  return s
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function MlInsightsTab() {
  const [predictions, setPredictions] = useState<MlPrediction[]>([]);
  const [timingSummary, setTimingSummary] = useState<TimingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [preds, timing] = await Promise.all([
          apiFetch<MlPrediction[]>('/api/ml/insights'),
          apiFetch<TimingSummary[]>('/api/ml/predictions/platform_timing/summary').catch(() => []),
        ]);
        if (cancelled) return;
        setPredictions(preds);
        setTimingSummary(timing);
      } catch (e) {
        console.error('Failed to load ML insights', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Loading />;

  // Parse predictions by model
  const byModel = (name: string) => predictions.filter(p => p.modelName === name);

  // Reintegration drivers
  const reintPred = byModel('reintegration-drivers')[0];
  const reintDrivers: { feature: string; coefficient: number; p_value: number; label?: string }[] =
    reintPred ? (JSON.parse(reintPred.metadata).top_drivers ?? []) : [];

  // Donor churn drivers
  const donorPred = byModel('donor-churn-drivers')[0];
  const donorDrivers: { feature: string; odds_ratio: number; p_value: number }[] =
    donorPred ? (JSON.parse(donorPred.metadata).top_drivers ?? []) : [];

  // Incident risk drivers
  const incidentPred = byModel('incident-risk-drivers')[0];
  const incidentMeta = incidentPred ? JSON.parse(incidentPred.metadata) : {};
  const selfharmDrivers: { feature: string; coefficient: number; odds_ratio: number; p_value: number }[] =
    incidentMeta.selfharm_drivers ?? [];
  const runawayDrivers: { feature: string; coefficient: number; odds_ratio: number; p_value: number }[] =
    incidentMeta.runaway_drivers ?? [];

  // Social media content
  const contentPred = byModel('social-media-content')[0];
  const contentFindings: { feature: string; effect: string; label?: string }[] =
    contentPred ? (JSON.parse(contentPred.metadata).top_findings ?? []) : [];

  // Social media timing — parse timing summary into best time per platform
  const platformBest: { platform: string; day: string; hour: string; score: number }[] = [];
  if (timingSummary.length > 0) {
    const grouped: Record<string, { day: string; hour: string; score: number }[]> = {};
    for (const t of timingSummary) {
      // scoreLabel format: "Platform_Day_Hour" e.g. "Facebook_Monday_9"
      const parts = t.scoreLabel.split('_');
      if (parts.length >= 3) {
        const platform = parts[0];
        const day = parts[1];
        const hour = parts.slice(2).join('_');
        if (!grouped[platform]) grouped[platform] = [];
        grouped[platform].push({ day, hour, score: t.avgScore });
      }
    }
    for (const [platform, entries] of Object.entries(grouped)) {
      entries.sort((a, b) => b.score - a.score);
      if (entries.length > 0) {
        platformBest.push({ platform, ...entries[0] });
      }
    }
    platformBest.sort((a, b) => b.score - a.score);
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-1)',
    border: '1px solid rgba(15, 27, 45, 0.08)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    padding: '1.5rem',
    marginBottom: '1.25rem',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  };

  const rankStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '50%',
    background: 'rgba(15, 27, 45, 0.06)',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    flexShrink: 0,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(15, 27, 45, 0.04)',
    fontSize: '0.85rem',
  };

  const sigBadge = (pValue: number) => {
    const isSig = pValue < 0.05;
    return (
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 600,
        padding: '0.1rem 0.4rem',
        borderRadius: '999px',
        background: isSig ? 'rgba(122,158,126,0.12)' : 'rgba(138,128,120,0.1)',
        color: isSig ? '#2d6a4f' : '#8A8078',
      }}>
        {isSig ? 'significant' : 'suggestive'}
      </span>
    );
  };

  return (
    <>
      {/* Section 1: Reintegration Drivers */}
      {reintDrivers.length > 0 && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>What Drives Reintegration Success</h3>
            <MlBadge />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <ResponsiveContainer width="100%" height={Math.max(reintDrivers.length * 32, 120)}>
              <BarChart data={reintDrivers.slice(0, 8).map(d => ({ name: humanize(d.feature), value: d.coefficient }))} layout="vertical" margin={{ left: 120, right: 20, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => v.toFixed(3)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {reintDrivers.slice(0, 8).map((d, i) => (
                    <Cell key={i} fill={d.coefficient >= 0 ? '#27ae60' : '#c0392b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {reintDrivers.map((d, i) => (
            <div key={d.feature} style={rowStyle}>
              <span style={rankStyle}>{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-strong)', fontWeight: 500 }}>
                {humanize(d.feature)}
              </span>
              <span style={{
                fontSize: '1rem',
                color: d.coefficient >= 0 ? '#2d6a4f' : '#c0392b',
                fontWeight: 700,
              }}>
                {d.coefficient >= 0 ? '\u2191' : '\u2193'}
              </span>
              {sigBadge(d.p_value)}
            </div>
          ))}
        </div>
      )}

      {/* Section 2: Donor Retention Drivers */}
      {donorDrivers.length > 0 && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>What Drives Donor Retention</h3>
            <MlBadge />
          </div>
          {donorDrivers.map((d, i) => (
            <div key={d.feature} style={rowStyle}>
              <span style={rankStyle}>{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-strong)', fontWeight: 500 }}>
                {humanize(d.feature)}
              </span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: d.odds_ratio >= 1 ? '#2d6a4f' : '#c0392b',
              }}>
                {d.odds_ratio >= 1
                  ? `${d.odds_ratio.toFixed(1)}x more likely`
                  : `${d.odds_ratio.toFixed(1)}x less likely`}
              </span>
              {sigBadge(d.p_value)}
            </div>
          ))}
        </div>
      )}

      {/* Section 3: Incident Risk Factors */}
      {(selfharmDrivers.length > 0 || runawayDrivers.length > 0) && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Incident Risk Factors</h3>
            <MlBadge />
          </div>

          {selfharmDrivers.length > 0 && (
            <>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-strong)', margin: '0.75rem 0 0.5rem' }}>
                Self-Harm Risk Factors
              </h4>
              {selfharmDrivers.map((d, i) => (
                <div key={d.feature} style={rowStyle}>
                  <span style={rankStyle}>{i + 1}</span>
                  <span style={{ flex: 1, color: 'var(--text-strong)', fontWeight: 500 }}>
                    {humanize(d.feature)}
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: d.odds_ratio >= 1 ? '#c0392b' : '#2d6a4f',
                  }}>
                    {d.odds_ratio.toFixed(1)}x
                  </span>
                  {sigBadge(d.p_value)}
                </div>
              ))}
            </>
          )}

          {runawayDrivers.length > 0 && (
            <>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-strong)', margin: '1rem 0 0.5rem' }}>
                Runaway Risk Factors
              </h4>
              {runawayDrivers.map((d, i) => (
                <div key={d.feature} style={rowStyle}>
                  <span style={rankStyle}>{i + 1}</span>
                  <span style={{ flex: 1, color: 'var(--text-strong)', fontWeight: 500 }}>
                    {humanize(d.feature)}
                  </span>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: d.odds_ratio >= 1 ? '#c0392b' : '#2d6a4f',
                  }}>
                    {d.odds_ratio.toFixed(1)}x
                  </span>
                  {sigBadge(d.p_value)}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Section 4: Social Media Strategy */}
      {(contentFindings.length > 0 || platformBest.length > 0) && (
        <div style={cardStyle}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Social Media Insights</h3>
            <MlBadge />
          </div>

          {contentFindings.length > 0 && (
            <>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-strong)', margin: '0.5rem 0' }}>
                Content That Works
              </h4>
              {contentFindings.map((f, i) => (
                <div key={i} style={rowStyle}>
                  <span style={{ flex: 1, color: 'var(--text-strong)', fontWeight: 500 }}>
                    {humanize(f.feature)}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {f.effect}
                  </span>
                </div>
              ))}
            </>
          )}

          {platformBest.length > 0 && (
            <>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-strong)', margin: '1rem 0 0.5rem' }}>
                Best Times to Post
              </h4>
              <table className={styles.table} style={{ marginTop: '0.25rem' }}>
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Best Day</th>
                    <th>Best Hour</th>
                  </tr>
                </thead>
                <tbody>
                  {platformBest.map(p => (
                    <tr key={p.platform}>
                      <td style={{ fontWeight: 600, color: 'var(--color-deep-navy)' }}>{p.platform}</td>
                      <td>{p.day}</td>
                      <td>{parseInt(p.hour, 10) > 12 ? `${parseInt(p.hour, 10) - 12}:00 PM` : parseInt(p.hour, 10) === 0 ? '12:00 AM' : `${parseInt(p.hour, 10)}:00 ${parseInt(p.hour, 10) === 12 ? 'PM' : 'AM'}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {predictions.length === 0 && (
        <div className={styles.empty} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No ML insights available yet. Run the ML pipelines to generate org-level predictions.
        </div>
      )}
    </>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function ReportsPage() {
  useDocumentTitle('Reports & Analytics');
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'overview';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const handleTabChange = useCallback((key: TabKey) => {
    setActiveTab(key);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reports & Analytics</h1>
        <p className={styles.subtitle}>Aggregated insights and trends for decision-making</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(t.key)}
          >
            {t.label}
            {t.key === 'ml' && <> <MlBadge /></>}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'donations' && <DonationsTab />}
      {activeTab === 'outcomes' && <OutcomesTab />}
      {activeTab === 'safehouses' && <SafehousesTab />}
      {activeTab === 'aar' && <AARTab />}
      {activeTab === 'ml' && <MlInsightsTab />}
    </div>
  );
}

// ── AAR (Annual Accomplishment Report) Tab ──────────────
interface AARCategory {
  category: string;
  serviceCount: number;
  beneficiaryCount: number;
  services: { service: string; count: number; beneficiaries: number }[];
}

function AARTab() {
  const [data, setData] = useState<{ categories: AARCategory[]; totalBeneficiaries: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ categories: AARCategory[]; totalBeneficiaries: number }>('/api/admin/reports/aar-summary')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <div className={styles.empty}>Failed to load AAR data.</div>;

  const CATEGORY_COLORS: Record<string, string> = {
    Caring: '#3498db',
    Healing: '#27ae60',
    Teaching: '#f39c12',
  };

  return (
    <div>
      <h2 className={styles.sectionTitle}>Annual Accomplishment Report</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Services categorized by Philippine DSWD Annual Accomplishment Report framework: Caring, Healing, and Teaching.
      </p>

      {/* Total beneficiaries */}
      <div style={{ background: 'linear-gradient(135deg, #B8913A 0%, #D4A853 100%)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', color: '#fff' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, opacity: 0.9 }}>Total Unique Beneficiaries</div>
        <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.totalBeneficiaries}</div>
      </div>

      {/* Category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {data.categories.map(cat => {
          const color = CATEGORY_COLORS[cat.category] || '#8A8078';
          return (
            <div key={cat.category} style={{ background: '#fff', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '12px', padding: '1.25rem', borderLeft: `4px solid ${color}` }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>{cat.category}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Services Delivered</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-strong)' }}>{cat.serviceCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Beneficiaries</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-strong)' }}>{cat.beneficiaryCount}</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(15,27,45,0.06)', paddingTop: '0.5rem' }}>
                {cat.services.map(s => (
                  <div key={s.service} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.25rem 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{s.service}</span>
                    <span style={{ fontWeight: 600 }}>{s.count} ({s.beneficiaries} beneficiaries)</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar chart comparing categories */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Service Delivery by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.categories} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,27,45,0.06)" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="serviceCount" name="Services" fill="#3498db" radius={[4, 4, 0, 0]} />
            <Bar dataKey="beneficiaryCount" name="Beneficiaries" fill="#27ae60" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

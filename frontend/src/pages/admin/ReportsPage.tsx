import { useState, useEffect, useCallback } from 'react';
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
interface EduRow { year: number; month: number; avgProgress: number }
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
          sub={`${summary?.activeSafehouses ?? 0} active safehouses`}
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
  const eduData = edu.map(d => ({ month: formatMonthLabel(d.year, d.month), avgProgress: d.avgProgress }));
  const healthData = health.map(d => ({
    month: formatMonthLabel(d.year, d.month),
    health: d.avgHealth,
    nutrition: d.avgNutrition,
    sleep: d.avgSleep,
    energy: d.avgEnergy,
  }));

  return (
    <>
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
            <YAxis tick={{ fontSize: 11 }} stroke="#B0A99F" />
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
function SafehousesTab() {
  const [data, setData] = useState<SafehouseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const d = await apiFetch<SafehouseRow[]>('/api/admin/reports/safehouse-comparison');
        if (!cancelled) setData(d);
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
    </>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

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
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'donations' && <DonationsTab />}
      {activeTab === 'outcomes' && <OutcomesTab />}
      {activeTab === 'safehouses' && <SafehousesTab />}
    </div>
  );
}

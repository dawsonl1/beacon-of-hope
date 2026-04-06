import { ArrowUpRight, AlertTriangle, Calendar, UserPlus, DollarSign, FileText } from 'lucide-react';
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
import styles from './AdminDashboard.module.css';

/* ── Static data (replaced by API later) ───────────────── */

const activeResidentsOverTime = [
  { month: 'Jul 24', count: 47 },
  { month: 'Aug', count: 45 },
  { month: 'Sep', count: 50 },
  { month: 'Oct', count: 48 },
  { month: 'Nov', count: 51 },
  { month: 'Dec', count: 49 },
  { month: 'Jan 25', count: 52 },
  { month: 'Feb', count: 53 },
  { month: 'Mar', count: 55 },
];

const flaggedCasesOverTime = [
  { month: 'Jul 24', count: 6 },
  { month: 'Aug', count: 4 },
  { month: 'Sep', count: 5 },
  { month: 'Oct', count: 3 },
  { month: 'Nov', count: 4 },
  { month: 'Dec', count: 5 },
  { month: 'Jan 25', count: 4 },
  { month: 'Feb', count: 6 },
  { month: 'Mar', count: 7 },
];

const donationsByChannel = [
  { channel: 'Social', amount: 48200 },
  { channel: 'Church', amount: 62100 },
  { channel: 'Event', amount: 31400 },
  { channel: 'Partner', amount: 22800 },
  { channel: 'Direct', amount: 17900 },
];

const channelColors = ['#D4A853', '#B8913A', '#7A9E7E', '#5A6B7A', '#C4756E'];

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

const residentsTable: ResidentRow[] = [
  { code: 'LS-0007', safehouse: 'SH03 Davao', category: 'Trafficked', riskLevel: 'Critical', admittedDate: '2023-08-02', socialWorker: 'SW-14', lastSession: '2 days ago' },
  { code: 'LS-0001', safehouse: 'SH04 Iloilo', category: 'Neglected', riskLevel: 'High', admittedDate: '2023-10-17', socialWorker: 'SW-15', lastSession: '5 days ago' },
  { code: 'LS-0012', safehouse: 'SH01 QC', category: 'Sexual Abuse', riskLevel: 'High', admittedDate: '2023-12-05', socialWorker: 'SW-20', lastSession: '1 day ago' },
  { code: 'LS-0003', safehouse: 'SH01 QC', category: 'Surrendered', riskLevel: 'Medium', admittedDate: '2024-05-24', socialWorker: 'SW-20', lastSession: '3 days ago' },
  { code: 'LS-0009', safehouse: 'SH05 Baguio', category: 'At Risk', riskLevel: 'Medium', admittedDate: '2024-01-15', socialWorker: 'SW-18', lastSession: '1 week ago' },
  { code: 'LS-0018', safehouse: 'SH02 Cebu', category: 'Neglected', riskLevel: 'Medium', admittedDate: '2024-03-08', socialWorker: 'SW-14', lastSession: '4 days ago' },
  { code: 'LS-0004', safehouse: 'SH02 Cebu', category: 'CICL', riskLevel: 'Low', admittedDate: '2024-09-27', socialWorker: 'SW-15', lastSession: '2 days ago' },
  { code: 'LS-0015', safehouse: 'SH06 CDO', category: 'At Risk', riskLevel: 'Low', admittedDate: '2024-07-19', socialWorker: 'SW-12', lastSession: '6 days ago' },
];

interface RecentDonation {
  supporter: string;
  type: string;
  amount: string;
  date: string;
  campaign: string;
}

const recentDonations: RecentDonation[] = [
  { supporter: 'Noah Chen', type: 'Monetary', amount: '₱1,075', date: 'Mar 28', campaign: 'Year-End Hope' },
  { supporter: 'Aria Brown', type: 'Time', amount: '12 hrs', date: 'Mar 26', campaign: '—' },
  { supporter: 'Liam Diaz', type: 'Monetary', amount: '₱2,400', date: 'Mar 25', campaign: 'Back to School' },
  { supporter: 'Mila Alvarez', type: 'In-Kind', amount: '₱850 est.', date: 'Mar 24', campaign: '—' },
  { supporter: 'Sofia Reyes', type: 'Monetary', amount: '₱500', date: 'Mar 22', campaign: 'Summer of Safety' },
];

const severityConfig: Record<Severity, { color: string; bg: string; border: string }> = {
  Low: { color: '#4A7A4E', bg: '#7A9E7E18', border: '#7A9E7E40' },
  Medium: { color: '#A68B3A', bg: '#D4A85318', border: '#D4A85340' },
  High: { color: '#B5713A', bg: '#D48C5318', border: '#D48C5340' },
  Critical: { color: '#A5524D', bg: '#C4756E18', border: '#C4756E40' },
};

/* ── Tooltips ──────────────────────────────────────────── */

function ChartTooltip({ active, payload, label, prefix = '' }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>{prefix}{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────── */

export default function AdminDashboard() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Dashboard</h1>
            <span className={styles.roleBadge}>Admin</span>
          </div>
          <p className={styles.dateText}>{dateStr}</p>
        </div>
        <div className={styles.quickActions}>
          <button className={styles.actionBtn}>
            <UserPlus size={15} />
            <span>Add Resident</span>
          </button>
          <button className={styles.actionBtn}>
            <DollarSign size={15} />
            <span>Log Donation</span>
          </button>
          <button className={styles.actionBtn}>
            <FileText size={15} />
            <span>New Recording</span>
          </button>
        </div>
      </header>

      {/* ── Metric Cards ───────────────────────────────── */}
      <section className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Active Residents</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>55</span>
            <span className={styles.metricUp}><ArrowUpRight size={14} />+5.7%</span>
          </div>
          <span className={styles.metricSub}>across 9 safehouses</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Open Incidents</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>7</span>
            <span className={styles.metricDanger}><AlertTriangle size={14} />2 critical</span>
          </div>
          <span className={styles.metricSub}>3 unresolved &gt; 7 days</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Monthly Donations</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>₱182.4k</span>
            <span className={styles.metricUp}><ArrowUpRight size={14} />+18%</span>
          </div>
          <span className={styles.metricSub}>42 donations this month</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Case Conferences</span>
          <div className={styles.metricRow}>
            <span className={styles.metricNumber}>5</span>
            <span className={styles.metricDate}><Calendar size={14} />Next: Dec 11</span>
          </div>
          <span className={styles.metricSub}>2 this week, 3 next week</span>
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
                {residentsTable.map((r) => (
                  <tr key={r.code} className={r.riskLevel === 'Critical' ? styles.rowCritical : ''}>
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
        </div>

        {/* Right column: Recent Donations + Channel breakdown */}
        <div className={styles.rightCol}>
          <div className={styles.donationsCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Donations</h2>
              <button className={styles.viewAllBtn}>View all</button>
            </div>
            <div className={styles.donationsList}>
              {recentDonations.map((d, i) => (
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
              <h2 className={styles.cardTitle}>By Channel</h2>
              <span className={styles.cardSubtitle}>Acquisition source</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={donationsByChannel} layout="vertical" barCategoryGap="25%">
                <XAxis type="number" hide />
                <YAxis dataKey="channel" type="category" tick={{ fontSize: 12, fill: '#8A8078' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<ChartTooltip prefix="₱" />} cursor={{ fill: 'rgba(212, 168, 83, 0.06)' }} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {donationsByChannel.map((_, i) => (
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
            <span className={styles.chartCallout}>+3 admitted this month</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activeResidentsOverTime}>
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
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartMeta}>
            <h2 className={styles.cardTitle}>Cases Flagged for Review</h2>
            <span className={styles.chartCalloutDanger}>7 currently flagged</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={flaggedCasesOverTime}>
              <defs>
                <linearGradient id="gradFlagged" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C4756E" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#C4756E" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A8078' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8A8078' }} axisLine={false} tickLine={false} domain={[0, 'dataMax + 2']} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#C4756E" strokeWidth={2} fill="url(#gradFlagged)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

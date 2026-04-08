import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { Heart, ArrowUpRight } from 'lucide-react';
import { apiFetch } from '../api';
import type { ImpactSummary } from '../types';
import { formatMonthLabel } from '../constants';
import { ChartTooltip } from '../components/ChartTooltip';
import { ApiError } from '../components/ApiError';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import styles from './ImpactPage.module.css';



const CHART_COLORS = {
  primary: '#B8913A',
  primaryLight: '#D4A853',
  grid: '#E8E0D4',
  text: '#8A8078',
  tooltipBg: '#1B2838',
};

const allocationColors = [
  '#B8913A', '#D4A853', '#7A9E7E', '#C4756E',
  '#5A6B7A', '#E8C97A', '#2A3A4E', '#D4CFC8',
];

/* ── Impact Page ───────────────────────────────────────── */

export default function ImpactPage() {
  const statsRef = useReveal();
  const donationsChartRef = useReveal();
  const metricsRef = useReveal();
  const allocationRef = useReveal();
  const storiesRef = useReveal();
  const ctaRef = useReveal();

  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [monthlyDonations, setMonthlyDonations] = useState<Array<{ month: string; total: number }>>([]);
  const [allocationData, setAllocationData] = useState<Array<{ area: string; amount: number }>>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<ImpactSummary>('/api/impact/summary')
      .then(setSummary)
      .catch(e => { console.error('API fetch failed', e); setError(true); });

    apiFetch<Array<{ year: number; month: number; total: number }>>('/api/impact/donations-by-month')
      .then(data => setMonthlyDonations(data.map(d => ({
        month: formatMonthLabel(d.year, d.month),
        total: Math.round(Number(d.total)),
      }))))
      .catch(e => { console.error('API fetch failed', e); setError(true); });

    apiFetch<Array<{ area: string; amount: number }>>('/api/impact/allocations-by-program')
      .then(data => setAllocationData(data.map(d => ({ area: d.area, amount: Math.round(Number(d.amount)) }))))
      .catch(e => { console.error('API fetch failed', e); setError(true); });
  }, []);

  const latestDonation = monthlyDonations[monthlyDonations.length - 1];

  return (
    <main className={styles.page}>
      {/* ── Hero Stats ──────────────────────────────────── */}
      <section className={styles.statsBanner} ref={statsRef}>
        <div className={`${styles.statsInner} reveal`}>
          <h1 className={styles.statsHeadline}>Our impact, by the numbers</h1>
          <p className={styles.statsUpdated}>Live data as of February 15, 2026</p>
          {error && <ApiError />}
          {summary && (
            <>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{summary.totalResidents}</span>
                  <span className={styles.statDesc}>Girls served</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>${Math.round(Number(summary.totalDonations) / 1000)}K</span>
                  <span className={styles.statDesc}>Total donations</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{summary.activeSafehouses}</span>
                  <span className={styles.statDesc}>Active safehouses</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{summary.activeResidents}</span>
                  <span className={styles.statDesc}>Currently in care</span>
                </div>
              </div>

              {/* Key metric — absolute reintegrations */}
              <div className={styles.okrCard}>
                <div className={styles.okrLeft}>
                  <div className={styles.okrLabel}>Our North Star</div>
                  <div className={styles.okrValue}>{summary.completedReintegrations}</div>
                  <div className={styles.okrTitle}>Girls Reintegrated</div>
                </div>
                <div className={styles.okrRight}>
                  <p className={styles.okrDesc}>
                    Of {summary.totalResidents} girls served, {summary.activeResidents} are currently
                    receiving care and {summary.completedReintegrations} have completed their
                    journey — reunified with family, placed in foster care, or transitioned to
                    independent living. Our goal is 40 successful reintegrations by end of 2026.
                  </p>
                  <div className={styles.okrBar}>
                    <div className={styles.okrFill} style={{ width: `${Math.min(100, (summary.completedReintegrations / 40) * 100)}%` }} />
                  </div>
                  <div className={styles.okrTarget}>{summary.completedReintegrations} of 40 — {Math.round((summary.completedReintegrations / 40) * 100)}% to goal</div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Monthly Donations Chart ────────────────────── */}
      <section className={styles.chartSection} ref={donationsChartRef}>
        <div className={`${styles.chartInner} reveal`}>
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.chartLabel}>Monthly donations over time</p>
              {latestDonation && (
                <div className={styles.chartHighlight}>
                  <span className={styles.chartBigNumber}>${(latestDonation.total / 1000).toFixed(1)}k</span>
                  <span className={styles.chartSubtext}> raised this month</span>
                  <span className={styles.chartGoalText}> &middot; $15k goal</span>
                </div>
              )}
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyDonations} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip prefix="$" />} cursor={{ fill: 'rgba(212, 168, 83, 0.08)' }} />
                <ReferenceLine
                  y={15000}
                  stroke="#0F8F7D"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{ value: 'Monthly Goal', position: 'right', fill: '#0F8F7D', fontSize: 12, fontWeight: 600 }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {monthlyDonations.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === monthlyDonations.length - 1
                        ? CHART_COLORS.primary
                        : CHART_COLORS.primaryLight}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Metric Cards ───────────────────────────────── */}
      <section className={styles.metricsSection} ref={metricsRef}>
        <div className={`${styles.metricsInner} reveal`}>
          <p className={styles.chartLabel}>Program outcomes</p>
          {summary && (
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricNumber}>{summary.completedReintegrations}</span>
              <span className={styles.metricLabel}>Girls reunified with families</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                {summary.reintegrationRate}% reintegrated into families
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricNumber}>{summary.activeResidents}</span>
              <span className={styles.metricLabel}>Girls currently in our care</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                Receiving shelter, education &amp; counseling
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricNumber}>${(summary.totalDonations / 1000).toFixed(0)}k</span>
              <span className={styles.metricLabel}>Total donations to date</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                Every dollar transforms a life
              </span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricNumber}>{summary.activeSafehouses}</span>
              <span className={styles.metricLabel}>Active safehouses</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                Operating across Guam
              </span>
            </div>
          </div>
          )}
        </div>
      </section>

      {/* ── Allocation Chart ───────────────────────────── */}
      <section className={styles.chartSection} ref={allocationRef}>
        <div className={`${styles.chartInner} reveal`}>
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.chartLabel}>Where your donations go</p>
              <div className={styles.chartHighlight}>
                <span className={styles.chartBigNumber}>${Math.round(allocationData.reduce((sum, d) => sum + d.amount, 0) / 1000)}k</span>
                <span className={styles.chartSubtext}>total allocated</span>
              </div>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={allocationData} barCategoryGap="15%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="area"
                  tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: CHART_COLORS.text }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip prefix="$" />} cursor={{ fill: 'rgba(212, 168, 83, 0.08)' }} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={allocationColors[i % allocationColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Stories of Hope ─────────────────────────────── */}
      <section className={styles.stories} ref={storiesRef}>
        <div className={`${styles.storiesInner} reveal`}>
          {/* Story 1 — Education */}
          <div className={styles.storyRow}>
            <div className={styles.storyText}>
              <span className={styles.storyTag}>Education</span>
              <h2 className={styles.storyTitle}>Stories of hope</h2>
              <p className={styles.storyBody}>
                A 15-year-old arrived at our safehouse with no formal schooling and
                little hope for the future. After 18 months in our education program,
                she completed her elementary equivalency, discovered a passion for
                science, and now dreams of becoming a nurse. &ldquo;For the first time,
                I believe my life can be different,&rdquo; she told her social worker.
              </p>
              <p className={styles.storyNote}>
                Names and identifying details have been changed to protect privacy.
              </p>
            </div>
            <div className={styles.storyImage}>
              <div className={styles.storyImagePlaceholder} aria-label="Illustration representing education and growth" />
            </div>
          </div>

          {/* Story 2 — Reintegration */}
          <div className={`${styles.storyRow} ${styles.storyRowReverse}`}>
            <div className={styles.storyImage}>
              <div className={styles.storyImagePlaceholder} aria-label="Illustration representing family reunification" />
            </div>
            <div className={styles.storyText}>
              <span className={styles.storyTag}>Reintegration</span>
              <h2 className={styles.storyTitle}>Stories of hope</h2>
              <p className={styles.storyBody}>
                After two years of counseling, health services, and guided family
                visits, a young survivor was successfully reunified with her family.
                Her risk level dropped from Critical to Low, and she continues to
                receive post-placement monitoring from our social workers.
              </p>
              <p className={styles.storyNote}>
                Names and identifying details have been changed to protect privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────── */}
      <section className={styles.bottomCta} ref={ctaRef}>
        <div className={`${styles.ctaInner} reveal`}>
          {latestDonation && (
            <div className={styles.goalProgress}>
              <div className={styles.goalBar}>
                <div className={styles.goalFill} style={{ width: `${Math.min(100, (latestDonation.total / 15000) * 100)}%` }} />
              </div>
              <p className={styles.goalText}>
                ${(latestDonation.total / 1000).toFixed(1)}k of $15k monthly goal — {Math.round((latestDonation.total / 15000) * 100)}% there
              </p>
            </div>
          )}
          <h2 className={styles.ctaTitle}>
            Help us reach our goal this month.
          </h2>
          <Link to="/donate" className={styles.ctaButton}>
            <Heart size={16} />
            Donate Now
          </Link>
        </div>
      </section>
    </main>
  );
}

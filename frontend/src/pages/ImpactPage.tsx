import { useEffect, useState } from 'react';
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
      {/* ── Stats Banner ───────────────────────────────── */}
      <section className={styles.statsBanner} ref={statsRef}>
        <div className={`${styles.statsInner} reveal`}>
          <div className={styles.statsLabel}>
            <h1 className={styles.statsHeadline}>Our impact, by the numbers</h1>
            <p className={styles.statsUpdated}>Live data</p>
          </div>
          {error && <ApiError />}
          {summary && (
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{summary.totalResidents}</span>
                <span className={styles.statDesc}>Girls served</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{summary.reintegrationRate}%</span>
                <span className={styles.statDesc}>Successfully reintegrated</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>₱{(Number(summary.totalDonations) / 1000000).toFixed(1)}M</span>
                <span className={styles.statDesc}>Total donations</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{summary.activeSafehouses}</span>
                <span className={styles.statDesc}>Active safehouses</span>
              </div>
            </div>
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
                  <span className={styles.chartBigNumber}>₱{(latestDonation.total / 1000).toFixed(1)}k</span>
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
                  tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip prefix="₱" />} cursor={{ fill: 'rgba(212, 168, 83, 0.08)' }} />
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
          <div className={`${styles.metricsGrid} reveal-stagger`}>
            <div className={`${styles.metricCard} reveal`}>
              <span className={styles.metricNumber}>₱12.4k</span>
              <span className={styles.metricLabel}>Avg monthly donations</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                +10.7% last mo
              </span>
            </div>
            <div className={`${styles.metricCard} reveal`}>
              <span className={styles.metricNumber}>81%</span>
              <span className={styles.metricLabel}>Avg education progress</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                +4.2% last mo
              </span>
            </div>
            <div className={`${styles.metricCard} reveal`}>
              <span className={styles.metricNumber}>89%</span>
              <span className={styles.metricLabel}>Avg health score</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                +1.8% last mo
              </span>
            </div>
            <div className={`${styles.metricCard} reveal`}>
              <span className={styles.metricNumber}>94%</span>
              <span className={styles.metricLabel}>Safehouse occupancy</span>
              <span className={styles.metricChange}>
                <ArrowUpRight size={12} />
                +2.1% last mo
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Allocation Chart ───────────────────────────── */}
      <section className={styles.chartSection} ref={allocationRef}>
        <div className={`${styles.chartInner} reveal`}>
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.chartLabel}>Where your donations go</p>
              <div className={styles.chartHighlight}>
                <span className={styles.chartBigNumber}>₱177k</span>
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
                  tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip prefix="₱" />} cursor={{ fill: 'rgba(212, 168, 83, 0.08)' }} />
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
                A 15-year-old referred through a government agency arrived with no
                formal schooling. After 18 months in our education program, she
                completed her elementary equivalency and is now enrolled in
                secondary school with an 87% attendance rate.
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
          <h2 className={styles.ctaTitle}>
            Inspired by what you've seen? Help us do more.
          </h2>
          <a href="https://www.paypal.com/donate" target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
            <Heart size={16} />
            Donate Now
          </a>
        </div>
      </section>
    </main>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { apiFetch } from '../../api';
import { formatMonthLabel, formatEnumLabel } from '../../constants';
import { ChartTooltip } from '../../components/ChartTooltip';
import KpiCard from '../../components/admin/KpiCard';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './ReportsPage.module.css';

// ── Palette ──────────────────────────────────────────────
const COLORS = ['#D4A853', '#7A9E7E', '#C4756E', '#4A6FA5', '#9B8EC2', '#D4916E', '#6EB5C4', '#B8A04C'];

// ── InfoTip ──────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  return (
    <span className={styles.infoTip} data-tooltip={text}>?</span>
  );
}

// ── Friendly feature names & descriptions for ML tab ─────
const FEATURE_LABELS: Record<string, string> = {
  // Donor features
  recency_days: 'Days Since Last Donation',
  gap_trend: 'Donation Gap Trend',
  total_donated: 'Total Lifetime Donations',
  donation_count: 'Number of Donations',
  avg_donation: 'Average Donation Amount',
  frequency_days: 'Donation Frequency',
  is_recurring: 'Recurring Donor',
  months_since_first: 'Donor Tenure',
  campaign_count: 'Campaigns Supported',
  // Resident features
  age_at_admission: 'Age at Admission',
  length_of_stay_days: 'Length of Stay',
  has_special_needs: 'Has Special Needs',
  education_progress: 'Education Progress',
  health_score: 'Health Score',
  session_count: 'Counseling Sessions',
  incident_count: 'Incident Count',
  family_engagement: 'Family Engagement',
  emotional_progress: 'Emotional Progress',
  sleep_quality_score: 'Sleep Quality',
  nutrition_score: 'Nutrition Score',
  energy_level_score: 'Energy Level',
  general_health_score: 'General Health',
  attendance_rate: 'Attendance Rate',
  progress_percent: 'Academic Progress',
  // Incident risk features (from residents table)
  sub_cat_sexual_abuse: 'Sexual Abuse History',
  sub_cat_trafficked: 'Trafficking History',
  sub_cat_osaec: 'Online Exploitation (OSAEC)',
  sub_cat_physical_abuse: 'Physical Abuse History',
  sub_cat_child_labor: 'Child Labor History',
  sub_cat_at_risk: 'At-Risk Classification',
  sub_cat_orphaned: 'Orphaned',
  sub_cat_street_child: 'Street Situation',
  sub_cat_cicl: 'Conflict with the Law',
  sub_cat_child_with_hiv: 'Living with HIV',
  is_pwd: 'Person with Disability',
  initial_risk_num: 'Initial Risk Level',
  trauma_severity_score: 'Trauma Severity Score',
  family_vulnerability_score: 'Family Vulnerability Score',
  case_category_Abandoned: 'Case: Abandoned',
  case_category_Foundling: 'Case: Foundling',
  case_category_Surrendered: 'Case: Surrendered',
  case_category_Neglected: 'Case: Neglected',
  // Social media features
  features_resident_story: 'Features a Resident Story',
  has_call_to_action: 'Has Call to Action',
  is_boosted: 'Paid Promotion (Boosted)',
  boost_budget_php: 'Boost Budget (PHP)',
  caption_length: 'Caption Length',
  num_hashtags: 'Number of Hashtags',
  post_hour: 'Time of Day Posted',
  platform_Facebook: 'Platform: Facebook',
  platform_Instagram: 'Platform: Instagram',
  platform_Twitter: 'Platform: Twitter',
  platform_TikTok: 'Platform: TikTok',
  platform_YouTube: 'Platform: YouTube',
  platform_WhatsApp: 'Platform: WhatsApp',
  post_type_ImpactStory: 'Post Type: Impact Story',
  post_type_Campaign: 'Post Type: Campaign',
  post_type_EventPromotion: 'Post Type: Event Promo',
  post_type_EducationalContent: 'Post Type: Educational',
  post_type_FundraisingAppeal: 'Post Type: Fundraising Appeal',
  media_type_Photo: 'Media: Photo',
  media_type_Video: 'Media: Video',
  media_type_Carousel: 'Media: Carousel',
  media_type_Reel: 'Media: Reel',
  sentiment_tone_Hopeful: 'Tone: Hopeful',
  sentiment_tone_Urgent: 'Tone: Urgent',
  sentiment_tone_Celebratory: 'Tone: Celebratory',
  sentiment_tone_Grateful: 'Tone: Grateful',
  sentiment_tone_Emotional: 'Tone: Emotional',
  content_topic_Education: 'Topic: Education',
  content_topic_Health: 'Topic: Health',
  content_topic_Reintegration: 'Topic: Reintegration',
  content_topic_DonorImpact: 'Topic: Donor Impact',
  content_topic_SafehouseLife: 'Topic: Safehouse Life',
  content_topic_EventRecap: 'Topic: Event Recap',
  content_topic_CampaignLaunch: 'Topic: Campaign Launch',
  content_topic_AwarenessRaising: 'Topic: Awareness',
  call_to_action_type_DonateNow: 'CTA: Donate Now',
  call_to_action_type_LearnMore: 'CTA: Learn More',
  call_to_action_type_ShareStory: 'CTA: Share Story',
  call_to_action_type_SignUp: 'CTA: Sign Up',
  day_of_week_Tuesday: 'Day: Tuesday',
  day_of_week_Wednesday: 'Day: Wednesday',
  day_of_week_Thursday: 'Day: Thursday',
  day_of_week_Friday: 'Day: Friday',
  day_of_week_Saturday: 'Day: Saturday',
  day_of_week_Sunday: 'Day: Sunday',
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  // Donor features
  recency_days: 'How many days since this donor last made a contribution. Higher values may indicate lapsing donors.',
  gap_trend: 'Whether the time between successive donations is increasing (positive) or decreasing (negative). A growing gap suggests declining engagement.',
  total_donated: 'The cumulative monetary amount a donor has given over their entire relationship with the organization (in PHP).',
  donation_count: 'Total number of individual donation events recorded for this donor, across all types and campaigns.',
  avg_donation: 'The average monetary value per donation for this donor (total donated / donation count).',
  frequency_days: 'The average number of days between consecutive donations. Lower values indicate more frequent giving.',
  is_recurring: 'Whether the donor has committed to a recurring donation schedule (monthly, quarterly, etc.).',
  months_since_first: 'How many months have passed since this donor made their very first contribution. Indicates loyalty tenure.',
  campaign_count: 'The number of distinct fundraising campaigns this donor has participated in (e.g., Year-End Hope, GivingTuesday).',
  // Resident features
  age_at_admission: 'The girl\'s age when she was admitted to the safehouse program.',
  length_of_stay_days: 'Total number of days the resident has spent in the safehouse program from admission to present or discharge.',
  has_special_needs: 'Whether the resident has been diagnosed with developmental, mental health, or other special needs requiring additional support.',
  education_progress: 'Overall academic progress percentage (0\u2013100%) across enrolled education programs, based on monthly education records.',
  health_score: 'General health score on a 1\u20135 scale from monthly health and wellbeing assessments.',
  session_count: 'Total number of counseling sessions (process recordings) the resident has attended.',
  incident_count: 'Total number of safety or behavioral incidents reported during the resident\'s stay (behavioral, medical, security, etc.).',
  family_engagement: 'A measure of how involved the resident\'s family has been during care, based on home visitation cooperation levels and frequency.',
  emotional_progress: 'Change in observed emotional state between the start and end of counseling sessions over time, indicating therapeutic progress.',
  sleep_quality_score: 'Monthly sleep quality rating on a 1\u20135 scale from health and wellbeing assessments.',
  nutrition_score: 'Monthly nutrition quality rating on a 1\u20135 scale, reflecting dietary adequacy and meal regularity.',
  energy_level_score: 'Daytime energy rating on a 1\u20135 scale from monthly health assessments.',
  general_health_score: 'Overall health rating on a 1\u20135 scale, combining physical health indicators from monthly assessments.',
  attendance_rate: 'Rolling attendance rate (0\u2013100%) for education programs, showing how consistently the resident attends classes.',
  progress_percent: 'Overall education program completion percentage (0\u2013100%), tracking how far the resident has progressed through their curriculum.',
  // Incident risk features
  sub_cat_sexual_abuse: 'Whether the resident is a documented victim of sexual abuse. From the case sub-category flags on the resident\'s intake record.',
  sub_cat_trafficked: 'Whether the resident was identified as a trafficked child at intake.',
  sub_cat_osaec: 'Whether the resident is a victim of Online Sexual Abuse and Exploitation of Children (OSAEC/CSAEM).',
  sub_cat_physical_abuse: 'Whether the resident is a documented victim of physical abuse.',
  sub_cat_child_labor: 'Whether the resident was a victim of child labor.',
  sub_cat_at_risk: 'Whether the resident was classified as a Child at Risk (CAR) at intake.',
  sub_cat_orphaned: 'Whether the resident is orphaned.',
  sub_cat_street_child: 'Whether the resident was living in a street situation before admission.',
  sub_cat_cicl: 'Whether the resident is a Child in Conflict with the Law (CICL).',
  sub_cat_child_with_hiv: 'Whether the resident is living with HIV.',
  is_pwd: 'Whether the resident is a Person with Disability (PWD). From the intake assessment.',
  initial_risk_num: 'Numeric risk level at intake (1=Low, 2=Medium, 3=High, 4=Critical). Higher values indicate greater initial vulnerability.',
  trauma_severity_score: 'A composite score reflecting the severity and number of trauma types the resident has experienced.',
  family_vulnerability_score: 'A composite score reflecting family risk factors (solo parent, informal settler, indigenous group, PWD parent, 4Ps beneficiary).',
  case_category_Abandoned: 'Whether the resident\'s primary case category is "Abandoned" \u2014 child was left without parental care.',
  case_category_Foundling: 'Whether the resident\'s primary case category is "Foundling" \u2014 child was found without any known parents.',
  case_category_Surrendered: 'Whether the resident\'s primary case category is "Surrendered" \u2014 child was voluntarily given up by parents.',
  case_category_Neglected: 'Whether the resident\'s primary case category is "Neglected" \u2014 child suffered from parental neglect.',
  // Social media features
  // features_resident_story: self-explanatory, no tooltip needed
  has_call_to_action: 'Whether the post includes an explicit call to action (e.g., "Donate Now", "Learn More").',
  is_boosted: 'Whether paid promotion was used for this post.',
  boost_budget_php: 'Amount spent on paid promotion in Philippine pesos (PHP).',
  caption_length: 'Character count of the post caption. Longer captions may provide more context but risk lower engagement.',
  num_hashtags: 'Number of hashtags used in the post.',
  post_hour: 'Hour of the day the post was published (0\u201323). Affects visibility based on audience online patterns.',
};

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
  okrGoal: number;
}
interface AARCategory {
  category: string;
  serviceCount: number;
  beneficiaryCount: number;
  services: { service: string; count: number; beneficiaries: number }[];
}

// ── Tab config ───────────────────────────────────────────
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'donations', label: 'Donations' },
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'safehouses', label: 'Safehouses' },
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
  const [trends, setTrends] = useState<MonthRow[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeData | null>(null);
  const [aarCategories, setAarCategories] = useState<AARCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // OKR goal editing state
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, health, t, o, aar] = await Promise.all([
          apiFetch<SummaryData>('/api/impact/summary'),
          apiFetch<HealthRow[]>('/api/impact/health-trends'),
          apiFetch<MonthRow[]>('/api/impact/donations-by-month').catch(() => []),
          apiFetch<OutcomeData>('/api/admin/reports/resident-outcomes').catch(() => null),
          apiFetch<{ categories: AARCategory[]; totalBeneficiaries: number }>('/api/admin/reports/aar-summary').catch(() => null),
        ]);
        if (cancelled) return;
        setSummary(s);
        setTrends(t as MonthRow[]);
        setOutcomes(o);
        if (aar) setAarCategories(aar.categories);
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

  async function handleSaveGoal() {
    const parsed = parseInt(goalInput, 10);
    if (!parsed || parsed < 1) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/settings/okr-goal', {
        method: 'PUT',
        body: JSON.stringify({ goal: parsed }),
      });
      setSummary(prev => prev ? { ...prev, okrGoal: parsed } : prev);
      setEditingGoal(false);
    } catch { /* best effort */ }
    setSaving(false);
  }

  const recentTrends = trends.slice(-6).map(d => ({
    month: formatMonthLabel(d.year, d.month),
    total: Number(d.total),
  }));

  const barData = outcomes?.byType.map(d => ({ name: d.type, value: d.count })) ?? [];

  const CATEGORY_COLORS: Record<string, string> = {
    Caring: '#3498db',
    Healing: '#27ae60',
    Teaching: '#f39c12',
  };

  const goal = summary?.okrGoal ?? 1;
  const progress = summary ? Math.min(100, (summary.completedReintegrations / goal) * 100) : 0;

  return (
    <>
      {/* OKR Banner */}
      {summary && (
        <div className={styles.okrBanner}>
          <div className={styles.okrMain}>
            <div className={styles.okrHeadline}>
              <span className={styles.okrLabel}>Objective: Help girls reintegrate into society</span>
              <h2 className={styles.okrRate}>{summary.completedReintegrations}</h2>
              {editingGoal ? (
                <span className={styles.okrGoalEdit}>
                  <span>Goal:</span>
                  <input
                    type="number"
                    min="1"
                    className={styles.okrGoalInput}
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    autoFocus
                  />
                  <button className={styles.okrGoalSaveBtn} onClick={handleSaveGoal} disabled={saving}>Save</button>
                  <button className={styles.okrGoalCancelBtn} onClick={() => setEditingGoal(false)}>Cancel</button>
                </span>
              ) : (
                <span className={styles.okrTarget}>
                  Goal: {goal} this year
                  <button className={styles.okrGoalEditBtn} onClick={() => { setGoalInput(String(goal)); setEditingGoal(true); }}>
                    Update goal
                  </button>
                </span>
              )}
            </div>
            <div className={styles.okrProgress}>
              <div className={styles.okrBarTrack}>
                <div className={styles.okrBarFill} style={{ width: `${progress}%` }} />
              </div>
              <span className={styles.okrBarLabel}>{summary.completedReintegrations} of {goal} girls successfully reintegrated this year</span>
            </div>
          </div>
          <div className={styles.okrDetails}>
            <div className={styles.okrStat}>
              <span className={styles.okrStatValue}>{summary.activeResidents}</span>
              <span className={styles.okrStatLabel}>Currently in care</span>
            </div>
            <div className={styles.okrStat}>
              <span className={styles.okrStatValue}>{summary.totalResidents}</span>
              <span className={styles.okrStatLabel}>Total served</span>
            </div>
            <div className={styles.okrStat}>
              <span className={styles.okrStatValue}>{summary.activeSafehouses}</span>
              <span className={styles.okrStatLabel}>Active safehouses</span>
            </div>
          </div>
          <p className={styles.okrWhy}>
            This is our north-star metric. Every service we provide &mdash; counseling,
            education, medical care, and legal support &mdash; exists to reach one outcome: safely
            reintegrating each child into family, foster care, or independent living. Each number
            represents a girl whose life has been transformed.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          label="Total Residents Served"
          value={summary?.totalResidents.toLocaleString() ?? '--'}
          sub={`${summary?.activeResidents ?? 0} currently in care`}
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
          sub={`${summary?.completedReintegrations ?? 0} girls reintegrated this year`}
          loading={loading}
        />
        <KpiCard
          label="Avg Health Score"
          value={avgHealth !== null ? `${avgHealth.toFixed(1)} / 5` : '--'}
          sub="Latest monthly average"
          loading={loading}
        />
      </div>

      <div className={styles.chartsRow}>
        {/* Mini donation trend */}
        {recentTrends.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Donation Trend</h3>
            <p className={styles.chartSub}>Last 6 months</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={recentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#B0A99F" />
                <YAxis tick={{ fontSize: 10 }} stroke="#B0A99F" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip prefix="$" />} />
                <Line type="monotone" dataKey="total" stroke="#D4A853" strokeWidth={2.5} dot={{ r: 3, fill: '#D4A853' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Reintegration by type — horizontal bar chart */}
        {barData.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Reintegration by Type</h3>
            <p className={styles.chartSub}>All-time breakdown of how girls were reintegrated</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#B0A99F" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#B0A99F" width={120} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* AAR Category Cards — Caring, Healing, Teaching */}
      {aarCategories.length > 0 && (
        <>
          <div className={styles.chartCard} style={{ marginTop: '0.5rem', marginBottom: '1rem', padding: '1rem 1.5rem' }}>
            <h3 className={styles.chartTitle}>Annual Accomplishment Report — Services</h3>
            <p className={styles.chartSub}>
              Social welfare agencies track services in three categories aligned with a child&rsquo;s rehabilitation journey.
              These counts reflect intervention plans and services delivered to residents across all safehouses.
            </p>
          </div>
          <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {aarCategories.map(cat => {
              const color = CATEGORY_COLORS[cat.category] || '#8A8078';
              const desc: Record<string, string> = {
                Caring: 'Daily care services including shelter, meals, clothing, and safe living environment — the foundation of a child\u2019s recovery.',
                Healing: 'Counseling, psychosocial support, and therapeutic interventions that help residents process trauma and build resilience.',
                Teaching: 'Education programs, vocational training, and life skills development that prepare residents for reintegration and independent living.',
              };
              return (
                <div key={cat.category} className={styles.chartCard} style={{ borderLeft: `4px solid ${color}`, marginBottom: 0 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color, marginBottom: '0.25rem' }}>{cat.category}</div>
                  <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {desc[cat.category] ?? ''}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Services</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-strong)' }}>{cat.serviceCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Beneficiaries</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-strong)' }}>{cat.beneficiaryCount}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
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
        <p className={styles.chartSub}>Total contributions received each month, all time</p>
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
          <p className={styles.chartSub}>Where contributions come from</p>
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
          <p className={styles.chartSub}>Top 8 campaigns by total raised</p>
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
          apiFetch<OutcomeData>('/api/admin/reports/resident-outcomes').catch(() => null),
          apiFetch<EduRow[]>('/api/impact/education-trends').catch(() => []),
          apiFetch<HealthRow[]>('/api/impact/health-trends').catch(() => []),
        ]);
        if (cancelled) return;
        setOutcomes(o);
        setEdu(e as EduRow[]);
        setHealth(h as HealthRow[]);
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

  const barData = outcomes?.byType.map(d => ({ name: d.type, value: d.count })) ?? [];
  const healthData = health.map(d => ({
    month: formatMonthLabel(d.year, d.month),
    health: d.avgHealth,
    nutrition: d.avgNutrition,
    sleep: d.avgSleep,
    energy: d.avgEnergy,
  }));

  const latestEdu = edu.length > 0 ? edu[edu.length - 1] : null;
  const latestHealth = health.length > 0 ? health[health.length - 1] : null;
  const avgLosMonths = outcomes?.avgLengthOfStayDays ? Math.round(outcomes.avgLengthOfStayDays / 30) : null;

  return (
    <>
      {/* KPI Summary Cards */}
      <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KpiCard
          label="Reintegration Success Rate"
          value={`${outcomes?.successRate ?? 0}%`}
          sub="Percent of all residents who completed reintegration"
          loading={loading}
        />
        <KpiCard
          label="Avg Education Progress"
          value={`${latestEdu?.avgProgress ?? '-'}%`}
          sub="Mean curriculum completion across all enrolled residents (0–100%)"
          loading={loading}
        />
        <KpiCard
          label="Avg Attendance Rate"
          value={latestEdu ? `${Math.round(latestEdu.avgAttendance * 100)}%` : '-'}
          sub="How consistently residents attend their education classes (0–100%)"
          loading={loading}
        />
        <KpiCard
          label="Avg Health Score"
          value={`${latestHealth?.avgHealth ?? '-'} / 5`}
          sub="Overall physical health from monthly assessments (1–5 scale)"
          loading={loading}
        />
        <KpiCard
          label="Avg Length of Stay"
          value={`${avgLosMonths ?? '-'} mo`}
          sub="Average time in the program before case closure"
          loading={loading}
        />
      </div>

      {/* Reintegration by type — full width horizontal bar chart */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Reintegration by Type</h3>
        <p className={styles.chartSub}>How girls were placed after completing the program</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#B0A99F" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#B0A99F" width={120} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {barData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className={styles.legend}>
          {barData.map((d, i) => (
            <span key={d.name} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: COLORS[i % COLORS.length] }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      </div>

      {/* Health scores line */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Health Scores Over Time</h3>
        <p className={styles.chartSub}>Monthly averages for general health, nutrition, sleep quality, and energy levels</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={healthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#B0A99F" />
            <YAxis tick={{ fontSize: 11 }} stroke="#B0A99F" domain={[0, 6]} ticks={[0, 1, 2, 3, 4, 5]} label={{ value: 'Score (1\u20135)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#8A8078' } }} />
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

  // Compute occupancy from activeResidents / capacityGirls
  const tableData = data.map(s => {
    const pct = s.capacityGirls > 0 ? Math.round((s.activeResidents / s.capacityGirls) * 100) : 0;
    return { ...s, computedOccupancyPct: pct };
  });

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
                <th>Incidents</th>
                <th>Counseling Sessions <InfoTip text="Total process recording sessions conducted" /></th>
                <th>Avg Education <InfoTip text="Average education progress percentage across residents" /></th>
                <th>Avg Health Score <InfoTip text="Average general health score (1-5 scale)" /></th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(s => (
                <tr key={s.safehouseId}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-navy)' }}>{s.safehouseCode} {s.name}</td>
                  <td>{s.city}</td>
                  <td>
                    <span>{s.activeResidents}/{s.capacityGirls}</span>
                    <div className={styles.occupancyBar}>
                      <div
                        className={styles.occupancyFill}
                        style={{ width: `${Math.min(s.computedOccupancyPct, 100)}%`, background: '#D4A853' }}
                      />
                    </div>
                  </td>
                  <td>{s.incidents}</td>
                  <td>{s.recordings}</td>
                  <td>{s.avgEducation}%</td>
                  <td>{s.avgHealth}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / 5</span></td>
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
          <p className={styles.chartSub}>Current capacity utilization at each location</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tableData.map(s => ({ ...s, occupancyPct: s.computedOccupancyPct }))}>
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
          <p className={styles.chartSub}>Total reported incidents at each location</p>
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
            <p className={styles.chartSub}>Monthly incident counts over the last 6 months by location</p>
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

function FeatureName({ feature }: { feature: string }) {
  const label = FEATURE_LABELS[feature] || humanize(feature);
  const desc = FEATURE_DESCRIPTIONS[feature];
  return (
    <span style={{ flex: 1, color: 'var(--text-strong)', fontWeight: 500 }}>
      {label}{desc && <InfoTip text={desc} />}
    </span>
  );
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

  // Donor churn drivers — only statistically significant (p < 0.05)
  const donorPred = byModel('donor-churn-drivers')[0];
  const donorDrivers: { feature: string; odds_ratio: number; p_value: number }[] =
    (donorPred ? (JSON.parse(donorPred.metadata).top_drivers ?? []) : []).filter((d: { p_value: number }) => d.p_value < 0.05);

  // Incident risk drivers — only statistically significant (p < 0.05)
  const incidentPred = byModel('incident-risk-drivers')[0];
  const incidentMeta = incidentPred ? JSON.parse(incidentPred.metadata) : {};
  const selfharmDrivers: { feature: string; coefficient: number; odds_ratio: number; p_value: number }[] =
    (incidentMeta.selfharm_drivers ?? []).filter((d: { p_value: number }) => d.p_value < 0.05);
  const runawayDrivers: { feature: string; coefficient: number; odds_ratio: number; p_value: number }[] =
    (incidentMeta.runaway_drivers ?? []).filter((d: { p_value: number }) => d.p_value < 0.05);

  // Social media content
  const contentPred = byModel('social-media-content')[0];
  const contentFindings: { feature: string; effect: string; label?: string }[] =
    contentPred ? (JSON.parse(contentPred.metadata).top_findings ?? []) : [];

  // Social media timing - parse timing summary into best time per platform
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

  // Reuse the chartCard class for consistent styling with other tabs
  const cardClassName = styles.chartCard;

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

  return (
    <>
      {/* Section 1: Reintegration Drivers */}
      {reintDrivers.length > 0 && (
        <div className={cardClassName}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>What Drives Reintegration Success</h3>
          </div>
          <p className={styles.chartSub}>Factors that most influence whether a girl successfully reintegrates. Green arrows mean the factor helps; red arrows mean it hinders.</p>
          <div style={{ marginBottom: '1rem' }}>
            <ResponsiveContainer width="100%" height={Math.max(reintDrivers.length * 32, 120)}>
              <BarChart data={reintDrivers.slice(0, 8).map(d => ({ name: FEATURE_LABELS[d.feature] || humanize(d.feature), value: d.coefficient }))} layout="vertical" margin={{ left: 120, right: 20, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => typeof v === 'number' ? v.toFixed(3) : String(v)} />
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
              <FeatureName feature={d.feature} />
              <span style={{
                fontSize: '1rem',
                color: d.coefficient >= 0 ? '#2d6a4f' : '#c0392b',
                fontWeight: 700,
              }}>
                {d.coefficient >= 0 ? '\u2191' : '\u2193'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Section 2: Donor Retention Drivers */}
      {donorDrivers.length > 0 && (
        <div className={cardClassName}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>What Drives Donor Retention</h3>
          </div>
          <p className={styles.chartSub}>Factors that predict whether a donor will continue giving. Higher values mean a stronger effect on retention.</p>
          {donorDrivers.map((d, i) => (
            <div key={d.feature} style={rowStyle}>
              <span style={rankStyle}>{i + 1}</span>
              <FeatureName feature={d.feature} />
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: d.odds_ratio >= 1 ? '#2d6a4f' : '#c0392b',
              }}>
                {d.odds_ratio >= 1
                  ? `${d.odds_ratio.toFixed(1)}x more likely`
                  : `${d.odds_ratio.toFixed(1)}x less likely`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Section 3: Incident Risk Factors */}
      {(selfharmDrivers.length > 0 || runawayDrivers.length > 0) && (
        <div className={cardClassName}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Incident Risk Factors</h3>
          </div>
          <p className={styles.chartSub}>Conditions that increase or decrease the likelihood of incidents. Red values indicate higher risk; green indicates lower risk.</p>

          {selfharmDrivers.length > 0 && (
            <>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-strong)', margin: '0.75rem 0 0.5rem' }}>
                Self-Harm Risk Factors
              </h4>
              {selfharmDrivers.map((d, i) => (
                <div key={d.feature} style={rowStyle}>
                  <span style={rankStyle}>{i + 1}</span>
                  <FeatureName feature={d.feature} />
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: d.odds_ratio >= 1 ? '#c0392b' : '#2d6a4f',
                  }}>
                    {d.odds_ratio >= 1
                      ? `${d.odds_ratio.toFixed(1)}x more likely`
                      : `${d.odds_ratio.toFixed(1)}x less likely`}
                  </span>
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
                  <FeatureName feature={d.feature} />
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: d.odds_ratio >= 1 ? '#c0392b' : '#2d6a4f',
                  }}>
                    {d.odds_ratio >= 1
                      ? `${d.odds_ratio.toFixed(1)}x more likely`
                      : `${d.odds_ratio.toFixed(1)}x less likely`}
                  </span>
                    </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Section 4: Social Media Strategy */}
      {(contentFindings.length > 0 || platformBest.length > 0) && (
        <div className={cardClassName}>
          <div style={headerStyle}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Social Media Insights</h3>
          </div>
          <p className={styles.chartSub}>What to post and when to post it for maximum engagement.</p>

          {contentFindings.length > 0 && (
            <>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-strong)', margin: '0.5rem 0' }}>
                Content That Works
              </h4>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Each row shows how a content feature affects donation referrals. Positive values mean more referrals; negative means fewer.
              </p>
              {contentFindings.map((f, i) => {
                const effectNum = typeof f.effect === 'number' ? f.effect : parseFloat(String(f.effect));
                const isPositive = !isNaN(effectNum) && effectNum >= 0;
                const desc = FEATURE_DESCRIPTIONS[f.feature];
                return (
                  <div key={i} style={rowStyle}>
                    <span style={rankStyle}>{i + 1}</span>
                    <span style={{ flex: 1, color: 'var(--text-strong)', fontWeight: 500 }}>
                      {FEATURE_LABELS[f.feature] || humanize(f.feature)}
                      {desc && <InfoTip text={desc} />}
                    </span>
                    {!isNaN(effectNum) && (
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: isPositive ? '#2d6a4f' : '#c0392b',
                        whiteSpace: 'nowrap',
                      }}>
                        {isPositive ? '+' : ''}{effectNum.toFixed(1)} donation referrals
                      </span>
                    )}
                  </div>
                );
              })}
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
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'donations' && <DonationsTab />}
      {activeTab === 'outcomes' && <OutcomesTab />}
      {activeTab === 'safehouses' && <SafehousesTab />}
      {activeTab === 'ml' && <MlInsightsTab />}
    </div>
  );
}

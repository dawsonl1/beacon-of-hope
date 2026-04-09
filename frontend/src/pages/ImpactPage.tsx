import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { Heart, GraduationCap, Home, Stethoscope, ShieldCheck, Users } from 'lucide-react';
import { apiFetch } from '../api';
import type { ImpactSummary } from '../types';
import { ApiError } from '../components/ApiError';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import styles from './ImpactPage.module.css';

/* ── Animated counter ──────────────────────────────────────── */
function Counter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800;
          const steps = 60;
          const increment = end / steps;
          let current = 0;
          const interval = setInterval(() => {
            current += increment;
            if (current >= end) {
              setCount(end);
              clearInterval(interval);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

/* ── Impact cards data ─────────────────────────────────────── */
const IMPACT_CARDS = [
  {
    icon: Home,
    amount: '$500',
    description: 'One week of safe housing',
    detail: 'Provides shelter, meals, and around-the-clock care for one girl.',
    color: '#B8913A',
  },
  {
    icon: Stethoscope,
    amount: '$2,000',
    description: 'One month of counseling',
    detail: 'Trauma-informed therapy sessions to help a survivor begin to heal.',
    color: '#0f8f7d',
  },
  {
    icon: GraduationCap,
    amount: '$3,500',
    description: 'A full semester of education',
    detail: 'Tutoring, school supplies, and educational support for one resident.',
    color: '#5A6B7A',
  },
  {
    icon: ShieldCheck,
    amount: '$8,000',
    description: 'Full month of comprehensive care',
    detail: 'Everything one girl needs for a month: shelter, food, counseling, education, and medical care.',
    color: '#C4756E',
  },
];

/* ── Impact Page ───────────────────────────────────────── */

export default function ImpactPage() {
  useDocumentTitle('Our Impact');
  const heroRef = useReveal();
  const impactRef = useReveal();
  const storiesRef = useReveal();
  const ctaRef = useReveal();

  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [goalData, setGoalData] = useState<{ raised: number; goal: number; donorCount: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<ImpactSummary>('/api/impact/summary')
      .then(setSummary)
      .catch(e => { console.error('API fetch failed', e); setError(true); });

    apiFetch<{ raised: number; goal: number; donorCount: number }>('/api/donate/monthly-progress')
      .then(setGoalData)
      .catch(() => {});
  }, []);

  return (
    <main className={styles.page}>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroOverlay} />
        <div className={`${styles.heroInner} reveal`}>
          <p className={styles.heroLabel}>Our Impact</p>
          <h1 className={styles.heroHeadline}>
            Every number represents<br />a life transformed
          </h1>
          <p className={styles.heroSub}>
            Since our founding, Beacon of Hope has provided safe shelter,
            counseling, education, and a path to reintegration for girls
            across Guam who are survivors of abuse and trafficking.
          </p>
          {error && <ApiError />}
          {summary && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>
                  <Counter end={summary.totalResidents} />
                </span>
                <span className={styles.statLabel}>Girls served</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>
                  <Counter end={summary.completedReintegrations} />
                </span>
                <span className={styles.statLabel}>Successfully reintegrated</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>
                  <Counter end={summary.activeSafehouses} />
                </span>
                <span className={styles.statLabel}>Active safehouses</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>
                  <Counter end={summary.activeResidents} />
                </span>
                <span className={styles.statLabel}>Currently in care</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Monthly Goal ────────────────────────────────────── */}
      {goalData && (
        <section className={styles.goalSection}>
          <div className={styles.goalInner}>
            <h2 className={styles.goalHeadline}>Help us reach our monthly goal</h2>
            <p className={styles.goalSub}>
              We need ${goalData.goal.toLocaleString()} each month to keep our safehouses
              running and our programs funded. Here's where we are this month.
            </p>
            <div className={styles.goalCard}>
              <div className={styles.goalHeader}>
                <span className={styles.goalTitle}>This month's progress</span>
                <span className={styles.goalNumbers}>
                  ${Math.round(goalData.raised).toLocaleString()} of ${goalData.goal.toLocaleString()}
                </span>
              </div>
              <div
                className={styles.goalBar}
                role="progressbar"
                aria-valuenow={Math.round(goalData.raised)}
                aria-valuemin={0}
                aria-valuemax={goalData.goal}
                aria-label={`${Math.round((goalData.raised / goalData.goal) * 100)}% of monthly goal reached`}
              >
                <div
                  className={styles.goalFill}
                  style={{ width: `${Math.min(100, (goalData.raised / goalData.goal) * 100)}%` }}
                />
              </div>
              <div className={styles.goalFooter}>
                <span className={styles.goalPct}>
                  {Math.round((goalData.raised / goalData.goal) * 100)}% funded
                </span>
                <span className={styles.goalDonors}>
                  <Users size={14} aria-hidden="true" />
                  {goalData.donorCount} donor{goalData.donorCount !== 1 ? 's' : ''} this month
                </span>
              </div>
            </div>
            <Link to="/donate" className={styles.goalCta}>
              <Heart size={16} aria-hidden="true" />
              Help Us Get There
            </Link>
          </div>
        </section>
      )}

      {/* ── What Your Donation Provides ───────────────────── */}
      <section className={styles.impactSection} ref={impactRef}>
        <div className={`${styles.impactInner} reveal`}>
          <h2 className={styles.sectionTitle}>What your donation provides</h2>
          <p className={styles.sectionSub}>
            Every dollar goes directly toward the care, education, and healing
            of girls in our safehouses. Here's what your generosity makes possible.
          </p>
          <div className={styles.impactGrid}>
            {IMPACT_CARDS.map((card) => (
              <div key={card.amount} className={styles.impactCard}>
                <div className={styles.impactIconWrap} style={{ background: card.color }} aria-hidden="true">
                  <card.icon size={22} color="#fff" />
                </div>
                <span className={styles.impactAmount}>{card.amount}</span>
                <span className={styles.impactDesc}>{card.description}</span>
                <p className={styles.impactDetail}>{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stories of Hope ─────────────────────────────────── */}
      <section className={styles.stories} ref={storiesRef}>
        <div className={`${styles.storiesInner} reveal`}>
          <h2 className={styles.sectionTitle}>Stories of hope</h2>
          <p className={styles.sectionSub}>
            Behind every statistic is a real person whose life has been changed.
          </p>

          {/* Story 1 */}
          <div className={styles.storyRow}>
            <div className={styles.storyImage}>
              <div className={styles.storyPlaceholder} role="img" aria-label="A girl studying at a desk">
                <GraduationCap size={48} strokeWidth={1.2} aria-hidden="true" />
                <span>Photo coming soon</span>
              </div>
            </div>
            <div className={styles.storyContent}>
              <span className={styles.storyTag}>Education</span>
              <h3 className={styles.storyTitle}>A future she never imagined</h3>
              <p className={styles.storyBody}>
                A 15-year-old arrived at our safehouse with no formal schooling and
                little hope for the future. After 18 months in our education program,
                she completed her elementary equivalency, discovered a passion for
                science, and now dreams of becoming a nurse.
              </p>
              <blockquote className={styles.storyQuote}>
                &ldquo;For the first time, I believe my life can be different.&rdquo;
              </blockquote>
              <p className={styles.storyNote}>
                Names and details changed to protect privacy.
              </p>
            </div>
          </div>

          {/* Story 2 */}
          <div className={`${styles.storyRow} ${styles.storyRowReverse}`}>
            <div className={styles.storyImage}>
              <div className={`${styles.storyPlaceholder} ${styles.storyPlaceholderWarm}`} role="img" aria-label="A family embracing">
                <Heart size={48} strokeWidth={1.2} aria-hidden="true" />
                <span>Photo coming soon</span>
              </div>
            </div>
            <div className={styles.storyContent}>
              <span className={styles.storyTag}>Reintegration</span>
              <h3 className={styles.storyTitle}>Coming home again</h3>
              <p className={styles.storyBody}>
                After two years of counseling, health services, and guided family
                visits, a young survivor was successfully reunified with her family.
                Her risk level dropped from Critical to Low, and she continues to
                receive post-placement monitoring from our social workers.
              </p>
              <blockquote className={styles.storyQuote}>
                &ldquo;I finally feel like I have a home again.&rdquo;
              </blockquote>
              <p className={styles.storyNote}>
                Names and details changed to protect privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────── */}
      <section className={styles.bottomCta} ref={ctaRef}>
        <div className={`${styles.ctaInner} reveal`}>
          <h2 className={styles.ctaTitle}>
            Help us reach more girls who need a safe place to heal.
          </h2>
          <p className={styles.ctaSub}>
            Your donation directly funds shelter, education, counseling,
            and reintegration services.
          </p>
          <Link to="/donate" className={styles.ctaButton}>
            <Heart size={16} aria-hidden="true" />
            Donate Now
          </Link>
        </div>
      </section>
    </main>
  );
}

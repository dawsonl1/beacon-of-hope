import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { Heart } from 'lucide-react';
import { apiFetch } from '../api';
import type { ImpactSummary } from '../types';
import { ApiError } from '../components/ApiError';
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

/* ── Impact Page ───────────────────────────────────────── */

export default function ImpactPage() {
  const heroRef = useReveal();
  const allocationRef = useReveal();
  const storiesRef = useReveal();
  const ctaRef = useReveal();

  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [allocationData, setAllocationData] = useState<Array<{ area: string; amount: number }>>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<ImpactSummary>('/api/impact/summary')
      .then(setSummary)
      .catch(e => { console.error('API fetch failed', e); setError(true); });

    apiFetch<Array<{ area: string; amount: number }>>('/api/impact/allocations-by-program')
      .then(data => setAllocationData(data.map(d => ({ area: d.area, amount: Math.round(Number(d.amount)) }))))
      .catch(e => { console.error('API fetch failed', e); setError(true); });
  }, []);

  const allocationTotal = allocationData.reduce((sum, d) => sum + d.amount, 0);

  const allocationColors = [
    '#B8913A', '#7A9E7E', '#C4756E', '#5A6B7A',
    '#D4A853', '#E8C97A', '#2A3A4E', '#D4CFC8',
  ];

  return (
    <main className={styles.page}>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className={styles.hero} ref={heroRef}>
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

      {/* ── Where Your Money Goes ─────────────────────────── */}
      <section className={styles.allocationSection} ref={allocationRef}>
        <div className={`${styles.allocationInner} reveal`}>
          <h2 className={styles.sectionTitle}>Where your donations go</h2>
          <p className={styles.sectionSub}>
            Every dollar is carefully allocated to the programs that
            directly support our residents' healing and growth.
          </p>
          {allocationData.length > 0 && (
            <div className={styles.allocationList}>
              {allocationData.map((item, i) => {
                const pct = allocationTotal > 0
                  ? Math.round((item.amount / allocationTotal) * 100)
                  : 0;
                return (
                  <div key={item.area} className={styles.allocationRow}>
                    <div className={styles.allocationMeta}>
                      <span
                        className={styles.allocationDot}
                        style={{ background: allocationColors[i % allocationColors.length] }}
                      />
                      <span className={styles.allocationName}>{item.area}</span>
                      <span className={styles.allocationPct}>{pct}%</span>
                    </div>
                    <div className={styles.allocationBar}>
                      <div
                        className={styles.allocationFill}
                        style={{
                          width: `${pct}%`,
                          background: allocationColors[i % allocationColors.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className={styles.allocationTotal}>
                ${(allocationTotal / 1000).toFixed(0)}k total allocated across all programs
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Stories of Hope ─────────────────────────────────── */}
      <section className={styles.stories} ref={storiesRef}>
        <div className={`${styles.storiesInner} reveal`}>
          <h2 className={styles.sectionTitle}>Stories of hope</h2>
          <p className={styles.sectionSub}>
            Behind every statistic is a real person whose life has been changed.
            Here are two of their stories.
          </p>

          <div className={styles.storyGrid}>
            {/* Story 1 */}
            <div className={styles.storyCard}>
              <span className={styles.storyTag}>Education</span>
              <p className={styles.storyBody}>
                A 15-year-old arrived at our safehouse with no formal schooling and
                little hope for the future. After 18 months in our education program,
                she completed her elementary equivalency, discovered a passion for
                science, and now dreams of becoming a nurse.
              </p>
              <blockquote className={styles.storyQuote}>
                "For the first time, I believe my life can be different."
              </blockquote>
              <p className={styles.storyNote}>
                Names and details changed to protect privacy.
              </p>
            </div>

            {/* Story 2 */}
            <div className={styles.storyCard}>
              <span className={styles.storyTag}>Reintegration</span>
              <p className={styles.storyBody}>
                After two years of counseling, health services, and guided family
                visits, a young survivor was successfully reunified with her family.
                Her risk level dropped from Critical to Low, and she continues to
                receive post-placement monitoring from our social workers.
              </p>
              <blockquote className={styles.storyQuote}>
                "I finally feel like I have a home again."
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
            <Heart size={16} />
            Donate Now
          </Link>
        </div>
      </section>
    </main>
  );
}

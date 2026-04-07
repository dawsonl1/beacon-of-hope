import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import type { ImpactSummary } from '../types';
import { ApiError } from '../components/ApiError';
import {
  Heart,
  Shield,
  GraduationCap,
  Home,
  HandHeart,
  Users,
  Megaphone,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import styles from './HomePage.module.css';

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

/* ── Home Page ─────────────────────────────────────────────── */
export default function HomePage() {
  const impactRef = useReveal();
  const missionRef = useReveal();
  const storyRef = useReveal();
  const involvedRef = useReveal();
  const donateRef = useReveal();

  const [impact, setImpact] = useState<ImpactSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<ImpactSummary>('/api/impact/summary')
      .then(setImpact)
      .catch((e) => { console.error('Failed to fetch impact summary', e); setError(true); });
  }, []);

  return (
    <main>
      {/* ── Hero ────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.heroLabel}>Beacon of Hope Foundation</p>
          <h1 className={styles.heroHeadline}>
            Restoring hope,<br />
            <em>one child at a time</em>
          </h1>
          <p className={styles.heroSub}>
            We operate safe homes in Guam for girls who are survivors
            of sexual abuse and trafficking — providing shelter, healing, education,
            and a path to a new life.
          </p>
          <div className={styles.heroCtas}>
            <a href="https://www.paypal.com/donate" target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
              <Heart size={16} />
              Donate Now
            </a>
            <a href="#impact" className={styles.btnSecondary}>
              See Our Impact
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <a href="#impact" className={styles.scrollHint} aria-label="Scroll to learn more">
          <ChevronDown size={20} />
        </a>
      </section>

      {/* ── Impact Stats ────────────────────────────────── */}
      <section id="impact" className={styles.impact} ref={impactRef}>
        <div className={`${styles.impactInner} reveal`}>
          <div className={styles.impactLabel}>
            <span className={styles.impactDot} />
            Our Impact
          </div>
          {error && <ApiError />}
          {impact && (
            <div className={`${styles.impactGrid} reveal-stagger`}>
              <div className={`${styles.statCard} reveal`}>
                <span className={styles.statNumber}>
                  <Counter end={impact.totalResidents} />
                </span>
                <span className={styles.statDesc}>Girls served since founding</span>
              </div>
              <div className={`${styles.statCard} reveal`}>
                <span className={styles.statNumber}>
                  <Counter end={impact.reintegrationRate} suffix="%" />
                </span>
                <span className={styles.statDesc}>Successfully reintegrated</span>
              </div>
              <div className={`${styles.statCard} reveal`}>
                <span className={styles.statNumber}>
                  <Counter end={Math.round(impact.totalDonations / 1000)} prefix="$" suffix="K" />
                </span>
                <span className={styles.statDesc}>Donations received</span>
              </div>
              <div className={`${styles.statCard} reveal`}>
                <span className={styles.statNumber}>
                  <Counter end={impact.activeSafehouses} />
                </span>
                <span className={styles.statDesc}>Active safehouses</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Mission / How it Works ──────────────────────── */}
      <section id="mission" className={styles.mission} ref={missionRef}>
        <div className={`${styles.missionInner} reveal`}>
          <h2 className={styles.sectionTitle}>Our Mission</h2>
          <p className={styles.missionText}>
            Beacon of Hope contracts with in-country individuals and organizations across
            Guam to provide safehouses and comprehensive rehabilitation services.
            Every girl who enters our care receives a personalized path toward healing
            and independence.
          </p>

          <div className={`${styles.processGrid} reveal-stagger`}>
            <div className={`${styles.processCard} reveal`}>
              <div className={styles.processIcon}>
                <Shield size={24} />
              </div>
              <div className={styles.processStep}>01</div>
              <h3 className={styles.processTitle}>Rescue & Referral</h3>
              <p className={styles.processDesc}>
                Girls are referred through government agencies, NGOs, and court orders
                into our care.
              </p>
            </div>
            <div className={`${styles.processCard} reveal`}>
              <div className={styles.processIcon}>
                <Home size={24} />
              </div>
              <div className={styles.processStep}>02</div>
              <h3 className={styles.processTitle}>Safe Housing</h3>
              <p className={styles.processDesc}>
                Placed in one of our safehouses across Guam
                with around-the-clock care.
              </p>
            </div>
            <div className={`${styles.processCard} reveal`}>
              <div className={styles.processIcon}>
                <GraduationCap size={24} />
              </div>
              <div className={styles.processStep}>03</div>
              <h3 className={styles.processTitle}>Rehabilitation</h3>
              <p className={styles.processDesc}>
                Counseling, education, health services, and personalized intervention
                plans for every resident.
              </p>
            </div>
            <div className={`${styles.processCard} reveal`}>
              <div className={styles.processIcon}>
                <HandHeart size={24} />
              </div>
              <div className={styles.processStep}>04</div>
              <h3 className={styles.processTitle}>Reintegration</h3>
              <p className={styles.processDesc}>
                Prepared for family reunification, foster care, or independent living
                when they are ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ─────────────────────────────────── */}
      <section className={styles.testimonial} ref={storyRef}>
        <div className={`${styles.testimonialInner} reveal`}>
          <blockquote className={styles.quote}>
            <p>
              &ldquo;I never thought I could have a future.
              <br />
              Beacon of Hope gave me one.&rdquo;
            </p>
          </blockquote>
          <div className={styles.quoteAttr}>
            <div className={styles.quoteAvatar} aria-hidden="true" />
            <div>
              <p className={styles.quoteName}>A Beacon of Hope graduate</p>
              <p className={styles.quoteDetail}>
                Successfully reintegrated after 2 years in our program
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Get Involved ────────────────────────────────── */}
      <section id="involved" className={styles.involved} ref={involvedRef}>
        <div className={`${styles.involvedInner} reveal`}>
          <h2 className={styles.sectionTitle}>Get Involved</h2>
          <p className={styles.involvedSub}>
            Every act of generosity — no matter the form — helps a girl heal,
            learn, and build a future she deserves.
          </p>

          <div className={`${styles.involvedGrid} reveal-stagger`}>
            <a href="https://www.paypal.com/donate" target="_blank" rel="noopener noreferrer" className={`${styles.involvedCard} reveal`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Heart size={28} className={styles.involvedIcon} />
              <h3>Donate</h3>
              <p>Your financial support funds shelter, education, counseling, and care.</p>
            </a>
            <div className={`${styles.involvedCard} reveal`}>
              <Users size={28} className={styles.involvedIcon} />
              <h3>Volunteer</h3>
              <p>Give your time and skills to help our team on the ground.</p>
            </div>
            <Link to="/login" className={`${styles.involvedCard} reveal`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <HandHeart size={28} className={styles.involvedIcon} />
              <h3>Partner</h3>
              <p>Bring your church, company, or community alongside our mission.</p>
            </Link>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={`${styles.involvedCard} reveal`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Megaphone size={28} className={styles.involvedIcon} />
              <h3>Advocate</h3>
              <p>Amplify our voice on social media and raise awareness.</p>
            </a>
          </div>
        </div>
      </section>

      {/* ── Donation CTA ────────────────────────────────── */}
      <section className={styles.donateCta} ref={donateRef}>
        <div className={`${styles.donateInner} reveal`}>
          <h2 className={styles.donateTitle}>Your donation changes a life</h2>
          <div className={styles.donateAmounts}>
            <div className={styles.donateCard}>
              <span className={styles.donateAmount}>$500</span>
              <span className={styles.donateDesc}>One week of education supplies</span>
            </div>
            <div className={styles.donateCard}>
              <span className={styles.donateAmount}>$2,000</span>
              <span className={styles.donateDesc}>One month of counseling sessions</span>
            </div>
            <div className={styles.donateCard}>
              <span className={styles.donateAmount}>$8,000</span>
              <span className={styles.donateDesc}>Full month of care for one girl</span>
            </div>
          </div>
          <a href="https://www.paypal.com/donate" target="_blank" rel="noopener noreferrer" className={styles.btnPrimary} style={{ marginTop: '1.5rem' }}>
            <Heart size={16} />
            Give Today
          </a>
        </div>
      </section>
    </main>
  );
}

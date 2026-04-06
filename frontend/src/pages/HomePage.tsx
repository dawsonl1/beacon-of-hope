import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../api';
import type { ImpactSummary } from '../types';
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

  useEffect(() => {
    apiFetch<ImpactSummary>('/api/impact/summary')
      .then(setImpact)
      .catch((e) => { console.error('Failed to fetch impact summary', e); setImpact({ totalResidents: 247, activeSafehouses: 9, totalDonations: 4200000, reintegrationRate: 68 }); });
  }, []);

  const residents = impact?.totalResidents ?? 247;
  const safehouses = impact?.activeSafehouses ?? 9;
  const donations = impact ? Math.round(impact.totalDonations / 1000000) : 4;
  const reintRate = impact?.reintegrationRate ?? 68;

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
            We operate safe homes in the Philippines for girls who are survivors
            of sexual abuse and trafficking — providing shelter, healing, education,
            and a path to a new life.
          </p>
          <div className={styles.heroCtas}>
            <a href="#involved" className={styles.btnPrimary}>
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
          <div className={`${styles.impactGrid} reveal-stagger`}>
            <div className={`${styles.statCard} reveal`}>
              <span className={styles.statNumber}>
                <Counter end={residents} />
              </span>
              <span className={styles.statDesc}>Girls served since founding</span>
            </div>
            <div className={`${styles.statCard} reveal`}>
              <span className={styles.statNumber}>
                <Counter end={reintRate} suffix="%" />
              </span>
              <span className={styles.statDesc}>Successfully reintegrated</span>
            </div>
            <div className={`${styles.statCard} reveal`}>
              <span className={styles.statNumber}>
                <Counter end={donations} prefix="&#8369;" suffix="M" />
              </span>
              <span className={styles.statDesc}>Donations received</span>
            </div>
            <div className={`${styles.statCard} reveal`}>
              <span className={styles.statNumber}>
                <Counter end={safehouses} />
              </span>
              <span className={styles.statDesc}>Active safehouses</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission / How it Works ──────────────────────── */}
      <section id="mission" className={styles.mission} ref={missionRef}>
        <div className={`${styles.missionInner} reveal`}>
          <h2 className={styles.sectionTitle}>Our Mission</h2>
          <p className={styles.missionText}>
            Beacon of Hope contracts with in-country individuals and organizations across
            the Philippines to provide safehouses and comprehensive rehabilitation services.
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
                Placed in one of our safehouses across Luzon, Visayas, and Mindanao
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
            <div className={`${styles.involvedCard} reveal`}>
              <Heart size={28} className={styles.involvedIcon} />
              <h3>Donate</h3>
              <p>Your financial support funds shelter, education, counseling, and care.</p>
            </div>
            <div className={`${styles.involvedCard} reveal`}>
              <Users size={28} className={styles.involvedIcon} />
              <h3>Volunteer</h3>
              <p>Give your time and skills to help our team on the ground.</p>
            </div>
            <div className={`${styles.involvedCard} reveal`}>
              <HandHeart size={28} className={styles.involvedIcon} />
              <h3>Partner</h3>
              <p>Bring your church, company, or community alongside our mission.</p>
            </div>
            <div className={`${styles.involvedCard} reveal`}>
              <Megaphone size={28} className={styles.involvedIcon} />
              <h3>Advocate</h3>
              <p>Amplify our voice on social media and raise awareness.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Donation CTA ────────────────────────────────── */}
      <section className={styles.donateCta} ref={donateRef}>
        <div className={`${styles.donateInner} reveal`}>
          <h2 className={styles.donateTitle}>Your donation changes a life</h2>
          <div className={styles.donateAmounts}>
            <div className={styles.donateCard}>
              <span className={styles.donateAmount}>&#8369;500</span>
              <span className={styles.donateDesc}>One week of education supplies</span>
            </div>
            <div className={styles.donateCard}>
              <span className={styles.donateAmount}>&#8369;2,000</span>
              <span className={styles.donateDesc}>One month of counseling sessions</span>
            </div>
            <div className={styles.donateCard}>
              <span className={styles.donateAmount}>&#8369;8,000</span>
              <span className={styles.donateDesc}>Full month of care for one girl</span>
            </div>
          </div>
          <a href="#" className={styles.btnPrimary} style={{ marginTop: '1.5rem' }}>
            <Heart size={16} />
            Give Today
          </a>
        </div>
      </section>
    </main>
  );
}

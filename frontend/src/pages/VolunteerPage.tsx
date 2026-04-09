import { useState, useEffect, type FormEvent } from 'react';
import { Users, CheckCircle } from 'lucide-react';
import { apiFetch } from '../api';
import Dropdown from '../components/admin/Dropdown';
import styles from './VolunteerPage.module.css';

const GUAM_REGIONS = [
  'Agana Heights',
  'Agat',
  'Asan-Maina',
  'Barrigada',
  'Chalan Pago-Ordot',
  'Dededo',
  'Hagatna',
  'Inarajan',
  'Mangilao',
  'Merizo',
  'Mongmong-Toto-Maite',
  'Piti',
  'Santa Rita',
  'Sinajana',
  'Talofofo',
  'Tamuning',
  'Umatac',
  'Yigo',
  'Yona',
];

export default function VolunteerPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!region) {
      setError('Please select your region.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/volunteer', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, region }),
      });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <h1 className={styles.title}>Thank You!</h1>
            <p className={styles.subtitle}>
              We've received your information and will be in touch soon.
            </p>
          </div>
        </section>
        <section className={styles.formSection}>
          <div className={styles.successCard}>
            <CheckCircle size={48} className={styles.successIcon} />
            <h2 className={styles.successTitle}>You're on the list</h2>
            <p className={styles.successText}>
              Our team will reach out when volunteer opportunities are available in your area.
              In the meantime, consider signing up for our{' '}
              <a href="/newsletter" className={styles.link}>newsletter</a>{' '}
              to stay up to date on our work.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Volunteer With Us</h1>
          <p className={styles.subtitle}>
            Give your time and skills to help girls heal, learn, and build a future
            they deserve. Share your contact info and we'll reach out with opportunities.
          </p>
        </div>
      </section>

      <section className={styles.formSection}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.cardHeader}>
            <Users size={24} className={styles.cardIcon} />
            <h2 className={styles.cardTitle}>Volunteer Interest Form</h2>
          </div>

          <div className={styles.nameRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                className={styles.input}
                placeholder="Jane"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                className={styles.input}
                placeholder="Doe"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Region</label>
            <Dropdown
              value={region}
              placeholder="Select your region..."
              options={[
                ...GUAM_REGIONS.map(r => ({ value: r, label: r })),
                { value: 'Outside Guam', label: 'Outside Guam' },
              ]}
              onChange={v => setRegion(v)}
            />
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit My Interest'}
          </button>

          <p className={styles.privacy}>
            We'll only use your information to contact you about volunteer opportunities.
          </p>
        </form>
      </section>
    </main>
  );
}

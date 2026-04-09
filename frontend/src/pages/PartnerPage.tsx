import { useState, useEffect, type FormEvent } from 'react';
import { HandHeart, CheckCircle } from 'lucide-react';
import { apiFetch } from '../api';
import Dropdown from '../components/admin/Dropdown';
import styles from './PartnerPage.module.css';

const PARTNER_TYPES = ['Organization', 'Individual'] as const;
const ROLE_OPTIONS = [
  { value: '', label: 'Select an area of interest...' },
  { value: 'SafehouseOps', label: 'Safehouse Operations' },
  { value: 'Education', label: 'Education Services' },
  { value: 'Evaluation', label: 'Assessments & Evaluations' },
  { value: 'Logistics', label: 'Logistics & Supplies' },
  { value: 'Maintenance', label: 'Facility Maintenance' },
  { value: 'FindSafehouse', label: 'Locating New Safehouses' },
  { value: 'Transport', label: 'Transportation' },
  { value: 'Other', label: 'Other' },
];

export default function PartnerPage() {
  const [partnerType, setPartnerType] = useState<string>('Organization');
  const [partnerName, setPartnerName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleType, setRoleType] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (partnerType === 'Organization' && !partnerName.trim()) {
      setError('Please enter your organization name.');
      return;
    }
    if (!contactName.trim()) {
      setError('Please enter a contact name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/partner', {
        method: 'POST',
        body: JSON.stringify({
          partnerType,
          partnerName: partnerType === 'Organization' ? partnerName : contactName,
          contactName,
          email,
          phone: phone || undefined,
          roleType: roleType || undefined,
          notes: notes || undefined,
        }),
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
              We appreciate your interest in partnering with Beacon of Hope.
            </p>
          </div>
        </section>
        <section className={styles.formSection}>
          <div className={styles.successCard}>
            <CheckCircle size={48} className={styles.successIcon} />
            <h2 className={styles.successTitle}>We'll be in touch</h2>
            <p className={styles.successText}>
              A member of our team will reach out to discuss how we can work together.
              In the meantime, learn more about our{' '}
              <a href="/#mission" className={styles.link}>mission</a>{' '}
              and the impact your partnership can make.
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
          <h1 className={styles.title}>Partner With Us</h1>
          <p className={styles.subtitle}>
            Bring your church, company, or community alongside our mission.
            We work with organizations and individuals to provide safehouse operations,
            education, logistics, and more for survivors in Guam.
          </p>
        </div>
      </section>

      <section className={styles.formSection}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.cardHeader}>
            <HandHeart size={24} className={styles.cardIcon} />
            <h2 className={styles.cardTitle}>Partnership Interest Form</h2>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>I am a...</label>
            <div className={styles.typeToggle}>
              {PARTNER_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.typeBtn} ${partnerType === t ? styles.typeBtnActive : ''}`}
                  onClick={() => setPartnerType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {partnerType === 'Organization' && (
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="partnerName">Organization Name</label>
              <input
                id="partnerName"
                type="text"
                className={styles.input}
                placeholder="Beacon Community Church"
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="contactName">Contact Name</label>
            <input
              id="contactName"
              type="text"
              className={styles.input}
              placeholder="Jane Doe"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              required
            />
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
            <label className={styles.label} htmlFor="phone">Phone (optional)</label>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              placeholder="+1 (671) 555-0100"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Area of Interest (optional)</label>
            <Dropdown
              value={roleType}
              placeholder="Select an area of interest..."
              options={ROLE_OPTIONS.filter(r => r.value !== '').map(r => ({ value: r.value, label: r.label }))}
              onChange={v => setRoleType(v)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="notes">Anything else? (optional)</label>
            <textarea
              id="notes"
              className={styles.textarea}
              placeholder="Tell us about your organization and how you'd like to partner..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Partnership Interest'}
          </button>

          <p className={styles.privacy}>
            We'll only use your information to contact you about partnership opportunities.
          </p>
        </form>
      </section>
    </main>
  );
}

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { apiFetch } from '../api';
import styles from './DonatePage.module.css';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

type Mode = 'one-time' | 'recurring';
type Cadence = 'monthly' | 'quarterly' | 'yearly';

export default function DonatePage() {
  const [mode, setMode] = useState<Mode>('one-time');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amountCents = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : selectedAmount
      ? selectedAmount * 100
      : 0;

  const handleSubmit = async () => {
    if (amountCents < 100) {
      setError('Please enter an amount of at least $1.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        mode,
        cadence: mode === 'recurring' ? cadence : undefined,
        amountCents,
        donorEmail: donorEmail || undefined,
      };
      const { url } = await apiFetch<{ url: string }>('/api/donate/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      window.location.href = url;
    } catch (e: unknown) {
      setError('Unable to process your donation right now. Please try again later.');
      setLoading(false);
    }
  };

  const cadenceLabel = cadence === 'monthly' ? '/mo' : cadence === 'quarterly' ? '/qtr' : '/yr';
  const displayAmount = customAmount
    ? parseFloat(customAmount) || 0
    : selectedAmount ?? 0;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Make a Difference Today</h1>
          <p className={styles.subtitle}>
            Your donation helps provide safe shelter, education, counseling, and a path to
            reintegration for survivors of abuse and trafficking in Guam.
          </p>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.card}>
          {/* Mode toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${mode === 'one-time' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('one-time')}
            >
              One-Time
            </button>
            <button
              className={`${styles.modeBtn} ${mode === 'recurring' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('recurring')}
            >
              Auto-Recurring
            </button>
          </div>

          {/* Cadence selector (recurring only) */}
          {mode === 'recurring' && (
            <div className={styles.cadenceRow}>
              {(['monthly', 'quarterly', 'yearly'] as Cadence[]).map(c => (
                <button
                  key={c}
                  className={`${styles.cadenceBtn} ${cadence === c ? styles.cadenceBtnActive : ''}`}
                  onClick={() => setCadence(c)}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Amount presets */}
          <div className={styles.amountGrid}>
            {PRESET_AMOUNTS.map(amt => (
              <button
                key={amt}
                className={`${styles.amountBtn} ${selectedAmount === amt && !customAmount ? styles.amountBtnActive : ''}`}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
              >
                ${amt.toLocaleString()}
              </button>
            ))}
            <div className={styles.customAmountWrap}>
              <span className={styles.currencyPrefix}>$</span>
              <input
                type="number"
                className={styles.customInput}
                placeholder="Other"
                value={customAmount}
                min="1"
                onChange={e => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
              />
            </div>
          </div>

          {/* Email (optional) */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="donorEmail">Email (optional, for receipt)</label>
            <input
              id="donorEmail"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={donorEmail}
              onChange={e => setDonorEmail(e.target.value)}
            />
          </div>

          {/* Newsletter opt-in */}
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={newsletter}
              onChange={e => setNewsletter(e.target.checked)}
            />
            <span>Sign me up for the monthly newsletter with impact updates</span>
          </label>

          {/* Post-donation info */}
          <p className={styles.infoNote}>
            After donating, you'll receive an email with login credentials so you can
            track your impact and manage your giving in your personal donor portal.
          </p>

          {/* Summary */}
          <div className={styles.summary}>
            <span className={styles.summaryAmount}>
              ${displayAmount.toLocaleString()}
              {mode === 'recurring' && <span className={styles.summaryFreq}>{cadenceLabel}</span>}
            </span>
            <span className={styles.summaryLabel}>
              {mode === 'one-time' ? 'One-time donation' : `Recurring ${cadence} donation`}
            </span>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button
            className={styles.donateBtn}
            onClick={handleSubmit}
            disabled={loading || amountCents < 100}
          >
            {loading ? 'Redirecting to payment...' : (
              <>
                <Heart size={18} />
                Donate ${displayAmount.toLocaleString()}{mode === 'recurring' ? cadenceLabel : ''}
              </>
            )}
          </button>

          <p className={styles.secure}>
            Payments processed securely by Stripe. Apple Pay and Google Pay accepted.
          </p>
        </div>
      </section>
    </main>
  );
}

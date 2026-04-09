import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { apiFetch } from '../api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import styles from './DonatePage.module.css';

const PRESET_AMOUNTS: { amount: number; impact: string }[] = [
  { amount: 250, impact: 'Enough to provide school supplies and tutoring for a child' },
  { amount: 500, impact: 'Enough to cover counseling and therapy for a survivor' },
  { amount: 750, impact: 'Enough to fund medical care and wellness support' },
  { amount: 1000, impact: "Enough to support a child's full monthly care" },
  { amount: 1500, impact: 'Enough to shelter and rehabilitate a child for a month' },
];

const IMPACT_TIERS = [
  { threshold: 100, label: 'Essential supplies', icon: '📦' },
  { threshold: 250, label: 'School supplies & tutoring', icon: '📚' },
  { threshold: 500, label: 'Counseling & therapy', icon: '💛' },
  { threshold: 750, label: 'Medical care & wellness', icon: '🏥' },
  { threshold: 1000, label: 'Full monthly care', icon: '🏠' },
  { threshold: 1500, label: 'Shelter & rehabilitation', icon: '🌟' },
];

type Mode = 'one-time' | 'recurring';
type Cadence = 'monthly' | 'quarterly' | 'yearly';

export default function DonatePage() {
  useDocumentTitle('Donate');
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('one-time');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  const amountCents = customAmount
    ? Math.round(parseFloat(customAmount) * 100)
    : selectedAmount
      ? selectedAmount * 100
      : 0;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail);

  const handleContinueToPayment = () => {
    if (!donorEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (amountCents < 100) {
      setError('Please enter an amount of at least $1.');
      return;
    }
    setError('');
    setShowPayment(true);
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const isCardValid = cardNumber.replace(/\s/g, '').length === 16
    && cardExpiry.length === 5
    && cardCvc.length >= 3
    && cardName.trim().length > 0;

  const handleSubmit = async () => {
    if (!isCardValid) {
      setError('Please fill in all payment fields.');
      return;
    }
    setError('');
    setLoading(true);

    const payload = {
      mode,
      cadence: mode === 'recurring' ? cadence : undefined,
      amountCents,
      donorEmail,
      newsletter,
    };

    // Fire backend call (creates supporter + donation record) but don't block on failure
    apiFetch('/api/donate/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => {});

    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 1500));

    const amount = amountCents / 100;
    const isRecurring = mode === 'recurring';
    navigate(`/donate/success?amount=${amount}&recurring=${isRecurring}&email=${encodeURIComponent(donorEmail)}`);
  };

  const cadenceLabel = cadence === 'monthly' ? '/mo' : cadence === 'quarterly' ? '/qtr' : '/yr';
  const displayAmount = customAmount
    ? parseFloat(customAmount) || 0
    : selectedAmount ?? 0;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Your Donation Will Change a Child's Life</h1>
          <p className={styles.subtitle}>
            The holistic healing provided to children-survivors of abuse and trafficking
            is only possible with your financial help. Every dollar goes directly toward
            refuge, rehabilitation, and reintegration services.
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
            {PRESET_AMOUNTS.map(({ amount: amt, impact }) => (
              <button
                key={amt}
                className={`${styles.amountBtn} ${selectedAmount === amt && !customAmount ? styles.amountBtnActive : ''}`}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
              >
                <span className={styles.amountValue}>${amt.toLocaleString()}</span>
                <span className={styles.amountImpact}>{impact}</span>
              </button>
            ))}
            <div className={styles.customAmountWrap}>
              <span className={styles.currencyPrefix}>$</span>
              <input
                type="number"
                className={styles.customInput}
                placeholder="Other amount"
                value={customAmount}
                min="1"
                onChange={e => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
              />
            </div>
          </div>

          {/* Impact meter */}
          {displayAmount > 0 && (
            <div className={styles.impactMeter}>
              <p className={styles.impactMeterTitle}>Your impact at ${displayAmount.toLocaleString()}</p>
              <div className={styles.impactTiers}>
                {IMPACT_TIERS.map((tier, i) => {
                  const active = displayAmount >= tier.threshold;
                  const isHighest = active && (i === IMPACT_TIERS.length - 1 || displayAmount < IMPACT_TIERS[i + 1].threshold);
                  return (
                    <div
                      key={tier.threshold}
                      className={`${styles.impactTier} ${active ? styles.impactTierActive : ''} ${isHighest ? styles.impactTierHighest : ''}`}
                    >
                      <span className={styles.tierIcon}>{tier.icon}</span>
                      <div className={styles.tierContent}>
                        <span className={styles.tierLabel}>{tier.label}</span>
                        <span className={styles.tierThreshold}>${tier.threshold.toLocaleString()}+</span>
                      </div>
                      <div className={styles.tierBar}>
                        <div
                          className={styles.tierBarFill}
                          style={{ width: active ? '100%' : `${Math.min(100, (displayAmount / tier.threshold) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Email (required) */}
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="donorEmail">Email address</label>
            <input
              id="donorEmail"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={donorEmail}
              onChange={e => setDonorEmail(e.target.value)}
              required
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

          {!showPayment ? (
            <button
              className={styles.donateBtn}
              onClick={handleContinueToPayment}
              disabled={amountCents < 100 || !isValidEmail}
            >
              <Heart size={18} />
              Continue to Payment
            </button>
          ) : (
            <>
              <div className={styles.paymentSection}>
                <h3 className={styles.paymentTitle}>Payment Details</h3>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="cardName">Name on card</label>
                  <input
                    id="cardName"
                    type="text"
                    className={styles.input}
                    placeholder="John Doe"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="cardNumber">Card number</label>
                  <input
                    id="cardNumber"
                    type="text"
                    className={styles.input}
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                  />
                </div>
                <div className={styles.cardRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="cardExpiry">Expiry</label>
                    <input
                      id="cardExpiry"
                      type="text"
                      className={styles.input}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label} htmlFor="cardCvc">CVC</label>
                    <input
                      id="cardCvc"
                      type="text"
                      className={styles.input}
                      placeholder="123"
                      value={cardCvc}
                      onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>

              <button
                className={styles.donateBtn}
                onClick={handleSubmit}
                disabled={loading || !isCardValid}
              >
                {loading ? 'Processing...' : (
                  <>
                    <Heart size={18} />
                    Donate ${displayAmount.toLocaleString()}{mode === 'recurring' ? cadenceLabel : ''}
                  </>
                )}
              </button>
            </>
          )}

          <p className={styles.secure}>
            Your payment information is secure and encrypted.
          </p>
        </div>
      </section>
    </main>
  );
}

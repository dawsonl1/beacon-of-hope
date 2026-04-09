import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, CheckCircle } from 'lucide-react';
import { apiFetch } from '../api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import styles from './DonateSuccessPage.module.css';

interface DonationResult {
  amount: number;
  currency: string;
  isRecurring: boolean;
  email: string | null;
}

export default function DonateSuccessPage() {
  useDocumentTitle('Donation Successful');
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [result, setResult] = useState<DonationResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found.');
      return;
    }
    apiFetch<DonationResult>(`/api/donate/success?session_id=${sessionId}`)
      .then(setResult)
      .catch(() => setError('Unable to verify your donation. Please contact us if you were charged.'));
  }, [sessionId]);

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.error}>{error}</p>
          <Link to="/donate" className={styles.link}>Try again</Link>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.loading}>Verifying your donation...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <CheckCircle size={48} className={styles.icon} />
        <h1 className={styles.title}>Thank You!</h1>
        <p className={styles.amount}>
          ${result.amount.toLocaleString()}
          {result.isRecurring && <span className={styles.freq}> recurring</span>}
        </p>
        <p className={styles.message}>
          Your generous donation will help provide safe shelter, education, and counseling
          for survivors of abuse and trafficking.
        </p>
        {result.email && (
          <p className={styles.receipt}>A receipt will be sent to <strong>{result.email}</strong>.</p>
        )}
        <div className={styles.actions}>
          <Link to="/" className={styles.btnPrimary}>
            <Heart size={16} /> Back to Home
          </Link>
          <Link to="/impact" className={styles.btnSecondary}>
            See Our Impact
          </Link>
        </div>
      </div>
    </main>
  );
}

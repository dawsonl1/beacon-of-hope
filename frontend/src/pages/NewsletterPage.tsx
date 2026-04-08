import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './NewsletterPage.module.css';

export default function NewsletterPage() {
  const { isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // In a real app this would call an API endpoint
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <CheckCircle size={48} className={styles.successIcon} />
          <h1 className={styles.title}>You're Subscribed!</h1>
          <p className={styles.text}>
            We'll send you a monthly update with stories of hope, impact data, and
            ways you can help. Look for it in your inbox the first week of each month.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Mail size={32} />
        </div>
        <h1 className={styles.title}>Monthly Newsletter</h1>

        {isAuthenticated && user ? (
          <p className={styles.text}>
            Hi {user.firstName}! As a valued donor, we want to keep you updated on the impact
            of your giving. Sign up for our monthly newsletter to see the difference
            you're making in the lives of girls across Guam.
          </p>
        ) : (
          <p className={styles.text}>
            Stay connected with Beacon of Hope. Our monthly newsletter shares stories of
            transformation, impact data showing where donations go, and updates on our
            mission to end trafficking and restore hope.
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              type="email"
              className={styles.input}
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className={styles.submitBtn}>
              Subscribe
            </button>
          </div>
        </form>

        <div className={styles.preview}>
          <h2 className={styles.previewTitle}>What to expect each month</h2>
          <ul className={styles.previewList}>
            <li>Impact stories from girls in our safehouses</li>
            <li>Data-driven updates on education, health, and reintegration outcomes</li>
            <li>Where your donations are going and the goals we're working toward</li>
            <li>Ways to get involved beyond financial support</li>
          </ul>
        </div>

        <p className={styles.privacy}>
          We respect your privacy. Unsubscribe anytime. We'll never share your email.
        </p>
      </div>
    </main>
  );
}

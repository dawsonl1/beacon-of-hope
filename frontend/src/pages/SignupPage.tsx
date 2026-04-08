import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api';
import styles from './LoginPage.module.css';

export default function SignupPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to their portal
  useEffect(() => {
    if (user) {
      const dest = user.roles?.includes('Admin') || user.roles?.includes('Staff') ? '/admin' : '/donor';
      navigate(dest, { replace: true });
    }
  }, [user, navigate]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!firstName || !lastName || !email || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      // Registration auto-signs in on the backend; trigger a session check via login
      await login(email, password);
      navigate('/donor', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.logoIcon}>&#9670;</span>
            <h1 className={styles.title}>Become a Donor</h1>
            <p className={styles.subtitle}>
              Create an account to track your donations and see the impact you're making.
            </p>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.nameRow}>
              <div className={styles.field}>
                <label htmlFor="firstName" className={styles.label}>First Name</label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={styles.input}
                  placeholder="First name"
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="lastName" className={styles.label}>Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={styles.input}
                  placeholder="Last name"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password (min 12 characters)</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.input}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={styles.input}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className={styles.spinner}>Creating account...</span>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.switchText}>
              Already have an account? <Link to="/login" className={styles.backLink}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

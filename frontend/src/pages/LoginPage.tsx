import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect (in useEffect to avoid setState during render)
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRedirectPath(user.roles), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  function validateEmail(value: string): string {
    if (!value) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
    return '';
  }

  function validatePassword(value: string): string {
    if (!value) return 'Password is required.';
    if (value.length < 12) return 'Password must be at least 12 characters.';
    return '';
  }

  function getRedirectPath(roles: string[]): string {
    const isAdminOrStaff = roles.includes('Admin') || roles.includes('Staff');
    const isDonor = roles.includes('Donor');
    // Only use returnUrl if it matches the user's role
    if (returnUrl && !returnUrl.startsWith('/login')) {
      if (returnUrl.startsWith('/admin') && isAdminOrStaff) return returnUrl;
      if (returnUrl.startsWith('/donor') && isDonor) return returnUrl;
    }
    if (isAdminOrStaff) return '/admin';
    if (isDonor) return '/donor';
    return '/';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;

    setIsSubmitting(true);
    try {
      const user = await login(email, password, rememberMe);
      navigate(getRedirectPath(user.roles), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
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
            <h1 className={styles.title}>Beacon of Hope</h1>
            <p className={styles.subtitle}>Safe homes for girls in Guam</p>
            <p className={styles.nonprofit}>501(c)(3) Nonprofit Organization</p>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                onBlur={() => setEmailError(validateEmail(email))}
                className={`${styles.input} ${emailError ? styles.inputError : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting}
              />
              {emailError && (
                <p className={styles.fieldError} aria-live="polite">{emailError}</p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                  onBlur={() => setPasswordError(validatePassword(password))}
                  className={`${styles.input} ${styles.passwordInput} ${passwordError ? styles.inputError : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && (
                <p className={styles.fieldError} aria-live="polite">{passwordError}</p>
              )}
            </div>

            <div className={styles.options}>
              <label className={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || !email || !password}
            >
              {isSubmitting ? (
                <span className={styles.spinner}>Signing in...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className={styles.footer}>
            <Link to="/" className={styles.backLink}>
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

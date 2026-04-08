import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Calendar, TrendingUp, Loader2, Users, GraduationCap, Shield, Settings, ArrowRight } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatAmount, formatEnumLabel } from '../constants';
import styles from './DonorPortal.module.css';

interface Supporter {
  supporterId: number;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  supporterType: string | null;
  status: string | null;
  firstDonationDate: string | null;
}

interface Donation {
  donationId: number;
  donationType: string | null;
  donationDate: string | null;
  amount: number | null;
  estimatedValue: number | null;
  currencyCode: string | null;
  isRecurring: boolean | null;
  campaignName: string | null;
  channelSource: string | null;
}

interface Allocation {
  donationId: number;
  programArea: string | null;
  amountAllocated: number;
  safehouseName: string | null;
}

interface DonorData {
  supporter: Supporter | null;
  donations: Donation[];
  allocations: Allocation[];
}

type Tab = 'impact' | 'history' | 'settings';

export default function DonorPortal() {
  const { user } = useAuth();
  const [data, setData] = useState<DonorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('impact');

  useEffect(() => {
    apiFetch<DonorData>('/api/donor/my-donations')
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.center}><Loader2 size={32} className={styles.spinner} /></div>;
  if (error) return <div className={styles.center}><p className={styles.error}>{error}</p></div>;
  if (!data?.supporter) return <div className={styles.center}><p>No donor profile linked to your account.</p></div>;

  const totalDonated = data.donations.reduce((sum, d) => sum + (d.amount ?? d.estimatedValue ?? 0), 0);
  const donationCount = data.donations.length;
  const hasRecurring = data.donations.some(d => d.isRecurring);

  // Aggregate allocations by program (without safehouse labels)
  const programAllocations = Object.entries(
    data.allocations.reduce<Record<string, number>>((acc, a) => {
      const key = a.programArea ?? 'General';
      acc[key] = (acc[key] ?? 0) + a.amountAllocated;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const displayName = data.supporter.displayName
    || `${data.supporter.firstName ?? ''} ${data.supporter.lastName ?? ''}`.trim()
    || user?.firstName
    || 'Donor';

  return (
    <div className={styles.page}>
      {/* Hero banner */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Welcome back, {displayName}</h1>
          <p className={styles.heroSub}>
            Your generosity is changing lives. Here's the impact you're making.
          </p>
          <Link to="/donate" className={styles.heroCta}>
            <Heart size={16} />
            {hasRecurring ? 'Increase Your Impact' : 'Make Another Donation'}
          </Link>
        </div>
      </header>

      {/* Impact highlight cards */}
      <section className={styles.highlights}>
        <div className={styles.highlightCard}>
          <div className={styles.highlightIcon}><Heart size={22} /></div>
          <div>
            <span className={styles.highlightValue}>{formatAmount(totalDonated)}</span>
            <span className={styles.highlightLabel}>Your total giving</span>
          </div>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.highlightIcon}><Users size={22} /></div>
          <div>
            <span className={styles.highlightValue}>{donationCount > 0 ? Math.max(1, Math.floor(totalDonated / 5000)) : 0}</span>
            <span className={styles.highlightLabel}>Lives directly impacted</span>
          </div>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.highlightIcon}><GraduationCap size={22} /></div>
          <div>
            <span className={styles.highlightValue}>{programAllocations.length}</span>
            <span className={styles.highlightLabel}>Programs you support</span>
          </div>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.highlightIcon}><Shield size={22} /></div>
          <div>
            <span className={styles.highlightValue}>{donationCount}</span>
            <span className={styles.highlightLabel}>Donations to date</span>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'impact' ? styles.tabActive : ''}`} onClick={() => setActiveTab('impact')}>
          Your Impact
        </button>
        <button className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`} onClick={() => setActiveTab('history')}>
          Donation History
        </button>
        <button className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={14} /> Settings
        </button>
      </nav>

      {/* Impact Tab */}
      {activeTab === 'impact' && (
        <div className={styles.tabContent}>
          {/* Success stories */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Stories from Girls You've Helped</h2>
            <div className={styles.storyGrid}>
              <div className={styles.storyCard}>
                <span className={styles.storyBadge}>Education</span>
                <p className={styles.storyText}>
                  A 14-year-old who arrived with no schooling completed her elementary equivalency
                  and discovered a love for science. She now dreams of becoming a nurse.
                </p>
                <span className={styles.storyMeta}>Safehouse resident, Guam</span>
              </div>
              <div className={styles.storyCard}>
                <span className={styles.storyBadge}>Reintegration</span>
                <p className={styles.storyText}>
                  After 2 years of counseling, a young woman was reunified with her family. Her risk level
                  dropped from Critical to Low. She continues to thrive with post-placement support.
                </p>
                <span className={styles.storyMeta}>Successfully reintegrated</span>
              </div>
              <div className={styles.storyCard}>
                <span className={styles.storyBadge}>Healing</span>
                <p className={styles.storyText}>
                  A survivor of trafficking entered our program withdrawn and fearful. Through counseling
                  and peer support, she's now mentoring younger residents and leading group sessions.
                </p>
                <span className={styles.storyMeta}>Active resident, Guam</span>
              </div>
            </div>
            <p className={styles.privacyNote}>Names and identifying details are changed to protect privacy.</p>
          </section>

          {/* Where donations go */}
          {programAllocations.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Where Your Donations Go</h2>
              <div className={styles.allocGrid}>
                {programAllocations.map(([program, amount]) => (
                  <div key={program} className={styles.allocCard}>
                    <span className={styles.allocProgram}>{program}</span>
                    <span className={styles.allocAmount}>{formatAmount(amount)}</span>
                    <div className={styles.allocBar}>
                      <div
                        className={styles.allocBarFill}
                        style={{ width: `${Math.min(100, (amount / programAllocations[0][1]) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Inspire CTA */}
          <section className={styles.inspireCta}>
            <div>
              <h3 className={styles.inspireTitle}>
                {hasRecurring
                  ? 'Your recurring gift keeps making a difference every month.'
                  : 'Consider becoming a monthly donor'}
              </h3>
              <p className={styles.inspireText}>
                {hasRecurring
                  ? 'Thank you for your continued commitment. Want to increase your impact?'
                  : 'Monthly donors provide the stable funding that lets us plan ahead and serve more girls. Even a small recurring gift makes a big difference.'}
              </p>
            </div>
            <Link to="/donate" className={styles.inspirBtn}>
              <Heart size={16} />
              {hasRecurring ? 'Give More' : 'Start Monthly Giving'}
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className={styles.tabContent}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Donation History</h2>
            {data.donations.length === 0 ? (
              <div className={styles.emptyState}>
                <Heart size={32} className={styles.emptyIcon} />
                <p>You haven't made any donations yet.</p>
                <Link to="/donate" className={styles.emptyBtn}>Make Your First Donation</Link>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Campaign</th>
                      <th>Recurring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.donations.map(d => (
                      <tr key={d.donationId}>
                        <td>{formatDate(d.donationDate)}</td>
                        <td>{d.donationType ? formatEnumLabel(d.donationType) : '--'}</td>
                        <td className={styles.amountCol}>
                          {d.amount ? formatAmount(d.amount) : d.estimatedValue ? `${formatAmount(d.estimatedValue)} est.` : '--'}
                        </td>
                        <td>{d.campaignName ?? '--'}</td>
                        <td>{d.isRecurring ? 'Yes' : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className={styles.tabContent}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Account Settings</h2>
            <div className={styles.settingsGrid}>
              <div className={styles.settingsCard}>
                <h3 className={styles.settingsLabel}>Email</h3>
                <p className={styles.settingsValue}>{user?.email ?? '--'}</p>
              </div>
              <div className={styles.settingsCard}>
                <h3 className={styles.settingsLabel}>Name</h3>
                <p className={styles.settingsValue}>{displayName}</p>
              </div>
              <div className={styles.settingsCard}>
                <h3 className={styles.settingsLabel}>Donor since</h3>
                <p className={styles.settingsValue}>
                  {data.supporter.firstDonationDate ? formatDate(data.supporter.firstDonationDate) : 'N/A'}
                </p>
              </div>
              <div className={styles.settingsCard}>
                <h3 className={styles.settingsLabel}>Recurring donations</h3>
                <p className={styles.settingsValue}>
                  {hasRecurring ? 'Active' : 'None'}
                  {!hasRecurring && (
                    <Link to="/donate" className={styles.settingsLink}> Set up monthly giving</Link>
                  )}
                </p>
              </div>
            </div>
            <p className={styles.settingsNote}>
              To update your email, password, or payment information, please contact us at{' '}
              <a href="mailto:support@beaconofhope.org">support@beaconofhope.org</a>.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

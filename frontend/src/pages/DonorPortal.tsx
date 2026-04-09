import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Loader2, Users, GraduationCap, Shield, Settings, ArrowRight, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { apiFetch } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatAmount, formatEnumLabel } from '../constants';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
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

const PROGRAM_DESCRIPTIONS: Record<string, string> = {
  Education: 'Tutoring, school supplies, and equivalency programs helping girls build a future through learning.',
  Wellbeing: 'Counseling, therapy, and health services supporting physical and emotional recovery.',
  Operations: 'Day-to-day safehouse operations including meals, utilities, and staffing.',
  Transport: 'Safe transportation for school, medical appointments, and family visits.',
  Maintenance: 'Keeping safehouses safe and comfortable with repairs, furnishings, and upkeep.',
  Outreach: 'Community education, awareness campaigns, and identifying at-risk youth.',
};

export default function DonorPortal() {
  useDocumentTitle('Donor Portal');
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const downloadReceipt = (d: Donation) => {
    const doc = new jsPDF();
    const amount = d.amount ? `$${d.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : d.estimatedValue ? `$${d.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} (est.)` : 'N/A';
    const date = d.donationDate ? new Date(d.donationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Beacon of Hope', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Donation Receipt', 105, 33, { align: 'center' });

    // Divider
    doc.setDrawColor(0, 150, 136);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    // Receipt details
    doc.setFontSize(11);
    let y = 50;
    const label = (text: string, val: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(text, 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, 80, y);
      y += 9;
    };

    label('Donor:', displayName);
    if (user?.email) label('Email:', user.email);
    label('Date:', date);
    label('Amount:', amount);
    label('Type:', d.donationType ? d.donationType.charAt(0).toUpperCase() + d.donationType.slice(1) : 'Monetary');
    label('Recurring:', d.isRecurring ? 'Yes' : 'No');
    label('Receipt #:', `BOH-${d.donationId.toString().padStart(6, '0')}`);

    // Tax note
    y += 8;
    doc.setDrawColor(0, 150, 136);
    doc.line(20, y, 190, y);
    y += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Beacon of Hope is a registered 501(c)(3) nonprofit organization.', 105, y, { align: 'center' });
    y += 6;
    doc.text('No goods or services were provided in exchange for this donation.', 105, y, { align: 'center' });
    y += 6;
    doc.text('This receipt may be used for tax deduction purposes. Please retain for your records.', 105, y, { align: 'center' });

    doc.save(`beacon-of-hope-receipt-${d.donationId}.pdf`);
  };

  return (
    <div className={styles.page}>
      {/* Hero banner */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Welcome back, {displayName}</h1>
          <p className={styles.heroSub}>
            Your generosity is changing lives. Here's the impact you're making.
          </p>
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
            <span className={styles.highlightValue}>{donationCount > 0 ? Math.max(1, Math.floor(totalDonated / 1500)) : 0}</span>
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

      {/* Donate CTA — after stats, before detailed tabs */}
      <div className={styles.topCta}>
        <button className={styles.topCtaBtn} onClick={() => navigate('/donate', { state: { email: user?.email } })}>
          <Heart size={16} />
          {hasRecurring ? 'Increase Your Impact' : 'Make Another Donation'}
        </button>
      </div>

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
                <span className={styles.storyMeta}>Safehouse resident, Guam</span>
              </div>
            </div>
            <p className={styles.privacyNote}>Names and identifying details are changed to protect privacy.</p>
          </section>

          {/* Where donations go */}
          {programAllocations.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Where Your Donations Go</h2>
              <div className={styles.allocGrid}>
                {programAllocations.map(([program, amount]) => {
                  const pct = totalDonated > 0 ? Math.round((amount / totalDonated) * 100) : 0;
                  return (
                    <div key={program} className={styles.allocCard}>
                      <span className={styles.allocProgram}>{program}</span>
                      <span className={styles.allocAmount}>{formatAmount(amount)} <span className={styles.allocPct}>({pct}%)</span></span>
                      <div className={styles.allocBar}>
                        <div
                          className={styles.allocBarFill}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      {PROGRAM_DESCRIPTIONS[program] && (
                        <p className={styles.allocDesc}>{PROGRAM_DESCRIPTIONS[program]}</p>
                      )}
                    </div>
                  );
                })}
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
            <button className={styles.inspirBtn} onClick={() => navigate('/donate', { state: { email: user?.email } })}>
              <Heart size={16} />
              {hasRecurring ? 'Give More' : 'Start Monthly Giving'}
              <ArrowRight size={16} />
            </button>
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
                      <th>Recurring</th>
                      <th></th>
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
                        <td>{d.isRecurring ? 'Yes' : '--'}</td>
                        <td>
                          <button className={styles.receiptBtn} onClick={() => downloadReceipt(d)}>
                            <Download size={14} />
                            Receipt
                          </button>
                        </td>
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

import { useEffect, useState } from 'react';
import { Heart, Calendar, TrendingUp, Loader2 } from 'lucide-react';
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

export default function DonorPortal() {
  const { user } = useAuth();
  const [data, setData] = useState<DonorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const programAreas = [...new Set(data.allocations.map(a => a.programArea).filter(Boolean))];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Welcome, {data.supporter.displayName || `${data.supporter.firstName ?? ''} ${data.supporter.lastName ?? ''}`.trim() || user?.firstName || 'Donor'}
          </h1>
          <p className={styles.subtitle}>Thank you for your generous support of Beacon of Hope</p>
        </div>
      </header>

      {/* Summary cards */}
      <section className={styles.cards}>
        <div className={styles.card}>
          <Heart size={20} className={styles.cardIcon} />
          <span className={styles.cardValue}>{formatAmount(totalDonated)}</span>
          <span className={styles.cardLabel}>Total Contributed</span>
        </div>
        <div className={styles.card}>
          <Calendar size={20} className={styles.cardIcon} />
          <span className={styles.cardValue}>{donationCount}</span>
          <span className={styles.cardLabel}>Donations Made</span>
        </div>
        <div className={styles.card}>
          <TrendingUp size={20} className={styles.cardIcon} />
          <span className={styles.cardValue}>{programAreas.length}</span>
          <span className={styles.cardLabel}>Programs Supported</span>
        </div>
      </section>

      {/* Impact allocation */}
      {data.allocations.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Where Your Donations Go</h2>
          <div className={styles.allocGrid}>
            {Object.entries(
              data.allocations.reduce<Record<string, { amount: number; safehouses: Set<string> }>>((acc, a) => {
                const key = a.programArea ?? 'General';
                if (!acc[key]) acc[key] = { amount: 0, safehouses: new Set() };
                acc[key].amount += a.amountAllocated;
                if (a.safehouseName) acc[key].safehouses.add(a.safehouseName);
                return acc;
              }, {})
            ).map(([program, info]) => (
              <div key={program} className={styles.allocCard}>
                <span className={styles.allocProgram}>{program}</span>
                <span className={styles.allocAmount}>{formatAmount(info.amount)}</span>
                {info.safehouses.size > 0 && (
                  <span className={styles.allocDetail}>{[...info.safehouses].join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Donation history */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Donation History</h2>
        {data.donations.length === 0 ? (
          <p className={styles.empty}>No donations recorded yet.</p>
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
  );
}

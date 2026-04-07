import styles from './KpiCard.module.css';

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}

export default function KpiCard({ label, value, sub, loading }: KpiCardProps) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      <div className={styles.valueRow}>
        {loading ? (
          <div className={styles.skeleton} />
        ) : (
          <span className={styles.value}>{value}</span>
        )}
      </div>
      {sub && <p className={styles.sub}>{sub}</p>}
    </div>
  );
}

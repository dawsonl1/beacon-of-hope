import styles from './ChartTooltip.module.css';

export function ChartTooltip({ active, payload, label, prefix = '' }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  prefix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{prefix}{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

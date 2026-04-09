import { Check } from 'lucide-react';
import styles from './Checkbox.module.css';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  return (
    <label className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        className={`${styles.box} ${checked ? styles.boxChecked : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </button>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}

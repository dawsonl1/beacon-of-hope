import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Dropdown.module.css';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  placeholder?: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Compact styling for inline filter dropdowns */
  compact?: boolean;
}

export default function Dropdown({ value, placeholder = 'Select...', options, onChange, compact }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${compact ? styles.triggerCompact : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {selectedLabel
          ? <span>{selectedLabel}</span>
          : <span className={styles.placeholder}>{placeholder}</span>
        }
        <ChevronDown size={compact ? 12 : 14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div className={styles.menu}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.option} ${opt.value === value ? styles.optionSelected : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

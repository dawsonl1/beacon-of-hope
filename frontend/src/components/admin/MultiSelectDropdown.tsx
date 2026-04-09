import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import styles from './MultiSelectDropdown.module.css';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  values: string[];
  placeholder?: string;
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
}

export default function MultiSelectDropdown({
  values,
  placeholder = 'Select...',
  options,
  onChange,
}: MultiSelectDropdownProps) {
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

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }

  function remove(value: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(values.filter((v) => v !== value));
  }

  const selectedLabels = values
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as MultiSelectOption[];

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
      >
        <div className={styles.tagsArea}>
          {selectedLabels.length === 0 && (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
          {selectedLabels.map((opt) => (
            <span key={opt.value} className={styles.tag}>
              {opt.label}
              <span
                role="button"
                tabIndex={0}
                className={styles.tagRemove}
                onClick={(e) => remove(opt.value, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') remove(opt.value, e as unknown as React.MouseEvent);
                }}
              >
                <X size={10} />
              </span>
            </span>
          ))}
        </div>
        <ChevronDown
          size={14}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
            flexShrink: 0,
          }}
        />
      </button>
      {open && (
        <div className={styles.menu}>
          {options.map((opt) => {
            const selected = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                onClick={() => toggle(opt.value)}
              >
                <span className={styles.checkbox}>
                  {selected && <span className={styles.checkmark}>&#10003;</span>}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

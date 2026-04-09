import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import styles from './TimePicker.module.css';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  /** 15-minute or 30-minute intervals */
  interval?: 15 | 30;
  /** Start hour (inclusive, default 6) */
  startHour?: number;
  /** End hour (inclusive, default 19) */
  endHour?: number;
}

function fmtTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function TimePicker({ value, onChange, placeholder = 'Select time...', interval = 15, startHour = 6, endHour = 19 }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Scroll to selected time when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) selected.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [open, value]);

  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  return (
    <div className={styles.picker} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
      >
        <Clock size={14} className={styles.icon} />
        {value
          ? <span>{fmtTime(value)}</span>
          : <span className={styles.placeholder}>{placeholder}</span>
        }
      </button>
      {open && (
        <div className={styles.dropdown} ref={listRef}>
          {slots.map(t => (
            <button
              key={t}
              type="button"
              data-selected={t === value ? 'true' : undefined}
              className={`${styles.slot} ${t === value ? styles.slotSelected : ''}`}
              onClick={() => { onChange(t); setOpen(false); }}
            >
              {fmtTime(t)}
            </button>
          ))}
          {value && (
            <button type="button" className={styles.clearBtn} onClick={() => { onChange(''); setOpen(false); }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

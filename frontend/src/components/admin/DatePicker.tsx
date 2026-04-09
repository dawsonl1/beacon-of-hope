import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { APP_TODAY, APP_TODAY_STR } from '../../constants';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
  max?: string;
  required?: boolean;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function displayDate(s: string): string {
  if (!s) return '';
  const d = parseDate(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DatePicker({ value, onChange, placeholder = 'Select date...', max, required }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Calendar state — month being viewed
  const viewDate = value ? parseDate(value) : APP_TODAY;
  const [viewMonth, setViewMonth] = useState(viewDate.getMonth());
  const [viewYear, setViewYear] = useState(viewDate.getFullYear());

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      setViewMonth(d.getMonth());
      setViewYear(d.getFullYear());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const calMonth = new Date(viewYear, viewMonth, 1);
  const startDay = (calMonth.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calDays: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  const today = APP_TODAY_STR;

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(d.getMonth());
    setViewYear(d.getFullYear());
  }

  function selectDay(day: number) {
    const dateStr = fmtDate(new Date(viewYear, viewMonth, day));
    if (max && dateStr > max) return;
    onChange(dateStr);
    setOpen(false);
  }

  return (
    <div className={styles.picker} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
      >
        <Calendar size={14} className={styles.icon} />
        {value
          ? <span>{displayDate(value)}</span>
          : <span className={styles.placeholder}>{placeholder}</span>
        }
      </button>
      {required && !value && <input type="text" required value="" onChange={() => {}} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} tabIndex={-1} />}
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.nav}>
            <button type="button" className={styles.navBtn} onClick={() => shiftMonth(-1)} title="Previous month"><ChevronLeft size={14} /></button>
            <span className={styles.monthLabel}>
              {calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" className={styles.navBtn} onClick={() => shiftMonth(1)} title="Next month"><ChevronRight size={14} /></button>
          </div>
          <div className={styles.grid}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className={styles.dayLabel}>{d}</div>
            ))}
            {calDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const dateStr = fmtDate(new Date(viewYear, viewMonth, day));
              const isSelected = dateStr === value;
              const isToday = dateStr === today;
              const isDisabled = max ? dateStr > max : false;
              return (
                <button
                  key={day}
                  type="button"
                  className={`${styles.day} ${isSelected ? styles.daySelected : ''} ${isToday && !isSelected ? styles.dayToday : ''} ${isDisabled ? styles.dayDisabled : ''}`}
                  onClick={() => !isDisabled && selectDay(day)}
                  disabled={isDisabled}
                >
                  {day}
                </button>
              );
            })}
          </div>
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

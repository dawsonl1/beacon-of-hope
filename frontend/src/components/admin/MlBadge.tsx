import { Sparkles } from 'lucide-react';

export default function MlBadge() {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      fontSize: '0.62rem',
      fontWeight: 700,
      fontFamily: 'var(--font-body)',
      color: '#8e44ad',
      background: 'rgba(142,68,173,0.08)',
      border: '1px solid rgba(142,68,173,0.2)',
      padding: '0.15rem 0.45rem',
      borderRadius: '999px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
      whiteSpace: 'nowrap' as const,
    }}>
      <Sparkles size={10} />
      ML
    </span>
  );
}

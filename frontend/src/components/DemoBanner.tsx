import { useState, useEffect } from 'react';

const VISITED_KEY = 'beacon_demo_visited';
const DISMISSED_KEY = 'beacon_demo_banner_dismissed';

export default function DemoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem(VISITED_KEY);
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);

    if (hasVisited && !dismissed) {
      setVisible(true);
    }

    // Mark as visited for next time
    if (!hasVisited) {
      localStorage.setItem(VISITED_KEY, new Date().toISOString());
    }
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      background: '#1e3a5f',
      color: '#e2e8f0',
      padding: '10px 20px',
      fontSize: '14px',
      textAlign: 'center',
      position: 'relative',
      zIndex: 1000,
      lineHeight: 1.5,
    }}>
      <span>
        Welcome back! This is a live demo &mdash; data resets nightly so feel free to explore, create, and edit freely.
      </span>
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISSED_KEY, '1');
          setVisible(false);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          marginLeft: 16,
          fontSize: '18px',
          lineHeight: 1,
          padding: '0 4px',
          verticalAlign: 'middle',
        }}
        aria-label="Dismiss banner"
      >
        &times;
      </button>
    </div>
  );
}

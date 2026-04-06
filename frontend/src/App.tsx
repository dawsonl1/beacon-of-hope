import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

function App() {
  const [status, setStatus] = useState<string>('loading...');

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('error — is the backend running?'));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Intex 2</h1>
      <p>
        Backend status: <strong>{status}</strong>
      </p>
    </div>
  );
}

export default App;

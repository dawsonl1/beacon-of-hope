import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 700, color: '#B8913A', margin: 0 }}>404</h1>
      <p style={{ fontSize: '1.25rem', color: '#666', marginTop: '0.5rem' }}>Page not found</p>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" style={{ color: '#B8913A', fontWeight: 600, textDecoration: 'none' }}>
        Back to Home
      </Link>
    </div>
  );
}

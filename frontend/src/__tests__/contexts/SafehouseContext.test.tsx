import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import { SafehouseProvider, useSafehouse } from '../../contexts/SafehouseContext';
import { BrowserRouter } from 'react-router-dom';

function SafehouseConsumer() {
  const { safehouses, activeSafehouseId, isAdmin } = useSafehouse();
  return (
    <div>
      <span data-testid="count">{safehouses.length}</span>
      <span data-testid="active">{String(activeSafehouseId)}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
    </div>
  );
}

function renderSafehouse() {
  return render(
    <AuthProvider>
      <SafehouseProvider>
        <BrowserRouter>
          <SafehouseConsumer />
        </BrowserRouter>
      </SafehouseProvider>
    </AuthProvider>
  );
}

describe('SafehouseContext', () => {
  it('provides safehouse data', async () => {
    renderSafehouse();
    await waitFor(() => {
      expect(screen.getByTestId('count')).toBeInTheDocument();
    });
  });

  it('admin defaults to null activeSafehouseId (all safehouses)', async () => {
    renderSafehouse();
    await waitFor(() => {
      // Admin user from mock has Admin role, so activeSafehouseId should be null
      expect(screen.getByTestId('admin').textContent).toBe('true');
      expect(screen.getByTestId('active').textContent).toBe('null');
    });
  });
});

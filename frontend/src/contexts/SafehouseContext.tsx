import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface SafehouseOption {
  safehouseId: number;
  safehouseCode: string;
  name: string;
}

interface SafehouseContextValue {
  safehouses: SafehouseOption[];
  activeSafehouseId: number | null;
  setActiveSafehouseId: (id: number | null) => void;
  isAdmin: boolean;
}

const SafehouseContext = createContext<SafehouseContextValue | null>(null);

export function SafehouseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin') ?? false;
  const safehouses: SafehouseOption[] = (user as any)?.safehouses ?? [];

  const [activeSafehouseId, setActiveSafehouseId] = useState<number | null>(null);

  useEffect(() => {
    if (isAdmin) {
      // Admins default to "All" (null)
      setActiveSafehouseId(null);
    } else if (safehouses.length > 0 && activeSafehouseId === null) {
      // Staff default to their first safehouse
      setActiveSafehouseId(safehouses[0].safehouseId);
    }
  }, [isAdmin, safehouses, activeSafehouseId]);

  return (
    <SafehouseContext.Provider value={{ safehouses, activeSafehouseId, setActiveSafehouseId, isAdmin }}>
      {children}
    </SafehouseContext.Provider>
  );
}

export function useSafehouse(): SafehouseContextValue {
  const ctx = useContext(SafehouseContext);
  if (!ctx) throw new Error('useSafehouse must be used within SafehouseProvider');
  return ctx;
}

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

  // Admins default to "All" (null); Staff default to their first safehouse
  const [activeSafehouseId, setActiveSafehouseId] = useState<number | null>(() =>
    isAdmin ? null : safehouses.length > 0 ? safehouses[0].safehouseId : null
  );

  // Only set default for staff on initial load (when they have no selection yet)
  useEffect(() => {
    if (!isAdmin && safehouses.length > 0 && activeSafehouseId === null) {
      setActiveSafehouseId(safehouses[0].safehouseId);
    }
  }, [isAdmin, safehouses]); // deliberately exclude activeSafehouseId to avoid reset loop

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

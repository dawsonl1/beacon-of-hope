import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, ChevronUp, ChevronDown, X, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useSafehouse } from '../../contexts/SafehouseContext';
import Pagination from '../../components/admin/Pagination';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './CaseloadPage.module.css';

interface ResidentRow {
  residentId: number;
  internalCode: string | null;
  caseControlNo: string | null;
  safehouseId: number | null;
  safehouse: string | null;
  caseStatus: string | null;
  caseCategory: string | null;
  currentRiskLevel: string | null;
  dateOfAdmission: string | null;
  assignedSocialWorker: string | null;
  sex: string | null;
  presentAge: string | null;
}

interface PagedResult {
  items: ResidentRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface FilterOptions {
  caseStatuses: string[];
  categories: string[];
  riskLevels: string[];
  socialWorkers: string[];
}

const RISK_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function riskClass(level: string | null): string {
  if (!level) return '';
  const key = level.toLowerCase();
  if (key === 'critical') return styles.riskCritical;
  if (key === 'high') return styles.riskHigh;
  if (key === 'medium') return styles.riskMedium;
  if (key === 'low') return styles.riskLow;
  return '';
}

function statusClass(status: string | null): string {
  if (!status) return '';
  const key = status.toLowerCase();
  if (key === 'active') return styles.statusActive;
  if (key === 'closed' || key === 'discharged') return styles.statusClosed;
  return styles.statusOther;
}

export default function CaseloadPage() {
  useDocumentTitle('Caseload');
  const { user } = useAuth();
  const { activeSafehouseId } = useSafehouse();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageResidents = user?.roles?.some(r => r === 'Admin' || r === 'Staff') ?? false;

  const [data, setData] = useState<PagedResult | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read filters from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const caseStatus = searchParams.get('caseStatus') || '';
  const caseCategory = searchParams.get('caseCategory') || '';
  const riskLevel = searchParams.get('riskLevel') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const sortDir = searchParams.get('sortDir') || '';

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback((updates: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      return next;
    });
  }, [setSearchParams]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: searchInput, page: '1' });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput, updateParams]);

  // Fetch filter options once
  useEffect(() => {
    apiFetch<FilterOptions>('/api/admin/residents/filter-options')
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  // Fetch residents
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (search) params.set('search', search);
    if (caseStatus) params.set('caseStatus', caseStatus);
    if (activeSafehouseId) params.set('safehouseId', String(activeSafehouseId));
    if (caseCategory) params.set('caseCategory', caseCategory);
    if (riskLevel) params.set('riskLevel', riskLevel);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortDir) params.set('sortDir', sortDir);

    apiFetch<PagedResult>(`/api/admin/residents?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, search, caseStatus, activeSafehouseId, caseCategory, riskLevel, sortBy, sortDir]);

  function handleSort(col: string) {
    if (sortBy === col) {
      updateParams({ sortDir: sortDir === 'asc' ? 'desc' : 'asc', page: '1' });
    } else {
      updateParams({ sortBy: col, sortDir: 'asc', page: '1' });
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortBy !== col) return <ChevronDown size={12} className={styles.sortInactive} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className={styles.sortActive} />
      : <ChevronDown size={12} className={styles.sortActive} />;
  }

  function clearFilter(key: string) {
    updateParams({ [key]: '', page: '1' });
  }

  const hasFilters = !!(caseStatus || caseCategory || riskLevel);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Caseload Inventory</h1>
          <p className={styles.subtitle}>
            {data ? `${data.totalCount} resident${data.totalCount !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>
        {canManageResidents && (
          <button className={styles.addBtn} onClick={() => navigate('/admin/caseload/new')}>
            <Plus size={16} />
            Add Resident
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by code, case no, or social worker..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={caseStatus}
            onChange={(e) => updateParams({ caseStatus: e.target.value, page: '1' })}
          >
            <option value="">All Statuses</option>
            {filterOptions?.caseStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={caseCategory}
            onChange={(e) => updateParams({ caseCategory: e.target.value, page: '1' })}
          >
            <option value="">All Categories</option>
            {filterOptions?.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={riskLevel}
            onChange={(e) => updateParams({ riskLevel: e.target.value, page: '1' })}
          >
            <option value="">All Risk Levels</option>
            {filterOptions?.riskLevels.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasFilters && (
        <div className={styles.chipRow}>
          {caseStatus && (
            <span className={styles.chip}>
              Status: {caseStatus}
              <button onClick={() => clearFilter('caseStatus')} className={styles.chipClose}><X size={12} /></button>
            </span>
          )}
          {caseCategory && (
            <span className={styles.chip}>
              Category: {caseCategory}
              <button onClick={() => clearFilter('caseCategory')} className={styles.chipClose}><X size={12} /></button>
            </span>
          )}
          {riskLevel && (
            <span className={styles.chip}>
              Risk: {riskLevel}
              <button onClick={() => clearFilter('riskLevel')} className={styles.chipClose}><X size={12} /></button>
            </span>
          )}
          <button
            className={styles.clearAllBtn}
            onClick={() => updateParams({ caseStatus: '', caseCategory: '', riskLevel: '', page: '1' })}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableCard}>
        {error ? (
          <div className={styles.errorState}>
            <p>Failed to load residents: {error}</p>
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
          </div>
        ) : loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Loading residents...</span>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No residents match your search or filters.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('internalcode')} className={styles.sortable}>
                      Code <SortIcon col="internalcode" />
                    </th>
                    <th onClick={() => handleSort('casecontrolno')} className={styles.sortable}>
                      Case No. <SortIcon col="casecontrolno" />
                    </th>
                    <th>Safehouse</th>
                    <th onClick={() => handleSort('casestatus')} className={styles.sortable}>
                      Status <SortIcon col="casestatus" />
                    </th>
                    <th onClick={() => handleSort('casecategory')} className={styles.sortable}>
                      Category <SortIcon col="casecategory" />
                    </th>
                    <th onClick={() => handleSort('risklevel')} className={styles.sortable}>
                      Risk <SortIcon col="risklevel" />
                    </th>
                    <th onClick={() => handleSort('dateofadmission')} className={styles.sortable}>
                      Admitted <SortIcon col="dateofadmission" />
                    </th>
                    <th onClick={() => handleSort('socialworker')} className={styles.sortable}>
                      Social Worker <SortIcon col="socialworker" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr
                      key={r.residentId}
                      className={`${styles.row} ${(RISK_ORDER[r.currentRiskLevel ?? ''] ?? 99) <= 1 ? styles.rowHighRisk : ''}`}
                      onClick={() => navigate(`/admin/caseload/${r.residentId}?${searchParams.toString()}`)}
                    >
                      <td>
                        <span className={styles.codeCell}>{r.internalCode ?? '--'}</span>
                      </td>
                      <td className={styles.monoCell}>{r.caseControlNo ?? '--'}</td>
                      <td>{r.safehouse ?? '--'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass(r.caseStatus)}`}>
                          {r.caseStatus ?? '--'}
                        </span>
                      </td>
                      <td>{r.caseCategory ?? '--'}</td>
                      <td>
                        <span className={`${styles.riskBadge} ${riskClass(r.currentRiskLevel)}`}>
                          {r.currentRiskLevel ?? '--'}
                        </span>
                      </td>
                      <td>{r.dateOfAdmission ?? '--'}</td>
                      <td>{r.assignedSocialWorker ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              totalCount={data.totalCount}
              onPageChange={(p) => updateParams({ page: String(p) })}
            />
          </>
        )}
      </div>
    </div>
  );
}

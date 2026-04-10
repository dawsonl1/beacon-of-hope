import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Loader2, X, DollarSign, PiggyBank, CircleDollarSign } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatAmount, formatEnumLabel } from '../../constants';
import Pagination from '../../components/admin/Pagination';
import Dropdown from '../../components/admin/Dropdown';
import { SUPPORTER_TYPES, SUPPORTER_STATUSES, DONATION_TYPES } from '../../domain';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './DonorsPage.module.css';

/* ── Types ──────────────────────────────────────────────── */

interface ChurnSummary {
  entityId: number;
  modelName: string;
  score: number;
  scoreLabel: string;
}

interface SupporterRow {
  supporterId: number;
  supporterType: string | null;
  displayName: string | null;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  country: string | null;
  status: string | null;
  acquisitionChannel: string | null;
  totalDonated: number;
  lastDonationDate: string | null;
}

interface DonationRow {
  donationId: number;
  supporterId: number | null;
  supporterName: string | null;
  donationType: string | null;
  donationDate: string | null;
  amount: number | null;
  estimatedValue: number | null;
  currencyCode: string | null;
  impactUnit: string | null;
  isRecurring: boolean | null;
  campaignName: string | null;
}

interface PartnerRow {
  partnerId: number;
  partnerName: string | null;
  partnerType: string | null;
  roleType: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  status: string | null;
  startDate: string | null;
  notes: string | null;
}

interface AllocationByProgram {
  programArea: string;
  totalAllocatedThisYear: number;
  totalAllocated: number;
}

interface AllocationBySafehouse {
  safehouseId: number;
  safehouseName: string;
  totalAllocatedThisYear: number;
  totalAllocated: number;
}

interface AllocationSummary {
  totalDonated: number;
  totalAllocated: number;
  unallocated: number;
  donatedThisYear: number;
  allocatedThisYear: number;
  unallocatedThisYear: number;
}

interface AllocationRow {
  allocationId: number;
  safehouseName: string | null;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
}

interface SafehouseOption {
  safehouseId: number;
  safehouseCode: string;
  name: string;
}

const PROGRAM_AREAS = ['Education', 'Wellbeing', 'Operations', 'Transport', 'Outreach', 'Maintenance'];

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const STATUSES = SUPPORTER_STATUSES;

/* ── Component ──────────────────────────────────────────── */

export default function DonorsPage() {
  useDocumentTitle('Donors & Contributions');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.roles?.includes('Admin') ?? false;
  const isStaffOrAdmin = user?.roles?.some(r => r === 'Admin' || r === 'Staff') ?? false;

  type TabName = 'supporters' | 'partners' | 'donations' | 'allocations';
  const [activeTab, setActiveTab] = useState<TabName>(
    (searchParams.get('tab') as TabName) || 'supporters'
  );

  // Supporters state
  const [supporters, setSupporters] = useState<PagedResult<SupporterRow> | null>(null);
  const [sLoading, setSLoading] = useState(true);
  const [sError, setSError] = useState<string | null>(null);

  // Donations state
  const [donations, setDonations] = useState<PagedResult<DonationRow> | null>(null);
  const [dLoading, setDLoading] = useState(false);
  const [dError, setDError] = useState<string | null>(null);

  // Partners state
  const [partners, setPartners] = useState<PagedResult<PartnerRow> | null>(null);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState<string | null>(null);

  // Churn predictions
  const [churnMap, setChurnMap] = useState<Map<number, ChurnSummary>>(new Map());

  // Allocations state
  const [allocByProgram, setAllocByProgram] = useState<AllocationByProgram[]>([]);
  const [allocBySafehouse, setAllocBySafehouse] = useState<AllocationBySafehouse[]>([]);
  const [allocSummary, setAllocSummary] = useState<AllocationSummary | null>(null);
  const [recentAllocs, setRecentAllocs] = useState<AllocationRow[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState<string | null>(null);

  // Allocate funds form
  const [showAllocForm, setShowAllocForm] = useState(false);
  const [allocSafehouseId, setAllocSafehouseId] = useState('');
  const [allocProgram, setAllocProgram] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocDate, setAllocDate] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [allocFormError, setAllocFormError] = useState('');
  const [allocSaving, setAllocSaving] = useState(false);
  const [safehouseOptions, setSafehouseOptions] = useState<SafehouseOption[]>([]);

  // Filters from URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const supporterType = searchParams.get('supporterType') || '';
  const status = searchParams.get('status') || '';
  const donationType = searchParams.get('donationType') || '';

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.set('page', '1');
      return next;
    });
  }

  function clearFilters() {
    setSearchParams({ tab: activeTab });
    setSearchInput('');
  }

  // Fetch supporters
  const fetchSupporters = useCallback(async () => {
    setSLoading(true);
    setSError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (search) params.set('search', search);
      if (supporterType) params.set('supporterType', supporterType);
      if (status) params.set('status', status);
      const data = await apiFetch<PagedResult<SupporterRow>>(`/api/admin/supporters?${params}`);
      setSupporters(data);
    } catch (e) {
      setSError(e instanceof Error ? e.message : 'Failed to load supporters');
    } finally {
      setSLoading(false);
    }
  }, [page, search, supporterType, status]);

  // Fetch donations
  const fetchDonations = useCallback(async () => {
    setDLoading(true);
    setDError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (donationType) params.set('donationType', donationType);
      const data = await apiFetch<PagedResult<DonationRow>>(`/api/admin/donations?${params}`);
      setDonations(data);
    } catch (e) {
      setDError(e instanceof Error ? e.message : 'Failed to load donations');
    } finally {
      setDLoading(false);
    }
  }, [page, donationType]);

  // Fetch partners
  const fetchPartners = useCallback(async () => {
    setPLoading(true);
    setPError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', '20');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (supporterType) params.set('partnerType', supporterType);
      const data = await apiFetch<PagedResult<PartnerRow>>(`/api/admin/partners?${params}`);
      setPartners(data);
    } catch (e) {
      setPError(e instanceof Error ? e.message : 'Failed to load partners');
    } finally {
      setPLoading(false);
    }
  }, [page, search, status, supporterType]);

  // Fetch allocations
  const fetchAllocations = useCallback(async () => {
    setAllocLoading(true);
    setAllocError(null);
    try {
      const [byProgram, bySafehouse, summary, recent] = await Promise.all([
        apiFetch<AllocationByProgram[]>('/api/admin/allocations/by-program'),
        apiFetch<AllocationBySafehouse[]>('/api/admin/allocations/by-safehouse'),
        apiFetch<AllocationSummary>('/api/admin/allocations/summary'),
        apiFetch<{ items: AllocationRow[] }>('/api/admin/allocations?pageSize=10'),
      ]);
      setAllocByProgram(byProgram);
      setAllocBySafehouse(bySafehouse);
      setAllocSummary(summary);
      setRecentAllocs(recent.items);
    } catch (e) {
      setAllocError(e instanceof Error ? e.message : 'Failed to load allocations');
    } finally {
      setAllocLoading(false);
    }
  }, []);

  // Fetch safehouse options for allocation form
  useEffect(() => {
    if (activeTab !== 'allocations') return;
    apiFetch<SafehouseOption[]>('/api/impact/safehouses')
      .then(d => setSafehouseOptions(d))
      .catch(() => {});
  }, [activeTab]);

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    setAllocFormError('');
    if (!allocAmount || parseFloat(allocAmount) <= 0) { setAllocFormError('Enter a valid amount.'); return; }
    if (!allocProgram) { setAllocFormError('Select a program area.'); return; }
    if (!allocDate) { setAllocFormError('Select a date.'); return; }
    setAllocSaving(true);
    try {
      await apiFetch('/api/admin/allocations', {
        method: 'POST',
        body: JSON.stringify({
          safehouseId: allocSafehouseId ? parseInt(allocSafehouseId) : null,
          programArea: allocProgram,
          amountAllocated: parseFloat(allocAmount),
          allocationDate: allocDate || null,
          allocationNotes: allocNotes || null,
        }),
      });
      setShowAllocForm(false);
      setAllocSafehouseId(''); setAllocProgram('');
      setAllocAmount(''); setAllocDate(''); setAllocNotes('');
      fetchAllocations();
    } catch (e) {
      setAllocFormError(e instanceof Error ? e.message : 'Failed to create allocation.');
    } finally {
      setAllocSaving(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'supporters') fetchSupporters();
    else if (activeTab === 'partners') fetchPartners();
    else if (activeTab === 'donations') fetchDonations();
    else fetchAllocations();
  }, [activeTab, fetchSupporters, fetchPartners, fetchDonations, fetchAllocations]);

  // Fetch churn predictions once
  useEffect(() => {
    apiFetch<ChurnSummary[]>('/api/ml/predictions/supporter/summary')
      .then(items => {
        const map = new Map<number, ChurnSummary>();
        for (const item of items) {
          if (item.modelName === 'donor-churn') {
            map.set(item.entityId, item);
          }
        }
        setChurnMap(map);
      })
      .catch(() => { /* ML predictions are non-critical */ });
  }, []);

  // Debounced search
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam('search', value), 350);
  }

  function handleTabChange(tab: TabName) {
    setActiveTab(tab);
    setSearchParams({ tab, page: '1' });
    setSearchInput('');
  }

  function statusClassName(s: string | null) {
    if (!s) return '';
    const k = s.toLowerCase();
    if (k === 'active') return styles.statusActive;
    if (k === 'lapsed') return styles.statusLapsed;
    return styles.statusInactive;
  }

  function churnColor(label: string) {
    switch (label) {
      case 'Critical': return '#c0392b';
      case 'High': return '#d35400';
      case 'Medium': return '#f39c12';
      case 'Low': return '#27ae60';
      default: return 'var(--text-muted)';
    }
  }

  const riskFilter = searchParams.get('risk') || '';
  const hasFilters = search || supporterType || status || donationType || riskFilter;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Donors & Contributions</h1>
          <p>Manage supporter profiles and track all contribution types</p>
        </div>
        {isAdmin && (
          <div className={styles.headerActions}>
            <button className={styles.btnSecondary} onClick={() => navigate('/admin/donations/new')}>
              <Plus size={15} />
              Log Donation
            </button>
            <button className={styles.btnSecondary} onClick={() => navigate('/admin/partners/new')}>
              <Plus size={15} />
              Add Partner
            </button>
            <button className={styles.btnPrimary} onClick={() => navigate('/admin/donors/new')}>
              <Plus size={15} />
              Add Supporter
            </button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'supporters' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('supporters')}
        >
          Supporters Directory
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'partners' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('partners')}
        >
          Partners Directory
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'donations' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('donations')}
        >
          Recent Donations
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'allocations' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('allocations')}
        >
          Allocations
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {activeTab === 'supporters' && (
          <>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search by name, email, org..."
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            <Dropdown
              value={supporterType}
              placeholder="All Types"
              options={[
                { value: '', label: 'All Types' },
                ...SUPPORTER_TYPES.map(t => ({ value: t, label: formatEnumLabel(t) })),
              ]}
              onChange={v => setParam('supporterType', v)}
              compact
            />
            <Dropdown
              value={status}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                ...STATUSES.map(s => ({ value: s, label: s })),
              ]}
              onChange={v => setParam('status', v)}
              compact
            />
            <Dropdown
              value={riskFilter}
              placeholder="All Risk Levels"
              options={[
                { value: '', label: 'All Risk Levels' },
                { value: 'Critical', label: 'Critical' },
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Low', label: 'Low' },
              ]}
              onChange={v => setParam('risk', v)}
              compact
            />
          </>
        )}
        {activeTab === 'partners' && (
          <>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search by name, email..."
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            <Dropdown
              value={supporterType}
              placeholder="All Types"
              options={[
                { value: '', label: 'All Types' },
                { value: 'Organization', label: 'Organization' },
                { value: 'Individual', label: 'Individual' },
              ]}
              onChange={v => setParam('supporterType', v)}
              compact
            />
            <Dropdown
              value={status}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Prospective', label: 'Prospective' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              onChange={v => setParam('status', v)}
              compact
            />
          </>
        )}
        {activeTab === 'donations' && (
          <Dropdown
            value={donationType}
            placeholder="All Types"
            options={[
              { value: '', label: 'All Types' },
              ...DONATION_TYPES.map(t => ({ value: t, label: formatEnumLabel(t) })),
            ]}
            onChange={v => setParam('donationType', v)}
            compact
          />
        )}
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Supporters Table */}
      {activeTab === 'supporters' && (() => {
        const filteredSupporters = supporters && riskFilter
          ? supporters.items.filter(s => {
              const churn = churnMap.get(s.supporterId);
              return churn?.scoreLabel === riskFilter;
            })
          : supporters?.items ?? [];
        return (
        <div className={styles.tableCard}>
          {sLoading ? (
            <div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div>
          ) : sError ? (
            <div className={styles.error}>{sError}</div>
          ) : !supporters || filteredSupporters.length === 0 ? (
            <div className={styles.empty}>No supporters found</div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Email</th>
                      <th>Region</th>
                      <th>Total Given</th>
                      <th>Last Donation</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSupporters.map(s => (
                      <tr key={s.supporterId} onClick={() => navigate(`/admin/donors/${s.supporterId}`)}>
                        <td>
                          <span className={styles.supporterName}>{s.displayName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Unnamed'}</span>
                          {s.organizationName && <span className={styles.supporterOrg}>{s.organizationName}</span>}
                        </td>
                        <td>{s.supporterType ? <span className={styles.typeBadge}>{formatEnumLabel(s.supporterType)}</span> : '--'}</td>
                        <td><span className={statusClassName(s.status)}>{s.status ?? '--'}</span></td>
                        <td>{s.email ?? '--'}</td>
                        <td>{[s.region, s.country].filter(Boolean).join(', ') || '--'}</td>
                        <td className={styles.amountCol}>{formatAmount(s.totalDonated)}</td>
                        <td>{formatDate(s.lastDonationDate)}</td>
                        <td>
                          {churnMap.has(s.supporterId) ? (
                            <span
                              className={styles.riskBadge}
                              style={{
                                color: churnColor(churnMap.get(s.supporterId)!.scoreLabel),
                                background: `${churnColor(churnMap.get(s.supporterId)!.scoreLabel)}14`,
                                borderColor: `${churnColor(churnMap.get(s.supporterId)!.scoreLabel)}40`,
                              }}
                            >
                              {churnMap.get(s.supporterId)!.scoreLabel}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={supporters.page}
                pageSize={supporters.pageSize}
                totalCount={riskFilter ? filteredSupporters.length : supporters.totalCount}
                onPageChange={p => setParam('page', String(p))}
              />
            </>
          )}
        </div>
        );
      })()}

      {/* Partners Table */}
      {activeTab === 'partners' && (
        <div className={styles.tableCard}>
          {pLoading ? (
            <div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div>
          ) : pError ? (
            <div className={styles.error}>{pError}</div>
          ) : !partners || partners.items.length === 0 ? (
            <div className={styles.empty}>No partners found</div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Area of Interest</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Since</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.items.map(p => (
                      <tr key={p.partnerId} onClick={() => navigate(`/admin/partners/${p.partnerId}`)} style={{ cursor: 'pointer' }}>
                        <td>
                          <span className={styles.supporterName}>{p.partnerName ?? 'Unnamed'}</span>
                          {p.partnerName !== p.contactName && p.contactName && (
                            <span className={styles.supporterOrg}>{p.contactName}</span>
                          )}
                        </td>
                        <td>{p.partnerType ? <span className={styles.typeBadge}>{p.partnerType}</span> : '--'}</td>
                        <td>{p.roleType ? <span className={styles.typeBadge}>{formatEnumLabel(p.roleType)}</span> : '--'}</td>
                        <td>{p.email ?? '--'}</td>
                        <td><span className={statusClassName(p.status)}>{p.status ?? '--'}</span></td>
                        <td>{formatDate(p.startDate)}</td>
                        <td className={styles.notesCol}>{p.notes ? (p.notes.length > 40 ? p.notes.slice(0, 40) + '...' : p.notes) : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={partners.page}
                pageSize={partners.pageSize}
                totalCount={partners.totalCount}
                onPageChange={p => setParam('page', String(p))}
              />
            </>
          )}
        </div>
      )}

      {/* Donations Table */}
      {activeTab === 'donations' && (
        <div className={styles.tableCard}>
          {dLoading ? (
            <div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div>
          ) : dError ? (
            <div className={styles.error}>{dError}</div>
          ) : !donations || donations.items.length === 0 ? (
            <div className={styles.empty}>No donations found</div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Supporter</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Campaign</th>
                      <th>Recurring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.items.map(d => (
                      <tr key={d.donationId} onClick={isAdmin ? () => navigate(`/admin/donations/${d.donationId}/edit`) : undefined} style={isAdmin ? undefined : { cursor: 'default' }}>
                        <td>
                          <span className={styles.donationName}>{d.supporterName ?? 'Anonymous'}</span>
                        </td>
                        <td>{d.donationType ? <span className={styles.typeBadge}>{formatEnumLabel(d.donationType)}</span> : '--'}</td>
                        <td className={styles.amountCol}>
                          {d.amount ? formatAmount(d.amount) : d.estimatedValue ? `${formatAmount(d.estimatedValue)} est.` : d.impactUnit ?? '--'}
                        </td>
                        <td>{formatDate(d.donationDate)}</td>
                        <td>{d.campaignName ?? '--'}</td>
                        <td>{d.isRecurring ? <span className={styles.recurringBadge}>Recurring</span> : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={donations.page}
                pageSize={donations.pageSize}
                totalCount={donations.totalCount}
                onPageChange={p => setParam('page', String(p))}
              />
            </>
          )}
        </div>
      )}

      {/* Allocations View */}
      {activeTab === 'allocations' && (
        <>
          {allocLoading ? (
            <div className={styles.tableCard}>
              <div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div>
            </div>
          ) : allocError ? (
            <div className={styles.tableCard}>
              <div className={styles.error}>{allocError}</div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              {allocSummary && (
                <div className={styles.summaryRow}>
                  <div className={styles.summaryCard}>
                    <DollarSign size={18} className={styles.summaryIconGreen} />
                    <div>
                      <div className={styles.summaryLabel}>Total Donated</div>
                      <div className={styles.summaryValue}>{formatAmount(allocSummary.totalDonated)}</div>
                      <div className={styles.summaryMeta}>This year: {formatAmount(allocSummary.donatedThisYear)}</div>
                    </div>
                  </div>
                  <div className={styles.summaryCard}>
                    <PiggyBank size={18} className={styles.summaryIconBlue} />
                    <div>
                      <div className={styles.summaryLabel}>Total Allocated</div>
                      <div className={styles.summaryValue}>{formatAmount(allocSummary.totalAllocated)}</div>
                      <div className={styles.summaryMeta}>This year: {formatAmount(allocSummary.allocatedThisYear)}</div>
                    </div>
                  </div>
                  <div className={styles.summaryCard}>
                    <CircleDollarSign size={18} className={styles.summaryIconAmber} />
                    <div>
                      <div className={styles.summaryLabel}>Unallocated</div>
                      <div className={styles.summaryValue}>{formatAmount(allocSummary.unallocated)}</div>
                      <div className={styles.summaryMeta}>This year: {formatAmount(allocSummary.unallocatedThisYear)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Allocate Funds button + form */}
              {isStaffOrAdmin && (
                <div style={{ marginBottom: '1rem' }}>
                  {!showAllocForm ? (
                    <button className={styles.btnPrimary} onClick={() => setShowAllocForm(true)}>
                      <Plus size={15} />
                      Allocate Funds
                    </button>
                  ) : (
                    <div className={styles.allocFormCard}>
                      <h3 className={styles.allocTitle}>Allocate Funds</h3>
                      <form onSubmit={handleAllocate} className={styles.allocForm}>
                        <div className={styles.allocFormGrid}>
                          <div className={styles.allocField}>
                            <label className={styles.allocLabel}>Amount *</label>
                            <input
                              className={styles.allocInput}
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0.00"
                              value={allocAmount}
                              onChange={e => setAllocAmount(e.target.value)}
                            />
                          </div>
                          <div className={styles.allocField}>
                            <label className={styles.allocLabel}>Program Area *</label>
                            <Dropdown
                              value={allocProgram}
                              placeholder="Select program"
                              options={PROGRAM_AREAS.map(p => ({ value: p, label: p }))}
                              onChange={v => setAllocProgram(v)}
                            />
                          </div>
                          <div className={styles.allocField}>
                            <label className={styles.allocLabel}>Safehouse</label>
                            <Dropdown
                              value={allocSafehouseId}
                              placeholder="Optional"
                              options={[
                                { value: '', label: 'None' },
                                ...safehouseOptions.map(s => ({
                                  value: String(s.safehouseId),
                                  label: `${s.safehouseCode} - ${s.name}`,
                                })),
                              ]}
                              onChange={v => setAllocSafehouseId(v)}
                            />
                          </div>
                          <div className={styles.allocField}>
                            <label className={styles.allocLabel}>Date *</label>
                            <input
                              className={styles.allocInput}
                              type="date"
                              required
                              value={allocDate}
                              onChange={e => setAllocDate(e.target.value)}
                            />
                          </div>
                          <div className={styles.allocField}>
                            <label className={styles.allocLabel}>Notes</label>
                            <input
                              className={styles.allocInput}
                              placeholder="Optional notes"
                              value={allocNotes}
                              onChange={e => setAllocNotes(e.target.value)}
                            />
                          </div>
                        </div>
                        {allocFormError && <p className={styles.error} style={{ textAlign: 'left', padding: '0.25rem 0 0' }}>{allocFormError}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button type="button" className={styles.btnSecondary} onClick={() => setShowAllocForm(false)}>Cancel</button>
                          <button type="submit" className={styles.btnPrimary} disabled={allocSaving}>
                            {allocSaving ? <Loader2 size={14} className={styles.spinner} /> : <Plus size={14} />}
                            {allocSaving ? 'Saving...' : 'Create Allocation'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* By Program & By Safehouse */}
              <div className={styles.tableCard}>
                <div className={styles.allocGrid}>
                  <div>
                    <h3 className={styles.allocTitle}>By Program Area</h3>
                    {allocByProgram.length === 0 ? (
                      <div className={styles.empty}>No allocation data</div>
                    ) : (
                      <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Program Area</th>
                              <th>This Year</th>
                              <th>All Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allocByProgram.map(a => (
                              <tr key={a.programArea}>
                                <td>{a.programArea}</td>
                                <td className={styles.amountCol}>{formatAmount(a.totalAllocatedThisYear)}</td>
                                <td className={styles.amountCol}>{formatAmount(a.totalAllocated)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className={styles.allocTitle}>By Safehouse</h3>
                    {allocBySafehouse.length === 0 ? (
                      <div className={styles.empty}>No allocation data</div>
                    ) : (
                      <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Safehouse</th>
                              <th>This Year</th>
                              <th>All Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allocBySafehouse.map(a => (
                              <tr key={a.safehouseId}>
                                <td>{a.safehouseName}</td>
                                <td className={styles.amountCol}>{formatAmount(a.totalAllocatedThisYear)}</td>
                                <td className={styles.amountCol}>{formatAmount(a.totalAllocated)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Allocations */}
              {recentAllocs.length > 0 && (
                <div className={styles.tableCard} style={{ marginTop: '1.25rem' }}>
                  <div style={{ padding: '1.25rem 1.25rem 0' }}>
                    <h3 className={styles.allocTitle}>Recent Allocations</h3>
                  </div>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Safehouse</th>
                          <th>Program</th>
                          <th>Amount</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAllocs.map(a => (
                          <tr key={a.allocationId}>
                            <td>{a.allocationDate ? formatDate(a.allocationDate) : '—'}</td>
                            <td>{a.safehouseName || '—'}</td>
                            <td>{a.programArea || '—'}</td>
                            <td className={styles.amountCol}>{formatAmount(a.amountAllocated ?? 0)}</td>
                            <td className={styles.notesCol}>{a.allocationNotes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

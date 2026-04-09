import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Loader2, X } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatAmount, formatEnumLabel } from '../../constants';
import Pagination from '../../components/admin/Pagination';
import { SUPPORTER_TYPES, SUPPORTER_STATUSES, DONATION_TYPES } from '../../domain';
import styles from './DonorsPage.module.css';

/* ── Types ──────────────────────────────────────────────── */

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
  totalAllocated: number;
  count: number;
}

interface AllocationBySafehouse {
  safehouseId: number;
  safehouseName: string;
  totalAllocated: number;
  count: number;
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const STATUSES = SUPPORTER_STATUSES;

/* ── Component ──────────────────────────────────────────── */

export default function DonorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

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

  // Allocations state
  const [allocByProgram, setAllocByProgram] = useState<AllocationByProgram[]>([]);
  const [allocBySafehouse, setAllocBySafehouse] = useState<AllocationBySafehouse[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState<string | null>(null);

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
      const [byProgram, bySafehouse] = await Promise.all([
        apiFetch<AllocationByProgram[]>('/api/admin/allocations/by-program'),
        apiFetch<AllocationBySafehouse[]>('/api/admin/allocations/by-safehouse'),
      ]);
      setAllocByProgram(byProgram);
      setAllocBySafehouse(bySafehouse);
    } catch (e) {
      setAllocError(e instanceof Error ? e.message : 'Failed to load allocations');
    } finally {
      setAllocLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'supporters') fetchSupporters();
    else if (activeTab === 'partners') fetchPartners();
    else if (activeTab === 'donations') fetchDonations();
    else fetchAllocations();
  }, [activeTab, fetchSupporters, fetchPartners, fetchDonations, fetchAllocations]);

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

  const hasFilters = search || supporterType || status || donationType;

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
            <select
              className={styles.filterSelect}
              value={supporterType}
              onChange={e => setParam('supporterType', e.target.value)}
            >
              <option value="">All Types</option>
              {SUPPORTER_TYPES.map(t => <option key={t} value={t}>{formatEnumLabel(t)}</option>)}
            </select>
            <select
              className={styles.filterSelect}
              value={status}
              onChange={e => setParam('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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
            <select
              className={styles.filterSelect}
              value={supporterType}
              onChange={e => setParam('supporterType', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Organization">Organization</option>
              <option value="Individual">Individual</option>
            </select>
            <select
              className={styles.filterSelect}
              value={status}
              onChange={e => setParam('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Prospective">Prospective</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </>
        )}
        {activeTab === 'donations' && (
          <select
            className={styles.filterSelect}
            value={donationType}
            onChange={e => setParam('donationType', e.target.value)}
          >
            <option value="">All Types</option>
            {DONATION_TYPES.map(t => <option key={t} value={t}>{formatEnumLabel(t)}</option>)}
          </select>
        )}
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Supporters Table */}
      {activeTab === 'supporters' && (
        <div className={styles.tableCard}>
          {sLoading ? (
            <div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div>
          ) : sError ? (
            <div className={styles.error}>{sError}</div>
          ) : !supporters || supporters.items.length === 0 ? (
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
                    </tr>
                  </thead>
                  <tbody>
                    {supporters.items.map(s => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={supporters.page}
                pageSize={supporters.pageSize}
                totalCount={supporters.totalCount}
                onPageChange={p => setParam('page', String(p))}
              />
            </>
          )}
        </div>
      )}

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
                      <tr key={d.donationId} onClick={() => navigate(`/admin/donations/${d.donationId}/edit`)}>
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
        <div className={styles.tableCard}>
          {allocLoading ? (
            <div className={styles.loading}><Loader2 size={28} className={styles.spinner} /></div>
          ) : allocError ? (
            <div className={styles.error}>{allocError}</div>
          ) : (
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
                          <th>Donations</th>
                          <th>Total Allocated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocByProgram.map(a => (
                          <tr key={a.programArea}>
                            <td>{a.programArea}</td>
                            <td>{a.count}</td>
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
                          <th>Donations</th>
                          <th>Total Allocated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocBySafehouse.map(a => (
                          <tr key={a.safehouseId}>
                            <td>{a.safehouseName}</td>
                            <td>{a.count}</td>
                            <td className={styles.amountCol}>{formatAmount(a.totalAllocated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

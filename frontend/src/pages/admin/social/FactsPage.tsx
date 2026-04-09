import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, Search, Check, X, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../../api';
import styles from './FactsPage.module.css';

interface ContentFact {
  contentFactId: number;
  factText: string;
  sourceName: string;
  sourceUrl: string | null;
  category: string;
  pillar: string;
  usageCount: number;
}

interface FactCandidate {
  contentFactCandidateId: number;
  factText: string;
  sourceName: string;
  sourceUrl: string | null;
  category: string;
  status: string;
}

const CATEGORIES = ['trafficking_stats', 'abuse_stats', 'rehabilitation', 'policy', 'regional'];
const PILLARS = ['the_problem', 'the_solution'];

export default function FactsPage() {
  const [tab, setTab] = useState<'facts' | 'candidates'>('facts');
  const [facts, setFacts] = useState<ContentFact[]>([]);
  const [candidates, setCandidates] = useState<FactCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newFact, setNewFact] = useState({ factText: '', sourceName: '', sourceUrl: '', category: 'trafficking_stats', pillar: 'the_problem' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [f, c] = await Promise.all([
        apiFetch<ContentFact[]>('/api/admin/social/facts'),
        apiFetch<FactCandidate[]>('/api/admin/social/fact-candidates?status=pending'),
      ]);
      setFacts(f);
      setCandidates(c);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function addFact() {
    if (!newFact.factText.trim()) return;
    await apiFetch('/api/admin/social/facts', { method: 'POST', body: JSON.stringify(newFact) });
    setNewFact({ factText: '', sourceName: '', sourceUrl: '', category: 'trafficking_stats', pillar: 'the_problem' });
    setShowAdd(false);
    fetchAll();
  }

  async function deleteFact(id: number) {
    if (!confirm('Delete this fact?')) return;
    await apiFetch(`/api/admin/social/facts/${id}`, { method: 'DELETE' });
    setFacts(prev => prev.filter(f => f.contentFactId !== id));
  }

  async function approveCandidate(id: number) {
    await apiFetch(`/api/admin/social/fact-candidates/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ pillar: 'the_problem' }) });
    fetchAll();
  }

  async function rejectCandidate(id: number) {
    await apiFetch(`/api/admin/social/fact-candidates/${id}/reject`, { method: 'PATCH', body: '{}' });
    setCandidates(prev => prev.filter(c => c.contentFactCandidateId !== id));
  }

  async function refreshResearch() {
    setRefreshing(true);
    try {
      await apiFetch('/api/admin/social/research-refresh', { method: 'POST', body: JSON.stringify({ categories: ['trafficking_stats', 'rehabilitation', 'regional'] }) });
      setTab('candidates');
      fetchAll();
    } finally { setRefreshing(false); }
  }

  if (loading) return <div className={styles.loading}><Loader2 className={styles.spin} size={24} /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fact Database</h1>
        <div className={styles.headerActions}>
          <button onClick={() => setShowAdd(!showAdd)} className={styles.addBtn}><Plus size={14} /> Add Fact</button>
          <button onClick={refreshResearch} disabled={refreshing} className={styles.refreshBtn}>
            <RefreshCw size={14} className={refreshing ? styles.spin : ''} /> Research
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'facts' ? styles.tabActive : ''}`} onClick={() => setTab('facts')}>
          Curated Facts ({facts.length})
        </button>
        <button className={`${styles.tab} ${tab === 'candidates' ? styles.tabActive : ''}`} onClick={() => setTab('candidates')}>
          Candidates {candidates.length > 0 && <span className={styles.badge}>{candidates.length}</span>}
        </button>
      </div>

      {showAdd && (
        <div className={styles.addForm}>
          <textarea placeholder="The fact or statistic..." value={newFact.factText} onChange={e => setNewFact({ ...newFact, factText: e.target.value })} rows={2} />
          <div className={styles.addRow}>
            <input placeholder="Source name" value={newFact.sourceName} onChange={e => setNewFact({ ...newFact, sourceName: e.target.value })} />
            <input placeholder="Source URL (optional)" value={newFact.sourceUrl} onChange={e => setNewFact({ ...newFact, sourceUrl: e.target.value })} />
          </div>
          <div className={styles.addRow}>
            <select value={newFact.category} onChange={e => setNewFact({ ...newFact, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <select value={newFact.pillar} onChange={e => setNewFact({ ...newFact, pillar: e.target.value })}>
              {PILLARS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
            </select>
            <button onClick={addFact} className={styles.submitBtn}>Add</button>
          </div>
        </div>
      )}

      {tab === 'facts' && (
        <div className={styles.list}>
          {facts.length === 0 ? <div className={styles.empty}>No facts yet. Add some or run a research refresh.</div> : facts.map(f => (
            <div key={f.contentFactId} className={styles.factCard}>
              <div className={styles.factContent}>
                <p className={styles.factText}>{f.factText}</p>
                <div className={styles.factMeta}>
                  <span className={styles.source}>{f.sourceName}</span>
                  <span className={styles.category}>{f.category.replace('_', ' ')}</span>
                  <span className={styles.pillar}>{f.pillar.replace('_', ' ')}</span>
                  <span className={styles.usage}>Used {f.usageCount}x</span>
                </div>
              </div>
              <button onClick={() => deleteFact(f.contentFactId)} className={styles.deleteBtn}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'candidates' && (
        <div className={styles.list}>
          {candidates.length === 0 ? <div className={styles.empty}>No pending candidates. Click "Research" to find new facts.</div> : candidates.map(c => (
            <div key={c.contentFactCandidateId} className={styles.factCard}>
              <div className={styles.factContent}>
                <p className={styles.factText}>{c.factText}</p>
                <div className={styles.factMeta}>
                  <span className={styles.source}>{c.sourceName}</span>
                  <span className={styles.category}>{c.category}</span>
                </div>
              </div>
              <div className={styles.candidateActions}>
                <button onClick={() => approveCandidate(c.contentFactCandidateId)} className={styles.approveBtn}><Check size={14} /></button>
                <button onClick={() => rejectCandidate(c.contentFactCandidateId)} className={styles.rejectBtn}><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Plus, Trash2, X, Check, RefreshCw, HelpCircle } from 'lucide-react';
import { apiFetch } from '../../../api';
import TextArea from '../../../components/admin/TextArea';
import Dropdown from '../../../components/admin/Dropdown';
import Checkbox from '../../../components/admin/Checkbox';
import styles from './SocialSetupPage.module.css';

interface VoiceGuide { orgDescription: string; toneDescription: string; preferredTerms: string; avoidedTerms: string; structuralRules: string; visualRules: string; }
interface TalkingPoint { contentTalkingPointId: number; text: string; topic: string; usageCount: number; }
interface ContentFact { contentFactId: number; factText: string; sourceName: string; category: string; pillar: string; usageCount: number; }
interface FactCandidate { contentFactCandidateId: number; factText: string; sourceName: string; category: string; status: string; }
interface HashtagSet { hashtagSetId: number; name: string; pillar: string; platform: string; hashtags: string; }
interface Settings { postsPerWeek: number; platformsActive: string; timezone: string; recyclingEnabled: boolean; pillarRatioSafehouseLife: number; pillarRatioTheProblem: number; pillarRatioTheSolution: number; pillarRatioDonorImpact: number; pillarRatioCallToAction: number; }

const TOPICS = ['counseling', 'education', 'health', 'staffing', 'safehouse_model', 'reintegration', 'general'];
const PILLAR_TOOLTIPS: Record<string, string> = {
  pillarRatioSafehouseLife: 'Photos and stories from daily life — builds emotional connection.',
  pillarRatioTheProblem: 'Educational content about trafficking and abuse — motivates new donors.',
  pillarRatioTheSolution: 'What your org does — builds credibility.',
  pillarRatioDonorImpact: 'Shows supporters their money matters — retains donors.',
  pillarRatioCallToAction: 'Fundraising asks — kept low so followers don\'t feel sold to.',
};

function TermsList({ value, onChange, placeholder, showNotes }: { value: string; onChange: (v: string) => void; placeholder: string; showNotes: boolean }) {
  let items: { key: string; note: string }[] = [];
  try { const p = JSON.parse(value || '{}'); items = Object.entries(p).map(([k, v]) => ({ key: k, note: typeof v === 'string' ? v : '' })); } catch {}
  const [term, setTerm] = useState('');
  const [note, setNote] = useState('');
  function add() {
    if (!term.trim()) return;
    try { const p = JSON.parse(value || '{}'); p[term.trim()] = showNotes ? (note.trim() || true) : true; onChange(JSON.stringify(p)); } catch { onChange(JSON.stringify({ [term.trim()]: true })); }
    setTerm(''); setNote('');
  }
  function remove(k: string) { try { const p = JSON.parse(value || '{}'); delete p[k]; onChange(JSON.stringify(p)); } catch {} }
  return (
    <div className={styles.termsList}>
      {items.length > 0 && <div className={styles.chips}>{items.map(i => (
        <span key={i.key} className={styles.chip}>{showNotes && i.note ? `${i.key} (${i.note})` : i.key}<button onClick={() => remove(i.key)} title="Remove"><X size={11} /></button></span>
      ))}</div>}
      <div className={styles.termsAdd}>
        <input placeholder={placeholder} value={term} onChange={e => setTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        {showNotes && <input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />}
        <button onClick={add} className={styles.addChipBtn} title="Add"><Plus size={14} /></button>
      </div>
    </div>
  );
}

export default function SocialSetupPage() {
  const [tab, setTab] = useState<'voice' | 'content' | 'preferences'>('voice');
  const [guide, setGuide] = useState<VoiceGuide>({ orgDescription: '', toneDescription: '', preferredTerms: '{}', avoidedTerms: '{}', structuralRules: '', visualRules: '' });
  const [points, setPoints] = useState<TalkingPoint[]>([]);
  const [facts, setFacts] = useState<ContentFact[]>([]);
  const [deleteFactId, setDeleteFactId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<FactCandidate[]>([]);
  const [, setHashtagSets] = useState<HashtagSet[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPoint, setNewPoint] = useState({ text: '', topic: 'general' });
  const [newFact, setNewFact] = useState({ factText: '', sourceName: '', category: 'trafficking_stats', pillar: 'the_problem' });
  const [showAddFact, setShowAddFact] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [g, p, f, c, h, s] = await Promise.all([
        apiFetch<VoiceGuide>('/api/admin/social/voice-guide'),
        apiFetch<TalkingPoint[]>('/api/admin/social/talking-points'),
        apiFetch<ContentFact[]>('/api/admin/social/facts'),
        apiFetch<FactCandidate[]>('/api/admin/social/fact-candidates?status=pending'),
        apiFetch<HashtagSet[]>('/api/admin/social/hashtag-sets'),
        apiFetch<Settings>('/api/admin/social/settings'),
      ]);
      if (g && 'orgDescription' in g) setGuide(g);
      setPoints(p); setFacts(f); setCandidates(c); setHashtagSets(h); setSettings(s);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function saveVoice() { setSaving(true); await apiFetch('/api/admin/social/voice-guide', { method: 'PUT', body: JSON.stringify(guide) }); setSaved(true); setTimeout(() => setSaved(false), 2000); setSaving(false); }
  async function saveSettings() { if (!settings) return; setSaving(true); await apiFetch('/api/admin/social/settings', { method: 'PUT', body: JSON.stringify(settings) }); setSaved(true); setTimeout(() => setSaved(false), 2000); setSaving(false); }
  async function addPoint() { if (!newPoint.text.trim()) return; await apiFetch('/api/admin/social/talking-points', { method: 'POST', body: JSON.stringify(newPoint) }); setNewPoint({ text: '', topic: 'general' }); fetchAll(); }
  async function deletePoint(id: number) { await apiFetch(`/api/admin/social/talking-points/${id}`, { method: 'DELETE' }); setPoints(p => p.filter(x => x.contentTalkingPointId !== id)); }
  async function addFact() { if (!newFact.factText.trim()) return; await apiFetch('/api/admin/social/facts', { method: 'POST', body: JSON.stringify(newFact) }); setNewFact({ factText: '', sourceName: '', category: 'trafficking_stats', pillar: 'the_problem' }); setShowAddFact(false); fetchAll(); }
  async function confirmDeleteFact() { if (!deleteFactId) return; await apiFetch(`/api/admin/social/facts/${deleteFactId}`, { method: 'DELETE' }); setFacts(f => f.filter(x => x.contentFactId !== deleteFactId)); setDeleteFactId(null); }
  async function approveCandidate(id: number) { await apiFetch(`/api/admin/social/fact-candidates/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ pillar: 'the_problem' }) }); fetchAll(); }
  async function rejectCandidate(id: number) { await apiFetch(`/api/admin/social/fact-candidates/${id}/reject`, { method: 'PATCH', body: '{}' }); setCandidates(c => c.filter(x => x.contentFactCandidateId !== id)); }
  async function refreshResearch() { setRefreshing(true); try { await apiFetch('/api/admin/social/research-refresh', { method: 'POST', body: '{}' }); fetchAll(); } finally { setRefreshing(false); } }

  if (loading) return <div className={styles.loading}><Loader2 className={styles.spin} size={24} /></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Setup</h1>
      <p className={styles.subtitle}>Configure how the AI creates your social media content.</p>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'voice' ? styles.tabActive : ''}`} onClick={() => setTab('voice')}>Voice & Brand</button>
        <button className={`${styles.tab} ${tab === 'content' ? styles.tabActive : ''}`} onClick={() => setTab('content')}>Content Library</button>
        <button className={`${styles.tab} ${tab === 'preferences' ? styles.tabActive : ''}`} onClick={() => setTab('preferences')}>Preferences</button>
      </div>

      {/* ── Voice & Brand ── */}
      {tab === 'voice' && (
        <div className={styles.form}>
          <div className={styles.field}>
            <label>About Your Organization</label>
            <p className={styles.hint}>Describe your mission. The AI uses this to understand who you are.</p>
            <TextArea rows={3} value={guide.orgDescription} onChange={e => setGuide({ ...guide, orgDescription: e.target.value })} placeholder="We operate safe homes for girls who are survivors of trafficking, providing shelter, counseling, education, and a path to a new life." />
          </div>
          <div className={styles.field}>
            <label>Tone</label>
            <p className={styles.hint}>How should your posts sound?</p>
            <TextArea rows={2} value={guide.toneDescription} onChange={e => setGuide({ ...guide, toneDescription: e.target.value })} placeholder="Warm, hopeful, and direct. Never clinical or bureaucratic." />
          </div>
          <div className={styles.field}>
            <label>Preferred Language</label>
            <p className={styles.hint}>Words the AI should use.</p>
            <TermsList value={guide.preferredTerms} onChange={v => setGuide({ ...guide, preferredTerms: v })} placeholder='e.g. "residents"' showNotes />
          </div>
          <div className={styles.field}>
            <label>Language to Avoid</label>
            <p className={styles.hint}>Words the AI should never use.</p>
            <TermsList value={guide.avoidedTerms} onChange={v => setGuide({ ...guide, avoidedTerms: v })} placeholder="e.g. guilt language" showNotes={false} />
          </div>
          <div className={styles.field}>
            <label>Content Rules</label>
            <p className={styles.hint}>Rules the AI follows. One per line.</p>
            <TextArea rows={3} value={guide.structuralRules} onChange={e => setGuide({ ...guide, structuralRules: e.target.value })} placeholder={"Always end awareness posts with hope.\nNever post just a sad statistic alone."} />
          </div>
          <div className={styles.field}>
            <label>Photo Rules</label>
            <p className={styles.hint}>Rules for which photos can be used.</p>
            <TextArea rows={2} value={guide.visualRules} onChange={e => setGuide({ ...guide, visualRules: e.target.value })} placeholder="No identifiable faces without consent." />
          </div>
          <button className={styles.saveBtn} onClick={saveVoice} disabled={saving}>{saving ? <Loader2 className={styles.spin} size={16} /> : saved ? 'Saved!' : <><Save size={16} /> Save</>}</button>
        </div>
      )}

      {/* ── Content Library ── */}
      {tab === 'content' && (
        <div className={styles.form}>
          {/* Facts */}
          <div className={styles.contentSection}>
            <div className={styles.contentHeader}>
              <h3>Facts & Statistics</h3>
              <div className={styles.contentActions}>
                <button onClick={() => setShowAddFact(!showAddFact)} className={styles.smallBtn}><Plus size={14} /> Add</button>
                <button onClick={refreshResearch} disabled={refreshing} className={styles.smallBtn}><RefreshCw size={14} className={refreshing ? styles.spin : ''} /> Research</button>
              </div>
            </div>
            <p className={styles.hint}>Facts the AI uses in awareness posts. Add your own or let AI find them.</p>
            {showAddFact && (
              <div className={styles.addBlock}>
                <TextArea placeholder="The fact or statistic..." value={newFact.factText} onChange={e => setNewFact({ ...newFact, factText: e.target.value })} rows={2} />
                <div className={styles.addRow}>
                  <input placeholder="Source" value={newFact.sourceName} onChange={e => setNewFact({ ...newFact, sourceName: e.target.value })} />
                  <button onClick={addFact} className={styles.saveBtn}>Add Fact</button>
                </div>
              </div>
            )}
            {candidates.length > 0 && (
              <div className={styles.candidatesBanner}>
                <strong>{candidates.length} new fact{candidates.length !== 1 ? 's' : ''} found by research</strong> — review below
              </div>
            )}
            <div className={styles.itemList}>
              {candidates.map(c => (
                <div key={`c${c.contentFactCandidateId}`} className={styles.itemRow + ' ' + styles.candidateRow}>
                  <div className={styles.itemContent}><p>{c.factText}</p><span className={styles.itemMeta}>{c.sourceName} · Pending review</span></div>
                  <div className={styles.itemActions}>
                    <button onClick={() => approveCandidate(c.contentFactCandidateId)} className={styles.approveChip} title="Approve"><Check size={13} /></button>
                    <button onClick={() => rejectCandidate(c.contentFactCandidateId)} className={styles.rejectChip} title="Reject"><X size={13} /></button>
                  </div>
                </div>
              ))}
              {facts.map(f => (
                <div key={`f${f.contentFactId}`} className={styles.itemRow}>
                  <div className={styles.itemContent}><p>{f.factText}</p><span className={styles.itemMeta}>{f.sourceName}{f.usageCount > 0 ? ` · Used ${f.usageCount}x` : ''}</span></div>
                  <button onClick={() => setDeleteFactId(f.contentFactId)} className={styles.deleteChip} title="Delete"><Trash2 size={13} /></button>
                </div>
              ))}
              {facts.length === 0 && candidates.length === 0 && <p className={styles.emptyHint}>No facts yet. Add some or click "Research" to find them.</p>}
            </div>
          </div>

          {/* Talking Points */}
          <div className={styles.contentSection}>
            <h3>Talking Points</h3>
            <p className={styles.hint}>Statements about what your organization does. Used in "Our Work" posts.</p>
            <div className={styles.addRow}>
              <input placeholder="e.g. Each resident gets a personalized rehabilitation plan" value={newPoint.text} onChange={e => setNewPoint({ ...newPoint, text: e.target.value })} onKeyDown={e => e.key === 'Enter' && addPoint()} />
              <Dropdown
                value={newPoint.topic}
                options={TOPICS.map(t => ({ value: t, label: t.replace('_', ' ') }))}
                onChange={v => setNewPoint({ ...newPoint, topic: v })}
              />
              <button onClick={addPoint} className={styles.saveBtn}>Add</button>
            </div>
            <div className={styles.itemList}>
              {points.map(p => (
                <div key={p.contentTalkingPointId} className={styles.itemRow}>
                  <div className={styles.itemContent}><p>{p.text}</p><span className={styles.itemMeta}>{p.topic.replace('_', ' ')}{p.usageCount > 0 ? ` · Used ${p.usageCount}x` : ''}</span></div>
                  <button onClick={() => deletePoint(p.contentTalkingPointId)} className={styles.deleteChip} title="Delete"><Trash2 size={13} /></button>
                </div>
              ))}
              {points.length === 0 && <p className={styles.emptyHint}>No talking points yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences ── */}
      {tab === 'preferences' && settings && (
        <div className={styles.form}>
          <div className={styles.field}>
            <label>Posts per week</label>
            <p className={styles.hint}>How many posts should the AI generate each week?</p>
            <input type="number" min={1} max={50} value={settings.postsPerWeek} onChange={e => setSettings({ ...settings, postsPerWeek: parseInt(e.target.value) || 10 })} className={styles.numberInput} />
          </div>
          <div className={styles.field}>
            <label>Active platforms</label>
            <div className={styles.checkboxRow}>
              {['instagram', 'facebook', 'twitter'].map(p => {
                const active = (settings.platformsActive || '').includes(p);
                return (
                  <Checkbox
                    key={p}
                    checked={active}
                    label={p.charAt(0).toUpperCase() + p.slice(1)}
                    onChange={() => {
                      let cur: string[] = []; try { cur = JSON.parse(settings.platformsActive || '[]'); } catch {}
                      const next = active ? cur.filter(x => x !== p) : [...cur, p];
                      setSettings({ ...settings, platformsActive: JSON.stringify(next) });
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div className={styles.field}>
            <label>Timezone</label>
            <Dropdown
              value={settings.timezone || ''}
              placeholder="Select..."
              options={[
                { value: 'America/Los_Angeles', label: 'Pacific (UTC-8)' },
                { value: 'America/Denver', label: 'Mountain (UTC-7)' },
                { value: 'America/Chicago', label: 'Central (UTC-6)' },
                { value: 'America/New_York', label: 'Eastern (UTC-5)' },
                { value: 'Asia/Manila', label: 'Manila (UTC+8)' },
                { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
                { value: 'Europe/London', label: 'London (UTC+0)' },
              ]}
              onChange={v => setSettings({ ...settings, timezone: v })}
            />
          </div>
          <div className={styles.field}>
            <label>Content recycling</label>
            <Checkbox
              checked={settings.recyclingEnabled}
              label="Reuse high-performing posts after rephrasing them"
              onChange={v => setSettings({ ...settings, recyclingEnabled: v })}
            />
          </div>
          <div className={styles.field}>
            <label>Content mix <span className={styles.aiTag}>AI-managed</span></label>
            <p className={styles.hint}>The AI adjusts these over time. Override if needed.</p>
            {([
              ['pillarRatioSafehouseLife', 'Safehouse Life'] as const,
              ['pillarRatioTheProblem', 'Awareness'] as const,
              ['pillarRatioTheSolution', 'Our Work'] as const,
              ['pillarRatioDonorImpact', 'Impact'] as const,
              ['pillarRatioCallToAction', 'Call to Action'] as const,
            ]).map(([key, label]) => (
              <div key={key} className={styles.ratioRow}>
                <span className={styles.ratioLabel}>{label}</span>
                <span className={styles.tooltipWrap}><HelpCircle size={13} className={styles.helpIcon} /><span className={styles.tooltip}>{PILLAR_TOOLTIPS[key]}</span></span>
                <input type="number" min={0} max={100} value={settings[key]} onChange={e => setSettings({ ...settings, [key]: parseInt(e.target.value) || 0 })} className={styles.ratioInput} />
                <span className={styles.pct}>%</span>
              </div>
            ))}
            {(() => {
              const total = settings.pillarRatioSafehouseLife + settings.pillarRatioTheProblem + settings.pillarRatioTheSolution + settings.pillarRatioDonorImpact + settings.pillarRatioCallToAction;
              return <p className={`${styles.hint} ${total !== 100 ? styles.ratioWarn : ''}`}>Total: {total}%{total !== 100 ? ' — should add up to 100%' : ''}</p>;
            })()}
          </div>
          <button className={styles.saveBtn} onClick={saveSettings} disabled={saving}>{saving ? <Loader2 className={styles.spin} size={16} /> : saved ? 'Saved!' : <><Save size={16} /> Save Preferences</>}</button>
        </div>
      )}

      {/* Delete fact confirmation */}
      {deleteFactId && (
        <>
          <div className={styles.dialogBackdrop} onClick={() => setDeleteFactId(null)} />
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>Delete Fact</h3>
            <p className={styles.dialogMessage}>This fact will be permanently removed.</p>
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={() => setDeleteFactId(null)}>Cancel</button>
              <button className={styles.dialogConfirm} onClick={confirmDeleteFact}>Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

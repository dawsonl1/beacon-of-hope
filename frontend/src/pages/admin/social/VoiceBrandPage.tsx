import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, Plus, Trash2, Hash } from 'lucide-react';
import { apiFetch } from '../../../api';
import styles from './VoiceBrandPage.module.css';

interface VoiceGuide {
  orgDescription: string;
  toneDescription: string;
  preferredTerms: string;
  avoidedTerms: string;
  structuralRules: string;
  visualRules: string;
}

interface TalkingPoint {
  contentTalkingPointId: number;
  text: string;
  topic: string;
  usageCount: number;
  isActive: boolean;
}

interface HashtagSet {
  hashtagSetId: number;
  name: string;
  category: string;
  pillar: string;
  platform: string;
  hashtags: string;
}

const TOPICS = ['counseling', 'education', 'health', 'staffing', 'safehouse_model', 'reintegration', 'general'];

export default function VoiceBrandPage() {
  const [tab, setTab] = useState<'voice' | 'points' | 'hashtags'>('voice');
  const [guide, setGuide] = useState<VoiceGuide>({ orgDescription: '', toneDescription: '', preferredTerms: '', avoidedTerms: '', structuralRules: '', visualRules: '' });
  const [points, setPoints] = useState<TalkingPoint[]>([]);
  const [hashtagSets, setHashtagSets] = useState<HashtagSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPoint, setNewPoint] = useState({ text: '', topic: 'general' });
  const [newHashtag, setNewHashtag] = useState({ name: '', pillar: 'all', platform: 'all', hashtags: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [g, p, h] = await Promise.all([
        apiFetch<VoiceGuide>('/api/admin/social/voice-guide'),
        apiFetch<TalkingPoint[]>('/api/admin/social/talking-points'),
        apiFetch<HashtagSet[]>('/api/admin/social/hashtag-sets'),
      ]);
      if (g && typeof g === 'object' && 'orgDescription' in g) setGuide(g);
      setPoints(p);
      setHashtagSets(h);
    } catch { /* handled by empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function saveVoiceGuide() {
    setSaving(true);
    try {
      await apiFetch('/api/admin/social/voice-guide', { method: 'PUT', body: JSON.stringify(guide) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  async function addTalkingPoint() {
    if (!newPoint.text.trim()) return;
    await apiFetch('/api/admin/social/talking-points', { method: 'POST', body: JSON.stringify(newPoint) });
    setNewPoint({ text: '', topic: 'general' });
    fetchAll();
  }

  async function deleteTalkingPoint(id: number) {
    await apiFetch(`/api/admin/social/talking-points/${id}`, { method: 'DELETE' });
    setPoints(prev => prev.filter(p => p.contentTalkingPointId !== id));
  }

  async function addHashtagSet() {
    if (!newHashtag.name.trim()) return;
    await apiFetch('/api/admin/social/hashtag-sets', { method: 'POST', body: JSON.stringify(newHashtag) });
    setNewHashtag({ name: '', pillar: 'all', platform: 'all', hashtags: '' });
    fetchAll();
  }

  async function deleteHashtagSet(id: number) {
    await apiFetch(`/api/admin/social/hashtag-sets/${id}`, { method: 'DELETE' });
    setHashtagSets(prev => prev.filter(h => h.hashtagSetId !== id));
  }

  if (loading) return <div className={styles.loading}><Loader2 className={styles.spin} size={24} /></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Voice & Brand</h1>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'voice' ? styles.tabActive : ''}`} onClick={() => setTab('voice')}>Voice Guide</button>
        <button className={`${styles.tab} ${tab === 'points' ? styles.tabActive : ''}`} onClick={() => setTab('points')}>Talking Points ({points.length})</button>
        <button className={`${styles.tab} ${tab === 'hashtags' ? styles.tabActive : ''}`} onClick={() => setTab('hashtags')}>Hashtags ({hashtagSets.length})</button>
      </div>

      {tab === 'voice' && (
        <div className={styles.voiceForm}>
          <div className={styles.field}>
            <label>Organization Description</label>
            <textarea rows={3} value={guide.orgDescription} onChange={e => setGuide({ ...guide, orgDescription: e.target.value })} placeholder="One paragraph about who you are and what you do..." />
          </div>
          <div className={styles.field}>
            <label>Tone & Voice</label>
            <textarea rows={2} value={guide.toneDescription} onChange={e => setGuide({ ...guide, toneDescription: e.target.value })} placeholder="Warm, hopeful, direct..." />
          </div>
          <div className={styles.field}>
            <label>Preferred Terms (JSON)</label>
            <textarea rows={2} value={guide.preferredTerms} onChange={e => setGuide({ ...guide, preferredTerms: e.target.value })} placeholder='{"residents": "not victims", "supporters": "not donors"}' />
          </div>
          <div className={styles.field}>
            <label>Avoided Terms (JSON)</label>
            <textarea rows={2} value={guide.avoidedTerms} onChange={e => setGuide({ ...guide, avoidedTerms: e.target.value })} placeholder='{"guilt language": true, "graphic descriptions": true}' />
          </div>
          <div className={styles.field}>
            <label>Structural Rules</label>
            <textarea rows={2} value={guide.structuralRules} onChange={e => setGuide({ ...guide, structuralRules: e.target.value })} placeholder="Always end awareness posts with hope..." />
          </div>
          <div className={styles.field}>
            <label>Visual Rules</label>
            <textarea rows={2} value={guide.visualRules} onChange={e => setGuide({ ...guide, visualRules: e.target.value })} placeholder="No identifiable faces without consent..." />
          </div>
          <button className={styles.saveBtn} onClick={saveVoiceGuide} disabled={saving}>
            {saving ? <Loader2 className={styles.spin} size={16} /> : saved ? 'Saved!' : <><Save size={16} /> Save Voice Guide</>}
          </button>
        </div>
      )}

      {tab === 'points' && (
        <div>
          <div className={styles.addRow}>
            <input placeholder="New talking point..." value={newPoint.text} onChange={e => setNewPoint({ ...newPoint, text: e.target.value })} className={styles.addInput} />
            <select value={newPoint.topic} onChange={e => setNewPoint({ ...newPoint, topic: e.target.value })} className={styles.addSelect}>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={addTalkingPoint} className={styles.addBtn}><Plus size={14} /> Add</button>
          </div>
          <div className={styles.list}>
            {points.map(p => (
              <div key={p.contentTalkingPointId} className={styles.listItem}>
                <div className={styles.listContent}>
                  <span className={styles.topicTag}>{p.topic}</span>
                  <p>{p.text}</p>
                  <span className={styles.usageCount}>Used {p.usageCount}x</span>
                </div>
                <button onClick={() => deleteTalkingPoint(p.contentTalkingPointId)} className={styles.deleteBtn}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'hashtags' && (
        <div>
          <div className={styles.addRow}>
            <input placeholder="Set name..." value={newHashtag.name} onChange={e => setNewHashtag({ ...newHashtag, name: e.target.value })} className={styles.addInput} />
            <select value={newHashtag.pillar} onChange={e => setNewHashtag({ ...newHashtag, pillar: e.target.value })} className={styles.addSelect}>
              <option value="all">All pillars</option>
              <option value="safehouse_life">Safehouse Life</option>
              <option value="the_problem">The Problem</option>
              <option value="the_solution">The Solution</option>
              <option value="donor_impact">Donor Impact</option>
              <option value="call_to_action">Call to Action</option>
            </select>
            <select value={newHashtag.platform} onChange={e => setNewHashtag({ ...newHashtag, platform: e.target.value })} className={styles.addSelect}>
              <option value="all">All platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
            </select>
          </div>
          <div className={styles.addRow}>
            <input placeholder='Hashtags JSON: ["#tag1","#tag2"]' value={newHashtag.hashtags} onChange={e => setNewHashtag({ ...newHashtag, hashtags: e.target.value })} className={styles.addInput} style={{ flex: 1 }} />
            <button onClick={addHashtagSet} className={styles.addBtn}><Plus size={14} /> Add</button>
          </div>
          <div className={styles.list}>
            {hashtagSets.map(h => (
              <div key={h.hashtagSetId} className={styles.listItem}>
                <div className={styles.listContent}>
                  <div className={styles.hashHeader}>
                    <Hash size={14} />
                    <strong>{h.name}</strong>
                    <span className={styles.hashMeta}>{h.pillar} · {h.platform}</span>
                  </div>
                  <p className={styles.hashTags}>{h.hashtags}</p>
                </div>
                <button onClick={() => deleteHashtagSet(h.hashtagSetId)} className={styles.deleteBtn}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

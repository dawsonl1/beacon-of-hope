import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, Clock, Edit3, ThumbsUp, ThumbsDown, Copy, ExternalLink, BarChart2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { apiFetch } from '../../../api';
import styles from './SocialPostsPage.module.css';

interface Post {
  automatedPostId: number;
  content: string;
  originalContent: string | null;
  contentPillar: string;
  source: string;
  status: string;
  platform: string;
  scheduledAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  engagementLikes: number | null;
  engagementShares: number | null;
  engagementComments: number | null;
  engagementDonations: number | null;
  createdAt: string;
  updatedAt: string | null;
}

const PILLAR_LABELS: Record<string, string> = {
  safehouse_life: 'Safehouse Life',
  the_problem: 'Awareness',
  the_solution: 'Our Work',
  donor_impact: 'Impact',
  call_to_action: 'Call to Action',
};

const PILLAR_COLORS: Record<string, string> = {
  safehouse_life: '#0f8f7d',
  the_problem: '#d63031',
  the_solution: '#0984e3',
  donor_impact: '#ff9f43',
  call_to_action: '#6c5ce7',
};

function getMonthDays(offset: number): { days: Date[]; month: number; year: number } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const month = target.getMonth();
  const year = target.getFullYear();
  const firstDay = new Date(year, month, 1);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday = 0
  const start = new Date(firstDay);
  start.setDate(start.getDate() - startPad);
  // Always show 6 weeks (42 days) for consistent grid
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  return { days, month, year };
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function SocialPostsPage() {
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [ready, setReady] = useState<Post[]>([]);
  const [published, setPublished] = useState<Post[]>([]);
  const [scheduled, setScheduled] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [engagementId, setEngagementId] = useState<number | null>(null);
  const [engagement, setEngagement] = useState({ likes: 0, shares: 0, comments: 0, donations: 0 });
  const [monthOffset, setMonthOffset] = useState(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r, p, cal] = await Promise.all([
        apiFetch<Post[]>('/api/admin/social/posts?status=draft'),
        apiFetch<Post[]>('/api/admin/social/posts?status=ready_to_publish'),
        apiFetch<Post[]>('/api/admin/social/posts?status=published&pageSize=10'),
        apiFetch<Post[]>('/api/admin/social/calendar'),
      ]);
      setDrafts(d);
      setReady(r);
      setPublished(p);
      setScheduled(cal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleApprove(id: number) {
    const body = editingId === id && editContent ? { content: editContent } : {};
    await apiFetch(`/api/admin/social/posts/${id}/approve`, { method: 'PATCH', body: JSON.stringify(body) });
    setEditingId(null);
    setEditContent('');
    fetchAll();
  }

  async function handleReject(id: number) {
    const reason = prompt('Why are you rejecting this post? (optional)');
    await apiFetch(`/api/admin/social/posts/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason: reason || '' }) });
    fetchAll();
  }

  async function handleSnooze(id: number) {
    const hours = prompt('Snooze for how many hours?', '4');
    if (!hours) return;
    await apiFetch(`/api/admin/social/posts/${id}/snooze`, { method: 'PATCH', body: JSON.stringify({ snoozedUntil: new Date(Date.now() + parseInt(hours) * 3600000).toISOString() }) });
    fetchAll();
  }

  async function handlePublish(id: number) {
    await apiFetch(`/api/admin/social/posts/${id}/publish`, { method: 'PATCH', body: '{}' });
    fetchAll();
  }

  async function handleLogEngagement(id: number) {
    await apiFetch(`/api/admin/social/posts/${id}/engagement`, { method: 'PATCH', body: JSON.stringify({ engagementLikes: engagement.likes, engagementShares: engagement.shares, engagementComments: engagement.comments, engagementDonations: engagement.donations }) });
    setEngagementId(null);
    setEngagement({ likes: 0, shares: 0, comments: 0, donations: 0 });
    fetchAll();
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await apiFetch<{ generated: number }>('/api/admin/social/generate', { method: 'POST', body: JSON.stringify({ maxPosts: 4 }) });
      if (result.generated === 0) setError('No posts generated. Try adding more photos or facts first.');
      fetchAll();
    } catch {
      setError('Generation failed. Is the AI harness running?');
    } finally {
      setGenerating(false);
    }
  }

  const { days: monthDays, month: calMonth, year: calYear } = getMonthDays(monthOffset);
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading && drafts.length === 0) {
    return <div className={styles.loading}><Loader2 className={styles.spin} size={24} /> Loading...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Social Media</h1>
          <p className={styles.subtitle}>
            {drafts.length > 0 ? `${drafts.length} post${drafts.length !== 1 ? 's' : ''} to review` : 'No posts to review'}
            {ready.length > 0 && ` · ${ready.length} ready to publish`}
          </p>
        </div>
        <button className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
          {generating ? <><Loader2 className={styles.spin} size={16} /> Generating...</> : <><Sparkles size={16} /> Generate Posts</>}
        </button>
      </div>

      {error && <div className={styles.error}>{error} <button onClick={() => setError(null)}>×</button></div>}

      {/* Drafts to Review */}
      {drafts.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Review Drafts</h2>
          <div className={styles.cardGrid}>
            {drafts.map(post => (
              <div key={post.automatedPostId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.pillar} style={{ background: PILLAR_COLORS[post.contentPillar] }}>{PILLAR_LABELS[post.contentPillar]}</span>
                  <span className={styles.platform}>{post.platform}</span>
                </div>
                {editingId === post.automatedPostId ? (
                  <textarea className={styles.editArea} value={editContent} onChange={e => setEditContent(e.target.value)} rows={5} />
                ) : (
                  <p className={styles.postContent}>{post.content}</p>
                )}
                <div className={styles.cardActions}>
                  {editingId === post.automatedPostId ? (
                    <button className={styles.btnApprove} onClick={() => handleApprove(post.automatedPostId)}><Check size={14} /> Save & Approve</button>
                  ) : (
                    <>
                      <button className={styles.btnApprove} onClick={() => handleApprove(post.automatedPostId)}><ThumbsUp size={14} /> Approve</button>
                      <button className={styles.btnEdit} onClick={() => { setEditingId(post.automatedPostId); setEditContent(post.content); }}><Edit3 size={14} /> Edit</button>
                    </>
                  )}
                  <button className={styles.btnReject} onClick={() => handleReject(post.automatedPostId)}><ThumbsDown size={14} /></button>
                  <button className={styles.btnSnooze} onClick={() => handleSnooze(post.automatedPostId)}><Clock size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ready to Publish */}
      {ready.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ready to Publish</h2>
          <p className={styles.sectionHint}>Copy the text, paste it into your social media platform, then mark it as published.</p>
          <div className={styles.cardGrid}>
            {ready.map(post => (
              <div key={post.automatedPostId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.pillar} style={{ background: PILLAR_COLORS[post.contentPillar] }}>{PILLAR_LABELS[post.contentPillar]}</span>
                  <span className={styles.platform}>{post.platform}</span>
                </div>
                <p className={styles.postContent}>{post.content}</p>
                {post.scheduledAt && <p className={styles.scheduledTime}>Scheduled: {new Date(post.scheduledAt).toLocaleString()}</p>}
                <div className={styles.cardActions}>
                  <button className={styles.btnCopy} onClick={() => navigator.clipboard.writeText(post.content)}><Copy size={14} /> Copy Text</button>
                  <button className={styles.btnPublish} onClick={() => handlePublish(post.automatedPostId)}><ExternalLink size={14} /> Mark Published</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Month Calendar */}
      <section className={styles.section}>
        <div className={styles.calendarHeader}>
          <h2 className={styles.sectionTitle}>Schedule</h2>
          <div className={styles.monthNav}>
            <button onClick={() => setMonthOffset(m => m - 1)} className={styles.weekBtn}><ChevronLeft size={16} /></button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button onClick={() => setMonthOffset(m => m + 1)} className={styles.weekBtn}><ChevronRight size={16} /></button>
            {monthOffset !== 0 && <button onClick={() => setMonthOffset(0)} className={styles.todayBtn}>Today</button>}
          </div>
        </div>
        <div className={styles.monthDayNames}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <span key={d} className={styles.monthDayName}>{d}</span>
          ))}
        </div>
        <div className={styles.monthGrid}>
          {monthDays.map(day => {
            const dayPosts = scheduled.filter(p => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day));
            const isToday = isSameDay(day, new Date());
            const isOtherMonth = day.getMonth() !== calMonth;
            return (
              <div key={day.toISOString()} className={`${styles.monthCell} ${isToday ? styles.dayToday : ''} ${isOtherMonth ? styles.otherMonth : ''}`}>
                <span className={styles.monthCellNum}>{day.getDate()}</span>
                {dayPosts.map(p => (
                  <div key={p.automatedPostId} className={styles.monthPost} style={{ background: PILLAR_COLORS[p.contentPillar] }} title={`${PILLAR_LABELS[p.contentPillar]} · ${p.platform}`} />
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* Published — Log Engagement */}
      {published.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Log Engagement</h2>
          <p className={styles.sectionHint}>Enter the engagement numbers from your social media platforms. This helps the AI learn what works.</p>
          <div className={styles.engagementList}>
            {published.map(post => (
              <div key={post.automatedPostId} className={styles.engagementRow}>
                <div className={styles.engagementInfo}>
                  <span className={styles.pillarSmall} style={{ background: PILLAR_COLORS[post.contentPillar] }}>{PILLAR_LABELS[post.contentPillar]}</span>
                  <span className={styles.engagementPreview}>{post.content.slice(0, 80)}{post.content.length > 80 ? '...' : ''}</span>
                </div>
                {post.engagementLikes != null ? (
                  <div className={styles.engagementStats}>
                    {post.engagementLikes} likes · {post.engagementShares ?? 0} shares · {post.engagementComments ?? 0} comments
                    {post.engagementDonations ? ` · $${post.engagementDonations}` : ''}
                  </div>
                ) : engagementId === post.automatedPostId ? (
                  <div className={styles.engagementForm}>
                    <input type="number" placeholder="Likes" min={0} value={engagement.likes || ''} onChange={e => setEngagement({ ...engagement, likes: +e.target.value })} />
                    <input type="number" placeholder="Shares" min={0} value={engagement.shares || ''} onChange={e => setEngagement({ ...engagement, shares: +e.target.value })} />
                    <input type="number" placeholder="Comments" min={0} value={engagement.comments || ''} onChange={e => setEngagement({ ...engagement, comments: +e.target.value })} />
                    <input type="number" placeholder="$" min={0} step="0.01" value={engagement.donations || ''} onChange={e => setEngagement({ ...engagement, donations: +e.target.value })} />
                    <button className={styles.btnApprove} onClick={() => handleLogEngagement(post.automatedPostId)}><Check size={14} /></button>
                  </div>
                ) : (
                  <button className={styles.btnLog} onClick={() => { setEngagementId(post.automatedPostId); setEngagement({ likes: 0, shares: 0, comments: 0, donations: 0 }); }}>
                    <BarChart2 size={14} /> Log
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {drafts.length === 0 && ready.length === 0 && published.length === 0 && (
        <div className={styles.emptyState}>
          <Sparkles size={40} />
          <h3>No posts yet</h3>
          <p>Click "Generate Posts" to create AI-powered social media content from your photos and facts.</p>
        </div>
      )}
    </div>
  );
}

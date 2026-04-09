import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, X, Clock, Edit3, ThumbsUp, ThumbsDown, Copy, ExternalLink, BarChart2, ChevronLeft, ChevronRight, Sparkles, CameraIcon } from 'lucide-react';
import { apiFetch, getApiUrl } from '../../../api';
import TextArea from '../../../components/admin/TextArea';
import styles from './SocialPostsPage.module.css';

interface Post {
  automatedPostId: number;
  content: string;
  originalContent: string | null;
  contentPillar: string;
  source: string;
  status: string;
  platform: string;
  mediaId: number | null;
  mediaPath: string | null;
  mediaThumbPath: string | null;
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
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [genClosing, setGenClosing] = useState(false);

  function closeGeneratePanel() {
    setGenClosing(true);
    setTimeout(() => { setShowGeneratePanel(false); setGenClosing(false); }, 200);
  }

  // Determine which pillar to suggest based on what's least represented in drafts
  function getSuggestedPillar(): string {
    const counts: Record<string, number> = { safehouse_life: 0, the_problem: 0, the_solution: 0, donor_impact: 0, call_to_action: 0 };
    [...drafts, ...ready, ...scheduled].forEach(p => { if (counts[p.contentPillar] !== undefined) counts[p.contentPillar]++; });
    const ratios: Record<string, number> = { safehouse_life: 30, the_problem: 25, the_solution: 20, donor_impact: 15, call_to_action: 10 };
    let best = 'safehouse_life'; let bestGap = -Infinity;
    for (const [key, target] of Object.entries(ratios)) {
      const gap = target - (counts[key] || 0) * 10;
      if (gap > bestGap) { bestGap = gap; best = key; }
    }
    return best;
  }

  // Inline dialog (replaces native confirm/prompt)
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    inputLabel?: string;
    inputDefault?: string;
    confirmLabel: string;
    onConfirm: (inputValue?: string) => void;
  } | null>(null);
  const [dialogInput, setDialogInput] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMediaId, setEditMediaId] = useState<number | null>(null);
  const [editMediaThumb, setEditMediaThumb] = useState<string | null>(null);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState('');
  const [availablePhotos, setAvailablePhotos] = useState<{ mediaLibraryItemId: number; thumbnailPath: string; caption: string; activityType: string }[]>([]);
  const [engagementId, setEngagementId] = useState<number | null>(null);
  const [engagement, setEngagement] = useState({ likes: 0, shares: 0, comments: 0, donations: 0 });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const [calEditContent, setCalEditContent] = useState('');
  const [calEditing, setCalEditing] = useState(false);
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

  // Lock body scroll when any modal is open
  useEffect(() => {
    const locked = showPhotoPicker || !!dialog || !!selectedPost;
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showPhotoPicker, dialog, selectedPost]);

  async function openPhotoPicker() {
    if (availablePhotos.length === 0) {
      const photos = await apiFetch<{ mediaLibraryItemId: number; thumbnailPath: string; caption: string; activityType: string }[]>('/api/admin/social/media?pageSize=50');
      setAvailablePhotos(photos);
    }
    setShowPhotoPicker(true);
  }

  function startEdit(post: Post) {
    setEditingId(post.automatedPostId);
    setEditContent(post.content);
    setEditMediaId(post.mediaId);
    setEditMediaThumb(post.mediaThumbPath);
  }

  async function handleApprove(id: number) {
    const body: Record<string, unknown> = {};
    if (editingId === id && editContent) body.content = editContent;
    if (editingId === id && editMediaId !== null) body.mediaId = editMediaId;
    await apiFetch(`/api/admin/social/posts/${id}/approve`, { method: 'PATCH', body: JSON.stringify(body) });
    setEditingId(null);
    setEditContent('');
    setEditMediaId(null);
    setEditMediaThumb(null);
    showToast('Post approved and scheduled');
    fetchAll();
  }

  async function handleSaveDraft(id: number) {
    if (!editContent) return;
    const body: Record<string, unknown> = { content: editContent };
    if (editMediaId !== null) body.mediaId = editMediaId;
    await apiFetch(`/api/admin/social/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    setEditingId(null);
    setEditContent('');
    setEditMediaId(null);
    setEditMediaThumb(null);
    showToast('Draft saved');
    fetchAll();
  }

  async function handleCalSave(id: number) {
    if (!calEditContent) return;
    await apiFetch(`/api/admin/social/posts/${id}`, { method: 'PUT', body: JSON.stringify({ content: calEditContent }) });
    setCalEditing(false);
    setSelectedPost(null);
    showToast('Post updated');
    fetchAll();
  }

  function handleReject(id: number) {
    setDialog({
      title: 'Reject Post',
      message: 'This post will be removed from the queue.',
      confirmLabel: 'Reject',
      onConfirm: async () => {
        setDialog(null);
        await apiFetch(`/api/admin/social/posts/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejectionReason: '' }) });
        showToast('Post rejected');
        fetchAll();
      },
    });
  }

  function handleSnooze(id: number) {
    setDialogInput('4');
    setDialog({
      title: 'Snooze Post',
      message: 'How many hours should this post be snoozed?',
      inputLabel: 'Hours',
      inputDefault: '4',
      confirmLabel: 'Snooze',
      onConfirm: async (val) => {
        setDialog(null);
        const parsed = parseInt(val || '4');
        if (isNaN(parsed) || parsed < 1 || parsed > 168) { setError('Enter a number between 1 and 168.'); return; }
        await apiFetch(`/api/admin/social/posts/${id}/snooze`, { method: 'PATCH', body: JSON.stringify({ snoozedUntil: new Date(Date.now() + parsed * 3600000).toISOString() }) });
        showToast(`Snoozed for ${parsed} hours`);
        fetchAll();
      },
    });
  }

  function handlePublish(id: number) {
    setDialog({
      title: 'Mark as Published',
      message: 'Confirm that you\'ve posted this content to the social media platform.',
      confirmLabel: 'Yes, it\'s published',
      onConfirm: async () => {
        setDialog(null);
        await apiFetch(`/api/admin/social/posts/${id}/publish`, { method: 'PATCH', body: '{}' });
        showToast('Post marked as published');
        fetchAll();
      },
    });
  }

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content);
    showToast('Copied to clipboard');
  }

  async function handleLogEngagement(id: number) {
    await apiFetch(`/api/admin/social/posts/${id}/engagement`, { method: 'PATCH', body: JSON.stringify({ engagementLikes: engagement.likes, engagementShares: engagement.shares, engagementComments: engagement.comments, engagementDonations: engagement.donations }) });
    setEngagementId(null);
    setEngagement({ likes: 0, shares: 0, comments: 0, donations: 0 });
    showToast('Engagement data saved');
    fetchAll();
  }

  async function handleGenerate(pillar?: string) {
    setShowGeneratePanel(false);
    setGenerating(true);
    setError(null);
    try {
      const result = await apiFetch<{ generated: number }>('/api/admin/social/generate', {
        method: 'POST',
        body: JSON.stringify({ maxPosts: 1, pillar }),
      });
      if (result.generated === 0) setError('No posts generated. Try adding more photos or facts first.');
      else showToast('Post generated');
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
        {generating ? (
          <div className={styles.generateBtn} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <Loader2 className={styles.spin} size={16} /> Generating...
          </div>
        ) : !showGeneratePanel ? (
          <button className={styles.generateBtn} onClick={() => setShowGeneratePanel(true)}>
            <Sparkles size={16} /> Generate Post
          </button>
        ) : (
          <div className={`${styles.genExpanded} ${genClosing ? styles.genExpandedClosing : styles.genExpandedOpen}`}>
            {([
              ['safehouse_life', 'Safehouse Life', 'Photos and stories from daily safehouse life — art therapy, meals, celebrations'],
              ['the_problem', 'Awareness', 'Educational content about trafficking, abuse, and the need for action'],
              ['the_solution', 'Our Work', 'What your organization does — counseling, education, rehabilitation'],
              ['donor_impact', 'Impact', 'Shows supporters how their donations fund real operations'],
              ['call_to_action', 'Call to Action', 'Fundraising asks, volunteer recruitment, event promotion'],
            ] as [string, string, string][]).map(([key, label, desc]) => {
              const suggested = getSuggestedPillar() === key;
              return (
                <button
                  key={key}
                  className={`${styles.genOption} ${suggested ? styles.genOptionSuggested : ''}`}
                  onClick={() => handleGenerate(key)}
                >
                  <span className={styles.genDot} style={{ background: PILLAR_COLORS[key] }} />
                  {label}
                  {suggested && <span className={styles.genSuggestedTag}>Suggested</span>}
                  <span className={styles.genTooltip}>{desc}</span>
                </button>
              );
            })}
            <button className={styles.genCloseBtn} onClick={closeGeneratePanel}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error} <button onClick={() => setError(null)}>×</button></div>}

      {/* Drafts to Review (with skeleton cards prepended while generating) */}
      {(drafts.length > 0 || generating) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{generating ? 'Generating new post...' : 'Review Drafts'}</h2>
          <div className={styles.cardGrid}>
            {generating && [1].map(i => (
              <div key={`skel-${i}`} className={styles.skeletonCard}>
                <div className={styles.skeletonPulse}>
                  <div className={styles.skeletonPillar} />
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonLine} style={{ width: '100%' }} />
                  <div className={styles.skeletonLine} style={{ width: '90%' }} />
                  <div className={styles.skeletonLine} style={{ width: '75%' }} />
                  <div className={styles.skeletonLine} style={{ width: '60%' }} />
                  <div className={styles.skeletonActions}>
                    <div className={styles.skeletonBtn} />
                    <div className={styles.skeletonBtn} />
                  </div>
                </div>
              </div>
            ))}
            {drafts.map(post => (
              <div key={post.automatedPostId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.pillar} style={{ background: PILLAR_COLORS[post.contentPillar] }}>{PILLAR_LABELS[post.contentPillar]}</span>
                  <span className={styles.platform}>{post.platform}</span>
                </div>
                {editingId === post.automatedPostId ? (
                  <>
                    <div className={styles.editPhotoWrap}>
                      {editMediaThumb ? (
                        <img src={`${getApiUrl()}${editMediaThumb}`} alt="Post photo" className={styles.cardImage} />
                      ) : post.mediaThumbPath ? (
                        <img src={`${getApiUrl()}${post.mediaThumbPath}`} alt="Post photo" className={styles.cardImage} />
                      ) : null}
                      <button className={styles.changePhotoBtn} onClick={openPhotoPicker}><CameraIcon size={13} /> {editMediaThumb || post.mediaThumbPath ? 'Change Photo' : 'Add Photo'}</button>
                    </div>
                    <TextArea className={styles.editArea} value={editContent} onChange={e => setEditContent(e.target.value)} rows={5} />
                  </>
                ) : (
                  <>
                    {post.mediaThumbPath && (
                      <img src={`${getApiUrl()}${post.mediaThumbPath}`} alt="Post photo" className={styles.cardImage} />
                    )}
                    <p className={styles.postContent}>{post.content}</p>
                  </>
                )}
                <div className={styles.cardActions}>
                  {editingId === post.automatedPostId ? (
                    <>
                      <button className={styles.btnEdit} onClick={() => handleSaveDraft(post.automatedPostId)}><Check size={14} /> Save Draft</button>
                      <button className={styles.btnApprove} onClick={() => handleApprove(post.automatedPostId)}><ThumbsUp size={14} /> Save & Approve</button>
                      <button className={styles.btnReject} onClick={() => { setEditingId(null); setEditContent(''); setEditMediaId(null); setEditMediaThumb(null); }} title="Cancel editing"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button className={styles.btnApprove} onClick={() => handleApprove(post.automatedPostId)}><ThumbsUp size={14} /> Approve</button>
                      <button className={styles.btnEdit} onClick={() => startEdit(post)}><Edit3 size={14} /> Edit</button>
                    </>
                  )}
                  <button className={styles.btnReject} onClick={() => handleReject(post.automatedPostId)} title="Reject this post"><ThumbsDown size={14} /></button>
                  <button className={styles.btnSnooze} onClick={() => handleSnooze(post.automatedPostId)} title="Snooze — review later"><Clock size={14} /></button>
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
                {post.mediaThumbPath && (
                  <img src={`${getApiUrl()}${post.mediaThumbPath}`} alt="Post photo" className={styles.cardImage} />
                )}
                <p className={styles.postContent}>{post.content}</p>
                {post.scheduledAt && <p className={styles.scheduledTime}>Scheduled: {new Date(post.scheduledAt).toLocaleString()}</p>}
                <div className={styles.cardActions}>
                  <button className={styles.btnCopy} onClick={() => handleCopy(post.content)}><Copy size={14} /> Copy Text</button>
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
                  <button
                    key={p.automatedPostId}
                    className={styles.monthPostBar}
                    style={{ background: PILLAR_COLORS[p.contentPillar] }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Position above or below the bar, clamped to viewport
                      const spaceBelow = window.innerHeight - rect.bottom - 16;
                      const spaceAbove = rect.top - 16;
                      const top = spaceBelow >= 300
                        ? rect.bottom + 8
                        : spaceAbove > spaceBelow
                          ? Math.max(8, rect.top - Math.min(spaceAbove, 500) - 8)
                          : rect.bottom + 8;
                      const maxH = spaceBelow >= 300
                        ? spaceBelow
                        : spaceAbove > spaceBelow
                          ? Math.min(spaceAbove, 500)
                          : spaceBelow;
                      setPopoverPos({ top, left: Math.min(rect.left, window.innerWidth - 370), maxHeight: maxH });
                      setSelectedPost(p); setCalEditing(false); setCalEditContent(p.content);
                    }}
                  >
                    {PILLAR_LABELS[p.contentPillar]} · {p.platform}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Post Detail Popover — anchored near clicked bar */}
        {selectedPost && popoverPos && (
          <>
            <div className={styles.popoverBackdrop} onClick={() => { setSelectedPost(null); setCalEditing(false); }} />
            <div className={styles.popover} style={{ top: popoverPos.top, left: popoverPos.left, maxHeight: popoverPos.maxHeight }}>
              <div className={styles.popoverHeader}>
                <div>
                  <span className={styles.pillar} style={{ background: PILLAR_COLORS[selectedPost.contentPillar] }}>{PILLAR_LABELS[selectedPost.contentPillar]}</span>
                  <span className={styles.platform}>{selectedPost.platform}</span>
                  <span className={styles.popoverStatus}>{selectedPost.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                </div>
                <button className={styles.popoverClose} onClick={() => { setSelectedPost(null); setCalEditing(false); }}><X size={18} /></button>
              </div>
              <div className={styles.popoverBody}>
                {selectedPost.mediaPath && (
                  <img src={`${getApiUrl()}${selectedPost.mediaPath}`} alt="Post photo" className={styles.popoverImage} />
                )}
                {selectedPost.scheduledAt && (
                  <p className={styles.popoverDate}>{new Date(selectedPost.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {new Date(selectedPost.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                )}
                {calEditing ? (
                  <TextArea className={styles.popoverEdit} value={calEditContent} onChange={e => setCalEditContent(e.target.value)} rows={6} />
                ) : (
                  <p className={styles.popoverContent}>{selectedPost.content}</p>
                )}
              </div>
              <div className={styles.popoverActions}>
                {calEditing ? (
                  <>
                    <button className={styles.btnApprove} onClick={() => handleCalSave(selectedPost.automatedPostId)}><Check size={14} /> Save</button>
                    <button className={styles.btnReject} onClick={() => setCalEditing(false)}><X size={14} /> Cancel</button>
                  </>
                ) : (
                  <button className={styles.btnEdit} onClick={() => setCalEditing(true)}><Edit3 size={14} /> Edit</button>
                )}
                <button className={styles.btnCopy} onClick={() => handleCopy(selectedPost.content)}><Copy size={14} /> Copy</button>
              </div>
            </div>
          </>
        )}
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
      {/* Photo Picker Modal */}
      {showPhotoPicker && (
        <>
          <div className={styles.dialogBackdrop} onClick={() => setShowPhotoPicker(false)} />
          <div className={styles.photoPicker}>
            <div className={styles.photoPickerHeader}>
              <div>
                <h3>Choose a photo</h3>
                <p>Select an image from your media library to use with this post.</p>
              </div>
              <button onClick={() => setShowPhotoPicker(false)} className={styles.popoverClose}><X size={20} /></button>
            </div>
            <div className={styles.photoPickerToolbar}>
              <button className={`${styles.photoPickerFilter} ${!pickerFilter ? styles.photoPickerFilterActive : ''}`} onClick={() => setPickerFilter('')}>All</button>
              {['art_therapy', 'daily_life', 'celebration', 'meal', 'sports', 'facility', 'outing'].map(t => (
                <button key={t} className={`${styles.photoPickerFilter} ${pickerFilter === t ? styles.photoPickerFilterActive : ''}`} onClick={() => setPickerFilter(t)}>
                  {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
            <div className={styles.photoPickerGrid}>
              <button
                className={`${styles.photoPickerItem} ${styles.photoPickerNoPhoto} ${editMediaId === 0 ? styles.photoPickerSelected : ''}`}
                onClick={() => { setEditMediaId(0); setEditMediaThumb(null); setShowPhotoPicker(false); }}
              >
                <X size={24} />
                <span>No photo</span>
              </button>
              {availablePhotos
                .filter(p => !pickerFilter || p.activityType === pickerFilter)
                .map(photo => (
                <button
                  key={photo.mediaLibraryItemId}
                  className={`${styles.photoPickerItem} ${editMediaId === photo.mediaLibraryItemId ? styles.photoPickerSelected : ''}`}
                  onClick={() => {
                    setEditMediaId(photo.mediaLibraryItemId);
                    setEditMediaThumb(photo.thumbnailPath);
                    setShowPhotoPicker(false);
                  }}
                >
                  <img src={`${getApiUrl()}${photo.thumbnailPath}`} alt={photo.caption || 'Photo'} />
                  {photo.caption && <span className={styles.photoPickerCaption}>{photo.caption}</span>}
                </button>
              ))}
            </div>
            {availablePhotos.length === 0 && (
              <p className={styles.photoPickerEmpty}>No photos in the library yet. Upload some on the Photos page first.</p>
            )}
          </div>
        </>
      )}

      {/* Inline dialog (replaces native confirm/prompt) */}
      {dialog && (
        <>
          <div className={styles.dialogBackdrop} onClick={() => setDialog(null)} />
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>{dialog.title}</h3>
            <p className={styles.dialogMessage}>{dialog.message}</p>
            {dialog.inputLabel && (
              <div className={styles.dialogInputWrap}>
                <label>{dialog.inputLabel}</label>
                <input
                  type="number"
                  value={dialogInput}
                  onChange={e => setDialogInput(e.target.value)}
                  autoFocus
                  min={1}
                  max={168}
                  className={styles.dialogInput}
                  onKeyDown={e => e.key === 'Enter' && dialog.onConfirm(dialogInput)}
                />
              </div>
            )}
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={() => setDialog(null)}>Cancel</button>
              <button className={styles.dialogConfirm} onClick={() => dialog.onConfirm(dialogInput)}>{dialog.confirmLabel}</button>
            </div>
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Photo picker loading state */}
      {showPhotoPicker && availablePhotos.length === 0 && (
        <div className={styles.photoPickerLoading}><Loader2 className={styles.spin} size={20} /> Loading photos...</div>
      )}
    </div>
  );
}

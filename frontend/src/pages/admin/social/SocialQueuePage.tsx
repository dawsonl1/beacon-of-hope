import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, X, Clock, Edit3, ThumbsUp, ThumbsDown, Copy, ExternalLink, BarChart2 } from 'lucide-react';
import { apiFetch } from '../../../api';
import styles from './SocialQueuePage.module.css';

interface AutomatedPost {
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
  createdAt: string;
}

interface QueueCount {
  draftCount: number;
  readyCount: number;
}

const PILLAR_LABELS: Record<string, string> = {
  safehouse_life: 'Safehouse Life',
  the_problem: 'The Problem',
  the_solution: 'The Solution',
  donor_impact: 'Donor Impact',
  call_to_action: 'Call to Action',
};

const PILLAR_COLORS: Record<string, string> = {
  safehouse_life: '#0f8f7d',
  the_problem: '#d63031',
  the_solution: '#0984e3',
  donor_impact: '#ff9f43',
  call_to_action: '#6c5ce7',
};

export default function SocialQueuePage() {
  const [posts, setPosts] = useState<AutomatedPost[]>([]);
  const [counts, setCounts] = useState<QueueCount>({ draftCount: 0, readyCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'draft' | 'ready_to_publish' | 'published'>('draft');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [engagementId, setEngagementId] = useState<number | null>(null);
  const [engagement, setEngagement] = useState({ likes: 0, shares: 0, comments: 0, donations: 0 });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const [postsData, countsData] = await Promise.all([
        apiFetch<AutomatedPost[]>(`/api/admin/social/posts?status=${activeTab}`),
        apiFetch<QueueCount>('/api/admin/social/queue-count'),
      ]);
      setPosts(postsData);
      setCounts(countsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleApprove(id: number) {
    const body = editingId === id && editContent ? { content: editContent } : {};
    await apiFetch(`/api/admin/social/posts/${id}/approve`, { method: 'PATCH', body: JSON.stringify(body) });
    setEditingId(null);
    setEditContent('');
    fetchPosts();
  }

  async function handleReject(id: number) {
    const reason = prompt('Rejection reason (optional):');
    await apiFetch(`/api/admin/social/posts/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason: reason || '' }),
    });
    fetchPosts();
  }

  async function handleSnooze(id: number) {
    const hours = prompt('Snooze for how many hours?', '4');
    if (!hours) return;
    const snoozedUntil = new Date(Date.now() + parseInt(hours) * 3600000).toISOString();
    await apiFetch(`/api/admin/social/posts/${id}/snooze`, {
      method: 'PATCH',
      body: JSON.stringify({ snoozedUntil }),
    });
    fetchPosts();
  }

  async function handlePublish(id: number) {
    await apiFetch(`/api/admin/social/posts/${id}/publish`, { method: 'PATCH', body: '{}' });
    fetchPosts();
  }

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content);
  }

  async function handleLogEngagement(id: number) {
    await apiFetch(`/api/admin/social/posts/${id}/engagement`, {
      method: 'PATCH',
      body: JSON.stringify({
        engagementLikes: engagement.likes,
        engagementShares: engagement.shares,
        engagementComments: engagement.comments,
        engagementDonations: engagement.donations,
      }),
    });
    setEngagementId(null);
    setEngagement({ likes: 0, shares: 0, comments: 0, donations: 0 });
    fetchPosts();
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      await apiFetch('/api/admin/social/generate', { method: 'POST', body: JSON.stringify({ maxPosts: 4 }) });
      fetchPosts();
    } catch (e) {
      setError('Content generation failed. Is the AI harness running?');
    } finally {
      setGenerating(false);
    }
  }

  function startEdit(post: AutomatedPost) {
    setEditingId(post.automatedPostId);
    setEditContent(post.content);
  }

  if (loading && posts.length === 0) {
    return <div className={styles.loading}><Loader2 className={styles.spin} size={24} /> Loading queue...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Social Media Queue</h1>
          <p className={styles.subtitle}>
            {counts.draftCount} drafts awaiting review
            {counts.readyCount > 0 && ` · ${counts.readyCount} ready to publish`}
          </p>
        </div>
        <button className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
          {generating ? <><Loader2 className={styles.spin} size={16} /> Generating...</> : 'Generate Posts'}
        </button>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'draft' ? styles.tabActive : ''}`} onClick={() => setActiveTab('draft')}>
          Drafts {counts.draftCount > 0 && <span className={styles.badge}>{counts.draftCount}</span>}
        </button>
        <button className={`${styles.tab} ${activeTab === 'ready_to_publish' ? styles.tabActive : ''}`} onClick={() => setActiveTab('ready_to_publish')}>
          Ready {counts.readyCount > 0 && <span className={styles.badge}>{counts.readyCount}</span>}
        </button>
        <button className={`${styles.tab} ${activeTab === 'published' ? styles.tabActive : ''}`} onClick={() => setActiveTab('published')}>
          Published
        </button>
      </div>

      {error && <div className={styles.error}>{error} <button onClick={() => setError(null)}>Dismiss</button></div>}

      {posts.length === 0 ? (
        <div className={styles.empty}>
          {activeTab === 'draft' ? 'No drafts in the queue. Click "Generate Posts" to create some.' :
           activeTab === 'ready_to_publish' ? 'No posts ready to publish.' : 'No published posts yet.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {posts.map(post => (
            <div key={post.automatedPostId} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.pillarBadge} style={{ background: PILLAR_COLORS[post.contentPillar] || '#666' }}>
                  {PILLAR_LABELS[post.contentPillar] || post.contentPillar}
                </span>
                <span className={styles.platform}>{post.platform}</span>
              </div>

              {editingId === post.automatedPostId ? (
                <textarea
                  className={styles.editArea}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={6}
                />
              ) : (
                <p className={styles.content}>{post.content}</p>
              )}

              {post.scheduledAt && (
                <p className={styles.scheduledAt}>Scheduled: {new Date(post.scheduledAt).toLocaleString()}</p>
              )}

              <div className={styles.actions}>
                {activeTab === 'draft' && (
                  <>
                    {editingId === post.automatedPostId ? (
                      <button className={styles.approveBtn} onClick={() => handleApprove(post.automatedPostId)}>
                        <Check size={14} /> Save & Approve
                      </button>
                    ) : (
                      <>
                        <button className={styles.approveBtn} onClick={() => handleApprove(post.automatedPostId)}>
                          <ThumbsUp size={14} /> Approve
                        </button>
                        <button className={styles.editBtn} onClick={() => startEdit(post)}>
                          <Edit3 size={14} /> Edit
                        </button>
                      </>
                    )}
                    <button className={styles.rejectBtn} onClick={() => handleReject(post.automatedPostId)}>
                      <ThumbsDown size={14} />
                    </button>
                    <button className={styles.snoozeBtn} onClick={() => handleSnooze(post.automatedPostId)}>
                      <Clock size={14} />
                    </button>
                  </>
                )}
                {activeTab === 'ready_to_publish' && (
                  <>
                    <button className={styles.copyBtn} onClick={() => handleCopy(post.content)}>
                      <Copy size={14} /> Copy
                    </button>
                    <button className={styles.publishBtn} onClick={() => handlePublish(post.automatedPostId)}>
                      <ExternalLink size={14} /> Mark Published
                    </button>
                  </>
                )}
                {activeTab === 'published' && (
                  <>
                    {post.engagementLikes != null ? (
                      <div className={styles.engagementDisplay}>
                        {post.engagementLikes}L · {post.engagementShares ?? 0}S · {post.engagementComments ?? 0}C
                        {post.engagementDonations ? ` · $${post.engagementDonations}` : ''}
                      </div>
                    ) : engagementId === post.automatedPostId ? (
                      <div className={styles.engagementForm}>
                        <input type="number" placeholder="Likes" min={0} value={engagement.likes} onChange={e => setEngagement({ ...engagement, likes: +e.target.value })} />
                        <input type="number" placeholder="Shares" min={0} value={engagement.shares} onChange={e => setEngagement({ ...engagement, shares: +e.target.value })} />
                        <input type="number" placeholder="Comments" min={0} value={engagement.comments} onChange={e => setEngagement({ ...engagement, comments: +e.target.value })} />
                        <input type="number" placeholder="$ Donations" min={0} step="0.01" value={engagement.donations} onChange={e => setEngagement({ ...engagement, donations: +e.target.value })} />
                        <button className={styles.approveBtn} onClick={() => handleLogEngagement(post.automatedPostId)}><Check size={14} /> Save</button>
                      </div>
                    ) : (
                      <button className={styles.editBtn} onClick={() => { setEngagementId(post.automatedPostId); setEngagement({ likes: 0, shares: 0, comments: 0, donations: 0 }); }}>
                        <BarChart2 size={14} /> Log Engagement
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

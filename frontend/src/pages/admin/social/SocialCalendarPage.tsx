import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Copy, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../../api';
import styles from './SocialCalendarPage.module.css';

interface CalendarPost {
  automatedPostId: number;
  content: string;
  contentPillar: string;
  platform: string;
  status: string;
  scheduledAt: string | null;
  engagementLikes: number | null;
  engagementShares: number | null;
  engagementComments: number | null;
}

const PILLAR_COLORS: Record<string, string> = {
  safehouse_life: '#0f8f7d', the_problem: '#d63031', the_solution: '#0984e3',
  donor_impact: '#ff9f43', call_to_action: '#6c5ce7',
};

const PILLAR_LABELS: Record<string, string> = {
  safehouse_life: 'Life', the_problem: 'Problem', the_solution: 'Solution',
  donor_impact: 'Impact', call_to_action: 'CTA',
};

function getWeekDays(offset: number): Date[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay() + 1 + offset * 7); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function SocialCalendarPage() {
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<CalendarPost[]>('/api/admin/social/calendar');
      setPosts(data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content);
  }

  async function handlePublish(id: number) {
    await apiFetch(`/api/admin/social/posts/${id}/publish`, { method: 'PATCH', body: '{}' });
    fetchPosts();
  }

  const days = getWeekDays(weekOffset);
  const weekLabel = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Social Calendar</h1>
        <div className={styles.weekNav}>
          <button onClick={() => setWeekOffset(w => w - 1)} className={styles.navBtn}><ChevronLeft size={18} /></button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(w => w + 1)} className={styles.navBtn}><ChevronRight size={18} /></button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className={styles.todayBtn}>Today</button>}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}><Loader2 className={styles.spin} size={24} /></div>
      ) : (
        <div className={styles.grid}>
          {days.map(day => {
            const dayPosts = posts.filter(p => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day));
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`${styles.dayCol} ${isToday ? styles.today : ''}`}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayName}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className={styles.dayNum}>{day.getDate()}</span>
                </div>
                <div className={styles.dayBody}>
                  {dayPosts.length === 0 ? (
                    <div className={styles.emptyDay}>—</div>
                  ) : (
                    dayPosts.map(post => (
                      <div key={post.automatedPostId} className={styles.postCard}>
                        <div className={styles.postHeader}>
                          <span className={styles.dot} style={{ background: PILLAR_COLORS[post.contentPillar] || '#666' }} />
                          <span className={styles.pillarLabel}>{PILLAR_LABELS[post.contentPillar] || post.contentPillar}</span>
                          <span className={styles.platformLabel}>{post.platform}</span>
                        </div>
                        <p className={styles.postPreview}>{post.content.slice(0, 80)}{post.content.length > 80 ? '...' : ''}</p>
                        {post.scheduledAt && (
                          <span className={styles.time}>{new Date(post.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                        )}
                        {post.status === 'ready_to_publish' && (
                          <div className={styles.postActions}>
                            <button onClick={() => handleCopy(post.content)} className={styles.smallBtn}><Copy size={12} /> Copy</button>
                            <button onClick={() => handlePublish(post.automatedPostId)} className={styles.smallBtnPrimary}><ExternalLink size={12} /> Publish</button>
                          </div>
                        )}
                        {post.status === 'published' && post.engagementLikes != null && (
                          <div className={styles.engagement}>
                            {post.engagementLikes}L · {post.engagementShares ?? 0}S · {post.engagementComments ?? 0}C
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

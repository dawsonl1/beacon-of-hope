import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Image, Filter } from 'lucide-react';
import { apiFetch } from '../../../api';
import styles from './MediaLibraryPage.module.css';

interface MediaItem {
  mediaLibraryItemId: number;
  filePath: string;
  thumbnailPath: string | null;
  caption: string | null;
  activityType: string;
  uploadedBy: string | null;
  usedCount: number;
  uploadedAt: string;
}

const ACTIVITY_LABELS: Record<string, string> = {
  art_therapy: 'Art Therapy', sports: 'Sports', meal: 'Meal', outing: 'Outing',
  celebration: 'Celebration', daily_life: 'Daily Life', facility: 'Facility', other: 'Other',
};

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?activityType=${filter}` : '';
      const data = await apiFetch<MediaItem[]>(`/api/admin/social/media${params}`);
      setItems(data);
    } catch {
      /* handled by empty state */
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleDelete(id: number) {
    if (!confirm('Delete this photo from the library?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/admin/social/media/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.mediaLibraryItemId !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Media Library</h1>
          <p className={styles.subtitle}>{items.length} photos available</p>
        </div>
        <div className={styles.filterBar}>
          <Filter size={14} />
          <select value={filter} onChange={e => setFilter(e.target.value)} className={styles.filterSelect}>
            <option value="">All types</option>
            {Object.entries(ACTIVITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}><Loader2 className={styles.spin} size={24} /> Loading...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <Image size={48} />
          <p>No photos {filter ? `matching "${ACTIVITY_LABELS[filter] || filter}"` : 'in the library yet'}.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map(item => (
            <div key={item.mediaLibraryItemId} className={styles.card}>
              <div className={styles.imageWrap}>
                <img src={item.thumbnailPath || item.filePath} alt={item.caption || 'Photo'} className={styles.image} />
                {item.usedCount > 0 && (
                  <span className={styles.usedBadge}>Used {item.usedCount}x</span>
                )}
              </div>
              <div className={styles.meta}>
                <span className={styles.activityTag}>{ACTIVITY_LABELS[item.activityType] || item.activityType}</span>
                {item.caption && <p className={styles.caption}>{item.caption}</p>}
                <p className={styles.date}>{new Date(item.uploadedAt).toLocaleDateString()}</p>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(item.mediaLibraryItemId)}
                disabled={deleting === item.mediaLibraryItemId}
                title="Delete photo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

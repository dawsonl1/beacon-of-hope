import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronDown, Sparkles, Users } from 'lucide-react';
import { apiFetch } from '../../api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import styles from './AdminNewsletterPage.module.css';

interface Newsletter {
  newsletterId: number;
  subject: string | null;
  htmlContent?: string | null;
  plainText?: string | null;
  status: string;
  generatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  monthYear: number;
}

const STATUS_CLASSES: Record<string, string> = {
  draft: styles.badgeDraft,
  approved: styles.badgeApproved,
  sent: styles.badgeSent,
  sending: styles.badgeSending,
  failed: styles.badgeFailed,
};

function formatDate(d: string | null) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminNewsletterPage() {
  useDocumentTitle('Newsletters');

  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [nlData, subData] = await Promise.all([
        apiFetch<{ items: Newsletter[]; total: number }>('/api/admin/newsletters?page=1&pageSize=20'),
        apiFetch<{ total: number }>('/api/admin/newsletter-subscribers?page=1&pageSize=1'),
      ]);
      setNewsletters(nlData.items ?? []);
      setSubscriberCount(subData.total ?? 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await apiFetch('/api/admin/newsletters/generate', { method: 'POST' });
      await fetchData();
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function handleApprove(id: number) {
    setActionLoading(id);
    try {
      await apiFetch(`/api/admin/newsletters/${id}/approve`, { method: 'POST' });
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  async function handleSend(id: number) {
    setActionLoading(id);
    try {
      await apiFetch(`/api/admin/newsletters/${id}/send`, { method: 'POST' });
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  function startEdit(nl: Newsletter) {
    setEditingId(nl.newsletterId);
    setEditSubject(nl.subject ?? '');
    setEditHtml(nl.htmlContent ?? '');
  }

  async function saveEdit(id: number) {
    setActionLoading(id);
    try {
      await apiFetch(`/api/admin/newsletters/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ subject: editSubject, htmlContent: editHtml }),
      });
      setEditingId(null);
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  async function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
      return;
    }
    // Fetch full newsletter with HTML content
    try {
      const full = await apiFetch<Newsletter>(`/api/admin/newsletters/${id}`);
      setNewsletters(prev => prev.map(n => n.newsletterId === id ? { ...n, ...full } : n));
    } catch { /* ignore */ }
    setExpandedId(id);
    setEditingId(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Newsletters</h1>
          <p>
            <Users size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button className={styles.btnGenerate} onClick={handleGenerate} disabled={generating}>
          <Sparkles size={16} />
          {generating ? 'Generating...' : 'Generate Newsletter'}
        </button>
      </div>

      {loading && <div className={styles.loadingBar} />}

      {!loading && newsletters.length === 0 && (
        <div className={styles.empty}>
          No newsletters yet. Generate one to get started.
        </div>
      )}

      <div className={styles.list}>
        {newsletters.map(nl => (
          <div key={nl.newsletterId} className={styles.card}>
            <div className={styles.cardHeader} onClick={() => toggleExpand(nl.newsletterId)}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.cardSubject}>{nl.subject ?? 'Untitled'}</span>
                <span className={styles.cardMeta}>
                  <span>{formatDate(nl.generatedAt)}</span>
                  {nl.sentAt && <span>Sent {formatDate(nl.sentAt)} to {nl.recipientCount}</span>}
                </span>
              </div>
              <div className={styles.cardHeaderRight}>
                <span className={`${styles.badge} ${STATUS_CLASSES[nl.status] ?? ''}`}>
                  {nl.status}
                </span>
                <ChevronDown
                  size={16}
                  className={`${styles.chevron} ${expandedId === nl.newsletterId ? styles.chevronOpen : ''}`}
                />
              </div>
            </div>

            {expandedId === nl.newsletterId && (
              <div className={styles.cardBody}>
                {editingId === nl.newsletterId ? (
                  <>
                    <div className={styles.editField}>
                      <label>Subject</label>
                      <input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
                    </div>
                    <div className={styles.editField}>
                      <label>HTML Content</label>
                      <textarea value={editHtml} onChange={e => setEditHtml(e.target.value)} />
                    </div>
                    <div className={styles.editActions}>
                      <button className={styles.btnSave} onClick={() => saveEdit(nl.newsletterId)}
                        disabled={actionLoading === nl.newsletterId}>
                        Save
                      </button>
                      <button className={styles.btnCancel} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.actions}>
                      {nl.status === 'draft' && (
                        <>
                          <button className={styles.btnEdit} onClick={() => startEdit(nl)}>Edit</button>
                          <button className={styles.btnApprove} onClick={() => handleApprove(nl.newsletterId)}
                            disabled={actionLoading === nl.newsletterId}>
                            {actionLoading === nl.newsletterId ? 'Approving...' : 'Approve'}
                          </button>
                        </>
                      )}
                      {nl.status === 'approved' && (
                        <button className={styles.btnSend} onClick={() => handleSend(nl.newsletterId)}
                          disabled={actionLoading === nl.newsletterId}>
                          {actionLoading === nl.newsletterId ? 'Sending...' : 'Send to Subscribers'}
                        </button>
                      )}
                    </div>
                    {nl.htmlContent && (
                      <PreviewFrame html={nl.htmlContent} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    // Auto-resize
    const resize = () => {
      if (doc.body) iframe.style.height = doc.body.scrollHeight + 40 + 'px';
    };
    setTimeout(resize, 100);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className={styles.previewFrame}
      sandbox="allow-same-origin"
      title="Newsletter preview"
    />
  );
}

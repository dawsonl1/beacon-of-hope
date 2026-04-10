import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Maximize2, Minimize2, Code, ChevronDown } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { apiFetch } from '../../api';
import styles from './AdminChatWidget.module.css';

/* ── Types ───────────────────────────────────────────── */

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'area';
  x: string[];
  y: number[];
  labels?: string[];
  x_label?: string;
  y_label?: string;
}

interface ChatMessage {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  data?: { columns: string[]; rows: Record<string, unknown>[] };
  chart?: ChartData;
  sql?: string;
  error?: string;
}

interface ApiResponse {
  sql?: string;
  data?: Record<string, unknown>[];
  columns?: string[];
  chart?: ChartData;
  summary?: string;
  error?: string;
}

const CHART_COLORS = [
  'var(--color-sage)', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#10b981', '#6366f1',
];

const SUGGESTIONS = [
  'How many active residents are there?',
  'Show incidents by severity',
  'What are the monthly donation totals?',
  'Which safehouse has the most residents?',
];

const LOADING_STAGES = [
  { delay: 0, text: 'Analyzing your question...' },
  { delay: 3000, text: 'Running query against the database...' },
  { delay: 7000, text: 'Almost there...' },
];

/* ── Component ───────────────────────────────────────── */

export default function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loadingText]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Cleanup loading timers
  useEffect(() => {
    return () => loadingTimers.current.forEach(clearTimeout);
  }, []);

  const startLoadingStages = () => {
    loadingTimers.current.forEach(clearTimeout);
    loadingTimers.current = [];
    LOADING_STAGES.forEach(({ delay, text }) => {
      const timer = setTimeout(() => setLoadingText(text), delay);
      loadingTimers.current.push(timer);
    });
  };

  const stopLoadingStages = () => {
    loadingTimers.current.forEach(clearTimeout);
    loadingTimers.current = [];
    setLoadingText('');
  };

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      from: 'user',
      text: question.trim(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    startLoadingStages();

    try {
      console.log('[DataAssistant] Sending question:', question.trim());
      const resp = await apiFetch<ApiResponse>('/api/chat/ask', {
        method: 'POST',
        body: JSON.stringify({ question: question.trim() }),
      });

      if (resp.error) {
        console.warn('[DataAssistant] Server returned error:', resp.error);
      } else {
        console.log('[DataAssistant] Success:', {
          rows: resp.data?.length ?? 0,
          columns: resp.columns?.length ?? 0,
          hasChart: !!resp.chart,
          sql: resp.sql,
        });
      }

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        from: 'assistant',
        text: resp.summary || '',
        sql: resp.sql || undefined,
        error: resp.error || undefined,
        chart: resp.chart || undefined,
        data: resp.columns && resp.data
          ? { columns: resp.columns, rows: resp.data }
          : undefined,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('[DataAssistant] Request failed:', err);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: 'assistant',
          text: '',
          error: 'Something went wrong. The data assistant may be unavailable.',
        },
      ]);
    } finally {
      setLoading(false);
      stopLoadingStages();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) {
    return (
      <button className={styles.fab} onClick={() => setOpen(true)} title="Data Assistant">
        <Bot size={24} />
      </button>
    );
  }

  const panelClass = `${styles.panel} ${expanded ? styles.panelExpanded : ''}`;

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerDot} />
          <span className={styles.headerTitle}>Data Assistant</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.headerBtn}
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Compact view' : 'Expand view'}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className={styles.headerBtn} onClick={() => { setOpen(false); setExpanded(false); }} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages} ref={messagesRef}>
        {messages.length === 0 && !loading && (
          <WelcomeScreen onSuggestion={sendMessage} />
        )}

        {messages.map(msg =>
          msg.from === 'user' ? (
            <div key={msg.id} className={styles.messageUser}>{msg.text}</div>
          ) : (
            <BotMessage key={msg.id} msg={msg} />
          )
        )}

        {loading && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            {loadingText}
          </div>
        )}
      </div>

      {/* Inline suggestions in expanded mode */}
      {expanded && messages.length > 0 && !loading && (
        <div className={styles.inlineSuggestions}>
          {SUGGESTIONS.map(q => (
            <button key={q} className={styles.inlineSuggestionBtn} onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your data..."
          disabled={loading}
        />
        <button
          className={styles.sendBtn}
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function WelcomeScreen({ onSuggestion }: { onSuggestion: (q: string) => void }) {
  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeIcon}>
        <Bot size={24} />
      </div>
      <div className={styles.welcomeTitle}>Data Assistant</div>
      <div className={styles.welcomeText}>
        Ask questions about your safehouse data and get instant answers with charts.
      </div>
      <div className={styles.suggestions}>
        {SUGGESTIONS.map(q => (
          <button key={q} className={styles.suggestionBtn} onClick={() => onSuggestion(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function BotMessage({ msg }: { msg: ChatMessage }) {
  const [showSql, setShowSql] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);

  if (msg.error) {
    return <div className={styles.messageError}>{msg.error}</div>;
  }

  const ROW_LIMIT = 20;
  const rows = msg.data?.rows || [];
  const columns = msg.data?.columns || [];
  const visibleRows = showAllRows ? rows : rows.slice(0, ROW_LIMIT);

  return (
    <div className={styles.messageBot}>
      {/* Summary */}
      {msg.text && <div className={styles.messageSummary}>{msg.text}</div>}

      {/* Data table */}
      {columns.length > 0 && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {columns.map(col => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col}>{String(row[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > ROW_LIMIT && !showAllRows && (
            <button className={styles.showMoreBtn} onClick={() => setShowAllRows(true)}>
              Show all {rows.length} rows
            </button>
          )}
        </div>
      )}

      {/* Chart */}
      {msg.chart && <ChartRenderer chart={msg.chart} />}

      {/* SQL toggle */}
      {msg.sql && (
        <>
          <button className={styles.sqlToggle} onClick={() => setShowSql(!showSql)}>
            <Code size={12} />
            {showSql ? 'Hide SQL' : 'View SQL'}
            <ChevronDown size={12} style={{ transform: showSql ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showSql && <pre className={styles.sqlBlock}>{msg.sql}</pre>}
        </>
      )}
    </div>
  );
}

function ChartRenderer({ chart }: { chart: ChartData }) {
  const data = chart.x.map((label, i) => ({
    name: label,
    value: chart.y[i] ?? 0,
  }));

  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height={260}>
        {chart.type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : chart.type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
            <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="var(--color-sage)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : chart.type === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
            <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="var(--color-sage)" fill="rgba(15, 143, 125, 0.15)" strokeWidth={2} />
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
            <YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--color-sage)" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

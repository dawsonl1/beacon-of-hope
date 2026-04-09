import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shield, Mic, Square, Sparkles, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api';
import { APP_TODAY, APP_TODAY_STR } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Dropdown from '../../components/admin/Dropdown';
import MultiSelectDropdown from '../../components/admin/MultiSelectDropdown';
import DatePicker from '../../components/admin/DatePicker';
import TextArea from '../../components/admin/TextArea';
import styles from './RecordingFormPage.module.css';

const GROUP_SESSION_TYPES = ['Group Therapy', 'Family Counseling', 'Psychoeducation'];

interface ResidentFlags {
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  needsCaseConference: boolean;
  readyForReintegration: boolean;
}

const DEFAULT_FLAGS: ResidentFlags = {
  progressNoted: false,
  concernsFlagged: false,
  referralMade: false,
  needsCaseConference: false,
  readyForReintegration: false,
};

interface ResidentOption {
  residentId: number;
  internalCode: string;
}

interface RecordingData {
  recordingId: number;
  residentId: number;
  sessionDate: string | null;
  socialWorker: string | null;
  sessionType: string | null;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  sessionNarrative: string | null;
  interventionsApplied: string | null;
  followUpActions: string | null;
  progressNoted: boolean | null;
  concernsFlagged: boolean | null;
  referralMade: boolean | null;
  needsCaseConference: boolean | null;
  readyForReintegration: boolean | null;
  notesRestricted: string | null;
}

interface GeminiResponse {
  residentCode: string | null;
  sessionDate: string | null;
  socialWorker: string | null;
  sessionType: string | null;
  durationMinutes: number | null;
  emotionalStateStart: string | null;
  emotionalStateEnd: string | null;
  narrative: string | null;
  interventions: string | null;
  followUpActions: string | null;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  riskLevel: string | null;
}

const SESSION_TYPES = [
  'Individual Counseling',
  'Group Therapy',
  'Crisis Intervention',
  'Family Counseling',
  'Art/Play Therapy',
  'Psychoeducation',
  'Assessment',
];

const EMOTIONAL_STATES = [
  'Severe Distress',
  'Distressed',
  'Struggling',
  'Unsettled',
  'Neutral',
  'Coping',
  'Stable',
  'Good',
  'Thriving',
];

const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low'];

const INTERVENTION_OPTIONS = ['Caring', 'Legal Services', 'Healing', 'Teaching'];

const FLAG_COLORS: Record<string, { active: string; activeBg: string; activeBorder: string }> = {
  'Progress Noted': { active: '#1E8449', activeBg: 'rgba(30,132,73,0.1)', activeBorder: '#27AE60' },
  'Concerns Flagged': { active: '#C0392B', activeBg: 'rgba(203,87,104,0.1)', activeBorder: 'rgba(203,87,104,0.5)' },
  'Referral Made': { active: '#D35400', activeBg: 'rgba(255,159,67,0.1)', activeBorder: 'rgba(255,159,67,0.5)' },
  'Needs Case Conference': { active: '#2874A6', activeBg: 'rgba(40,116,166,0.1)', activeBorder: 'rgba(40,116,166,0.5)' },
  'Ready for Reintegration': { active: 'var(--color-sage)', activeBg: 'rgba(15,143,125,0.1)', activeBorder: 'var(--color-sage)' },
};

const GEMINI_PROMPT = `You are a clinical documentation assistant for a children's residential care facility. A social worker has just recorded a voice memo summarizing a counseling session with a resident. Your job is to extract structured data from the audio and return it as JSON.

Return ONLY a JSON object with these exact keys. Use null for any field the speaker did not mention or that you cannot confidently determine:

{
  "residentCode": string | null,
  "sessionDate": string | null,
  "socialWorker": string | null,
  "sessionType": string | null,
  "durationMinutes": number | null,
  "emotionalStateStart": string | null,
  "emotionalStateEnd": string | null,
  "narrative": string | null,
  "interventions": string | null,
  "followUpActions": string | null,
  "progressNoted": boolean,
  "concernsFlagged": boolean,
  "referralMade": boolean,
  "riskLevel": string | null
}

Rules:
- For sessionType: MUST be one of: "Individual Counseling", "Group Therapy", "Crisis Intervention", "Family Counseling", "Art/Play Therapy", "Psychoeducation", "Assessment". If the speaker uses informal language (e.g. "one-on-one"), map to the closest value. If you cannot determine a match, use null.
- For emotionalStateStart and emotionalStateEnd: MUST be one of: "Severe Distress", "Distressed", "Struggling", "Unsettled", "Neutral", "Coping", "Stable", "Good", "Thriving". If the speaker uses informal language (e.g. "they seemed okay at the end"), map to the closest value. If you cannot determine a match, use null.
- For sessionDate: use ISO format YYYY-MM-DD.
- For socialWorker: this is the person recording.
- For durationMinutes: integer, e.g. 45.
- For the narrative field: clean up filler words, false starts, and verbal tics. Exclude filler words or pauses, but try to keep the recorder's voice. This should sound like a professional clinician, NOT AI. Do NOT fabricate details for any reason — only include what the speaker actually said.
- For riskLevel: MUST be one of: "Critical", "High", "Medium", "Low". Only set if the speaker explicitly mentions a risk level change or assessment. If not mentioned, use null.
- For boolean flags: only set to true if the speaker explicitly mentions progress, concerns, or a referral. Default to false.
- If the audio is unclear, too short, or contains no session-relevant content, return all fields as null except the three booleans (which should be false).
- DO NOT hallucinate under any circumstances or infer data that was not spoken. When in doubt, use null.`;

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  return 'audio/webm';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function RecordingFormPage() {
  useDocumentTitle('Recording Form');
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const calendarEventId = searchParams.get('calendarEventId');
  const fromCalendar = Boolean(calendarEventId);
  const { user } = useAuth();

  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [residentId, setResidentId] = useState('');
  const [residentIds, setResidentIds] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState(APP_TODAY_STR);
  const [socialWorker, setSocialWorker] = useState('');
  const [sessionType, setSessionType] = useState('');
  const isGroupSession = GROUP_SESSION_TYPES.includes(sessionType);
  const [duration, setDuration] = useState('');
  const [emotionalStart, setEmotionalStart] = useState('');
  const [emotionalEnd, setEmotionalEnd] = useState('');
  const [narrative, setNarrative] = useState('');
  const [interventions, setInterventions] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState('');
  const [progressNoted, setProgressNoted] = useState(false);
  const [concernsFlagged, setConcernsFlagged] = useState(false);
  const [referralMade, setReferralMade] = useState(false);
  const [notesRestricted, setNotesRestricted] = useState('');
  const [needsCaseConference, setNeedsCaseConference] = useState(false);
  const [readyForReintegration, setReadyForReintegration] = useState(false);
  const [updatedRiskLevel, setUpdatedRiskLevel] = useState('');

  // Per-resident flags for group sessions
  const [perResidentFlags, setPerResidentFlags] = useState<Record<string, ResidentFlags>>({});

  function getFlags(rid: string): ResidentFlags {
    return perResidentFlags[rid] ?? { ...DEFAULT_FLAGS };
  }

  function setFlag(rid: string, flag: keyof ResidentFlags, value: boolean) {
    setPerResidentFlags(prev => ({
      ...prev,
      [rid]: { ...(prev[rid] ?? { ...DEFAULT_FLAGS }), [flag]: value },
    }));
  }

  // Keep perResidentFlags in sync with selected residents
  function handleResidentIdsChange(ids: string[]) {
    setResidentIds(ids);
    setPerResidentFlags(prev => {
      const next = { ...prev };
      for (const rid of ids) {
        if (!next[rid]) next[rid] = { ...DEFAULT_FLAGS };
      }
      return next;
    });
  }

  // Voice memo state
  const [memoState, setMemoState] = useState<'idle' | 'requesting_mic' | 'recording' | 'processing' | 'done'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>(pickMimeType());

  function stopMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
  }

  // Recording timer
  useEffect(() => {
    if (memoState !== 'recording') return;
    setRecordingSeconds(0);
    const interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [memoState]);

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => stopMic();
  }, []);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function startRecording() {
    setErrorMsg('');
    setMemoState('requesting_mic');

    try {
      // Always get a fresh stream
      stopMic();
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analyser for level metering
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(streamRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      // Start level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function updateLevel() {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setAudioLevel(avg);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      }
      updateLevel();

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeTypeRef.current });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setMemoState('recording');
    } catch (err) {
      stopMic();
      setMemoState('idle');
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setErrorMsg('Microphone access is required. Please allow it in your browser settings.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setErrorMsg('No microphone detected. Please connect one and try again.');
      } else {
        setErrorMsg('Could not access microphone. Please try again.');
      }
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;

    setMemoState('processing');

    const audioBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const baseMime = mimeTypeRef.current.split(';')[0];
        resolve(new Blob(audioChunksRef.current, { type: baseMime }));
      };
      recorder.stop();
    });

    // Release mic immediately after capturing audio
    stopMic();

    // Check minimum duration
    if (recordingSeconds < 2) {
      setErrorMsg('Recording was too short. Please try again and describe the session.');
      setMemoState('idle');
      return;
    }

    await sendToGemini(audioBlob);
  }

  async function sendToGemini(audioBlob: Blob) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setErrorMsg('AI service is not configured. Contact your administrator.');
      setMemoState('idle');
      return;
    }

    try {
      const base64Audio = await blobToBase64(audioBlob);
      const baseMime = mimeTypeRef.current.split(';')[0];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: baseMime, data: base64Audio } },
                  { text: GEMINI_PROMPT },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!response.ok) {
        let detail = '';
        try {
          const errBody = await response.json();
          detail = errBody?.error?.message || '';
        } catch { /* ignore */ }
        console.error(`Gemini API error ${response.status}:`, detail);

        if (response.status === 400 || response.status === 403) {
          setErrorMsg(`AI service error: ${detail || 'Check API key configuration.'}`);
        } else {
          setErrorMsg(`AI service returned an error (${response.status}). ${detail || 'Please try again.'}`);
        }
        setMemoState('idle');
        return;
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('Gemini returned no text:', JSON.stringify(result, null, 2));
        setErrorMsg("AI couldn't process that recording. Try again, speaking clearly.");
        setMemoState('idle');
        return;
      }

      let parsed: GeminiResponse;
      try {
        parsed = JSON.parse(text);
      } catch {
        console.error('Failed to parse Gemini response:', text);
        setErrorMsg("AI couldn't process that recording. Try again, speaking clearly.");
        setMemoState('idle');
        return;
      }

      populateForm(parsed);
      setMemoState('done');
    } catch (err) {
      console.error('Gemini fetch error:', err);
      setErrorMsg("Couldn't reach the AI service. Check your connection and try again.");
      setMemoState('idle');
    }
  }

  function populateForm(data: GeminiResponse) {
    // Only set fields where Gemini returned a non-null value
    if (data.residentCode) {
      const match = residents.find(
        (r) => r.internalCode.toLowerCase() === data.residentCode!.toLowerCase()
      );
      if (match) setResidentId(String(match.residentId));
    }

    if (data.sessionDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(data.sessionDate) && new Date(data.sessionDate) <= APP_TODAY) {
        setSessionDate(data.sessionDate);
      }
    }

    if (data.socialWorker) {
      setSocialWorker(data.socialWorker);
    }

    if (data.sessionType && SESSION_TYPES.includes(data.sessionType)) {
      setSessionType(data.sessionType);
    }

    if (data.durationMinutes != null && data.durationMinutes > 0 && data.durationMinutes <= 480) {
      setDuration(String(data.durationMinutes));
    }

    if (data.emotionalStateStart && EMOTIONAL_STATES.includes(data.emotionalStateStart)) {
      setEmotionalStart(data.emotionalStateStart);
    }

    if (data.emotionalStateEnd && EMOTIONAL_STATES.includes(data.emotionalStateEnd)) {
      setEmotionalEnd(data.emotionalStateEnd);
    }

    if (data.narrative) setNarrative(data.narrative);
    if (data.interventions) setInterventions(data.interventions.split(', ').filter(Boolean));
    if (data.followUpActions) setFollowUp(data.followUpActions);

    if (data.progressNoted === true) setProgressNoted(true);
    if (data.concernsFlagged === true) setConcernsFlagged(true);
    if (data.referralMade === true) setReferralMade(true);

    if (data.riskLevel && RISK_LEVELS.includes(data.riskLevel)) {
      setUpdatedRiskLevel(data.riskLevel);
    }
  }

  // Pre-fill social worker name from current user
  useEffect(() => {
    if (!isEdit && user) {
      setSocialWorker(`${user.firstName} ${user.lastName}`.trim());
    }
  }, [user, isEdit]);

  // Load residents for dropdown
  useEffect(() => {
    apiFetch<Array<{ residentId: number; internalCode: string }>>('/api/admin/residents-list')
      .then((data) => {
        setResidents(
          data.map((r) => ({
            residentId: r.residentId,
            internalCode: r.internalCode ?? '',
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Load existing recording for edit
  const loadRecording = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await apiFetch<RecordingData>(`/api/admin/recordings/${id}`);
      setResidentId(String(r.residentId));
      setSessionDate(r.sessionDate?.slice(0, 10) ?? '');
      setSocialWorker(r.socialWorker ?? '');
      setSessionType(r.sessionType ?? '');
      setDuration(r.sessionDurationMinutes != null ? String(r.sessionDurationMinutes) : '');
      setEmotionalStart(r.emotionalStateObserved ?? '');
      setEmotionalEnd(r.emotionalStateEnd ?? '');
      setNarrative(r.sessionNarrative ?? '');
      setInterventions(r.interventionsApplied ? r.interventionsApplied.split(', ').filter(Boolean) : []);
      setFollowUp(r.followUpActions ?? '');
      setProgressNoted(r.progressNoted ?? false);
      setConcernsFlagged(r.concernsFlagged ?? false);
      setReferralMade(r.referralMade ?? false);
      setNeedsCaseConference(r.needsCaseConference ?? false);
      setReadyForReintegration(r.readyForReintegration ?? false);
      setNotesRestricted(r.notesRestricted ?? '');
    } catch {
      setErrorMsg('Failed to load recording.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) loadRecording();
  }, [isEdit, loadRecording]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    const selectedResidentIds = isGroupSession ? residentIds : residentId ? [residentId] : [];

    if (selectedResidentIds.length === 0) {
      setErrorMsg(isGroupSession ? 'Please select at least one resident.' : 'Please select a resident.');
      return;
    }
    if (!sessionDate) {
      setErrorMsg('Please enter a session date.');
      return;
    }
    if (!sessionType) {
      setErrorMsg('Please select a session type.');
      return;
    }

    setSaving(true);
    try {
      function buildBody(rid: number) {
        // Use per-resident flags for group sessions, shared flags for individual
        const flags = isGroupSession ? getFlags(String(rid)) : {
          progressNoted, concernsFlagged, referralMade, needsCaseConference, readyForReintegration,
        };
        return {
          residentId: rid,
          sessionDate,
          socialWorker: socialWorker || null,
          sessionType: sessionType || null,
          sessionDurationMinutes: duration ? Number(duration) : null,
          emotionalStateObserved: emotionalStart || null,
          emotionalStateEnd: emotionalEnd || null,
          sessionNarrative: narrative || null,
          interventionsApplied: interventions.length > 0 ? interventions.join(', ') : null,
          followUpActions: followUp || null,
          progressNoted: flags.progressNoted,
          concernsFlagged: flags.concernsFlagged,
          referralMade: flags.referralMade,
          notesRestricted: notesRestricted || null,
          needsCaseConference: flags.needsCaseConference,
          readyForReintegration: flags.readyForReintegration,
          updatedRiskLevel: updatedRiskLevel || null,
        };
      }

      if (isEdit) {
        await apiFetch(`/api/admin/recordings/${id}`, {
          method: 'PUT',
          body: JSON.stringify(buildBody(Number(residentId))),
        });
        navigate(`/admin/recordings/${id}`, { replace: true });
      } else {
        // Create one recording per selected resident
        await Promise.all(
          selectedResidentIds.map((rid) =>
            apiFetch<{ recordingId: number }>('/api/admin/recordings', {
              method: 'POST',
              body: JSON.stringify(buildBody(Number(rid))),
            })
          )
        );
        // Mark calendar event as completed if linked
        if (calendarEventId) {
          await apiFetch(`/api/staff/calendar/${calendarEventId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Completed' }),
          }).catch(() => {});
        }
        navigate(fromCalendar ? '/admin' : '/admin/recordings', { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save recording.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back */}
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate(fromCalendar ? '/admin' : isEdit ? `/admin/recordings/${id}` : '/admin/recordings')}
      >
        <ArrowLeft size={14} /> {fromCalendar ? 'Back to Calendar' : isEdit ? 'Back to recording' : 'Back to recordings'}
      </button>

      {/* Header */}
      <div className={styles.header}>
        <h1>{isEdit ? 'Edit Recording' : 'New Process Recording'}</h1>
        <p className={styles.subtitle}>
          {isEdit
            ? 'Update this counseling session record.'
            : 'Document a counseling session with a resident.'}
        </p>
      </div>

      {/* Privacy Notice */}
      <div className={styles.privacyNotice}>
        <Shield size={14} />
        <span>
          This form captures confidential counseling data about minors. All entries are access-restricted.
        </span>
      </div>

      {/* Voice Memo — only on new recordings */}
      {!isEdit && (
        <div className={`${styles.memoCard} ${memoState === 'recording' ? styles.memoRecording : ''} ${memoState === 'done' ? styles.memoDone : ''}`}>
          <div className={styles.memoCenter}>
            {(memoState === 'idle' || memoState === 'requesting_mic') && (
              <button
                type="button"
                className={styles.recordBtn}
                onClick={startRecording}
                disabled={memoState === 'requesting_mic'}
                aria-label="Start recording"
              >
                {memoState === 'requesting_mic' ? <div className={styles.memoSpinnerSmall} /> : <Mic size={22} />}
              </button>
            )}

            {memoState === 'recording' && (
              <button
                type="button"
                className={styles.stopBtn}
                onClick={stopRecording}
                aria-label="Stop recording"
              >
                <Square size={16} />
              </button>
            )}

            {memoState === 'processing' && (
              <div className={styles.memoSpinner} />
            )}

            {memoState === 'done' && (
              <div className={styles.memoDoneIcon}>
                <Sparkles size={22} />
              </div>
            )}
          </div>

          {memoState === 'recording' && (
            <div className={styles.memoWaveform}>
              {Array.from({ length: 32 }).map((_, i) => {
                const distance = Math.abs(i - 15.5) / 15.5;
                const scale = 1 - distance * 0.6;
                const height = Math.max(3, audioLevel * 28 * scale + Math.random() * audioLevel * 6);
                return (
                  <div
                    key={i}
                    className={styles.waveBar}
                    style={{ height: `${height}px`, transition: 'height 0.1s ease-out' }}
                  />
                );
              })}
            </div>
          )}

          <h2 className={styles.memoTitle}>
            {(memoState === 'idle' || memoState === 'requesting_mic') && 'Record a Voice Memo'}
            {memoState === 'recording' && 'Listening...'}
            {memoState === 'processing' && 'Processing Audio'}
            {memoState === 'done' && 'Form Updated'}
          </h2>

          <p className={styles.memoDesc}>
            {(memoState === 'idle' || memoState === 'requesting_mic') && 'Describe the session out loud and AI will fill in the form for you.'}
            {memoState === 'recording' && (
              <>Speak naturally about the session details.<br /><span className={styles.memoTimer}>{formatTime(recordingSeconds)}</span></>
            )}
            {memoState === 'processing' && 'Extracting session details from your recording...'}
            {memoState === 'done' && 'Review the fields below and make any corrections before saving.'}
          </p>

          {memoState === 'done' && (
            <button
              type="button"
              className={styles.memoResetBtn}
              onClick={() => setMemoState('idle')}
            >
              <Mic size={13} />
              Record again
            </button>
          )}
        </div>
      )}

      {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── Session Details ─────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Session Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Session Type <span className={styles.required}>*</span></label>
              <Dropdown value={sessionType} placeholder="Select type..." options={SESSION_TYPES.map(t => ({ value: t, label: t }))} onChange={v => setSessionType(v)} />
            </div>
            <div className={styles.field}>
              <label>{isGroupSession ? 'Residents' : 'Resident'} <span className={styles.required}>*</span></label>
              {isGroupSession ? (
                <MultiSelectDropdown
                  values={residentIds}
                  placeholder="Select residents..."
                  options={residents.map(r => ({ value: String(r.residentId), label: r.internalCode }))}
                  onChange={handleResidentIdsChange}
                />
              ) : (
                <Dropdown value={residentId} placeholder="Select resident..." options={residents.map(r => ({ value: String(r.residentId), label: r.internalCode }))} onChange={v => setResidentId(v)} />
              )}
            </div>
            <div className={styles.field}>
              <label>Session Date <span className={styles.required}>*</span></label>
              <DatePicker value={sessionDate} onChange={v => setSessionDate(v)} placeholder="Select date..." max={APP_TODAY_STR} required />
            </div>
            <div className={styles.field}>
              <label>Social Worker</label>
              <input type="text" value={socialWorker} onChange={e => setSocialWorker(e.target.value)} placeholder="Name of social worker" />
            </div>
            <div className={styles.field}>
              <label>Duration (minutes)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="1" max="480" placeholder="e.g. 45" />
            </div>
          </div>
        </div>

        {/* ── Emotional State ─────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Emotional State</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Observed at Start</label>
              <Dropdown value={emotionalStart} placeholder="Select state..." options={EMOTIONAL_STATES.map(s => ({ value: s, label: s }))} onChange={v => setEmotionalStart(v)} />
            </div>
            <div className={styles.field}>
              <label>Observed at End</label>
              <Dropdown value={emotionalEnd} placeholder="Select state..." options={EMOTIONAL_STATES.map(s => ({ value: s, label: s }))} onChange={v => setEmotionalEnd(v)} />
            </div>
          </div>
        </div>

        {/* ── Session Narrative ────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Session Narrative</h2>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Narrative Summary</label>
            <TextArea className={styles.narrativeField} value={narrative} onChange={e => setNarrative(e.target.value)} placeholder="Describe the session, observations, topics discussed, and resident's responses..." />
          </div>
        </div>

        {/* ── Interventions & Follow-up ────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Interventions & Follow-up</h2>
          <div className={styles.field} style={{ maxWidth: '400px' }}>
            <label>Interventions Applied</label>
            <MultiSelectDropdown values={interventions} placeholder="Select interventions..." options={INTERVENTION_OPTIONS.map(i => ({ value: i, label: i }))} onChange={v => setInterventions(v)} />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginTop: '0.75rem' }}>
            <label>Follow-up Actions</label>
            <TextArea className={styles.textareaField} value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="Describe any follow-up actions needed after this session..." />
          </div>
        </div>

        {/* ── Risk Assessment ─────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Risk Assessment</h2>
          <div className={styles.field}>
            <label>Updated Risk Level</label>
            <div style={{ maxWidth: '300px' }}>
              <Dropdown value={updatedRiskLevel} placeholder="No change" options={[{ value: '', label: 'No change' }, ...RISK_LEVELS.map(l => ({ value: l, label: l }))]} onChange={v => setUpdatedRiskLevel(v)} />
            </div>
            <span className={styles.fieldHint} style={{ whiteSpace: 'nowrap' }}>Updates the resident&apos;s current risk level on the caseload inventory.</span>
          </div>
        </div>

        {/* ── Session Flags ───────────────────────── */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Session Flags</h2>
          {isGroupSession && residentIds.length > 0 ? (
            /* Per-resident flags for group sessions */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {residentIds.map(rid => {
                const code = residents.find(r => String(r.residentId) === rid)?.internalCode || `Resident #${rid}`;
                const flags = getFlags(rid);
                return (
                  <div key={rid} style={{ padding: '0.75rem 1rem', background: 'rgba(15,143,125,0.03)', border: '1px solid rgba(15,27,45,0.08)', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-sage)', marginBottom: '0.5rem' }}>{code}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {([
                        { key: 'progressNoted' as const, label: 'Progress Noted' },
                        { key: 'concernsFlagged' as const, label: 'Concerns Flagged' },
                        { key: 'referralMade' as const, label: 'Referral Made' },
                        { key: 'needsCaseConference' as const, label: 'Needs Case Conference' },
                        { key: 'readyForReintegration' as const, label: 'Ready for Reintegration' },
                      ]).map(({ key, label }) => {
                        const checked = flags[key];
                        const flagColor = FLAG_COLORS[label];
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setFlag(rid, key, !checked)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.4rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem',
                              fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
                              border: checked ? `1px solid ${flagColor.activeBorder}` : '1px solid rgba(15,27,45,0.12)',
                              background: checked ? flagColor.activeBg : '#fff',
                              color: checked ? flagColor.active : 'var(--text-muted)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {checked && <span style={{ fontSize: '0.65rem' }}>&#10003;</span>}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isGroupSession ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select residents above to set individual flags.</p>
          ) : (
            /* Single-resident flags */
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {([
                { checked: progressNoted, set: setProgressNoted, label: 'Progress Noted' },
                { checked: concernsFlagged, set: setConcernsFlagged, label: 'Concerns Flagged' },
                { checked: referralMade, set: setReferralMade, label: 'Referral Made' },
                { checked: needsCaseConference, set: setNeedsCaseConference, label: 'Needs Case Conference' },
                { checked: readyForReintegration, set: setReadyForReintegration, label: 'Ready for Reintegration' },
              ] as const).map(({ checked, set, label }) => {
                const flagColor = FLAG_COLORS[label];
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set(!checked)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.4rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem',
                      fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
                      border: checked ? `1px solid ${flagColor.activeBorder}` : '1px solid rgba(15,27,45,0.12)',
                      background: checked ? flagColor.activeBg : '#fff',
                      color: checked ? flagColor.active : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {checked && <span style={{ fontSize: '0.65rem' }}>&#10003;</span>}
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Restricted Notes ─────────────────────── */}
        <div className={styles.formCard}>
          <div style={{ background: 'rgba(203,87,104,0.04)', border: '1px solid rgba(203,87,104,0.2)', borderRadius: 'var(--radius-sm)', padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-rose)', marginBottom: '0.6rem' }}>
              <Shield size={16} /> Confidential Notes
            </div>
            <div className={styles.field}>
              <TextArea className={styles.textareaField} rows={3} value={notesRestricted} onChange={e => setNotesRestricted(e.target.value)} placeholder="Sensitive notes visible only to authorized staff..." style={{ background: '#fff' }} />
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────── */}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(fromCalendar ? '/admin' : isEdit ? `/admin/recordings/${id}` : '/admin/recordings')}>
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Recording' : 'Save Recording'}
          </button>
        </div>
      </form>
    </div>
  );
}

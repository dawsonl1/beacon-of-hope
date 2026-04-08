import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Mic, Square, Sparkles } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RecordingFormPage.module.css';

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
  "referralMade": boolean
}

Rules:
- For sessionType: MUST be one of: "Individual Counseling", "Group Therapy", "Crisis Intervention", "Family Counseling", "Art/Play Therapy", "Psychoeducation", "Assessment". If the speaker uses informal language (e.g. "one-on-one"), map to the closest value. If you cannot determine a match, use null.
- For emotionalStateStart and emotionalStateEnd: MUST be one of: "Severe Distress", "Distressed", "Struggling", "Unsettled", "Neutral", "Coping", "Stable", "Good", "Thriving". If the speaker uses informal language (e.g. "they seemed okay at the end"), map to the closest value. If you cannot determine a match, use null.
- For sessionDate: use ISO format YYYY-MM-DD.
- For socialWorker: this is the person recording.
- For durationMinutes: integer, e.g. 45.
- For the narrative field: clean up filler words, false starts, and verbal tics. Exclude filler words or pauses, but try to keep the recorder's voice. This should sound like a professional clinician, NOT AI. Do NOT fabricate details for any reason — only include what the speaker actually said.
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
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [residentId, setResidentId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [socialWorker, setSocialWorker] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [duration, setDuration] = useState('');
  const [emotionalStart, setEmotionalStart] = useState('');
  const [emotionalEnd, setEmotionalEnd] = useState('');
  const [narrative, setNarrative] = useState('');
  const [interventions, setInterventions] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [progressNoted, setProgressNoted] = useState(false);
  const [concernsFlagged, setConcernsFlagged] = useState(false);
  const [referralMade, setReferralMade] = useState(false);

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
      if (dateRegex.test(data.sessionDate) && new Date(data.sessionDate) <= new Date()) {
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
    if (data.interventions) setInterventions(data.interventions);
    if (data.followUpActions) setFollowUp(data.followUpActions);

    if (data.progressNoted === true) setProgressNoted(true);
    if (data.concernsFlagged === true) setConcernsFlagged(true);
    if (data.referralMade === true) setReferralMade(true);
  }

  // Pre-fill social worker name from current user
  useEffect(() => {
    if (!isEdit && user) {
      setSocialWorker(`${user.firstName} ${user.lastName}`.trim());
    }
  }, [user, isEdit]);

  // Load residents for dropdown
  useEffect(() => {
    apiFetch<Array<Record<string, unknown>>>('/api/admin/residents?page=1&pageSize=500&sortBy=code_asc')
      .then((data) => {
        setResidents(
          data.map((r) => ({
            residentId: r.residentId as number,
            internalCode: (r.internalCode as string) ?? '',
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
      setInterventions(r.interventionsApplied ?? '');
      setFollowUp(r.followUpActions ?? '');
      setProgressNoted(r.progressNoted ?? false);
      setConcernsFlagged(r.concernsFlagged ?? false);
      setReferralMade(r.referralMade ?? false);
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

    if (!residentId) {
      setErrorMsg('Please select a resident.');
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
      const body = {
        residentId: Number(residentId),
        sessionDate,
        socialWorker: socialWorker || null,
        sessionType: sessionType || null,
        sessionDurationMinutes: duration ? Number(duration) : null,
        emotionalStateObserved: emotionalStart || null,
        emotionalStateEnd: emotionalEnd || null,
        sessionNarrative: narrative || null,
        interventionsApplied: interventions || null,
        followUpActions: followUp || null,
        progressNoted,
        concernsFlagged,
        referralMade,
        notesRestricted: null as string | null,
      };

      if (isEdit) {
        await apiFetch(`/api/admin/recordings/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        navigate(`/admin/recordings/${id}`, { replace: true });
      } else {
        const result = await apiFetch<{ recordingId: number }>('/api/admin/recordings', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        navigate(`/admin/recordings/${result.recordingId}`, { replace: true });
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
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Back */}
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate(isEdit ? `/admin/recordings/${id}` : '/admin/recordings')}
      >
        <ArrowLeft size={14} /> {isEdit ? 'Back to recording' : 'Back to recordings'}
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

      <form className={styles.formCard} onSubmit={handleSubmit}>
        {/* Session Details */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Details</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>
                Resident <span className={styles.required}>*</span>
              </label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
              >
                <option value="">Select resident...</option>
                {residents.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.internalCode}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>
                Session Date <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>

            <div className={styles.field}>
              <label>Social Worker</label>
              <input
                type="text"
                value={socialWorker}
                onChange={(e) => setSocialWorker(e.target.value)}
                placeholder="Name of social worker"
              />
            </div>

            <div className={styles.field}>
              <label>
                Session Type <span className={styles.required}>*</span>
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                required
              >
                <option value="">Select type...</option>
                {SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                max="480"
                placeholder="e.g. 45"
              />
            </div>
          </div>
        </div>

        {/* Emotional State */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Emotional State</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Observed at Start</label>
              <select
                value={emotionalStart}
                onChange={(e) => setEmotionalStart(e.target.value)}
              >
                <option value="">Select state...</option>
                {EMOTIONAL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Observed at End</label>
              <select
                value={emotionalEnd}
                onChange={(e) => setEmotionalEnd(e.target.value)}
              >
                <option value="">Select state...</option>
                {EMOTIONAL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Narrative</h2>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label>Narrative Summary</label>
            <textarea
              className={styles.narrativeField}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Describe the session, observations, topics discussed, and resident's responses..."
            />
          </div>
        </div>

        {/* Interventions */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Interventions &amp; Follow-up</h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>Interventions Applied</label>
              <textarea
                className={styles.textareaField}
                value={interventions}
                onChange={(e) => setInterventions(e.target.value)}
                placeholder="List interventions used during this session (e.g., CBT, Play Therapy, Grounding Techniques)..."
              />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label>Follow-up Actions</label>
              <textarea
                className={styles.textareaField}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Describe any follow-up actions needed after this session..."
              />
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Flags</h2>
          <div className={styles.checkboxRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={progressNoted}
                onChange={(e) => setProgressNoted(e.target.checked)}
              />
              <span>Progress Noted</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={concernsFlagged}
                onChange={(e) => setConcernsFlagged(e.target.checked)}
              />
              <span>Concerns Flagged</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={referralMade}
                onChange={(e) => setReferralMade(e.target.checked)}
              />
              <span>Referral Made</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() =>
              navigate(isEdit ? `/admin/recordings/${id}` : '/admin/recordings')
            }
          >
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

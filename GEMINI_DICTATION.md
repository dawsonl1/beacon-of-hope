# Voice Memo Dictation — Implementation Spec

## Overview

On the **New Process Recording** page (`/admin/recordings/new`), admins can record a short voice memo describing a counseling session. The audio is sent to the **Gemini API** which transcribes it, extracts structured data, and returns JSON that auto-populates the form fields. This is a frontend-only feature — no backend or database changes.

---

## Architecture

```
[Browser Mic] → MediaRecorder (webm/opus) → Blob
     → base64-encode → Gemini API (generateContent, inline audio)
     → JSON response → parse → call React setState for each form field
```

### API Key

- Stored as `VITE_GEMINI_API_KEY` in `.env` (gitignored).
- Accessed in code via `import.meta.env.VITE_GEMINI_API_KEY`.
- Direct client-side call to Gemini — no backend proxy for now.

### Audio Format

- Use `MediaRecorder` with `mimeType: 'audio/webm;codecs=opus'` (native in Chrome/Edge/Firefox).
- Fallback: if `isTypeSupported` fails, try `audio/webm` without codec, then `audio/mp4`.
- Gemini supports `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav` — all fine.

---

## Microphone Permission Flow

1. **First click** on the record button → call `navigator.mediaDevices.getUserMedia({ audio: true })`.
2. If the user **grants** permission → start recording immediately (no extra click needed).
3. If the user **denies** permission → show a friendly error: *"Microphone access is required for voice memos. Please allow it in your browser settings."* Stay in `idle` state.
4. Cache the `MediaStream` for the session so subsequent recordings don't re-prompt (browsers remember the grant).
5. Stop all tracks when leaving the page (cleanup in `useEffect` return).

---

## Gemini API Call

### Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}
```

Use `gemini-1.5-flash` for speed and cost efficiency — audio understanding is well-supported.

### Request Shape

```json
{
  "contents": [
    {
      "parts": [
        {
          "inline_data": {
            "mime_type": "audio/webm",
            "data": "<base64-encoded-audio>"
          }
        },
        {
          "text": "<SYSTEM_PROMPT below>"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json"
  }
}
```

### System Prompt

```
You are a clinical documentation assistant for a children's residential care facility. A social worker has just recorded a voice memo summarizing a counseling session with a resident. Your job is to extract structured data from the audio and return it as JSON.

Return ONLY a JSON object with these exact keys. Use null for any field the speaker did not mention or that you cannot confidently determine:

{
  "residentCode": string | null,
  "sessionDate": string | null,         // ISO format YYYY-MM-DD
  "socialWorker": string | null,       // The Person Recording
  "sessionType": string | null,          // MUST be one of: "Individual Counseling", "Group Therapy", "Crisis Intervention", "Family Counseling", "Art/Play Therapy", "Psychoeducation", "Assessment"
  "durationMinutes": number | null,      // integer, e.g. 45
  "emotionalStateStart": string | null,  // MUST be one of: "Severe Distress", "Distressed", "Struggling", "Unsettled", "Neutral", "Coping", "Stable", "Good", "Thriving"
  "emotionalStateEnd": string | null,    // same options as above
  "narrative": string | null,            // clean, professional prose summary of the session — exclude filler words or pauses, but try to keep the recorder's voice. This should sound like a professional clinician, NOT AI.
  "interventions": string | null,        // comma-separated or paragraph of interventions used
  "followUpActions": string | null,      // next steps, referrals, tasks
  "progressNoted": boolean,              // default false if unclear
  "concernsFlagged": boolean,            // default false if unclear
  "referralMade": boolean                // default false if unclear
}

Rules:
- For sessionType, emotionalStateStart, and emotionalStateEnd: if the speaker uses informal language (e.g. "one-on-one", "they seemed okay at the end"), map it to the closest allowed enum value. If you cannot determine a match, use null.
- For the narrative field: clean up filler words, false starts, and verbal tics. Write in third person, past tense, professional clinical style. Do NOT fabricate details for any reason— only include what the speaker actually said.
- For boolean flags: only set to true if the speaker explicitly mentions progress, concerns, or a referral. Default to false.
- If the audio is unclear, too short, or contains no session-relevant content, return all fields as null except the three booleans (which should be false).
- DO NOT hallucinate under any circumstances or infer data that was not spoken. When in doubt, use null.
```

---

## Form Population Logic

After parsing Gemini's JSON response:

1. **residentCode** → find matching resident in the `residents` array by `internalCode`. If found, call `setResidentId(String(match.residentId))`. If not found, skip (don't clear existing selection).
2. **sessionDate** → validate it's a real date in `YYYY-MM-DD` format and not in the future. If valid, `setSessionDate(value)`.
3. **socialWorker** → `setSocialWorker(value)` (only if not null; don't overwrite the auto-filled current user name unless Gemini returns a different name).
4. **sessionType** → validate it's in the `SESSION_TYPES` array. If valid, `setSessionType(value)`.
5. **durationMinutes** → validate it's a positive integer ≤ 480. If valid, `setDuration(String(value))`.
6. **emotionalStateStart / emotionalStateEnd** → validate against `EMOTIONAL_STATES` array. If valid, set.
7. **narrative** → `setNarrative(value)`.
8. **interventions** → `setInterventions(value)`.
9. **followUpActions** → `setFollowUp(value)`.
10. **progressNoted / concernsFlagged / referralMade** → `setProgressNoted(value)`, etc.

**Important**: Only set fields where Gemini returned a non-null value. Never clear a field that the user already filled in manually before recording.

---

## State Machine

```
idle → (click record) → requesting_mic → (granted) → recording
                                        → (denied)  → idle + error

recording → (click stop) → processing → (success) → done
                                       → (error)   → idle + error

done → (click "Record again") → idle
```

Add `requesting_mic` as a transient state so the button shows a brief loading indicator while the permission dialog is open.

---

## Error Handling


| Scenario                            | User-facing message                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Mic permission denied               | "Microphone access is required. Please allow it in your browser settings."   |
| Mic not available (no hardware)     | "No microphone detected. Please connect one and try again."                  |
| Recording too short (< 2 seconds)   | "Recording was too short. Please try again and describe the session."        |
| Gemini API network error            | "Couldn't reach the AI service. Check your connection and try again."        |
| Gemini API key missing/invalid      | "AI service is not configured. Contact your administrator."                  |
| Gemini returns unparseable response | "AI couldn't process that recording. Try again, speaking clearly."           |
| Gemini returns all nulls            | "No session details detected. Try again with more detail about the session." |


All errors display in the existing `errorMsg` state and the memo card resets to `idle`.

---

## Files to Modify

1. `**frontend/src/pages/admin/RecordingFormPage.tsx**` — add MediaRecorder logic, Gemini fetch, and form population in the existing memo state handlers.
2. `**frontend/src/pages/admin/RecordingFormPage.module.css**` — already has all needed styles (memo card, waveform, states).
3. `**frontend/.env**` — add `VITE_GEMINI_API_KEY=<key>`.
4. `**frontend/.env.example**` — add `VITE_GEMINI_API_KEY=` as a placeholder.

No new files needed. No backend changes. No new dependencies (Gemini is called via `fetch`).

---

## Testing Checklist

- Mic permission prompt appears on first click
- Denying mic permission shows error, stays in idle
- Recording starts and waveform animates
- Timer counts up during recording
- Stopping sends audio to Gemini and shows processing spinner
- Form fields populate correctly from Gemini response
- Fields the user already filled are not overwritten with null
- "Record again" resets to idle
- Enum fields (sessionType, emotional states) only accept valid values
- Very short recordings (< 2s) show a helpful message
- Network errors are caught and displayed
- Voice memo section does NOT appear on the edit page
- Page cleanup stops media tracks on unmount


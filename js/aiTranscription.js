/* ═══════════════════════════════════════════════
   SafeHer — Feature: AI Transcription Module
   Runs 100% in browser, zero server cost
   Uses Whisper-tiny model (~40MB, cached after first load)
   Powered by Hugging Face Transformers.js
   ═══════════════════════════════════════════════ */

let transcriber = null;
let isModelLoading = false;
let transcriptLines = [];
let isTranscribing = false;
let activeMediaRecorderRef = null;

/**
 * loadTranscriptionModel()
 * Pre-loads the Whisper-tiny model. ~40MB download on first use,
 * then cached permanently in the browser.
 */
export async function loadTranscriptionModel() {
  if (transcriber || isModelLoading) return transcriber;
  isModelLoading = true;

  try {
    if (!window.TransformersPipeline) {
      console.warn('[AI Transcription] Transformers.js pipeline not available on window');
      isModelLoading = false;
      return null;
    }

    showTranscriptionStatus('Loading AI transcription model (first time only — ~40MB)...');

    transcriber = await window.TransformersPipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      { quantized: true }  // smaller, faster
    );

    showTranscriptionStatus('AI transcription ready ✓');
    isModelLoading = false;
    console.log('[AI Transcription] ✅ Whisper-tiny model loaded');
    return transcriber;
  } catch (error) {
    console.error('[AI Transcription] Failed to load transcription model:', error);
    showTranscriptionStatus('AI transcription unavailable');
    isModelLoading = false;
    return null;
  }
}

/**
 * startTranscription()
 * Begin capturing audio in 5-second chunks and transcribing with Whisper.
 * Returns the MediaRecorder instance — caller must store it to stop later.
 */
export async function startTranscription() {
  if (!transcriber) {
    await loadTranscriptionModel();
  }
  if (!transcriber) {
    console.warn('[AI Transcription] Model not available — skipping transcription');
    return null;
  }

  transcriptLines = [];
  isTranscribing = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    });

    mediaRecorder.ondataavailable = async (event) => {
      if (!isTranscribing || event.data.size === 0) return;

      try {
        const audioBlob = new Blob([event.data], { type: mediaRecorder.mimeType });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const result = await transcriber(arrayBuffer);

        if (result && result.text && result.text.trim().length > 0) {
          const timestamp = new Date().toLocaleTimeString();
          const line = `[${timestamp}] ${result.text.trim()}`;
          transcriptLines.push(line);
          updateTranscriptDisplay(line);
          saveTranscriptToIndexedDB(transcriptLines.join('\n'));
        }
      } catch (err) {
        console.error('[AI Transcription] Chunk transcription error:', err);
      }
    };

    // Capture in 5-second chunks
    mediaRecorder.start(5000);
    activeMediaRecorderRef = mediaRecorder;

    console.log('[AI Transcription] ✅ Started transcription');
    showTranscriptionStatus('🎙️ AI Transcription active');

    return mediaRecorder;
  } catch (err) {
    console.error('[AI Transcription] Failed to start:', err);
    isTranscribing = false;
    return null;
  }
}

/**
 * stopTranscription(mediaRecorder)
 * Stop capturing and transcribing. Returns the full transcript text.
 */
export function stopTranscription(mediaRecorder) {
  isTranscribing = false;

  const recorderToStop = mediaRecorder || activeMediaRecorderRef;
  if (recorderToStop && recorderToStop.state !== 'inactive') {
    try {
      recorderToStop.stop();
      // Stop all audio tracks
      recorderToStop.stream?.getTracks().forEach(t => t.stop());
    } catch (_) {}
  }
  activeMediaRecorderRef = null;

  const fullTranscript = transcriptLines.join('\n');
  console.log('[AI Transcription] Stopped. Lines:', transcriptLines.length);

  // Save final transcript
  if (fullTranscript) {
    saveTranscriptToIndexedDB(fullTranscript);
  }

  return fullTranscript;
}

/**
 * getTranscriptLines()
 * Returns the current transcript lines array.
 */
export function getTranscriptLines() {
  return [...transcriptLines];
}

/**
 * saveTranscriptToIndexedDB(transcriptText)
 * Save running transcript to IndexedDB SafeHerDB → transcripts store.
 */
export function saveTranscriptToIndexedDB(transcriptText) {
  try {
    const request = indexedDB.open('SafeHerDB', 4);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('transcripts')) {
        db.createObjectStore('transcripts', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('transcripts')) {
        db.close();
        return;
      }
      try {
        const tx = db.transaction(['transcripts'], 'readwrite');
        const store = tx.objectStore('transcripts');
        store.put({
          id: 'current_sos_transcript',
          text: transcriptText,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[AI Transcription] IndexedDB write failed:', err);
      }
    };

    request.onerror = () => {
      console.warn('[AI Transcription] IndexedDB open failed');
    };
  } catch (err) {
    console.warn('[AI Transcription] IndexedDB error:', err);
  }
}

/**
 * showTranscriptionStatus(message)
 * Display a small floating status badge.
 */
function showTranscriptionStatus(message) {
  let badge = document.getElementById('safeher-transcription-status');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'safeher-transcription-status';
    badge.style.cssText = 'position:fixed;bottom:80px;right:10px;background:#1a1a2e;color:#ff6b9d;padding:6px 12px;border-radius:20px;font-size:11px;z-index:9999;border:1px solid #8b1a4a;font-family:inherit;pointer-events:none;transition:opacity 0.3s;';
    document.body.appendChild(badge);
  }
  badge.textContent = message;
  badge.style.display = 'block';
  badge.style.opacity = '1';
  setTimeout(() => {
    badge.style.opacity = '0';
    setTimeout(() => { badge.style.display = 'none'; }, 300);
  }, 4000);
}

/**
 * updateTranscriptDisplay(line)
 * Append a new transcript line to a live display element (if present).
 */
function updateTranscriptDisplay(line) {
  let display = document.getElementById('safeher-transcript-display');
  if (display) {
    display.textContent += line + '\n';
    display.scrollTop = display.scrollHeight;
  }
}

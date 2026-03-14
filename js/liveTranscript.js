/* ═══════════════════════════════════════════════
   SafeHer — Feature: Live Transcript Module
   Uses browser's built-in Web Speech API
   Zero new dependencies — lighter than Transformers.js
   Runs alongside existing keyword detection without interfering
   ═══════════════════════════════════════════════ */

let continuousRecognition = null;
let liveTranscriptLines = [];
let isActive = false;

/**
 * startLiveTranscript(language)
 * Start continuous speech recognition for live transcription.
 * Does NOT interfere with existing voiceDetect.js keyword detection
 * because it creates its own SpeechRecognition instance.
 */
export function startLiveTranscript(language = 'en-IN') {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('[LiveTranscript] Web Speech API not supported in this browser');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  continuousRecognition = new SpeechRecognition();

  continuousRecognition.continuous = true;       // keep listening
  continuousRecognition.interimResults = true;   // show partial results
  continuousRecognition.lang = language;
  continuousRecognition.maxAlternatives = 1;

  liveTranscriptLines = [];
  isActive = true;

  continuousRecognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const timestamp = new Date().toLocaleTimeString();
        const text = event.results[i][0].transcript.trim();
        if (text.length > 0) {
          const line = `[${timestamp}] ${text}`;
          liveTranscriptLines.push(line);
          appendToTranscriptStorage(line);
          updateLiveDisplay(line);
        }
      }
    }
  };

  continuousRecognition.onerror = (event) => {
    console.warn('[LiveTranscript] Error:', event.error);
    // Auto-restart on recoverable errors
    if (isActive && (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network')) {
      setTimeout(() => {
        if (isActive && continuousRecognition) {
          try { continuousRecognition.start(); } catch (_) {}
        }
      }, 1000);
    }
  };

  continuousRecognition.onend = () => {
    // Auto-restart if SOS still active
    if (isActive && window.safeherSOSActive) {
      try { continuousRecognition.start(); } catch (_) {}
    }
  };

  try {
    continuousRecognition.start();
    console.log('[LiveTranscript] ✅ Started continuous speech recognition');
  } catch (err) {
    console.error('[LiveTranscript] Failed to start:', err);
    return null;
  }

  return continuousRecognition;
}

/**
 * stopLiveTranscript()
 * Stop continuous recognition and return the full transcript.
 */
export function stopLiveTranscript() {
  isActive = false;
  if (continuousRecognition) {
    try { continuousRecognition.stop(); } catch (_) {}
    continuousRecognition = null;
  }
  const fullText = liveTranscriptLines.join('\n');
  console.log('[LiveTranscript] Stopped. Lines:', liveTranscriptLines.length);
  return fullText;
}

/**
 * getTranscriptAsBlob()
 * Package the transcript as a downloadable text file.
 */
export function getTranscriptAsBlob() {
  const text = liveTranscriptLines.join('\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    blob: new Blob([text], { type: 'text/plain' }),
    filename: `safeher-transcript-${timestamp}.txt`
  };
}

/**
 * getLiveTranscriptText()
 * Get current transcript text.
 */
export function getLiveTranscriptText() {
  return liveTranscriptLines.join('\n');
}

/**
 * downloadTranscript()
 * Trigger a file download of the transcript.
 */
export function downloadTranscript() {
  const { blob, filename } = getTranscriptAsBlob();
  if (blob.size === 0) {
    if (window.showToast) window.showToast('No transcript data to download', 'warning');
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  if (window.showToast) window.showToast('📄 Transcript downloaded!', 'success');
}

/* ── Internal helpers ── */

function appendToTranscriptStorage(line) {
  try {
    const existing = sessionStorage.getItem('safeher_live_transcript') || '';
    sessionStorage.setItem('safeher_live_transcript', existing + line + '\n');
  } catch (_) {}
}

function updateLiveDisplay(line) {
  let display = document.getElementById('safeher-transcript-display');
  if (display) {
    display.textContent += line + '\n';
    display.scrollTop = display.scrollHeight;
  }
}

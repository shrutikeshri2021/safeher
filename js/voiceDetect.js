/* ═══════════════════════════════════════════════
   SafeHer — Voice Detection Module
   SpeechRecognition for distress keywords,
   exports start() / stop() for safeMode integration
   ═══════════════════════════════════════════════ */

import { showCountdown, hideCountdown, showToast, sendEmergencyAlert,
         playSiren, stopSiren, updateHeaderStatus, updateStatusCard } from './alerts.js';
import { startEmergencyRecording, stopRecording } from './recorder.js';

/* ──── Global ref ──── */
let AppState = null;

export function setAppState(state) { AppState = state; }

/* ──── Config ──── */
const DISTRESS_KEYWORDS = [
  'help', 'stop', 'no', 'please', 'save me', 'let me go',
  'leave me alone', 'fire', 'emergency', 'danger', 'police',
  'get away', 'somebody help', 'call 911', 'call police',
  'bachao', 'madad', 'chhodo', 'hatao', 'koi hai'
];

/* ──── Internal state ──── */
let recognition = null;
let listening = false;
let autoRestart = true;

/* ══════════════════════════════════════════
   start()  — begin speech recognition
   Continuous, interimResults, auto-restart
   ══════════════════════════════════════════ */
export function start() {
  if (listening || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  autoRestart = true;

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join(' ')
      .toLowerCase();

    const found = DISTRESS_KEYWORDS.some(kw => transcript.includes(kw));
    if (found) {
      triggerVoiceAlert(transcript);
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      showToast('Microphone access denied', 'error');
      autoRestart = false;
    }
  };

  recognition.onend = () => {
    if (autoRestart && listening) {
      try { recognition.start(); } catch (_) {}
    }
  };

  try {
    recognition.start();
    listening = true;
  } catch (_) {}
}

/* ══════════════════════════════════════════
   stop()  — halt speech recognition
   ══════════════════════════════════════════ */
export function stop() {
  autoRestart = false;
  listening = false;
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
}

/* ══════════════════════════════════════════
   triggerVoiceAlert(transcript)
   5-second countdown → full SOS if not cancelled
   ══════════════════════════════════════════ */
function triggerVoiceAlert(transcript) {
  if (AppState?.safeMode || AppState?.emergencyActive) return;

  showToast(`Distress detected: "${truncate(transcript, 60)}"`, 'warning');

  if (navigator.vibrate) navigator.vibrate([500, 200, 500]);

  showCountdown(
    /* onComplete (SOS fires) */
    async () => {
      if (AppState) {
        AppState.emergencyActive = true;
        AppState.threatScore = Math.min(100, (AppState.threatScore || 0) + 30);
      }

      updateHeaderStatus('alert', '🚨 Voice SOS');
      updateStatusCard('alert', '🚨 Voice Distress Detected', 'Emergency recording & alerts in progress.');

      playSiren();
      if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);

      try { await startEmergencyRecording(); } catch (_) {}
      sendEmergencyAlert('voice');
    },
    /* onCancel */
    () => {
      showToast('Alert cancelled', 'info');
    }
  );
}

/* ── Utility ──────────────────────────────── */
function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

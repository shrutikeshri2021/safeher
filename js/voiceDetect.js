/* ═══════════════════════════════════════════════
   SafeHer — Voice Keyword Detection  (Step 7)
   SpeechRecognition, distress keywords,
   5-second countdown → full emergency
   ═══════════════════════════════════════════════ */

import {
  showCountdown, hideCountdown, showToast,
  sendEmergencyAlert, updateHeaderStatus, updateStatusCard
} from './alerts.js';
import { startRecording } from './recorder.js';
import { logEvent } from './historyLogger.js';

/* ──── Global ref (injected by app.js) ──── */
let AppState = null;
export function setAppState(state) { AppState = state; }

/* ──── Distress Keywords ────
   English + Hindi + Tamil + Telugu + Bengali +
   Marathi + Gujarati + Kannada + Malayalam
   Transliterated — SpeechRecognition matches phonetics
   ──── */
const DISTRESS_KEYWORDS = [
  /* English */
  'save me', 'help', 'help me', 'emergency',
  'leave me', 'let me go', 'stop', 'no no no', 'please stop',

  /* Hindi */
  'bachao', 'madad', 'chodo', 'bachao mujhe', 'chhod do',
  'mujhe bachao', 'koi bachao', 'dur hato',

  /* Tamil */
  'kaappaathungal', 'udavi', 'udavi seiyungal',
  'vidungal', 'niruthu', 'ennai vittuvidungal', 'thayavu seithu',

  /* Telugu */
  'kaapaadam', 'sahayam', 'sahayam cheyandi',
  'vadilandi', 'aapandi', 'nannu vadilandi', 'aagandi',

  /* Bengali */
  'bachao', 'sahajjo', 'amake bachao',
  'chere dao', 'thamao', 'amake chere dao', 'dure jao',

  /* Marathi */
  'vachva', 'vachava', 'madad kara',
  'sodha', 'thamba', 'mala soda', 'dur vha',

  /* Gujarati */
  'bachavo', 'madad karo', 'mane bachavo',
  'chhodo', 'ubha raho', 'mane chhodi do', 'dur jao',

  /* Kannada */
  'kaapadi', 'sahaya', 'sahaya maadi',
  'bidi', 'nilisu', 'nannu bidi', 'door hogi',

  /* Malayalam */
  'rakshikku', 'sahayam', 'sahayikku',
  'vidoo', 'nilkku', 'enne vidoo', 'enne rakshikku'
];

/* ──── Internal state ──── */
let recognition  = null;
let listening    = false;
let shouldRestart = true;  // flag so onend knows whether to auto-restart
let audioCtx     = null;   // for the alert beep

/* ══════════════════════════════════════════
   start()
   - Feature-detect SpeechRecognition
   - Create instance, attach handlers, start
   ══════════════════════════════════════════ */
export function start() {
  if (listening) return;

  // Feature detection
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('Voice detection not supported on this browser', 'info');
    return;
  }

  recognition = new SpeechRec();
  recognition.continuous      = true;
  recognition.interimResults  = true;
  // en-US works for all transliterated keywords (Hindi, Tamil, etc.)
  // The engine phonetically approximates non-English words
  recognition.lang            = 'en-US';

  shouldRestart = true;

  /* ── onresult ── */
  recognition.onresult = (event) => {
    // Combine all result items into one transcript string
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript)
      .join(' ')
      .toLowerCase();

    // Check each keyword
    for (const kw of DISTRESS_KEYWORDS) {
      if (transcript.includes(kw)) {
        triggerVoiceAlert(kw);
        break;                       // one trigger per batch is enough
      }
    }
  };

  /* ── onerror ── */
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      showToast('Microphone access denied — please allow in Settings', 'error');
      shouldRestart = false;
    }
    // 'no-speech' and 'aborted' are recoverable — let onend restart
  };

  /* ── onend → auto-restart if not in safe mode ── */
  recognition.onend = () => {
    if (shouldRestart && listening && !(AppState?.safeMode)) {
      try { recognition.start(); } catch (_) {}
    }
  };

  try {
    recognition.start();
    listening = true;
  } catch (_) {}
}

/* ══════════════════════════════════════════
   stop()
   - Stop recognition, set flag so onend
     does NOT restart
   ══════════════════════════════════════════ */
export function stop() {
  shouldRestart = false;
  listening = false;
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
}

/* ══════════════════════════════════════════
   triggerVoiceAlert(keyword)
   1. Guard: safeMode / emergencyActive → return
   2. Show 5-second countdown overlay
      • Text: "Distress keyword detected: '{keyword}'"
      • Red button: "FALSE ALARM — TAP TO CANCEL"
      • If not cancelled → activateFullEmergency('voice')
   3. Play short alert beep (Web Audio API)
   4. Vibrate [200, 100, 200]
   ══════════════════════════════════════════ */
function triggerVoiceAlert(keyword) {
  if (AppState?.safeMode || AppState?.emergencyActive) return;

  // Update countdown overlay text before showing
  const countdownHeading = document.querySelector('#countdown-overlay .countdown-content h2');
  if (countdownHeading) countdownHeading.textContent = `Distress keyword detected: '${keyword}'`;

  const cancelBtn = document.getElementById('btn-cancel-countdown');
  if (cancelBtn) cancelBtn.textContent = 'FALSE ALARM — TAP TO CANCEL';

  // 5-second countdown
  showCountdown(
    /* onComplete — not cancelled in 5 s */
    () => activateFullEmergency('voice'),
    /* onCancel */
    () => {
      showToast('Alert cancelled — stay safe', 'info');
      // Restore default countdown text
      if (countdownHeading) countdownHeading.textContent = 'Sending SOS Alert…';
      if (cancelBtn) cancelBtn.textContent = "Cancel — I'm Safe";
    }
  );

  // Short alert beep via Web Audio
  playAlertBeep();

  // Vibrate
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

/* ══════════════════════════════════════════
   activateFullEmergency(source)
   1. Hide countdown overlay
   2. AppState.emergencyActive = true
   3. Start recording via recorder.startRecording(source)
   4. Send alerts via alerts.sendEmergencyAlert(source)
   5. Show emergency banner
   6. Add 30 to threat score
   ══════════════════════════════════════════ */
async function activateFullEmergency(source) {
  hideCountdown();

  // Restore default countdown text for future use
  const countdownHeading = document.querySelector('#countdown-overlay .countdown-content h2');
  if (countdownHeading) countdownHeading.textContent = 'Sending SOS Alert…';
  const cancelBtn = document.getElementById('btn-cancel-countdown');
  if (cancelBtn) cancelBtn.textContent = "Cancel — I'm Safe";

  if (AppState) {
    AppState.emergencyActive = true;
    AppState.threatScore = Math.min(100, (AppState.threatScore || 0) + 30);
  }

  // Start evidence recording
  try {
    await startRecording(source);
    if (AppState) AppState.isRecording = true;
  } catch (_) {}

  // Send emergency alerts to contacts
  sendEmergencyAlert(source);

  // Update banner / status card
  updateHeaderStatus('alert', '🚨 Voice SOS');
  updateStatusCard('alert', '🚨 Voice Distress Detected',
    'Emergency recording & alerts in progress.');

  if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);

  showToast('🚨 Emergency activated — alerting contacts', 'error');

  logEvent('voice_alert', { trigger: { method: 'voice_keyword', keyword: source } }).catch(() => {});
}

/* ══════════════════════════════════════════
   playAlertBeep()
   Short 200 ms 880 Hz sine tone via Web Audio
   ══════════════════════════════════════════ */
function playAlertBeep() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.35;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (_) {}
}

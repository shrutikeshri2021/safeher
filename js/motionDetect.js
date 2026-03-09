/* ═══════════════════════════════════════════════
   SafeHer — Motion Detection Module  (Step 6)
   DeviceMotion API — combines shake detection
   AND crash/fall detection (free-fall → impact).
   ═══════════════════════════════════════════════ */

import { showToast, sendAlert, updateHeaderStatus, updateStatusCard } from './alerts.js';
import { startEmergencyRecording, stopRecording } from './recorder.js';
import { logEvent } from './historyLogger.js';

/* ──── Global ref (set by app.js) ──── */
let AppState = null;

export function setAppState(state) { AppState = state; }

/* ──── Shake Config ──── */
const SHAKE_THRESHOLD = 20;    // m/s² on any axis
const SHAKE_COOLDOWN  = 60000; // 60 seconds between shake alerts

/* ──── Crash / Fall Config ──── */
const FREE_FALL_THRESHOLD = 3;   // near zero-G = free-fall
const IMPACT_THRESHOLD    = 30;  // sudden spike after free-fall = crash
const CRASH_COUNTDOWN_SEC = 15;  // seconds before auto-SOS

/* ──── Internal state ──── */
let listening       = false;
let lastShakeTrigger = 0;
let autoStopTimer   = null;

/* crash sub-state */
let freeFallDetected = false;
let freeFallTimeout  = null;
let crashCountdownTimer = null;

/* ══════════════════════════════════════════
   start()  — begin listening to devicemotion
   Handles iOS 13+ permission prompt.
   ══════════════════════════════════════════ */
export async function start() {
  if (listening) return;

  // iOS 13+ requires explicit permission
  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission !== 'granted') {
        showToast('Motion permission denied — please allow in Settings', 'warning');
        return;
      }
    } catch (err) {
      showToast('Motion permission error', 'error');
      return;
    }
  }

  window.addEventListener('devicemotion', handleMotion);
  listening = true;
  freeFallDetected = false;
}

/* ══════════════════════════════════════════
   stop()  — stop listening to devicemotion
   ══════════════════════════════════════════ */
export function stop() {
  window.removeEventListener('devicemotion', handleMotion);
  listening = false;
  freeFallDetected = false;
  if (autoStopTimer)   { clearTimeout(autoStopTimer);   autoStopTimer   = null; }
  if (freeFallTimeout) { clearTimeout(freeFallTimeout); freeFallTimeout = null; }
  cancelCrashCountdown();
}

/* ══════════════════════════════════════════
   handleMotion(event)
   Two detection paths from one listener:
   1) Shake: high accel on any single axis
   2) Crash: free-fall (near 0 G) → impact
   ══════════════════════════════════════════ */
function handleMotion(event) {
  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  const { x, y, z } = acc;
  const total = Math.sqrt(x ** 2 + y ** 2 + z ** 2);

  /* ── Crash / Fall detection ── */

  // Phase 1: free-fall (near zero G)
  if (total < FREE_FALL_THRESHOLD) {
    freeFallDetected = true;
  }

  // Phase 2: impact after free-fall
  if (freeFallDetected && total > IMPACT_THRESHOLD) {
    freeFallDetected = false;
    triggerCrashAlert();
    return;   // don't also fire shake alert
  }

  // Reset free-fall flag after 1 s of normal motion
  if (freeFallDetected && total > 8 && total < IMPACT_THRESHOLD) {
    if (freeFallTimeout) clearTimeout(freeFallTimeout);
    freeFallTimeout = setTimeout(() => { freeFallDetected = false; }, 1000);
  }

  /* ── Shake detection ── */
  if (Math.abs(x) >= SHAKE_THRESHOLD || Math.abs(y) >= SHAKE_THRESHOLD || Math.abs(z) >= SHAKE_THRESHOLD) {
    const now = Date.now();
    if (now - lastShakeTrigger < SHAKE_COOLDOWN) return;
    lastShakeTrigger = now;
    triggerMotionAlert();
  }
}

/* ══════════════════════════════════════════
   triggerMotionAlert()  — shake detected
   ══════════════════════════════════════════ */
async function triggerMotionAlert() {
  if (AppState?.safeMode || AppState?.emergencyActive) return;

  updateHeaderStatus('alert', '⚠️ Motion Detected');
  updateStatusCard('alert', '⚠️ Sudden Motion', 'Possible shake / impact detected. Recording…');

  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);

  if (AppState) {
    AppState.threatScore = Math.min(100, (AppState.threatScore || 0) + 15);
  }

  try {
    await startEmergencyRecording();
    if (AppState) AppState.isRecording = true;
  } catch (_) {}

  autoStopTimer = setTimeout(() => {
    stopRecording();
    if (AppState) AppState.isRecording = false;
    if (!AppState?.sosActive) {
      updateHeaderStatus('watching', 'Stay Alert 🚶‍♀️');
      updateStatusCard('watching', 'Stay Alert 🚶‍♀️', 'Motion & voice detection active.');
    }
  }, 60000);

  sendAlert('motion');
  showToast('⚠️ Motion detected — Recording started', 'warning');
  logEvent('motion_alert', { trigger: { method: 'shake_detection' } }).catch(() => {});
}

/* ══════════════════════════════════════════
   CRASH / FALL  — countdown + confirm
   Shows 15 s countdown overlay. If user
   doesn't press "I'm OK", fires SOS.
   ══════════════════════════════════════════ */
function triggerCrashAlert() {
  if (AppState?.safeMode) return;

  if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
  logEvent('crash_detected').catch(() => {});

  const overlay = document.getElementById('crash-countdown-overlay');
  if (overlay) overlay.classList.remove('hidden');

  let seconds = CRASH_COUNTDOWN_SEC;
  const countdownEl = document.getElementById('crash-countdown-number');
  if (countdownEl) countdownEl.textContent = seconds;

  crashCountdownTimer = setInterval(() => {
    seconds--;
    if (countdownEl) countdownEl.textContent = seconds;
    if (seconds <= 0) {
      cancelCrashCountdown();
      confirmCrash();
    }
  }, 1000);
}

function cancelCrashCountdown() {
  if (crashCountdownTimer) {
    clearInterval(crashCountdownTimer);
    crashCountdownTimer = null;
  }
  const overlay = document.getElementById('crash-countdown-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function confirmCrash() {
  // Dispatch event so app.js / sosButton can pick it up
  document.dispatchEvent(new CustomEvent('safeher:crash-detected'));
  showToast('🚨 Fall/Crash detected — SOS activated!', 'error');
}

/** Called when user presses "I'm OK" button */
export function crashImOk() {
  cancelCrashCountdown();
  showToast('✅ Good — Stay safe!', 'success');
  logEvent('crash_false_alarm').catch(() => {});
}

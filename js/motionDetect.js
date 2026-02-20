/* ═══════════════════════════════════════════════
   SafeHer — Motion Detection Module  (Step 6)
   DeviceMotion API, threshold 20 m/s², 60 s cooldown,
   auto-record, iOS permission handling
   ═══════════════════════════════════════════════ */

import { showToast, sendAlert, updateHeaderStatus, updateStatusCard } from './alerts.js';
import { startEmergencyRecording, stopRecording } from './recorder.js';
import { logEvent } from './historyLogger.js';

/* ──── Global ref (set by app.js) ──── */
let AppState = null;

export function setAppState(state) { AppState = state; }

/* ──── Config ──── */
const THRESHOLD   = 20;   // m/s² on any axis
const COOLDOWN_MS = 60000; // 60 seconds between alerts

/* ──── Internal state ──── */
let listening   = false;
let lastTrigger = 0;
let autoStopTimer = null;

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
}

/* ══════════════════════════════════════════
   stop()  — stop listening to devicemotion
   ══════════════════════════════════════════ */
export function stop() {
  window.removeEventListener('devicemotion', handleMotion);
  listening = false;
  if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
}

/* ══════════════════════════════════════════
   handleMotion(event)
   Check each axis against THRESHOLD,
   enforce cooldown, trigger alert.
   ══════════════════════════════════════════ */
function handleMotion(event) {
  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  const { x, y, z } = acc;
  if (Math.abs(x) < THRESHOLD && Math.abs(y) < THRESHOLD && Math.abs(z) < THRESHOLD) return;

  // Cooldown
  const now = Date.now();
  if (now - lastTrigger < COOLDOWN_MS) return;
  lastTrigger = now;

  triggerMotionAlert();
}

/* ══════════════════════════════════════════
   triggerMotionAlert()
   Guard on safeMode & emergencyActive,
   update banner, vibrate, record, add 15
   to threat score, send alert, auto-stop 60 s.
   ══════════════════════════════════════════ */
async function triggerMotionAlert() {
  // Don't fire while safe mode or another emergency is running
  if (AppState?.safeMode || AppState?.emergencyActive) return;

  // --- Banner & status card ---
  updateHeaderStatus('alert', '⚠️ Motion Detected');
  updateStatusCard('alert', '⚠️ Sudden Motion', 'Possible shake / impact detected. Recording…');

  // --- Vibration ---
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);

  // --- Threat score ---
  if (AppState) {
    AppState.threatScore = Math.min(100, (AppState.threatScore || 0) + 15);
  }

  // --- Start recording evidence ---
  try {
    await startEmergencyRecording();
    if (AppState) AppState.isRecording = true;
  } catch (_) {}

  // --- Auto-stop recording after 60 s ---
  autoStopTimer = setTimeout(() => {
    stopRecording();
    if (AppState) AppState.isRecording = false;
    // Restore banner only if no SOS active
    if (!AppState?.sosActive) {
      updateHeaderStatus('watching', 'Stay Alert 🚶‍♀️');
      updateStatusCard('watching', 'Stay Alert 🚶‍♀️', 'Motion & voice detection active.');
    }
  }, 60000);

  // --- Notify contacts ---
  sendAlert('motion');

  showToast('⚠️ Motion detected — Recording started', 'warning');

  logEvent('motion_alert', { trigger: { method: 'shake_detection' } }).catch(() => {});
}

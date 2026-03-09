/* ═══════════════════════════════════════════════
   SafeHer — SOS Button Module  (Step 5)
   2-second hold → activate SOS
   Single tap while active → cancel SOS
   Fake Call with in-call timer
   ═══════════════════════════════════════════════ */

import {
  playSiren, stopSiren, showAlertOverlay, hideAlertOverlay,
  sendEmergencyAlert, showToast, updateHeaderStatus,
  updateStatusCard, showFakeCall, acceptFakeCall, hideFakeCall
} from './alerts.js';
import { startEmergencyRecording, stopRecording } from './recorder.js';
import { stopLiveLocationUpdates } from './contacts.js';
import { logEvent } from './historyLogger.js';
import * as WakeLock from './wakeLock.js';

/* ──── Global ref (set by app.js) ──── */
let AppState = null;

export function setAppState(state) { AppState = state; }

/* ──── Internal state ──── */
let vibrationLoop = null;
let holdTimer = null;
let isHolding = false;

/* ══════════════════════════════════════════
   init()  — wire SOS button events
   ══════════════════════════════════════════ */
export function init() {
  const btn = document.getElementById('btn-sos');
  if (!btn) return;

  // --- Long-press (2 s) → activate SOS ---
  btn.addEventListener('pointerdown', (e) => {
    if (AppState && AppState.safeMode) return;            // FIX 2: blocked in safe mode
    if (AppState && AppState.sosActive) return;           // already active — tap handles cancel
    isHolding = false;
    holdTimer = setTimeout(() => {
      isHolding = true;
      activateSOS();
    }, 2000);
  });
  btn.addEventListener('pointerup', () => clearTimeout(holdTimer));
  btn.addEventListener('pointerleave', () => clearTimeout(holdTimer));

  // --- Tap / Click while active → deactivate SOS ---
  btn.addEventListener('click', () => {
    if (AppState && AppState.safeMode) return;              // FIX 2: blocked in safe mode
    if (isHolding) { isHolding = false; return; }          // ignore click at end of hold
    if (!(AppState && AppState.sosActive)) return;          // not active — hold to activate
    deactivateSOS();
  });

  // --- Alert overlay "I'm Safe" button → stops everything INCLUDING live location ---
  const stopBtn = document.getElementById('btn-stop-alert');
  if (stopBtn) stopBtn.addEventListener('click', () => {
    stopLiveLocationUpdates();
    deactivateSOS();
  });

  const policeBtn = document.getElementById('btn-call-police');
  if (policeBtn) policeBtn.addEventListener('click', () => {
    window.open('tel:112', '_self');
  });

  // --- Fake Call wiring ---
  const acceptBtn = document.getElementById('btn-accept-call');
  const declineBtn = document.getElementById('btn-decline-call');
  if (acceptBtn) acceptBtn.addEventListener('click', acceptFakeCall);
  if (declineBtn) declineBtn.addEventListener('click', hideFakeCall);

  // --- FIX 1: Minimize / Reopen SOS overlay ---
  const minimizeBtn = document.getElementById('btn-minimize-sos');
  if (minimizeBtn) minimizeBtn.addEventListener('click', minimizeSOS);
  const sosPill = document.getElementById('sos-active-pill');
  if (sosPill) sosPill.addEventListener('click', reopenSOS);
}

/* FIX 1 — Minimize SOS overlay (keep siren/vibration/recording running) */
function minimizeSOS() {
  const overlay = document.getElementById('alert-overlay');
  const pill = document.getElementById('sos-active-pill');
  if (overlay) overlay.classList.add('hidden');
  if (pill) pill.classList.remove('hidden');
}
function reopenSOS() {
  const overlay = document.getElementById('alert-overlay');
  const pill = document.getElementById('sos-active-pill');
  if (overlay) overlay.classList.remove('hidden');
  if (pill) pill.classList.add('hidden');
}

/* FIX 2 — Update SOS button disabled visual state */
export function updateSOSDisabledState(disabled) {
  const btn = document.getElementById('btn-sos');
  const pulse = document.querySelector('.sos-ring-pulse');
  if (btn) {
    if (disabled) btn.classList.add('sos-disabled');
    else btn.classList.remove('sos-disabled');
  }
  if (pulse) pulse.style.animationPlayState = disabled ? 'paused' : 'running';
}

/* ══════════════════════════════════════════
   activateSOS()
   Full-screen red overlay "🚨 HELP REQUESTED"
   • Siren via Web Audio 440→880 sweep
   • Vibration pattern every 2 s
   • Start emergency recording
   • Send alerts to contacts
   • Threat score = 100
   ══════════════════════════════════════════ */
export function activateSOS() {
  if (AppState) {
    AppState.sosActive = true;
    AppState.emergencyActive = true;
    AppState.threatScore = 100;
  }

  // --- Wake Lock (Feature 1) — keep screen on during SOS ---
  WakeLock.acquire('sos').catch(err => console.warn('[SOS] Wake lock acquire failed:', err));

  // --- Siren ---
  playSiren();

  // --- Vibration loop ---
  const pattern = [200, 100, 200, 100, 500, 100, 200, 100, 200];
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
    vibrationLoop = setInterval(() => navigator.vibrate(pattern), 2000);
  }

  // --- Fullscreen overlay ---
  showAlertOverlay('🚨 HELP REQUESTED');

  // --- SOS button visual ---
  const btn = document.getElementById('btn-sos');
  if (btn) {
    btn.classList.add('sos-active');
    btn.querySelector('.sos-label')?.replaceChildren(document.createTextNode('TAP TO CANCEL'));
  }

  // --- Update header / status card ---
  updateHeaderStatus('alert', '🚨 SOS ACTIVE');
  updateStatusCard('alert', '🚨 SOS Active', 'Tap SOS button to cancel.');

  // --- Start recording ---
  startEmergencyRecording().catch(() => {});

  // --- Send emergency alerts ---
  sendEmergencyAlert('sos');

  // --- SMS Alert (Feature 11) ---
  try { if (window.SMSAlert) window.SMSAlert.sendSOSAlert(); } catch (e) { console.warn('[SOS] SMS error:', e); }

  // --- Live Stream (Feature 12) ---
  try { if (window.LiveStream) window.LiveStream.start(); } catch (e) { console.warn('[SOS] Stream error:', e); }

  showToast('🚨 SOS Activated — Alerting contacts!', 'error');

  logEvent('sos_triggered', { trigger: { method: 'hold_button' } }).catch(() => {});
}

/* ══════════════════════════════════════════
   deactivateSOS()
   Stop siren, vibration, recording,
   hide overlay, toast "SOS Cancelled"
   ══════════════════════════════════════════ */
export function deactivateSOS() {
  if (AppState) {
    AppState.sosActive = false;
    AppState.emergencyActive = false;
    AppState.threatScore = 0;
  }

  // --- Release Wake Lock (Feature 1) ---
  WakeLock.release('sos').catch(err => console.warn('[SOS] Wake lock release failed:', err));

  // --- Stop siren ---
  stopSiren();

  // --- Stop vibration ---
  if (vibrationLoop) { clearInterval(vibrationLoop); vibrationLoop = null; }
  if (navigator.vibrate) navigator.vibrate(0);

  // --- Stop recording ---
  stopRecording();

  // --- Stop Live Stream (Feature 12) ---
  try { if (window.LiveStream) window.LiveStream.stop(); } catch (e) { console.warn('[SOS] Stream stop error:', e); }

  // --- Hide overlay + pill ---
  hideAlertOverlay();
  const pill = document.getElementById('sos-active-pill');
  if (pill) pill.classList.add('hidden');

  // --- Reset SOS button ---
  const btn = document.getElementById('btn-sos');
  if (btn) {
    btn.classList.remove('sos-active');
    btn.querySelector('.sos-label')?.replaceChildren(document.createTextNode('SOS'));
  }

  // --- Restore banner ---
  const safeMode = AppState?.safeMode;
  if (safeMode) {
    updateHeaderStatus('safe', "You're Safe 🏠");
    updateStatusCard('safe', "You're Safe 🏠", 'All sensors are paused. Toggle off when you head out.');
  } else {
    updateHeaderStatus('watching', 'Stay Alert 🚶‍♀️');
    updateStatusCard('watching', 'Stay Alert 🚶‍♀️', 'Motion & voice detection active.');
  }

  showToast('SOS Cancelled — Stay safe 💚', 'success');

  logEvent('sos_cancelled').catch(() => {});
}

/* ══════════════════════════════════════════
   activateFakeCall()
   Show ringing overlay, answer shows in-call
   ══════════════════════════════════════════ */
export function activateFakeCall() {
  showFakeCall();
  logEvent('fake_call_used').catch(() => {});
}

/* ═══════════════════════════════════════════════
   SafeHer — Safe Mode Module  (Step 4)
   Toggle-driven sensor start / stop, localStorage
   ═══════════════════════════════════════════════ */

import { showToast, updateHeaderStatus, updateStatusCard } from './alerts.js';
import * as motionDetect from './motionDetect.js';
import * as voiceDetect from './voiceDetect.js';
import * as ambientLight from './ambientLight.js';
import * as geofence from './geofence.js';
import { logEvent } from './historyLogger.js';
import { updateSOSDisabledState } from './sosButton.js';

/* ──── Global ref (set by app.js init) ──── */
let AppState = null;
let geoWatchId = null;

/** Inject the shared AppState from app.js */
export function setAppState(state) { AppState = state; }

/* ══════════════════════════════════════════
   init()  — called once on startup
   Reads localStorage, restores toggle,
   runs enableSafeMode / disableSafeMode.
   ══════════════════════════════════════════ */
export function init() {
  const saved = localStorage.getItem('safeher_safemode');
  const toggle = document.getElementById('toggle-safe-mode');

  if (saved === 'true') {
    if (toggle) toggle.checked = true;
    enableSafeMode(true);                // silent on first load
  } else {
    if (toggle) toggle.checked = false;
    disableSafeMode(true);               // silent on first load
  }

  if (toggle) {
    toggle.addEventListener('change', () => {
      if (toggle.checked) enableSafeMode(false);
      else disableSafeMode(false);
    });
  }
}

/* ══════════════════════════════════════════
   enableSafeMode(silent)
   • Sets AppState.safeMode = true
   • Stops motion + voice + geolocation
   • Green banner: "You're Safe 🏠"
   • Toast: "Safe Mode ON — All sensors paused"
   ══════════════════════════════════════════ */
function enableSafeMode(silent = false) {
  if (AppState) AppState.safeMode = true;
  localStorage.setItem('safeher_safemode', 'true');

  // --- Stop ALL sensors ---
  motionDetect.stop();
  voiceDetect.stop();
  ambientLight.stop();
  geofence.stopMonitoring();
  stopGeolocation();

  // Uncheck all sensor toggles in UI
  setToggle('toggle-motion', false);
  setToggle('toggle-voice', false);
  setToggle('toggle-darkness', false);
  setToggle('toggle-geofence', false);

  // --- Update UI ---
  updateHeaderStatus('safe', "You're Safe 🏠");
  updateStatusCard('safe', "You're Safe 🏠", 'All sensors are paused. Toggle off when you head out.');
  updateSOSDisabledState(true);

  if (!silent) showToast('Safe Mode ON — All sensors paused', 'success');

  if (!silent) logEvent('safe_mode_on').catch(() => {});
}

/* ══════════════════════════════════════════
   disableSafeMode(silent)
   • Sets AppState.safeMode = false
   • Starts motion + voice sensors
   • Amber banner: "Stay Alert 🚶‍♀️"
   • Toast: "Stay Alert — All sensors active"
   ══════════════════════════════════════════ */
function disableSafeMode(silent = false) {
  if (AppState) AppState.safeMode = false;
  localStorage.setItem('safeher_safemode', 'false');

  // --- Start ALL sensors (shake + crash, voice, darkness, geofence) ---
  motionDetect.start();
  voiceDetect.start();
  ambientLight.start();
  geofence.startMonitoring();

  // Check all sensor toggles in UI
  setToggle('toggle-motion', true);
  setToggle('toggle-voice', true);
  setToggle('toggle-darkness', true);
  setToggle('toggle-geofence', true);

  // --- Update UI ---
  updateHeaderStatus('watching', 'Stay Alert 🚶‍♀️');
  updateStatusCard('watching', 'Stay Alert 🚶‍♀️', 'All sensors active — shake, darkness & unsafe zone detection ON.');
  updateSOSDisabledState(false);

  if (!silent) showToast('Stay Alert — All sensors active', 'warning');

  if (!silent) logEvent('safe_mode_off').catch(() => {});
}

/* ── Geolocation helper ────────────────── */
function stopGeolocation() {
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
}

/* ── Toggle-checkbox helper ────────────── */
function setToggle(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = checked;
}

/* ═══════════════════════════════════════════════
   SafeHer — Walk-Me-Home (Dead Man's Switch)
   Set a destination + expected arrival time.
   If you don't confirm arrival → auto-trigger SOS.
   Destination-aware — different from check-in timer.
   ═══════════════════════════════════════════════ */

import { showToast, sendEmergencyAlert, sendBrowserNotification, updateHeaderStatus, updateStatusCard } from './alerts.js';
import { startRecording } from './recorder.js';
import { logEvent } from './historyLogger.js';

/* ──── Global ref (injected by app.js) ──── */
let AppState = null;
export function setAppState(state) { AppState = state; }

/* ──── State ──── */
let walkActive       = false;
let walkTimer        = null;       // main countdown interval
let walkDeadline     = null;       // Date.now() target
let walkDurationMin  = 15;         // user-chosen duration
let gpsWatchId       = null;
let destination      = null;       // { lat, lng, name }
let currentPos       = null;
const ARRIVAL_RADIUS = 100;        // meters — auto-arrive within this radius

/* ══════════════════════════════════════════
   init() — wire UI
   ══════════════════════════════════════════ */
export function init() {
  wireWalkUI();
}

function wireWalkUI() {
  const startBtn  = document.getElementById('btn-start-walk');
  const cancelBtn = document.getElementById('btn-cancel-walk');
  const safeBtn   = document.getElementById('btn-walk-arrived');
  const slider    = document.getElementById('walk-eta-slider');
  const valEl     = document.getElementById('walk-eta-val');
  const destInput = document.getElementById('walk-destination');

  if (slider) {
    slider.addEventListener('input', () => {
      walkDurationMin = parseInt(slider.value, 10);
      if (valEl) valEl.textContent = `${walkDurationMin} min`;
    });
  }

  if (startBtn) startBtn.addEventListener('click', startWalk);
  if (cancelBtn) cancelBtn.addEventListener('click', () => { cancelWalk(); showToast('Walk-Me-Home cancelled', 'info'); });
  if (safeBtn) safeBtn.addEventListener('click', confirmArrival);

  // Search / geocode destination
  const searchBtn = document.getElementById('btn-search-dest');
  if (searchBtn && destInput) {
    searchBtn.addEventListener('click', () => searchDestination(destInput.value));
    destInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); searchDestination(destInput.value); }
    });
  }
}

/* ══════════════════════════════════════════
   Search Destination (Nominatim geocoding)
   ══════════════════════════════════════════ */
async function searchDestination(query) {
  if (!query || query.trim().length < 3) {
    showToast('Enter a destination name or address', 'warning');
    return;
  }

  const statusEl = document.getElementById('walk-dest-status');
  if (statusEl) statusEl.textContent = '🔍 Searching…';

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.length === 0) {
      if (statusEl) statusEl.textContent = '❌ Not found — try a different name';
      showToast('Destination not found — try a more specific address', 'warning');
      return;
    }

    const result = data[0];
    destination = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name.split(',').slice(0, 3).join(', ')
    };

    if (statusEl) statusEl.textContent = `📍 ${destination.name}`;
    showToast(`Destination set: ${destination.name}`, 'success');
  } catch (err) {
    if (statusEl) statusEl.textContent = '❌ Search failed — check internet';
    showToast('Could not search — check your connection', 'error');
  }
}

/* ══════════════════════════════════════════
   Start Walk-Me-Home
   ══════════════════════════════════════════ */
function startWalk() {
  if (walkActive) {
    showToast('Walk-Me-Home is already active', 'info');
    return;
  }
  if (!destination) {
    showToast('Set a destination first', 'warning');
    return;
  }

  walkActive = true;
  walkDeadline = Date.now() + (walkDurationMin * 60 * 1000);

  // UI: switch to active state
  setWalkUI('active');

  // Start GPS tracking to check proximity to destination
  if (navigator.geolocation) {
    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        checkDestinationProximity();
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  // Start countdown
  walkTimer = setInterval(updateWalkCountdown, 1000);

  updateHeaderStatus('journey', '🚶 Walking');
  updateStatusCard('journey', '🚶 Walk-Me-Home Active', `ETA: ${walkDurationMin} min to ${destination.name}`);

  showToast(`🚶 Walk-Me-Home started — ${walkDurationMin} min to arrive`, 'success');
  logEvent('walk_me_home_started', {
    walkHome: { destination: destination.name, etaMinutes: walkDurationMin }
  }).catch(() => {});
}

/* ══════════════════════════════════════════
   Countdown Logic
   ══════════════════════════════════════════ */
function updateWalkCountdown() {
  if (!walkActive) return;

  const remaining = Math.max(0, walkDeadline - Date.now());
  const totalSec  = Math.ceil(remaining / 1000);
  const min       = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const sec       = (totalSec % 60).toString().padStart(2, '0');

  const countdownEl = document.getElementById('walk-countdown');
  if (countdownEl) countdownEl.textContent = `${min}:${sec}`;

  // Progress bar
  const totalMs  = walkDurationMin * 60 * 1000;
  const elapsed  = totalMs - remaining;
  const progress = Math.min(100, (elapsed / totalMs) * 100);
  const barEl    = document.getElementById('walk-progress-fill');
  if (barEl) barEl.style.width = `${progress}%`;

  // Warning state at 20% remaining
  if (totalSec <= walkDurationMin * 60 * 0.2 && totalSec > 0) {
    if (countdownEl) countdownEl.style.color = 'var(--accent-red)';
    if (barEl) barEl.style.background = 'var(--accent-red)';
  }

  // Time's up!
  if (totalSec <= 0) {
    triggerDeadManSwitch();
  }
}

/* ══════════════════════════════════════════
   Check Destination Proximity
   Auto-confirm if within ARRIVAL_RADIUS
   ══════════════════════════════════════════ */
function checkDestinationProximity() {
  if (!walkActive || !destination || !currentPos) return;

  const dist = haversineDistance(
    currentPos.lat, currentPos.lng,
    destination.lat, destination.lng
  );

  const distEl = document.getElementById('walk-distance');
  if (distEl) {
    distEl.textContent = dist >= 1000
      ? `${(dist / 1000).toFixed(1)} km away`
      : `${Math.round(dist)} m away`;
  }

  // Auto-arrive if within radius
  if (dist <= ARRIVAL_RADIUS) {
    confirmArrival(true);
  }
}

/* ══════════════════════════════════════════
   Confirm Arrival (manual or auto)
   ══════════════════════════════════════════ */
function confirmArrival(auto = false) {
  if (!walkActive) return;

  cleanup();
  setWalkUI('idle');

  updateHeaderStatus('safe', "You're Safe 🏠");
  updateStatusCard('safe', 'Arrived Safely! 🏠', auto
    ? `Auto-detected arrival at ${destination?.name || 'destination'}.`
    : 'You confirmed your safe arrival.'
  );

  const method = auto ? 'auto_proximity' : 'manual_confirm';
  showToast(auto ? '✅ Auto-detected: You arrived safely!' : '✅ Safe arrival confirmed!', 'success');
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

  logEvent('walk_me_home_arrived', {
    walkHome: { destination: destination?.name, method }
  }).catch(() => {});
}

/* ══════════════════════════════════════════
   Dead Man's Switch — Time's Up!
   ══════════════════════════════════════════ */
async function triggerDeadManSwitch() {
  cleanup();
  setWalkUI('triggered');

  showToast('🚨 Walk-Me-Home: Time expired! Alerting contacts!', 'error');
  if (navigator.vibrate) navigator.vibrate([1000, 300, 1000, 300, 1000]);

  sendBrowserNotification('🚨 Walk-Me-Home Alert',
    `Did not arrive at ${destination?.name || 'destination'} within ${walkDurationMin} minutes. Alerting emergency contacts.`);

  // Update UI to alert state
  updateHeaderStatus('alert', '🚨 Walk-Me-Home');
  updateStatusCard('alert', '🚨 Walk-Me-Home Triggered',
    `No arrival confirmed within ${walkDurationMin} minutes. Alerting contacts.`);

  // Start recording evidence
  try {
    await startRecording('walk_home');
    if (AppState) AppState.isRecording = true;
  } catch (_) {}

  // Send emergency alert to all contacts
  sendEmergencyAlert('walk_me_home');

  logEvent('walk_me_home_triggered', {
    walkHome: { destination: destination?.name, etaMinutes: walkDurationMin },
    trigger: { method: 'dead_man_switch', reason: 'eta_expired' }
  }).catch(() => {});
}

/* ══════════════════════════════════════════
   Cancel Walk
   ══════════════════════════════════════════ */
function cancelWalk() {
  if (!walkActive) return;
  cleanup();
  setWalkUI('idle');

  updateHeaderStatus('watching', 'Stay Alert 🚶‍♀️');
  updateStatusCard('watching', 'Stay Alert 🚶‍♀️', 'Motion & voice detection active.');

  logEvent('walk_me_home_cancelled').catch(() => {});
}

/* ══════════════════════════════════════════
   Cleanup timers and GPS
   ══════════════════════════════════════════ */
function cleanup() {
  walkActive = false;
  if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
  if (gpsWatchId != null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

/* ══════════════════════════════════════════
   UI State Switching
   ══════════════════════════════════════════ */
function setWalkUI(state) {
  const setupPanel   = document.getElementById('walk-setup-panel');
  const activePanel  = document.getElementById('walk-active-panel');
  const triggeredEl  = document.getElementById('walk-triggered-panel');
  const countdownEl  = document.getElementById('walk-countdown');
  const barEl        = document.getElementById('walk-progress-fill');

  [setupPanel, activePanel, triggeredEl].forEach(el => { if (el) el.classList.add('hidden'); });

  switch (state) {
    case 'idle':
      if (setupPanel) setupPanel.classList.remove('hidden');
      // Reset countdown styling
      if (countdownEl) countdownEl.style.color = 'var(--accent-blue)';
      if (barEl) { barEl.style.width = '0%'; barEl.style.background = 'var(--accent-blue)'; }
      break;
    case 'active':
      if (activePanel) activePanel.classList.remove('hidden');
      break;
    case 'triggered':
      if (triggeredEl) triggeredEl.classList.remove('hidden');
      break;
  }
}

/* ══════════════════════════════════════════
   Haversine (local copy — avoid circular deps)
   ══════════════════════════════════════════ */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ══════════════════════════════════════════
   Public
   ══════════════════════════════════════════ */
export function isWalkActive() {
  return walkActive;
}

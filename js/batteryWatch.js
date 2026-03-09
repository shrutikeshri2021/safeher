/* ═══════════════════════════════════════════════
   SafeHer — Battery-Aware Emergency Module
   Monitors battery level via Battery Status API.
   Below 15%  → sends "battery dying" alert to all
   contacts with last known GPS.
   Below 10%  → reduces GPS frequency to conserve.
   ═══════════════════════════════════════════════ */

import { showToast, sendBrowserNotification } from './alerts.js';
import { sendAlertToContacts } from './contacts.js';
import { logEvent } from './historyLogger.js';
import * as ntfyPush from './ntfyPush.js';

/* ──── Global ref (injected by app.js) ──── */
let AppState = null;
export function setAppState(state) { AppState = state; }

/* ──── State ──── */
let battery          = null;
let alertSentAt15    = false;  // only alert once per charge cycle at 15%
let alertSentAt10    = false;  // only alert once per charge cycle at 10%
let alertSentAt5     = false;  // critical 5% last chance
let lowPowerMode     = false;
let gpsWatchId       = null;
let lastKnownPos     = null;

const LOW_BATTERY_THRESHOLD  = 0.15;   // 15%
const VERY_LOW_THRESHOLD     = 0.10;   // 10%
const CRITICAL_THRESHOLD     = 0.05;   // 5%

/* ══════════════════════════════════════════
   init() — called once on startup
   ══════════════════════════════════════════ */
export async function init() {
  // Battery Status API check
  if (!navigator.getBattery) {
    console.log('[Battery] Battery Status API not supported');
    return;
  }

  try {
    battery = await navigator.getBattery();
    console.log(`[Battery] Level: ${Math.round(battery.level * 100)}%, Charging: ${battery.charging}`);

    // Update UI immediately
    updateBatteryUI();

    // Listen for changes
    battery.addEventListener('levelchange', onBatteryChange);
    battery.addEventListener('chargingchange', onChargingChange);

    // Start background GPS cache (low-frequency, low-power)
    startGPSCache();

    // Check current level on init in case already low
    checkBatteryLevel();
  } catch (err) {
    console.warn('[Battery] Could not access Battery API:', err);
  }
}

/* ══════════════════════════════════════════
   Event Handlers
   ══════════════════════════════════════════ */
function onBatteryChange() {
  console.log(`[Battery] Level changed: ${Math.round(battery.level * 100)}%`);
  updateBatteryUI();
  checkBatteryLevel();
}

function onChargingChange() {
  console.log(`[Battery] Charging: ${battery.charging}`);
  if (battery.charging) {
    // Plugged in → reset alerts so they fire again next discharge cycle
    alertSentAt15 = false;
    alertSentAt10 = false;
    alertSentAt5  = false;
    if (lowPowerMode) exitLowPowerMode();
    showToast('🔌 Charging — battery alerts reset', 'success');
  }
  updateBatteryUI();
}

/* ══════════════════════════════════════════
   Battery Level Logic
   ══════════════════════════════════════════ */
function checkBatteryLevel() {
  if (!battery || battery.charging) return;

  const level = battery.level;
  const pct   = Math.round(level * 100);

  // ── 15% threshold ──
  if (level <= LOW_BATTERY_THRESHOLD && !alertSentAt15) {
    alertSentAt15 = true;
    sendBatteryAlert(pct, 'low');
  }

  // ── 10% threshold → enter low-power GPS mode ──
  if (level <= VERY_LOW_THRESHOLD && !alertSentAt10) {
    alertSentAt10 = true;
    if (!lowPowerMode) enterLowPowerMode();
    sendBatteryAlert(pct, 'very_low');
  }

  // ── 5% critical ──
  if (level <= CRITICAL_THRESHOLD && !alertSentAt5) {
    alertSentAt5 = true;
    sendBatteryAlert(pct, 'critical');
  }
}

/* ══════════════════════════════════════════
   Send Battery Alert
   ══════════════════════════════════════════ */
async function sendBatteryAlert(pct, severity) {
  const levelLabel = severity === 'critical' ? '🔴 CRITICAL' : severity === 'very_low' ? '🟡 Very Low' : '🟠 Low';
  const msg = `⚡ Battery ${levelLabel} (${pct}%) — This may be the last alert SafeHer can send.`;

  showToast(`⚡ Battery ${pct}% — alerting contacts`, 'warning');
  sendBrowserNotification('⚡ Battery Alert', `Battery at ${pct}%. Sending location to your emergency contacts.`);

  // Get last known GPS
  const location = lastKnownPos || await getQuickGPS();

  try {
    await sendAlertToContacts(location, `⚡ BATTERY ALERT: My phone is at ${pct}% battery and may die soon. ${location ? `My last known location: https://www.google.com/maps?q=${location.lat},${location.lng}` : 'Location unavailable.'} — Sent from SafeHer`);
  } catch (err) {
    console.error('[Battery] Failed to send alert:', err);
  }

  // Feature 3: Send ntfy.sh push notification for battery alert
  try {
    if (ntfyPush.isNtfyEnabled()) {
      ntfyPush.sendBatteryAlert(pct).catch(err => console.warn('[Battery] ntfy push failed:', err));
    }
  } catch (_) {}

  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);

  logEvent('battery_alert', {
    battery: { level: pct, charging: false, severity },
    trigger: { method: 'auto_battery' }
  }).catch(() => {});
}

/* ══════════════════════════════════════════
   Low-Power GPS Mode
   Reduces GPS from continuous to every 30s
   to conserve battery
   ══════════════════════════════════════════ */
function enterLowPowerMode() {
  lowPowerMode = true;
  console.log('[Battery] Entering low-power GPS mode');
  showToast('⚡ Low battery — reducing GPS to save power', 'warning');

  // Replace continuous watchPosition with periodic getCurrentPosition
  if (gpsWatchId != null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }

  // Poll every 30 seconds instead of continuous
  gpsWatchId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { lastKnownPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  }, 30000);

  updateBatteryUI();
}

function exitLowPowerMode() {
  lowPowerMode = false;
  console.log('[Battery] Exiting low-power GPS mode');

  if (gpsWatchId != null) {
    clearInterval(gpsWatchId);
    gpsWatchId = null;
  }
  startGPSCache();
  updateBatteryUI();
}

/* ══════════════════════════════════════════
   Background GPS Cache
   Keeps a fresh last-known position ready
   ══════════════════════════════════════════ */
function startGPSCache() {
  if (!navigator.geolocation) return;
  if (gpsWatchId != null) return;

  gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => { lastKnownPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
    () => {},
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
  );
}

function getQuickGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
    );
  });
}

/* ══════════════════════════════════════════
   UI: Battery indicator on home screen
   ══════════════════════════════════════════ */
function updateBatteryUI() {
  const el = document.getElementById('battery-status');
  if (!el || !battery) return;

  const pct = Math.round(battery.level * 100);
  const charging = battery.charging;
  let icon, color, text;

  if (charging) {
    icon = '🔌'; color = 'var(--accent-green)'; text = `${pct}% Charging`;
  } else if (pct <= 5) {
    icon = '🪫'; color = 'var(--accent-red)'; text = `${pct}% CRITICAL`;
  } else if (pct <= 10) {
    icon = '🪫'; color = 'var(--accent-red)'; text = `${pct}% Very Low`;
  } else if (pct <= 15) {
    icon = '🔋'; color = 'var(--accent-amber)'; text = `${pct}% Low`;
  } else {
    icon = '🔋'; color = 'var(--accent-green)'; text = `${pct}%`;
  }

  el.innerHTML = `<span style="color:${color};font-weight:600;">${icon} ${text}</span>`;
  if (lowPowerMode) {
    el.innerHTML += ' <span style="color:var(--accent-amber);font-size:0.65rem;">⚡ Power Saver</span>';
  }
}

/* ══════════════════════════════════════════
   Public getters
   ══════════════════════════════════════════ */
export function getBatteryLevel() {
  return battery ? Math.round(battery.level * 100) : null;
}

export function isLowPowerMode() {
  return lowPowerMode;
}

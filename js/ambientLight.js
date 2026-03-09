/* ═══════════════════════════════════════════════
   SafeHer — Ambient Light Sensor  (Feature 2)
   Detects darkness / sudden light changes.
   Uses AmbientLightSensor API (Chrome flag)
   with devicelight fallback + manual threshold.

   When darkness is detected for >10 seconds:
   ● Shows toast warning
   ● Logs history event
   ● Sends browser notification
   ● Optionally triggers alert if below critical lux
   ═══════════════════════════════════════════════ */

import { showToast, sendBrowserNotification, sendAlert } from './alerts.js';
import { logEvent } from './historyLogger.js';

/* ──── Global ref (set by app.js) ──── */
let AppState = null;
export function setAppState(state) { AppState = state; }

/* ──── Constants ──── */
const DARK_THRESHOLD_LUX      = 10;      // below = "dark"
const VERY_DARK_LUX           = 2;       // critical darkness
const DARKNESS_DELAY_MS       = 10000;   // 10s before triggering
const SUDDEN_DROP_RATIO       = 0.3;     // 70% drop = sudden change
const POLL_INTERVAL_MS        = 2000;    // status update freq
const DARK_ALERT_COOLDOWN_MS  = 30 * 60 * 1000;  // 30min between contact alerts

/* ──── Module state ──── */
let sensorInstance    = null;
let isRunning         = false;
let currentLux        = null;
let previousLux       = null;
let darknessTimer     = null;
let isDark            = false;
let alertSent         = false;         // avoid repeated alerts per dark spell
let lastDarkAlertTime = 0;             // cooldown timestamp for contact alerts
let pollInterval      = null;
let useFallback       = false;         // using devicelight instead of AmbientLightSensor

/* ══════════════════════════════════════════
   init()  — wire the toggle in home screen
   ══════════════════════════════════════════ */
export function init() {
  try {
    const toggle = document.getElementById('toggle-darkness');
    const statusEl = document.getElementById('darkness-status');

    if (toggle) {
      // Restore saved state
      const saved = localStorage.getItem('safeher_darkness_sensor');
      if (saved === 'true') {
        toggle.checked = true;
        start();
      }

      toggle.addEventListener('change', () => {
        try {
          if (toggle.checked) {
            start();
            localStorage.setItem('safeher_darkness_sensor', 'true');
            showToast('🌑 Darkness Detection ON', 'info');
          } else {
            stop();
            localStorage.setItem('safeher_darkness_sensor', 'false');
            showToast('Darkness Detection OFF', 'info');
          }
        } catch (err) {
          console.error('[AmbientLight] toggle handler error:', err);
        }
      });
    }

    console.log('[AmbientLight] ✅ Module initialized');
    console.log('[AmbientLight] AmbientLightSensor available:', 'AmbientLightSensor' in window);
  } catch (err) {
    console.error('[AmbientLight] init() error:', err);
  }
}

/* ══════════════════════════════════════════
   start()  — begin monitoring ambient light
   ══════════════════════════════════════════ */
export function start() {
  try {
    if (isRunning) {
      console.log('[AmbientLight] Already running');
      return;
    }

    /* ── Try native AmbientLightSensor first ── */
    if ('AmbientLightSensor' in window) {
      try {
        sensorInstance = new AmbientLightSensor({ frequency: 1 });

        sensorInstance.addEventListener('reading', () => {
          try {
            previousLux = currentLux;
            currentLux = sensorInstance.illuminance;
            processLuxReading(currentLux, previousLux);
          } catch (err) {
            console.error('[AmbientLight] reading handler error:', err);
          }
        });

        sensorInstance.addEventListener('error', (e) => {
          console.warn('[AmbientLight] Sensor error:', e.error?.message || e.error);
          // Fall back to devicelight or manual
          if (!useFallback) {
            console.log('[AmbientLight] Falling back to devicelight event');
            useFallback = true;
            startDeviceLightFallback();
          }
        });

        sensorInstance.start();
        isRunning = true;
        console.log('[AmbientLight] ✅ Native AmbientLightSensor started');
        updateStatusUI('Monitoring light levels…');
        return;
      } catch (err) {
        console.warn('[AmbientLight] Native sensor failed to start:', err.message);
      }
    }

    /* ── Fallback: devicelight event (Firefox) ── */
    if ('ondevicelight' in window) {
      startDeviceLightFallback();
      return;
    }

    /* ── No sensor available — show graceful message ── */
    console.warn('[AmbientLight] No light sensor API available on this device');
    updateStatusUI('Sensor not available');
    showToast('Light sensor not available on this device', 'warning');
    isRunning = false;

    // Uncheck toggle since we can't run + clear saved state
    const toggle = document.getElementById('toggle-darkness');
    if (toggle) toggle.checked = false;
    localStorage.setItem('safeher_darkness_sensor', 'false');

  } catch (err) {
    console.error('[AmbientLight] start() error:', err);
  }
}

/* ── devicelight fallback ── */
function startDeviceLightFallback() {
  try {
    useFallback = true;
    window.addEventListener('devicelight', onDeviceLight);
    isRunning = true;
    console.log('[AmbientLight] ✅ Using devicelight fallback');
    updateStatusUI('Monitoring (fallback)…');
  } catch (err) {
    console.error('[AmbientLight] devicelight fallback error:', err);
  }
}

function onDeviceLight(e) {
  try {
    previousLux = currentLux;
    currentLux = e.value;
    processLuxReading(currentLux, previousLux);
  } catch (err) {
    console.error('[AmbientLight] devicelight handler error:', err);
  }
}

/* ══════════════════════════════════════════
   stop()  — stop monitoring
   ══════════════════════════════════════════ */
export function stop() {
  try {
    if (sensorInstance) {
      try { sensorInstance.stop(); } catch (_) {}
      sensorInstance = null;
    }

    if (useFallback) {
      window.removeEventListener('devicelight', onDeviceLight);
      useFallback = false;
    }

    if (darknessTimer) { clearTimeout(darknessTimer); darknessTimer = null; }
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

    isRunning = false;
    isDark = false;
    alertSent = false;
    currentLux = null;
    previousLux = null;

    updateStatusUI('Off — Detects dark environments');
    console.log('[AmbientLight] ✅ Sensor stopped');
  } catch (err) {
    console.error('[AmbientLight] stop() error:', err);
  }
}

/* ══════════════════════════════════════════
   processLuxReading(lux, prevLux)
   Core logic — evaluate light level
   ══════════════════════════════════════════ */
function processLuxReading(lux, prevLux) {
  try {
    if (lux == null) return;

    // Update UI with current lux
    updateStatusUI(`${Math.round(lux)} lux${isDark ? ' — 🌑 Dark' : ''}`);

    /* ── Check for sudden light drop (e.g. phone covered, bag) ── */
    if (prevLux != null && prevLux > DARK_THRESHOLD_LUX) {
      const ratio = lux / prevLux;
      if (ratio <= SUDDEN_DROP_RATIO) {
        console.log(`[AmbientLight] ⚡ Sudden light drop: ${Math.round(prevLux)} → ${Math.round(lux)} lux`);
        showToast('⚡ Sudden light drop detected!', 'warning');
        logEvent('darkness_sudden_drop', {
          trigger: { method: 'ambient_light', prevLux: Math.round(prevLux), currentLux: Math.round(lux) }
        }).catch(() => {});
      }
    }

    /* ── Check if below dark threshold ── */
    if (lux <= DARK_THRESHOLD_LUX) {
      if (!isDark) {
        isDark = true;
        console.log(`[AmbientLight] 🌑 Darkness detected: ${Math.round(lux)} lux (threshold: ${DARK_THRESHOLD_LUX})`);

        // Start darkness timer — wait before alerting
        darknessTimer = setTimeout(() => {
          try {
            if (!isDark || alertSent) return;
            alertSent = true;

            console.log('[AmbientLight] ⏰ Sustained darkness — triggering alert');
            showToast('🌑 Dark environment detected — stay alert!', 'warning');
            sendBrowserNotification('🌑 Darkness Detected',
              `Ambient light: ${Math.round(lux)} lux. You may be in a dark area.`);

            logEvent('darkness_detected', {
              trigger: { method: 'ambient_light', lux: Math.round(lux), sustained: true }
            }).catch(() => {});

            /* ── Very dark = critical alert (with 30-min cooldown to reduce false positives) ── */
            if (lux <= VERY_DARK_LUX && (Date.now() - lastDarkAlertTime > DARK_ALERT_COOLDOWN_MS)) {
              lastDarkAlertTime = Date.now();
              console.log('[AmbientLight] 🚨 Critical darkness — sending alert to contacts');
              sendAlert('darkness');
            }
          } catch (err) {
            console.error('[AmbientLight] darkness timer handler error:', err);
          }
        }, DARKNESS_DELAY_MS);
      }
    } else {
      /* ── Back to light ── */
      if (isDark) {
        isDark = false;
        alertSent = false;
        if (darknessTimer) { clearTimeout(darknessTimer); darknessTimer = null; }
        console.log(`[AmbientLight] ☀️ Light restored: ${Math.round(lux)} lux`);
      }
    }
  } catch (err) {
    console.error('[AmbientLight] processLuxReading error:', err);
  }
}

/* ══════════════════════════════════════════
   UI helpers
   ══════════════════════════════════════════ */
function updateStatusUI(text) {
  try {
    const statusEl = document.getElementById('darkness-status');
    if (statusEl) statusEl.textContent = text;
  } catch (_) {}
}

/* ══════════════════════════════════════════
   Exports for external use
   ══════════════════════════════════════════ */
export function getCurrentLux() {
  return currentLux;
}

export function isMonitoring() {
  return isRunning;
}

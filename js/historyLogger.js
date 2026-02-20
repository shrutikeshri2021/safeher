/* ═══════════════════════════════════════════════
   SafeHer — History Event Logger
   Helper module — other modules call logEvent()
   to automatically log events to IndexedDB.
   ═══════════════════════════════════════════════ */

import { saveHistoryEvent } from './db.js';

/* ── Event type → auto-generated title & severity ── */
const EVENT_META = {
  sos_triggered:     { title: '🚨 SOS Triggered',          severity: 'critical' },
  sos_cancelled:     { title: '✅ SOS Cancelled',           severity: 'safe'     },
  voice_alert:       { title: '🎙️ Voice Alert Detected',   severity: 'critical' },
  motion_alert:      { title: '📳 Motion Alert Detected',  severity: 'warning'  },
  fake_call_used:    { title: '📞 Fake Call Activated',     severity: 'info'     },
  journey_started:   { title: '🗺️ Journey Started',        severity: 'info'     },
  journey_completed: { title: '🏁 Journey Completed',      severity: 'safe'     },
  safe_mode_on:      { title: '🏠 Safe Mode Enabled',      severity: 'safe'     },
  safe_mode_off:     { title: '🚶 Safe Mode Disabled',     severity: 'info'     },
  check_in_ok:       { title: '✅ Check-in Confirmed',      severity: 'safe'     },
  check_in_missed:   { title: '⚠️ Check-in Missed',        severity: 'warning'  },
  recording_saved:   { title: '💾 Recording Saved',         severity: 'info'     },
  contact_alerted:   { title: '📨 Contacts Alerted',        severity: 'warning'  },
  siren_activated:   { title: '🔊 Siren Activated',         severity: 'warning'  },
  location_shared:   { title: '📍 Location Shared',         severity: 'info'     },
  app_opened:        { title: '📱 App Opened',              severity: 'info'     },
  emergency_active:  { title: '🚨 Emergency Activated',     severity: 'critical' }
};

/* ══════════════════════════════════════════
   logEvent(type, extraData)
   Auto-populates id, timestamp, title, severity,
   location, system info. Merges extraData on top.
   ══════════════════════════════════════════ */
export async function logEvent(type, extraData = {}) {
  try {
    const meta = EVENT_META[type] || { title: type, severity: 'info' };
    const id   = 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    const event = {
      id,
      type,
      timestamp: Date.now(),
      title:     meta.title,
      severity:  meta.severity,

      /* Location — filled async below, or from extraData */
      location: extraData.location || null,

      /* Media — optional */
      media: extraData.media || { hasVideo: false, hasPhoto: false, hasAudio: false },

      /* Trigger details */
      trigger: extraData.trigger || {},

      /* Contacts */
      contacts: extraData.contacts || { alerted: false, alertedCount: 0 },

      /* Journey context */
      journey: extraData.journey || {},

      /* Resolution — default unresolved */
      resolution: extraData.resolution || { resolved: false },

      /* System info */
      system: {
        batteryLevel: null,
        networkType:  navigator.connection?.effectiveType || null,
        appVersion:   '1.0.0',
        ...(extraData.system || {})
      }
    };

    /* Try to get battery level */
    try {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        event.system.batteryLevel = Math.round(battery.level * 100);
      }
    } catch (_) {}

    /* Try to get GPS if no location provided */
    if (!event.location) {
      try {
        event.location = await getQuickGPS();
      } catch (_) {}
    }

    /* Try reverse geocoding for address */
    if (event.location && event.location.lat && !event.location.address) {
      try {
        const addr = await reverseGeocode(event.location.lat, event.location.lng);
        if (addr) {
          event.location.address = addr;
          event.location.mapsLink = `https://www.google.com/maps?q=${event.location.lat},${event.location.lng}`;
        }
      } catch (_) {}
    }

    await saveHistoryEvent(event);

    /* Dispatch custom event for live UI updates */
    document.dispatchEvent(new CustomEvent('safeher:history-updated', { detail: event }));

    return event;
  } catch (err) {
    console.warn('[HistoryLogger] Failed to log event:', type, err);
    return null;
  }
}

/* ── Quick GPS (3s timeout, returns {lat,lng} or null) ── */
function getQuickGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    const timeout = setTimeout(() => resolve(null), 3000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => { clearTimeout(timeout); resolve(null); },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
    );
  });
}

/* ── Reverse geocode via Nominatim ── */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.display_name || null;
  } catch (_) {
    return null;
  }
}

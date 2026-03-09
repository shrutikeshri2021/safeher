/* ═══════════════════════════════════════════════
   SafeHer — Geo-fence Alerts Module
   Users mark "unsafe zones" on the map.
   Auto-alert when entering any zone.
   Zones are circles with configurable radius.
   Stored in localStorage. Uses browser Geolocation.
   ═══════════════════════════════════════════════ */

import { showToast, sendAlert, sendBrowserNotification } from './alerts.js';
import { logEvent } from './historyLogger.js';

/* global L */

const STORAGE_KEY = 'safeher_geofences';
const CHECK_INTERVAL = 10000;        // check every 10 seconds
const ALERT_COOLDOWN  = 300000;      // 5 min cooldown per zone after alert
const DEFAULT_RADIUS  = 200;         // meters

/* ── State ── */
let geofences   = [];                // [{ id, lat, lng, radius, label, color }]
let watchId     = null;              // geolocation watchPosition id
let checkTimer  = null;              // interval for proximity checks
let lastPos     = null;              // { lat, lng }
let alertedMap  = {};                // { zoneId: timestamp } — cooldown tracker
let mapRef      = null;              // Leaflet map reference
let zoneLayers  = [];                // Leaflet layer references
let isMonitoring = false;
let isAddingZone = false;            // click-to-add mode

/* ═══════════════════════════════════════════════
   STORAGE — localStorage CRUD
   ═══════════════════════════════════════════════ */
function loadZones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    geofences = raw ? JSON.parse(raw) : [];
  } catch (_) {
    geofences = [];
  }
}

function saveZones() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(geofences));
  } catch (_) {}
}

export function getZones() {
  loadZones();
  return [...geofences];
}

/* ═══════════════════════════════════════════════
   HAVERSINE — distance in meters
   ═══════════════════════════════════════════════ */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ═══════════════════════════════════════════════
   ZONE MANAGEMENT
   ═══════════════════════════════════════════════ */
export function addZone(lat, lng, radius = DEFAULT_RADIUS, label = '') {
  const id = 'gz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const zone = {
    id,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
    radius: Math.max(50, Math.min(radius, 2000)),
    label: label || `Unsafe Zone ${geofences.length + 1}`,
    color: '#FF3366'
  };
  geofences.push(zone);
  saveZones();
  drawZoneOnMap(zone);
  renderZoneList();
  showToast(`⛔ Zone "${zone.label}" added`, 'success');
  logEvent('geofence_added', { zone: zone.label, lat: zone.lat, lng: zone.lng, radius: zone.radius }).catch(() => {});
  return zone;
}

export function removeZone(zoneId) {
  const idx = geofences.findIndex(z => z.id === zoneId);
  if (idx === -1) return;
  const zone = geofences[idx];
  geofences.splice(idx, 1);
  saveZones();
  delete alertedMap[zoneId];
  removeZoneFromMap(zoneId);
  renderZoneList();
  showToast(`Zone "${zone.label}" removed`, 'info');
}

export function clearAllZones() {
  geofences = [];
  saveZones();
  alertedMap = {};
  clearZoneLayers();
  renderZoneList();
  showToast('All unsafe zones cleared', 'info');
}

/* ═══════════════════════════════════════════════
   MAP DRAWING — render zones as semi-transparent circles
   ═══════════════════════════════════════════════ */
function drawZoneOnMap(zone) {
  if (!mapRef) return;
  const circle = L.circle([zone.lat, zone.lng], {
    radius: zone.radius,
    color: zone.color || '#FF3366',
    fillColor: zone.color || '#FF3366',
    fillOpacity: 0.12,
    weight: 2,
    opacity: 0.6,
    dashArray: '6 4',
    className: 'geofence-circle'
  });

  const label = L.marker([zone.lat, zone.lng], {
    icon: L.divIcon({
      className: 'geofence-label-icon',
      html: `<div style="background:rgba(255,51,102,0.85);color:#fff;padding:2px 8px;
        border-radius:8px;font-size:0.65rem;font-weight:600;white-space:nowrap;
        font-family:Outfit,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        border:1px solid rgba(255,255,255,0.15);">⛔ ${escapeHTML(zone.label)}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    }),
    interactive: false
  });

  const group = L.layerGroup([circle, label]).addTo(mapRef);
  zoneLayers.push({ id: zone.id, layer: group });
}

function removeZoneFromMap(zoneId) {
  const idx = zoneLayers.findIndex(z => z.id === zoneId);
  if (idx === -1) return;
  if (mapRef) mapRef.removeLayer(zoneLayers[idx].layer);
  zoneLayers.splice(idx, 1);
}

function clearZoneLayers() {
  zoneLayers.forEach(z => {
    if (mapRef) mapRef.removeLayer(z.layer);
  });
  zoneLayers = [];
}

function drawAllZones() {
  clearZoneLayers();
  geofences.forEach(z => drawZoneOnMap(z));
}

/* ═══════════════════════════════════════════════
   ZONE LIST UI — renders below the map
   ═══════════════════════════════════════════════ */
function renderZoneList() {
  const list = document.getElementById('geofence-zone-list');
  if (!list) return;

  if (geofences.length === 0) {
    list.innerHTML = `<div class="gf-empty">
      <p>No unsafe zones marked yet.</p>
      <p class="small">Tap "Add Unsafe Zone" then tap the map to mark areas.</p>
    </div>`;
    return;
  }

  list.innerHTML = geofences.map(z => `
    <div class="gf-zone-card" data-id="${z.id}">
      <div class="gf-zone-info">
        <span class="gf-zone-icon">⛔</span>
        <div>
          <span class="gf-zone-name">${escapeHTML(z.label)}</span>
          <span class="gf-zone-meta">${z.radius}m radius · ${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}</span>
        </div>
      </div>
      <button class="gf-zone-delete" data-delete="${z.id}" aria-label="Delete zone" title="Remove">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>`).join('');

  /* Wire delete buttons */
  list.querySelectorAll('.gf-zone-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delete;
      if (id) removeZone(id);
    });
  });
}

/* ═══════════════════════════════════════════════
   MONITORING — GPS proximity checking
   ═══════════════════════════════════════════════ */
export function startMonitoring() {
  if (isMonitoring) return;
  if (!navigator.geolocation) {
    showToast('Geolocation not available', 'warning');
    return;
  }
  isMonitoring = true;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      lastPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );

  checkTimer = setInterval(() => {
    if (lastPos) checkProximity(lastPos.lat, lastPos.lng);
  }, CHECK_INTERVAL);

  updateToggleUI(true);
  showToast('Geo-fence monitoring active', 'success');
  logEvent('geofence_monitoring_on').catch(() => {});
}

export function stopMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
  updateToggleUI(false);
  showToast('Geo-fence monitoring stopped', 'info');
  logEvent('geofence_monitoring_off').catch(() => {});
}

function checkProximity(lat, lng) {
  const now = Date.now();
  for (const zone of geofences) {
    const dist = haversine(lat, lng, zone.lat, zone.lng);
    if (dist <= zone.radius) {
      /* Inside an unsafe zone */
      const lastAlert = alertedMap[zone.id] || 0;
      if (now - lastAlert > ALERT_COOLDOWN) {
        alertedMap[zone.id] = now;
        triggerGeofenceAlert(zone, dist);
      }
    }
  }
}

async function triggerGeofenceAlert(zone, distance) {
  const msg = `⛔ You entered unsafe zone "${zone.label}" (${Math.round(distance)}m from center)`;
  showToast(msg, 'danger');
  sendBrowserNotification('⛔ Unsafe Zone Alert', msg);

  try {
    await sendAlert('geofence');
  } catch (err) {
    console.error('[geofence] sendAlert failed:', err);
  }

  logEvent('geofence_alert', {
    zone: zone.label,
    zoneId: zone.id,
    lat: zone.lat,
    lng: zone.lng,
    radius: zone.radius,
    distance: Math.round(distance)
  }).catch(() => {});
}

function updateToggleUI(active) {
  const toggle = document.getElementById('toggle-geofence');
  const statusEl = document.getElementById('geofence-status');
  if (toggle) toggle.checked = active;
  if (statusEl) statusEl.textContent = active
    ? `Active — monitoring ${geofences.length} zone(s)`
    : 'Off — Enable to get alerts near unsafe zones';
}

/* ═══════════════════════════════════════════════
   MAP CLICK-TO-ADD MODE
   ═══════════════════════════════════════════════ */
export function enterAddMode() {
  if (!mapRef) {
    showToast('Open the Journey tab first to load the map', 'warning');
    return;
  }
  isAddingZone = true;
  showToast('📍 Tap the map to mark an unsafe zone', 'info');
  updateAddBtnUI(true);
  mapRef.once('click', onMapClickForZone);
}

function exitAddMode() {
  isAddingZone = false;
  updateAddBtnUI(false);
  if (mapRef) mapRef.off('click', onMapClickForZone);
}

function onMapClickForZone(e) {
  const { lat, lng } = e.latlng;

  /* Show radius input modal inline */
  const label = prompt('Zone label (e.g. "Dark alley near station"):', `Unsafe Zone ${geofences.length + 1}`);
  if (label === null) { exitAddMode(); return; }

  const radiusStr = prompt('Radius in meters (50–2000):', '200');
  if (radiusStr === null) { exitAddMode(); return; }
  const radius = parseInt(radiusStr, 10) || DEFAULT_RADIUS;

  addZone(lat, lng, radius, label);
  exitAddMode();
}

function updateAddBtnUI(adding) {
  const btn = document.getElementById('btn-add-geofence');
  if (!btn) return;
  if (adding) {
    btn.classList.add('gf-adding');
    btn.textContent = '📍 Tap the map…';
  } else {
    btn.classList.remove('gf-adding');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Unsafe Zone`;
  }
}

/* ═══════════════════════════════════════════════
   INIT — called from app.js
   ═══════════════════════════════════════════════ */
export function init() {
  loadZones();
  wireUI();
  renderZoneList();

  /* If monitoring was active before reload, restart */
  if (localStorage.getItem('safeher_geofence_active') === 'true' && geofences.length > 0) {
    startMonitoring();
  }
}

/**
 * setMap(leafletMap) — called from mapJourney
 * after the Leaflet map is ready, so we can
 * draw zones on it.
 */
export function setMap(leafletMap) {
  mapRef = leafletMap;
  drawAllZones();
}

function wireUI() {
  /* Toggle monitoring */
  const toggle = document.getElementById('toggle-geofence');
  if (toggle) {
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        startMonitoring();
        localStorage.setItem('safeher_geofence_active', 'true');
      } else {
        stopMonitoring();
        localStorage.setItem('safeher_geofence_active', 'false');
      }
    });
  }

  /* Add zone button */
  const btnAdd = document.getElementById('btn-add-geofence');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      if (isAddingZone) exitAddMode();
      else enterAddMode();
    });
  }

  /* Clear all zones */
  const btnClear = document.getElementById('btn-clear-geofences');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (geofences.length === 0) return;
      if (confirm('Remove all unsafe zones?')) clearAllZones();
    });
  }
}

/* ═══════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════ */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

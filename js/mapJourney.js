/* ═══════════════════════════════════════════════
   SafeHer — Map & Journey Tracking Module
   Leaflet map, waypoints, path deviation,
   check-in timer, live location
   ═══════════════════════════════════════════════ */

import { showToast, updateHeaderStatus, updateStatusCard, sendAlert, sendBrowserNotification } from './alerts.js';
import { sendAlertToContacts } from './contacts.js';
import { logEvent } from './historyLogger.js';

/* global L */

/* ── Map & Marker State ── */
let map = null;
let userMarker = null;
let accuracyCircle = null;
let liveWatchId = null;

/* ── Waypoint State ── */
const WAYPOINT_STORAGE_KEY = 'safeher_waypoints';
const MAX_WAYPOINTS = 10;
let waypoints = [];
let waypointPolyline = null;

/* ── Journey State ── */
let journeyPhase = 'planning';
let journeyActive = false;
let journeyPaused = false;
let journeyStartTime = null;
let pausedDuration = 0;
let pauseStart = null;
let journeyCoords = [];
let journeyTimerInterval = null;
let totalDistance = 0;
let watchId = null;
let journeyPath = null;
let currentPosition = null;

/* ── Path Deviation State ── */
const DEVIATION_THRESHOLD = 150;
const DEVIATION_TIMER_MS = 30000;
const DEVIATION_REPEAT_MS = 120000;
let deviationTimer = null;
let deviationRepeatTimer = null;
let isDeviated = false;

/* ── Check-in Timer State ── */
let checkinDuration = 15;
let checkinCountdown = 0;
let checkinInterval = null;
let checkinActive = false;

/* ── Journey Destination & ETA State ── */
let journeyDestName = '';
let journeyEtaTarget = null;   // Date object for expected arrival
let etaAlertSent = false;

/* ═══════════════════════════════════════════════
   HAVERSINE DISTANCE (meters)
   ═══════════════════════════════════════════════ */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ═══════════════════════════════════════════════
   MAP ICONS
   ═══════════════════════════════════════════════ */
function createUserIcon() {
  return L.divIcon({
    className: 'user-marker-icon',
    html: `<div style="position:relative;width:22px;height:22px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(10,132,255,0.2);animation:livePulse 2s ease-out infinite;"></div>
      <div style="position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;
        background:#0A84FF;border:3px solid #fff;
        box-shadow:0 0 12px rgba(10,132,255,0.6);"></div>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function createWaypointIcon(label, reached) {
  const bg = reached ? '#34C759' : '#FF2D55';
  const icon = reached ? '✓' : label;
  return L.divIcon({
    className: 'waypoint-marker-icon',
    html: `<div style="position:relative;width:30px;height:30px;">
      <div style="width:30px;height:30px;border-radius:50%;background:${bg};
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:0.7rem;font-weight:700;
        border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${icon}</div>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

/* ═══════════════════════════════════════════════
   INITIALIZE MAP
   ═══════════════════════════════════════════════ */
export function initMap() {
  const container = document.getElementById('map-container');
  if (!container || map) return;

  map = L.map('map-container', {
    center: [20.5937, 78.9629],
    zoom: 15,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  setTimeout(() => map.invalidateSize(), 200);
  setTimeout(() => map.invalidateSize(), 500);

  startLiveLocationDot();
  loadWaypoints();

  map.on('click', onMapClick);

  wireJourneyButtons();
  wireCheckinButtons();
}

/* ═══════════════════════════════════════════════
   LIVE LOCATION BLUE DOT
   ═══════════════════════════════════════════════ */
function startLiveLocationDot() {
  if (liveWatchId != null || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      updateUserPosition(lat, lng, accuracy);
      map.setView([lat, lng], 16);
    },
    () => showToast('Could not get location — enable GPS', 'warning'),
    { enableHighAccuracy: true, timeout: 10000 }
  );

  liveWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      updateUserPosition(lat, lng, accuracy);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
  );
}

function updateUserPosition(lat, lng, accuracy) {
  if (!map) return;
  currentPosition = { lat, lng };
  const latlng = [lat, lng];

  if (userMarker) {
    userMarker.setLatLng(latlng);
  } else {
    userMarker = L.marker(latlng, { icon: createUserIcon(), zIndexOffset: 1000 }).addTo(map);
  }

  if (accuracyCircle) {
    accuracyCircle.setLatLng(latlng);
    accuracyCircle.setRadius(accuracy || 30);
  } else {
    accuracyCircle = L.circle(latlng, {
      radius: accuracy || 30,
      color: '#0A84FF', fillColor: '#0A84FF',
      fillOpacity: 0.08, weight: 1, opacity: 0.3
    }).addTo(map);
  }
}

/* ═══════════════════════════════════════════════
   WAYPOINT SYSTEM
   ═══════════════════════════════════════════════ */
function onMapClick(e) {
  if (journeyPhase !== 'planning') return;
  if (waypoints.length >= MAX_WAYPOINTS) {
    showToast(`Max ${MAX_WAYPOINTS} waypoints allowed`, 'warning');
    return;
  }
  addWaypoint(e.latlng.lat, e.latlng.lng);
}

function addWaypoint(lat, lng) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const num = waypoints.length + 1;
  const wp = { id, lat, lng, label: `Node ${num}`, radius: 50, reached: false };

  const marker = L.marker([lat, lng], { icon: createWaypointIcon(`${num}`, false) }).addTo(map);
  marker.bindPopup(`<b>${wp.label}</b><br>Tap 'Start' to begin tracking`);
  wp.marker = marker;

  const circle = L.circle([lat, lng], {
    radius: 50, color: '#0A84FF', fillColor: '#0A84FF',
    fillOpacity: 0.1, weight: 1.5, dashArray: '5,5'
  }).addTo(map);
  wp.circle = circle;

  waypoints.push(wp);
  saveWaypoints();
  updateWaypointPolyline();
  renderWaypointList();

  if (waypoints.length > 1) {
    const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
    if (currentPosition) bounds.extend([currentPosition.lat, currentPosition.lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

function removeWaypoint(id) {
  const idx = waypoints.findIndex(w => w.id === id);
  if (idx === -1) return;
  const wp = waypoints[idx];
  if (wp.marker) map.removeLayer(wp.marker);
  if (wp.circle) map.removeLayer(wp.circle);
  waypoints.splice(idx, 1);

  waypoints.forEach((w, i) => {
    w.label = `Node ${i + 1}`;
    if (w.marker) {
      w.marker.setIcon(createWaypointIcon(`${i + 1}`, w.reached));
      w.marker.setPopupContent(`<b>${w.label}</b>`);
    }
  });

  saveWaypoints();
  updateWaypointPolyline();
  renderWaypointList();
}

function clearAllWaypoints() {
  waypoints.forEach(w => {
    if (w.marker) map.removeLayer(w.marker);
    if (w.circle) map.removeLayer(w.circle);
  });
  waypoints = [];
  if (waypointPolyline) { map.removeLayer(waypointPolyline); waypointPolyline = null; }
  saveWaypoints();
  renderWaypointList();
}

function updateWaypointPolyline() {
  if (waypointPolyline) map.removeLayer(waypointPolyline);
  if (waypoints.length < 2) return;
  const coords = waypoints.map(w => [w.lat, w.lng]);
  waypointPolyline = L.polyline(coords, {
    color: '#0A84FF', weight: 3, opacity: 0.7, dashArray: '8,8'
  }).addTo(map);
}

function renderWaypointList() {
  const listEl = document.getElementById('waypoints-list');
  if (!listEl) return;

  if (waypoints.length === 0) {
    listEl.innerHTML = '<p class="waypoint-empty">No waypoints added yet.</p>';
    return;
  }

  listEl.innerHTML = waypoints.map((w, i) => `
    <div class="waypoint-item${w.reached ? ' waypoint-reached' : ''}" data-id="${w.id}">
      <span class="waypoint-num">${i + 1}</span>
      <span class="waypoint-label">${w.label}</span>
      <span class="waypoint-coords">${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}</span>
      ${journeyPhase === 'planning' ? `<button class="waypoint-remove" data-id="${w.id}">✕</button>` : ''}
      ${w.reached ? '<span class="waypoint-check">✅</span>' : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('.waypoint-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeWaypoint(btn.dataset.id);
    });
  });
}

function saveWaypoints() {
  const data = waypoints.map(w => ({
    id: w.id, lat: w.lat, lng: w.lng,
    label: w.label, radius: w.radius, reached: w.reached
  }));
  localStorage.setItem(WAYPOINT_STORAGE_KEY, JSON.stringify(data));
}

function loadWaypoints() {
  try {
    const saved = JSON.parse(localStorage.getItem(WAYPOINT_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved) || saved.length === 0) return;

    saved.forEach((w) => {
      const num = waypoints.length + 1;
      const marker = L.marker([w.lat, w.lng], {
        icon: createWaypointIcon(`${num}`, w.reached)
      }).addTo(map);
      marker.bindPopup(`<b>${w.label}</b>`);

      const circle = L.circle([w.lat, w.lng], {
        radius: w.radius || 50,
        color: w.reached ? '#34C759' : '#0A84FF',
        fillColor: w.reached ? '#34C759' : '#0A84FF',
        fillOpacity: 0.1, weight: 1.5, dashArray: '5,5'
      }).addTo(map);

      waypoints.push({ ...w, marker, circle });
    });

    updateWaypointPolyline();
    renderWaypointList();

    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  } catch (_) {}
}

/* ═══════════════════════════════════════════════
   JOURNEY LIFECYCLE
   ═══════════════════════════════════════════════ */
export function startJourney() {
  if (journeyActive) return;
  if (waypoints.length < 2) {
    showToast('Add at least 2 waypoints to start', 'warning');
    return;
  }
  if (!navigator.geolocation) {
    showToast('Geolocation is not available', 'error');
    return;
  }

  journeyActive = true;
  journeyPaused = false;
  journeyPhase = 'active';
  journeyStartTime = Date.now();
  pausedDuration = 0;
  pauseStart = null;
  journeyCoords = [];
  totalDistance = 0;
  isDeviated = false;
  etaAlertSent = false;

  // Read destination name & ETA from inputs
  const destNameInput = document.getElementById('journey-dest-name');
  const etaTimeInput = document.getElementById('journey-eta-time');
  journeyDestName = destNameInput ? destNameInput.value.trim() : '';
  journeyEtaTarget = null;

  if (etaTimeInput && etaTimeInput.value) {
    const [hh, mm] = etaTimeInput.value.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
    // If the target time is before now, assume next day
    if (target <= now) target.setDate(target.getDate() + 1);
    journeyEtaTarget = target;
  }

  // Show ETA card if target was set
  const etaActiveEl = document.getElementById('journey-eta-active');
  const etaTargetEl = document.getElementById('journey-eta-target');
  const etaDestEl = document.getElementById('journey-eta-dest-name');
  if (journeyEtaTarget && etaActiveEl) {
    etaActiveEl.classList.remove('hidden');
    if (etaTargetEl) etaTargetEl.textContent = journeyEtaTarget.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (etaDestEl) etaDestEl.textContent = journeyDestName ? `📍 ${journeyDestName}` : '';
  } else if (etaActiveEl) {
    etaActiveEl.classList.add('hidden');
  }

  waypoints.forEach(w => {
    w.reached = false;
    if (w.marker) w.marker.setIcon(createWaypointIcon(w.label.replace('Node ', ''), false));
    if (w.circle) w.circle.setStyle({ color: '#0A84FF', fillColor: '#0A84FF' });
  });

  if (journeyPath) map.removeLayer(journeyPath);
  journeyPath = L.polyline([], {
    color: '#34C759', weight: 4, opacity: 0.8, lineJoin: 'round'
  }).addTo(map);

  setPhaseUI('active');

  updateHeaderStatus('journey', 'Journey');
  updateStatusCard('journey', 'Journey Active', 'Your path is being recorded in real-time.');

  watchId = navigator.geolocation.watchPosition(
    onJourneyPositionUpdate,
    (err) => {
      console.warn('GPS error during journey:', err);
      showToast('Lost GPS signal. Retrying…', 'warning');
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
  );

  journeyTimerInterval = setInterval(updateJourneyTimer, 1000);

  showToast('Journey Started', 'Your path is being tracked.', 'success');
  logEvent('journey_started').catch(() => {});
}

function onJourneyPositionUpdate(pos) {
  if (!journeyActive || journeyPaused) return;

  const { latitude: lat, longitude: lng, speed, accuracy } = pos.coords;
  const newCoord = [lat, lng];
  currentPosition = { lat, lng };

  if (journeyCoords.length > 0) {
    const last = journeyCoords[journeyCoords.length - 1];
    totalDistance += haversineDistance(last[0], last[1], lat, lng);
  }

  journeyCoords.push(newCoord);
  journeyPath.addLatLng(newCoord);
  updateUserPosition(lat, lng, accuracy);
  map.panTo(newCoord, { animate: true, duration: 0.5 });

  const speedEl = document.getElementById('journey-speed');
  if (speedEl) {
    const kmh = speed != null && speed >= 0 ? Math.round(speed * 3.6) : 0;
    speedEl.textContent = `${kmh} km/h`;
  }

  const distEl = document.getElementById('journey-distance');
  if (distEl) {
    distEl.textContent = totalDistance >= 1000
      ? `${(totalDistance / 1000).toFixed(1)} km`
      : `${Math.round(totalDistance)} m`;
  }

  checkWaypointProximity(lat, lng);
  checkPathDeviation(lat, lng);
}

function updateJourneyTimer() {
  if (!journeyStartTime) return;
  const pauseMs = journeyPaused && pauseStart ? (Date.now() - pauseStart) : 0;
  const elapsed = Math.round((Date.now() - journeyStartTime - pausedDuration - pauseMs) / 1000);
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  const durEl = document.getElementById('journey-duration');
  if (durEl) durEl.textContent = `${h}:${m}:${s}`;

  // ETA countdown
  updateEtaCountdown();
}

/* ═══════════════════════════════════════════════
   JOURNEY ETA COUNTDOWN
   ═══════════════════════════════════════════════ */
function updateEtaCountdown() {
  if (!journeyEtaTarget) return;

  const now = new Date();
  const remainingMs = journeyEtaTarget - now;
  const remainingEl = document.getElementById('journey-eta-remaining');
  const progressEl = document.getElementById('journey-eta-progress');

  if (remainingMs <= 0) {
    // Time expired
    if (remainingEl) { remainingEl.textContent = 'OVERDUE'; remainingEl.style.color = 'var(--accent-red)'; }
    if (progressEl) { progressEl.style.width = '100%'; progressEl.style.background = 'var(--accent-red)'; }

    // Send alert once
    if (!etaAlertSent) {
      etaAlertSent = true;
      triggerEtaMissedAlert();
    }
    return;
  }

  const totalSec = Math.ceil(remainingMs / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (remainingEl) {
    remainingEl.textContent = hrs > 0
      ? `${hrs}h ${mins.toString().padStart(2, '0')}m`
      : `${mins}:${secs.toString().padStart(2, '0')}`;

    // Color changes: green → amber at 25%, red at 10%
    const totalJourneyMs = journeyEtaTarget - journeyStartTime;
    const pct = totalJourneyMs > 0 ? (remainingMs / totalJourneyMs) : 1;
    if (pct <= 0.1) remainingEl.style.color = 'var(--accent-red)';
    else if (pct <= 0.25) remainingEl.style.color = 'var(--accent-amber)';
    else remainingEl.style.color = 'var(--accent-green)';
  }

  // Progress bar
  if (progressEl) {
    const totalJourneyMs = journeyEtaTarget - journeyStartTime;
    const elapsedMs = now - journeyStartTime;
    const progress = Math.min(100, (elapsedMs / totalJourneyMs) * 100);
    progressEl.style.width = `${progress}%`;
    if (progress > 90) progressEl.style.background = 'var(--accent-red)';
    else if (progress > 75) progressEl.style.background = 'var(--accent-amber)';
    else progressEl.style.background = 'var(--accent-green)';
  }
}

function triggerEtaMissedAlert() {
  showToast('⚠️ ETA missed! You haven\'t arrived yet — alerting contacts…', 'error');
  if (navigator.vibrate) navigator.vibrate([800, 200, 800, 200, 800]);
  sendBrowserNotification('⚠️ ETA Missed',
    `Expected arrival at ${journeyDestName || 'destination'} has passed. Alerting emergency contacts.`);
  sendAlert('eta_missed');
  logEvent('journey_eta_missed', {
    journey: {
      destination: journeyDestName || null,
      etaTarget: journeyEtaTarget.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }).catch(() => {});
}

export function pauseJourney() {
  if (!journeyActive || journeyPaused) return;
  journeyPaused = true;
  pauseStart = Date.now();

  const pauseBtn = document.getElementById('btn-pause-journey');
  const iconEl = document.getElementById('pause-btn-icon');
  const textEl = document.getElementById('pause-btn-text');
  if (pauseBtn) {
    pauseBtn.classList.remove('btn--amber');
    pauseBtn.classList.add('btn--green');
  }
  if (iconEl) iconEl.textContent = '▶';
  if (textEl) textEl.textContent = 'Resume Journey';
  showToast('Journey paused', 'info');
}

export function resumeJourney() {
  if (!journeyActive || !journeyPaused) return;
  journeyPaused = false;
  if (pauseStart) {
    pausedDuration += Date.now() - pauseStart;
    pauseStart = null;
  }

  const pauseBtn = document.getElementById('btn-pause-journey');
  const iconEl = document.getElementById('pause-btn-icon');
  const textEl = document.getElementById('pause-btn-text');
  if (pauseBtn) {
    pauseBtn.classList.remove('btn--green');
    pauseBtn.classList.add('btn--amber');
  }
  if (iconEl) iconEl.textContent = '⏸';
  if (textEl) textEl.textContent = 'Pause Journey';
  showToast('Journey resumed', 'success');
}

export function stopJourney(reason = 'stopped') {
  if (!journeyActive) return;
  journeyActive = false;
  journeyPaused = false;
  journeyPhase = 'complete';

  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (journeyTimerInterval) { clearInterval(journeyTimerInterval); journeyTimerInterval = null; }
  clearDeviationTimers();

  const pauseMs = pauseStart ? (Date.now() - pauseStart) : 0;
  const elapsed = Math.round((Date.now() - journeyStartTime - pausedDuration - pauseMs) / 1000);
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  const durationStr = `${h}:${m}:${s}`;
  const distStr = totalDistance >= 1000
    ? `${(totalDistance / 1000).toFixed(1)} km`
    : `${Math.round(totalDistance)} m`;
  const nodesReached = waypoints.filter(w => w.reached).length;

  const durEl = document.getElementById('journey-final-duration');
  const distEl = document.getElementById('journey-final-distance');
  const nodesEl = document.getElementById('journey-final-nodes');
  const summaryEl = document.getElementById('journey-summary-text');
  if (durEl) durEl.textContent = durationStr;
  if (distEl) distEl.textContent = distStr;
  if (nodesEl) nodesEl.textContent = `${nodesReached}/${waypoints.length}`;
  if (summaryEl) {
    summaryEl.textContent = reason === 'home_safe'
      ? 'You arrived safely! 🎉'
      : `Tracked ${journeyCoords.length} points over ${distStr}.`;
  }

  // Hide ETA card
  const etaActiveEl = document.getElementById('journey-eta-active');
  if (etaActiveEl) etaActiveEl.classList.add('hidden');

  setPhaseUI('complete');

  updateHeaderStatus('safe', 'Safe');
  updateStatusCard('safe', "You're Safe", 'All systems normal. Stay alert, stay safe.');

  showToast('Journey Ended', `Tracked ${journeyCoords.length} points, ${distStr}.`, 'info');

  logEvent('journey_completed', {
    journey: {
      distance: distStr,
      points: journeyCoords.length,
      duration: durationStr,
      nodesReached: `${nodesReached}/${waypoints.length}`,
      destination: journeyDestName || null,
      etaTarget: journeyEtaTarget ? journeyEtaTarget.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
    }
  }).catch(() => {});
}

function resetToPlanning() {
  journeyPhase = 'planning';
  journeyActive = false;
  journeyPaused = false;
  journeyStartTime = null;
  pausedDuration = 0;
  pauseStart = null;
  journeyCoords = [];
  totalDistance = 0;
  isDeviated = false;
  journeyDestName = '';
  journeyEtaTarget = null;
  etaAlertSent = false;

  // Reset ETA inputs
  const destInput = document.getElementById('journey-dest-name');
  const etaInput = document.getElementById('journey-eta-time');
  const hintEl = document.getElementById('journey-eta-hint');
  if (destInput) destInput.value = '';
  if (etaInput) etaInput.value = '';
  if (hintEl) hintEl.textContent = 'optional';

  // Reset pause button
  const iconEl = document.getElementById('pause-btn-icon');
  const textEl = document.getElementById('pause-btn-text');
  const pauseBtn = document.getElementById('btn-pause-journey');
  if (iconEl) iconEl.textContent = '⏸';
  if (textEl) textEl.textContent = 'Pause Journey';
  if (pauseBtn) { pauseBtn.classList.remove('btn--green'); pauseBtn.classList.add('btn--amber'); }

  if (journeyPath) { map.removeLayer(journeyPath); journeyPath = null; }
  clearAllWaypoints();
  setPhaseUI('planning');

  updateHeaderStatus('watching', 'Stay Alert 🚶‍♀️');
  updateStatusCard('watching', 'Stay Alert 🚶‍♀️', 'Motion & voice detection active.');
}

/* ═══════════════════════════════════════════════
   WAYPOINT PROXIMITY CHECK
   ═══════════════════════════════════════════════ */
function checkWaypointProximity(lat, lng) {
  let anyReached = false;
  let reachedCount = 0;

  waypoints.forEach((w) => {
    if (w.reached) { reachedCount++; return; }
    const dist = haversineDistance(lat, lng, w.lat, w.lng);
    if (dist <= w.radius) {
      w.reached = true;
      anyReached = true;
      reachedCount++;
      if (w.marker) w.marker.setIcon(createWaypointIcon('✓', true));
      if (w.circle) w.circle.setStyle({ color: '#34C759', fillColor: '#34C759' });
      showToast(`✅ ${w.label} reached!`, 'success');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  });

  const statusEl = document.getElementById('journey-node-status');
  if (statusEl) {
    statusEl.textContent = `Node ${reachedCount}/${waypoints.length} reached ${reachedCount > 0 ? '✅' : ''}`;
  }

  if (anyReached) saveWaypoints();

  if (reachedCount === waypoints.length && waypoints.length > 0) {
    showToast('🎉 All waypoints reached!', 'success');
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
  }
}

/* ═══════════════════════════════════════════════
   PATH DEVIATION DETECTION
   ═══════════════════════════════════════════════ */
function checkPathDeviation(lat, lng) {
  if (waypoints.length < 2) return;
  const distFromPath = distanceToPolyline(lat, lng, waypoints.map(w => [w.lat, w.lng]));
  const devEl = document.getElementById('journey-deviation-status');

  if (distFromPath > DEVIATION_THRESHOLD) {
    if (!isDeviated) {
      isDeviated = true;
      if (devEl) { devEl.textContent = `⚠️ ${Math.round(distFromPath)}m off route`; devEl.className = 'deviation-warning'; }

      deviationTimer = setTimeout(() => {
        triggerDeviationAlert(distFromPath);
        deviationRepeatTimer = setInterval(() => {
          if (isDeviated) triggerDeviationAlert(distFromPath);
          else clearInterval(deviationRepeatTimer);
        }, DEVIATION_REPEAT_MS);
      }, DEVIATION_TIMER_MS);
    } else {
      if (devEl) devEl.textContent = `⚠️ ${Math.round(distFromPath)}m off route`;
    }
  } else {
    if (isDeviated) {
      isDeviated = false;
      clearDeviationTimers();
      if (devEl) { devEl.textContent = '✅ Back on track'; devEl.className = 'deviation-ok'; }
      showToast('✅ Back on your planned route', 'success');
    } else {
      if (devEl) { devEl.textContent = '✅ On route'; devEl.className = 'deviation-ok'; }
    }
  }
}

function triggerDeviationAlert(distance) {
  showToast("⚠️ You've deviated from your planned path!", 'warning');
  if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
  sendAlert('deviation');
  sendBrowserNotification('⚠️ Route Deviation', `You are ${Math.round(distance)}m away from your planned route!`);
  logEvent('path_deviation', {
    trigger: { method: 'auto_deviation', distance: `${Math.round(distance)}m` }
  }).catch(() => {});
}

function clearDeviationTimers() {
  if (deviationTimer) { clearTimeout(deviationTimer); deviationTimer = null; }
  if (deviationRepeatTimer) { clearInterval(deviationRepeatTimer); deviationRepeatTimer = null; }
}

function distanceToPolyline(lat, lng, polyPoints) {
  let minDist = Infinity;
  for (let i = 0; i < polyPoints.length - 1; i++) {
    const dist = pointToSegmentDistance(lat, lng, polyPoints[i][0], polyPoints[i][1], polyPoints[i + 1][0], polyPoints[i + 1][1]);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return haversineDistance(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return haversineDistance(px, py, ax + t * dx, ay + t * dy);
}

/* ═══════════════════════════════════════════════
   CHECK-IN TIMER
   ═══════════════════════════════════════════════ */
function startCheckinTimer() {
  if (checkinActive) return;
  checkinActive = true;
  checkinCountdown = checkinDuration * 60;

  const countdownEl = document.getElementById('checkin-countdown');
  const countdownWrap = document.getElementById('checkin-countdown-wrap');
  const startBtn = document.getElementById('btn-start-checkin');
  const okBtn = document.getElementById('btn-checkin-ok');
  const stopBtn = document.getElementById('btn-stop-checkin');
  const slider = document.getElementById('checkin-slider');

  if (countdownWrap) countdownWrap.classList.remove('hidden');
  if (startBtn) startBtn.classList.add('hidden');
  if (okBtn) okBtn.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.remove('hidden');
  if (slider) slider.disabled = true;

  checkinInterval = setInterval(() => {
    checkinCountdown--;
    const m = Math.floor(checkinCountdown / 60).toString().padStart(2, '0');
    const s = (checkinCountdown % 60).toString().padStart(2, '0');
    if (countdownEl) countdownEl.textContent = `${m}:${s}`;

    if (checkinCountdown <= 0) {
      clearInterval(checkinInterval);
      checkinInterval = null;
      checkinActive = false;
      triggerCheckinAlert();
    }
  }, 1000);

  showToast(`Check-in timer: ${checkinDuration} minutes`, 'info');
}

function resetCheckinTimer() {
  if (!checkinActive) return;
  checkinCountdown = checkinDuration * 60;
  const countdownEl = document.getElementById('checkin-countdown');
  if (countdownEl) {
    const m = Math.floor(checkinCountdown / 60).toString().padStart(2, '0');
    countdownEl.textContent = `${m}:00`;
  }
  showToast("✅ Check-in confirmed — timer reset", 'success');
  logEvent('check_in_ok').catch(() => {});
}

function stopCheckinTimer() {
  checkinActive = false;
  if (checkinInterval) { clearInterval(checkinInterval); checkinInterval = null; }

  const countdownWrap = document.getElementById('checkin-countdown-wrap');
  const startBtn = document.getElementById('btn-start-checkin');
  const okBtn = document.getElementById('btn-checkin-ok');
  const stopBtn = document.getElementById('btn-stop-checkin');
  const slider = document.getElementById('checkin-slider');

  if (countdownWrap) countdownWrap.classList.add('hidden');
  if (startBtn) startBtn.classList.remove('hidden');
  if (okBtn) okBtn.classList.add('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');
  if (slider) slider.disabled = false;
}

function triggerCheckinAlert() {
  showToast('⚠️ Check-in missed! Alerting contacts…', 'error');
  if (navigator.vibrate) navigator.vibrate([1000, 300, 1000]);
  sendAlert('check_in_missed');
  sendBrowserNotification('⚠️ Check-in Missed', 'You did not check in on time. Alerting emergency contacts.');
  logEvent('check_in_missed').catch(() => {});
  stopCheckinTimer();
}

/* ═══════════════════════════════════════════════
   UI PHASE SWITCHING
   ═══════════════════════════════════════════════ */
function setPhaseUI(phase) {
  journeyPhase = phase;

  const planningPanel = document.getElementById('journey-planning-panel');
  const activePanel = document.getElementById('journey-active-panel');
  const completePanel = document.getElementById('journey-complete-panel');
  const pill = document.getElementById('journey-phase-pill');
  const infoText = document.getElementById('journey-info-text');

  [planningPanel, activePanel, completePanel].forEach(p => { if (p) p.classList.add('hidden'); });

  switch (phase) {
    case 'planning':
      if (planningPanel) planningPanel.classList.remove('hidden');
      if (pill) { pill.textContent = 'Planning'; pill.className = 'journey-pill journey-pill--planning'; }
      if (infoText) infoText.textContent = 'Plan your route with waypoints, then start tracking.';
      break;
    case 'active':
      if (activePanel) activePanel.classList.remove('hidden');
      if (pill) { pill.textContent = 'Active'; pill.className = 'journey-pill journey-pill--active'; }
      if (infoText) infoText.textContent = 'Journey is being tracked. Stay safe!';
      renderWaypointList();
      break;
    case 'complete':
      if (completePanel) completePanel.classList.remove('hidden');
      if (pill) { pill.textContent = 'Complete'; pill.className = 'journey-pill journey-pill--complete'; }
      if (infoText) infoText.textContent = 'Journey complete.';
      break;
  }
}

/* ═══════════════════════════════════════════════
   WIRE BUTTONS
   ═══════════════════════════════════════════════ */
function wireJourneyButtons() {
  const startBtn = document.getElementById('btn-start-journey');
  const homeSafeBtn = document.getElementById('btn-home-safe');
  const pauseBtn = document.getElementById('btn-pause-journey');
  const shareBtn = document.getElementById('btn-share-journey');
  const clearBtn = document.getElementById('btn-clear-waypoints');
  const newBtn = document.getElementById('btn-new-journey');

  if (startBtn) startBtn.addEventListener('click', startJourney);
  if (homeSafeBtn) homeSafeBtn.addEventListener('click', () => stopJourney('home_safe'));
  if (pauseBtn) pauseBtn.addEventListener('click', () => { if (journeyPaused) resumeJourney(); else pauseJourney(); });
  if (shareBtn) shareBtn.addEventListener('click', () => shareLocation());
  if (clearBtn) clearBtn.addEventListener('click', () => { if (waypoints.length > 0 && confirm('Clear all waypoints?')) clearAllWaypoints(); });
  if (newBtn) newBtn.addEventListener('click', resetToPlanning);
}

function wireCheckinButtons() {
  const slider = document.getElementById('checkin-slider');
  const valEl = document.getElementById('checkin-slider-val');
  const startBtn = document.getElementById('btn-start-checkin');
  const okBtn = document.getElementById('btn-checkin-ok');
  const stopBtn = document.getElementById('btn-stop-checkin');

  if (slider) {
    slider.addEventListener('input', () => {
      checkinDuration = parseInt(slider.value, 10);
      if (valEl) valEl.textContent = `${checkinDuration} min`;
    });
  }
  if (startBtn) startBtn.addEventListener('click', startCheckinTimer);
  if (okBtn) okBtn.addEventListener('click', resetCheckinTimer);
  if (stopBtn) stopBtn.addEventListener('click', () => { stopCheckinTimer(); showToast('Check-in timer stopped', 'info'); });
}

/* ═══════════════════════════════════════════════
   SHARE LOCATION (kept from original)
   ═══════════════════════════════════════════════ */
let pendingShareLocation = null;
let shareModalWired = false;

export function shareLocation() {
  if (!navigator.geolocation) {
    showToast('Location not available — enable GPS', 'error');
    return;
  }
  if (!shareModalWired) { wireShareModal(); shareModalWired = true; }

  const modal = document.getElementById('share-location-modal');
  const coordsEl = document.getElementById('share-modal-coords');
  if (!modal) return;

  pendingShareLocation = null;
  if (coordsEl) coordsEl.textContent = 'Getting your location…';
  modal.classList.remove('hidden');

  navigator.geolocation.getCurrentPosition(
    (pos) => setSharePosition(pos),
    () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => setSharePosition(pos),
        (err) => {
          if (coordsEl) coordsEl.textContent = '⚠️ Could not get location';
          if (err.code === 1) showToast('Location permission denied — allow Location in browser settings', 'error');
          else if (err.code === 2) showToast('GPS unavailable — turn ON Location in phone settings', 'error');
          else showToast('Location timed out — go outside and try again', 'error');
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

function setSharePosition(pos) {
  const { latitude: lat, longitude: lng } = pos.coords;
  pendingShareLocation = { lat, lng };
  const coordsEl = document.getElementById('share-modal-coords');
  if (coordsEl) coordsEl.textContent = `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function wireShareModal() {
  const modal = document.getElementById('share-location-modal');
  if (!modal) return;
  const closeBtn = document.getElementById('btn-close-share-modal');
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
  modal.querySelectorAll('.share-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.share;
      if (!pendingShareLocation) { showToast('Still getting location… please wait', 'warning'); return; }
      handleShareOption(type, pendingShareLocation);
    });
  });
}

function handleShareOption(type, { lat, lng }) {
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
  const message = `📍 My current location (SafeHer):\n${mapsLink}\nLat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}\n\n— Sent from SafeHer Safety App`;
  const subject = '📍 My Live Location — SafeHer';
  const encoded = encodeURIComponent(message);
  const encodedSubject = encodeURIComponent(subject);
  const modal = document.getElementById('share-location-modal');

  switch (type) {
    case 'whatsapp':
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
      showToast('Opening WhatsApp…', 'success');
      break;
    case 'telegram':
      window.open(`https://t.me/share/url?url=${encodeURIComponent(mapsLink)}&text=${encodeURIComponent(`📍 My current location (SafeHer)\nLat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`)}`, '_blank');
      showToast('Opening Telegram…', 'success');
      break;
    case 'email':
      window.location.href = `mailto:?subject=${encodedSubject}&body=${encoded}`;
      showToast('Opening Email…', 'success');
      break;
    case 'outlook':
      window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${encodedSubject}&body=${encoded}`, '_blank');
      showToast('Opening Outlook…', 'success');
      break;
    case 'copy':
      if (navigator.clipboard) {
        navigator.clipboard.writeText(`📍 My location: ${mapsLink}\nLat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`)
          .then(() => showToast('📋 Location copied to clipboard!', 'success'))
          .catch(() => showToast('Could not copy — try again', 'error'));
      } else {
        showToast('Clipboard not supported on this browser', 'error');
      }
      break;
  }
  if (modal) modal.classList.add('hidden');
}

/* ═══════════════════════════════════════════════
   MAP UTILITIES
   ═══════════════════════════════════════════════ */
export function refreshMap() {
  if (map) setTimeout(() => map.invalidateSize(), 100);
}

export function isJourneyActive() {
  return journeyActive;
}

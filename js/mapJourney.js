/* ═══════════════════════════════════════════════
   SafeHer — Map & Journey Tracking Module
   Leaflet map, live location, path drawing
   ═══════════════════════════════════════════════ */

import { showToast, updateHeaderStatus, updateStatusCard } from './alerts.js';
import { sendAlertToContacts } from './contacts.js';

/* global L */

let map = null;
let userMarker = null;
let accuracyCircle = null;
let journeyPath = null;
let watchId = null;
let liveWatchId = null;      // always-on location watcher for blue dot
let journeyActive = false;
let journeyStartTime = null;
let journeyCoords = [];
let journeyTimerInterval = null;
let totalDistance = 0;

/* ── Reusable user icon ── */
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

/* ── Initialize Map ───────────────────────────── */
export function initMap() {
  const container = document.getElementById('map-container');
  if (!container || map) return;

  // Default center (will update with user location)
  map = L.map('map-container', {
    center: [20.5937, 78.9629], // India center
    zoom: 15,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  // Force map to recalculate size after render
  setTimeout(() => map.invalidateSize(), 200);
  setTimeout(() => map.invalidateSize(), 500);

  // Start live location tracking (always-on blue dot)
  startLiveLocationDot();

  // Bind journey buttons
  const startBtn = document.getElementById('btn-start-journey');
  const stopBtn = document.getElementById('btn-stop-journey');
  const shareBtn = document.getElementById('btn-share-journey');

  if (startBtn) startBtn.addEventListener('click', startJourney);
  if (stopBtn) stopBtn.addEventListener('click', stopJourney);
  if (shareBtn) shareBtn.addEventListener('click', shareLocation);
}

/* ── Always-on live location blue dot ─────────── */
function startLiveLocationDot() {
  if (liveWatchId != null || !navigator.geolocation) return;

  // Get initial position first for immediate feedback
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      updateUserPosition(lat, lng, accuracy);
      map.setView([lat, lng], 16);
    },
    () => showToast('Could not get location — enable GPS', 'warning'),
    { enableHighAccuracy: true, timeout: 10000 }
  );

  // Then continuously watch position
  liveWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      updateUserPosition(lat, lng, accuracy);
    },
    () => { /* silently retry */ },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
  );
}

/* ── Update the blue dot + accuracy circle ─────── */
function updateUserPosition(lat, lng, accuracy) {
  if (!map) return;
  const latlng = [lat, lng];

  if (userMarker) {
    userMarker.setLatLng(latlng);
  } else {
    userMarker = L.marker(latlng, { icon: createUserIcon(), zIndexOffset: 1000 }).addTo(map);
  }

  // Accuracy circle
  if (accuracyCircle) {
    accuracyCircle.setLatLng(latlng);
    accuracyCircle.setRadius(accuracy || 30);
  } else {
    accuracyCircle = L.circle(latlng, {
      radius: accuracy || 30,
      color: '#0A84FF',
      fillColor: '#0A84FF',
      fillOpacity: 0.08,
      weight: 1,
      opacity: 0.3
    }).addTo(map);
  }
}

/* ── Start Journey Tracking ───────────────────── */
export function startJourney() {
  if (journeyActive) return;

  if (!navigator.geolocation) {
    showToast('No GPS', 'Geolocation is not available.', 'error');
    return;
  }

  journeyActive = true;
  journeyStartTime = Date.now();
  journeyCoords = [];
  totalDistance = 0;

  // UI updates
  const startBtn = document.getElementById('btn-start-journey');
  const stopBtn = document.getElementById('btn-stop-journey');
  const infoText = document.getElementById('journey-info-text');

  if (startBtn) startBtn.classList.add('hidden');
  if (stopBtn) stopBtn.classList.remove('hidden');
  if (infoText) infoText.textContent = 'Journey is being tracked. Stay safe!';

  updateHeaderStatus('journey', 'Journey');
  updateStatusCard('journey', 'Journey Active', 'Your path is being recorded in real-time.');

  // Draw path on map
  if (journeyPath) {
    map.removeLayer(journeyPath);
  }
  journeyPath = L.polyline([], {
    color: '#0A84FF',
    weight: 4,
    opacity: 0.8,
    lineJoin: 'round'
  }).addTo(map);

  // Start watching position
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng, speed, accuracy } = pos.coords;
      const newCoord = [lat, lng];

      // Calculate distance from last point
      if (journeyCoords.length > 0) {
        const lastCoord = journeyCoords[journeyCoords.length - 1];
        totalDistance += haversineDistance(lastCoord[0], lastCoord[1], lat, lng);
      }

      journeyCoords.push(newCoord);
      journeyPath.addLatLng(newCoord);

      // Update blue dot marker
      updateUserPosition(lat, lng, accuracy);

      // Keep map centered on user
      map.panTo(newCoord, { animate: true, duration: 0.5 });

      // Update speed display
      const speedEl = document.getElementById('journey-speed');
      if (speedEl) {
        const kmh = speed != null && speed >= 0 ? Math.round(speed * 3.6) : 0;
        speedEl.textContent = `${kmh} km/h`;
      }

      // Update distance
      const distEl = document.getElementById('journey-distance');
      if (distEl) {
        distEl.textContent = totalDistance >= 1
          ? `${totalDistance.toFixed(1)} km`
          : `${Math.round(totalDistance * 1000)} m`;
      }
    },
    (err) => {
      console.warn('GPS error during journey:', err);
      showToast('Lost GPS signal. Retrying…', 'warning');
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000
    }
  );

  // Duration timer
  journeyTimerInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - journeyStartTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    const durEl = document.getElementById('journey-duration');
    if (durEl) durEl.textContent = `${m}:${s}`;
  }, 1000);

  showToast('Journey Started', 'Your path is being tracked.', 'success');
}

/* ── Stop Journey ─────────────────────────────── */
export function stopJourney() {
  if (!journeyActive) return;
  journeyActive = false;

  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (journeyTimerInterval) {
    clearInterval(journeyTimerInterval);
    journeyTimerInterval = null;
  }

  // UI updates
  const startBtn = document.getElementById('btn-start-journey');
  const stopBtn = document.getElementById('btn-stop-journey');
  const infoText = document.getElementById('journey-info-text');

  if (startBtn) startBtn.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');
  if (infoText) infoText.textContent = 'Track your path in real-time and share with contacts.';

  updateHeaderStatus('safe', 'Safe');
  updateStatusCard('safe', "You're Safe", 'All systems normal. Stay alert, stay safe.');

  showToast('Journey Ended', `Tracked ${journeyCoords.length} points, ${totalDistance.toFixed(1)} km.`, 'info');
}

/* ── Share Location — show modal with options ──── */
let pendingShareLocation = null;
let shareModalWired = false;

export function shareLocation() {
  if (!navigator.geolocation) {
    showToast('Location not available — enable GPS', 'error');
    return;
  }

  // Wire modal buttons once on first call
  if (!shareModalWired) {
    wireShareModal();
    shareModalWired = true;
  }

  const modal = document.getElementById('share-location-modal');
  const coordsEl = document.getElementById('share-modal-coords');
  if (!modal) return;

  // Show modal immediately with loading state
  pendingShareLocation = null;
  if (coordsEl) coordsEl.textContent = 'Getting your location…';
  modal.classList.remove('hidden');

  // Get GPS position
  navigator.geolocation.getCurrentPosition(
    (pos) => setSharePosition(pos),
    () => {
      // Retry with lower accuracy
      navigator.geolocation.getCurrentPosition(
        (pos) => setSharePosition(pos),
        (err) => {
          if (coordsEl) coordsEl.textContent = '⚠️ Could not get location';
          if (err.code === 1) {
            showToast('Location permission denied — allow Location in browser settings', 'error');
          } else if (err.code === 2) {
            showToast('GPS unavailable — turn ON Location in phone settings', 'error');
          } else {
            showToast('Location timed out — go outside and try again', 'error');
          }
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

/* ── Wire share modal buttons ──────────────────── */
function wireShareModal() {
  const modal = document.getElementById('share-location-modal');
  if (!modal) return;

  // Close button
  const closeBtn = document.getElementById('btn-close-share-modal');
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  // Share option buttons
  modal.querySelectorAll('.share-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.share;
      if (!pendingShareLocation) {
        showToast('Still getting location… please wait', 'warning');
        return;
      }
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

/* ── Haversine Distance (km) ──────────────────── */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/* ── Invalidate map size (call when tab becomes visible) */
export function refreshMap() {
  if (map) {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

/* ── Public ───────────────────────────────────── */
export function isJourneyActive() {
  return journeyActive;
}

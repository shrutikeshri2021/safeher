/* ═══════════════════════════════════════════════
   SafeHer — Map & Journey Tracking Module
   Leaflet map, live location, path drawing
   ═══════════════════════════════════════════════ */

import { showToast, updateHeaderStatus, updateStatusCard } from './alerts.js';
import { sendAlertToContacts } from './contacts.js';

/* global L */

let map = null;
let userMarker = null;
let journeyPath = null;
let watchId = null;
let journeyActive = false;
let journeyStartTime = null;
let journeyCoords = [];
let journeyTimerInterval = null;
let totalDistance = 0;

/* ── Initialize Map ───────────────────────────── */
export function initMap() {
  const container = document.getElementById('map-container');
  if (!container || map) return;

  // Default center (will update with user location)
  map = L.map('map-container', {
    center: [20.5937, 78.9629], // India center
    zoom: 13,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  // Custom user location marker
  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `<div style="
      width: 18px; height: 18px; border-radius: 50%;
      background: #0A84FF; border: 3px solid #fff;
      box-shadow: 0 0 12px rgba(10,132,255,0.5);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  // Try to get initial location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.setView([lat, lng], 15);
        userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
      },
      () => {
        showToast('Location', 'Could not get your location. Enable GPS.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Bind journey buttons
  const startBtn = document.getElementById('btn-start-journey');
  const stopBtn = document.getElementById('btn-stop-journey');
  const shareBtn = document.getElementById('btn-share-journey');

  if (startBtn) startBtn.addEventListener('click', startJourney);
  if (stopBtn) stopBtn.addEventListener('click', stopJourney);
  if (shareBtn) shareBtn.addEventListener('click', shareLocation);
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
      const { latitude: lat, longitude: lng, speed } = pos.coords;
      const newCoord = [lat, lng];

      // Calculate distance from last point
      if (journeyCoords.length > 0) {
        const lastCoord = journeyCoords[journeyCoords.length - 1];
        totalDistance += haversineDistance(lastCoord[0], lastCoord[1], lat, lng);
      }

      journeyCoords.push(newCoord);
      journeyPath.addLatLng(newCoord);

      // Update user marker
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div style="
          width: 18px; height: 18px; border-radius: 50%;
          background: #0A84FF; border: 3px solid #fff;
          box-shadow: 0 0 12px rgba(10,132,255,0.5);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      if (userMarker) {
        userMarker.setLatLng(newCoord);
      } else {
        userMarker = L.marker(newCoord, { icon: userIcon }).addTo(map);
      }

      map.panTo(newCoord);

      // Update speed display
      const speedEl = document.getElementById('journey-speed');
      if (speedEl) {
        const kmh = speed != null ? Math.round(speed * 3.6) : 0;
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
      showToast('GPS Error', 'Lost GPS signal. Retrying…', 'warning');
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000
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

/* ── Share Location ───────────────────────────── */
export async function shareLocation() {
  if (!navigator.geolocation) {
    showToast('No GPS', 'Location not available.', 'error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
      const message = `📍 My current location (SafeHer):\n${mapsLink}\nLat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: '📍 My Location — SafeHer', text: message });
          showToast('Shared', 'Location shared successfully.', 'success');
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(message);
        showToast('Copied', 'Location link copied to clipboard.', 'success');
      } catch {
        showToast('Location', mapsLink, 'info');
      }
    },
    () => {
      showToast('GPS Error', 'Could not get location. Enable GPS.', 'error');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
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

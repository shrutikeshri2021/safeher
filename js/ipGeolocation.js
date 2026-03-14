/* ═══════════════════════════════════════════════
   SafeHer — Feature: IP Geolocation Fallback
   Uses ipapi.co free tier — 1000 requests/day, no API key needed
   Fallback chain: GPS → IP Geolocation → Last Known GPS → null
   ═══════════════════════════════════════════════ */

const LAST_GPS_KEY = 'safeher_last_gps';

/**
 * getIPLocation()
 * Fetch approximate location from user's IP address.
 * Free tier: 1,000 requests/day, no signup required.
 */
export async function getIPLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.latitude && data.longitude) {
      console.log('🌐 IP Geolocation succeeded:', data.city, data.region, data.country_name);
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name,
        accuracy: 'approximate (IP-based)',
        source: 'ip'
      };
    }
    return null;
  } catch (error) {
    console.error('🌐 IP geolocation failed:', error);
    return null;
  }
}

/**
 * saveLastGPS(lat, lng)
 * Persist last successful GPS coordinates to localStorage.
 */
export function saveLastGPS(lat, lng) {
  try {
    localStorage.setItem(LAST_GPS_KEY, JSON.stringify({
      lat, lng,
      timestamp: new Date().toISOString()
    }));
  } catch (_) {}
}

/**
 * getLastKnownGPS()
 * Retrieve the last saved GPS location from localStorage.
 */
export function getLastKnownGPS() {
  try {
    const raw = localStorage.getItem(LAST_GPS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.lat && data.lng) {
      return {
        lat: data.lat,
        lng: data.lng,
        accuracy: 'last known GPS location',
        source: 'cached_gps',
        cachedAt: data.timestamp
      };
    }
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * getLocationWithFallback()
 * Full fallback chain: GPS → IP → Last Known → null
 * Returns { lat, lng, source, accuracy?, ... } or null
 */
export async function getLocationWithFallback() {
  // 1. Try GPS first
  if (navigator.geolocation) {
    try {
      const gpsResult = await new Promise((resolve, reject) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            navigator.geolocation.clearWatch(wid);
            reject(new Error('GPS timeout'));
          }
        }, 15000);

        const wid = navigator.geolocation.watchPosition(
          (pos) => {
            if (!done) {
              done = true;
              clearTimeout(timer);
              navigator.geolocation.clearWatch(wid);
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }
          },
          () => { /* keep trying until timeout */ },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
      });

      if (gpsResult) {
        // Save successful GPS fix for future fallback
        saveLastGPS(gpsResult.lat, gpsResult.lng);
        return { ...gpsResult, source: 'gps', accuracy: 'precise (GPS)' };
      }
    } catch (err) {
      console.warn('📍 GPS failed in fallback chain:', err.message);
    }
  }

  // 2. Try IP Geolocation
  console.log('📍 GPS unavailable, trying IP geolocation...');
  const ipResult = await getIPLocation();
  if (ipResult) {
    return ipResult;
  }

  // 3. Try Last Known GPS from localStorage
  console.log('📍 IP geolocation failed, checking last known GPS...');
  const cached = getLastKnownGPS();
  if (cached) {
    console.log('📍 Using last known GPS from', cached.cachedAt);
    return cached;
  }

  // 4. All methods failed
  console.error('📍 ALL location methods failed');
  return null;
}

/**
 * formatLocationSource(location)
 * Returns a warning string to append to alert messages
 * if location is not from live GPS.
 */
export function formatLocationSource(location) {
  if (!location) return '\n⚠️ Location unavailable — all methods failed.';
  if (location.source === 'ip') {
    return `\n⚠️ Approximate location (GPS unavailable — IP-based estimate)\n🏙️ Near: ${location.city || 'Unknown'}, ${location.region || ''}, ${location.country || ''}`;
  }
  if (location.source === 'cached_gps') {
    return `\n⚠️ Last known GPS location (captured at: ${location.cachedAt || 'Unknown time'})`;
  }
  return ''; // GPS source — no warning needed
}

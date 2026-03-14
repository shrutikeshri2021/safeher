/* ═══════════════════════════════════════════════
   SafeHer — Feature: What3Words Location
   Converts GPS coordinates to 3-word addresses
   Free tier: 1,000 API calls/month
   Get your key at: https://developer.what3words.com
   ═══════════════════════════════════════════════ */

const W3W_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual key from developer.what3words.com

const W3W_CACHE_KEY = 'safeher_w3w_cache';

/**
 * getWhat3Words(latitude, longitude)
 * Converts coordinates to a 3-word address.
 * Caches result in sessionStorage to avoid burning API calls on rapid SOS triggers.
 */
export async function getWhat3Words(latitude, longitude) {
  if (W3W_API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn('[W3W] No API key set — skipping What3Words lookup. Get a free key at developer.what3words.com');
    return null;
  }

  // Check sessionStorage cache first (avoid duplicate calls on rapid SOS)
  try {
    const cached = sessionStorage.getItem(W3W_CACHE_KEY);
    if (cached) {
      const cacheData = JSON.parse(cached);
      const cacheAge = Date.now() - cacheData.timestamp;
      // Use cache if < 2 minutes old and location hasn't changed significantly
      if (cacheAge < 120000) {
        const latDiff = Math.abs(cacheData.lat - latitude);
        const lngDiff = Math.abs(cacheData.lng - longitude);
        if (latDiff < 0.001 && lngDiff < 0.001) {
          console.log('[W3W] Using cached result:', cacheData.result.words);
          return cacheData.result;
        }
      }
    }
  } catch (_) {}

  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&language=en&format=json&key=${W3W_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      console.error('[W3W] API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.words) {
      const result = {
        words: data.words,            // e.g. "filled.count.soap"
        link: data.map,               // clickable map link
        nearestPlace: data.nearestPlace
      };

      // Cache the result in sessionStorage
      try {
        sessionStorage.setItem(W3W_CACHE_KEY, JSON.stringify({
          lat: latitude,
          lng: longitude,
          result,
          timestamp: Date.now()
        }));
      } catch (_) {}

      console.log('[W3W] ✅ Got 3-word address:', result.words);
      return result;
    }
    return null;
  } catch (error) {
    console.error('[W3W] What3Words lookup failed:', error);
    return null;
  }
}

/**
 * formatW3WForAlert(w3wResult)
 * Formats What3Words result for inclusion in SOS alert emails.
 */
export function formatW3WForAlert(w3wResult) {
  if (!w3wResult) return '';
  return `\n📍 What3Words Address: ///${w3wResult.words}\n🔗 Open on map: ${w3wResult.link}\n(Show this 3-word address to police or emergency services)`;
}

/**
 * formatW3WForSMS(w3wResult)
 * Compact format for SMS (keeps within 160 char limit).
 * Returns just the 3 words for SMS append.
 */
export function formatW3WForSMS(w3wResult) {
  if (!w3wResult) return '';
  return `\nW3W: ///${w3wResult.words}`;
}

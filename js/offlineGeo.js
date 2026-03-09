/* ═══════════════════════════════════════════════
   SafeHer — Offline Geocoding Cache  (Feature 5)
   Caches reverse geocoding results in IndexedDB
   so that location-to-address lookups work offline.

   Strategy:
   1. Check IndexedDB cache first (keyed by rounded lat/lng)
   2. If cache miss + online → fetch from Nominatim → cache result
   3. If cache miss + offline → return "No address (offline)"
   4. Cache entries expire after 30 days

   Uses the shared SafeHerDB with a new 'geocache' store.
   ═══════════════════════════════════════════════ */

import { openDB } from './db.js';

/* ──── Constants ──── */
const STORE_NAME   = 'geocache';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days
const PRECISION    = 4;          // decimal places for cache key (≈11m accuracy)

/* ══════════════════════════════════════════
   reverseGeocode(lat, lng)
   Main entry point — returns address string.
   Checks cache first, fetches + caches on miss.
   ══════════════════════════════════════════ */
export async function reverseGeocode(lat, lng) {
  try {
    if (lat == null || lng == null) {
      console.warn('[OfflineGeo] reverseGeocode called with null coords');
      return null;
    }

    const key = makeKey(lat, lng);
    console.log(`[OfflineGeo] reverseGeocode(${lat.toFixed(6)}, ${lng.toFixed(6)}) — key: ${key}`);

    /* ── 1. Check cache ── */
    const cached = await getFromCache(key);
    if (cached) {
      console.log(`[OfflineGeo] ✅ Cache hit: "${cached.address}"`);
      return cached.address;
    }

    /* ── 2. Online → fetch from Nominatim ── */
    if (navigator.onLine) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!resp.ok) {
          console.warn('[OfflineGeo] Nominatim returned:', resp.status);
          return null;
        }

        const data = await resp.json();
        let address = data.display_name || null;

        // Build short address from parts
        if (data.address) {
          const a = data.address;
          const parts = [a.road, a.neighbourhood, a.suburb, a.city || a.town || a.village, a.state, a.postcode].filter(Boolean);
          if (parts.length > 0) address = parts.join(', ');
        }

        if (address) {
          await saveToCache(key, lat, lng, address);
          console.log(`[OfflineGeo] ✅ Fetched + cached: "${address}"`);
        }

        return address;
      } catch (err) {
        console.warn('[OfflineGeo] Nominatim fetch failed:', err.message);
        return null;
      }
    }

    /* ── 3. Offline + cache miss ── */
    console.log('[OfflineGeo] Offline + cache miss — returning null');
    return null;
  } catch (err) {
    console.error('[OfflineGeo] reverseGeocode error:', err);
    return null;
  }
}

/* ══════════════════════════════════════════
   Cache helpers
   ══════════════════════════════════════════ */
function makeKey(lat, lng) {
  return `${lat.toFixed(PRECISION)},${lng.toFixed(PRECISION)}`;
}

async function getFromCache(key) {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          // Check TTL
          if (Date.now() - result.timestamp > CACHE_TTL_MS) {
            console.log('[OfflineGeo] Cache expired for:', key);
            resolve(null);
          } else {
            resolve(result);
          }
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[OfflineGeo] getFromCache error:', err);
    return null;
  }
}

async function saveToCache(key, lat, lng, address) {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({
        key,
        lat,
        lng,
        address,
        timestamp: Date.now()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineGeo] saveToCache error:', err);
  }
}

/* ══════════════════════════════════════════
   preloadArea(lat, lng, radiusKm)
   Pre-cache addresses in a grid around a point
   (useful when starting a journey)
   ══════════════════════════════════════════ */
export async function preloadArea(lat, lng, radiusKm = 2) {
  try {
    if (!navigator.onLine) {
      console.log('[OfflineGeo] Cannot preload — offline');
      return;
    }

    console.log(`[OfflineGeo] Preloading area around ${lat.toFixed(4)}, ${lng.toFixed(4)} (${radiusKm}km)`);

    // Grid step ≈ 100m
    const step = 0.001;
    const range = radiusKm * 0.009;  // ~1km ≈ 0.009 degrees
    let count = 0;

    for (let dlat = -range; dlat <= range; dlat += step * 5) {
      for (let dlng = -range; dlng <= range; dlng += step * 5) {
        const pLat = lat + dlat;
        const pLng = lng + dlng;
        const key = makeKey(pLat, pLng);

        // Skip if already cached
        const cached = await getFromCache(key);
        if (cached) continue;

        // Rate-limit: 1 req per second (Nominatim policy)
        await new Promise(r => setTimeout(r, 1100));
        await reverseGeocode(pLat, pLng);
        count++;

        // Cap at 20 preloads to avoid hammering the API
        if (count >= 20) {
          console.log('[OfflineGeo] Preload cap reached (20)');
          return;
        }
      }
    }

    console.log(`[OfflineGeo] ✅ Preloaded ${count} geocache entries`);
  } catch (err) {
    console.error('[OfflineGeo] preloadArea error:', err);
  }
}

/* ══════════════════════════════════════════
   clearExpiredCache()  — housekeeping
   ══════════════════════════════════════════ */
export async function clearExpiredCache() {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    let cleared = 0;

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (Date.now() - cursor.value.timestamp > CACHE_TTL_MS) {
          store.delete(cursor.value.key);
          cleared++;
        }
        cursor.continue();
      } else {
        if (cleared > 0) console.log(`[OfflineGeo] Cleared ${cleared} expired cache entries`);
      }
    };
  } catch (err) {
    console.error('[OfflineGeo] clearExpiredCache error:', err);
  }
}

/* ══════════════════════════════════════════
   getCacheStats()  — for debugging
   ══════════════════════════════════════════ */
export async function getCacheStats() {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve({ entries: req.result });
      req.onerror = () => resolve({ entries: 0 });
    });
  } catch (err) {
    return { entries: 0 };
  }
}

/* ══════════════════════════════════════════
   init()  — clean up expired entries on load
   ══════════════════════════════════════════ */
export function init() {
  try {
    // Clean up expired cache entries
    clearExpiredCache();
    console.log('[OfflineGeo] ✅ Module initialized');
  } catch (err) {
    console.error('[OfflineGeo] init() error:', err);
  }
}

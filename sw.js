/* ───────────────────────────────────────────────
   SafeHer – Service Worker (Cache-first + offline)
   ─────────────────────────────────────────────── */
const CACHE_NAME = 'safeher-v66';
const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/alerts.js',
  '/js/contacts.js',
  '/js/recorder.js',
  '/js/sosButton.js',
  '/js/safeMode.js',
  '/js/motionDetect.js',
  '/js/voiceDetect.js',
  '/js/mapJourney.js',
  '/js/db.js',
  '/js/historyLogger.js',
  '/js/history.js',
  '/js/batteryWatch.js',
  '/js/wakeLock.js',
  '/js/ambientLight.js',
  '/js/ntfyPush.js',
  '/js/backgroundSync.js',
  '/js/offlineGeo.js',
  '/js/activityInsights.js',
  '/js/d3Visualizations.js',
  '/js/emergencyInfo.js',
  '/js/geofence.js',
  '/js/emergencyCall.js',
  '/js/smsAlert.js',
  '/js/liveStream.js',
  '/js/communityMap.js',
  '/js/safeRoute.js',
  '/js/i18n.js',
  '/js/ipGeolocation.js',
  '/js/what3words.js',
  '/js/aiTranscription.js',
  '/js/liveTranscript.js',
  '/js/featureIntegration.js',
  '/js/orientationLock.js',
  '/js/networkRouter.js',
  '/js/contactPicker.js',
  '/js/lingvaTranslate.js',
  '/watch.html',
  '/css/features.css',
  '/assets/i18n/en.json',
  '/assets/i18n/hi.json',
  '/assets/i18n/te.json',
  '/manifest.json',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg'
];
const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js',
  'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
];

/* ── Install ─────────────────────────────────── */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(LOCAL_ASSETS);
      for (const url of CDN_ASSETS) {
        try { await cache.add(url); } catch (_) { /* CDN may fail offline */ }
      }
    })
  );
  self.skipWaiting();
});

/* ── Activate ────────────────────────────────── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch — cache-first, network fallback ──── */
self.addEventListener('fetch', (e) => {
  /* ── Navigation / HTML → NETWORK-FIRST (always get fresh HTML) ── */
  if (e.request.mode === 'navigate' || e.request.url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  /* ── All other assets → CACHE-FIRST ── */
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' }))
  );
});

/* ── Background Sync (Feature 4) ─────────── */
self.addEventListener('sync', (e) => {
  if (e.tag === 'safeher-sync-alerts') {
    console.log('[SW] Background sync triggered: safeher-sync-alerts');
    e.waitUntil(processAlertQueue());
  }
});

async function processAlertQueue() {
  try {
    // We can't access localStorage from SW, so we notify the client
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'PROCESS_SYNC_QUEUE' });
    }
    console.log('[SW] Notified clients to process sync queue');
  } catch (err) {
    console.error('[SW] processAlertQueue error:', err);
  }
}

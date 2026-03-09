/* ═══════════════════════════════════════════════
   SafeHer — Background Sync Module  (Feature 4)
   Queues failed alerts/notifications when offline,
   retries them when connectivity is restored via
   the Background Sync API.

   Queue is stored in localStorage for persistence.
   SW handles the 'sync' event to process the queue.
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';

/* ──── Constants ──── */
const SYNC_QUEUE_KEY = 'safeher_sync_queue';
const SYNC_TAG_ALERTS = 'safeher-sync-alerts';

/* ══════════════════════════════════════════
   init()  — register sync + listen for online
   ══════════════════════════════════════════ */
export function init() {
  try {
    /* ── When coming back online, try to flush queue ── */
    window.addEventListener('online', () => {
      try {
        console.log('[BackgroundSync] Online detected — requesting sync');
        requestSync();
        processQueue();   // also process directly as fallback
      } catch (err) {
        console.error('[BackgroundSync] online handler error:', err);
      }
    });

    /* ── Show offline toast ── */
    window.addEventListener('offline', () => {
      try {
        console.log('[BackgroundSync] Device went offline — alerts will be queued');
        showToast('📴 Offline — alerts will be sent when connected', 'warning');
      } catch (_) {}
    });

    /* ── Process any pending items on startup ── */
    if (navigator.onLine) {
      setTimeout(() => processQueue(), 3000);
    }

    console.log('[BackgroundSync] ✅ Module initialized');
    console.log('[BackgroundSync] Background Sync API available:', 'serviceWorker' in navigator && 'SyncManager' in window);
  } catch (err) {
    console.error('[BackgroundSync] init() error:', err);
  }
}

/* ══════════════════════════════════════════
   queueAlert(alertData)
   Add a failed alert to the sync queue.
   alertData: { type, title, body, url, method,
                headers, timestamp }
   ══════════════════════════════════════════ */
export function queueAlert(alertData) {
  try {
    const queue = getQueue();
    alertData.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    alertData.timestamp = alertData.timestamp || Date.now();
    alertData.retries = 0;
    queue.push(alertData);
    saveQueue(queue);

    console.log(`[BackgroundSync] Alert queued: ${alertData.type} — queue size: ${queue.length}`);

    // Request background sync
    requestSync();

    return alertData.id;
  } catch (err) {
    console.error('[BackgroundSync] queueAlert error:', err);
    return null;
  }
}

/* ══════════════════════════════════════════
   requestSync()  — ask SW to sync
   ══════════════════════════════════════════ */
async function requestSync() {
  try {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register(SYNC_TAG_ALERTS);
      console.log('[BackgroundSync] ✅ Sync registered:', SYNC_TAG_ALERTS);
    } else {
      console.log('[BackgroundSync] SyncManager not available — using online event fallback');
    }
  } catch (err) {
    console.warn('[BackgroundSync] Sync registration failed:', err.message);
  }
}

/* ══════════════════════════════════════════
   processQueue()  — flush queued alerts
   Called by SW sync event or online event
   ══════════════════════════════════════════ */
export async function processQueue() {
  try {
    const queue = getQueue();
    if (queue.length === 0) {
      console.log('[BackgroundSync] Queue is empty — nothing to process');
      return;
    }

    console.log(`[BackgroundSync] Processing queue: ${queue.length} items`);

    const failedItems = [];

    for (const item of queue) {
      try {
        let success = false;

        if (item.type === 'ntfy_push') {
          // Retry ntfy push
          const response = await fetch(item.url, {
            method: item.method || 'POST',
            headers: item.headers || {},
            body: item.body
          });
          success = response.ok;
        } else if (item.type === 'email_alert') {
          // Retry EmailJS send
          if (window.emailjs && item.emailParams) {
            await emailjs.send(item.serviceId, item.templateId, item.emailParams);
            success = true;
          }
        } else if (item.type === 'generic_fetch') {
          // Generic fetch retry
          const response = await fetch(item.url, {
            method: item.method || 'POST',
            headers: item.headers || {},
            body: item.body
          });
          success = response.ok;
        }

        if (success) {
          console.log(`[BackgroundSync] ✅ Sent queued item: ${item.type} (${item.id})`);
        } else {
          item.retries = (item.retries || 0) + 1;
          if (item.retries < 5) {
            failedItems.push(item);
            console.warn(`[BackgroundSync] Retry ${item.retries}/5 for: ${item.type} (${item.id})`);
          } else {
            console.error(`[BackgroundSync] ❌ Gave up after 5 retries: ${item.type} (${item.id})`);
          }
        }
      } catch (err) {
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 5) {
          failedItems.push(item);
        }
        console.warn(`[BackgroundSync] Item failed:`, err.message);
      }
    }

    saveQueue(failedItems);

    const processed = queue.length - failedItems.length;
    if (processed > 0) {
      console.log(`[BackgroundSync] ✅ Processed ${processed}/${queue.length} queued alerts`);
      showToast(`📤 ${processed} queued alert(s) sent`, 'success');
    }
  } catch (err) {
    console.error('[BackgroundSync] processQueue error:', err);
  }
}

/* ══════════════════════════════════════════
   Queue storage helpers
   ══════════════════════════════════════════ */
function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (_) {}
}

export function getQueueSize() {
  return getQueue().length;
}

export function clearQueue() {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    console.log('[BackgroundSync] Queue cleared');
  } catch (_) {}
}

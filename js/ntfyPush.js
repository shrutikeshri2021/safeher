/* ═══════════════════════════════════════════════
   SafeHer — NTFY.SH Push Notifications  (Feature 3)
   Sends real-time push notifications to contacts
   via ntfy.sh (free, no auth, no app required).

   Each SafeHer user gets a unique topic:
     safeher-<random8chars>

   Contacts can subscribe via:
     https://ntfy.sh/safeher-<topic>

   This module:
   ● Generates / persists a unique topic ID
   ● Sends push to ntfy.sh on SOS/alert/journey events
   ● Subscribes to own topic for incoming safety updates
   ● Provides QR code for contact subscription
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';
import { logEvent } from './historyLogger.js';

/* ──── Constants ──── */
const NTFY_BASE_URL   = 'https://ntfy.sh';
const TOPIC_STORAGE_KEY = 'safeher_ntfy_topic';
const NTFY_ENABLED_KEY  = 'safeher_ntfy_enabled';

/* ──── Module state ──── */
let topicId    = null;
let isEnabled  = false;
let eventSource = null;    // SSE connection for incoming messages

/* ══════════════════════════════════════════
   init()  — set up ntfy topic + subscribe
   ══════════════════════════════════════════ */
export function init() {
  try {
    /* ── Generate or load topic ── */
    topicId = localStorage.getItem(TOPIC_STORAGE_KEY);
    if (!topicId) {
      topicId = 'safeher-' + generateId(8);
      localStorage.setItem(TOPIC_STORAGE_KEY, topicId);
      console.log('[NTFY] Generated new topic:', topicId);
    } else {
      console.log('[NTFY] Loaded existing topic:', topicId);
    }

    /* ── Check if enabled ── */
    isEnabled = localStorage.getItem(NTFY_ENABLED_KEY) === 'true';

    /* ── Subscribe to own topic for incoming messages ── */
    if (isEnabled) {
      subscribeToTopic();
    }

    console.log('[NTFY] ✅ Module initialized — topic:', topicId, 'enabled:', isEnabled);
  } catch (err) {
    console.error('[NTFY] init() error:', err);
  }
}

/* ══════════════════════════════════════════
   sendPush(title, body, priority, tags)
   Posts a notification to the ntfy topic.
   priority: 1-5 (1=min, 5=urgent)
   tags: array of emoji/tag strings
   ══════════════════════════════════════════ */
export async function sendPush(title, body, priority = 4, tags = ['warning']) {
  try {
    if (!topicId) {
      console.warn('[NTFY] No topic ID — call init() first');
      return false;
    }

    console.log(`[NTFY] Sending push: "${title}" (priority ${priority})`);

    const response = await fetch(`${NTFY_BASE_URL}/${topicId}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': String(priority),
        'Tags': tags.join(',')
      },
      body: body
    });

    if (response.ok) {
      console.log('[NTFY] ✅ Push sent successfully');
      return true;
    } else {
      console.warn('[NTFY] Push failed:', response.status, response.statusText);
      return false;
    }
  } catch (err) {
    console.error('[NTFY] sendPush error:', err);
    // Queue for background sync if offline
    try {
      queuePushForSync({ title, body, priority, tags, timestamp: Date.now() });
    } catch (_) {}
    return false;
  }
}

/* ══════════════════════════════════════════
   sendSOSNotification(location)
   Sends urgent SOS notification
   ══════════════════════════════════════════ */
export async function sendSOSNotification(location) {
  try {
    const userName = localStorage.getItem('safeher_username') || 'SafeHer User';
    const lat = location?.lat?.toFixed(6) || 'Unknown';
    const lng = location?.lng?.toFixed(6) || 'Unknown';
    const mapsLink = location
      ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
      : '';
    const timeNow = new Date().toLocaleString();

    const body = `🚨 EMERGENCY SOS from ${userName}!\n\n` +
      `📍 Location: ${lat}, ${lng}\n` +
      (mapsLink ? `🗺️ Maps: ${mapsLink}\n` : '') +
      `⏰ Time: ${timeNow}\n\n` +
      `This person needs immediate help!`;

    await sendPush(
      `🚨 SOS ALERT from ${userName}`,
      body,
      5,   // max priority
      ['rotating_light', 'sos', 'warning']
    );

    console.log('[NTFY] ✅ SOS notification sent');
  } catch (err) {
    console.error('[NTFY] sendSOSNotification error:', err);
  }
}

/* ══════════════════════════════════════════
   sendJourneyUpdate(type, data)
   Sends journey start/end/deviation updates
   ══════════════════════════════════════════ */
export async function sendJourneyUpdate(type, data = {}) {
  try {
    const userName = localStorage.getItem('safeher_username') || 'SafeHer User';
    let title, body, priority, tags;

    switch (type) {
      case 'started':
        title = `🗺️ ${userName} started a journey`;
        body = `${userName} has started tracking their route.\nStay connected for updates.`;
        priority = 3;
        tags = ['world_map'];
        break;
      case 'completed':
        title = `✅ ${userName} arrived safely!`;
        body = `Journey completed.\n` +
          (data.distance ? `Distance: ${data.distance}\n` : '') +
          (data.duration ? `Duration: ${data.duration}\n` : '');
        priority = 2;
        tags = ['white_check_mark'];
        break;
      case 'deviation':
        title = `⚠️ ${userName} deviated from route!`;
        body = `${userName} has gone off their planned path.\n` +
          (data.distance ? `${data.distance} away from route.\n` : '') +
          `Check on them!`;
        priority = 4;
        tags = ['warning'];
        break;
      case 'checkin_missed':
        title = `⚠️ ${userName} missed a check-in!`;
        body = `${userName} did not check in on time.\nPlease verify they are safe.`;
        priority = 5;
        tags = ['warning', 'rotating_light'];
        break;
      default:
        title = `SafeHer Update for ${userName}`;
        body = data.message || 'Safety update from SafeHer.';
        priority = 3;
        tags = ['information_source'];
    }

    await sendPush(title, body, priority, tags);
    console.log(`[NTFY] ✅ Journey update sent: ${type}`);
  } catch (err) {
    console.error('[NTFY] sendJourneyUpdate error:', err);
  }
}

/* ══════════════════════════════════════════
   sendDarknessAlert()
   Sends darkness detection notification
   ══════════════════════════════════════════ */
export async function sendDarknessAlert(lux) {
  try {
    const userName = localStorage.getItem('safeher_username') || 'SafeHer User';
    await sendPush(
      `🌑 ${userName} is in a dark area`,
      `Ambient light: ${Math.round(lux || 0)} lux.\n${userName} may be in an unsafe, dark environment.`,
      4,
      ['new_moon', 'warning']
    );
    console.log('[NTFY] ✅ Darkness alert sent');
  } catch (err) {
    console.error('[NTFY] sendDarknessAlert error:', err);
  }
}

/* ══════════════════════════════════════════
   sendBatteryAlert(level)
   Sends low battery notification
   ══════════════════════════════════════════ */
export async function sendBatteryAlert(level) {
  try {
    const userName = localStorage.getItem('safeher_username') || 'SafeHer User';
    await sendPush(
      `🪫 ${userName}'s phone battery is critical!`,
      `Battery at ${level}%. Phone may shut down soon.\nLast known location was shared.`,
      5,
      ['battery', 'warning']
    );
    console.log('[NTFY] ✅ Battery alert sent');
  } catch (err) {
    console.error('[NTFY] sendBatteryAlert error:', err);
  }
}

/* ══════════════════════════════════════════
   subscribeToTopic()  — listen for incoming
   messages on own topic via SSE
   ══════════════════════════════════════════ */
function subscribeToTopic() {
  try {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    const url = `${NTFY_BASE_URL}/${topicId}/sse`;
    eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        console.log('[NTFY] Incoming message:', msg);

        // Show as toast if it's a real message (not keepalive)
        if (msg.event === 'message' && msg.message) {
          showToast(msg.title || 'SafeHer Alert', msg.message, 'warning');
        }
      } catch (err) {
        console.warn('[NTFY] Could not parse incoming message:', err);
      }
    };

    eventSource.onerror = (e) => {
      console.warn('[NTFY] SSE connection error — will auto-reconnect');
    };

    console.log('[NTFY] ✅ Subscribed to topic via SSE:', topicId);
  } catch (err) {
    console.error('[NTFY] subscribeToTopic error:', err);
  }
}

/* ══════════════════════════════════════════
   Offline queue — store pushes for sync
   ══════════════════════════════════════════ */
function queuePushForSync(pushData) {
  try {
    const queue = JSON.parse(localStorage.getItem('safeher_ntfy_queue') || '[]');
    queue.push(pushData);
    localStorage.setItem('safeher_ntfy_queue', JSON.stringify(queue));
    console.log('[NTFY] Push queued for background sync, queue size:', queue.length);
  } catch (err) {
    console.error('[NTFY] queuePushForSync error:', err);
  }
}

export function getPendingQueue() {
  try {
    return JSON.parse(localStorage.getItem('safeher_ntfy_queue') || '[]');
  } catch (_) {
    return [];
  }
}

export function clearQueue() {
  try {
    localStorage.removeItem('safeher_ntfy_queue');
    console.log('[NTFY] Queue cleared');
  } catch (_) {}
}

/* ══════════════════════════════════════════
   Utility: getTopicId, getSubscribeURL, enable/disable
   ══════════════════════════════════════════ */
export function getTopicId() {
  return topicId;
}

export function getSubscribeURL() {
  return topicId ? `${NTFY_BASE_URL}/${topicId}` : null;
}

export function enable() {
  try {
    isEnabled = true;
    localStorage.setItem(NTFY_ENABLED_KEY, 'true');
    subscribeToTopic();
    console.log('[NTFY] ✅ Enabled');
  } catch (err) {
    console.error('[NTFY] enable error:', err);
  }
}

export function disable() {
  try {
    isEnabled = false;
    localStorage.setItem(NTFY_ENABLED_KEY, 'false');
    if (eventSource) { eventSource.close(); eventSource = null; }
    console.log('[NTFY] Disabled');
  } catch (err) {
    console.error('[NTFY] disable error:', err);
  }
}

export function isNtfyEnabled() {
  return isEnabled;
}

/* ── ID generator ── */
function generateId(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < len; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

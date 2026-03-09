/* ═══════════════════════════════════════════════
   SafeHer — Alerts Module
   Toast, overlays, alarm/siren, ringtone, helpers
   ═══════════════════════════════════════════════ */

import { getContacts } from './contacts.js';

let audioCtx = null;
let alarmOscillator = null;
let alarmGain = null;
let sirenInterval = null;

/* ═══════════════ TOAST SYSTEM ═══════════════ */
let currentToast = null;
let toastTimeout = null;

/**
 * showToast(message, type)
 * Slide-up notification — only one visible at a time.
 * type: 'success' (green) | 'warning' (amber) | 'danger'/'error' (red) | 'info' (blue)
 * Auto-dismisses after 3 seconds.
 * Also accepts legacy (title, message, type) signature.
 */
export function showToast(titleOrMsg, messageOrType, typeArg) {
  let title, message, type;

  // Support both: (msg, type) and (title, msg, type)

  if (typeArg !== undefined) {
    title = titleOrMsg;
    message = messageOrType;
    type = typeArg;
  } else if (['success', 'warning', 'danger', 'error', 'info'].includes(messageOrType)) {
    title = '';
    message = titleOrMsg;
    type = messageOrType;
  } else {
    title = titleOrMsg;
    message = messageOrType || '';
    type = 'info';
  }

  if (type === 'danger') type = 'error';

  const container = document.getElementById('toast-container');
  if (!container) return;

  // Only one toast at a time
  if (currentToast) { currentToast.remove(); currentToast = null; }
  if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null; }

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-body">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  currentToast = toast;

  toastTimeout = setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => { toast.remove(); if (currentToast === toast) currentToast = null; }, 300);
  }, 3000);
}

/* ═══════════════ BROWSER NOTIFICATION ═══════════════ */
export async function sendBrowserNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body, icon: 'assets/icons/icon-192.svg', badge: 'assets/icons/icon-192.svg',
        vibrate: [200, 100, 200], tag: 'safeher-alert', renotify: true
      });
    } catch (_) {}
  }
}

/* ═══════════════ ALERT OVERLAY ═══════════════ */
export function showAlertOverlay(message) {
  const overlay = document.getElementById('alert-overlay');
  const msg = document.getElementById('alert-overlay-msg');
  if (msg && message) msg.textContent = message;
  if (overlay) overlay.classList.remove('hidden');
  updateHeaderStatus('alert', '🚨 ALERT');
}

export function hideAlertOverlay() {
  const overlay = document.getElementById('alert-overlay');
  if (overlay) overlay.classList.add('hidden');
  stopAlarm();
  updateHeaderStatus('safe', 'Safe');
}

/* ═══════════════ COUNTDOWN OVERLAY ═══════════════ */
let countdownTimer = null;

export function showCountdown(onComplete, onCancel) {
  const overlay = document.getElementById('countdown-overlay');
  const numberEl = document.getElementById('countdown-number');
  const circleEl = document.getElementById('countdown-circle');
  const cancelBtn = document.getElementById('btn-cancel-countdown');
  if (!overlay || !numberEl || !circleEl) return;

  overlay.classList.remove('hidden');
  let count = 5;
  numberEl.textContent = count;
  const totalDash = 439.82;
  circleEl.style.transition = 'none';
  circleEl.style.strokeDashoffset = '0';

  if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 300]);

  countdownTimer = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(countdownTimer);
      overlay.classList.add('hidden');
      if (onComplete) onComplete();
      return;
    }
    numberEl.textContent = count;
    circleEl.style.transition = 'stroke-dashoffset 1s linear';
    circleEl.style.strokeDashoffset = (totalDash * (1 - count / 5)).toString();
  }, 1000);

  const handleCancel = () => {
    clearInterval(countdownTimer);
    overlay.classList.add('hidden');
    if (navigator.vibrate) navigator.vibrate(0);
    cancelBtn.removeEventListener('click', handleCancel);
    if (onCancel) onCancel();
  };
  cancelBtn.addEventListener('click', handleCancel);
}

export function hideCountdown() {
  clearInterval(countdownTimer);
  const overlay = document.getElementById('countdown-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (navigator.vibrate) navigator.vibrate(0);
}

/* ═══════════════ FAKE CALL ═══════════════ */
let ringtoneInterval = null;
let fakeCallTimerInterval = null;

export function showFakeCall() {
  const overlay = document.getElementById('fake-call-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  // Set name from first contact or default
  const contacts = getContacts();
  const nameEl = document.getElementById('fake-call-name');
  const numEl = document.getElementById('fake-call-number');
  if (contacts.length > 0) {
    if (nameEl) nameEl.textContent = contacts[0].name + ' ❤️';
    if (numEl) numEl.textContent = contacts[0].phone;
  } else {
    if (nameEl) nameEl.textContent = 'Mom ❤️';
    if (numEl) numEl.textContent = 'Mobile';
  }

  // Reset to ringing state
  const labelEl = document.querySelector('.fake-call-label');
  if (labelEl) labelEl.textContent = 'Incoming Call';
  const oldTimer = document.getElementById('fake-call-timer');
  if (oldTimer) oldTimer.remove();
  const oldEnd = document.getElementById('btn-end-call');
  if (oldEnd) oldEnd.remove();

  const acceptBtn = document.getElementById('btn-accept-call');
  const declineBtn = document.getElementById('btn-decline-call');
  if (acceptBtn) acceptBtn.classList.remove('hidden');
  if (declineBtn) declineBtn.classList.remove('hidden');

  playRingtone();
  if (navigator.vibrate) {
    ringtoneInterval = setInterval(() => { navigator.vibrate([800, 400, 800, 400]); }, 2400);
  }
}

export function acceptFakeCall() {
  stopRingtone();
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
  if (navigator.vibrate) navigator.vibrate(0);

  const labelEl = document.querySelector('.fake-call-label');
  if (labelEl) labelEl.textContent = 'In Call';

  const acceptBtn = document.getElementById('btn-accept-call');
  const declineBtn = document.getElementById('btn-decline-call');
  if (acceptBtn) acceptBtn.classList.add('hidden');
  if (declineBtn) declineBtn.classList.add('hidden');

  // Add call timer display
  const infoEl = document.querySelector('.fake-call-info');
  if (infoEl) {
    const timerEl = document.createElement('span');
    timerEl.id = 'fake-call-timer';
    timerEl.style.cssText = 'color:#fff;font-size:1.3rem;font-weight:600;font-variant-numeric:tabular-nums;margin-top:8px;display:block;';
    timerEl.textContent = '00:00';
    infoEl.appendChild(timerEl);

    const startTime = Date.now();
    fakeCallTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  // Add "End Call" button
  const actionsEl = document.querySelector('.fake-call-actions');
  if (actionsEl) {
    const endBtn = document.createElement('button');
    endBtn.id = 'btn-end-call';
    endBtn.className = 'call-action-btn call-action-btn--decline';
    endBtn.setAttribute('aria-label', 'End Call');
    endBtn.style.transform = 'rotate(135deg)';
    endBtn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
    actionsEl.appendChild(endBtn);
    endBtn.addEventListener('click', () => hideFakeCall());
  }
}

export function hideFakeCall() {
  const overlay = document.getElementById('fake-call-overlay');
  if (overlay) overlay.classList.add('hidden');
  stopRingtone();
  if (ringtoneInterval) { clearInterval(ringtoneInterval); ringtoneInterval = null; }
  if (fakeCallTimerInterval) { clearInterval(fakeCallTimerInterval); fakeCallTimerInterval = null; }
  if (navigator.vibrate) navigator.vibrate(0);
}

/* ═══════════════ AUDIO: SIREN (Web Audio API) ═══════════════ */
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** playSiren — oscillator sweeping 440→880 Hz, no external file */
export function playSiren() {
  try {
    stopAlarm(); // clean up any existing
    const ctx = getAudioCtx();
    alarmGain = ctx.createGain();
    alarmGain.gain.value = 0.5;
    alarmGain.connect(ctx.destination);

    alarmOscillator = ctx.createOscillator();
    alarmOscillator.type = 'sawtooth';
    alarmOscillator.frequency.setValueAtTime(440, ctx.currentTime);
    alarmOscillator.connect(alarmGain);
    alarmOscillator.start();

    let ascending = true;
    sirenInterval = setInterval(() => {
      const now = ctx.currentTime;
      if (ascending) alarmOscillator.frequency.linearRampToValueAtTime(880, now + 0.5);
      else alarmOscillator.frequency.linearRampToValueAtTime(440, now + 0.5);
      ascending = !ascending;
    }, 500);
  } catch (_) {}
}

/** stopSiren — stop oscillator, disconnect, suspend context */
export function stopSiren() { stopAlarm(); }

export function playAlarm() { playSiren(); }

export function stopAlarm() {
  if (sirenInterval) { clearInterval(sirenInterval); sirenInterval = null; }
  if (alarmOscillator) {
    try { alarmOscillator.stop(); alarmOscillator.disconnect(); } catch (_) {}
    alarmOscillator = null;
  }
  if (alarmGain) {
    try { alarmGain.disconnect(); } catch (_) {}
    alarmGain = null;
  }
  if (audioCtx && audioCtx.state === 'running') {
    try { audioCtx.suspend(); } catch (_) {}
  }
}

/* ═══════════════ AUDIO: RINGTONE ═══════════════ */
let ringtoneOsc = null;
let ringtoneGainNode = null;
let ringtoneTimer = null;
let ringtoneLoopInterval = null;

function playRingtone() {
  try {
    const ctx = getAudioCtx();
    ringtoneGainNode = ctx.createGain();
    ringtoneGainNode.gain.value = 0.3;
    ringtoneGainNode.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99, 659.25];
    const playBurst = () => {
      let idx = 0;
      const playNote = () => {
        if (!ringtoneGainNode) return;
        if (ringtoneOsc) { try { ringtoneOsc.stop(); ringtoneOsc.disconnect(); } catch (_) {} }
        ringtoneOsc = ctx.createOscillator();
        ringtoneOsc.type = 'sine';
        ringtoneOsc.frequency.value = notes[idx % notes.length];
        ringtoneOsc.connect(ringtoneGainNode);
        ringtoneOsc.start();
        ringtoneOsc.stop(ctx.currentTime + 0.15);
        idx++;
        if (idx >= 4 && ringtoneTimer) { clearInterval(ringtoneTimer); ringtoneTimer = null; }
      };
      ringtoneTimer = setInterval(playNote, 200);
      playNote();
    };
    playBurst();
    ringtoneLoopInterval = setInterval(playBurst, 1800);
  } catch (_) {}
}

function stopRingtone() {
  if (ringtoneTimer) { clearInterval(ringtoneTimer); ringtoneTimer = null; }
  if (ringtoneLoopInterval) { clearInterval(ringtoneLoopInterval); ringtoneLoopInterval = null; }
  if (ringtoneOsc) { try { ringtoneOsc.stop(); ringtoneOsc.disconnect(); } catch (_) {} ringtoneOsc = null; }
  if (ringtoneGainNode) { try { ringtoneGainNode.disconnect(); } catch (_) {} ringtoneGainNode = null; }
}

/* ═══════════════ HEADER / STATUS HELPERS ═══════════════ */
export function updateHeaderStatus(state, label) {
  const badge = document.getElementById('status-indicator');
  if (!badge) return;
  badge.className = 'status-badge';
  switch (state) {
    case 'safe':     badge.classList.add('status-safe'); break;
    case 'alert':    badge.classList.add('status-alert'); break;
    case 'journey':  badge.classList.add('status-journey'); break;
    case 'watching': badge.classList.add('status-watching'); break;
    default:         badge.classList.add('status-safe');
  }
  const textEl = badge.querySelector('.status-text');
  if (textEl) textEl.textContent = label || 'Safe';
}

export function updateStatusCard(state, title, sub) {
  const card = document.getElementById('home-status-card');
  const titleEl = document.getElementById('status-card-title');
  const subEl = document.getElementById('status-card-sub');
  const iconContainer = card?.querySelector('.status-card-icon');
  if (!card) return;
  card.className = 'status-card';
  if (state === 'alert') card.classList.add('status-card--alert');
  if (state === 'journey') card.classList.add('status-card--journey');
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;
  if (iconContainer) {
    const svg = iconContainer.querySelector('svg');
    if (svg) {
      if (state === 'alert') svg.setAttribute('stroke', 'var(--accent-red)');
      else if (state === 'watching') svg.setAttribute('stroke', 'var(--accent-amber)');
      else svg.setAttribute('stroke', 'var(--accent-green)');
    }
  }
}

/* ═══════════════ EMERGENCY DISPATCHERS ═══════════════ */

/** sendEmergencyAlert(source) — full emergency: location + SMS/share + notification + ntfy push */
export async function sendEmergencyAlert(source = 'sos') {
  try {
    console.log('🚨 [alerts.js] sendEmergencyAlert called, source:', source);
    const location = await getCurrentLocation();
    console.log('📍 [alerts.js] Location obtained:', location);
    sendBrowserNotification('🚨 SafeHer EMERGENCY', `SOS alert triggered (${source})! Alerting your contacts.`);

    // Feature 3: Send ntfy.sh push notification
    try {
      const ntfy = await import('./ntfyPush.js');
      if (ntfy.isNtfyEnabled()) {
        ntfy.sendSOSNotification(location).catch(err => console.warn('[alerts.js] ntfy SOS push failed:', err));
      }
    } catch (err) {
      console.warn('[alerts.js] ntfy import/send failed:', err);
    }

    console.log('📨 [alerts.js] Importing contacts.js...');
    const { sendAlertToContacts } = await import('./contacts.js');
    console.log('✅ [alerts.js] contacts.js imported, calling sendAlertToContacts...');
    await sendAlertToContacts(location);
    console.log('✅ [alerts.js] sendAlertToContacts completed');
  } catch (err) {
    console.error('❌ [alerts.js] sendEmergencyAlert FAILED:', err);
    showToast('❌ Alert failed: ' + (err?.message || err), 'error');
  }
}

/** sendAlert(source) — lighter alert: notification + contact message + ntfy push */
export async function sendAlert(source = 'motion') {
  try {
    console.log('⚠️ [alerts.js] sendAlert called, source:', source);
    const location = await getCurrentLocation();
    sendBrowserNotification('⚠️ SafeHer Alert', `${source} alert triggered. Recording evidence.`);

    // Feature 3: Send ntfy.sh push notification for lighter alerts
    try {
      const ntfy = await import('./ntfyPush.js');
      if (ntfy.isNtfyEnabled()) {
        const userName = localStorage.getItem('safeher_username') || 'SafeHer User';
        ntfy.sendPush(
          `⚠️ Alert from ${userName}`,
          `${source} alert triggered. Check on them.`,
          4,
          ['warning']
        ).catch(err => console.warn('[alerts.js] ntfy alert push failed:', err));
      }
    } catch (err) {
      console.warn('[alerts.js] ntfy import/send failed:', err);
    }

    const { sendAlertToContacts } = await import('./contacts.js');
    await sendAlertToContacts(location);
  } catch (err) {
    console.error('❌ [alerts.js] sendAlert FAILED:', err);
    showToast('❌ Alert failed: ' + (err?.message || err), 'error');
  }
}

/** triggerEmergency(location) — red overlay + siren + alerts */
export function triggerEmergency(location) {
  showAlertOverlay('Sending your location and alert to emergency contacts…');
  playSiren();
  sendBrowserNotification('🚨 SafeHer EMERGENCY', 'SOS alert triggered! Alerting your contacts.');
  updateStatusCard('alert', '🚨 Emergency Active', 'Alerts sent to your contacts.');
  if (navigator.vibrate) navigator.vibrate([1000, 500, 1000, 500, 1000, 500, 1000]);
  document.dispatchEvent(new CustomEvent('safeher:emergency', { detail: { location } }));
}

/* ── Helper: current GPS using watchPosition (much faster on mobile) ── */
function getCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        navigator.geolocation.clearWatch(wid);
        console.error('📍 GPS timed out after 20s');
        resolve(null);
      }
    }, 20000);

    // watchPosition fires MUCH faster than getCurrentPosition on mobile
    // because it returns the first available fix (even low-accuracy cell/WiFi)
    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          navigator.geolocation.clearWatch(wid);
          console.log('📍 GPS obtained:', pos.coords.latitude, pos.coords.longitude, 'accuracy:', pos.coords.accuracy);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      (err) => {
        console.warn('📍 watchPosition error:', err?.code, err?.message);
        // Don't resolve on error — let it keep trying until timeout
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  });
}

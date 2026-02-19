/* ═══════════════════════════════════════════════
   SafeHer — Camera Recording & IndexedDB  (Step 8)
   Database: SafeHerDB, store: recordings
   Auto-increment, 60 s auto-stop, GPS stamp
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';

/* ──── Global ref (injected by app.js) ──── */
let AppState = null;
export function setAppState(state) { AppState = state; }

/* ──── IndexedDB constants ──── */
const DB_NAME    = 'SafeHerDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

/* ──── Module state ──── */
let db               = null;
let mediaRecorder    = null;
let recordedChunks   = [];
let recordingStart   = null;
let currentType      = null;     // 'sos' | 'motion' | 'voice' | 'manual'
let currentStream    = null;
let autoStopTimer    = null;
let locationAtStart  = null;
let timerInterval    = null;

/* ══════════════════════════════════════════
   init()
   Open / create IndexedDB, store reference
   ══════════════════════════════════════════ */
export async function init() {
  db = await openDB();
  renderRecordings();
  wireRecorderUI();
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = ()  => reject(req.error);
  });
}

/* ══════════════════════════════════════════
   startRecording(type)
   type: 'sos' | 'motion' | 'voice' | 'manual'
   • Guard if already recording
   • getUserMedia(video + audio)
   • MediaRecorder, collect every 1 s
   • Auto-stop after 60 s
   • Store GPS at start
   ══════════════════════════════════════════ */
export async function startRecording(type = 'manual') {
  if (mediaRecorder && mediaRecorder.state === 'recording') return;

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (_) {
    // Camera denied → fall back to audio-only
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      showToast('Could not access camera or microphone — please allow access', 'error');
      return;
    }
  }

  recordedChunks = [];
  currentType    = type;
  recordingStart = Date.now();
  locationAtStart = await grabGPS();

  // Choose best supported mime type
  const mimeType = pickMime(currentStream);

  mediaRecorder = new MediaRecorder(currentStream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const blob     = new Blob(recordedChunks, { type: mimeType });
    const duration = Math.round((Date.now() - recordingStart) / 1000);

    const record = {
      timestamp:       Date.now(),
      type:            currentType,
      blob,
      duration,
      locationAtStart
    };

    try {
      if (!db) db = await openDB();
      await saveRecord(record);
      showToast('📹 Recording saved to device', 'success');
    } catch (err) {
      showToast('Could not save recording', 'error');
    }

    // Cleanup stream tracks
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    currentType = null;
    renderRecordings();
    updateQuickActionCard(false);
    updateRecordingBadge();
  };

  mediaRecorder.start(1000);            // collect data every 1 second

  if (AppState) AppState.isRecording = true;
  updateQuickActionCard(true);

  // Auto-stop after 60 seconds (clearable)
  autoStopTimer = setTimeout(() => stopRecording(), 60000);

  // Live elapsed timer on recording UI
  startLiveTimer();
}

/* ══════════════════════════════════════════
   stopRecording()
   ══════════════════════════════════════════ */
export function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

  mediaRecorder.stop();

  if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  if (AppState) AppState.isRecording = false;
}

/* ══════════════════════════════════════════
   getAllRecordings()  — newest first
   ══════════════════════════════════════════ */
export async function getAllRecordings() {
  if (!db) db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
    req.onerror   = () => reject(req.error);
  });
}

/* ══════════════════════════════════════════
   deleteRecording(id)
   ══════════════════════════════════════════ */
export async function deleteRecording(id) {
  if (!db) db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/* ══════════════════════════════════════════
   isRecording()  — convenience getter
   ══════════════════════════════════════════ */
export function isRecording() {
  return !!(mediaRecorder && mediaRecorder.state === 'recording');
}

/* ══════════════════════════════════════════
   RENDER RECORDINGS LIST
   ══════════════════════════════════════════ */
export async function renderRecordings() {
  const listEl  = document.getElementById('recordings-list');
  const emptyEl = document.getElementById('recordings-empty');
  if (!listEl) return;

  let recordings = [];
  try { recordings = await getAllRecordings(); } catch (_) {}

  // Remove existing cards (keep the empty-state element)
  listEl.querySelectorAll('.recording-card').forEach(el => el.remove());

  if (recordings.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    updateRecordingBadge(0);
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  updateRecordingBadge(recordings.length);

  recordings.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'recording-card';
    card.dataset.id = rec.id;

    const date    = new Date(rec.timestamp);
    const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const hasVideo = rec.blob?.type?.includes('video');
    const iconSvg  = hasVideo
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>';

    const typeLabel = rec.type ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1) : (hasVideo ? 'Video' : 'Audio');

    card.innerHTML = `
      <div class="recording-icon ${hasVideo ? 'recording-icon--video' : 'recording-icon--audio'}">${iconSvg}</div>
      <div class="recording-info">
        <h5>${typeLabel} Recording</h5>
        <p>${timeStr} · ${fmtDuration(rec.duration)}${rec.locationAtStart ? ' · 📍' : ''}</p>
      </div>
      <div class="recording-actions">
        <button class="btn-play" aria-label="Play" data-id="${rec.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="btn-download" aria-label="Download" data-id="${rec.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="btn-delete-rec" aria-label="Delete" data-id="${rec.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

/* ══════════════════════════════════════════
   WIRE RECORDER UI
   Audio / Video buttons + delegation for
   play / download / delete
   ══════════════════════════════════════════ */
function wireRecorderUI() {
  const audioBtn = document.getElementById('btn-record-audio');
  const videoBtn = document.getElementById('btn-record-video');
  const listEl   = document.getElementById('recordings-list');

  if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
      if (isRecording()) { stopRecording(); }
      else { await startRecording('manual'); }
    });
  }

  if (videoBtn) {
    videoBtn.addEventListener('click', async () => {
      if (isRecording()) { stopRecording(); }
      else { await startRecording('manual'); }
    });
  }

  // Delegate play / download / delete clicks
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const playBtn = e.target.closest('.btn-play');
      const dlBtn   = e.target.closest('.btn-download');
      const delBtn  = e.target.closest('.btn-delete-rec');

      if (playBtn) await playRecording(Number(playBtn.dataset.id));
      if (dlBtn)   await downloadRecording(Number(dlBtn.dataset.id));

      if (delBtn) {
        const card = delBtn.closest('.recording-card');
        if (card) {
          card.style.transition = 'opacity .2s, transform .2s';
          card.style.opacity = '0';
          card.style.transform = 'translateX(40px)';
        }
        setTimeout(async () => {
          await deleteRecording(Number(delBtn.dataset.id));
          await renderRecordings();
          showToast('Recording deleted', 'info');
        }, 200);
      }
    });
  }
}

/* ══════════════════════════════════════════
   PLAYBACK
   ══════════════════════════════════════════ */
async function playRecording(id) {
  try {
    const all = await getAllRecordings();
    const rec = all.find(r => r.id === id);
    if (!rec?.blob) { showToast('Recording not found', 'error'); return; }

    const url = URL.createObjectURL(rec.blob);

    if (rec.blob.type.includes('video')) {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<html><head><title>SafeHer Recording</title>
          <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh}</style>
          </head><body>
          <video src="${url}" controls autoplay style="max-width:100%;max-height:100vh"></video>
          </body></html>`);
      }
    } else {
      const audio = new Audio(url);
      audio.play();
      showToast('Playing audio…', 'info');
      audio.onended = () => URL.revokeObjectURL(url);
    }
  } catch (_) {
    showToast('Playback error', 'error');
  }
}

/* ══════════════════════════════════════════
   DOWNLOAD
   ══════════════════════════════════════════ */
async function downloadRecording(id) {
  try {
    const all = await getAllRecordings();
    const rec = all.find(r => r.id === id);
    if (!rec?.blob) { showToast('Recording not found', 'error'); return; }

    const ext      = rec.blob.type.includes('video') ? 'webm' : 'webm';
    const filename = `safeher_${rec.type || 'rec'}_${new Date(rec.timestamp).toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${ext}`;
    const url = URL.createObjectURL(rec.blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  } catch (_) {
    showToast('Download error', 'error');
  }
}

/* ══════════════════════════════════════════
   INTERNAL HELPERS
   ══════════════════════════════════════════ */

/** Save a record to IndexedDB */
function saveRecord(record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/** Pick best supported MIME type from stream tracks */
function pickMime(stream) {
  const hasVideo = stream.getVideoTracks().length > 0;
  if (hasVideo) {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
    return 'video/webm';
  }
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  return 'audio/webm';
}

/** Get current GPS position (resolves to {lat,lng} or null) */
function grabGPS() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

/** Format seconds → m:ss */
function fmtDuration(sec) {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Update the Quick Action "Auto Record" card ON/OFF status */
function updateQuickActionCard(on) {
  const card = document.getElementById('btn-quick-record');
  if (!card) return;
  const span = card.querySelector('span');
  if (span) span.textContent = on ? '● Recording' : 'Record';
  card.classList.toggle('action-card--active', on);
}

/** Update recordings count badge on bottom nav */
function updateRecordingBadge(count) {
  const navBtn = document.querySelector('[data-screen="recordings"]');
  if (!navBtn) return;
  let badge = navBtn.querySelector('.nav-badge');
  if (count === undefined) {
    getAllRecordings().then(recs => {
      updateRecordingBadge(recs.length);
    }).catch(() => {});
    return;
  }
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      navBtn.appendChild(badge);
    }
    badge.textContent = count;
  } else if (badge) {
    badge.remove();
  }
}

/** Live elapsed timer on Audio/Video recording status labels */
function startLiveTimer() {
  const audioStatus = document.getElementById('audio-rec-status');
  const videoStatus = document.getElementById('video-rec-status');
  timerInterval = setInterval(() => {
    if (!recordingStart) return;
    const elapsed = Math.round((Date.now() - recordingStart) / 1000);
    const txt = `● ${fmtDuration(elapsed)}`;
    if (audioStatus) audioStatus.textContent = txt;
    if (videoStatus) videoStatus.textContent = txt;
  }, 1000);
}

/* ══════════════════════════════════════════
   LEGACY COMPAT EXPORTS
   Other modules may import these names
   ══════════════════════════════════════════ */
export { startRecording as startAudioRecording };
export { startRecording as startVideoRecording };
export { startRecording as startEmergencyRecording };
export { init as initRecorderUI };
export { getAllRecordings as getRecordings };

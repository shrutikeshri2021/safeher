/* ═══════════════════════════════════════════════
   SafeHer — Camera Recording & IndexedDB
   Database: SafeHerDB, store: recordings
   Records until manually stopped, stored in DB,
   displayed with playable filename in frontend
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
let currentType      = null;     // 'audio' | 'video' | 'sos' | 'motion' | 'voice' | 'manual'
let currentStream    = null;
let locationAtStart  = null;
let timerInterval    = null;
let currentMediaType = null;     // 'audio' or 'video' — what user tapped
let activePlayback   = null;     // currently playing <audio>/<video> element
let autoStopTimer    = null;     // auto-stop after 1.5 hours for SOS

/* ── Get the active recording stream (used by snapshot) ── */
export function getActiveStream() {
  return currentStream;
}

/* ══════════════════════════════════════════
   init()
   ══════════════════════════════════════════ */
export async function init() {
  db = await openDB();
  wireRecorderUI();
  renderRecordings();
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
   Records until YOU manually stop it.
   No auto-stop timer.
   ══════════════════════════════════════════ */
export async function startRecording(type = 'manual') {
  if (mediaRecorder && mediaRecorder.state === 'recording') return;

  // SOS / emergency / video → record video; else audio only
  const wantVideo = (type === 'video' || type === 'sos' || type === 'motion' || type === 'voice' || type === 'manual');

  try {
    if (wantVideo) {
      // Use BACK camera (environment) for SOS/emergency, front for manual video
      const useBackCamera = (type === 'sos' || type === 'motion' || type === 'voice');
      const videoConstraints = useBackCamera
        ? { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };
      const audioConstraints = { echoCancellation: false, noiseSuppression: false, autoGainControl: true };
      currentStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints });

      // If no audio track was returned, request mic separately and merge
      if (currentStream.getAudioTracks().length === 0) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
          micStream.getAudioTracks().forEach(t => currentStream.addTrack(t));
        } catch (_) { /* mic unavailable — record video without audio */ }
      }

      // Make sure torch/flashlight is OFF
      const videoTrack = currentStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({ advanced: [{ torch: false }] });
        } catch (_) { /* torch not supported — that's fine */ }
      }
    } else {
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    }
  } catch (_) {
    // If video fails, fallback to audio
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      showToast('Could not access microphone — please allow access', 'error');
      return;
    }
  }

  recordedChunks  = [];
  currentType     = type;
  currentMediaType = wantVideo ? 'video' : 'audio';
  recordingStart  = Date.now();
  locationAtStart = await grabGPS();

  const mimeType = pickMime(currentStream);

  mediaRecorder = new MediaRecorder(currentStream, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const blob     = new Blob(recordedChunks, { type: mimeType });
    const duration = Math.round((Date.now() - recordingStart) / 1000);
    const hasVideo = currentStream ? currentStream.getVideoTracks().length > 0 : false;

    // Build a human-readable filename
    const ts     = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const ext    = hasVideo ? 'webm' : 'webm';
    const fname  = `SafeHer_${currentType || 'rec'}_${ts}.${ext}`;

    const record = {
      timestamp:       Date.now(),
      type:            currentType || 'manual',
      mediaKind:       hasVideo ? 'video' : 'audio',
      blob,
      duration,
      locationAtStart,
      filename:        fname,
      mimeType
    };

    try {
      if (!db) db = await openDB();
      await saveRecord(record);
      showToast(`📹 ${fname} saved to device`, 'success');
    } catch (err) {
      showToast('Could not save recording', 'error');
    }

    // Cleanup stream
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    currentType = null;
    currentMediaType = null;

    if (AppState) AppState.isRecording = false;

    // Reset UI
    resetRecordingUI();
    renderRecordings();
    updateRecordingBadge();
  };

  mediaRecorder.start(1000);

  if (AppState) AppState.isRecording = true;
  showRecordingUI();
  startLiveTimer();

  // ═══ Auto-stop SOS recording after 1.5 hours (90 min) ═══
  if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
  if (type === 'sos' || type === 'motion' || type === 'voice') {
    const AUTO_STOP_MS = 90 * 60 * 1000; // 1.5 hours
    autoStopTimer = setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('⏰ Auto-stopping recording after 1.5 hours');
        showToast('⏰ Recording auto-saved after 1.5 hours', 'info');
        stopRecording();
      }
      autoStopTimer = null;
    }, AUTO_STOP_MS);
  }

  showToast(`🔴 ${wantVideo ? 'Video' : 'Audio'} recording started — tap Stop to finish`, 'info');
}

/* ══════════════════════════════════════════
   stopRecording()
   ══════════════════════════════════════════ */
export function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
  mediaRecorder.stop();
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
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

export function isRecording() {
  return !!(mediaRecorder && mediaRecorder.state === 'recording');
}

/* ══════════════════════════════════════════
   RENDER RECORDINGS LIST
   Shows filename, duration, play inline,
   download, delete
   ══════════════════════════════════════════ */
export async function renderRecordings() {
  const listEl  = document.getElementById('recordings-list');
  const emptyEl = document.getElementById('recordings-empty');
  if (!listEl) return;

  let recordings = [];
  try { recordings = await getAllRecordings(); } catch (_) {}

  // Remove old cards but keep the empty-state element
  listEl.querySelectorAll('.recording-card').forEach(el => el.remove());

  // Stop any active inline playback
  if (activePlayback) {
    try { activePlayback.pause(); } catch (_) {}
    activePlayback = null;
  }

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

    const isVideo = rec.mediaKind === 'video' || rec.blob?.type?.includes('video');
    const icon    = isVideo ? '🎬' : '🎙️';
    const fname   = rec.filename || `Recording_${rec.id}`;

    card.innerHTML = `
      <div class="recording-icon" style="font-size:1.5rem;min-width:40px;text-align:center;">${icon}</div>
      <div class="recording-info" style="flex:1;min-width:0;">
        <h5 style="margin:0 0 2px;font-size:.85rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(fname)}</h5>
        <p style="margin:0;font-size:.75rem;color:var(--text-secondary);">
          ${fmtDuration(rec.duration)} · ${new Date(rec.timestamp).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}${rec.locationAtStart ? ' · 📍' : ''}
        </p>
        <div class="rec-player-slot" data-id="${rec.id}"></div>
      </div>
      <div class="recording-actions" style="display:flex;gap:6px;align-items:center;">
        <button class="btn-play" aria-label="Play" data-id="${rec.id}" style="background:none;border:none;cursor:pointer;color:var(--accent-green);padding:6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="btn-download" aria-label="Download" data-id="${rec.id}" style="background:none;border:none;cursor:pointer;color:var(--accent-blue);padding:6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="btn-delete-rec" aria-label="Delete" data-id="${rec.id}" style="background:none;border:none;cursor:pointer;color:var(--accent-red);padding:6px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

/* ══════════════════════════════════════════
   WIRE RECORDER UI
   ══════════════════════════════════════════ */
function wireRecorderUI() {
  const audioBtn = document.getElementById('btn-record-audio');
  const videoBtn = document.getElementById('btn-record-video');
  const listEl   = document.getElementById('recordings-list');

  if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
      if (isRecording()) {
        stopRecording();
      } else {
        await startRecording('audio');
      }
    });
  }

  if (videoBtn) {
    videoBtn.addEventListener('click', async () => {
      if (isRecording()) {
        stopRecording();
      } else {
        await startRecording('video');
      }
    });
  }

  // Delegate play / download / delete
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const playBtn = e.target.closest('.btn-play');
      const dlBtn   = e.target.closest('.btn-download');
      const delBtn  = e.target.closest('.btn-delete-rec');

      if (playBtn) {
        e.stopPropagation();
        await playRecordingInline(Number(playBtn.dataset.id));
      }
      if (dlBtn) {
        e.stopPropagation();
        await downloadRecording(Number(dlBtn.dataset.id));
      }
      if (delBtn) {
        e.stopPropagation();
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
   INLINE PLAYBACK (plays right inside the card)
   ══════════════════════════════════════════ */
async function playRecordingInline(id) {
  try {
    // Stop any existing playback
    if (activePlayback) {
      activePlayback.pause();
      activePlayback.src = '';
      activePlayback = null;
    }
    // Remove any existing player elements
    document.querySelectorAll('.rec-inline-player').forEach(el => el.remove());

    const all = await getAllRecordings();
    const rec = all.find(r => r.id === id);
    if (!rec?.blob) { showToast('Recording not found', 'error'); return; }

    const url  = URL.createObjectURL(rec.blob);
    const slot = document.querySelector(`.rec-player-slot[data-id="${id}"]`);
    if (!slot) return;

    const isVideo = rec.mediaKind === 'video' || rec.blob?.type?.includes('video');

    if (isVideo) {
      const video = document.createElement('video');
      video.className = 'rec-inline-player';
      video.src = url;
      video.controls = true;
      video.autoplay = true;
      video.style.cssText = 'width:100%;max-height:200px;border-radius:8px;margin-top:8px;background:#000;';
      slot.appendChild(video);
      activePlayback = video;
      video.onended = () => { URL.revokeObjectURL(url); };
    } else {
      const audio = document.createElement('audio');
      audio.className = 'rec-inline-player';
      audio.src = url;
      audio.controls = true;
      audio.autoplay = true;
      audio.style.cssText = 'width:100%;margin-top:8px;';
      slot.appendChild(audio);
      activePlayback = audio;
      audio.onended = () => { URL.revokeObjectURL(url); };
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

    const fname = rec.filename || `safeher_recording_${id}.webm`;
    const url   = URL.createObjectURL(rec.blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = fname;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${fname}`, 'success');
  } catch (_) {
    showToast('Download error', 'error');
  }
}

/* ══════════════════════════════════════════
   RECORDING UI HELPERS
   ══════════════════════════════════════════ */
function showRecordingUI() {
  const audioBtn = document.getElementById('btn-record-audio');
  const videoBtn = document.getElementById('btn-record-video');
  const audioSt  = document.getElementById('audio-rec-status');
  const videoSt  = document.getElementById('video-rec-status');

  if (audioBtn) audioBtn.classList.add('recording');
  if (videoBtn) videoBtn.classList.add('recording');
  if (audioSt) audioSt.textContent = '● Recording…';
  if (videoSt) videoSt.textContent = '● Recording…';

  // Quick action card
  const card = document.getElementById('btn-quick-record');
  if (card) {
    const span = card.querySelector('span');
    if (span) span.textContent = '● Stop';
    card.classList.add('action-card--active');
  }
}

function resetRecordingUI() {
  const audioBtn = document.getElementById('btn-record-audio');
  const videoBtn = document.getElementById('btn-record-video');
  const audioSt  = document.getElementById('audio-rec-status');
  const videoSt  = document.getElementById('video-rec-status');

  if (audioBtn) audioBtn.classList.remove('recording');
  if (videoBtn) videoBtn.classList.remove('recording');
  if (audioSt) audioSt.textContent = 'Tap to start';
  if (videoSt) videoSt.textContent = 'Tap to start';

  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  const card = document.getElementById('btn-quick-record');
  if (card) {
    const span = card.querySelector('span');
    if (span) span.textContent = 'Record';
    card.classList.remove('action-card--active');
  }
}

function startLiveTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const audioSt = document.getElementById('audio-rec-status');
  const videoSt = document.getElementById('video-rec-status');
  timerInterval = setInterval(() => {
    if (!recordingStart) return;
    const elapsed = Math.round((Date.now() - recordingStart) / 1000);
    const txt = `● ${fmtDuration(elapsed)}`;
    if (audioSt) audioSt.textContent = txt;
    if (videoSt) videoSt.textContent = txt;
  }, 1000);
}

/* ══════════════════════════════════════════
   INTERNAL HELPERS
   ══════════════════════════════════════════ */
function saveRecord(record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

function pickMime(stream) {
  const hasVideo = stream.getVideoTracks().length > 0;
  if (hasVideo) {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
    if (MediaRecorder.isTypeSupported('video/webm'))                 return 'video/webm';
    return 'video/mp4';
  }
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm'))             return 'audio/webm';
  return 'audio/mp4';
}

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

function fmtDuration(sec) {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateRecordingBadge(count) {
  const navBtn = document.querySelector('[data-screen="recordings"]');
  if (!navBtn) return;
  let badge = navBtn.querySelector('.nav-badge');
  if (count === undefined) {
    getAllRecordings().then(recs => updateRecordingBadge(recs.length)).catch(() => {});
    return;
  }
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.style.cssText = 'position:absolute;top:2px;right:8px;background:var(--accent-red);color:#fff;font-size:.6rem;padding:1px 5px;border-radius:10px;font-weight:700;';
      navBtn.style.position = 'relative';
      navBtn.appendChild(badge);
    }
    badge.textContent = count;
  } else if (badge) {
    badge.remove();
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ══════════════════════════════════════════
   LEGACY COMPAT EXPORTS
   ══════════════════════════════════════════ */
export { startRecording as startAudioRecording };
export { startRecording as startVideoRecording };
export async function startEmergencyRecording() {
  return startRecording('sos');
}
export { init as initRecorderUI };
export { getAllRecordings as getRecordings };

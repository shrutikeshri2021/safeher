/* ═══════════════════════════════════════════════
   SafeHer — Camera Recording & IndexedDB
   Database: SafeHerDB, store: recordings
   Records until manually stopped, stored in DB,
   displayed with playable filename in frontend
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';
import { logEvent } from './historyLogger.js';
import * as WakeLock from './wakeLock.js';

/* ──── Global ref (injected by app.js) ──── */
let AppState = null;
export function setAppState(state) { AppState = state; }

/* ──── IndexedDB constants ──── */
const DB_NAME    = 'SafeHerDB';
const DB_VERSION = 3;
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
  wireAutoSaveListeners();   // Feature 1: auto-save on interruption
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
      if (!database.objectStoreNames.contains('history')) {
        const store = database.createObjectStore('history', { keyPath: 'id' });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
        store.createIndex('by_type',      'type',      { unique: false });
        store.createIndex('by_severity',  'severity',  { unique: false });
      }
      /* v3 — geocache (Feature 5: Offline Geocoding) */
      if (!database.objectStoreNames.contains('geocache')) {
        database.createObjectStore('geocache', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = ()  => reject(req.error);
  });
}

/* ──── STEP 9: Check permissions before recording ──── */
async function checkPermissions() {
  try {
    const cam = await navigator.permissions.query({ name: 'camera' });
    const mic = await navigator.permissions.query({ name: 'microphone' });
    console.log('Camera:', cam.state, 'Mic:', mic.state);
    if (cam.state === 'denied') throw new Error('Camera permission denied');
    if (mic.state === 'denied') throw new Error('Mic permission denied');
  } catch (e) {
    // permissions API not supported on all browsers, continue anyway
    if (e.message && e.message.includes('denied')) throw e;
  }
}

/* ══════════════════════════════════════════
   startRecording(type)
   Records until YOU manually stop it.
   No auto-stop timer.
   ══════════════════════════════════════════ */
export async function startRecording(type = 'manual') {
  // Guard — same type already recording, just toggle off
  if (mediaRecorder && mediaRecorder.state === 'recording' && currentType === type) {
    stopRecording();
    return;
  }

  // Stop any active recording before starting a different type
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
    // Give browser a tick to finish the stop
    await new Promise(r => setTimeout(r, 150));
  }

  // Clean up any lingering stream
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }

  // SOS / emergency / video → record video; else audio only
  const wantVideo = (type === 'video' || type === 'sos' || type === 'motion' || type === 'voice' || type === 'manual');

  // STEP 9: Check permissions before recording
  await checkPermissions();

  try {
    if (type === 'audio') {
      // Audio-only stream
      currentStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        },
        video: false
      });
    } else {
      // STEP 1: Single getUserMedia call — video + audio together
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      // Verify both tracks exist
      const videoTracks = currentStream.getVideoTracks();
      const audioTracks = currentStream.getAudioTracks();
      console.log('Video tracks:', videoTracks.length);
      console.log('Audio tracks:', audioTracks.length);
      if (audioTracks.length === 0) throw new Error('No microphone access');
      if (videoTracks.length === 0) throw new Error('No camera access');

      // Make sure torch/flashlight is OFF
      const videoTrack = videoTracks[0];
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({ advanced: [{ torch: false }] });
        } catch (_) { /* torch not supported */ }
      }
    }
  } catch (err) {
    console.error('getUserMedia failed:', err.message);
    // If video fails, fallback to audio only
    if (wantVideo) {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err2) {
        showToast('Could not access microphone — please allow access', 'error');
        return;
      }
    } else {
      showToast('Could not access microphone — please allow access', 'error');
      return;
    }
  }

  recordedChunks  = [];
  currentType     = type;
  currentMediaType = wantVideo ? 'video' : 'audio';
  recordingStart  = Date.now();
  locationAtStart = await grabGPS();

  // STEP 2: Get supported MIME type
  const mimeType = getSupportedMimeType(currentStream);

  // STEP 3: Create MediaRecorder with bitrate options
  const recorderOptions = mimeType
    ? { mimeType, audioBitsPerSecond: 128000, videoBitsPerSecond: 2500000 }
    : {};
  try {
    mediaRecorder = new MediaRecorder(currentStream, recorderOptions);
  } catch (e) {
    console.warn('MediaRecorder with options failed, trying without:', e.message);
    mediaRecorder = new MediaRecorder(currentStream);
  }

  // STEP 4: Collect chunks
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
      console.log('Chunk collected:', e.data.size, 'bytes');
    }
  };

  // STEP 5: Handle stop and save
  mediaRecorder.onstop = async () => {
    console.log('Total chunks:', recordedChunks.length);
    const totalSize = recordedChunks.reduce((sum, c) => sum + c.size, 0);
    console.log('Total size:', totalSize, 'bytes');

    if (recordedChunks.length === 0 || totalSize === 0) {
      console.error('No data recorded');
      if (currentStream) {
        currentStream.getTracks().forEach(t => { t.stop(); console.log('Stopped track:', t.kind); });
        currentStream = null;
      }
      currentType = null;
      currentMediaType = null;
      if (AppState) AppState.isRecording = false;
      resetRecordingUI();
      return;
    }

    const finalMime = mediaRecorder.mimeType || mimeType || 'video/webm';
    const blob = new Blob(recordedChunks, { type: finalMime });
    console.log('Final blob size:', blob.size, 'type:', blob.type);

    // Verify blob is playable
    const testUrl = URL.createObjectURL(blob);
    console.log('Test URL created:', testUrl);
    URL.revokeObjectURL(testUrl);

    const duration = Math.round((Date.now() - recordingStart) / 1000);
    const hasVideo = currentStream ? currentStream.getVideoTracks().length > 0 : false;

    const ts    = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const fname = `SafeHer_${currentType || 'rec'}_${ts}.webm`;

    const record = {
      timestamp:       Date.now(),
      type:            currentType || 'manual',
      mediaKind:       hasVideo ? 'video' : 'audio',
      blob,
      duration,
      locationAtStart,
      filename:        fname,
      mimeType:        finalMime
    };

    try {
      if (!db) db = await openDB();
      await saveRecord(record);
      showToast(`📹 ${fname} saved to device`, 'success');
      logEvent('recording_saved', {
        media: { hasVideo, hasAudio: true, videoDuration: duration },
        trigger: { method: currentType || 'manual' }
      }).catch(() => {});
    } catch (err) {
      showToast('Could not save recording', 'error');
    }

    // STEP 7: Stop all tracks ONLY here after recording is fully done
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      currentStream = null;
    }
    currentType = null;
    currentMediaType = null;

    if (AppState) AppState.isRecording = false;

    // --- Release Wake Lock (Feature 1) ---
    WakeLock.release('recording').catch(err => console.warn('[Recorder] Wake lock release failed:', err));

    resetRecordingUI();
    renderRecordings();
    updateRecordingBadge();
  };

  // STEP 6: Use 100ms timeslice for reliable chunk collection
  mediaRecorder.start(100);
  console.log('Recording started, state:', mediaRecorder.state);

  if (AppState) AppState.isRecording = true;

  // --- Wake Lock (Feature 1) — keep screen on during recording ---
  WakeLock.acquire('recording').catch(err => console.warn('[Recorder] Wake lock acquire failed:', err));

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

/* FIX 4: stopRecordingAsync — waits for onstop handler to complete before resolving */
function stopRecordingAsync() {
  return new Promise(resolve => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') { resolve(); return; }
    const origOnstop = mediaRecorder.onstop;
    mediaRecorder.onstop = async function (...args) {
      if (origOnstop) await origOnstop.apply(this, args);
      resolve();
    };
    mediaRecorder.stop();
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
  });
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
   deleteAllRecordings()  — clears entire store
   ══════════════════════════════════════════ */
export async function deleteAllRecordings() {
  if (!db) db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
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
  const listEl    = document.getElementById('recordings-list');
  const emptyEl   = document.getElementById('recordings-empty');
  const clearBtn  = document.getElementById('btn-clear-all-recordings');
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
    if (clearBtn) clearBtn.classList.add('hidden');
    updateRecordingBadge(0);
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  if (clearBtn) clearBtn.classList.remove('hidden');
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

  /* ── Debounce flag — prevents double-tap issues ── */
  let recBusy = false;

  if (audioBtn) {
    audioBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (recBusy) return;                       // prevent multi-tap while async runs
      recBusy = true;
      try {
        if (isRecording() && currentType === 'audio') {
          stopRecording();
        } else {
          await startRecording('audio');
        }
      } finally {
        recBusy = false;
      }
    }, { passive: false });
  }

  if (videoBtn) {
    videoBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (recBusy) return;                       // prevent multi-tap while async runs
      recBusy = true;
      try {
        if (isRecording() && currentType === 'video') {
          stopRecording();
        } else {
          await startRecording('video');
        }
      } finally {
        recBusy = false;
      }
    }, { passive: false });
  }

  /* ── Clear All button ── */
  const clearAllBtn = document.getElementById('btn-clear-all-recordings');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = confirm('Delete ALL recordings? This cannot be undone.');
      if (!ok) return;
      try {
        await deleteAllRecordings();
        await renderRecordings();
        showToast('All recordings cleared', 'info');
      } catch (err) {
        console.error('Clear all failed:', err);
        showToast('Failed to clear recordings', 'error');
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
      video.playsInline = true;    // required for iOS
      video.muted = false;         // ensure audio plays back
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

  // FIX 4: Only mark the button of the active recording type
  if (currentMediaType === 'audio') {
    if (audioBtn) audioBtn.classList.add('recording');
    if (audioSt) audioSt.textContent = '● Recording…';
  } else {
    if (videoBtn) videoBtn.classList.add('recording');
    if (videoSt) videoSt.textContent = '● Recording…';
  }

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
  const activeType = currentMediaType; // capture at start
  timerInterval = setInterval(() => {
    if (!recordingStart) return;
    const elapsed = Math.round((Date.now() - recordingStart) / 1000);
    const txt = `● ${fmtDuration(elapsed)}`;
    // FIX 4: Only update the active recording type's status
    if (activeType === 'audio') {
      if (audioSt) audioSt.textContent = txt;
    } else {
      if (videoSt) videoSt.textContent = txt;
    }
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

/* STEP 2: Find supported MIME type */
function getSupportedMimeType(stream) {
  const hasVideo = stream.getVideoTracks().length > 0;
  if (hasVideo) {
    const types = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Using mimeType:', type);
        return type;
      }
    }
    return '';
  }
  const audioTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4'
  ];
  for (const type of audioTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log('Using mimeType:', type);
      return type;
    }
  }
  return '';
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
   FEATURE 1: AUTO-SAVE ON INTERRUPTION
   Saves in-progress recording when:
   - Page goes hidden (visibilitychange)
   - Tab/app is about to close (beforeunload)
   - JS error crashes app (window.onerror)
   ══════════════════════════════════════════ */
function wireAutoSaveListeners() {
  try {
    /* ── visibilitychange: auto-save when user switches away ── */
    document.addEventListener('visibilitychange', () => {
      try {
        if (document.visibilityState === 'hidden' && mediaRecorder && mediaRecorder.state === 'recording') {
          console.log('[Recorder] Page hidden during recording — triggering emergency auto-save');
          emergencyAutoSave('page_hidden');
        }
      } catch (err) {
        console.error('[Recorder] visibilitychange handler error:', err);
      }
    });

    /* ── beforeunload: save before tab/app closes ── */
    window.addEventListener('beforeunload', (e) => {
      try {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          console.log('[Recorder] Page unloading during recording — triggering emergency auto-save');
          emergencyAutoSave('page_unload');
          // Give browser a moment to flush
          e.preventDefault();
          e.returnValue = 'Recording in progress — are you sure you want to leave?';
        }
      } catch (err) {
        console.error('[Recorder] beforeunload handler error:', err);
      }
    });

    /* ── window.onerror: save on JS crash ── */
    const originalOnError = window.onerror;
    window.onerror = function(msg, src, line, col, err) {
      try {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          console.log('[Recorder] JS error during recording — triggering emergency auto-save');
          emergencyAutoSave('js_error');
        }
      } catch (_) { /* silent */ }
      // Call original handler if it existed
      if (typeof originalOnError === 'function') {
        return originalOnError(msg, src, line, col, err);
      }
      return false;
    };

    console.log('[Recorder] ✅ Auto-save listeners wired (visibilitychange, beforeunload, onerror)');
  } catch (err) {
    console.error('[Recorder] wireAutoSaveListeners() error:', err);
  }
}

/**
 * emergencyAutoSave(reason)
 * Saves whatever chunks have been collected so far
 * WITHOUT stopping the MediaRecorder (so recording can continue
 * if the user returns to the tab).
 */
async function emergencyAutoSave(reason = 'unknown') {
  try {
    console.log(`[Recorder] emergencyAutoSave triggered — reason: ${reason}, chunks: ${recordedChunks.length}`);

    if (recordedChunks.length === 0) {
      console.log('[Recorder] No chunks to save');
      return;
    }

    const totalSize = recordedChunks.reduce((sum, c) => sum + c.size, 0);
    if (totalSize === 0) {
      console.log('[Recorder] Chunks are empty (0 bytes)');
      return;
    }

    // Create a blob from current chunks
    const mime = (mediaRecorder && mediaRecorder.mimeType) || 'video/webm';
    const blob = new Blob([...recordedChunks], { type: mime });
    const duration = Math.round((Date.now() - (recordingStart || Date.now())) / 1000);
    const hasVideo = currentStream ? currentStream.getVideoTracks().length > 0 : false;

    const ts    = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const fname = `SafeHer_autosave_${reason}_${ts}.webm`;

    const record = {
      timestamp:       Date.now(),
      type:            (currentType || 'manual') + '_autosave',
      mediaKind:       hasVideo ? 'video' : 'audio',
      blob,
      duration,
      locationAtStart,
      filename:        fname,
      mimeType:        mime
    };

    if (!db) db = await openDB();
    await saveRecord(record);

    console.log(`[Recorder] ✅ Emergency auto-save complete: ${fname} (${blob.size} bytes, ${duration}s)`);

    logEvent('recording_saved', {
      media: { hasVideo, hasAudio: true, videoDuration: duration },
      trigger: { method: `autosave_${reason}` }
    }).catch(() => {});

  } catch (err) {
    console.error('[Recorder] emergencyAutoSave failed:', err);
  }
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

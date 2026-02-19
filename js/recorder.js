/* ═══════════════════════════════════════════════
   SafeHer — Recorder Module
   Audio & video recording with IndexedDB storage
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';

const DB_NAME = 'safeher-db';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

let db = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;
let recordingType = null; // 'audio' | 'video'
let recordingTimerInterval = null;
let currentStream = null;

/* ── IndexedDB Setup ──────────────────────────── */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

async function saveRecording(recording) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(recording);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecordings() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRecording(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Start Recording ──────────────────────────── */
export async function startAudioRecording() {
  return startRecording('audio');
}

export async function startVideoRecording() {
  return startRecording('video');
}

async function startRecording(type) {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    showToast('Already Recording', 'Stop the current recording first.', 'warning');
    return false;
  }

  try {
    const constraints = type === 'video'
      ? { video: { facingMode: 'environment', width: 640, height: 480 }, audio: true }
      : { audio: true };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    recordedChunks = [];
    recordingType = type;
    recordingStartTime = Date.now();

    const mimeType = type === 'video'
      ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm')
      : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

    mediaRecorder = new MediaRecorder(currentStream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      const duration = Math.round((Date.now() - recordingStartTime) / 1000);
      const recording = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: recordingType,
        timestamp: Date.now(),
        duration,
        mimeType,
        blob
      };

      try {
        await saveRecording(recording);
        showToast('Saved', `${type === 'video' ? 'Video' : 'Audio'} recording saved (${formatDuration(duration)}).`, 'success');
      } catch (err) {
        showToast('Save Error', 'Could not save recording.', 'error');
      }

      // Clean up stream
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
        currentStream = null;
      }
      recordingType = null;
      renderRecordings();
      updateRecordingUI(type, false);
    };

    mediaRecorder.start(1000); // collect data every second

    updateRecordingUI(type, true);
    showToast('Recording', `${type === 'video' ? 'Video' : 'Audio'} recording started.`, 'info');
    return true;

  } catch (err) {
    showToast('Permission Denied', `Could not access ${type === 'video' ? 'camera' : 'microphone'}. Please allow access.`, 'error');
    return false;
  }
}

/* ── Stop Recording ───────────────────────────── */
export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
}

/* ── Emergency Recording ──────────────────────── */
export async function startEmergencyRecording() {
  const success = await startRecording('audio');
  if (success) {
    showToast('🔴 Evidence Recording', 'Audio is being recorded for evidence.', 'warning');
  }
}

/* ── UI Updates ───────────────────────────────── */
function updateRecordingUI(type, isRecording) {
  const audioBtn = document.getElementById('btn-record-audio');
  const videoBtn = document.getElementById('btn-record-video');
  const audioStatus = document.getElementById('audio-rec-status');
  const videoStatus = document.getElementById('video-rec-status');

  if (type === 'audio' && audioBtn) {
    audioBtn.classList.toggle('recording', isRecording);
    if (audioStatus) audioStatus.textContent = isRecording ? '● Recording…' : 'Tap to start';
  }
  if (type === 'video' && videoBtn) {
    videoBtn.classList.toggle('recording', isRecording);
    if (videoStatus) videoStatus.textContent = isRecording ? '● Recording…' : 'Tap to start';
  }

  // Live timer
  if (isRecording) {
    const statusEl = type === 'audio' ? audioStatus : videoStatus;
    recordingTimerInterval = setInterval(() => {
      if (statusEl && recordingStartTime) {
        const elapsed = Math.round((Date.now() - recordingStartTime) / 1000);
        statusEl.textContent = `● ${formatDuration(elapsed)}`;
      }
    }, 1000);
  }
}

export function isRecording() {
  return mediaRecorder && mediaRecorder.state === 'recording';
}

/* ── Render Recordings List ───────────────────── */
export async function renderRecordings() {
  const listEl = document.getElementById('recordings-list');
  const emptyEl = document.getElementById('recordings-empty');
  if (!listEl) return;

  let recordings = [];
  try {
    recordings = await getRecordings();
  } catch { recordings = []; }

  listEl.querySelectorAll('.recording-card').forEach((el) => el.remove());

  if (recordings.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  recordings.forEach((rec) => {
    const card = document.createElement('div');
    card.className = 'recording-card';
    card.dataset.id = rec.id;
    const date = new Date(rec.timestamp);
    const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const iconClass = rec.type === 'video' ? 'recording-icon--video' : 'recording-icon--audio';
    const iconSvg = rec.type === 'video'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>';

    card.innerHTML = `
      <div class="recording-icon ${iconClass}">${iconSvg}</div>
      <div class="recording-info">
        <h5>${rec.type === 'video' ? 'Video' : 'Audio'} Recording</h5>
        <p>${timeStr} · ${formatDuration(rec.duration)}</p>
      </div>
      <div class="recording-actions">
        <button class="btn-play" aria-label="Play recording" data-id="${rec.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <button class="btn-download" aria-label="Download recording" data-id="${rec.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="btn-delete-rec" aria-label="Delete recording" data-id="${rec.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

/* ── Init Recordings UI ───────────────────────── */
export function initRecorderUI() {
  const audioBtn = document.getElementById('btn-record-audio');
  const videoBtn = document.getElementById('btn-record-video');
  const listEl = document.getElementById('recordings-list');

  if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
      if (isRecording() && recordingType === 'audio') {
        stopRecording();
      } else {
        await startAudioRecording();
      }
    });
  }

  if (videoBtn) {
    videoBtn.addEventListener('click', async () => {
      if (isRecording() && recordingType === 'video') {
        stopRecording();
      } else {
        await startVideoRecording();
      }
    });
  }

  // Delegate play/download/delete
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const playBtn = e.target.closest('.btn-play');
      const dlBtn = e.target.closest('.btn-download');
      const delBtn = e.target.closest('.btn-delete-rec');

      if (playBtn) {
        const id = playBtn.dataset.id;
        await playRecording(id);
      }
      if (dlBtn) {
        const id = dlBtn.dataset.id;
        await downloadRecording(id);
      }
      if (delBtn) {
        const id = delBtn.dataset.id;
        const card = delBtn.closest('.recording-card');
        if (card) {
          card.style.transition = 'opacity 0.2s, transform 0.2s';
          card.style.opacity = '0';
          card.style.transform = 'translateX(40px)';
        }
        setTimeout(async () => {
          await deleteRecording(id);
          await renderRecordings();
          showToast('Deleted', 'Recording removed.', 'info');
        }, 200);
      }
    });
  }

  // Initialize DB and render
  openDB().then(() => renderRecordings());
}

/* ── Playback ─────────────────────────────────── */
async function playRecording(id) {
  try {
    const recordings = await getRecordings();
    const rec = recordings.find((r) => r.id === id);
    if (!rec || !rec.blob) { showToast('Error', 'Recording not found.', 'error'); return; }

    const url = URL.createObjectURL(rec.blob);

    if (rec.type === 'video') {
      // Open in new tab/window for video
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <html><head><title>SafeHer Recording</title>
          <style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}</style>
          </head><body>
          <video src="${url}" controls autoplay style="max-width:100%;max-height:100vh;"></video>
          </body></html>
        `);
      }
    } else {
      const audio = new Audio(url);
      audio.play();
      showToast('Playing', 'Audio recording playing…', 'info');
      audio.onended = () => URL.revokeObjectURL(url);
    }
  } catch {
    showToast('Playback Error', 'Could not play recording.', 'error');
  }
}

/* ── Download ─────────────────────────────────── */
async function downloadRecording(id) {
  try {
    const recordings = await getRecordings();
    const rec = recordings.find((r) => r.id === id);
    if (!rec || !rec.blob) { showToast('Error', 'Recording not found.', 'error'); return; }

    const ext = rec.type === 'video' ? 'webm' : 'webm';
    const filename = `safeher_${rec.type}_${new Date(rec.timestamp).toISOString().slice(0, 19).replace(/[T:]/g, '-')}.${ext}`;
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded', `${filename}`, 'success');
  } catch {
    showToast('Download Error', 'Could not download recording.', 'error');
  }
}

/* ── Helpers ──────────────────────────────────── */
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

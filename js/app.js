/* ═══════════════════════════════════════════════
   SafeHer — App Entry Point
   Shared AppState, navigation, quick actions,
   keyboard shortcuts, module init
   ═══════════════════════════════════════════════ */

import * as safeMode from './safeMode.js';
import * as sosButton from './sosButton.js';
import * as motionDetect from './motionDetect.js';
import * as voiceDetect from './voiceDetect.js';
import { initContactsUI } from './contacts.js';
import * as recorder from './recorder.js';
import { initMap, shareLocation, refreshMap } from './mapJourney.js';
import { showToast, showFakeCall, hideFakeCall } from './alerts.js';

/* ══════════════════════════════════════════
   SHARED APP STATE
   Imported by each module via setAppState()
   ══════════════════════════════════════════ */
const AppState = {
  safeMode: false,
  sosActive: false,
  emergencyActive: false,
  isRecording: false,
  threatScore: 0
};

/* ══════════════════════════════════════════
   DOM READY
   ══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* ── Inject AppState into every module ── */
  safeMode.setAppState(AppState);
  sosButton.setAppState(AppState);
  motionDetect.setAppState(AppState);
  voiceDetect.setAppState(AppState);
  recorder.setAppState(AppState);

  /* ── Screen navigation ── */
  initNavigation();

  /* ── Module init ── */
  safeMode.init();
  sosButton.init();
  initContactsUI();
  recorder.init();

  /* ── Quick actions ── */
  wireQuickActions();

  /* ── Journey buttons ── */
  wireJourney();

  /* ── Keyboard shortcuts ── */
  wireKeyboardShortcuts();

  /* ── Service Worker ── */
  registerSW();

  /* ── First paint status ── */
  if (!AppState.safeMode) {
    import('./alerts.js').then(({ updateHeaderStatus, updateStatusCard }) => {
      updateHeaderStatus('watching', 'Stay Alert 🚶‍♀️');
      updateStatusCard('watching', 'Stay Alert 🚶‍♀️', 'Motion & voice detection active.');
    });
  }
});

/* ══════════════════════════════════════════
   SCREEN NAVIGATION
   ══════════════════════════════════════════ */
function initNavigation() {
  const btns = document.querySelectorAll('.nav-btn');
  const screens = document.querySelectorAll('.screen');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;

      // Update nav buttons
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show target screen, hide others (use active class, remove hidden)
      screens.forEach(s => {
        if (s.id === `screen-${target}`) {
          s.classList.add('active');
          s.classList.remove('hidden');
        } else {
          s.classList.remove('active');
          s.classList.remove('hidden');
        }
      });

      // Lazy inits per tab
      if (target === 'journey') {
        setTimeout(() => { initMap(); refreshMap(); }, 150);
      }
      if (target === 'contacts') {
        import('./contacts.js').then(m => m.renderContacts());
      }
      if (target === 'recordings') {
        recorder.renderRecordings();
      }
    });
  });
}

/* ══════════════════════════════════════════
   QUICK ACTIONS
   ══════════════════════════════════════════ */
function wireQuickActions() {
  // Fake Call
  const btnFakeCall = document.getElementById('btn-fake-call');
  if (btnFakeCall) btnFakeCall.addEventListener('click', () => showFakeCall());

  // Quick Record
  const btnRecord = document.getElementById('btn-quick-record');
  if (btnRecord) {
    btnRecord.addEventListener('click', () => {
      if (recorder.isRecording()) {
        recorder.stopRecording();
        showToast('Recording stopped', 'info');
      } else {
        recorder.startRecording('manual');
        showToast('Recording started', 'success');
      }
    });
  }

  // Share Location
  const btnShareLoc = document.getElementById('btn-share-location');
  if (btnShareLoc) btnShareLoc.addEventListener('click', () => shareLocation());

  // Quick Siren
  let sirenOn = false;
  const btnSiren = document.getElementById('btn-quick-siren');
  if (btnSiren) {
    btnSiren.addEventListener('click', async () => {
      const { playSiren, stopSiren } = await import('./alerts.js');
      if (!sirenOn) { playSiren(); sirenOn = true; showToast('🔊 Siren ON', 'warning'); }
      else { stopSiren(); sirenOn = false; showToast('Siren off', 'info'); }
    });
  }
}

/* ══════════════════════════════════════════
   JOURNEY BUTTONS
   ══════════════════════════════════════════ */
function wireJourney() {
  // Journey start / stop buttons are wired inside mapJourney.initMap()
  // Here we only wire the share button on the journey screen
  const shareBtn = document.getElementById('btn-share-journey');
  if (shareBtn) shareBtn.addEventListener('click', () => shareLocation());
}

/* ══════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ══════════════════════════════════════════ */
function wireKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl + Shift + S → SOS
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      document.getElementById('btn-sos')?.click();
    }
    // Ctrl + Shift + F → Fake Call
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      showFakeCall();
    }
    // Escape → close overlays
    if (e.key === 'Escape') {
      hideFakeCall();
    }
  });
}

/* ══════════════════════════════════════════
   SERVICE WORKER
   ══════════════════════════════════════════ */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('[SW] registered', reg.scope))
      .catch(err => console.warn('[SW] registration failed', err));
  }
}

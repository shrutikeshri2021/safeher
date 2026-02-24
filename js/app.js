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
import * as history from './history.js';
import { logEvent } from './historyLogger.js';
import * as batteryWatch from './batteryWatch.js';

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
  batteryWatch.setAppState(AppState);

  /* ── Screen navigation ── */
  initNavigation();

  /* ── Module init ── */
  safeMode.init();
  sosButton.init();
  initContactsUI();
  recorder.init();
  history.init();
  batteryWatch.init();

  /* ── Theme (light / dark) ── */
  initTheme();

  /* ── Micro-interactions (ripple, haptics, scroll reveal) ── */
  initMicroInteractions();

  /* ── Log app opened (once per session) ── */
  logEvent('app_opened').catch(() => {});

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
  const btns    = document.querySelectorAll('.nav-btn');
  const screens = document.querySelectorAll('.screen');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;

      /* ── Update nav button highlight ── */
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      /* ── Switch screens: remove hidden + toggle active ── */
      screens.forEach(s => {
        s.classList.remove('hidden');          // never let hidden stick
        if (s.id === `screen-${target}`) {
          s.classList.add('active');
          s.style.display = 'block';          // belt-and-suspenders
        } else {
          s.classList.remove('active');
          s.style.display = '';                // revert to CSS rule
        }
      });

      /* ── Per-tab lazy init / refresh ── */
      if (target === 'journey') {
        setTimeout(() => { initMap(); refreshMap(); }, 150);
      }
      if (target === 'contacts') {
        import('./contacts.js').then(m => m.renderContacts());
      }
      if (target === 'recordings') {
        recorder.renderRecordings();
      }
      if (target === 'history') {
        history.refreshHistory();
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
  // All journey buttons are wired inside mapJourney.initMap()
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

/* ══════════════════════════════════════════
   THEME SWITCHER  (light / dark)
   Persists to localStorage, updates meta
   theme-color for mobile status bar.
   ══════════════════════════════════════════ */
function initTheme() {
  const saved = localStorage.getItem('safeher_theme');
  const theme = saved || 'dark';   // default dark
  applyTheme(theme);

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('safeher_theme', next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const knob = document.getElementById('theme-knob');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (knob) knob.textContent = theme === 'light' ? '☀️' : '🌙';
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F7F0FF' : '#070B14');
}

/* ══════════════════════════════════════════
   MICRO-INTERACTIONS
   Button haptics + ripple + scroll reveal
   ══════════════════════════════════════════ */
function initMicroInteractions() {
  /* Haptic feedback on all buttons */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .action-card, .record-btn, .hist-chip, .nav-btn');
    if (btn && navigator.vibrate) navigator.vibrate(6);
  });

  /* Ripple effect on buttons */
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .action-card, .nav-btn, .record-btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute; border-radius:50%;
      background:rgba(255,255,255,0.18);
      width:20px; height:20px;
      left:${e.clientX - rect.left}px;
      top:${e.clientY - rect.top}px;
      pointer-events:none;
      animation: ripple 0.5s ease-out forwards;
    `;
    btn.style.position = btn.style.position || 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 550);
  });

  /* Scroll reveal for cards */
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.style.animation = `scrollReveal 0.5s ${i * 80}ms cubic-bezier(0.34,1.56,0.64,1) forwards`;
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    /* Observe cards after short delay to let DOM settle */
    setTimeout(() => {
      document.querySelectorAll('.feature-card, .contact-card, .recording-card, .hist-event-card, .stat-item, .waypoint-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        revealObserver.observe(el);
      });
    }, 300);
  }
}

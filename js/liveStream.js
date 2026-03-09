/* ═══════════════════════════════════════════════
   SafeHer — Feature 12: Live Video Stream
   WebRTC via PeerJS — share camera with watchers
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  console.log('[LiveStream] Module loading...');

  const LiveStream = {
    peer: null,
    localStream: null,
    isStreaming: false,
    peerId: null,
    activeCalls: [],

    /* Start streaming camera */
    async start() {
      try {
        console.log('[LiveStream] Starting stream...');
        if (this.isStreaming) { console.log('[LiveStream] Already streaming'); return; }

        if (typeof Peer === 'undefined') {
          console.error('[LiveStream] PeerJS not loaded');
          if (window.showToast) window.showToast('⚠️ PeerJS not available', 'error');
          return;
        }

        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
        console.log('[LiveStream] Camera access granted');

        const preview = document.getElementById('stream-preview');
        if (preview) { preview.srcObject = this.localStream; preview.play().catch(() => {}); }

        this.peer = new Peer();

        this.peer.on('open', (id) => {
          try {
            this.peerId = id;
            this.isStreaming = true;
            console.log('[LiveStream] ✅ Peer ID:', id);

            const bar = document.getElementById('stream-bar');
            if (bar) bar.classList.remove('hidden');
            const idSpan = document.getElementById('stream-peer-id');
            if (idSpan) idSpan.textContent = id;
            const statusSpan = document.getElementById('stream-status-text');
            if (statusSpan) statusSpan.textContent = '🔴 LIVE';

            const watchUrl = window.location.origin +
              window.location.pathname.replace(/index\.html$/, '') + 'watch.html?id=' + id;
            const linkEl = document.getElementById('stream-watch-link');
            if (linkEl) { linkEl.href = watchUrl; linkEl.textContent = 'Share Watch Link'; }

            if (window.showToast) window.showToast('📹 Live stream started!', 'success');
          } catch (err) {
            console.error('[LiveStream] peer.on(open) error:', err);
          }
        });

        this.peer.on('call', (call) => {
          try {
            console.log('[LiveStream] Incoming viewer call from:', call.peer);
            call.answer(this.localStream);
            this.activeCalls.push(call);
            const countEl = document.getElementById('stream-viewer-count');
            if (countEl) countEl.textContent = this.activeCalls.length;

            call.on('close', () => {
              this.activeCalls = this.activeCalls.filter(c => c !== call);
              if (countEl) countEl.textContent = this.activeCalls.length;
            });
          } catch (err) {
            console.error('[LiveStream] peer.on(call) error:', err);
          }
        });

        this.peer.on('error', (err) => {
          console.error('[LiveStream] Peer error:', err);
        });

      } catch (err) {
        console.error('[LiveStream] start() error:', err);
        if (err.name === 'NotAllowedError') {
          if (window.showToast) window.showToast('⚠️ Camera access denied', 'error');
        } else {
          if (window.showToast) window.showToast('⚠️ Stream failed: ' + err.message, 'error');
        }
      }
    },

    /* Stop streaming */
    stop() {
      try {
        console.log('[LiveStream] Stopping stream...');
        this.isStreaming = false;

        this.activeCalls.forEach(call => { try { call.close(); } catch (_) {} });
        this.activeCalls = [];

        if (this.localStream) {
          this.localStream.getTracks().forEach(t => t.stop());
          this.localStream = null;
        }

        if (this.peer) { this.peer.destroy(); this.peer = null; }
        this.peerId = null;

        const bar = document.getElementById('stream-bar');
        if (bar) bar.classList.add('hidden');
        const preview = document.getElementById('stream-preview');
        if (preview) preview.srcObject = null;
        const statusSpan = document.getElementById('stream-status-text');
        if (statusSpan) statusSpan.textContent = 'Off';

        console.log('[LiveStream] ✅ Stream stopped');
        if (window.showToast) window.showToast('📹 Stream stopped', 'info');
      } catch (err) {
        console.error('[LiveStream] stop() error:', err);
      }
    },

    toggle() {
      if (this.isStreaming) this.stop();
      else this.start();
    },

    copyWatchLink() {
      try {
        if (!this.peerId) { if (window.showToast) window.showToast('⚠️ Start stream first', 'warning'); return; }
        const watchUrl = window.location.origin +
          window.location.pathname.replace(/index\.html$/, '') + 'watch.html?id=' + this.peerId;
        navigator.clipboard.writeText(watchUrl).then(() => {
          if (window.showToast) window.showToast('📋 Watch link copied!', 'success');
        });
      } catch (err) {
        console.error('[LiveStream] copyWatchLink() error:', err);
      }
    },

    async shareToContacts() {
      try {
        if (!this.peerId) return;
        const watchUrl = window.location.origin +
          window.location.pathname.replace(/index\.html$/, '') + 'watch.html?id=' + this.peerId;
        const message = '🔴 LIVE STREAM — Watch my live safety camera:\n' + watchUrl;
        if (navigator.share) {
          await navigator.share({ title: 'SafeHer Live Stream', text: message, url: watchUrl });
        } else {
          await navigator.clipboard.writeText(message);
          if (window.showToast) window.showToast('📋 Stream link copied!', 'success');
        }
      } catch (err) {
        console.error('[LiveStream] shareToContacts() error:', err);
      }
    },

    init() {
      try {
        const btnToggle = document.getElementById('btn-live-stream');
        if (btnToggle) btnToggle.addEventListener('click', () => this.toggle());

        const btnCopy = document.getElementById('btn-copy-stream-link');
        if (btnCopy) btnCopy.addEventListener('click', () => this.copyWatchLink());

        const btnShare = document.getElementById('btn-share-stream');
        if (btnShare) btnShare.addEventListener('click', () => this.shareToContacts());

        const btnStop = document.getElementById('btn-stop-stream');
        if (btnStop) btnStop.addEventListener('click', () => this.stop());

        console.log('[LiveStream] ✅ Module initialized');
      } catch (err) {
        console.error('[LiveStream] init() error:', err);
      }
    }
  };

  window.LiveStream = LiveStream;
})();

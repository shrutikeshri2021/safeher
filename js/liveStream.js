const LiveStream = {
  peer: null,
  stream: null,
  active: false,
  peerId: null,
  watchBase: window.location.origin,

  async start() {
    try {
      console.log('[Stream] Starting...');

      // STEP 1: Get camera FIRST before anything else
      // This is the most common failure point
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: true
        });
        console.log('[Stream] ✅ Got back camera');
      } catch(e1) {
        console.warn('[Stream] Back camera failed, trying front:', e1.message);
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true
          });
          console.log('[Stream] ✅ Got front camera');
        } catch(e2) {
          console.warn('[Stream] Front camera failed, video only:', e2.message);
          try {
            this.stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            console.log('[Stream] ✅ Got camera (no audio)');
          } catch(e3) {
            console.error('[Stream] All camera attempts failed:', e3.message);
            showToast('❌ Camera permission denied. Allow camera and try again.', 'error');
            return null;
          }
        }
      }

      // Verify stream has video
      const videoTracks = this.stream.getVideoTracks();
      console.log('[Stream] Video tracks:', videoTracks.length);
      if (videoTracks.length === 0) {
        showToast('❌ No video track found', 'error');
        return null;
      }
      console.log('[Stream] Track state:', videoTracks[0].readyState);

      // STEP 2: Load PeerJS
      if (typeof Peer === 'undefined') {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
          setTimeout(() => reject(new Error('PeerJS load timeout')), 10000);
        });
      }

      // STEP 3: Create peer with unique ID
      this.peerId = 'sh-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      
      this.peer = new Peer(this.peerId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        path: '/',
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      // STEP 4: Wait for peer to open
      await new Promise((resolve, reject) => {
        this.peer.on('open', (id) => {
          console.log('[Stream] ✅ Peer open, ID:', id);
          resolve(id);
        });
        this.peer.on('error', (err) => {
          console.error('[Stream] Peer error:', err);
          reject(err);
        });
        setTimeout(() => reject(new Error('Peer connection timeout')), 15000);
      });

      // STEP 5: Answer incoming calls WITH our real stream
      this.peer.on('call', (call) => {
        console.log('[Stream] Incoming call from viewer, answering with stream...');
        
        // Answer WITH the real stream — this is the critical fix
        call.answer(this.stream);
        
        call.on('stream', (remoteStream) => {
          // Viewer's stream (usually empty) — ignore
          console.log('[Stream] Got remote stream from viewer (expected empty)');
        });
        
        call.on('error', (err) => {
          console.error('[Stream] Call error:', err);
        });
        
        call.on('close', () => {
          console.log('[Stream] Viewer disconnected');
        });
        
        console.log('[Stream] ✅ Answered call with video stream');
      });

      // STEP 6: Build watch URL
      const watchUrl = this.watchBase + '/watch.html?id=' + this.peerId;
      this.active = true;

      // Show preview of own camera (so streamer sees it's working)
      this.showPreview();

      // Update UI
      this.updateBar(watchUrl);
      this.updateBtn(true);

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(watchUrl);
        showToast('🔴 LIVE! Watch link copied to clipboard', 'success');
      } catch(e) {
        showToast('🔴 LIVE! Copy link from the bar above', 'success');
      }

      console.log('[Stream] ✅ Watch URL:', watchUrl);
      return watchUrl;

    } catch(e) {
      console.error('[Stream] Start failed:', e.message);
      showToast('❌ Stream failed: ' + e.message, 'error');
      this.cleanup();
      return null;
    }
  },

  showPreview() {
    // Show small camera preview to confirm stream is working
    let preview = document.getElementById('stream-preview');
    if (!preview) {
      preview = document.createElement('video');
      preview.id = 'stream-preview';
      preview.autoplay = true;
      preview.muted = true; // muted so no echo
      preview.playsInline = true;
      preview.style.cssText = `
        position: fixed;
        bottom: 84px;
        right: 12px;
        width: 120px;
        height: 90px;
        border-radius: 10px;
        object-fit: cover;
        z-index: 500;
        border: 2px solid #FF2D55;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        background: #000;
      `;
      document.body.appendChild(preview);
    }
    preview.srcObject = this.stream;
    preview.style.display = 'block';
    console.log('[Stream] ✅ Preview showing');
  },

  stop() {
    try {
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(t => {
          t.stop();
          console.log('[Stream] Stopped track:', t.kind);
        });
        this.stream = null;
      }

      // Destroy peer
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      // Hide preview
      const preview = document.getElementById('stream-preview');
      if (preview) preview.style.display = 'none';

      this.active = false;
      this.peerId = null;
      this.updateBtn(false);
      this.updateBar(null);
      console.log('[Stream] ✅ Stopped');

    } catch(e) {
      console.error('[Stream] Stop error:', e.message);
    }
  },

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.active = false;
  },

  async toggle() {
    if (this.active) {
      this.stop();
    } else {
      await this.start();
    }
  },

  updateBar(url) {
    const bar = document.getElementById('stream-bar');
    if (!bar) return;
    if (!url) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'block';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;
        justify-content:space-between;gap:8px">
        <span style="color:white;font-size:0.78rem;
          font-weight:600">🔴 LIVE</span>
        <span style="color:rgba(255,255,255,0.8);
          font-size:0.7rem;flex:1;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap">${url}</span>
        <button onclick="navigator.clipboard.writeText('${url}')
          .then(()=>showToast('✅ Link copied!','success'))"
          style="background:rgba(255,255,255,0.2);border:none;
          color:white;padding:4px 10px;border-radius:6px;
          font-size:0.72rem;cursor:pointer;white-space:nowrap;
          font-weight:600">Copy</button>
        <button onclick="window.open('https://wa.me/?text='+
          encodeURIComponent('🔴 Watch me live: ${url}'),'_blank')"
          style="background:rgba(37,211,102,0.3);border:none;
          color:white;padding:4px 10px;border-radius:6px;
          font-size:0.72rem;cursor:pointer;white-space:nowrap;
          font-weight:600">WA</button>
      </div>`;
  },

  updateBtn(live) {
    const label = document.querySelector('#stream-btn .qa-label');
    const icon = document.querySelector('#stream-btn .qa-icon');
    if (label) label.textContent = live ? 'Stop Stream' : 'Live Stream';
    if (icon) icon.style.background = live 
      ? 'rgba(255,45,85,0.2)' 
      : 'rgba(10,132,255,0.12)';
  }
};
window.LiveStream = LiveStream;

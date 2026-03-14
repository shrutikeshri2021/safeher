const LiveStream = {
  peer: null,
  stream: null,
  active: false,
  peerId: null,
  watchBase: window.location.origin,

  async start() {
    try {
      console.log('[🔴Stream] Starting stream...');

      if (this.active) {
        console.log('[Stream] Already streaming');
        return null;
      }

      // STEP 1: Get camera FIRST before anything else
      try {
        console.log('[Stream] Requesting back camera...');
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
          audio: true
        });
        console.log('[Stream] ✅ Got back camera');
      } catch(e1) {
        console.warn('[Stream] Back camera failed:', e1.message);
        try {
          console.log('[Stream] Requesting front camera...');
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true
          });
          console.log('[Stream] ✅ Got front camera');
        } catch(e2) {
          console.warn('[Stream] Front camera failed:', e2.message);
          try {
            console.log('[Stream] Requesting any video...');
            this.stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            console.log('[Stream] ✅ Got camera (no audio)');
          } catch(e3) {
            console.error('[Stream] ❌ All camera attempts failed:', e3.message);
            const msg = '❌ Camera access denied. Go to Settings > Allow camera access.';
            if (window.showToast) window.showToast(msg, 'error');
            alert(msg);
            return null;
          }
        }
      }

      // Verify stream has video
      const videoTracks = this.stream.getVideoTracks();
      console.log('[Stream] Video tracks found:', videoTracks.length);
      if (videoTracks.length === 0) {
        console.error('[Stream] ❌ No video tracks in stream');
        if (window.showToast) window.showToast('❌ No video track found', 'error');
        return null;
      }
      console.log('[Stream] Track ready state:', videoTracks[0].readyState);

      // STEP 2: Generate unique peer ID
      this.peerId = 'sh-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      console.log('[Stream] Generated peer ID:', this.peerId);

      // STEP 3: Create peer connection
      console.log('[Stream] Creating PeerJS connection...');
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
        const timeout = setTimeout(() => {
          reject(new Error('Peer connection timeout (15s)'));
        }, 15000);

        this.peer.on('open', (id) => {
          clearTimeout(timeout);
          console.log('[Stream] ✅ Peer opened with ID:', id);
          resolve(id);
        });

        this.peer.on('error', (err) => {
          clearTimeout(timeout);
          console.error('[Stream] ❌ Peer error:', err);
          reject(err);
        });
      });

      // STEP 5: Handle incoming calls from viewers
      this.peer.on('call', (call) => {
        console.log('[Stream] 📞 Incoming call from viewer:', call.peer);
        
        // Answer WITH the real stream — this is CRITICAL
        call.answer(this.stream);
        console.log('[Stream] ✅ Answered call with video stream');
        
        call.on('error', (err) => {
          console.error('[Stream] Call error:', err);
        });
        
        call.on('close', () => {
          console.log('[Stream] Viewer disconnected:', call.peer);
        });
      });

      this.peer.on('error', (err) => {
        console.error('[Stream] ❌ Peer error event:', err.type, err.message);
      });

      // STEP 6: Build watch URL
      const watchUrl = this.watchBase + '/watch.html?id=' + this.peerId;
      this.active = true;

      console.log('[Stream] ✅ Watch URL:', watchUrl);

      // Show preview
      this.showPreview();

      // Update UI
      this.updateBar(watchUrl);
      this.updateBtn(true);

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(watchUrl);
        if (window.showToast) window.showToast('🔴 LIVE! Watch link copied to clipboard', 'success');
      } catch(e) {
        if (window.showToast) window.showToast('🔴 LIVE! Copy link from bar above', 'success');
      }

      return watchUrl;

    } catch(e) {
      console.error('[Stream] ❌ Start failed:', e.message, e);
      if (window.showToast) window.showToast('❌ Stream failed: ' + e.message, 'error');
      this.cleanup();
      return null;
    }
  },

  showPreview() {
    console.log('[Stream] Showing preview...');
    let preview = document.getElementById('stream-preview');
    
    if (!preview) {
      preview = document.createElement('video');
      preview.id = 'stream-preview';
      preview.autoplay = true;
      preview.muted = true;
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
      console.log('[Stream] Created preview element');
    }
    
    preview.srcObject = this.stream;
    preview.play().then(() => {
      console.log('[Stream] ✅ Preview playing');
    }).catch(err => {
      console.warn('[Stream] Preview play error:', err.message);
    });
    preview.style.display = 'block';
  },

  stop() {
    try {
      console.log('[Stream] Stopping stream...');

      if (this.stream) {
        this.stream.getTracks().forEach(t => {
          t.stop();
          console.log('[Stream] Stopped track:', t.kind);
        });
        this.stream = null;
      }

      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
        console.log('[Stream] Peer destroyed');
      }

      const preview = document.getElementById('stream-preview');
      if (preview) preview.style.display = 'none';

      this.active = false;
      this.peerId = null;
      this.updateBtn(false);
      this.updateBar(null);
      
      console.log('[Stream] ✅ Stream stopped');
      if (window.showToast) window.showToast('⏹️ Stream stopped', 'info');

    } catch(e) {
      console.error('[Stream] ❌ Stop error:', e.message);
    }
  },

  cleanup() {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
      this.active = false;
    } catch(e) {
      console.error('[Stream] Cleanup error:', e);
    }
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
    if (!bar) {
      console.warn('[Stream] stream-bar element not found');
      return;
    }
    
    if (!url) {
      bar.style.display = 'none';
      return;
    }
    
    bar.style.display = 'block';
    bar.innerHTML = `
      <div style="display:flex;align-items:center;
        justify-content:space-between;gap:8px;padding:10px">
        <span style="color:white;font-size:0.78rem;
          font-weight:600;white-space:nowrap">🔴 LIVE</span>
        <span style="color:rgba(255,255,255,0.8);
          font-size:0.7rem;flex:1;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap;font-family:monospace">${url}</span>
        <button onclick="navigator.clipboard.writeText('${url}')
          .then(()=>{if(window.showToast)window.showToast('✅ Link copied!','success')})"
          style="background:rgba(255,255,255,0.2);border:none;
          color:white;padding:4px 10px;border-radius:6px;
          font-size:0.72rem;cursor:pointer;white-space:nowrap;
          font-weight:600">Copy</button>
      </div>`;
  },

  updateBtn(live) {
    const btn = document.getElementById('btn-live-stream');
    if (!btn) {
      console.warn('[Stream] btn-live-stream element not found');
      return;
    }
    
    const label = btn.querySelector('.qa-label');
    const icon = btn.querySelector('.qa-icon');
    
    if (label) label.textContent = live ? 'Stop' : 'Live Stream';
    if (icon) icon.style.background = live 
      ? 'rgba(255,45,85,0.3)' 
      : 'rgba(10,132,255,0.12)';
  },

  init() {
    console.log('[Stream] Initializing LiveStream module...');
    
    const btn = document.getElementById('btn-live-stream');
    if (!btn) {
      console.error('[Stream] ❌ btn-live-stream not found in DOM');
      return;
    }

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Stream] Button clicked!');
      await this.toggle();
    });

    console.log('[Stream] ✅ Module initialized - ready to stream');
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Stream] DOMContentLoaded - initializing');
    LiveStream.init();
  });
} else {
  console.log('[Stream] DOM already loaded - initializing immediately');
  LiveStream.init();
}

window.LiveStream = LiveStream;

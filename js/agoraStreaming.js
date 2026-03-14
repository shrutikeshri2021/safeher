/* ═══════════════════════════════════════════════
   SafeHer — Feature 43: Agora.io Live Streaming
   Real-time shareable video stream with browser link
   ═══════════════════════════════════════════════ */

export class AgoraStreaming {
  constructor() {
    this.client = null;
    this.localTracks = { videoTrack: null, audioTrack: null };
    this.remoteUsers = {};
    this.channelName = '';
    this.uid = Math.floor(Math.random() * 100000);
    this.isStreaming = false;
    this.agoraAppId = null; // User must set this via setAppId()
  }

  /**
   * Initialize Agora - call this ONCE at app startup
   * User gets free App ID from https://console.agora.io
   */
  async init(appId) {
    try {
      if (!appId) {
        console.error('❌ Agora App ID required. Get free one at https://console.agora.io');
        return false;
      }

      this.agoraAppId = appId;

      // Load Agora SDK from CDN (add to index.html)
      if (!window.AgoraRTC) {
        await this.loadAgoraSDK();
      }

      // Create RTC client in "live" mode (broadcaster/audience)
      this.client = AgoraRTC.createClient({
        mode: 'live',
        codec: 'h264'
      });

      // Event handlers
      this.client.on('user-published', this.handleUserPublished.bind(this));
      this.client.on('user-unpublished', this.handleUserUnpublished.bind(this));
      this.client.on('user-joined', (user) => {
        console.log(`📍 User joined: ${user.uid}`);
      });
      this.client.on('user-left', (user) => {
        console.log(`👋 User left: ${user.uid}`);
      });

      console.log('✅ Agora initialized');
      return true;
    } catch (error) {
      console.error('❌ Agora init error:', error);
      return false;
    }
  }

  /**
   * Load Agora SDK from CDN
   */
  loadAgoraSDK() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Agora SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Start broadcasting (as emergency broadcaster)
   * @param {string} roomId - Unique room identifier (e.g., uuid or emergency id)
   * @param {HTMLElement} videoContainer - Container for local video
   */
  async startBroadcasting(roomId, videoContainer) {
    try {
      if (!this.agoraAppId) {
        throw new Error('Agora not initialized. Call init(appId) first.');
      }

      this.channelName = roomId;

      // Set as broadcaster
      await this.client.setClientRole('host');

      // Join channel
      await this.client.join(this.agoraAppId, this.channelName, null, this.uid);

      // Create and publish local tracks
      this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

      await this.client.publish([
        this.localTracks.audioTrack,
        this.localTracks.videoTrack
      ]);

      // Play local video
      this.localTracks.videoTrack.play(videoContainer);

      this.isStreaming = true;
      console.log(`🔴 Broadcasting started. Room: ${roomId}`);
      console.log(`📡 Share this link: ${window.location.origin}${window.location.pathname}?stream=${roomId}`);

      return {
        success: true,
        roomId,
        shareLink: `${window.location.origin}${window.location.pathname}?stream=${roomId}`
      };
    } catch (error) {
      console.error('❌ Broadcasting error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join as viewer (audience member)
   * @param {string} roomId - Room to watch
   * @param {HTMLElement} videoContainer - Container for remote video
   */
  async joinAsViewer(roomId, videoContainer) {
    try {
      if (!this.agoraAppId) {
        throw new Error('Agora not initialized.');
      }

      this.channelName = roomId;

      // Set as audience
      await this.client.setClientRole('audience');

      // Join channel
      await this.client.join(this.agoraAppId, this.channelName, null, this.uid);

      console.log(`👁️ Joined as viewer. Watching: ${roomId}`);

      return { success: true, roomId };
    } catch (error) {
      console.error('❌ Viewer join error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle remote user publishing video/audio
   */
  async handleUserPublished(user, mediaType) {
    try {
      await this.client.subscribe(user, mediaType);

      if (mediaType === 'video') {
        // Get or create video container for remote user
        let remoteVideoDiv = document.getElementById(`remote-user-${user.uid}`);
        if (!remoteVideoDiv) {
          remoteVideoDiv = document.createElement('div');
          remoteVideoDiv.id = `remote-user-${user.uid}`;
          remoteVideoDiv.style.cssText =
            'width: 100%; height: 100%; border-radius: 12px; overflow: hidden; background: #000;';
          document.getElementById('remote-video-container')?.appendChild(remoteVideoDiv);
        }
        user.videoTrack.play(remoteVideoDiv);
      }

      if (mediaType === 'audio') {
        user.audioTrack.play();
      }

      this.remoteUsers[user.uid] = user;
      console.log(`📺 Remote user video published: ${user.uid}`);
    } catch (error) {
      console.error('❌ Subscribe error:', error);
    }
  }

  /**
   * Handle remote user unpublishing
   */
  handleUserUnpublished(user, mediaType) {
    if (mediaType === 'video') {
      user.videoTrack.stop();
      const videoDiv = document.getElementById(`remote-user-${user.uid}`);
      if (videoDiv) videoDiv.remove();
    }
    delete this.remoteUsers[user.uid];
    console.log(`🎬 Remote user unpublished: ${user.uid}`);
  }

  /**
   * Stop broadcasting and leave channel
   */
  async stopStreaming() {
    try {
      // Stop and close local tracks
      if (this.localTracks.audioTrack) {
        this.localTracks.audioTrack.stop();
        this.localTracks.audioTrack.close();
      }
      if (this.localTracks.videoTrack) {
        this.localTracks.videoTrack.stop();
        this.localTracks.videoTrack.close();
      }

      // Leave channel
      await this.client.leave();

      this.isStreaming = false;
      this.localTracks = { videoTrack: null, audioTrack: null };
      console.log('⏹️ Stream stopped');
      return { success: true };
    } catch (error) {
      console.error('❌ Stop stream error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate shareable stream link
   */
  getShareLink() {
    if (!this.channelName) return null;
    return `${window.location.origin}${window.location.pathname}?stream=${this.channelName}`;
  }

  /**
   * Get room ID from URL params (for viewers)
   */
  static getRoomFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('stream');
  }

  /**
   * Check if currently streaming
   */
  isLive() {
    return this.isStreaming;
  }

  /**
   * Get active viewers count
   */
  getViewerCount() {
    return Object.keys(this.remoteUsers).length;
  }
}

// Export as global for easy access
window.AgoraStreaming = AgoraStreaming;

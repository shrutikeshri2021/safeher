/* ═══════════════════════════════════════════════
   SafeHer — Feature 6: Network-Aware Smart Alert Routing
   Detects connection quality and skips heavy features
   (live video stream) on slow connections so the critical
   SOS alert always gets through — even on 2G.
   Uses Network Information API — built into Chrome on Android.
   ═══════════════════════════════════════════════ */

/**
 * getNetworkInfo()
 * Returns current network quality details.
 * Falls back to assume 4G when API is not available.
 */
export function getNetworkInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    // API not supported — assume good connection, send everything
    return {
      type: 'unknown',
      effectiveType: '4g',
      downlink: null,
      saveData: false,
      canStream: true,
      canSendEmail: true,
      canSendSMS: true
    };
  }

  return {
    type: connection.type,                     // wifi, cellular, none
    effectiveType: connection.effectiveType,   // slow-2g, 2g, 3g, 4g
    downlink: connection.downlink,             // Mbps
    saveData: connection.saveData,             // user has data saver on
    canStream: connection.effectiveType === '4g' && !connection.saveData,
    canSendEmail: connection.effectiveType !== 'slow-2g',
    canSendSMS: true // SMS always works, it's native device
  };
}

/**
 * getAlertStrategy()
 * Returns an object describing which alert channels to use
 * based on current network quality.
 */
export function getAlertStrategy() {
  const net = getNetworkInfo();

  if (net.effectiveType === 'slow-2g' || net.type === 'none') {
    return {
      strategy: 'minimal',
      sendSMS: true,
      sendEmail: false,
      startVideoStream: false,
      startRecording: true,          // local recording always
      skipSnapshot: true,            // skip camera snapshot upload
      message: '⚠️ Weak connection — SMS alert sent. Email and video stream skipped.'
    };
  }

  if (net.effectiveType === '2g') {
    return {
      strategy: 'essential',
      sendSMS: true,
      sendEmail: true,
      startVideoStream: false,
      startRecording: true,
      skipSnapshot: true,
      message: '⚠️ Slow connection — SMS + Email sent. Video stream skipped to save bandwidth.'
    };
  }

  if (net.effectiveType === '3g') {
    return {
      strategy: 'standard',
      sendSMS: true,
      sendEmail: true,
      startVideoStream: false,       // 3G may not sustain stream
      startRecording: true,
      skipSnapshot: false,
      message: null
    };
  }

  // 4G or WiFi — full everything
  return {
    strategy: 'full',
    sendSMS: true,
    sendEmail: true,
    startVideoStream: true,
    startRecording: true,
    skipSnapshot: false,
    message: null
  };
}

/**
 * listenForNetworkChange(callback)
 * Register a callback that fires whenever network quality changes.
 */
export function listenForNetworkChange(onChangeCallback) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    connection.addEventListener('change', () => {
      const info = getNetworkInfo();
      console.log('[NetworkRouter] Network changed:', info.effectiveType, info.type);
      onChangeCallback(info);
    });
    console.log('[NetworkRouter] ✅ Network change listener attached');
  }
}

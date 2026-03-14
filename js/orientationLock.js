/* ═══════════════════════════════════════════════
   SafeHer — Feature 5: Screen Orientation Lock
   Locks screen to portrait during active SOS so
   recording never rotates and SOS UI stays visible.
   ═══════════════════════════════════════════════ */

/**
 * lockPortrait()
 * Lock screen to portrait orientation for SOS.
 * Non-critical — fails silently if unsupported.
 */
export async function lockPortrait() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('portrait');
      console.log('[OrientationLock] ✅ Screen locked to portrait for SOS');
    }
  } catch (error) {
    // Non-critical — many desktop browsers and some mobile browsers
    // don't support orientation lock. Fail silently.
    console.warn('[OrientationLock] Screen orientation lock not supported:', error.message);
  }
}

/**
 * unlockOrientation()
 * Release the portrait lock when SOS ends.
 */
export async function unlockOrientation() {
  try {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
      console.log('[OrientationLock] ✅ Screen orientation unlocked');
    }
  } catch (error) {
    console.warn('[OrientationLock] Screen orientation unlock failed:', error.message);
  }
}

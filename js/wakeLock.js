/* ═══════════════════════════════════════════════
   SafeHer — Wake Lock Manager  (Feature 1)
   Keeps the screen awake during SOS, Journey,
   and active recordings.

   Primary: Screen Wake Lock API (Chrome 84+)
   Fallback: NoSleep.js (plays invisible video)
   ═══════════════════════════════════════════════ */

let wakeLockSentinel = null;
let noSleepVideo = null;
let noSleepEnabled = false;
let wakeLockActive = false;
let acquireCount = 0;            // ref-count so multiple callers don't clash

/* ══════════════════════════════════════════
   acquire()  — request a screen wake lock
   Ref-counted: first caller acquires, later
   callers just increment the counter.
   ══════════════════════════════════════════ */
export async function acquire(reason = 'unknown') {
  try {
    acquireCount++;
    console.log(`[WakeLock] acquire() called — reason: ${reason}, refCount: ${acquireCount}`);

    if (wakeLockActive) {
      console.log('[WakeLock] Already active, incremented ref count');
      return true;
    }

    /* ── Try native Wake Lock API first ── */
    if ('wakeLock' in navigator) {
      try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockActive = true;
        console.log('[WakeLock] ✅ Native Wake Lock acquired');

        wakeLockSentinel.addEventListener('release', () => {
          console.log('[WakeLock] Native sentinel released by system');
          wakeLockActive = false;
          wakeLockSentinel = null;
        });

        return true;
      } catch (err) {
        console.warn('[WakeLock] Native API failed, trying fallback:', err.message);
      }
    }

    /* ── Fallback: invisible video trick (NoSleep-style) ── */
    try {
      if (!noSleepVideo) {
        noSleepVideo = document.createElement('video');
        noSleepVideo.setAttribute('playsinline', '');
        noSleepVideo.setAttribute('muted', '');
        noSleepVideo.muted = true;
        noSleepVideo.loop = true;
        noSleepVideo.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
        // Minimal base64 mp4 (silent 1-second video) to keep screen awake
        noSleepVideo.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA0htZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1NyByMjk0NSBhYjRiNjhiIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMAAAAAAOZYiEAD//8m+P5GMYXAAAA...';
        document.body.appendChild(noSleepVideo);
        console.log('[WakeLock] Fallback video element created');
      }

      await noSleepVideo.play();
      noSleepEnabled = true;
      wakeLockActive = true;
      console.log('[WakeLock] ✅ Fallback (video) wake lock acquired');
      return true;
    } catch (err) {
      console.warn('[WakeLock] Fallback video also failed:', err.message);
    }

    console.warn('[WakeLock] ❌ Could not acquire wake lock (no method available)');
    return false;
  } catch (err) {
    console.error('[WakeLock] acquire() error:', err);
    return false;
  }
}

/* ══════════════════════════════════════════
   release()  — release the screen wake lock
   Ref-counted: only actually releases when
   all callers have released.
   ══════════════════════════════════════════ */
export async function release(reason = 'unknown') {
  try {
    acquireCount = Math.max(0, acquireCount - 1);
    console.log(`[WakeLock] release() called — reason: ${reason}, refCount: ${acquireCount}`);

    if (acquireCount > 0) {
      console.log('[WakeLock] Other callers still holding lock, keeping active');
      return;
    }

    /* ── Release native sentinel ── */
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release();
        console.log('[WakeLock] ✅ Native Wake Lock released');
      } catch (err) {
        console.warn('[WakeLock] Native release error:', err.message);
      }
      wakeLockSentinel = null;
    }

    /* ── Stop fallback video ── */
    if (noSleepVideo && noSleepEnabled) {
      try {
        noSleepVideo.pause();
        noSleepEnabled = false;
        console.log('[WakeLock] ✅ Fallback video paused');
      } catch (err) {
        console.warn('[WakeLock] Fallback pause error:', err.message);
      }
    }

    wakeLockActive = false;
    console.log('[WakeLock] Wake lock fully released');
  } catch (err) {
    console.error('[WakeLock] release() error:', err);
  }
}

/* ══════════════════════════════════════════
   isActive()  — check if wake lock is held
   ══════════════════════════════════════════ */
export function isActive() {
  return wakeLockActive;
}

/* ══════════════════════════════════════════
   Re-acquire on visibilitychange
   When the user returns to the tab/app after
   switching away, the native wake lock is
   automatically released. Re-acquire it.
   ══════════════════════════════════════════ */
function handleVisibilityChange() {
  try {
    if (document.visibilityState === 'visible' && acquireCount > 0 && !wakeLockActive) {
      console.log('[WakeLock] Tab visible again — re-acquiring wake lock');
      reacquire();
    }
  } catch (err) {
    console.error('[WakeLock] visibilitychange handler error:', err);
  }
}

async function reacquire() {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockActive = true;
      console.log('[WakeLock] ✅ Re-acquired native wake lock');

      wakeLockSentinel.addEventListener('release', () => {
        console.log('[WakeLock] Native sentinel released by system');
        wakeLockActive = false;
        wakeLockSentinel = null;
      });
    } else if (noSleepVideo) {
      await noSleepVideo.play();
      noSleepEnabled = true;
      wakeLockActive = true;
      console.log('[WakeLock] ✅ Re-acquired fallback wake lock');
    }
  } catch (err) {
    console.warn('[WakeLock] Re-acquire failed:', err.message);
  }
}

/* ══════════════════════════════════════════
   forceRelease()  — forcibly release
   regardless of ref count (for emergencies)
   ══════════════════════════════════════════ */
export async function forceRelease() {
  try {
    console.log('[WakeLock] forceRelease() — clearing all');
    acquireCount = 0;
    await release('force');
  } catch (err) {
    console.error('[WakeLock] forceRelease() error:', err);
  }
}

/* ══════════════════════════════════════════
   init()  — wire event listeners
   ══════════════════════════════════════════ */
export function init() {
  try {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    console.log('[WakeLock] ✅ Module initialized');
    console.log('[WakeLock] Native API available:', 'wakeLock' in navigator);
  } catch (err) {
    console.error('[WakeLock] init() error:', err);
  }
}

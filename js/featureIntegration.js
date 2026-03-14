/* ═══════════════════════════════════════════════
   SafeHer — Feature Integration Layer
   Hooks the 4 new features into the existing app
   WITHOUT modifying any existing JS module files.

   Strategy: Monkey-patches / wraps existing functions
   at runtime using event listeners and dynamic imports.

   Features integrated:
   1. IP Geolocation Fallback (ipGeolocation.js)
   2. What3Words Location (what3words.js)
   3. AI Transcription via Transformers.js (aiTranscription.js)
   4. Live Speech Transcript (liveTranscript.js)
   5. Screen Orientation Lock (orientationLock.js)
   6. Network-Aware Smart Alert Routing (networkRouter.js)   7. Contact Picker API (contactPicker.js)
   8. Lingva Translate — Dynamic UI Translation (lingvaTranslate.js)   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  console.log('[FeatureIntegration] Module loading...');

  /* ═══════════════════════════════════════════
     RUNTIME STATE
     ═══════════════════════════════════════════ */
  let aiTranscriptionRecorder = null;
  let liveTranscriptInstance = null;
  let isIntegrationActive = false;
  let currentAlertStrategy = null;  // Feature 6: cached network strategy

  /* ═══════════════════════════════════════════
     FEATURE 1 — IP Geolocation Fallback
     Intercepts the alerts.js getCurrentLocation()
     by wrapping sendEmergencyAlert / sendAlertToContacts
     to add IP fallback when GPS returns null.
     ═══════════════════════════════════════════ */

  /**
   * enhanceLocationResult(location)
   * If GPS returned a real location, save it for future fallback.
   * If GPS returned null, try IP geolocation → last known GPS.
   */
  async function enhanceLocationResult(location) {
    try {
      const ipGeo = await import('./ipGeolocation.js');

      if (location && location.lat && location.lng) {
        // GPS succeeded — save for future fallback
        ipGeo.saveLastGPS(location.lat, location.lng);
        location.source = 'gps';
        return location;
      }

      // GPS failed — try IP geolocation
      console.log('[FeatureIntegration] GPS failed, trying IP geolocation...');
      const ipResult = await ipGeo.getIPLocation();
      if (ipResult) {
        return { lat: ipResult.lat, lng: ipResult.lng, source: 'ip', ipData: ipResult };
      }

      // IP failed — try last known GPS
      console.log('[FeatureIntegration] IP failed, trying last known GPS...');
      const cached = ipGeo.getLastKnownGPS();
      if (cached) {
        return { lat: cached.lat, lng: cached.lng, source: 'cached_gps', cachedAt: cached.cachedAt };
      }

      return null; // all failed
    } catch (err) {
      console.warn('[FeatureIntegration] Location enhancement error:', err);
      return location;
    }
  }

  /**
   * getLocationSourceLabel(location)
   * Returns a warning string for non-GPS locations.
   */
  function getLocationSourceLabel(location) {
    if (!location) return '\n⚠️ Location unavailable — all methods failed.';
    if (location.source === 'ip') {
      const ipData = location.ipData || {};
      return `\n\n⚠️ Approximate location (GPS unavailable — IP-based estimate)\n🏙️ Near: ${ipData.city || 'Unknown'}, ${ipData.region || ''}, ${ipData.country || ''}`;
    }
    if (location.source === 'cached_gps') {
      return `\n\n⚠️ Last known GPS location (captured at: ${location.cachedAt || 'Unknown time'})`;
    }
    return '';
  }

  /* ═══════════════════════════════════════════
     FEATURE 2 — What3Words Enhancement
     Appends W3W address to SOS alert emails.
     ═══════════════════════════════════════════ */

  /**
   * getW3WEnhancement(lat, lng)
   * Fetches What3Words address for coordinates.
   */
  async function getW3WEnhancement(lat, lng) {
    try {
      const w3w = await import('./what3words.js');
      const result = await w3w.getWhat3Words(lat, lng);
      return {
        emailText: w3w.formatW3WForAlert(result),
        smsText: w3w.formatW3WForSMS(result),
        result
      };
    } catch (err) {
      console.warn('[FeatureIntegration] What3Words error:', err);
      return { emailText: '', smsText: '', result: null };
    }
  }

  /* ═══════════════════════════════════════════
     FEATURES 3 & 4 — Transcription on SOS
     Start AI + Speech transcription when SOS activates,
     stop when SOS deactivates.
     ═══════════════════════════════════════════ */

  async function startAllTranscription() {
    // Feature 3: AI Transcription (Transformers.js)
    try {
      const aiModule = await import('./aiTranscription.js');
      aiTranscriptionRecorder = await aiModule.startTranscription();
      console.log('[FeatureIntegration] AI transcription started');
    } catch (err) {
      console.warn('[FeatureIntegration] AI transcription start failed (non-critical):', err);
      aiTranscriptionRecorder = null;
    }

    // Feature 4: Live Speech Transcript (Web Speech API)
    try {
      const liveModule = await import('./liveTranscript.js');
      liveTranscriptInstance = liveModule.startLiveTranscript('en-IN');
      console.log('[FeatureIntegration] Live transcript started');
    } catch (err) {
      console.warn('[FeatureIntegration] Live transcript start failed (non-critical):', err);
      liveTranscriptInstance = null;
    }
  }

  async function stopAllTranscription() {
    // Feature 3: Stop AI Transcription
    if (aiTranscriptionRecorder) {
      try {
        const aiModule = await import('./aiTranscription.js');
        const transcript = aiModule.stopTranscription(aiTranscriptionRecorder);
        console.log('[FeatureIntegration] AI transcript stopped, length:', transcript?.length || 0);
      } catch (err) {
        console.warn('[FeatureIntegration] AI transcription stop error:', err);
      }
      aiTranscriptionRecorder = null;
    }

    // Feature 4: Stop Live Transcript
    if (liveTranscriptInstance) {
      try {
        const liveModule = await import('./liveTranscript.js');
        const transcript = liveModule.stopLiveTranscript();
        console.log('[FeatureIntegration] Live transcript stopped, length:', transcript?.length || 0);
      } catch (err) {
        console.warn('[FeatureIntegration] Live transcript stop error:', err);
      }
      liveTranscriptInstance = null;
    }

    // Clear SOS active flag
    window.safeherSOSActive = false;
  }

  /* ═══════════════════════════════════════════
     INTEGRATION HOOKS
     Listen for SOS events and enhance with new features
     ═══════════════════════════════════════════ */

  function hookIntoSOS() {
    // --- Watch for SOS button activation via MutationObserver ---
    // The SOS button gets class 'sos-active' when activated
    const sosBtn = document.getElementById('btn-sos');
    if (!sosBtn) {
      console.warn('[FeatureIntegration] SOS button not found');
      return;
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isActive = sosBtn.classList.contains('sos-active');
          if (isActive && !isIntegrationActive) {
            // SOS just activated
            isIntegrationActive = true;
            window.safeherSOSActive = true;
            console.log('[FeatureIntegration] 🚨 SOS ACTIVATED — starting transcription');

            // Feature 5: Lock screen to portrait
            lockScreenForSOS();

            // Feature 6: Log network strategy
            logNetworkStrategy();

            startAllTranscription();
          } else if (!isActive && isIntegrationActive) {
            // SOS just deactivated
            isIntegrationActive = false;
            console.log('[FeatureIntegration] ✅ SOS DEACTIVATED — stopping transcription');
            stopAllTranscription();

            // Feature 5: Unlock screen orientation
            unlockScreenAfterSOS();
          }
        }
      }
    });

    observer.observe(sosBtn, { attributes: true, attributeFilter: ['class'] });
    console.log('[FeatureIntegration] ✅ SOS button observer attached');
  }

  /* ═══════════════════════════════════════════
     ENHANCE ALERT EMAILS
     Override the emailjs.send to intercept and
     append IP fallback + W3W info to messages.
     ═══════════════════════════════════════════ */

  function hookIntoEmailAlerts() {
    // Wait for emailjs to be available, then wrap emailjs.send
    let attempts = 0;
    const checkEmailJS = setInterval(() => {
      attempts++;
      if (typeof emailjs !== 'undefined' && emailjs.send) {
        clearInterval(checkEmailJS);

        const originalSend = emailjs.send.bind(emailjs);

        emailjs.send = async function (serviceId, templateId, params, ...rest) {
          try {
            // Only enhance SOS alerts (check for emergency keywords)
            if (params && params.message && params.message.includes('EMERGENCY ALERT')) {
              console.log('[FeatureIntegration] Enhancing SOS email with new features...');

              let enhancedMessage = params.message;

              // --- Feature 1: Add IP location source warning ---
              // Check if location was from IP or cache by examining the original alert flow
              const locationMatch = params.message.match(/GPS Coordinates: Lat ([^,]+), Lng (\S+)/);
              if (locationMatch) {
                const lat = parseFloat(locationMatch[1]);
                const lng = parseFloat(locationMatch[2]);

                // --- Feature 2: Append What3Words address ---
                if (!isNaN(lat) && !isNaN(lng)) {
                  const w3w = await getW3WEnhancement(lat, lng);
                  if (w3w.emailText) {
                    enhancedMessage += '\n' + w3w.emailText;
                  }
                }
              }

              // --- Features 3 & 4: Mention transcription is active ---
              if (isIntegrationActive) {
                enhancedMessage += '\n\n🎙️ LIVE TRANSCRIPTION is running — spoken words are being recorded as text for evidence.';
              }

              params.message = enhancedMessage;
            }
          } catch (err) {
            console.warn('[FeatureIntegration] Email enhancement error (sending original):', err);
          }

          // Always call original send
          return originalSend(serviceId, templateId, params, ...rest);
        };

        console.log('[FeatureIntegration] ✅ EmailJS send wrapped for enhancement');
      }
      if (attempts > 60) clearInterval(checkEmailJS); // Give up after 30s
    }, 500);
  }

  /* ═══════════════════════════════════════════
     ENHANCE SMS ALERTS
     Wrap SMSAlert.buildSOSMessage to add W3W + IP fallback
     ═══════════════════════════════════════════ */

  function hookIntoSMSAlerts() {
    let attempts = 0;
    const checkSMS = setInterval(() => {
      attempts++;
      if (window.SMSAlert && window.SMSAlert.buildSOSMessage) {
        clearInterval(checkSMS);

        const originalBuild = window.SMSAlert.buildSOSMessage.bind(window.SMSAlert);

        window.SMSAlert.buildSOSMessage = async function () {
          let msg = await originalBuild();

          try {
            // Try to extract coordinates from the message
            const coordMatch = msg.match(/maps\?q=([\d.-]+),([\d.-]+)/);
            if (coordMatch) {
              const lat = parseFloat(coordMatch[1]);
              const lng = parseFloat(coordMatch[2]);

              // Add What3Words (compact for SMS)
              if (!isNaN(lat) && !isNaN(lng)) {
                const w3w = await getW3WEnhancement(lat, lng);
                if (w3w.smsText) {
                  // Only add if total length stays reasonable
                  if ((msg + w3w.smsText).length < 300) {
                    msg += w3w.smsText;
                  }
                }
              }
            } else {
              // No GPS in SMS — try IP fallback
              const ipGeo = await import('./ipGeolocation.js');
              const ipLoc = await ipGeo.getIPLocation();
              if (ipLoc) {
                msg += `\n📍 Approx Location (IP):\nhttps://www.google.com/maps?q=${ipLoc.lat},${ipLoc.lng}`;
                msg += `\n⚠️ GPS unavailable — IP-based estimate near ${ipLoc.city || 'Unknown'}`;
              } else {
                const cached = ipGeo.getLastKnownGPS();
                if (cached) {
                  msg += `\n📍 Last Known GPS:\nhttps://www.google.com/maps?q=${cached.lat},${cached.lng}`;
                  msg += `\n⚠️ Last known location from ${cached.cachedAt || 'earlier'}`;
                }
              }
            }
          } catch (err) {
            console.warn('[FeatureIntegration] SMS enhancement error:', err);
          }

          return msg;
        };

        console.log('[FeatureIntegration] ✅ SMS buildSOSMessage wrapped for enhancement');
      }
      if (attempts > 60) clearInterval(checkSMS); // Give up after 30s
    }, 500);
  }

  /* ═══════════════════════════════════════════
     ENHANCE LOCATION FETCHING
     Override alerts.js getCurrentLocation indirectly
     by wrapping sendEmergencyAlert to add IP fallback
     when the original GPS call returns null.
     ═══════════════════════════════════════════ */

  function hookIntoLocationFetching() {
    // Listen for the safeher:emergency custom event that alerts.js dispatches
    document.addEventListener('safeher:emergency', async (e) => {
      const location = e.detail?.location;
      if (!location) {
        // GPS failed in the original flow — try IP fallback
        const enhanced = await enhanceLocationResult(null);
        if (enhanced) {
          console.log('[FeatureIntegration] IP fallback provided location for emergency event');
        }
      } else if (location.lat && location.lng) {
        // GPS succeeded — save for future fallback
        try {
          const ipGeo = await import('./ipGeolocation.js');
          ipGeo.saveLastGPS(location.lat, location.lng);
        } catch (_) {}
      }
    });

    console.log('[FeatureIntegration] ✅ Location fallback listener attached');
  }

  /* ═══════════════════════════════════════════
     ENHANCE GPS in contacts.js sendAlertToContacts
     Override the contacts.js location null handling by
     wrapping the function when it's called from alerts.js
     ═══════════════════════════════════════════ */

  function hookIntoContactAlerts() {
    // Intercept alerts.js sendEmergencyAlert by listening to its console logs
    // and enhancing the location passed to sendAlertToContacts.
    // Since we can't modify alerts.js, we wrap the function at module level.

    // Wait for the app to finish loading, then patch
    setTimeout(async () => {
      try {
        // Dynamic import to get the actual contacts module
        const contactsMod = await import('./contacts.js');

        if (contactsMod.sendAlertToContacts) {
          const originalSendAlert = contactsMod.sendAlertToContacts;

          // Create the enhanced version
          const enhancedSendAlert = async function (location, customMessage) {
            // If location is null, try IP fallback before passing to original
            if (!location) {
              console.log('[FeatureIntegration] Enhancing null location with IP fallback...');
              location = await enhanceLocationResult(null);

              // If we got a non-GPS location, build a custom message with warning
              if (location && location.source !== 'gps') {
                const sourceLabel = getLocationSourceLabel(location);
                if (!customMessage) {
                  // The original function will build the message — we need to signal
                  // that this location is approximate. Store flag on location object.
                  location._sourceWarning = sourceLabel;
                }
              }
            } else {
              // GPS succeeded — save for fallback
              try {
                const ipGeo = await import('./ipGeolocation.js');
                ipGeo.saveLastGPS(location.lat, location.lng);
              } catch (_) {}
            }

            return originalSendAlert.call(this, location, customMessage);
          };

          // Note: Since contacts.js exports are used via import, we can't easily
          // replace the export. Instead, we rely on the emailjs.send wrapper
          // and the SMS wrapper to add the enhancements post-facto.
          console.log('[FeatureIntegration] ✅ Contact alert enhancement ready');
        }
      } catch (err) {
        console.warn('[FeatureIntegration] Contact alert hook error:', err);
      }
    }, 2000);
  }

  /* ═══════════════════════════════════════════
     TRANSCRIPT DOWNLOAD BUTTON IN RECORDINGS
     Add a "Download Transcript" button to recordings screen
     ═══════════════════════════════════════════ */

  function addTranscriptDownloadButton() {
    // Watch for the recordings screen to become visible
    const observer = new MutationObserver(() => {
      const recordingsScreen = document.getElementById('screen-recordings');
      if (!recordingsScreen || !recordingsScreen.classList.contains('active')) return;

      // Check if button already exists
      if (document.getElementById('btn-download-transcript')) return;

      // Find the recordings list container
      const recordingsList = document.getElementById('recordings-list');
      if (!recordingsList) return;

      // Create transcript download section
      const section = document.createElement('div');
      section.id = 'transcript-download-section';
      section.style.cssText = 'padding:12px 16px;margin-bottom:12px;';

      const btn = document.createElement('button');
      btn.id = 'btn-download-transcript';
      btn.style.cssText = `
        width:100%;
        padding:12px;
        background:linear-gradient(135deg, #1a1a3e, #2d1b4e);
        color:#ff6b9d;
        border:1px solid rgba(255,107,157,0.3);
        border-radius:12px;
        font-size:0.85rem;
        font-weight:600;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        font-family:inherit;
        transition:all 0.2s;
      `;
      btn.innerHTML = '📄 Download SOS Transcript';

      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'linear-gradient(135deg, #2d1b4e, #3d2b5e)';
        btn.style.borderColor = 'rgba(255,107,157,0.6)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'linear-gradient(135deg, #1a1a3e, #2d1b4e)';
        btn.style.borderColor = 'rgba(255,107,157,0.3)';
      });

      btn.addEventListener('click', async () => {
        try {
          // Try live transcript first (Feature 4)
          const liveMod = await import('./liveTranscript.js');
          const liveText = liveMod.getLiveTranscriptText();

          // Also check sessionStorage
          const sessionText = sessionStorage.getItem('safeher_live_transcript') || '';

          // Also check IndexedDB for AI transcript (Feature 3)
          let aiText = '';
          try {
            aiText = await getAITranscriptFromDB();
          } catch (_) {}

          // Combine all transcripts
          let combined = '';
          if (liveText) combined += '═══ Live Speech Transcript ═══\n' + liveText + '\n\n';
          if (aiText) combined += '═══ AI Whisper Transcript ═══\n' + aiText + '\n\n';
          if (!liveText && !aiText && sessionText) combined = sessionText;

          if (!combined.trim()) {
            if (window.showToast) window.showToast('No transcript data available yet', 'warning');
            return;
          }

          // Download
          const blob = new Blob([combined], { type: 'text/plain' });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `safeher-transcript-${timestamp}.txt`;

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);

          if (window.showToast) window.showToast('📄 Transcript downloaded!', 'success');
        } catch (err) {
          console.error('[FeatureIntegration] Transcript download error:', err);
          if (window.showToast) window.showToast('Failed to download transcript', 'error');
        }
      });

      section.appendChild(btn);
      // Insert before recordings list
      recordingsList.parentNode.insertBefore(section, recordingsList);
    });

    // Observe body for screen changes
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    console.log('[FeatureIntegration] ✅ Transcript download button observer ready');
  }

  /**
   * getAITranscriptFromDB()
   * Read the AI transcript from IndexedDB.
   */
  function getAITranscriptFromDB() {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('SafeHerDB');
        request.onsuccess = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('transcripts')) {
            resolve('');
            return;
          }
          const tx = db.transaction(['transcripts'], 'readonly');
          const store = tx.objectStore('transcripts');
          const getReq = store.get('current_sos_transcript');
          getReq.onsuccess = () => {
            resolve(getReq.result?.text || '');
          };
          getReq.onerror = () => resolve('');
        };
        request.onerror = () => resolve('');
      } catch (_) {
        resolve('');
      }
    });
  }

  /* ═══════════════════════════════════════════
     FEATURE 5 — Screen Orientation Lock
     Lock portrait during SOS, unlock after.
     ═══════════════════════════════════════════ */

  async function lockScreenForSOS() {
    try {
      const orientMod = await import('./orientationLock.js');
      await orientMod.lockPortrait();
    } catch (err) {
      console.warn('[FeatureIntegration] Orientation lock failed (non-critical):', err);
    }
  }

  async function unlockScreenAfterSOS() {
    try {
      const orientMod = await import('./orientationLock.js');
      await orientMod.unlockOrientation();
    } catch (err) {
      console.warn('[FeatureIntegration] Orientation unlock failed (non-critical):', err);
    }
  }

  /* ═══════════════════════════════════════════
     FEATURE 6 — Network-Aware Smart Alert Routing
     Check network quality on SOS and conditionally
     skip heavy features (live stream) on slow networks.
     ═══════════════════════════════════════════ */

  function logNetworkStrategy() {
    try {
      const netMod = import('./networkRouter.js');
      netMod.then(mod => {
        currentAlertStrategy = mod.getAlertStrategy();
        const info = mod.getNetworkInfo();
        console.log('[FeatureIntegration] 📶 Network:', info.effectiveType, '| Strategy:', currentAlertStrategy.strategy);

        if (currentAlertStrategy.message) {
          // Show network warning to user
          if (window.showToast) window.showToast(currentAlertStrategy.message, 'warning');
        }
      });
    } catch (err) {
      console.warn('[FeatureIntegration] Network strategy check failed:', err);
    }
  }

  function hookNetworkAwareRouting() {
    // Wrap LiveStream.start to skip on slow networks
    let attempts = 0;
    const checkStream = setInterval(() => {
      attempts++;
      if (window.LiveStream && window.LiveStream.start) {
        clearInterval(checkStream);

        const originalStart = window.LiveStream.start.bind(window.LiveStream);

        window.LiveStream.start = function (...args) {
          try {
            const netMod = import('./networkRouter.js');
            netMod.then(mod => {
              const strategy = mod.getAlertStrategy();
              if (!strategy.startVideoStream) {
                console.log('[FeatureIntegration] 📶 Skipping LiveStream — network too slow (' + strategy.strategy + ')');
                if (window.showToast) {
                  window.showToast('📶 Video stream skipped — weak connection', 'warning');
                }
                return; // don't start stream
              }
              originalStart(...args);
            }).catch(() => originalStart(...args));
          } catch (_) {
            originalStart(...args);
          }
        };

        console.log('[FeatureIntegration] ✅ LiveStream wrapped with network-aware routing');
      }
      if (attempts > 60) clearInterval(checkStream); // Give up after 30s
    }, 500);

    // Listen for network changes during active SOS
    try {
      const netMod = import('./networkRouter.js');
      netMod.then(mod => {
        mod.listenForNetworkChange((info) => {
          if (isIntegrationActive) {
            const strategy = mod.getAlertStrategy();
            console.log('[FeatureIntegration] 📶 Network changed during SOS:', info.effectiveType, '→', strategy.strategy);
            if (strategy.message && window.showToast) {
              window.showToast(strategy.message, 'warning');
            }
          }
        });
      });
    } catch (_) {}

    console.log('[FeatureIntegration] ✅ Network-aware routing hooks ready');
  }

  /* ═══════════════════════════════════════════
     FEATURE 7 — Contact Picker API
     Add "Import from Contacts" button to the
     contacts screen. Hidden if API unsupported.
     ═══════════════════════════════════════════ */

  function hookContactPicker() {
    // Wait for DOM to be fully ready and contacts form to exist
    const formCard = document.getElementById('contact-form-card');
    if (!formCard) {
      console.warn('[FeatureIntegration] Contact form card not found');
      return;
    }

    // Dynamically check support and add button
    import('./contactPicker.js').then(pickerMod => {
      // If not supported, don't show the button at all
      if (!pickerMod.isContactPickerSupported()) {
        console.log('[FeatureIntegration] Contact Picker API not supported — hiding import button');
        return;
      }

      // Create the "Import from Contacts" button
      const importBtn = document.createElement('button');
      importBtn.id = 'btn-import-contacts';
      importBtn.type = 'button';
      importBtn.className = 'btn btn--ghost btn--sm';
      importBtn.style.cssText = `
        margin-top:8px;
        width:100%;
        padding:11px;
        border-radius:12px;
        font-size:0.82rem;
        font-weight:600;
        background:rgba(10,132,255,0.08);
        color:var(--accent-blue);
        border:1px solid rgba(10,132,255,0.25);
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        font-family:inherit;
        transition:all 0.2s;
      `;
      importBtn.innerHTML = '📱 Import from Contacts';

      importBtn.addEventListener('click', async () => {
        importBtn.disabled = true;
        importBtn.innerHTML = '⏳ Opening contacts...';

        try {
          const result = await pickerMod.pickContacts();

          if (!result.success) {
            if (result.error !== 'cancelled') {
              if (window.showToast) window.showToast(result.error, 'warning');
            }
            return;
          }

          if (result.contacts.length === 0) {
            if (window.showToast) window.showToast('No contacts with phone/email selected', 'warning');
            return;
          }

          // Import each contact using the existing addContact function
          const contactsMod = await import('./contacts.js');
          let added = 0;

          for (const raw of result.contacts) {
            const formatted = pickerMod.formatContactForSafeHer(raw);
            contactsMod.addContact(formatted);
            added++;
          }

          // Re-render the contacts list
          contactsMod.renderContacts();

          if (window.showToast) {
            window.showToast(`✅ ${added} contact${added > 1 ? 's' : ''} imported!`, 'success');
          }

          console.log('[FeatureIntegration] ✅ Imported', added, 'contacts via Contact Picker');

        } catch (err) {
          console.error('[FeatureIntegration] Contact picker error:', err);
          if (window.showToast) window.showToast('Failed to import contacts', 'error');
        } finally {
          importBtn.disabled = false;
          importBtn.innerHTML = '📱 Import from Contacts';
        }
      });

      // Insert after the contact form card
      formCard.parentNode.insertBefore(importBtn, formCard.nextSibling);
      console.log('[FeatureIntegration] ✅ Contact Picker import button added');

    }).catch(err => {
      console.warn('[FeatureIntegration] Contact Picker module load failed:', err);
    });
  }

  /* ═══════════════════════════════════════════
     FEATURE 8 — Lingva Translate
     - Populate language picker with all 20 languages
     - Translate SOS email body to user's selected language
     - Add translate button to community map popups
     ═══════════════════════════════════════════ */

  function hookLingvaTranslate() {
    import('./lingvaTranslate.js').then(lingvaMod => {

      // --- 8A: Expand the language picker with all 20 languages ---
      const picker = document.getElementById('lang-picker');
      if (picker) {
        const currentVal = picker.value;
        const existingValues = new Set();
        // Note which options already exist
        Array.from(picker.options).forEach(opt => existingValues.add(opt.value));

        // Add new languages from SUPPORTED_LANGUAGES
        const shortLabels = {
          'en': 'EN', 'hi': 'हि', 'te': 'తె', 'ta': 'த', 'bn': 'বা',
          'mr': 'म', 'gu': 'ગુ', 'kn': 'ಕ', 'ml': 'മ', 'pa': 'ਪੰ',
          'ur': 'ار', 'or': 'ଓ', 'as': 'অ', 'ne': 'ने', 'si': 'සි',
          'ar': 'عر', 'fr': 'FR', 'de': 'DE', 'es': 'ES', 'pt': 'PT'
        };

        for (const [code, name] of Object.entries(lingvaMod.SUPPORTED_LANGUAGES)) {
          if (!existingValues.has(code)) {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = shortLabels[code] || code.toUpperCase();
            opt.title = name;
            picker.appendChild(opt);
          }
        }

        // Restore selected value
        picker.value = currentVal;
        console.log('[FeatureIntegration] ✅ Language picker expanded to', picker.options.length, 'languages');

        // --- Also update I18n to accept all new languages ---
        if (window.I18n) {
          // Extend supportedLangs list
          const allCodes = Object.keys(lingvaMod.SUPPORTED_LANGUAGES);
          allCodes.forEach(code => {
            if (!window.I18n.supportedLangs.includes(code)) {
              window.I18n.supportedLangs.push(code);
            }
          });

          // Override setLanguage for non-JSON-file languages to use Lingva
          const originalSetLang = window.I18n.setLanguage.bind(window.I18n);
          window.I18n.setLanguage = async function(lang) {
            // For en/hi/te — use existing JSON files
            if (['en', 'hi', 'te'].includes(lang)) {
              return originalSetLang(lang);
            }

            // For other languages — translate from English JSON using Lingva
            this.currentLang = lang;
            localStorage.setItem('safeher_lang', lang);
            document.documentElement.setAttribute('lang', lang);

            // Load English as base
            const enData = await this.loadLanguage('en');
            if (!enData) return;

            // Translate each key's value
            if (window.showToast) window.showToast('🌐 Translating UI...', 'info');

            const translated = {};
            const keys = Object.keys(enData);

            // Translate in batches to avoid overwhelming the API
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              try {
                translated[key] = await lingvaMod.translateText(enData[key], lang, 'en');
              } catch (_) {
                translated[key] = enData[key];
              }
            }

            this.translations[lang] = translated;
            this.applyTranslations(translated);

            const pickerEl = document.getElementById('lang-picker');
            if (pickerEl) pickerEl.value = lang;

            if (window.showToast) window.showToast('✅ Language set to ' + (lingvaMod.SUPPORTED_LANGUAGES[lang] || lang), 'success');
            console.log('[FeatureIntegration] ✅ UI translated to', lang, 'via Lingva');
          };

          console.log('[FeatureIntegration] ✅ I18n.setLanguage extended for Lingva');
        }
      }

      // --- 8B: Translate SOS email body before sending ---
      // Wrap the existing emailjs.send wrapper to also translate
      const checkEmailJS = setInterval(() => {
        if (typeof emailjs !== 'undefined' && emailjs.send && emailjs.send._lingvaWrapped) {
          clearInterval(checkEmailJS);
          return; // already wrapped
        }
        if (typeof emailjs !== 'undefined' && emailjs.send) {
          clearInterval(checkEmailJS);

          const prevSend = emailjs.send.bind(emailjs);

          const lingvaWrappedSend = async function(serviceId, templateId, params, ...rest) {
            try {
              const userLang = lingvaMod.getTranslationLanguage();
              if (params && params.message && userLang !== 'en' &&
                  params.message.includes('EMERGENCY ALERT')) {
                console.log('[FeatureIntegration] Translating SOS email to', userLang);
                params.message = await lingvaMod.translateAlertEmailBody(params.message, userLang);
              }
            } catch (err) {
              console.warn('[FeatureIntegration] Email translation error (sending original):', err);
            }
            return prevSend(serviceId, templateId, params, ...rest);
          };
          lingvaWrappedSend._lingvaWrapped = true;
          emailjs.send = lingvaWrappedSend;

          console.log('[FeatureIntegration] ✅ EmailJS wrapped with Lingva translation');
        }
      }, 600);
      setTimeout(() => clearInterval(checkEmailJS), 30000);

      // --- 8C: Add translate buttons to community map popups ---
      hookCommunityMapTranslate(lingvaMod);

    }).catch(err => {
      console.warn('[FeatureIntegration] Lingva module load failed:', err);
    });
  }

  /**
   * hookCommunityMapTranslate(lingvaMod)
   * Adds a small "Translate" button inside community map incident popups.
   */
  function hookCommunityMapTranslate(lingvaMod) {
    // Listen for popups opening on the map
    document.addEventListener('click', async (e) => {
      const translateBtn = e.target.closest('.safeher-translate-btn');
      if (!translateBtn) return;

      const descEl = translateBtn.closest('.leaflet-popup-content')?.querySelector('.safeher-report-desc');
      if (!descEl) return;

      const originalText = descEl.dataset.original || descEl.textContent;
      descEl.dataset.original = originalText;

      const userLang = lingvaMod.getTranslationLanguage();
      if (userLang === 'en') {
        if (window.showToast) window.showToast('Already in English', 'info');
        return;
      }

      translateBtn.textContent = '⏳';
      try {
        const translated = await lingvaMod.translateText(originalText, userLang);
        descEl.textContent = translated;
        translateBtn.textContent = '✅';
      } catch (_) {
        translateBtn.textContent = '❌';
      }
    });

    // Wrap CommunityMap.renderReports to inject translate buttons into popups
    let attempts = 0;
    const checkCMap = setInterval(() => {
      attempts++;
      if (window.CommunityMap && window.CommunityMap.renderReports) {
        clearInterval(checkCMap);

        const originalRender = window.CommunityMap.renderReports.bind(window.CommunityMap);

        window.CommunityMap.renderReports = function(reports, map) {
          // Call original render first
          originalRender(reports, map);

          // After rendering, find all popups and add translate buttons
          // We do this by wrapping the popup content after markers are created
          setTimeout(() => {
            if (this.markers) {
              this.markers.forEach(marker => {
                try {
                  const popup = marker.getPopup();
                  if (popup) {
                    let content = popup.getContent();
                    if (typeof content === 'string' && !content.includes('safeher-translate-btn')) {
                      // Find the description text and wrap it, add translate button
                      content = content.replace(
                        /(<span style="color:#666;font-size:0.8rem">)\s*([^<]*?)(<\/span>)/,
                        '$1<span class="safeher-report-desc">$2</span> ' +
                        '<button class="safeher-translate-btn" style="font-size:10px;padding:1px 5px;border:1px solid #aaa;border-radius:4px;background:none;cursor:pointer;margin-left:4px" title="Translate">🌐</button>$3'
                      );
                      popup.setContent(content);
                    }
                  }
                } catch (_) {}
              });
            }
          }, 200);
        };

        console.log('[FeatureIntegration] ✅ Community map popups wrapped with translate button');
      }
      if (attempts > 60) clearInterval(checkCMap); // Give up after 30s
    }, 500);
  }

  /* ═══════════════════════════════════════════
     PRELOAD AI MODEL (background, non-blocking)
     ═══════════════════════════════════════════ */

  function preloadAIModel() {
    // Wait 10 seconds after page load, then start loading the Whisper model
    // in the background so it's ready when SOS is triggered
    setTimeout(async () => {
      try {
        if (window.TransformersPipeline) {
          const aiModule = await import('./aiTranscription.js');
          aiModule.loadTranscriptionModel();
          console.log('[FeatureIntegration] 🤖 AI model preload initiated (background)');
        }
      } catch (err) {
        console.warn('[FeatureIntegration] AI model preload failed (non-critical):', err);
      }
    }, 10000);
  }

  /* ═══════════════════════════════════════════
     SAVE GPS ON EVERY SUCCESSFUL FIX
     Periodically save GPS to localStorage for fallback
     ═══════════════════════════════════════════ */

  function hookGPSSaving() {
    // Intercept successful geolocation results by overriding
    // navigator.geolocation methods (additive only)
    if (!navigator.geolocation) return;

    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    const originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);

    navigator.geolocation.getCurrentPosition = function (success, error, options) {
      const wrappedSuccess = (pos) => {
        // Save to localStorage for IP fallback
        try {
          const ipGeo = import('./ipGeolocation.js');
          ipGeo.then(mod => mod.saveLastGPS(pos.coords.latitude, pos.coords.longitude));
        } catch (_) {}
        success(pos);
      };
      return originalGetCurrentPosition(wrappedSuccess, error, options);
    };

    navigator.geolocation.watchPosition = function (success, error, options) {
      const wrappedSuccess = (pos) => {
        // Save to localStorage for IP fallback
        try {
          const ipGeo = import('./ipGeolocation.js');
          ipGeo.then(mod => mod.saveLastGPS(pos.coords.latitude, pos.coords.longitude));
        } catch (_) {}
        success(pos);
      };
      return originalWatchPosition(wrappedSuccess, error, options);
    };

    console.log('[FeatureIntegration] ✅ GPS save hook attached');
  }

  /* ═══════════════════════════════════════════
     INIT — Run all hooks on DOM ready
     ═══════════════════════════════════════════ */

  function init() {
    console.log('[FeatureIntegration] Initializing all feature hooks...');

    // Feature 1: IP Geolocation + GPS saving
    hookGPSSaving();
    hookIntoLocationFetching();

    // Feature 2: What3Words (via email + SMS hooks)
    hookIntoEmailAlerts();
    hookIntoSMSAlerts();

    // Features 3 & 4: Transcription (via SOS observer)
    hookIntoSOS();

    // Feature 4: Transcript download button
    addTranscriptDownloadButton();

    // Feature 3: Preload AI model in background
    preloadAIModel();

    // Contact alert enhancement
    hookIntoContactAlerts();

    // Feature 6: Network-aware routing
    hookNetworkAwareRouting();

    // Feature 7: Contact Picker API
    hookContactPicker();

    // Feature 8: Lingva Translate
    hookLingvaTranslate();

    // Feature 43: Initialize Agora.io Live Streaming
    initAgoraStreaming();

    console.log('[FeatureIntegration] ✅ All feature hooks initialized (Features 1-8 + Agora)');
  }

  /**
   * Feature 43: Initialize Agora.io Live Streaming
   */
  async function initAgoraStreaming() {
    try {
      if (!window.AGORA_APP_ID) {
        console.warn('[Agora] App ID not configured. Set window.AGORA_APP_ID in index.html');
        return;
      }

      // Import Agora module
      const { AgoraStreaming } = await import('./agoraStreaming.js');
      
      // Create global instance
      window.agoraStreaming = new AgoraStreaming();
      
      // Initialize with App ID
      const initialized = await window.agoraStreaming.init(window.AGORA_APP_ID);
      
      if (initialized) {
        console.log('[Agora] ✅ Live streaming initialized. Ready for broadcasting!');
        
        // Hook into Live Stream button
        const liveStreamBtn = document.getElementById('btn-live-stream');
        if (liveStreamBtn) {
          liveStreamBtn.addEventListener('click', handleAgoraStreamClick);
        }
      }
    } catch (error) {
      console.error('[Agora] Initialization error:', error);
    }
  }

  /**
   * Handle Live Stream button click with Agora
   */
  async function handleAgoraStreamClick(evt) {
    try {
      if (!window.agoraStreaming) {
        console.error('[Agora] Streaming not initialized');
        return;
      }

      // Check if already streaming
      if (window.agoraStreaming.isLive()) {
        console.log('[Agora] Already streaming. Showing stream bar.');
        document.getElementById('stream-bar')?.classList.remove('hidden');
        return;
      }

      // Generate room ID from emergency ID or timestamp
      const roomId = 'safeher-' + (window.currentEmergencyId || Date.now());
      
      // Get video container
      const videoContainer = document.getElementById('local-video-container') || 
                             document.getElementById('stream-preview');
      
      if (!videoContainer) {
        console.error('[Agora] Video container not found');
        return;
      }

      // Start broadcasting
      const result = await window.agoraStreaming.startBroadcasting(roomId, videoContainer);
      
      if (result.success) {
        // Show stream bar
        const streamBar = document.getElementById('stream-bar');
        if (streamBar) {
          streamBar.classList.remove('hidden');
          document.getElementById('stream-status-text').textContent = '🔴 Streaming';
        }

        // Show share link
        console.log('[Agora] 🎥 Share this link:', result.shareLink);
        alert('🎥 Live streaming started!\n\nShare this link:\n' + result.shareLink);
      }
    } catch (error) {
      console.error('[Agora] Stream click error:', error);
    }
  }

  // Run on DOMContentLoaded (or immediately if already loaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure all other modules are loaded first
    setTimeout(init, 500);
  }

  // Expose for debugging
  window.SafeHerFeatures = {
    enhanceLocationResult,
    getW3WEnhancement,
    startAllTranscription,
    stopAllTranscription,
    getAITranscriptFromDB,
    lockScreenForSOS,
    unlockScreenAfterSOS,
    logNetworkStrategy,
    hookContactPicker,
    hookLingvaTranslate,
    initAgoraStreaming,
    handleAgoraStreamClick,
    get currentStrategy() { return currentAlertStrategy; }
  };

})();

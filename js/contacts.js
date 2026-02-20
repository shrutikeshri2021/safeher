/* ═══════════════════════════════════════════════
   SafeHer — Contacts Module
   Emergency contacts CRUD, Send Location with
   custom message via SMS / Email / Web Share
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';

const STORAGE_KEY = 'safeher_contacts';

/* ══════════════════════════════════════════
   DATA LAYER
   ══════════════════════════════════════════ */
export function getContacts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function addContact(contact) {
  const contacts = getContacts();
  contact.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  contacts.push(contact);
  saveContacts(contacts);
  return contact;
}

export function updateContact(id, data) {
  const contacts = getContacts();
  const idx = contacts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...data };
  saveContacts(contacts);
  return contacts[idx];
}

export function removeContact(id) {
  const contacts = getContacts().filter(c => c.id !== id);
  saveContacts(contacts);
}

/* ══════════════════════════════════════════
   RENDER CONTACT LIST
   Shows name, phone, email, relation tag,
   edit / delete buttons
   ══════════════════════════════════════════ */
export function renderContacts() {
  const listEl  = document.getElementById('contacts-list');
  const emptyEl = document.getElementById('contacts-empty');
  if (!listEl) return;

  const contacts = getContacts();

  // Clear old cards (keep empty-state element)
  listEl.querySelectorAll('.contact-card').forEach(el => el.remove());

  if (contacts.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  contacts.forEach(c => {
    const initials = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.dataset.id = c.id;
    card.innerHTML = `
      <div class="contact-avatar">${initials}</div>
      <div class="contact-details">
        <h4>${escapeHtml(c.name)}</h4>
        <p>\ud83d\udcf1 ${escapeHtml(c.phone)}</p>
        ${c.email ? `<p style="font-size:.7rem;color:var(--text-secondary);margin-top:1px;">\u2709\ufe0f ${escapeHtml(c.email)}</p>` : ''}
        <span class="contact-tag">${escapeHtml(c.relation)}</span>
      </div>
      <div class="contact-actions">
        <button class="btn-edit" aria-label="Edit contact" data-id="${c.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-delete" aria-label="Delete contact" data-id="${c.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });
}

/* ══════════════════════════════════════════
   INIT CONTACTS UI
   Form + list delegation + send location
   ══════════════════════════════════════════ */
export function initContactsUI() {
  const form      = document.getElementById('contact-form');
  const cancelBtn = document.getElementById('btn-cancel-contact');
  const listEl    = document.getElementById('contacts-list');
  const formTitle = document.getElementById('contact-form-title');
  const editIdEl  = document.getElementById('contact-edit-id');

  if (!form) return;

  /* ── Form submit: add / edit contact ── */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name     = document.getElementById('contact-name').value.trim();
    const phone    = document.getElementById('contact-phone').value.trim();
    const email    = (document.getElementById('contact-email')?.value || '').trim();
    const relation = document.getElementById('contact-relation').value;

    if (!name || !phone) {
      showToast('Please enter name and phone number', 'warning');
      return;
    }

    const editId = editIdEl.value;
    if (editId) {
      updateContact(editId, { name, phone, email, relation });
      showToast(`${name} updated`, 'success');
      editIdEl.value = '';
      formTitle.textContent = 'Add Contact';
    } else {
      addContact({ name, phone, email, relation });
      showToast(`${name} added to emergency contacts`, 'success');
    }
    form.reset();
    renderContacts();
  });

  /* ── Cancel button ── */
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      form.reset();
      editIdEl.value = '';
      formTitle.textContent = 'Add Contact';
    });
  }

  /* ── Edit / Delete delegation on contact list ── */
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const editBtn   = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');

      if (editBtn) {
        const id = editBtn.dataset.id;
        const contact = getContacts().find(c => c.id === id);
        if (!contact) return;
        document.getElementById('contact-name').value     = contact.name;
        document.getElementById('contact-phone').value    = contact.phone;
        const emailEl = document.getElementById('contact-email');
        if (emailEl) emailEl.value = contact.email || '';
        document.getElementById('contact-relation').value = contact.relation;
        editIdEl.value = id;
        formTitle.textContent = 'Edit Contact';
        document.getElementById('contact-form-card').scrollIntoView({ behavior: 'smooth' });
      }

      if (deleteBtn) {
        const id   = deleteBtn.dataset.id;
        const card = deleteBtn.closest('.contact-card');
        if (card) {
          card.style.transition = 'opacity .2s, transform .2s';
          card.style.opacity    = '0';
          card.style.transform  = 'translateX(40px)';
          setTimeout(() => {
            removeContact(id);
            renderContacts();
            showToast('Contact removed', 'info');
          }, 200);
        }
      }
    });
  }

  /* ── Send Location buttons ── */
  wireSendLocationButtons();

  /* ── Initial render ── */
  renderContacts();
}

/* ══════════════════════════════════════════
   SEND LOCATION BUTTONS
   SMS, Email, Web Share
   ══════════════════════════════════════════ */
function wireSendLocationButtons() {
  const smsBtn   = document.getElementById('btn-send-sms');
  const emailBtn = document.getElementById('btn-send-email');
  const shareBtn = document.getElementById('btn-send-share');

  if (smsBtn)   smsBtn.addEventListener('click',   () => sendLocationViaSMS());
  if (emailBtn) emailBtn.addEventListener('click', () => sendLocationViaEmail());
  if (shareBtn) shareBtn.addEventListener('click', () => sendLocationViaShare());
}

/* ── Get current GPS location (promise) ── */
function getCurrentLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/* ── Build the message with location + custom text ── */
async function buildLocationMessage() {
  const customMsg = (document.getElementById('custom-message')?.value || '').trim();
  const location  = await getCurrentLocation();

  if (!location) {
    showToast('Could not get your location \u2014 enable GPS', 'error');
    return null;
  }

  const { lat, lng } = location;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

  let msg = '';
  if (customMsg) msg += customMsg + '\n\n';
  msg += `\ud83d\udccd My current location (SafeHer):\n`;
  msg += `${mapsLink}\n`;
  msg += `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}\n\n`;
  msg += `\u2014 Sent from SafeHer Safety App`;

  return { msg, lat, lng, mapsLink };
}

/* ── Send via SMS ── */
async function sendLocationViaSMS() {
  const contacts = getContacts();
  if (contacts.length === 0) {
    showToast('Add contacts first before sending', 'warning');
    return;
  }

  showToast('Getting your location\u2026', 'info');
  const data = await buildLocationMessage();
  if (!data) return;

  const phones  = contacts.map(c => c.phone).filter(Boolean).join(',');
  const smsBody = encodeURIComponent(data.msg);
  const smsLink = `sms:${phones}?body=${smsBody}`;

  try {
    window.open(smsLink, '_self');
    showToast('Opening SMS app\u2026', 'success');
  } catch {
    try {
      await navigator.clipboard.writeText(data.msg);
      showToast('Message copied \u2014 paste it in your SMS app', 'warning');
    } catch {
      showToast('Could not open SMS. Copy the message manually.', 'error');
    }
  }
}

/* ── Send via Email ── */
async function sendLocationViaEmail() {
  const contacts = getContacts();
  if (contacts.length === 0) {
    showToast('Add contacts first before sending', 'warning');
    return;
  }

  const emails = contacts.map(c => c.email).filter(Boolean);
  if (emails.length === 0) {
    showToast('No email addresses saved \u2014 add emails to your contacts', 'warning');
    return;
  }

  showToast('Getting your location\u2026', 'info');
  const data = await buildLocationMessage();
  if (!data) return;

  const subject  = encodeURIComponent('\ud83d\udccd My Live Location \u2014 SafeHer');
  const body     = encodeURIComponent(data.msg);
  const to       = emails.join(',');
  const mailLink = `mailto:${to}?subject=${subject}&body=${body}`;

  try {
    window.open(mailLink, '_self');
    showToast('Opening email app\u2026', 'success');
  } catch {
    try {
      await navigator.clipboard.writeText(data.msg);
      showToast('Message copied \u2014 paste it in your email app', 'warning');
    } catch {
      showToast('Could not open email. Copy the message manually.', 'error');
    }
  }
}

/* ── Send via Web Share API (fallback to clipboard) ── */
async function sendLocationViaShare() {
  showToast('Getting your location\u2026', 'info');
  const data = await buildLocationMessage();
  if (!data) return;

  if (navigator.share) {
    try {
      await navigator.share({ title: '\ud83d\udccd My Location \u2014 SafeHer', text: data.msg });
      showToast('Location shared!', 'success');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(data.msg);
    showToast('Location link copied to clipboard', 'success');
  } catch {
    showToast('Could not share \u2014 copy the link manually', 'warning');
  }
}

/* ══════════════════════════════════════════
   UPLOAD SNAPSHOT — tries multiple FREE hosts
   No API key, no signup needed
   Returns a public URL for email embedding
   ══════════════════════════════════════════ */
function base64ToBlob(base64Data) {
  const byteString = atob(base64Data.split(',')[1]);
  const mimeType = base64Data.split(',')[0].match(/:(.*?);/)[1] || 'image/jpeg';
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

async function uploadSnapshot(base64Data) {
  const blob = base64ToBlob(base64Data);
  console.log('📸 Snapshot blob size:', blob.size, 'bytes');

  // Try Telegraph (Telegram)
  try {
    console.log('📸 Trying Telegraph upload...');
    const fd1 = new FormData();
    fd1.append('file', blob, 'sos_snapshot.jpg');
    const r1 = await fetch('https://telegra.ph/upload', { method: 'POST', body: fd1 });
    const j1 = await r1.json();
    console.log('📸 Telegraph response:', j1);
    if (Array.isArray(j1) && j1[0]?.src) {
      return 'https://telegra.ph' + j1[0].src;
    }
  } catch (e) { console.warn('📸 Telegraph failed:', e); }

  // Try freeimage.host (no key needed for anonymous uploads)
  try {
    console.log('📸 Trying freeimage.host upload...');
    const fd2 = new FormData();
    fd2.append('source', blob, 'sos_snapshot.jpg');
    fd2.append('type', 'file');
    fd2.append('action', 'upload');
    const r2 = await fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
      method: 'POST',
      body: fd2
    });
    const j2 = await r2.json();
    console.log('📸 freeimage response:', j2);
    if (j2.image?.url) {
      return j2.image.url;
    }
  } catch (e) { console.warn('📸 freeimage failed:', e); }

  // Try tmpfiles.org
  try {
    console.log('📸 Trying tmpfiles.org upload...');
    const fd3 = new FormData();
    fd3.append('file', blob, 'sos_snapshot.jpg');
    const r3 = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: fd3 });
    const j3 = await r3.json();
    console.log('📸 tmpfiles response:', j3);
    if (j3.data?.url) {
      // Convert page URL to direct download URL
      const directUrl = j3.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      return directUrl;
    }
  } catch (e) { console.warn('📸 tmpfiles failed:', e); }

  console.error('📸 All upload hosts failed');
  return '';
}

/* ══════════════════════════════════════════
   SEND ALERT TO ALL CONTACTS (used by SOS)
   Uses EmailJS to auto-send real emails to
   every saved contact — FULLY AUTOMATIC
   Includes: GPS, address, satellite map,
   camera snapshot
   ══════════════════════════════════════════ */
export async function sendAlertToContacts(location) {
  console.log('🚨 sendAlertToContacts CALLED', location);

  // If location is null (GPS timed out in alerts.js), try fetching it here
  if (!location && navigator.geolocation) {
    console.log('📍 Location was null, trying to get GPS here...');
    try {
      location = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      });
      console.log('📍 Got location in contacts.js:', location);
    } catch (e) {
      console.warn('📍 Still no location:', e?.message);
    }
  }

  const contacts = getContacts();
  console.log('📋 Contacts found:', contacts.length, contacts);

  if (contacts.length === 0) {
    showToast('No emergency contacts — add contacts first', 'warning');
    return;
  }

  // Get or ask for user's name (cached in localStorage)
  let userName = localStorage.getItem('safeher_username');
  if (!userName) {
    userName = prompt('Enter your name (for emergency alerts):') || 'SafeHer User';
    localStorage.setItem('safeher_username', userName);
  }
  console.log('👤 User name:', userName);

  const lat = location?.lat?.toFixed(6) || 'Unknown';
  const lng = location?.lng?.toFixed(6) || 'Unknown';
  const mapsLink = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : 'Location unavailable';
  const satelliteLink = location
    ? `https://www.google.com/maps/@${location.lat},${location.lng},18z/data=!3m1!1e1`
    : 'Location unavailable';
  const timeNow = new Date().toLocaleString();

  console.log('📍 Location:', lat, lng);
  console.log('🔗 Maps link:', mapsLink);

  // ═══ REVERSE GEOCODE — get real address (free via OpenStreetMap) ═══
  let address = 'Address could not be determined';
  if (location) {
    try {
      console.log('🏠 Reverse geocoding...');
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lng}&format=json&zoom=18&addressdetails=1&accept_language=en`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      console.log('🏠 Geocoding response:', geoData);
      if (geoData.display_name) {
        address = geoData.display_name;
        console.log('🏠 Address:', address);
      }
      // Also build a short readable address from parts
      if (geoData.address) {
        const a = geoData.address;
        const parts = [a.road, a.neighbourhood, a.suburb, a.city || a.town || a.village, a.state, a.postcode].filter(Boolean);
        if (parts.length > 0) {
          address = parts.join(', ');
          console.log('🏠 Short address:', address);
        }
      }
    } catch (err) {
      console.warn('⚠️ Reverse geocoding failed:', err);
    }
  }

  // ═══ CAPTURE SNAPSHOT from active SOS video recording (does NOT stop recording) ═══
  let snapshotDataUrl = '';
  try {
    console.log('📸 Capturing snapshot...');
    // Dynamic import to avoid circular dependency
    const recorderMod = await import('./recorder.js');
    const activeStream = recorderMod.getActiveStream ? recorderMod.getActiveStream() : null;
    const videoTrack = activeStream?.getVideoTracks()[0];

    if (videoTrack && videoTrack.readyState === 'live') {
      if (typeof ImageCapture !== 'undefined') {
        const imageCapture = new ImageCapture(videoTrack);
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      } else {
        const video = document.createElement('video');
        video.srcObject = activeStream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play();
        await new Promise(r => setTimeout(r, 300));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        video.pause();
        video.srcObject = null;
      }
      console.log('📸 Snapshot captured from recording stream');
    } else {
      console.log('📸 No active video track, opening camera briefly...');
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      const video = document.createElement('video');
      video.srcObject = camStream;
      video.setAttribute('playsinline', 'true');
      await video.play();
      await new Promise(r => setTimeout(r, 500));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      camStream.getTracks().forEach(t => t.stop());
      console.log('📸 Snapshot from temp camera');
    }
  } catch (err) {
    console.warn('📸 Snapshot failed (continuing without it):', err);
  }

  // ═══ RESIZE + UPLOAD SNAPSHOT to ImgBB (free image host) ═══
  let snapshotUrl = '';
  if (snapshotDataUrl) {
    try {
      // Resize to max 480px width for fast upload
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = snapshotDataUrl;
      });
      const MAX_W = 480;
      if (img.width > MAX_W) {
        const scale = MAX_W / img.width;
        const canvas = document.createElement('canvas');
        canvas.width = MAX_W;
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.5);
        console.log('📸 Snapshot resized to', canvas.width, 'x', canvas.height);
      }
    } catch (e) { console.warn('📸 Resize failed, using original:', e); }

    // Upload to ImgBB to get a public URL (email clients block base64 data URIs)
    showToast('📸 Uploading snapshot…', 'info');
    snapshotUrl = await uploadSnapshot(snapshotDataUrl);
  }

  // ═══ FULLY AUTOMATIC EMAIL via EmailJS to ALL contacts ═══
  const emailContacts = contacts.filter(c => c.email);
  console.log('📧 Contacts with email:', emailContacts.length, emailContacts.map(c => c.email));
  console.log('📧 EmailJS available:', typeof emailjs !== 'undefined');

  if (emailContacts.length > 0 && typeof emailjs !== 'undefined') {
    showToast('📧 Sending emergency alerts automatically…', 'info');
    let emailsSent = 0;
    let emailsFailed = 0;

    // Build snapshot section with public URL (works in all email clients)
    const snapshotHtml = snapshotUrl
      ? `\n\n📸 CAMERA SNAPSHOT (at time of SOS):\n<img src="${snapshotUrl}" alt="Emergency Snapshot" style="max-width:100%;border-radius:8px;margin:8px 0;" />`
      : (snapshotDataUrl ? '\n\n📸 Camera snapshot was captured but could not be uploaded.' : '');

    // Live location link — opens Google Maps with directions to the person
    const liveDirectionsLink = location
      ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&travelmode=driving`
      : mapsLink;

    const fullMessage = `🚨🚨🚨 EMERGENCY ALERT 🚨🚨🚨\n\n${userName} IS IN DANGER AND NEEDS IMMEDIATE HELP!\n\n📍 LIVE GPS LOCATION (tap to open map):\n${mapsLink}\n\n🚗 GET DIRECTIONS TO THEM (navigate now):\n${liveDirectionsLink}\n\n🗯️ SATELLITE VIEW (see if forest/desert/city):\n${satelliteLink}\n\n🏠 ADDRESS:\n${address}\n\n📍 GPS Coordinates: Lat ${lat}, Lng ${lng}\n\n⏰ Time: ${timeNow}\n\n📹 VIDEO IS BEING RECORDED on their device for evidence.\n\n📞 Please CALL them immediately or contact local police!${snapshotHtml}\n\nThis is an automated SOS alert from SafeHer Safety App.`;

    const emailPromises = emailContacts.map(contact => {
      const templateParams = {
        to_email: contact.email,
        from_name: userName,
        location_link: mapsLink,
        satellite_link: satelliteLink,
        address: address,
        time: timeNow,
        snapshot_url: snapshotUrl,
        message: fullMessage
      };
      console.log(`📨 Sending email to ${contact.name}:`, templateParams);

      return emailjs.send('service_y8b36ls', 'template_58mvinn', templateParams)
        .then((response) => {
          emailsSent++;
          console.log(`✅ Email SENT to ${contact.name} (${contact.email})`, response);
        }).catch(err => {
          emailsFailed++;
          console.error(`❌ Email FAILED for ${contact.name} (${contact.email}):`, err);
        });
    });

    await Promise.allSettled(emailPromises);

    if (emailsSent > 0) {
      showToast(`✅ Alert auto-sent to ${emailsSent} contact${emailsSent > 1 ? 's' : ''}!`, 'success');
    }
    if (emailsFailed > 0) {
      showToast(`⚠️ ${emailsFailed} alert${emailsFailed > 1 ? 's' : ''} failed`, 'warning');
    }
  } else if (emailContacts.length === 0) {
    showToast('⚠️ No emails saved — add emails to contacts for auto-alerts', 'warning');
  } else {
    console.error('❌ EmailJS is NOT loaded! typeof emailjs =', typeof emailjs);
    showToast('❌ Email service not loaded — check internet connection', 'error');
  }

  // ═══ REAL-TIME LOCATION: Send updated location every 2 minutes ═══
  if (emailContacts.length > 0 && typeof emailjs !== 'undefined') {
    startLiveLocationUpdates(userName, emailContacts);
  }
}

/* ── Utility ── */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ══════════════════════════════════════════
   REAL-TIME LIVE LOCATION UPDATES
   Sends updated GPS every 2 minutes
   while SOS is active
   ══════════════════════════════════════════ */
let liveLocationInterval = null;
let locationUpdateCount = 0;

function startLiveLocationUpdates(userName, emailContacts) {
  // Stop any existing tracker
  stopLiveLocationUpdates();
  locationUpdateCount = 0;

  console.log('📍 Starting real-time location updates every 2 min...');

  liveLocationInterval = setInterval(async () => {
    locationUpdateCount++;

    // Stop after 30 updates (1 hour) to save EmailJS quota
    if (locationUpdateCount >= 30) {
      console.log('📍 Stopping location updates after 1 hour');
      stopLiveLocationUpdates();
      return;
    }

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          err => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      const lat = pos.lat.toFixed(6);
      const lng = pos.lng.toFixed(6);
      const newMapsLink = `https://www.google.com/maps?q=${pos.lat},${pos.lng}`;
      const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${pos.lat},${pos.lng}&travelmode=driving`;
      const timeNow = new Date().toLocaleString();

      console.log(`📍 Location update #${locationUpdateCount}: ${lat}, ${lng}`);

      // Send update email to all contacts
      const updatePromises = emailContacts.map(contact =>
        emailjs.send('service_y8b36ls', 'template_58mvinn', {
          to_email: contact.email,
          from_name: userName,
          location_link: newMapsLink,
          time: timeNow,
          message: `📍 LIVE LOCATION UPDATE #${locationUpdateCount}\n\n${userName} is still in an emergency!\n\n📍 CURRENT LOCATION:\n${newMapsLink}\n\n🚗 NAVIGATE TO THEM:\n${directionsLink}\n\n📍 GPS: Lat ${lat}, Lng ${lng}\n⏰ Time: ${timeNow}\n\n📹 Video is still recording.\n\nThis is an automated location update from SafeHer.`
        }).catch(err => console.error('❌ Location update email failed:', err))
      );

      await Promise.allSettled(updatePromises);
      console.log(`✅ Location update #${locationUpdateCount} sent`);

    } catch (err) {
      console.warn('⚠️ Could not get location for update:', err);
    }
  }, 2 * 60 * 1000); // Every 2 minutes
}

export function stopLiveLocationUpdates() {
  if (liveLocationInterval) {
    clearInterval(liveLocationInterval);
    liveLocationInterval = null;
    locationUpdateCount = 0;
    console.log('📍 Live location updates stopped');
  }
}

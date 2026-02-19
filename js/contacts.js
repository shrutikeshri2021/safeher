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
   SEND ALERT TO ALL CONTACTS (used by SOS)
   Uses EmailJS to auto-send real emails to
   every saved contact — no manual action needed
   Also triggers SMS and phone calls
   ══════════════════════════════════════════ */
export async function sendAlertToContacts(location) {
  console.log('🚨 sendAlertToContacts CALLED', location);

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
  const timeNow = new Date().toLocaleString();

  console.log('📍 Location:', lat, lng);
  console.log('🔗 Maps link:', mapsLink);

  const smsMessage = `🚨 EMERGENCY! ${userName} is in DANGER and needs IMMEDIATE help!\n\n📍 Location: ${mapsLink}\n📍 Lat: ${lat}, Lng: ${lng}\n⏰ Time: ${timeNow}\n\n📞 CALL THEM NOW or contact police!\n\n— SafeHer Safety App`;

  // ═══ 1. AUTO-SEND EMAILS via EmailJS to ALL contacts ═══
  const emailContacts = contacts.filter(c => c.email);
  console.log('📧 Contacts with email:', emailContacts.length, emailContacts.map(c => c.email));
  console.log('📧 EmailJS available:', typeof emailjs !== 'undefined');

  if (emailContacts.length > 0 && typeof emailjs !== 'undefined') {
    showToast('📧 Sending emergency emails…', 'info');
    let emailsSent = 0;
    let emailsFailed = 0;

    const emailPromises = emailContacts.map(contact => {
      const templateParams = {
        to_email: contact.email,
        from_name: userName,
        location_link: mapsLink,
        time: timeNow,
        message: `🚨🚨🚨 EMERGENCY ALERT 🚨🚨🚨\n\n${userName} IS IN DANGER AND NEEDS IMMEDIATE HELP!\n\n📍 LOCATION:\n${mapsLink}\n\n📍 Coordinates: Lat ${lat}, Lng ${lng}\n\n⏰ Time: ${timeNow}\n\n📞 Please CALL them immediately or contact local police!\n\nThis is an automated SOS alert from SafeHer Safety App.`
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
      showToast(`✅ Emergency email sent to ${emailsSent} contact${emailsSent > 1 ? 's' : ''}!`, 'success');
    }
    if (emailsFailed > 0) {
      showToast(`⚠️ ${emailsFailed} email${emailsFailed > 1 ? 's' : ''} failed to send`, 'warning');
    }
  } else if (emailContacts.length === 0) {
    showToast('⚠️ No emails saved — add emails to contacts for auto-alerts', 'warning');
  } else {
    console.error('❌ EmailJS is NOT loaded! typeof emailjs =', typeof emailjs);
    showToast('❌ Email service not loaded — check internet connection', 'error');
  }

  // ═══ 2. AUTO-TRIGGER SMS to ALL contacts (opens SMS app with message) ═══
  const phoneContacts = contacts.filter(c => c.phone);
  if (phoneContacts.length > 0) {
    const phones = phoneContacts.map(c => c.phone).join(',');
    const smsBody = encodeURIComponent(smsMessage);
    const smsLink = `sms:${phones}?body=${smsBody}`;
    // Use hidden <a> tag so it doesn't navigate away from the app
    const a = document.createElement('a');
    a.href = smsLink;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
    showToast('📱 Opening SMS with emergency message…', 'info');
  }

  // ═══ 3. AUTO-TRIGGER PHONE CALL to first contact ═══
  // (Browsers can only dial one number at a time via tel: link)
  if (phoneContacts.length > 0) {
    // Delay call trigger slightly so SMS opens first
    setTimeout(() => {
      const firstPhone = phoneContacts[0].phone;
      const telLink = `tel:${firstPhone}`;
      const a = document.createElement('a');
      a.href = telLink;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 100);
      showToast(`📞 Calling ${phoneContacts[0].name} (${firstPhone})…`, 'info');

      // Show remaining numbers to call if more than 1 contact
      if (phoneContacts.length > 1) {
        setTimeout(() => {
          const otherNames = phoneContacts.slice(1).map(c => `${c.name}: ${c.phone}`).join('\n');
          showToast(`📞 Also call:\n${otherNames}`, 'warning');
        }, 2000);
      }
    }, 1500);
  }
}

/* ── Utility ── */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

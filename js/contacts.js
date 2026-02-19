/* ═══════════════════════════════════════════════
   SafeHer — Contacts Module
   Emergency contacts CRUD & alert sending
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';

const STORAGE_KEY = 'safeher_contacts';

/* ── Data Layer ───────────────────────────────── */
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
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...data };
  saveContacts(contacts);
  return contacts[idx];
}

export function removeContact(id) {
  const contacts = getContacts().filter((c) => c.id !== id);
  saveContacts(contacts);
}

/* ── Render Contact List ──────────────────────── */
export function renderContacts() {
  const listEl = document.getElementById('contacts-list');
  const emptyEl = document.getElementById('contacts-empty');
  if (!listEl) return;

  const contacts = getContacts();

  // Clear existing cards (keep empty state el)
  listEl.querySelectorAll('.contact-card').forEach((el) => el.remove());

  if (contacts.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  contacts.forEach((c) => {
    const initials = c.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.dataset.id = c.id;
    card.innerHTML = `
      <div class="contact-avatar">${initials}</div>
      <div class="contact-details">
        <h4>${escapeHtml(c.name)}</h4>
        <p>${escapeHtml(c.phone)}</p>
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

/* ── Form Handling ────────────────────────────── */
export function initContactsUI() {
  const form = document.getElementById('contact-form');
  const cancelBtn = document.getElementById('btn-cancel-contact');
  const listEl = document.getElementById('contacts-list');
  const formTitle = document.getElementById('contact-form-title');
  const editIdEl = document.getElementById('contact-edit-id');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const relation = document.getElementById('contact-relation').value;

    if (!name || !phone) {
      showToast('Missing Info', 'Please enter name and phone number.', 'warning');
      return;
    }

    const editId = editIdEl.value;
    if (editId) {
      updateContact(editId, { name, phone, relation });
      showToast('Updated', `${name} has been updated.`, 'success');
      editIdEl.value = '';
      formTitle.textContent = 'Add Contact';
    } else {
      addContact({ name, phone, relation });
      showToast('Contact Added', `${name} added to emergency contacts.`, 'success');
    }
    form.reset();
    renderContacts();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      form.reset();
      editIdEl.value = '';
      formTitle.textContent = 'Add Contact';
    });
  }

  // Delegate edit/delete
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');

      if (editBtn) {
        const id = editBtn.dataset.id;
        const contact = getContacts().find((c) => c.id === id);
        if (!contact) return;
        document.getElementById('contact-name').value = contact.name;
        document.getElementById('contact-phone').value = contact.phone;
        document.getElementById('contact-relation').value = contact.relation;
        editIdEl.value = id;
        formTitle.textContent = 'Edit Contact';
        document.getElementById('contact-form-card').scrollIntoView({ behavior: 'smooth' });
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const card = deleteBtn.closest('.contact-card');
        if (card) {
          card.style.transition = 'opacity 0.2s, transform 0.2s';
          card.style.opacity = '0';
          card.style.transform = 'translateX(40px)';
          setTimeout(() => {
            removeContact(id);
            renderContacts();
            showToast('Removed', 'Contact has been removed.', 'info');
          }, 200);
        }
      }
    });
  }

  renderContacts();
}

/* ── Send Alert to All Contacts ───────────────── */
export async function sendAlertToContacts(location) {
  const contacts = getContacts();
  if (contacts.length === 0) {
    showToast('No Contacts', 'Add emergency contacts first.', 'warning');
    return;
  }

  const lat = location?.lat?.toFixed(6) || 'Unknown';
  const lng = location?.lng?.toFixed(6) || 'Unknown';
  const mapsLink = location
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
    : '';
  const message = `🚨 EMERGENCY SOS from SafeHer!\n\nI need help! My current location:\nLat: ${lat}, Lng: ${lng}\n${mapsLink}\n\nThis is an automated emergency alert.`;

  // Try Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: '🚨 SafeHer Emergency Alert',
        text: message
      });
      showToast('Alert Shared', 'Emergency message shared successfully.', 'success');
      return;
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Fall through to SMS
      }
    }
  }

  // Fallback: open SMS with pre-filled message
  const phones = contacts.map((c) => c.phone).join(',');
  const smsBody = encodeURIComponent(message);
  const smsLink = `sms:${phones}?body=${smsBody}`;

  try {
    window.open(smsLink, '_self');
    showToast('SMS Alert', 'Opening messaging app…', 'info');
  } catch {
    // Last resort: copy to clipboard
    try {
      await navigator.clipboard.writeText(message);
      showToast('Copied', 'Emergency message copied to clipboard. Send manually.', 'warning');
    } catch {
      showToast('Alert Ready', 'Share your location manually with contacts.', 'info');
    }
  }
}

/* ── Utility ──────────────────────────────────── */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

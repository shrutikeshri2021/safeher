/* ═══════════════════════════════════════════════
   SafeHer — Emergency Medical Info Module
   Blood type, allergies, medical conditions, ICE
   contacts. Stored in localStorage. Accessible
   from the Home screen as a quick-view card.
   ═══════════════════════════════════════════════ */

import { showToast } from './alerts.js';
import { logEvent } from './historyLogger.js';

const STORAGE_KEY = 'safeher_emergency_info';

/* ── Default empty profile ── */
const EMPTY_PROFILE = {
  fullName: '',
  dob: '',
  bloodType: '',
  allergies: '',
  medications: '',
  conditions: '',
  organDonor: false,
  insuranceInfo: '',
  emergencyNotes: ''
};

/* ═══════════════════════════════════════════════
   CRUD — localStorage
   ═══════════════════════════════════════════════ */
export function getEmergencyInfo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : { ...EMPTY_PROFILE };
  } catch (_) {
    return { ...EMPTY_PROFILE };
  }
}

export function saveEmergencyInfo(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (_) {
    return false;
  }
}

/* ═══════════════════════════════════════════════
   INIT — wire form, render preview
   ═══════════════════════════════════════════════ */
export function init() {
  wireForm();
  renderPreview();
  wireToggle();
}

/* ── Toggle between preview and edit ── */
function wireToggle() {
  const btnEdit = document.getElementById('btn-edit-emergency-info');
  const btnCancel = document.getElementById('btn-cancel-emergency-info');
  const preview = document.getElementById('emergency-info-preview');
  const form = document.getElementById('emergency-info-form-card');

  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      populateForm();
      if (preview) preview.classList.add('hidden');
      if (form) form.classList.remove('hidden');
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (form) form.classList.add('hidden');
      if (preview) preview.classList.remove('hidden');
    });
  }
}

/* ── Populate form fields from stored data ── */
function populateForm() {
  const info = getEmergencyInfo();
  const fields = ['fullName', 'dob', 'bloodType', 'allergies', 'medications', 'conditions', 'insuranceInfo', 'emergencyNotes'];
  fields.forEach(f => {
    const el = document.getElementById(`emed-${f}`);
    if (el) el.value = info[f] || '';
  });
  const donorEl = document.getElementById('emed-organDonor');
  if (donorEl) donorEl.checked = !!info.organDonor;
}

/* ── Wire save form ── */
function wireForm() {
  const form = document.getElementById('emergency-info-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      fullName: document.getElementById('emed-fullName')?.value?.trim() || '',
      dob: document.getElementById('emed-dob')?.value || '',
      bloodType: document.getElementById('emed-bloodType')?.value || '',
      allergies: document.getElementById('emed-allergies')?.value?.trim() || '',
      medications: document.getElementById('emed-medications')?.value?.trim() || '',
      conditions: document.getElementById('emed-conditions')?.value?.trim() || '',
      organDonor: document.getElementById('emed-organDonor')?.checked || false,
      insuranceInfo: document.getElementById('emed-insuranceInfo')?.value?.trim() || '',
      emergencyNotes: document.getElementById('emed-emergencyNotes')?.value?.trim() || ''
    };

    if (saveEmergencyInfo(data)) {
      showToast('Medical info saved ✅', 'success');
      renderPreview();
      logEvent('emergency_info_updated').catch(() => {});

      /* Switch back to preview */
      const formCard = document.getElementById('emergency-info-form-card');
      const preview = document.getElementById('emergency-info-preview');
      if (formCard) formCard.classList.add('hidden');
      if (preview) preview.classList.remove('hidden');
    } else {
      showToast('Failed to save info', 'error');
    }
  });
}

/* ═══════════════════════════════════════════════
   RENDER PREVIEW CARD
   Shows stored data in a clean, read-only format
   ═══════════════════════════════════════════════ */
export function renderPreview() {
  const container = document.getElementById('emergency-info-preview-body');
  if (!container) return;

  const info = getEmergencyInfo();
  const hasData = info.fullName || info.bloodType || info.allergies || info.conditions || info.medications;

  if (!hasData) {
    container.innerHTML = `
      <div class="emed-empty">
        <p>No medical information saved yet.</p>
        <p class="small">Tap "Edit" to add your emergency medical details.</p>
      </div>`;
    return;
  }

  const rows = [];

  if (info.fullName) rows.push(makeRow('👤', 'Name', info.fullName));
  if (info.dob) rows.push(makeRow('🎂', 'Date of Birth', formatDOB(info.dob)));
  if (info.bloodType) rows.push(makeRow('🩸', 'Blood Type', info.bloodType));
  if (info.allergies) rows.push(makeRow('⚠️', 'Allergies', info.allergies));
  if (info.medications) rows.push(makeRow('💊', 'Medications', info.medications));
  if (info.conditions) rows.push(makeRow('🏥', 'Conditions', info.conditions));
  rows.push(makeRow('🫀', 'Organ Donor', info.organDonor ? 'Yes' : 'No'));
  if (info.insuranceInfo) rows.push(makeRow('🪪', 'Insurance', info.insuranceInfo));
  if (info.emergencyNotes) rows.push(makeRow('📝', 'Notes', info.emergencyNotes));

  container.innerHTML = rows.join('');
}

function makeRow(icon, label, value) {
  return `<div class="emed-row">
    <span class="emed-icon">${icon}</span>
    <div class="emed-detail">
      <span class="emed-label">${label}</span>
      <span class="emed-value">${escapeHTML(value)}</span>
    </div>
  </div>`;
}

function formatDOB(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (_) {
    return dateStr;
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════
   GET SUMMARY — for external modules
   Returns a compact summary string for
   embedding in alert emails or display.
   ═══════════════════════════════════════════════ */
export function getEmergencySummary() {
  const info = getEmergencyInfo();
  const parts = [];
  if (info.fullName) parts.push(`Name: ${info.fullName}`);
  if (info.bloodType) parts.push(`Blood: ${info.bloodType}`);
  if (info.allergies) parts.push(`Allergies: ${info.allergies}`);
  if (info.medications) parts.push(`Meds: ${info.medications}`);
  if (info.conditions) parts.push(`Conditions: ${info.conditions}`);
  if (info.organDonor) parts.push('Organ Donor: Yes');
  return parts.join(' | ') || 'No medical info saved';
}

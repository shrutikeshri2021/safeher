/* ═══════════════════════════════════════════════
   SafeHer — History Screen UI Module
   Stats cards, search/filter, timeline, expanded
   event cards, export, clear all, live updates
   ═══════════════════════════════════════════════ */

import { getAllHistory, getHistoryStats, clearAllHistory, deleteHistoryEvent } from './db.js';
import { showToast } from './alerts.js';

/* ──── State ──── */
let allEvents       = [];
let filteredEvents  = [];
let currentFilter   = 'all';      // 'all' | severity
let currentSearch   = '';
let currentSort     = 'newest';   // 'newest' | 'oldest'
let displayedCount  = 0;
const PAGE_SIZE     = 20;
let expandedCardId  = null;
let initialized     = false;

/* ══════════════════════════════════════════
   init()  — called once from app.js
   ══════════════════════════════════════════ */
export function init() {
  if (initialized) return;
  initialized = true;

  wireControls();

  /* Live updates — re-render when a new event arrives */
  document.addEventListener('safeher:history-updated', () => {
    refreshHistory();
  });
}

/* ══════════════════════════════════════════
   refreshHistory()  — public, called on tab show
   ══════════════════════════════════════════ */
export async function refreshHistory() {
  try {
    allEvents = await getAllHistory();
  } catch (_) {
    allEvents = [];
  }
  applyFilters();
  await renderStatCards();
  renderEventList();
  updateBadge();
}

/* ══════════════════════════════════════════
   STAT CARDS
   ══════════════════════════════════════════ */
async function renderStatCards() {
  const container = document.getElementById('history-stats');
  if (!container) return;

  let stats;
  try { stats = await getHistoryStats(); } catch (_) { stats = { total: 0, critical: 0, warning: 0, safe: 0, last24h: 0 }; }

  container.innerHTML = `
    <div class="hist-stat-card hist-stat--total">
      <span class="hist-stat-num">${stats.total}</span>
      <span class="hist-stat-label">Total Events</span>
    </div>
    <div class="hist-stat-card hist-stat--critical">
      <span class="hist-stat-num">${stats.critical}</span>
      <span class="hist-stat-label">Critical</span>
    </div>
    <div class="hist-stat-card hist-stat--warning">
      <span class="hist-stat-num">${stats.warning}</span>
      <span class="hist-stat-label">Warnings</span>
    </div>
    <div class="hist-stat-card hist-stat--safe">
      <span class="hist-stat-num">${stats.safe}</span>
      <span class="hist-stat-label">Safe</span>
    </div>
  `;
}

/* ══════════════════════════════════════════
   FILTER / SEARCH LOGIC
   ══════════════════════════════════════════ */
function applyFilters() {
  let list = [...allEvents];

  /* Severity filter */
  if (currentFilter !== 'all') {
    list = list.filter(e => e.severity === currentFilter);
  }

  /* Text search */
  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    list = list.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.type || '').toLowerCase().includes(q) ||
      (e.location?.address || '').toLowerCase().includes(q)
    );
  }

  /* Sort */
  if (currentSort === 'oldest') {
    list.sort((a, b) => a.timestamp - b.timestamp);
  } else {
    list.sort((a, b) => b.timestamp - a.timestamp);
  }

  filteredEvents = list;
  displayedCount = 0;
}

/* ══════════════════════════════════════════
   WIRE CONTROLS (search, filter chips, sort, export, clear)
   ══════════════════════════════════════════ */
function wireControls() {
  /* Search */
  const searchInput = document.getElementById('history-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value;
      applyFilters();
      renderEventList();
    });
  }

  /* Filter chips */
  const chipContainer = document.getElementById('history-filter-chips');
  if (chipContainer) {
    chipContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.hist-chip');
      if (!chip) return;
      chipContainer.querySelectorAll('.hist-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      applyFilters();
      renderEventList();
    });
  }

  /* Sort toggle */
  const sortBtn = document.getElementById('history-sort-btn');
  if (sortBtn) {
    sortBtn.addEventListener('click', () => {
      currentSort = currentSort === 'newest' ? 'oldest' : 'newest';
      sortBtn.textContent = currentSort === 'newest' ? '↓ Newest' : '↑ Oldest';
      applyFilters();
      renderEventList();
    });
  }

  /* Export */
  const exportBtn = document.getElementById('history-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportHistory);

  /* Clear All */
  const clearBtn = document.getElementById('history-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', handleClearAll);

  /* Load More (infinite scroll) */
  const loadMoreBtn = document.getElementById('history-load-more');
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => loadMoreEvents());
}

/* ══════════════════════════════════════════
   RENDER EVENT LIST
   ══════════════════════════════════════════ */
function renderEventList() {
  const listEl  = document.getElementById('history-event-list');
  const emptyEl = document.getElementById('history-empty');
  const loadMoreBtn = document.getElementById('history-load-more');
  if (!listEl) return;

  listEl.innerHTML = '';
  displayedCount = 0;
  expandedCardId = null;

  if (filteredEvents.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  loadMoreEvents();
}

/* ══════════════════════════════════════════
   LOAD MORE (pagination)
   ══════════════════════════════════════════ */
function loadMoreEvents() {
  const listEl = document.getElementById('history-event-list');
  const loadMoreBtn = document.getElementById('history-load-more');
  if (!listEl) return;

  const nextBatch = filteredEvents.slice(displayedCount, displayedCount + PAGE_SIZE);
  let lastDateHeader = listEl.querySelector('.hist-date-header:last-of-type')?.textContent || '';

  nextBatch.forEach(evt => {
    /* Date header (group by day) */
    const dateStr = formatDateHeader(evt.timestamp);
    if (dateStr !== lastDateHeader) {
      const header = document.createElement('div');
      header.className = 'hist-date-header';
      header.textContent = dateStr;
      listEl.appendChild(header);
      lastDateHeader = dateStr;
    }

    listEl.appendChild(createEventCard(evt));
  });

  displayedCount += nextBatch.length;

  if (loadMoreBtn) {
    if (displayedCount >= filteredEvents.length) {
      loadMoreBtn.classList.add('hidden');
    } else {
      loadMoreBtn.classList.remove('hidden');
      loadMoreBtn.textContent = `Load More (${filteredEvents.length - displayedCount} remaining)`;
    }
  }
}

/* ══════════════════════════════════════════
   CREATE EVENT CARD
   ══════════════════════════════════════════ */
function createEventCard(evt) {
  const card = document.createElement('div');
  card.className = `hist-event-card hist-severity--${evt.severity || 'info'}`;
  card.dataset.id = evt.id;

  const timeStr  = new Date(evt.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const locStr   = evt.location?.address
    ? truncate(evt.location.address, 40)
    : (evt.location?.lat ? `${evt.location.lat.toFixed(4)}, ${evt.location.lng.toFixed(4)}` : '');

  const severityIcons = { critical: '🔴', warning: '🟡', info: '🔵', safe: '🟢' };

  card.innerHTML = `
    <div class="hist-card-header">
      <span class="hist-severity-dot">${severityIcons[evt.severity] || '⚪'}</span>
      <div class="hist-card-info">
        <h4 class="hist-card-title">${escapeHtml(evt.title || evt.type)}</h4>
        <span class="hist-card-time">${timeStr}${locStr ? ' · 📍 ' + escapeHtml(locStr) : ''}</span>
      </div>
      <button class="hist-expand-btn" aria-label="Expand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="hist-card-expanded hidden">
      ${renderExpandedContent(evt)}
    </div>
  `;

  /* Toggle expand/collapse */
  const header = card.querySelector('.hist-card-header');
  header.addEventListener('click', () => {
    const expanded = card.querySelector('.hist-card-expanded');
    const btn = card.querySelector('.hist-expand-btn');
    const isOpen = !expanded.classList.contains('hidden');

    /* Close previously open card */
    if (expandedCardId && expandedCardId !== evt.id) {
      const prevCard = document.querySelector(`.hist-event-card[data-id="${expandedCardId}"]`);
      if (prevCard) {
        prevCard.querySelector('.hist-card-expanded')?.classList.add('hidden');
        prevCard.querySelector('.hist-expand-btn')?.classList.remove('rotated');
      }
    }

    if (isOpen) {
      expanded.classList.add('hidden');
      btn.classList.remove('rotated');
      expandedCardId = null;
    } else {
      expanded.classList.remove('hidden');
      btn.classList.add('rotated');
      expandedCardId = evt.id;
    }
  });

  return card;
}

/* ══════════════════════════════════════════
   EXPANDED CONTENT
   ══════════════════════════════════════════ */
function renderExpandedContent(evt) {
  let html = '';

  /* 1. Location section */
  if (evt.location && evt.location.lat) {
    html += `
      <div class="hist-detail-section">
        <h5>📍 Location</h5>
        <p>${escapeHtml(evt.location.address || `${evt.location.lat.toFixed(6)}, ${evt.location.lng.toFixed(6)}`)}</p>
        ${evt.location.accuracy ? `<p class="hist-detail-sub">Accuracy: ${Math.round(evt.location.accuracy)}m</p>` : ''}
        <a class="hist-map-link" href="https://www.google.com/maps?q=${evt.location.lat},${evt.location.lng}" target="_blank" rel="noopener">View on Google Maps ↗</a>
      </div>
    `;
  }

  /* 2. Trigger details */
  if (evt.trigger && Object.keys(evt.trigger).length > 0) {
    const details = [];
    if (evt.trigger.method) details.push(`Method: ${evt.trigger.method}`);
    if (evt.trigger.keyword) details.push(`Keyword: "${evt.trigger.keyword}"`);
    if (evt.trigger.motionValue) details.push(`Motion: ${evt.trigger.motionValue} m/s²`);
    if (details.length > 0) {
      html += `
        <div class="hist-detail-section">
          <h5>⚡ Trigger</h5>
          ${details.map(d => `<p>${escapeHtml(d)}</p>`).join('')}
        </div>
      `;
    }
  }

  /* 3. Media info */
  if (evt.media && (evt.media.hasVideo || evt.media.hasPhoto || evt.media.hasAudio)) {
    html += `
      <div class="hist-detail-section">
        <h5>📹 Media</h5>
        ${evt.media.hasVideo ? `<p>🎬 Video recorded${evt.media.videoDuration ? ' (' + fmtDuration(evt.media.videoDuration) + ')' : ''}</p>` : ''}
        ${evt.media.hasAudio ? '<p>🎙️ Audio recorded</p>' : ''}
        ${evt.media.hasPhoto ? '<p>📷 Photo captured</p>' : ''}
      </div>
    `;
  }

  /* 4. Contacts alerted */
  if (evt.contacts && evt.contacts.alerted) {
    html += `
      <div class="hist-detail-section">
        <h5>📨 Contacts</h5>
        <p>${evt.contacts.alertedCount || 0} contact(s) alerted</p>
        ${evt.contacts.contactNames ? `<p class="hist-detail-sub">${escapeHtml(evt.contacts.contactNames)}</p>` : ''}
      </div>
    `;
  }

  /* 5. Journey info */
  if (evt.journey && (evt.journey.distance || evt.journey.duration || evt.journey.points)) {
    html += `
      <div class="hist-detail-section">
        <h5>🗺️ Journey</h5>
        ${evt.journey.distance ? `<p>Distance: ${evt.journey.distance}</p>` : ''}
        ${evt.journey.duration ? `<p>Duration: ${evt.journey.duration}</p>` : ''}
        ${evt.journey.points ? `<p>Track points: ${evt.journey.points}</p>` : ''}
      </div>
    `;
  }

  /* 6. System info */
  if (evt.system) {
    const sysInfo = [];
    if (evt.system.batteryLevel != null) sysInfo.push(`🔋 Battery: ${evt.system.batteryLevel}%`);
    if (evt.system.networkType) sysInfo.push(`📶 Network: ${evt.system.networkType}`);
    if (evt.system.appVersion) sysInfo.push(`📱 Version: ${evt.system.appVersion}`);
    if (sysInfo.length > 0) {
      html += `
        <div class="hist-detail-section">
          <h5>🔧 System</h5>
          ${sysInfo.map(s => `<p>${escapeHtml(s)}</p>`).join('')}
        </div>
      `;
    }
  }

  /* 7. Timestamp */
  html += `
    <div class="hist-detail-section">
      <h5>🕐 Time</h5>
      <p>${new Date(evt.timestamp).toLocaleString()}</p>
    </div>
  `;

  /* 8. Delete button */
  html += `
    <div class="hist-card-actions">
      <button class="hist-delete-btn" data-id="${evt.id}">🗑️ Delete Event</button>
    </div>
  `;

  /* Wire delete after a tick (DOM needs to exist) */
  setTimeout(() => {
    const delBtn = document.querySelector(`.hist-delete-btn[data-id="${evt.id}"]`);
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await deleteHistoryEvent(evt.id);
          showToast('Event deleted', 'info');
          refreshHistory();
        } catch (_) {
          showToast('Failed to delete', 'error');
        }
      });
    }
  }, 50);

  return html || '<p class="hist-detail-sub">No additional details.</p>';
}

/* ══════════════════════════════════════════
   EXPORT HISTORY
   ══════════════════════════════════════════ */
async function exportHistory() {
  try {
    const events = allEvents;
    if (events.length === 0) {
      showToast('No events to export', 'info');
      return;
    }

    /* CSV */
    const header = 'Timestamp,Type,Title,Severity,Latitude,Longitude,Address\n';
    const rows = events.map(e => {
      const ts  = new Date(e.timestamp).toISOString();
      const lat = e.location?.lat || '';
      const lng = e.location?.lng || '';
      const addr = (e.location?.address || '').replace(/"/g, '""');
      return `"${ts}","${e.type}","${(e.title || '').replace(/"/g, '""')}","${e.severity}","${lat}","${lng}","${addr}"`;
    }).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SafeHer_History_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Exported ${events.length} events`, 'success');
  } catch (_) {
    showToast('Export failed', 'error');
  }
}

/* ══════════════════════════════════════════
   CLEAR ALL
   ══════════════════════════════════════════ */
async function handleClearAll() {
  if (!confirm('Delete ALL history events? This cannot be undone.')) return;
  try {
    await clearAllHistory();
    showToast('All history cleared', 'info');
    refreshHistory();
  } catch (_) {
    showToast('Failed to clear history', 'error');
  }
}

/* ══════════════════════════════════════════
   BADGE UPDATE
   ══════════════════════════════════════════ */
function updateBadge() {
  const navBtn = document.querySelector('[data-screen="history"]');
  if (!navBtn) return;
  let badge = navBtn.querySelector('.nav-badge');

  const count = allEvents.length;
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.style.cssText = 'position:absolute;top:2px;right:2px;background:var(--accent-red);color:#fff;font-size:.55rem;padding:1px 4px;border-radius:10px;font-weight:700;';
      navBtn.style.position = 'relative';
      navBtn.appendChild(badge);
    }
    badge.textContent = count > 99 ? '99+' : count;
  } else if (badge) {
    badge.remove();
  }
}

/* ══════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════ */
function formatDateHeader(ts) {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(sec) {
  if (!sec && sec !== 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

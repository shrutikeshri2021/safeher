/* ═══════════════════════════════════════════════
   SafeHer — Activity Insights (Feature 6)
   Chart.js 4.4 integration — visual analytics
   for safety events from IndexedDB history.

   Charts:
   1. Severity Doughnut — critical/warning/info/safe
   2. Timeline Bar — events per day (last 7 days)
   3. Hourly Heat — events by hour (0–23)
   4. Event-type Top-5 horizontal bar
   ═══════════════════════════════════════════════ */

import { getAllHistory, getHistoryStats } from './db.js';

const TAG = '[ActivityInsights]';

/* ──── State ──── */
let initialized = false;
let charts = {};          // { severity, timeline, hourly, topTypes }
let insightsVisible = false;

/* ──── Color palette (matches Neon Guardian design) ──── */
const COLORS = {
  critical: '#FF3366',
  warning:  '#FFB800',
  info:     '#00D4FF',
  safe:     '#00FF88',
  purple:   '#A78BFA',
  white60:  'rgba(255,255,255,0.6)',
  white20:  'rgba(255,255,255,0.2)',
  gridLine: 'rgba(255,255,255,0.06)',
  cardBg:   'rgba(255,255,255,0.04)'
};

/* ══════════════════════════════════════════
   init()
   ══════════════════════════════════════════ */
export function init() {
  try {
    if (initialized) return;
    initialized = true;

    wireToggle();

    /* Listen for history updates → refresh if panel is visible */
    document.addEventListener('safeher:history-updated', () => {
      try {
        if (insightsVisible) refreshInsights();
      } catch (e) { console.log(TAG, 'live-update skip', e.message); }
    });

    console.log(TAG, 'initialized');
  } catch (err) {
    console.log(TAG, 'init error', err.message);
  }
}

/* ══════════════════════════════════════════
   wireToggle() — Show/Hide insights panel
   ══════════════════════════════════════════ */
function wireToggle() {
  try {
    const btn = document.getElementById('btn-toggle-insights');
    if (!btn) { console.log(TAG, 'toggle button not found'); return; }

    btn.addEventListener('click', () => {
      try {
        const panel = document.getElementById('insights-panel');
        if (!panel) return;

        insightsVisible = !insightsVisible;
        panel.classList.toggle('hidden', !insightsVisible);
        btn.textContent = insightsVisible ? '📊 Hide Insights' : '📊 Show Insights';

        if (insightsVisible) refreshInsights();
      } catch (e) { console.log(TAG, 'toggle error', e.message); }
    });
  } catch (err) {
    console.log(TAG, 'wireToggle error', err.message);
  }
}

/* ══════════════════════════════════════════
   refreshInsights() — public, also called
   when history tab becomes active
   ══════════════════════════════════════════ */
export async function refreshInsights() {
  try {
    if (!insightsVisible) return;
    console.log(TAG, 'refreshing insights…');
    const events = await getAllHistory();
    if (!events || events.length === 0) {
      showEmptyState();
      return;
    }
    hideEmptyState();
    await renderSeverityChart(events);
    await renderTimelineChart(events);
    await renderHourlyChart(events);
    await renderTopTypesChart(events);
    renderSummaryCards(events);
  } catch (err) {
    console.log(TAG, 'refresh error', err.message);
  }
}

/* ══════════════════════════════════════════
   Chart.js global defaults (applied lazily)
   ══════════════════════════════════════════ */
function applyChartDefaults() {
  try {
    if (typeof Chart === 'undefined') {
      console.log(TAG, 'Chart.js not loaded');
      return false;
    }
    Chart.defaults.color = COLORS.white60;
    Chart.defaults.borderColor = COLORS.gridLine;
    Chart.defaults.font.family = 'Outfit, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation.duration = 600;
    Chart.defaults.plugins.legend.labels.padding = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    return true;
  } catch (err) {
    console.log(TAG, 'applyChartDefaults error', err.message);
    return false;
  }
}

/* ══════════════════════════════════════════
   1. Severity Doughnut
   ══════════════════════════════════════════ */
async function renderSeverityChart(events) {
  try {
    if (!applyChartDefaults()) return;
    const canvas = document.getElementById('chart-severity');
    if (!canvas) return;

    const counts = { critical: 0, warning: 0, info: 0, safe: 0 };
    events.forEach(e => {
      if (counts[e.severity] !== undefined) counts[e.severity]++;
    });

    if (charts.severity) charts.severity.destroy();

    charts.severity = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'Warning', 'Info', 'Safe'],
        datasets: [{
          data: [counts.critical, counts.warning, counts.info, counts.safe],
          backgroundColor: [COLORS.critical, COLORS.warning, COLORS.info, COLORS.safe],
          borderColor: 'transparent',
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 }
          },
          tooltip: {
            backgroundColor: 'rgba(10,14,26,0.9)',
            titleColor: '#F0F4FF',
            bodyColor: '#F0F4FF',
            borderColor: COLORS.gridLine,
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10
          }
        }
      }
    });
    console.log(TAG, 'severity chart rendered');
  } catch (err) {
    console.log(TAG, 'severity chart error', err.message);
  }
}

/* ══════════════════════════════════════════
   2. Timeline Bar (last 7 days)
   ══════════════════════════════════════════ */
async function renderTimelineChart(events) {
  try {
    if (!applyChartDefaults()) return;
    const canvas = document.getElementById('chart-timeline');
    if (!canvas) return;

    /* Build day buckets for last 7 days */
    const dayLabels = [];
    const dayCounts = { critical: [], warning: [], info: [], safe: [] };
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);  // YYYY-MM-DD
      const label = d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
      dayLabels.push(label);

      const dayStart = new Date(key + 'T00:00:00').getTime();
      const dayEnd   = dayStart + 86400000;
      const dayEvents = events.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd);

      dayCounts.critical.push(dayEvents.filter(e => e.severity === 'critical').length);
      dayCounts.warning.push(dayEvents.filter(e => e.severity === 'warning').length);
      dayCounts.info.push(dayEvents.filter(e => e.severity === 'info').length);
      dayCounts.safe.push(dayEvents.filter(e => e.severity === 'safe').length);
    }

    if (charts.timeline) charts.timeline.destroy();

    charts.timeline = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [
          { label: 'Critical', data: dayCounts.critical, backgroundColor: COLORS.critical, borderRadius: 4 },
          { label: 'Warning',  data: dayCounts.warning,  backgroundColor: COLORS.warning,  borderRadius: 4 },
          { label: 'Info',     data: dayCounts.info,     backgroundColor: COLORS.info,     borderRadius: 4 },
          { label: 'Safe',     data: dayCounts.safe,     backgroundColor: COLORS.safe,     borderRadius: 4 }
        ]
      },
      options: {
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            backgroundColor: 'rgba(10,14,26,0.9)',
            titleColor: '#F0F4FF',
            bodyColor: '#F0F4FF',
            borderColor: COLORS.gridLine,
            borderWidth: 1,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: COLORS.white60, font: { size: 10 } }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { stepSize: 1, color: COLORS.white60 },
            grid: { color: COLORS.gridLine }
          }
        }
      }
    });
    console.log(TAG, 'timeline chart rendered');
  } catch (err) {
    console.log(TAG, 'timeline chart error', err.message);
  }
}

/* ══════════════════════════════════════════
   3. Hourly Activity (0–23h)
   ══════════════════════════════════════════ */
async function renderHourlyChart(events) {
  try {
    if (!applyChartDefaults()) return;
    const canvas = document.getElementById('chart-hourly');
    if (!canvas) return;

    const hourCounts = new Array(24).fill(0);
    events.forEach(e => {
      try {
        const h = new Date(e.timestamp).getHours();
        hourCounts[h]++;
      } catch (_) {}
    });

    const labels = [];
    for (let i = 0; i < 24; i++) {
      labels.push(i.toString().padStart(2, '0') + ':00');
    }

    /* Gradient fill for the line */
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement?.clientHeight || 200);
    gradient.addColorStop(0, 'rgba(0,212,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,212,255,0.01)');

    if (charts.hourly) charts.hourly.destroy();

    charts.hourly = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Events',
          data: hourCounts,
          borderColor: COLORS.info,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: COLORS.info,
          pointBorderColor: 'transparent'
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,14,26,0.9)',
            titleColor: '#F0F4FF',
            bodyColor: '#F0F4FF',
            borderColor: COLORS.gridLine,
            borderWidth: 1,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: COLORS.white60,
              font: { size: 9 },
              maxRotation: 45,
              callback: function(val, idx) { return idx % 3 === 0 ? this.getLabelForValue(val) : ''; }
            }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: COLORS.white60 },
            grid: { color: COLORS.gridLine }
          }
        }
      }
    });
    console.log(TAG, 'hourly chart rendered');
  } catch (err) {
    console.log(TAG, 'hourly chart error', err.message);
  }
}

/* ══════════════════════════════════════════
   4. Top Event Types — horizontal bar
   ══════════════════════════════════════════ */
async function renderTopTypesChart(events) {
  try {
    if (!applyChartDefaults()) return;
    const canvas = document.getElementById('chart-top-types');
    if (!canvas) return;

    /* Count by type */
    const typeMap = {};
    events.forEach(e => {
      try {
        typeMap[e.type] = (typeMap[e.type] || 0) + 1;
      } catch (_) {}
    });

    /* Sort descending, take top 5 */
    const sorted = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const labels = sorted.map(([type]) => formatTypeName(type));
    const data   = sorted.map(([, count]) => count);
    const colors = sorted.map((_, i) => {
      const palette = [COLORS.critical, COLORS.warning, COLORS.info, COLORS.safe, COLORS.purple];
      return palette[i % palette.length];
    });

    if (charts.topTypes) charts.topTypes.destroy();

    charts.topTypes = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderRadius: 6,
          barThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,14,26,0.9)',
            titleColor: '#F0F4FF',
            bodyColor: '#F0F4FF',
            borderColor: COLORS.gridLine,
            borderWidth: 1,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: COLORS.white60 },
            grid: { color: COLORS.gridLine }
          },
          y: {
            grid: { display: false },
            ticks: { color: COLORS.white60, font: { size: 11 } }
          }
        }
      }
    });
    console.log(TAG, 'top-types chart rendered');
  } catch (err) {
    console.log(TAG, 'top-types chart error', err.message);
  }
}

/* ══════════════════════════════════════════
   Summary stat cards above charts
   ══════════════════════════════════════════ */
function renderSummaryCards(events) {
  try {
    const container = document.getElementById('insights-summary');
    if (!container) return;

    const now = Date.now();
    const day = 86400000;
    const week = day * 7;

    const last24h = events.filter(e => (now - e.timestamp) < day).length;
    const last7d  = events.filter(e => (now - e.timestamp) < week).length;
    const criticalCount = events.filter(e => e.severity === 'critical').length;

    /* Average events per day over last 7 days */
    const avgPerDay = last7d > 0 ? (last7d / 7).toFixed(1) : '0';

    /* Most active hour */
    const hourCounts = new Array(24).fill(0);
    events.forEach(e => {
      try { hourCounts[new Date(e.timestamp).getHours()]++; } catch (_) {}
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakLabel = peakHour.toString().padStart(2, '0') + ':00';

    container.innerHTML = `
      <div class="insight-stat">
        <span class="insight-stat-value">${last24h}</span>
        <span class="insight-stat-label">Last 24h</span>
      </div>
      <div class="insight-stat">
        <span class="insight-stat-value">${avgPerDay}</span>
        <span class="insight-stat-label">Avg/Day</span>
      </div>
      <div class="insight-stat">
        <span class="insight-stat-value insight-stat--critical">${criticalCount}</span>
        <span class="insight-stat-label">Critical</span>
      </div>
      <div class="insight-stat">
        <span class="insight-stat-value">${peakLabel}</span>
        <span class="insight-stat-label">Peak Hour</span>
      </div>
    `;
  } catch (err) {
    console.log(TAG, 'summary cards error', err.message);
  }
}

/* ══════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════ */
function formatTypeName(type) {
  try {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch (_) {
    return type;
  }
}

function showEmptyState() {
  try {
    const el = document.getElementById('insights-empty');
    const panel = document.getElementById('insights-charts');
    if (el) el.classList.remove('hidden');
    if (panel) panel.classList.add('hidden');
  } catch (_) {}
}

function hideEmptyState() {
  try {
    const el = document.getElementById('insights-empty');
    const panel = document.getElementById('insights-charts');
    if (el) el.classList.add('hidden');
    if (panel) panel.classList.remove('hidden');
  } catch (_) {}
}

/* ── Destroy all charts (cleanup) ── */
export function destroyCharts() {
  try {
    Object.values(charts).forEach(c => { try { c.destroy(); } catch (_) {} });
    charts = {};
    console.log(TAG, 'charts destroyed');
  } catch (err) {
    console.log(TAG, 'destroyCharts error', err.message);
  }
}

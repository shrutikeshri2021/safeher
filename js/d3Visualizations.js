/* ═══════════════════════════════════════════════
   SafeHer — D3.js Visualizations (Feature 7)
   Advanced interactive visualizations using D3 v7.

   Visualizations:
   1. Safety Score Gauge — radial arc gauge
   2. Event Heatmap — GitHub-style calendar heat
   3. Threat Timeline — zoomable event stream
   4. Severity Trend — sparkline over 30 days
   ═══════════════════════════════════════════════ */

import { getAllHistory } from './db.js';

const TAG = '[D3Viz]';

/* ──── State ──── */
let initialized = false;
let vizVisible = false;

/* ──── Neon Guardian palette ──── */
const C = {
  critical: '#FF3366',
  warning:  '#FFB800',
  info:     '#00D4FF',
  safe:     '#00FF88',
  purple:   '#A78BFA',
  bg:       '#0A0E1A',
  card:     'rgba(255,255,255,0.04)',
  border:   'rgba(255,255,255,0.06)',
  text:     '#F0F4FF',
  textDim:  'rgba(255,255,255,0.5)',
  gridLine: 'rgba(255,255,255,0.08)'
};

/* ══════════════════════════════════════════
   init()
   ══════════════════════════════════════════ */
export function init() {
  try {
    if (initialized) return;
    initialized = true;
    wireToggle();

    document.addEventListener('safeher:history-updated', () => {
      try { if (vizVisible) refreshVisualizations(); } catch (e) { console.log(TAG, 'live-update skip', e.message); }
    });

    console.log(TAG, 'initialized');
  } catch (err) {
    console.log(TAG, 'init error', err.message);
  }
}

/* ══════════════════════════════════════════
   wireToggle()
   ══════════════════════════════════════════ */
function wireToggle() {
  try {
    const btn = document.getElementById('btn-toggle-d3viz');
    if (!btn) { console.log(TAG, 'toggle button not found'); return; }

    btn.addEventListener('click', () => {
      try {
        const panel = document.getElementById('d3viz-panel');
        if (!panel) return;
        vizVisible = !vizVisible;
        panel.classList.toggle('hidden', !vizVisible);
        btn.textContent = vizVisible ? '🔬 Hide Visualizations' : '🔬 Show Visualizations';
        if (vizVisible) refreshVisualizations();
      } catch (e) { console.log(TAG, 'toggle error', e.message); }
    });
  } catch (err) {
    console.log(TAG, 'wireToggle error', err.message);
  }
}

/* ══════════════════════════════════════════
   refreshVisualizations() — public
   ══════════════════════════════════════════ */
export async function refreshVisualizations() {
  try {
    if (!vizVisible) return;
    if (typeof d3 === 'undefined') { console.log(TAG, 'D3.js not loaded'); return; }
    console.log(TAG, 'refreshing visualizations…');
    const events = await getAllHistory();
    if (!events || events.length === 0) {
      showEmpty(); return;
    }
    hideEmpty();
    renderSafetyGauge(events);
    renderHeatmapCalendar(events);
    renderThreatTimeline(events);
    renderSeveritySparkline(events);
  } catch (err) {
    console.log(TAG, 'refresh error', err.message);
  }
}

/* ══════════════════════════════════════════
   1. Safety Score Gauge — radial arc
   Score = 100 - (critical*15 + warning*5) clamped 0-100
   ══════════════════════════════════════════ */
function renderSafetyGauge(events) {
  try {
    const container = d3.select('#d3-safety-gauge');
    if (container.empty()) return;
    container.selectAll('*').remove();

    const last7d = events.filter(e => (Date.now() - e.timestamp) < 604800000);
    const critCount = last7d.filter(e => e.severity === 'critical').length;
    const warnCount = last7d.filter(e => e.severity === 'warning').length;
    const score = Math.max(0, Math.min(100, 100 - (critCount * 15 + warnCount * 5)));

    const width = container.node().clientWidth || 260;
    const height = 180;
    const radius = Math.min(width, height * 2) / 2 - 20;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height - 10})`);

    const arcGen = d3.arc()
      .innerRadius(radius - 18)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .cornerRadius(4);

    /* Background arc */
    svg.append('path')
      .attr('d', arcGen.endAngle(Math.PI / 2)())
      .attr('fill', C.border);

    /* Score color */
    const scoreColor = score >= 70 ? C.safe : score >= 40 ? C.warning : C.critical;

    /* Foreground arc — animated */
    const endAngle = -Math.PI / 2 + (score / 100) * Math.PI;
    svg.append('path')
      .attr('d', arcGen.endAngle(-Math.PI / 2)())
      .attr('fill', scoreColor)
      .transition()
      .duration(800)
      .attrTween('d', function () {
        const interp = d3.interpolate(-Math.PI / 2, endAngle);
        return function (t) { return arcGen.endAngle(interp(t))(); };
      });

    /* Score text */
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -20)
      .attr('fill', scoreColor)
      .attr('font-size', '2.2rem')
      .attr('font-weight', '700')
      .attr('font-family', 'Outfit, sans-serif')
      .text(score);

    /* Label */
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 4)
      .attr('fill', C.textDim)
      .attr('font-size', '.7rem')
      .attr('font-family', 'Outfit, sans-serif')
      .text('SAFETY SCORE');

    /* Sub-label */
    const label = score >= 70 ? 'Safe' : score >= 40 ? 'Moderate Risk' : 'High Risk';
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 22)
      .attr('fill', scoreColor)
      .attr('font-size', '.65rem')
      .attr('font-weight', '600')
      .attr('font-family', 'Outfit, sans-serif')
      .text(label);

    console.log(TAG, 'safety gauge rendered, score:', score);
  } catch (err) {
    console.log(TAG, 'safety gauge error', err.message);
  }
}

/* ══════════════════════════════════════════
   2. Heatmap Calendar — last 30 days
   ══════════════════════════════════════════ */
function renderHeatmapCalendar(events) {
  try {
    const container = d3.select('#d3-heatmap');
    if (container.empty()) return;
    container.selectAll('*').remove();

    const now = new Date();
    const days = 30;
    const cellSize = 14;
    const cellGap = 3;
    const totalCell = cellSize + cellGap;

    /* Build day → count map */
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    events.forEach(e => {
      try {
        const key = new Date(e.timestamp).toISOString().slice(0, 10);
        if (dayMap[key] !== undefined) dayMap[key]++;
      } catch (_) {}
    });

    const sortedDays = Object.keys(dayMap).sort();
    const maxCount = Math.max(1, ...Object.values(dayMap));

    /* Color scale */
    const colorScale = d3.scaleLinear()
      .domain([0, maxCount * 0.25, maxCount * 0.5, maxCount])
      .range([C.border, 'rgba(0,212,255,0.27)', 'rgba(0,212,255,0.6)', C.info])
      .clamp(true);

    const cols = 7;
    const rows = Math.ceil(days / cols);
    const width = cols * totalCell + 40;
    const height = rows * totalCell + 40;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', 'translate(5, 20)');

    /* Day labels */
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    dayLabels.forEach((l, i) => {
      svg.append('text')
        .attr('x', i * totalCell + cellSize / 2)
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('fill', C.textDim)
        .attr('font-size', '9px')
        .attr('font-family', 'Outfit, sans-serif')
        .text(l);
    });

    /* Cells */
    sortedDays.forEach((day, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const count = dayMap[day];

      const cell = svg.append('rect')
        .attr('x', col * totalCell)
        .attr('y', row * totalCell + 2)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', 3)
        .attr('fill', count === 0 ? C.border : colorScale(count))
        .attr('stroke', 'none')
        .style('cursor', 'pointer');

      /* Tooltip via title */
      cell.append('title')
        .text(`${day}: ${count} event${count !== 1 ? 's' : ''}`);
    });

    console.log(TAG, 'heatmap rendered');
  } catch (err) {
    console.log(TAG, 'heatmap error', err.message);
  }
}

/* ══════════════════════════════════════════
   3. Threat Timeline — event dots on timeline
   ══════════════════════════════════════════ */
function renderThreatTimeline(events) {
  try {
    const container = d3.select('#d3-threat-timeline');
    if (container.empty()) return;
    container.selectAll('*').remove();

    const last7d = events
      .filter(e => (Date.now() - e.timestamp) < 604800000)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (last7d.length === 0) {
      container.append('p')
        .style('color', C.textDim)
        .style('font-size', '.8rem')
        .style('text-align', 'center')
        .style('padding', '20px')
        .text('No events in the last 7 days');
      return;
    }

    const width = container.node().clientWidth || 320;
    const height = 140;
    const margin = { top: 16, right: 12, bottom: 28, left: 12 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(last7d, d => new Date(d.timestamp)))
      .range([0, innerW]);

    const severityY = { critical: 0, warning: 0.33, info: 0.66, safe: 1 };
    const yScale = d3.scaleLinear().domain([0, 1]).range([0, innerH]);

    const severityColor = d => {
      const map = { critical: C.critical, warning: C.warning, info: C.info, safe: C.safe };
      return map[d.severity] || C.purple;
    };

    /* X axis */
    svg.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%b %d')))
      .selectAll('text')
      .attr('fill', C.textDim)
      .attr('font-size', '9px')
      .attr('font-family', 'Outfit, sans-serif');

    svg.selectAll('.domain, .tick line').attr('stroke', C.gridLine);

    /* Severity labels on right */
    ['Critical', 'Warning', 'Info', 'Safe'].forEach((label, i) => {
      svg.append('text')
        .attr('x', innerW + 4)
        .attr('y', yScale(i * 0.33) + 4)
        .attr('fill', C.textDim)
        .attr('font-size', '7px')
        .attr('font-family', 'Outfit, sans-serif')
        .text(label);
    });

    /* Event dots */
    svg.selectAll('circle')
      .data(last7d)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(new Date(d.timestamp)))
      .attr('cy', d => yScale(severityY[d.severity] || 0.5))
      .attr('r', 0)
      .attr('fill', d => severityColor(d))
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .transition()
      .duration(400)
      .delay((d, i) => i * 30)
      .attr('r', 5);

    /* Tooltip via title */
    svg.selectAll('circle')
      .append('title')
      .text(d => `${d.title || d.type}\n${new Date(d.timestamp).toLocaleString()}`);

    console.log(TAG, 'threat timeline rendered,', last7d.length, 'events');
  } catch (err) {
    console.log(TAG, 'threat timeline error', err.message);
  }
}

/* ══════════════════════════════════════════
   4. Severity Sparkline — 30-day trend line
   ══════════════════════════════════════════ */
function renderSeveritySparkline(events) {
  try {
    const container = d3.select('#d3-sparkline');
    if (container.empty()) return;
    container.selectAll('*').remove();

    /* Aggregate events per day for last 30 days */
    const now = new Date();
    const dayData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayStart = new Date(key + 'T00:00:00').getTime();
      const dayEnd = dayStart + 86400000;
      const dayEvents = events.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd);

      /* Weighted score: critical=3, warning=2, info=1, safe=0 */
      const score = dayEvents.reduce((sum, e) => {
        const w = { critical: 3, warning: 2, info: 1, safe: 0 };
        return sum + (w[e.severity] || 0);
      }, 0);

      dayData.push({ date: d, score, count: dayEvents.length });
    }

    const width = container.node().clientWidth || 320;
    const height = 80;
    const margin = { top: 8, right: 8, bottom: 20, left: 8 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = container.append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(dayData, d => d.date))
      .range([0, innerW]);

    const maxScore = Math.max(1, d3.max(dayData, d => d.score));
    const yScale = d3.scaleLinear()
      .domain([0, maxScore])
      .range([innerH, 0]);

    /* Area fill */
    const area = d3.area()
      .x(d => xScale(d.date))
      .y0(innerH)
      .y1(d => yScale(d.score))
      .curve(d3.curveMonotoneX);

    /* Gradient */
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'd3-spark-grad')
      .attr('x1', '0').attr('y1', '0')
      .attr('x2', '0').attr('y2', '1');
    grad.append('stop').attr('offset', '0%').attr('stop-color', C.warning).attr('stop-opacity', 0.4);
    grad.append('stop').attr('offset', '100%').attr('stop-color', C.warning).attr('stop-opacity', 0.02);

    svg.append('path')
      .datum(dayData)
      .attr('fill', 'url(#d3-spark-grad)')
      .attr('d', area);

    /* Line */
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.score))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(dayData)
      .attr('fill', 'none')
      .attr('stroke', C.warning)
      .attr('stroke-width', 2)
      .attr('d', line);

    /* X axis ticks */
    svg.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.timeFormat('%b %d')).tickSize(0))
      .selectAll('text')
      .attr('fill', C.textDim)
      .attr('font-size', '8px')
      .attr('font-family', 'Outfit, sans-serif');

    svg.selectAll('.domain').attr('stroke', 'none');

    console.log(TAG, 'sparkline rendered');
  } catch (err) {
    console.log(TAG, 'sparkline error', err.message);
  }
}

/* ══════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════ */
function showEmpty() {
  try {
    const el = document.getElementById('d3viz-empty');
    const charts = document.getElementById('d3viz-charts');
    if (el) el.classList.remove('hidden');
    if (charts) charts.classList.add('hidden');
  } catch (_) {}
}

function hideEmpty() {
  try {
    const el = document.getElementById('d3viz-empty');
    const charts = document.getElementById('d3viz-charts');
    if (el) el.classList.add('hidden');
    if (charts) charts.classList.remove('hidden');
  } catch (_) {}
}

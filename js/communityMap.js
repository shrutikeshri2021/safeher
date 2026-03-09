/* ═══════════════════════════════════════════════
   SafeHer — Feature 14: Community Safety Map
   Report / view unsafe areas + nearby amenities
   Backend: Supabase  |  Amenities: Overpass API
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  console.log('[CommunityMap] Module loading...');

  const CommunityMap = {
    url: 'https://enkbimohprfdrfrssaei.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVua2JpbW9ocHJmZHJmcnNzYWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODk5MjQsImV4cCI6MjA4ODU2NTkyNH0.4lj9aRCv9grPkNJa7PjG8945USMVAQwz5sCUHl3RIy0',
    markers: [],
    poiMarkers: [],

    ok() {
      const has = !!(this.url && this.key);
      if (!has) console.warn('[CMap] Missing Supabase config.',
        'URL:', !!this.url, 'Key:', !!this.key);
      return has;
    },

    /* Get current map — multiple fallbacks */
    getMap() {
      return window.AppState?.map ||
             window.safeherMap ||
             window._leafletMap ||
             window._safeherMap ||
             null;
    },

    setMap(map) {
      window.safeherMap = map;
      window._safeherMap = map;
    },

    /* ── Fetch reports near a location ── */
    async fetchReports(lat, lng) {
      if (!this.ok()) {
        if (window.showToast) window.showToast('⚠️ Supabase keys not configured', 'warning');
        return [];
      }
      try {
        console.log('[CMap] Fetching reports near:', lat, lng);

        const delta = 0.05; // ~5km radius
        const queryUrl = `${this.url}/rest/v1/safety_reports?` +
          `and=(lat.gte.${(lat - delta).toFixed(6)},` +
          `lat.lte.${(lat + delta).toFixed(6)},` +
          `lng.gte.${(lng - delta).toFixed(6)},` +
          `lng.lte.${(lng + delta).toFixed(6)})` +
          `&select=*&order=created_at.desc&limit=100`;

        console.log('[CMap] Query URL:', queryUrl);

        const res = await fetch(queryUrl, {
          method: 'GET',
          headers: {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('[CMap] Response status:', res.status);

        if (res.status === 401) {
          if (window.showToast) window.showToast('❌ Supabase key invalid', 'error');
          return [];
        }
        if (res.status === 404) {
          if (window.showToast) window.showToast('❌ Table not found. Run SQL to create safety_reports table.', 'error');
          return [];
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        console.log('[CMap] ✅ Got', data.length, 'reports');

        /* Also merge local fallback reports */
        const local = JSON.parse(localStorage.getItem('safeher_community_reports') || '[]');
        const all = [...(Array.isArray(data) ? data : []), ...local];
        return all;

    } catch (e) { 
        console.error('[CMap] Fetch failed:', e.message);
        if (window.showToast) window.showToast('❌ Could not load reports: ' + e.message, 'error');
        /* Return local-only if Supabase fails */
        return JSON.parse(localStorage.getItem('safeher_community_reports') || '[]');
      }
    },

    /* ── Submit a report ── */
    async submit(lat, lng, type, desc, severity) {
      if (!this.ok()) {
        /* Fallback: store locally */
        const local = JSON.parse(localStorage.getItem('safeher_community_reports') || '[]');
        local.push({ lat, lng, type, description: desc, severity, created_at: new Date().toISOString() });
        localStorage.setItem('safeher_community_reports', JSON.stringify(local));
        if (window.showToast) window.showToast('📍 Report saved locally (no Supabase)', 'info');
        return true;
      }
      try {
        console.log('[CMap] Submitting report:', { lat, lng, type, severity });

        const res = await fetch(`${this.url}/rest/v1/safety_reports`, {
          method: 'POST',
          headers: {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            lat: parseFloat(lat.toFixed(8)),
            lng: parseFloat(lng.toFixed(8)),
            type,
            description: desc,
            severity,
            anonymous: true
          })
        });

        console.log('[CMap] Submit status:', res.status);

        if (res.ok || res.status === 201) {
          console.log('[CMap] ✅ Report submitted');
          return true;
        }

        const errText = await res.text();
        console.error('[CMap] Submit error response:', errText);
        throw new Error('HTTP ' + res.status);

      } catch (e) {
        console.error('[CMap] Submit failed:', e.message);
        /* Fallback: save locally */
        const local = JSON.parse(localStorage.getItem('safeher_community_reports') || '[]');
        local.push({ lat, lng, type, description: desc, severity, created_at: new Date().toISOString() });
        localStorage.setItem('safeher_community_reports', JSON.stringify(local));
        if (window.showToast) window.showToast('📍 Saved locally (Supabase unreachable)', 'info');
        return true;
      }
    },

    /* ── Render reports on map ── */
    renderReports(reports) {
      const map = this.getMap();
      if (!map) {
        console.error('[CMap] Map not found. Is Journey tab open?');
        if (window.showToast) window.showToast('⚠️ Open Journey tab first', 'warning');
        return;
      }

      // Clear old markers
      this.markers.forEach(m => { try { map.removeLayer(m); } catch (e) {} });
      this.markers = [];

      if (!reports.length) {
        if (window.showToast) window.showToast('ℹ️ No reports in this area', 'info');
        return;
      }

      const colorMap = {
        harassment: '#FF2D55',
        theft:      '#FF9F0A',
        assault:    '#FF2D55',
        unsafe:     '#FF9F0A',
        lighting:   '#FFD60A',
        other:      '#8892B0'
      };

      const emojiMap = {
        harassment: '🚫',
        theft:      '💰',
        assault:    '⚠️',
        unsafe:     '⚠️',
        lighting:   '💡',
        other:      '📍'
      };

      reports.forEach(r => {
        if (!r.lat || !r.lng) return;

        const cat = r.type || r.category || 'unsafe';
        const color = colorMap[cat] || '#8892B0';
        const emoji = emojiMap[cat] || '📍';
        const radius = r.severity === 'high' ? 200 :
                       r.severity === 'medium' ? 120 : 70;

        try {
          const circle = L.circle([parseFloat(r.lat), parseFloat(r.lng)], {
            radius,
            color,
            fillColor: color,
            fillOpacity: 0.2,
            weight: 2
          });

          const marker = L.marker([parseFloat(r.lat), parseFloat(r.lng)], {
            icon: L.divIcon({
              html: `<div style="font-size:18px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${emoji}</div>`,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
          });

          const time = r.created_at ? new Date(r.created_at).toLocaleString('en-IN') :
                       r.timestamp ? new Date(r.timestamp).toLocaleString('en-IN') : '';
          const popup = `
            <div style="font-family:sans-serif;min-width:160px">
              <b>${emoji} ${cat.replace('_', ' ').toUpperCase()}</b><br/>
              <span style="color:#666;font-size:0.8rem">
                ${r.description || 'No description'}</span><br/>
              <span style="color:#999;font-size:0.75rem">
                Severity: ${r.severity || 'medium'} · ${time}</span>
            </div>`;

          circle.bindPopup(popup);
          marker.bindPopup(popup);

          circle.addTo(map);
          marker.addTo(map);

          this.markers.push(circle, marker);
        } catch (e) {
          console.error('[CMap] Marker error:', e.message);
        }
      });

      console.log('[CMap] ✅ Rendered', this.markers.length / 2, 'report markers');
      if (window.showToast) window.showToast(`✅ ${reports.length} reports loaded`, 'success');
    },

    clearReports() {
      const map = this.getMap();
      if (map) {
        this.markers.forEach(m => { try { map.removeLayer(m); } catch (e) {} });
      }
      this.markers = [];
      console.log('[CMap] Reports cleared');
    },

    /* ── Fetch & show nearby POIs (police, hospitals, pharmacies) ── */
    async fetchAndShowPOIs(lat, lng) {
      const map = this.getMap();
      if (!map) {
        if (window.showToast) window.showToast('⚠️ Open Journey tab first', 'warning');
        return;
      }

      if (window.showToast) window.showToast('⏳ Finding police & hospitals...', 'info');
      console.log('[CMap] Fetching POIs near:', lat, lng);

      // Clear old POI markers
      this.poiMarkers.forEach(m => { try { map.removeLayer(m); } catch (e) {} });
      this.poiMarkers = [];

      try {
        const query = `
          [out:json][timeout:15];
          (
            node["amenity"="police"](around:3000,${lat},${lng});
            way["amenity"="police"](around:3000,${lat},${lng});
            node["amenity"="hospital"](around:3000,${lat},${lng});
            way["amenity"="hospital"](around:3000,${lat},${lng});
            node["amenity"="pharmacy"](around:1500,${lat},${lng});
          );
          out center;
        `;

        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });

        if (!res.ok) throw new Error('Overpass HTTP ' + res.status);

        const data = await res.json();
        console.log('[CMap] POIs received:', data.elements?.length);

        if (!data.elements?.length) {
          if (window.showToast) window.showToast('ℹ️ No police/hospitals found within 3km', 'info');
          return;
        }

        data.elements.forEach(el => {
          // Handle both node (lat/lon) and way (center.lat/center.lon)
          const elLat = el.lat || el.center?.lat;
          const elLng = el.lon || el.center?.lon;
          if (!elLat || !elLng) return;

          const type = el.tags?.amenity;
          const name = el.tags?.name ||
            (type === 'police' ? 'Police Station' :
             type === 'hospital' ? 'Hospital' : 'Pharmacy');

          const iconMap = {
            police:   { emoji: '🚔', color: '#0A84FF' },
            hospital: { emoji: '🏥', color: '#30D158' },
            pharmacy: { emoji: '💊', color: '#BF5AF2' }
          };
          const style = iconMap[type] || { emoji: '📍', color: '#8892B0' };

          const marker = L.marker([elLat, elLng], {
            icon: L.divIcon({
              html: `<div style="font-size:22px;
                filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">${style.emoji}</div>`,
              className: '',
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            })
          }).bindPopup(`
            <div style="font-family:sans-serif">
              <b>${style.emoji} ${name}</b><br/>
              <span style="color:#666;font-size:0.8rem">${type}</span><br/>
              <a href="https://maps.google.com/?q=${elLat},${elLng}"
                target="_blank"
                style="color:${style.color};font-size:0.8rem">
                Open in Maps →
              </a>
            </div>`);

          marker.addTo(map);
          this.poiMarkers.push(marker);
        });

        // Fit map to show all POIs
        if (this.poiMarkers.length > 0) {
          const group = L.featureGroup(this.poiMarkers);
          map.fitBounds(group.getBounds().pad(0.3));
        }

        console.log('[CMap] ✅ Added', this.poiMarkers.length, 'POI markers');
        if (window.showToast) window.showToast(`✅ Found ${this.poiMarkers.length} safety locations nearby`, 'success');

      } catch (e) {
        console.error('[CMap] POI fetch failed:', e.message);
        if (window.showToast) window.showToast('❌ Could not load POIs: ' + e.message, 'error');
      }
    },

    /* ── Show report modal ── */
    showReportModal() {
      const modal = document.getElementById('report-modal');
      if (modal) modal.style.display = 'flex';
    },

    hideReportModal() {
      const modal = document.getElementById('report-modal');
      if (modal) modal.style.display = 'none';
    },

    /* ── Init — wire buttons ── */
    init() {
      try {
        const btnReport = document.getElementById('btn-report-area');
        if (btnReport) btnReport.addEventListener('click', () => this.showReportModal());

        const btnAmenities = document.getElementById('btn-load-amenities');
        if (btnAmenities) {
          btnAmenities.addEventListener('click', async () => {
            const origText = btnAmenities.textContent;
            btnAmenities.textContent = '⏳ Finding...';
            btnAmenities.disabled = true;
            try {
              const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject,
                  { timeout: 10000, maximumAge: 30000, enableHighAccuracy: false });
              });
              console.log('[POI] Auto GPS:', pos.coords.latitude, pos.coords.longitude);
              await this.fetchAndShowPOIs(pos.coords.latitude, pos.coords.longitude);
            } catch (err) {
              console.error('[POI] GPS error:', err.code, err.message);
              const map = this.getMap();
              if (map) {
                const center = map.getCenter();
                console.log('[POI] Falling back to map center:', center);
                if (window.showToast) window.showToast('⚠️ Using map center location', 'info');
                await this.fetchAndShowPOIs(center.lat, center.lng);
              } else {
                if (window.showToast) window.showToast('❌ Could not get location. Enable GPS.', 'error');
              }
            } finally {
              btnAmenities.textContent = origText;
              btnAmenities.disabled = false;
            }
          });
        }

        const btnLoadReports = document.getElementById('btn-load-community-reports');
        if (btnLoadReports) {
          btnLoadReports.addEventListener('click', async () => {
            const origText = btnLoadReports.textContent;
            btnLoadReports.textContent = '⏳ Loading...';
            btnLoadReports.disabled = true;
            try {
              const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject,
                  { timeout: 10000, maximumAge: 30000, enableHighAccuracy: false });
              });
              console.log('[CMap] Auto GPS:', pos.coords.latitude, pos.coords.longitude);
              const reports = await this.fetchReports(pos.coords.latitude, pos.coords.longitude);
              this.renderReports(reports);
            } catch (err) {
              console.error('[CMap] GPS error:', err.code, err.message);
              const map = this.getMap();
              if (map) {
                const center = map.getCenter();
                console.log('[CMap] Falling back to map center:', center);
                if (window.showToast) window.showToast('⚠️ Using map center (GPS unavailable)', 'info');
                const reports = await this.fetchReports(center.lat, center.lng);
                this.renderReports(reports);
              } else {
                if (window.showToast) window.showToast('❌ Could not get location', 'error');
              }
            } finally {
              btnLoadReports.textContent = origText;
              btnLoadReports.disabled = false;
            }
          });
        }

        /* Close report modal on backdrop click */
        const modal = document.getElementById('report-modal');
        if (modal) {
          modal.addEventListener('click', function (e) {
            if (e.target === this) this.style.display = 'none';
          });
        }

        console.log('[CommunityMap] ✅ Module initialized');
      } catch (err) {
        console.error('[CommunityMap] init() error:', err);
      }
    }
  };

  /* ── Chip selector (global for onclick handlers in HTML) ── */
  window.selectChip = function (btn, groupId) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.querySelectorAll('.chip-btn').forEach(b => {
      b.style.background = 'var(--bg-secondary)';
      b.style.color = 'var(--text-secondary)';
      b.style.borderColor = 'var(--border-color)';
    });
    btn.style.background = 'rgba(255,159,10,0.15)';
    btn.style.color = 'var(--accent-amber)';
    btn.style.borderColor = 'var(--accent-amber)';
  };

  /* ── Submit report (global for onclick in HTML) ── */
  window.submitReport = async function () {
    const submitBtn = document.getElementById('btn-submit-report');
    try {
      if (submitBtn) { submitBtn.textContent = '⏳ Getting location...'; submitBtn.disabled = true; }

      /* Auto GPS — no manual input needed */
      let lat, lng;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject,
            { timeout: 10000, maximumAge: 30000, enableHighAccuracy: false });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        console.log('[Report] Auto GPS:', lat, lng);
      } catch (gpsErr) {
        /* Fallback to map center */
        const map = CommunityMap.getMap();
        if (map) {
          const center = map.getCenter();
          lat = center.lat;
          lng = center.lng;
          if (window.showToast) window.showToast('⚠️ Using map center for location', 'info');
          console.warn('[Report] GPS failed, using map center:', lat, lng);
        } else {
          if (window.showToast) window.showToast('❌ Could not get location', 'error');
          return;
        }
      }

      /* Get selected chip values */
      const catActive = document.querySelector('#category-chips .chip-btn[style*="rgba(255,159,10"]');
      const sevActive = document.querySelector('#severity-chips .chip-btn[style*="rgba(255,159,10"]');

      const type = catActive?.dataset?.val || 'unsafe';
      const severity = sevActive?.dataset?.val || 'medium';
      const desc = document.getElementById('rdesc')?.value || '';

      if (submitBtn) submitBtn.textContent = '⏳ Submitting...';

      const ok = await CommunityMap.submit(lat, lng, type, desc, severity);

      document.getElementById('report-modal').style.display = 'none';
      const rdesc = document.getElementById('rdesc');
      if (rdesc) rdesc.value = '';

      if (ok) {
        if (window.showToast) window.showToast('✅ Report submitted! Thank you.', 'success');
      } else {
        if (window.showToast) window.showToast('❌ Submission failed. Check Supabase keys.', 'error');
      }

    } catch (e) {
      console.error('[Report] Submit error:', e.message);
      if (window.showToast) window.showToast('❌ Error: ' + e.message, 'error');
    } finally {
      if (submitBtn) { submitBtn.textContent = '📍 Submit Report'; submitBtn.disabled = false; }
    }
  };

  window.CommunityMap = CommunityMap;
})();

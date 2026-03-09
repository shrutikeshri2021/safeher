/* ═══════════════════════════════════════════════
   SafeHer — Feature 15: Safe Walking Route
   Uses OpenRouteService for pedestrian routing.
   Destination is picked by tapping on the map.
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';
  console.log('[SafeRoute] Module loading...');

  const SafeRoute = {
    key: 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjliZTE1ZGM1OWI0MTQxODU4NTgwMzY2NWZkOGJhOGQwIiwiaCI6Im11cm11cjY0In0=',
    routeLayer: null,
    destMarker: null,
    startMarker: null,
    isPicking: false,
    clickHandler: null,

    ok() { return !!this.key; },

    getMap() {
      return window.AppState?.map ||
             window.safeherMap ||
             window._leafletMap ||
             window._safeherMap ||
             null;
    },

    setMap(map) {
      window.safeherMap = map;
    },

    /* Step 1: User taps "Get Safe Route" → enable map click mode */
    startPick() {
      const map = this.getMap();
      if (!map) {
        if (window.showToast) window.showToast('⚠️ Map not loaded. Open Journey tab first.', 'warning');
        return;
      }

      this.isPicking = true;
      const hint = document.getElementById('route-pick-hint');
      if (hint) hint.style.display = 'block';
      const btn = document.getElementById('safe-route-btn');
      if (btn) btn.style.opacity = '0.5';
      map.getContainer().style.cursor = 'crosshair';

      // Listen for single map click
      this.clickHandler = (e) => {
        this.onMapClick(e.latlng.lat, e.latlng.lng);
      };
      map.once('click', this.clickHandler);

      console.log('[Route] ✅ Waiting for map click to set destination');
    },

    /* Step 2: User tapped map → use that as destination */
    async onMapClick(destLat, destLng) {
      const map = this.getMap();
      this.isPicking = false;

      const hint = document.getElementById('route-pick-hint');
      if (hint) hint.style.display = 'none';
      const routeBtn = document.getElementById('safe-route-btn');
      if (routeBtn) routeBtn.style.opacity = '1';
      if (map) map.getContainer().style.cursor = '';

      console.log('[Route] Destination tapped:', destLat, destLng);

      // Show destination marker
      if (this.destMarker) { try { map.removeLayer(this.destMarker); } catch (e) {} }
      this.destMarker = L.marker([destLat, destLng], {
        icon: L.divIcon({
          html: '<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">🏁</div>',
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 28]
        })
      }).bindPopup('🏁 Destination').addTo(map);

      // Get current GPS position as start
      if (window.showToast) window.showToast('⏳ Getting your location...', 'info');

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const startLat = pos.coords.latitude;
          const startLng = pos.coords.longitude;

          // Show start marker
          if (this.startMarker) { try { map.removeLayer(this.startMarker); } catch (e) {} }
          this.startMarker = L.marker([startLat, startLng], {
            icon: L.divIcon({
              html: '<div style="font-size:24px">📍</div>',
              className: '',
              iconSize: [28, 28],
              iconAnchor: [14, 24]
            })
          }).bindPopup('📍 You are here').addTo(map);

          await this.fetchAndDraw(startLat, startLng, destLat, destLng, map);
        },
        (err) => {
          console.error('[Route] GPS failed:', err.message);
          // Fallback: use first waypoint as start if GPS fails
          const wps = JSON.parse(localStorage.getItem('safeher_waypoints') || '[]');
          if (wps.length > 0) {
            if (window.showToast) window.showToast('⚠️ Using first waypoint as start', 'info');
            this.fetchAndDraw(wps[0].lat, wps[0].lng, destLat, destLng, map);
          } else {
            if (window.showToast) window.showToast('❌ Could not get your location', 'error');
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    },

    /* Step 3: Fetch route from ORS and draw on map */
    async fetchAndDraw(startLat, startLng, destLat, destLng, map) {
      const statusEl = document.getElementById('route-status');
      const statusText = document.getElementById('route-status-text');

      if (statusEl) statusEl.style.display = 'flex';
      if (statusText) statusText.textContent = '⏳ Calculating safe walking route...';

      if (!this.ok()) {
        if (statusText) statusText.textContent = '⚠️ ORS API key not available';
        if (window.showToast) window.showToast('⚠️ ORS API key not configured', 'warning');
        return;
      }

      try {
        const res = await fetch(
          'https://api.openrouteservice.org/v2/directions/foot-walking/geojson',
          {
            method: 'POST',
            headers: {
              'Authorization': this.key,
              'Content-Type': 'application/json',
              'Accept': 'application/json, application/geo+json'
            },
            body: JSON.stringify({
              coordinates: [
                [startLng, startLat],
                [destLng, destLat]
              ],
              instructions: false
            })
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || 'HTTP ' + res.status);
        }

        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature) throw new Error('No route returned');

        // Convert GeoJSON [lng,lat] to Leaflet [lat,lng]
        const coords = feature.geometry.coordinates.map(c => [c[1], c[0]]);
        const summary = feature.properties?.summary;
        const dist = summary?.distance;
        const dur = summary?.duration;

        // Remove old safe route layer
        if (this.routeLayer) {
          try { map.removeLayer(this.routeLayer); } catch (e) {}
        }

        // Draw SAFE ROUTE as solid blue line (different from original dashed route)
        this.routeLayer = L.polyline(coords, {
          color: '#0A84FF',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);

        // Fit map to show full route
        const allLayers = [this.routeLayer];
        if (this.destMarker) allLayers.push(this.destMarker);
        if (this.startMarker) allLayers.push(this.startMarker);
        const group = L.featureGroup(allLayers);
        map.fitBounds(group.getBounds().pad(0.2));

        // Format distance and time
        const distStr = dist < 1000
          ? Math.round(dist) + 'm'
          : (dist / 1000).toFixed(1) + 'km';
        const minStr = Math.round((dur || 0) / 60) + ' min walk';

        if (statusText) {
          statusText.innerHTML = `🚶 Safe route: <b>${distStr}</b> · <b>${minStr}</b>`;
        }

        // Show clear button
        const clearBtn = document.getElementById('clear-route-btn');
        if (clearBtn) clearBtn.style.display = 'block';
        const safeBtn = document.getElementById('safe-route-btn');
        if (safeBtn) safeBtn.textContent = '🗺️ Change Destination';

        console.log('[Route] ✅ Route drawn:', distStr, minStr);
        if (window.showToast) window.showToast('✅ Safe route ready!', 'success');

      } catch (e) {
        console.error('[Route] Failed:', e.message);
        if (statusText) statusText.textContent = '❌ Route failed: ' + e.message;
        if (window.showToast) window.showToast('❌ Route error: ' + e.message, 'error');
      }
    },

    /* Clear all route elements from map */
    clear() {
      const map = this.getMap();
      if (map) {
        [this.routeLayer, this.destMarker, this.startMarker].forEach(l => {
          if (l) try { map.removeLayer(l); } catch (e) {}
        });
      }
      this.routeLayer = null;
      this.destMarker = null;
      this.startMarker = null;

      const statusEl = document.getElementById('route-status');
      if (statusEl) statusEl.style.display = 'none';

      const clearBtn = document.getElementById('clear-route-btn');
      if (clearBtn) clearBtn.style.display = 'none';

      const routeBtn = document.getElementById('safe-route-btn');
      if (routeBtn) routeBtn.textContent = '🗺️ Get Safe Route';

      console.log('[Route] Cleared');
    },

    init() {
      try {
        console.log('[SafeRoute] ✅ Module initialized');
      } catch (err) {
        console.error('[SafeRoute] init() error:', err);
      }
    }
  };

  window.SafeRoute = SafeRoute;

  /* ── Global functions called by buttons in HTML ── */
  window.startRoutePick = function () {
    SafeRoute.startPick();
  };

  window.cancelRoutePick = function () {
    const map = SafeRoute.getMap();
    if (map) {
      if (SafeRoute.clickHandler) map.off('click', SafeRoute.clickHandler);
      map.getContainer().style.cursor = '';
    }
    SafeRoute.isPicking = false;
    const hint = document.getElementById('route-pick-hint');
    if (hint) hint.style.display = 'none';
    const btn = document.getElementById('safe-route-btn');
    if (btn) btn.style.opacity = '1';
    console.log('[Route] Pick cancelled');
  };

  window.clearSafeRoute = function () {
    SafeRoute.clear();
  };
})();

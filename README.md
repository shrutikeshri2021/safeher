<p align="center">
  <img src="assets/icons/icon-192.svg" alt="SafeHer Logo" width="100" height="100" />
</p>

<h1 align="center">SafeHer -- Women's Personal Safety App</h1>

<p align="center">
  <strong>A Progressive Web App (PWA) built to keep women safe -- anytime, anywhere.</strong><br/>
  One-tap SOS . Automatic GPS email alerts . Evidence recording . Shake, crash & voice detection (9 languages) . Journey tracking with path deviation . Battery-aware emergency . Fake call escape . Community safety map . Safe walking routes . Live video streaming . Darkness detection . Geo-fence alerts . Multilingual UI . Full history log with Chart.js & D3 visualizations . Works offline
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-PWA-blueviolet?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-orange?style=flat-square" alt="Tech" />
  <img src="https://img.shields.io/badge/Maps-Leaflet.js-green?style=flat-square" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Alerts-EmailJS-red?style=flat-square" alt="EmailJS" />
  <img src="https://img.shields.io/badge/Backend-Supabase-darkgreen?style=flat-square" alt="Supabase" />
  <img src="https://img.shields.io/badge/Routes-OpenRouteService-blue?style=flat-square" alt="ORS" />
  <img src="https://img.shields.io/badge/Charts-Chart.js%20%2B%20D3.js-ff6384?style=flat-square" alt="Charts" />
  <img src="https://img.shields.io/badge/Video-PeerJS%20WebRTC-orange?style=flat-square" alt="PeerJS" />
  <img src="https://img.shields.io/badge/Storage-IndexedDB-yellow?style=flat-square" alt="IndexedDB" />
  <img src="https://img.shields.io/badge/Voice-9%20Languages-teal?style=flat-square" alt="Voice" />
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20HI%20%7C%20TE-purple?style=flat-square" alt="i18n" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

## Table of Contents

1. [About The Project](#about-the-project)
2. [Complete Feature List](#complete-feature-list)
3. [How Each Screen Works](#how-each-screen-works)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Application Flow](#application-flow)
7. [Step-by-Step Development Process](#step-by-step-development-process)
8. [Technical Deep Dives](#technical-deep-dives)
9. [Supabase Setup](#supabase-setup)
10. [Getting Started](#getting-started)
11. [Deployment](#deployment)
12. [Privacy & Security](#privacy--security)
13. [Contributing](#contributing)
14. [License](#license)
15. [Author](#author)

---

## About The Project

### What is SafeHer?

**SafeHer** is a women's personal safety Progressive Web App (PWA) designed to provide **instant emergency assistance** at the tap of a button. It works entirely in the browser -- no app store download needed -- and can be installed on any smartphone's home screen for a native-like experience.

SafeHer is not just an SOS button -- it is a **complete safety ecosystem** that combines:
- **Emergency alerting** -- automatic GPS + address + snapshot emails to contacts
- **Evidence collection** -- video + audio recording with IndexedDB storage
- **Smart threat detection** -- shake detection, crash/fall detection + voice keyword recognition in **9 languages**
- **Journey protection** -- waypoint tracking, path deviation detection, check-in timers
- **Battery-aware emergency** -- auto-alerts contacts when battery drops to critical levels
- **Community safety** -- crowdsourced unsafe area reports with Supabase + nearby police/hospital/pharmacy via Overpass API
- **Safe navigation** -- pedestrian-safe walking routes via OpenRouteService
- **Live video streaming** -- real-time WebRTC camera feed to trusted contacts via PeerJS
- **Darkness detection** -- ambient light sensor auto-alerts in unlit environments
- **Geo-fence zones** -- mark unsafe areas on the map, auto-alert on entry
- **Situational escape** -- fake incoming call overlay
- **Multilingual support** -- full UI in English, Hindi, and Telugu + voice detection in 9 languages
- **Data visualizations** -- Chart.js + D3.js interactive analytics on safety history
- **Full activity history** -- every event logged, searchable, filterable, and exportable

### Why is it necessary?

Women face safety threats in everyday life -- walking alone at night, commuting, traveling to unfamiliar areas, or being in uncomfortable situations. Existing safety apps often require expensive subscriptions, complex setup, app store downloads, or manual steps during emergencies.

**SafeHer eliminates all of these barriers:**

| Barrier | SafeHer's Answer |
|---------|-----------------|
| Expensive subscriptions | **100% free** -- no charges, ever |
| App store required | **Works instantly** in any browser |
| Complex manual steps | **One tap** triggers everything automatically |
| Needs a backend server | **Fully client-side** -- Supabase used only for optional community reports |
| Doesn't work offline | **Cached via Service Worker** -- instant loading |
| Requires signup/login | **No account** -- no signup, no tracking |
| English only | **9-language** voice detection (English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam) |
| No community reporting | **Crowdsourced safety map** -- report unsafe areas, view others' reports |
| Don't know safe routes | **Safe walking routes** via OpenRouteService -- tap map to get directions |
| No way to share live video | **Live WebRTC stream** -- contacts watch your camera feed in real-time |

### What problem does it solve?

| Problem | SafeHer's Solution |
|---------|-------------------|
| Can't call for help discreetly | **Silent SOS** -- one tap with minimizable overlay; siren runs in background |
| Contacts don't know your location | **Automatic GPS emails** with live Google Maps link, address, and driving directions |
| No evidence of the incident | **Back camera auto-records** video + audio, stored locally in IndexedDB |
| Phone snatched or thrown | **Shake detection** auto-triggers alert if phone is aggressively shaken |
| Can't speak during danger | **Voice detection** listens for distress keywords in 9 Indian languages and auto-triggers SOS |
| Unsafe during commute | **Journey tracking** with waypoints, path deviation detection, and check-in timer |
| Walking alone at night | **Battery-aware emergency** -- auto-alerts contacts at 15%/10%/5% + low-power GPS mode |
| Phone dying in unsafe area | **Battery-aware emergency** -- auto-alerts contacts at 15%/10%/5% + low-power GPS mode |
| No one checking on you | **Check-in timer** auto-alerts contacts if you don't confirm safety |
| Need an excuse to leave | **Fake incoming call** overlay that looks like a real phone call |
| Can't track safety history | **Full event history** with date grouping, search, filters, and CSV export |
| Don't know which areas are unsafe | **Community safety map** -- view crowdsourced reports of harassment, theft, poor lighting within 5km |
| No safe walking directions | **Safe walking route** -- tap your destination on the map, get pedestrian-safe routing via OpenRouteService |
| Contacts can't see what's happening | **Live video stream** -- share real-time camera feed via WebRTC; contacts watch on a companion page |
| Walking in dark/unlit area | **Darkness detection** -- ambient light sensor auto-triggers alert when light drops below 10 lux |
| Entering a known danger zone | **Geo-fence alerts** -- mark unsafe zones on the map; auto-alerts when you enter one |
| Phone about to die in danger | **Crash/fall detection** -- detects free-fall + impact; 15s countdown before auto-SOS |
| App only works in English | **Multilingual UI** -- switch between English, Hindi, Telugu with one tap |

---

## Complete Feature List

### 1. One-Tap SOS Emergency Alert
- Hold the big red SOS button for **2 seconds** to activate
- Full-screen red emergency overlay with **siren sound** and **vibration pattern**
- **"I'm Safe -- Cancel Alert"** button to stop everything
- **"Call Police"** button for direct emergency call (100/112)
- **Minimize button** -- hides overlay, keeps siren + vibration + recording running in background
- **SOS ACTIVE pill** -- fixed red badge at top of screen when minimized; tap to reopen
- **SOS disabled in Safe Mode** -- button greyed out, non-functional, no pulse animation

### 2. Fully Automatic Email Alerts (via EmailJS)
- Emails sent **automatically** to ALL contacts with email addresses -- zero manual steps
- Each alert email includes:
  - Live GPS location (clickable Google Maps link)
  - Street address (reverse geocoded via OpenStreetMap Nominatim API)
  - Satellite view link (see terrain around the person)
  - Google Maps navigation link (one-tap driving directions)
  - Camera snapshot (auto-uploaded to image host, rendered in email)
  - Timestamp of when SOS was triggered
  - GPS coordinates (latitude & longitude)

### 3. Real-Time Live Location Updates
- After SOS, sends **updated GPS location emails every 2 minutes** to contacts
- Contacts can track the person's movement in real-time
- Stops ONLY when "I'm Safe -- Cancel Alert" is explicitly pressed
- Maximum 30 updates (1 hour) to conserve EmailJS free quota

### 4. Evidence Recording (Audio & Video)
- SOS automatically starts **back camera video** with audio (captures surroundings, not face)
- Camera torch kept **OFF** to avoid detection
- Auto-stops after **1.5 hours** for battery conservation
- **Separate audio and video buttons** -- each independently toggles its own stream
- **Stream guard** -- clicking same button twice won't start duplicate streams
- **Video + audio synced** -- `getUserMedia({ video: { facingMode: 'environment' }, audio: true })` with `vp8,opus` codec
- 9-step recording pipeline: permission check, single getUserMedia, expanded MIME type fallback, bitrate optimization, chunk logging, test URL verification, 100ms timeslice
- Recordings stored in **IndexedDB** -- playable inline, downloadable, deletable

### 5. Emergency Camera Snapshot
- At SOS trigger, a **snapshot** is captured from the back camera
- Resized (max 480px) for fast upload
- Uploaded to **free image hosting** with 3-host fallback chain (Telegraph, freeimage.host, tmpfiles.org)
- Public URL embedded in email and renders in all email clients

### 6. Shake / Motion Detection
- **DeviceMotion API** detects violent shaking (threshold: **20 m/s squared**)
- Automatically triggers emergency alert
- **60-second cooldown** between triggers to prevent false positives
- Handles **iOS 13+ permission prompts** automatically

### 7. Multi-Language Voice Detection (9 Languages)
- Uses **Web Speech Recognition API** for real-time voice monitoring
- Detects distress keywords in **9 languages** (56 keywords total):
  - **English**: help, save me, emergency, leave me, let me go, stop, please stop, no no no
  - **Hindi**: bachao, madad, chodo, bachao mujhe, chhod do, mujhe bachao, koi bachao, dur hato
  - **Tamil**: kaappaathungal, udavi, udavi seiyungal, vidungal, niruthu, ennai vittuvidungal
  - **Telugu**: kaapaadam, sahayam, sahayam cheyandi, vadilandi, aapandi, nannu vadilandi
  - **Bengali**: sahajjo, amake bachao, chere dao, thamao, amake chere dao, dure jao
  - **Marathi**: vachva, vachava, madad kara, sodha, thamba, mala soda, dur vha
  - **Gujarati**: bachavo, madad karo, mane bachavo, chhodo, ubha raho, mane chhodi do
  - **Kannada**: kaapadi, sahaya, sahaya maadi, bidi, nilisu, nannu bidi, door hogi
  - **Malayalam**: rakshikku, sahayam, sahayikku, vidoo, nilkku, enne vidoo, enne rakshikku
- **5-second countdown** before triggering SOS (cancelable with "FALSE ALARM" button)
- Continuous listening -- auto-restarts when speech recognition ends
- Uses transliterated keywords -- SpeechRecognition engine matches phonetics

### 8. Journey Tracking with Waypoints & Deviation
- Built with **Leaflet.js** + **OpenStreetMap** tiles
- **Waypoint planning** -- tap the map to add up to **10 waypoints**
- Waypoints stored in **localStorage** -- persist across sessions
- **Dashed polyline** connects waypoints on the map
- Each waypoint has a **50m radius circle** -- auto-marked when entered
- **3-phase journey UI**:
  - Planning -- add waypoints
  - Active -- live tracking with real-time stats (duration, distance, speed), pause/resume
  - Complete -- summary with total duration, distance, and nodes reached
- **Path deviation detection** -- if you move >150m from planned route:
  - 30-second grace timer before alerting
  - Sends emergency alert to contacts
  - Repeats every 2 minutes while off-route
  - Visual: On route / Off route with distance
- **Pause / Resume toggle** -- single button switches between Pause (amber) and Resume (green); paused time excluded from duration
- **Check-in timer** -- set 5-60 minute intervals; auto-alerts if you don't tap "I'm Okay"
- **"I'm Home Safe"** button -- ends journey with success summary
- **Always-on blue dot** with pulsing animation and GPS accuracy circle
- **Share location** via WhatsApp, Telegram, Email, Outlook, or clipboard

### 9. Battery-Aware Emergency
- Uses **Battery Status API** (`navigator.getBattery()`)
- **Three alert thresholds**:
  - **15%** -- sends "battery low" alert to all emergency contacts with GPS
  - **10%** -- sends "battery very low" alert + enters **low-power GPS mode** (switches from continuous watchPosition to 30-second interval getCurrentPosition)
  - **5%** -- sends "battery critical" alert (last chance to locate you)
- **Battery badge in header** -- live percentage with icon, color-coded:
  - Green (>15%), Amber (15%), Red pulsing (<=5%)
- **Background GPS cache** -- always knows last position for instant alert delivery
- **Charging detection** -- resets all alert flags when plugged in (so alerts fire again on next discharge)
- All battery events logged to history

### 10. Fake Call
- Instantly shows a **fake incoming call overlay** that looks like a real phone call
- Shows caller name from first saved contact (or "Mom" by default)
- **Accept** -- shows in-call timer with "End Call" button
- **Decline** -- dismisses overlay
- Great for excusing yourself from uncomfortable or threatening situations

### 11. Safe Mode
- Toggle that **pauses all active sensors** (motion, voice, ambient light, geofence)
- **SOS button disabled** -- greyed out, non-functional
- State persists across sessions via **localStorage**
- **Auto-enables all 4 sensors** (shake, voice, darkness, geofence) when Safe Mode is turned OFF -- checks their toggles automatically
- Visual: green "You're Safe" status

### 12. Wake Lock Manager
- Uses **Screen Wake Lock API** to prevent screen from turning off during active journeys or SOS
- Auto-acquires wake lock when journey starts or SOS activates
- Releases on journey end or SOS cancellation
- Re-acquires on visibilitychange (when user switches back to app)

### 13. Darkness / Ambient Light Detection
- Uses **Ambient Light Sensor API** to detect surrounding darkness
- When light level drops below **10 lux** (dark environment), auto-triggers alert
- Toggle on Home screen to enable/disable
- Useful for detecting when user enters unlit areas at night
- Falls back gracefully on devices without light sensor

### 14. NTFY.SH Push Notifications
- Sends push notifications via **ntfy.sh** -- no app install needed
- Contacts can subscribe to a topic URL to receive real-time alerts
- Works even when browser is closed (server-side push)
- Supplements EmailJS alerts for faster delivery

### 15. Background Sync API
- Queues emergency alerts when offline using **Background Sync API**
- When connectivity is restored, Service Worker processes the queue automatically
- Ensures no alert is lost due to network issues
- Stores pending alerts in localStorage as backup

### 16. Offline Geocoding Cache
- Caches **reverse geocoding results** (GPS to address) in localStorage
- When offline, uses cached address for the nearest known location
- Reduces API calls to Nominatim for frequently visited areas
- Instant address lookup for cached coordinates

### 17. Chart.js Activity Insights
- **Interactive charts** on History screen powered by **Chart.js 4.4.0**
- Doughnut chart: event distribution by type
- Bar chart: events over time (daily/weekly)
- Summary stats: total events, critical count, average per day
- Toggle panel -- charts load on demand to save resources

### 18. D3.js Visualizations
- **Advanced data visualizations** powered by **D3.js v7**
- Safety timeline: chronological event flow
- Threat heatmap: visualize danger patterns by time of day
- Toggle panel with smooth animations
- SVG-based for crisp rendering at any resolution

### 19. Emergency Call Buttons
- **Quick-dial buttons** for Indian emergency numbers:
  - 112 -- Universal Emergency
  - 100 -- Police Control Room
  - 1091 -- Women Helpline
  - 108 -- Ambulance Service
- One-tap dialing via `tel:` protocol
- Works on any phone -- no app required

### 20. SMS Alert System
- Sends **SMS alerts via native `sms:` URI** (Android/iOS intent)
- One-tap SMS to all emergency contacts with SOS message + GPS link
- Builds SOS message with live location automatically
- Works without internet -- uses phone's native messaging

### 21. Live Video Stream
- **WebRTC live streaming** via **PeerJS 1.5.2**
- Share your camera feed with trusted contacts in real-time
- Unique Peer ID generated -- share link for contacts to watch
- **Companion watch page** (`watch.html`) -- contacts open link to view stream
- Front/back camera support with audio
- Auto-cleanup on stream end

### 22. Community Safety Map
- **Report unsafe areas** anonymously -- stored in **Supabase** Postgres
- Reports include: category (harassment, theft, poor lighting, etc.), severity (low/medium/high), description
- **Auto-GPS location** -- no manual input needed (falls back to map center)
- **View community reports** -- colored circles + emoji markers on map within ~5km radius
- Reports auto-expire after 48 hours
- **Nearby safety amenities** via **Overpass API** -- shows police stations, hospitals, pharmacies
- **Chip-based UI** for category and severity selection
- **Offline fallback** -- reports saved to localStorage when Supabase is unreachable

### 23. Safe Walking Route
- **Pedestrian-safe routing** via **OpenRouteService API**
- **Map-click destination picker** -- tap anywhere on map to set destination
- Draws safe walking route as colored polyline on Leaflet map
- Shows route distance and estimated walking time
- Visual crosshair cursor during destination picking mode
- Clear route button to reset

### 24. Multilingual UI
- **Full UI translation** in 3 languages: English, Hindi, Telugu
- Language picker in app header
- Uses `data-i18n` attributes on HTML elements
- Translation files in `assets/i18n/` (JSON format)
- Instant language switching -- no page reload
- Remembers language preference in localStorage

### 25. Crash / Fall Detection
- **Merged into shake detection** (`motionDetect.js`)
- Detects **free-fall** (near 0G) followed by **sudden impact** (>30G) = crash
- **15-second countdown** before auto-triggering SOS
- **"I'm OK" button** on countdown overlay to cancel false alarm
- If countdown expires, full SOS activation (siren, alerts, recording)

### 26. History & Event Log
- **Every safety event logged** to IndexedDB with full context:
  - Event type, severity (critical/warning/info/safe), timestamp
  - GPS location + address, trigger details, media info, contacts alerted
- **ChatGPT-style date grouping**: Today, Yesterday, Previous 7 Days, February 2026, etc.
- **Sticky section headers** between date groups
- **Smart search autocomplete** with 3 suggestion types:
  - Keywords -- event types and titles
  - Dates -- "today", "yesterday", month names, time patterns
  - Locations -- matching addresses and coordinates
- **Filter chips** by severity: All, Critical, Warning, Info, Safe
- **Sort** by newest or oldest
- **Expandable event cards** with full details (map link, trigger info, media, contacts)
- **Export to CSV** -- download complete history as spreadsheet
- **Clear all** with confirmation
- **Badge count** on History navigation tab
- **Live updates** -- new events appear automatically

### 27. Emergency Contacts Management
- Add, edit, and delete contacts
- Fields: **Name**, **Phone**, **Email**, **Relationship** (Family/Friend/Partner/Colleague/Other)
- Card-based UI with avatars from initials

### 28. Smart Alert System
- **Toast notifications** -- non-intrusive status messages (auto-dismiss 3s)
- **Browser notifications** -- system-level alerts with sound
- **Full-screen overlays** -- emergency alerts with action buttons
- **Siren sound** -- Web Audio API (440-880 Hz sawtooth sweep), no audio file needed
- **Vibration patterns** -- continuous vibration loop during SOS
- **Ringtone** -- 4-note sine wave for fake call (C5-E5-G5-E5)

### 29. Emergency Medical Info
- **Blood type, allergies, medications, medical conditions** -- all stored in localStorage
- **Organ donor status** + insurance info + free-text notes
- **Read-only preview card** on Home screen -- always visible at a glance
- **Edit form** -- tap Edit to update, saved instantly
- **Privacy first** -- data never leaves the device
- **Summary export** -- `getEmergencySummary()` returns compact text for embedding in alert emails
- Designed for **first responders** who need critical info fast

### 30. Geo-fence Unsafe Zone Alerts
- **Mark unsafe zones** on the Leaflet map with custom label and radius (50-2000m)
- Zones rendered as **dashed red circles** with floating labels
- **Toggle monitoring** from Home screen -- uses watchPosition for continuous tracking
- **Auto-alert** when you enter any marked zone -- sends alert to all emergency contacts
- **5-minute cooldown** per zone to prevent alert spam
- **Persistent zones** -- saved in localStorage across sessions
- **Manage zones** -- add, delete individual zones, or clear all from Journey screen
- All zone events **logged to history** (zone added, alert triggered, monitoring on/off)

### 31. Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + S` | Trigger SOS |
| `Ctrl + Shift + F` | Fake Call |
| `Escape` | Close overlays |

### 32. Works Offline (PWA)
- **Service Worker** with **network-first for HTML**, cache-first for assets
- All assets cached for instant offline loading
- Installable on home screen (Android & iOS)
- Full-screen standalone mode (no browser chrome)
- Auto-updates via versioned cache (`safeher-v57`)
- **Auto-reload** when new SW version is detected -- users always get latest code
- Offline fallback returns cached HTML when network fails

---

## How Each Screen Works

### Screen 1: Home
The main dashboard with everything at your fingertips.

| Element | What It Does |
|---------|-------------|
| **Status Card** | Shows current safety state: "You're Safe" / "Journey Active" / "Emergency" |
| **Battery Badge** (header) | Live battery % with color coding; auto-alerts at low levels |
| **SOS Button** | Hold 2 seconds to trigger full emergency. Disabled in Safe Mode |
| **Quick Actions Grid** | 4 buttons: Fake Call, Record, Share Location, Siren |
| **Safe Mode Toggle** | Pauses all sensors, disables SOS |
| **Shake Detection Toggle** | Enables/disables accelerometer + crash/fall monitoring |
| **Voice Detection Toggle** | Enables/disables microphone keyword listening |
| **Darkness Detection Toggle** | Enables/disables ambient light sensor monitoring |
| **Geofence Toggle** | Enables/disables unsafe zone proximity monitoring |
| **Emergency Medical Card** | Read-only preview of blood type, allergies, conditions |

**How SOS works step by step:**
1. You hold the SOS button for 2 seconds
2. A 5-second countdown appears (cancelable)
3. If not cancelled: siren plays, phone vibrates, full-screen red overlay appears
4. Back camera starts recording video + audio (torch OFF for stealth)
5. App captures a snapshot from camera, uploads to image host
6. Gets your GPS, reverse-geocodes to street address
7. Sends automatic email to ALL saved contacts with: maps link, address, satellite view, navigation link, snapshot image
8. Starts live location updates every 2 minutes
9. You can **minimize** the overlay -- siren + recording keep running in background
10. When safe: tap "I'm Safe" or tap SOS button again to deactivate everything

### Screen 2: Journey
Full journey tracking with map, waypoints, and safety features.

**Planning Phase:**
1. Tap the map to add waypoints (max 10) -- each gets a numbered marker with 50m radius
2. Tap "Start Journey"

**Active Phase:**
1. Live blue dot tracks your position on the map
2. Green polyline draws your actual path
3. Stats update in real-time: Duration, Distance, Speed
4. Waypoints auto-mark as you pass within 50m
5. **Path deviation** -- if you go >150m off-route, 30s grace period then auto-alerts contacts
6. **Pause/Resume** -- single toggle button: Pause (amber) / Resume (green). Paused time excluded from duration
7. **Share Location** -- opens modal with WhatsApp, Telegram, Email, Outlook, Copy options

**Complete Phase:**
- Summary card: total duration, distance, nodes reached (e.g. 8/10)
- "Plan New Journey" resets everything

**Check-in Timer (below map):**
1. Set duration (5-60 min) with slider
2. Countdown displayed on screen
3. Tap "I'm Okay" to reset timer
4. If timer expires, auto-alerts all contacts

**Community Safety Map (below map):**
1. **Report Unsafe Area** -- opens card-style modal with:
   - Category chips: General Unsafe, Harassment, Theft/Robbery, Poor Lighting, Other
   - Severity chips: Low, Medium, High
   - Optional text description
   - Auto-detects GPS location (no manual input)
   - Submits anonymously to Supabase Postgres
2. **Load Community Reports** -- fetches reports within ~5km radius
   - Shows colored circles (sized by severity) + emoji markers on map
   - Click marker to see popup: category, description, severity, time
3. **Find Nearby Safety** -- queries Overpass API for:
   - Police stations
   - Hospitals
   - Pharmacies
   - Shows as blue markers with popup details (name, address, phone)

**Safe Walking Route (below map):**
1. Tap **"Get Safe Route"** -- map enters crosshair mode
2. Tap anywhere on map to set destination
3. App auto-detects your GPS, calls OpenRouteService pedestrian API
4. Draws colored polyline showing safe walking route
5. Shows distance and estimated walking time
6. **Clear Route** resets everything

**Geo-fence Zones (below map):**
1. Enter zone name + radius (50-2000m)
2. Tap map to place zone center
3. Red dashed circle drawn with floating label
4. Toggle monitoring from Home screen -- auto-alerts on entry

### Screen 3: Contacts
Manage your emergency contacts.

1. **Add Contact** form: Name, Phone, Email, Relationship
2. **Edit/Delete** existing contacts with card UI
3. Contacts stored in localStorage -- no server needed
4. All contacts with email receive automatic SOS alerts via EmailJS

### Screen 4: Recordings
Evidence recorder with playback.

1. **Record Audio** -- tap to start/stop audio-only recording
2. **Record Video** -- tap to start/stop back camera video with audio
3. **Saved Recordings** list: play inline, download, or delete
4. Stored in IndexedDB `SafeHerDB` with `recordings` store
5. Each recording shows: type badge, date, duration, file size

### Screen 5: History
Complete activity log.

1. **Stat Cards** -- total events, critical count, last event time
2. **Search Bar** -- smart autocomplete (keywords, dates, locations)
3. **Filter Chips** -- All, Critical, Warning, Info, Safe
4. **Sort** -- Newest first / Oldest first toggle
5. **Event Cards** -- expandable, show full details:
   - Timestamp, event type, severity badge
   - GPS coordinates with Google Maps link
   - Trigger method, contacts alerted, media info
6. **Export CSV** -- download all events as spreadsheet
7. **Clear All** -- delete all history with confirmation
8. **Badge** on nav tab shows unread count

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | App structure, semantic markup, accessibility |
| **CSS3** | Dark theme (#0B0F1A), glassmorphism cards, responsive mobile-first (max 430px), animations |
| **Vanilla JavaScript (ES Modules)** | All app logic -- zero frameworks, zero build tools, zero npm |
| **Leaflet.js 1.9.4** (CDN) | Interactive maps, markers, polylines, circles |
| **OpenStreetMap** | Map tiles (free, no API key) |
| **EmailJS** | Automatic email from browser (free: 200 emails/month) |
| **Nominatim** | Free reverse geocoding (GPS to address) + destination search |
| **Web Speech Recognition API** | Real-time voice keyword detection (9 languages) |
| **Battery Status API** | Battery level monitoring, charging detection |
| **DeviceMotion API** | Accelerometer-based shake detection |
| **MediaRecorder API** | Audio & video recording (vp8/opus + fallbacks) |
| **ImageCapture API** | Camera snapshot without stopping video |
| **Web Audio API** | Siren (sawtooth 440-880Hz) + ringtone (sine C5-E5-G5-E5) |
| **Geolocation API** | Real-time GPS via watchPosition + getCurrentPosition |
| **IndexedDB** | Client-side DB: recordings store + history store |
| **localStorage** | Waypoints, contacts, safe mode state, settings |
| **Service Worker** | Offline caching, cache-first strategy, versioned updates |
| **Web App Manifest** | PWA installability, home screen icon, standalone mode |
| **Vibration API** | Emergency vibration patterns |
| **Notification API** | System-level browser notifications |
| **Telegraph / freeimage.host / tmpfiles.org** | Free image upload for email snapshots (3-host fallback) |
| **Supabase** | Postgres backend for community safety reports (REST API) |
| **OpenRouteService** | Pedestrian routing for safe walking routes |
| **Overpass API** | Nearby safety amenities (police, hospitals, pharmacies) |
| **PeerJS 1.5.2** (CDN) | WebRTC peer-to-peer live video streaming |
| **Chart.js 4.4.0** (CDN) | Interactive charts -- doughnut, bar, line |
| **D3.js v7** (CDN) | Advanced SVG data visualizations |
| **Screen Wake Lock API** | Prevent screen sleep during active safety features |
| **Ambient Light Sensor API** | Darkness detection for unsafe environments |
| **ntfy.sh** | Server-side push notifications (no app install needed) |
| **Background Sync API** | Queue alerts offline, send when connectivity returns |
| **WhatsApp / Telegram Deep Links** | Location sharing via wa.me and t.me URLs |
| **Google Fonts (Outfit)** | Modern typography -- weights 300-900 |
| **Haversine Formula** | GPS distance calculation (R = 6,371,000m) |

---

## Project Structure

```
SafeHer/
|-- index.html              # Main app shell -- all 5 screens, overlays, modals, navigation
|-- watch.html              # Companion page -- contacts open this to watch live video stream
|-- manifest.json           # PWA manifest -- app name, icons, theme, orientation
|-- sw.js                   # Service Worker -- network-first HTML, cache-first assets (v57)
|-- netlify.toml            # Netlify deployment config
|-- vercel.json             # Vercel deployment config
|-- README.md               # This file -- complete project documentation
|
|-- css/
|   |-- style.css           # Complete dark theme UI (2780+ lines)
|   |                         CSS variables, SOS button pulse, battery badge,
|   |                         journey phases, waypoints, check-in timer,
|   |                         history cards, overlays, bottom navigation
|   |-- features.css        # Feature-specific styles (buttons, cards, toggles)
|
|-- js/
|   |-- app.js              # Entry point -- shared AppState, navigation, module init,
|   |                         keyboard shortcuts, service worker registration
|   |-- alerts.js           # Toast system, overlays, siren (Web Audio), vibration,
|   |                         browser notifications, emergency dispatch, GPS helper
|   |-- contacts.js         # Contact CRUD (localStorage), EmailJS auto-email, snapshot
|   |                         capture & upload, reverse geocoding, live GPS updates
|   |-- sosButton.js        # SOS button hold/tap logic, activate/deactivate SOS,
|   |                         minimize overlay + SOS active pill, safe mode disable
|   |-- recorder.js         # MediaRecorder (audio/video/SOS), 9-step recording pipeline,
|   |                         expanded MIME type fallback, IndexedDB storage, playback
|   |-- mapJourney.js       # Leaflet map, blue dot, waypoint CRUD, 3-phase journey,
|   |                         path deviation, pause/resume, check-in timer, share location
|   |-- batteryWatch.js     # Battery Status API, 3 thresholds, auto-alert with GPS,
|   |                         low-power GPS mode, battery badge UI, charging reset
|   |-- safeMode.js         # Safe mode toggle (localStorage), sensor start/stop
|   |-- motionDetect.js     # DeviceMotion shake detection (20 m/s2) + crash/fall
|   |                         detection (free-fall <3G then impact >30G, 15s countdown)
|   |-- voiceDetect.js      # SpeechRecognition, 56 distress keywords in 9 languages,
|   |                         5s countdown trigger, continuous listening, auto-restart
|   |-- history.js          # History screen UI -- date groups, autocomplete, filter,
|   |                         sort, expandable cards, export CSV, badge
|   |-- historyLogger.js    # logEvent() -- timestamp, location, trigger, media,
|   |                         contacts, system info --> writes to IndexedDB
|   |-- emergencyInfo.js    # Emergency medical info CRUD (blood type, allergies,
|   |                         medications, conditions), localStorage, preview card
|   |-- geofence.js         # Geo-fence unsafe zone system -- add/remove zones,
|   |                         watchPosition proximity monitoring, auto-alert on entry
|   |-- wakeLock.js         # Screen Wake Lock API -- prevent sleep during journey/SOS
|   |-- ambientLight.js     # Ambient Light Sensor -- darkness detection (<10 lux)
|   |-- ntfyPush.js         # NTFY.SH push notifications to contacts
|   |-- backgroundSync.js   # Background Sync API -- queue alerts offline
|   |-- offlineGeo.js       # Offline geocoding cache (GPS to address in localStorage)
|   |-- activityInsights.js # Chart.js activity insights -- doughnut, bar charts
|   |-- d3Visualizations.js # D3.js visualizations -- timeline, heatmap
|   |-- emergencyCall.js    # Emergency call buttons (112/100/1091/108) via tel: URI
|   |-- smsAlert.js         # SMS alerts via native sms: URI intent
|   |-- liveStream.js       # WebRTC live video stream via PeerJS
|   |-- communityMap.js     # Community safety map -- Supabase reports + Overpass POIs
|   |-- safeRoute.js        # Safe walking route -- ORS pedestrian routing + map-click
|   |-- i18n.js             # Multilingual UI -- EN/HI/TE translation system
|   |-- db.js               # IndexedDB helpers -- openDB, getAllHistory, getHistoryStats,
|                              clearAllHistory, deleteHistoryEvent
|
|-- assets/
    |-- icons/
    |   |-- icon-192.svg    # App icon 192x192 (shield + heart)
    |   |-- icon-512.svg    # App icon 512x512 (shield + heart)
    |-- i18n/
        |-- en.json         # English translations
        |-- hi.json         # Hindi translations
        |-- te.json         # Telugu translations
```

---

## Application Flow

### High-Level Startup Flow

```
USER OPENS APP (browser or PWA home screen)
        |
        v
    app.js -- init()
    - Create AppState
    - Inject into 9 modules
    - Wire navigation
    - Init all modules
        |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
  Safe Mode?         Battery Watch       Register
  (localStorage)     init() --            Service Worker
  YES = pause        start monitor        (cache v57)
  all sensors        + GPS cache
```

### SOS Emergency Flow

```
  User holds SOS button (2 sec)
              |
              v
  activateSOS()
  AppState.sosActive = true
  AppState.threatScore = 100
              |
  +-----------+-----------+-----------+-----------+
  |           |           |           |           |
  v           v           v           v           v
Play       Start       Show       Start Back   Send Emergency
Siren      Vibrate     Alert      Camera Rec   Alert Emails
(440Hz)    Pattern     Overlay    (1.5h max)   (to all contacts)
                                                    |
                          +-----------+-----------+-+
                          |           |           |
                          v           v           v
                     Get GPS     Capture      Reverse
                     Location    Snapshot     Geocode
                          |      from cam     Address
                          v           v           v
                     Build Maps   Upload to   Get real
                     link + nav   free host   street addr
                          |           |           |
                          +-----+-----+-----------+
                                |
                                v
                    Send EmailJS to ALL
                    contacts with email
                                |
                                v
                    Start live location
                    updates (every 2 min)
                                |
                                v
  Minimize --> hide overlay        SOS ACTIVE pill
  siren/vibrate/rec keep           tap to reopen overlay
  running in background            fixed at top of screen
```

### Journey Tracking Flow

```
  PHASE 1: PLANNING
  - Tap map to add waypoints (max 10)
  - Waypoints saved to localStorage
  - Dashed polyline connects nodes
              |
              | "Start Journey" (>=2 waypoints)
              v
  PHASE 2: ACTIVE TRACKING
  GPS watchPosition fires continuously
        |
        +--> Update blue dot + path polyline
        +--> Update stats (duration, distance, speed)
        +--> Check waypoint proximity (50m radius)
        |      Mark reached + vibrate
        +--> Check path deviation (150m threshold)
               |
               +-- ON ROUTE: indicator
               +-- OFF ROUTE: indicator
                      30s grace --> alert --> repeat
  Pause / Resume  |  Share Location
              |
              | "I'm Home Safe" or manual stop
              v
  PHASE 3: COMPLETE
  - Summary: duration, distance, nodes reached
  - "Plan New Journey" resets to Phase 1
  - Event logged to history
```

### Battery-Aware Flow

```
  Battery API --> levelchange event
        |
        +-- <=15% (once) --> "Battery low" alert + GPS to contacts
        +-- <=10% (once) --> "Very low" alert + enter low-power GPS
        |                    (switch watchPosition to 30s getCurrentPosition)
        +-- <=5%  (once) --> "Battery critical" alert (last chance)

  Charging detected --> reset all flags (alerts fire again on next discharge)
  Battery badge: Green --> Amber --> Red pulsing
```

### Module Architecture

```
                           +-------------+
                           |   app.js    |  (Entry Point)
                           |  AppState   |  (Shared State)
                           +------+------+
                                  | setAppState() --> ES modules
          +----------+------------+------------+----------+
          |          |            |            |          |
   +------+------+  |   +-------+--------+   |   +------+------+
   | sosButton   |  |   |  mapJourney     |   |   | batteryWatch|
   | - Hold/tap  |  |   |  - Map + dots   |   |   | - 3 levels  |
   | - Minimize  |  |   |  - Waypoints    |   |   | - Low-power |
   | - Safe mode |  |   |  - Deviation    |   |   | - Badge UI  |
   +-------------+  |   |  - Pause/Resume |   |   +-------------+
                    |   |  - Check-in     |   |
   +------------+   |   +----------------+   |   +--------------+
   | safeMode   |   |                        |   | ambientLight |
   | - Toggle   |   |   +----------------+   |   | - <10 lux    |
   | - 4 sensors|   |   |  voiceDetect   |   |   | - Auto-alert |
   +------------+   |   | - 56 keywords  |   |   +--------------+
   +------------+   |   | - 9 languages  |   |   +--------------+
   |motionDetect|   |   +----------------+   |   |  geofence    |
   | - Shake 20 |   |                        |   | - Zone CRUD  |
   |   m/s2     |   |                        |   | - Proximity  |
   | - Crash/Fall|  |                        |   | - Auto-alert |
   +------------+   |                        |   +--------------+
                    |                        |
         +----------+------------------------+
         |
  +------+------+    +--------------+    +--------------+
  |  alerts.js  |    | contacts.js  |    | recorder.js  |
  | - Toast     |<-->| - CRUD       |    | - Audio rec  |
  | - Siren     |    | - EmailJS    |    | - Video rec  |
  | - Vibrate   |    | - Snapshot   |    | - 9-step     |
  | - Overlay   |    | - Live GPS   |    | - IndexedDB  |
  +-------------+    +--------------+    +------+-------+
                                                |
       +----------------------------------------+
       |
  +----+-----------+     +------------+     +----------------+
  |  historyLogger |---->|   db.js    |---->|   IndexedDB    |
  |  - logEvent()  |     | - openDB   |     |  SafeHerDB v3  |
  |  - location    |     | - CRUD     |     |  - recordings  |
  |  - system info |     | - stats    |     |  - history     |
  +----------------+     +------------+     +----------------+
          |
  +-------+---------+     +----------------------------------+
  |   history.js    |     |    IIFE Global Modules           |
  | - Date groups   |     |  emergencyCall | smsAlert        |
  | - Autocomplete  |     |  - tel: dial   | - sms: intent   |
  | - Export CSV    |     |  liveStream    | communityMap    |
  +-----------------+     |  - PeerJS      | - Supabase      |
                          |  - WebRTC      | - Overpass      |
  +-----------------+     |  safeRoute     | i18n            |
  | activityInsights|     |  - ORS API     | - EN/HI/TE      |
  | - Chart.js      |     |  - Map-click   | - data-i18n     |
  | - Doughnut/Bar  |     +----------------------------------+
  +-----------------+
  |d3Visualizations |     +-----------------+ +--------------+
  | - D3.js v7      |     |  wakeLock.js    | | ntfyPush.js  |
  | - Timeline/Heat |     |  - Screen lock  | | - Push notifs|
  +-----------------+     +-----------------+ +--------------+
                          |backgroundSync.js| |offlineGeo.js |
                          | - Queue offline | | - Geo cache  |
                          +-----------------+ +--------------+
```

---

## Step-by-Step Development Process

### Step 1: Project Setup & App Shell
- Created base HTML with PWA meta tags (viewport, theme-color, apple-mobile-web-app)
- Set up `manifest.json` with app name, icons, standalone display, portrait orientation
- Designed dark theme CSS with CSS custom properties
- Built bottom navigation with 5 tabs: Home, Journey, Contacts, Recordings, History

### Step 2: SOS Button & Emergency Overlay
- Designed central SOS button with pulsing ring animation
- Implemented 2-second hold to activate, tap to deactivate
- Created full-screen red emergency overlay with action buttons

### Step 3: Alert System (Siren, Vibration, Notifications)
- Generated siren via Web Audio API -- sawtooth oscillator 440 to 880 Hz
- Implemented vibration pattern loop
- Built toast notification system with auto-dismiss
- Added browser Notification API support

### Step 4: Safe Mode
- Toggle with localStorage persistence
- Stops all sensors when enabled, SOS button greyed out

### Step 5: SOS Minimize & Active Pill
- Minimize hides overlay, keeps everything running
- SOS ACTIVE pill at top of screen when minimized

### Step 6: Motion / Shake Detection
- DeviceMotion API, 20 m/s2 threshold, 60s cooldown, iOS permission handling

### Step 7: Voice / Keyword Detection
- Web Speech Recognition API, continuous listening, 5s countdown

### Step 8: Evidence Recorder & IndexedDB
- Separate audio/video with stream guard, 9-step recording pipeline

### Step 9: Emergency Contacts & EmailJS
- Full CRUD, automatic email with GPS + address + snapshot + directions

### Step 10: Reverse Geocoding & Snapshot Upload
- Nominatim GPS to address, ImageCapture snapshot, 3-host fallback upload

### Step 11: Journey Tracking with Waypoints
- Leaflet.js map, tap-to-add waypoints, path deviation, check-in timer, share location

### Step 12: Live Location Updates
- GPS update emails every 2 min after SOS, max 30 updates

### Step 13: History & Event Logging
- IndexedDB logging, date grouping, autocomplete, filter, sort, CSV export

### Step 14: Service Worker & Offline
- Cache-first strategy, versioned cache, offline fallback

### Step 15: Multi-Language Voice Commands
- Expanded voice detection from 2 languages (EN, HI) to 9 languages (EN, HI, TA, TE, BN, MR, GU, KN, ML) with 56 distress keywords using transliteration

### Step 16: Battery-Aware Emergency
- Battery Status API monitoring, 3 alert thresholds (15%/10%/5%), low-power GPS mode, header battery badge, charging reset

### Step 17: Feature Cleanup & Recording Fix
- Removed Walk-Me-Home dead man's switch, Destination & ETA, and Send My Location features
- Fixed single-tap recording (debounce flag, preventDefault, simplified stop guard)
- Improved pause/resume as a clear toggle button (Pause amber / Resume green)

### Step 18: Emergency Medical Info Screen
- Added `emergencyInfo.js` module with full CRUD in localStorage
- Blood type, allergies, medications, conditions, organ donor, insurance, notes
- Read-only preview card on Home screen, edit form with toggle
- `getEmergencySummary()` export for embedding in alert emails
- All medical info stays on-device -- zero server dependency

### Step 19: Geo-fence Unsafe Zone Alerts
- Added `geofence.js` module with map-based zone management
- Users mark unsafe zones on the Leaflet map (Journey tab) with custom label + radius
- Zones drawn as dashed red circles with floating labels
- Toggle monitoring from Home screen -- uses watchPosition for continuous GPS checks
- Auto-alerts all emergency contacts when entering a marked zone
- 5-minute cooldown per zone, persistent in localStorage, full history logging

### Step 20: Features 1-7 -- Sensor APIs, Charts & Visualizations
- **Wake Lock** (`wakeLock.js`) -- Screen Wake Lock API prevents sleep during active features
- **Ambient Light** (`ambientLight.js`) -- Detects darkness (<10 lux), auto-alerts
- **NTFY Push** (`ntfyPush.js`) -- Push notifications via ntfy.sh
- **Background Sync** (`backgroundSync.js`) -- Queues alerts offline, processes on reconnect
- **Offline Geo** (`offlineGeo.js`) -- Caches reverse geocoding in localStorage
- **Activity Insights** (`activityInsights.js`) -- Chart.js 4.4.0 doughnut + bar charts on History
- **D3 Visualizations** (`d3Visualizations.js`) -- D3.js v7 timeline + heatmap visualizations

### Step 21: Features 10-16 -- Calls, SMS, Streaming, Community Map, Routes, i18n
- **Emergency Call** (`emergencyCall.js`) -- Quick-dial 112/100/1091/108 via tel: protocol
- **SMS Alert** (`smsAlert.js`) -- Native SMS to all contacts via sms: URI
- **Live Stream** (`liveStream.js`) -- WebRTC via PeerJS, companion `watch.html` for viewers
- **Community Map** (`communityMap.js`) -- Report/view unsafe areas via Supabase + Overpass POIs
- **Safe Route** (`safeRoute.js`) -- Pedestrian routing via OpenRouteService + map-click picker
- **i18n** (`i18n.js`) -- Multilingual UI (EN/HI/TE) with `data-i18n` attribute system

### Step 22: QA Audit & Bug Fixes
- Fixed **report modal white screen bug** -- duplicate `display:none` + `display:flex` in inline style
- Fixed 5 occurrences of undefined `var(--radius)` to `var(--radius-md)` in CSS
- Added missing `.feature-icon--purple` CSS class for Darkness Detection
- Fixed `.journey-final-stats` CSS selector mismatch (class vs ID)
- Fixed SW fetch handler returning `undefined` on offline failure -- returns `Response(503)`
- Added startup safety check to force-hide report modal (cache defense)
- Deleted orphaned `crashDetect.js` (dead code -- crash detection merged into `motionDetect.js`)
- Changed SW to **network-first for HTML** requests, cache-first for other assets
- Added **auto-reload on SW update** in `registerSW()` -- users always get latest version
- Cache version bumped to `safeher-v57`

---

## Technical Deep Dives

### SOS Activation Pipeline
1. User holds SOS button for 2 seconds -- `activateSOS()` fires
2. `AppState.sosActive = true`, `threatScore = 100`
3. **Parallel**: siren starts (Web Audio), vibration loop, overlay shown, back camera recording, emergency emails
4. **Email pipeline**: GPS -- snapshot capture -- upload to image host -- reverse geocode -- build template -- EmailJS to all contacts
5. Live location updates start (every 2 min via watchPosition)
6. Everything logged to IndexedDB history

### Path Deviation Algorithm
1. Each GPS update during active journey: calculate distance from current position to planned route
2. **Point-to-segment distance**: perpendicular distance from current point to each segment of waypoint polyline
3. **Haversine formula**: `R = 6,371,000m`, accurate Earth-surface distance
4. If distance > 150m: start 30s grace timer
5. After 30s still deviated: alert contacts, repeat every 2 min
6. Back within 150m: clear timers, show "Back on track"

### Evidence Recording Pipeline (9-Step)
1. `checkPermissions()` -- verify microphone/camera access
2. Single `getUserMedia()` call with exact constraints
3. Expanded MIME type fallback list: vp8,opus -- vp9,opus -- h264,opus -- webm -- h264,aac -- mp4
4. Bitrate options: 128kbps audio, 2.5Mbps video
5. `try/catch` MediaRecorder creation
6. Chunk logging during recording
7. `onstop` verification with test URL
8. 100ms timeslice for frequent data chunks
9. Video playback with `playsInline=true`, `muted=false`

### Battery-Aware Emergency Logic
1. `navigator.getBattery()` -- get BatteryManager
2. Listen for `levelchange` and `chargingchange` events
3. Thresholds: 15% (alert), 10% (alert + low-power GPS), 5% (critical alert)
4. Low-power GPS: replaces continuous watchPosition with 30-second getCurrentPosition intervals
5. Background GPS cache: always stores last known position for instant alert delivery
6. Charging: resets all flags so alerts fire again on next discharge cycle

### Pause / Resume Journey
1. Single toggle button: Pause (amber) / Resume (green)
2. When paused: `journeyPaused = true`, `pauseStart = Date.now()`
3. GPS updates are ignored while paused (`if (journeyPaused) return`)
4. When resumed: `pausedDuration += Date.now() - pauseStart`
5. Duration calculation subtracts total paused time: `elapsed = now - start - pausedDuration`
6. Journey timer continues displaying but GPS tracking pauses

### Community Safety Map -- Data Flow
1. **Submit report**: User fills modal -- `submitReport()` auto-detects GPS via `getCurrentPosition()` -- falls back to map center -- collects category/severity/description from chip selectors -- `POST /rest/v1/safety_reports` to Supabase with `apikey` + `Bearer` auth headers
2. **Offline fallback**: If Supabase is unreachable, report saved to `localStorage` key `safeher_community_reports` as JSON array -- merged with remote data on next fetch
3. **Fetch reports**: `GET /rest/v1/safety_reports` with bounding box filter (lat +/- 0.05, lng +/- 0.05 = ~5km radius) -- ordered by `created_at DESC`, limit 100
4. **Render on map**: Each report -- `L.circle()` (radius: 70/120/200px by severity) + `L.marker()` with emoji `divIcon` -- popup with category, description, severity, timestamp
5. **Nearby POIs**: `POST` to Overpass API with `[amenity=police|hospital|pharmacy]` query within 3km -- renders blue markers with name/address/phone popup
6. **Supabase table**: `safety_reports` with columns: `id` (BIGSERIAL), `lat` (FLOAT8), `lng` (FLOAT8), `type` (TEXT), `description` (TEXT), `severity` (TEXT), `anonymous` (BOOL), `created_at` (TIMESTAMPTZ). Row Level Security: public read + public insert.

### Safe Walking Route -- ORS Integration
1. User taps "Get Safe Route" -- `startPick()` sets `isPicking = true`, changes cursor to crosshair
2. `map.once('click')` captures destination lat/lng
3. Auto-GPS for start point via `getCurrentPosition()` -- falls back to map center
4. `POST` to `https://api.openrouteservice.org/v2/directions/foot-walking/geojson` with `{coordinates: [[startLng, startLat], [destLng, destLat]]}` and API key header
5. Response contains GeoJSON LineString -- drawn as Leaflet `L.geoJSON()` polyline on map
6. Distance extracted from `features[0].properties.summary.distance` (meters to km)
7. Duration extracted from `features[0].properties.summary.duration` (seconds to minutes)
8. Status text shows: "Route: X.X km, ~Y min walk"

### Crash / Fall Detection Algorithm
1. `devicemotion` event fires -- calculate total acceleration: sqrt(x2 + y2 + z2) (including gravity)
2. **Phase 1 -- Free-fall**: If `total < 3 m/s2` (near zero-G), set `freeFallDetected = true`, start 1-second window
3. **Phase 2 -- Impact**: Within 1s of free-fall, if `total > 30 m/s2` (sudden spike) -- crash detected
4. **Reset**: If 1 second passes with normal motion (3-30 m/s2) after free-fall, reset state
5. **On crash**: Dispatch `safeher:crash-detected` custom event -- show `#crash-countdown-overlay` with 15-second countdown
6. **"I'm OK" button**: User taps -- `crashImOk()` -- cancel countdown, hide overlay
7. **Countdown expires**: Auto-triggers `sosButton.activateSOS()` -- full emergency (siren, alerts, recording)

### Live Video Stream -- PeerJS WebRTC
1. User taps "Start Stream" -- `getUserMedia({ video, audio })` acquires camera
2. `new Peer()` creates PeerJS instance -- receives unique Peer ID on `open` event
3. Peer ID displayed as shareable link: `https://yourapp.com/watch.html?id=PEER_ID`
4. User shares link with contacts (WhatsApp, SMS, copy)
5. **Viewer side** (`watch.html`): Opens -- `new Peer()` -- `peer.call(remotePeerId)` -- `on('stream')` -- plays video in `<video>` element
6. **Streamer side**: `peer.on('call')` -- `call.answer(localStream)` -- bidirectional connection
7. Multiple simultaneous viewers supported via `activeCalls` array
8. Stream auto-cleanup on `stop()` -- closes all calls, stops media tracks, destroys peer

### Service Worker Strategy
1. **Install**: Pre-cache all LOCAL_ASSETS (28 JS files, 2 CSS, HTML, manifest, icons, i18n JSONs) + CDN_ASSETS (Leaflet, Chart.js, D3, EmailJS, PeerJS)
2. **Activate**: Delete all old caches (any key not equal to current `CACHE_NAME`), `clients.claim()`
3. **Fetch -- HTML/Navigation**: Network-first -- on success, cache response clone -- on failure, serve from cache -- ultimate fallback to cached `/index.html`
4. **Fetch -- Other assets**: Cache-first -- on miss, fetch from network -- cache response clone -- on total failure, return `Response('Offline', 503)`
5. **Background Sync**: On `sync` event with tag `safeher-sync-alerts`, notify window clients via `postMessage` to process queued alerts
6. **Auto-reload**: `app.js registerSW()` checks `reg.update()` every 60s -- on `statechange` to `activated`, calls `window.location.reload()` to load fresh code
7. **Cache versioning**: Bump `safeher-vXX` on every deploy -- old caches auto-deleted on activate

---

## Supabase Setup

The **Community Safety Map** (Feature 22) requires a Supabase Postgres table to store and retrieve crowdsourced safety reports.

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up (free tier)
2. Click **New Project** -- name it (e.g., "safe her") -- set a database password -- click **Create**
3. Wait ~2 minutes for provisioning

### 2. Create the `safety_reports` Table
1. In your project dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query** and paste:

```sql
CREATE TABLE safety_reports (
  id BIGSERIAL PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  type TEXT DEFAULT 'unsafe',
  description TEXT DEFAULT '',
  severity TEXT DEFAULT 'medium',
  anonymous BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON safety_reports
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON safety_reports
  FOR INSERT WITH CHECK (true);
```

3. Click **Run** -- you should see "Success. No rows returned"

### 3. Get Your API Credentials
1. Go to **Settings** then **API** (left sidebar)
2. Copy:
   - **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
   - **anon/public key**: `eyJ...` (long JWT token)

### 4. Update the Code
Open `js/communityMap.js` and update lines 11-12:
```javascript
const CommunityMap = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  key: 'YOUR_ANON_KEY_HERE',
```

### 5. Verify It Works
1. Go to **Table Editor** then click `safety_reports`
2. Open the app -- Journey tab -- tap "Report Unsafe Area" -- submit a report
3. Refresh Table Editor -- you should see the new row with lat, lng, type, severity

### Table Schema

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | BIGSERIAL | auto-increment | Primary key |
| `lat` | DOUBLE PRECISION | -- | GPS latitude |
| `lng` | DOUBLE PRECISION | -- | GPS longitude |
| `type` | TEXT | `'unsafe'` | Category: unsafe, harassment, theft, lighting, other |
| `description` | TEXT | `''` | User's optional description |
| `severity` | TEXT | `'medium'` | low, medium, or high |
| `anonymous` | BOOLEAN | `true` | Always anonymous |
| `created_at` | TIMESTAMPTZ | `now()` | Auto-set timestamp |

### Row Level Security Policies
| Policy | Type | Rule |
|--------|------|------|
| Allow public read | SELECT | `USING (true)` -- anyone can read reports |
| Allow public insert | INSERT | `WITH CHECK (true)` -- anyone can submit reports |

---

## Getting Started

### Prerequisites
- Any modern web browser (Chrome, Edge, Firefox, Safari)
- Smartphone for full features (GPS, camera, accelerometer, microphone)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shrutikeshri2021/safeher.git
   cd safeher
   ```

2. **Serve locally** (any static server):
   ```bash
   # Python
   python -m http.server 8000

   # Node.js
   npx serve .

   # VS Code Live Server
   # Right-click index.html then "Open with Live Server"
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

4. **Install as PWA:**
   - **Android (Chrome):** Tap menu then "Install app" / "Add to Home Screen"
   - **iOS (Safari):** Tap Share then "Add to Home Screen"
   - **Desktop (Chrome/Edge):** Click install icon in address bar

### EmailJS Setup (for automatic email alerts)

1. Sign up at [emailjs.com](https://www.emailjs.com) (free -- 200 emails/month)
2. Create an **Email Service** (connect Gmail/Outlook)
3. Create an **Email Template** with variables:
   - `{{to_email}}`, `{{from_name}}`, `{{location_link}}`, `{{address}}`
   - `{{satellite_link}}`, `{{time}}`, `{{snapshot_url}}`, `{{message}}`
4. Update credentials in `index.html`:
   ```javascript
   emailjs.init('YOUR_PUBLIC_KEY');
   ```
5. Update IDs in `js/contacts.js`:
   ```javascript
   emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
   ```

---

## Deployment

### GitHub Pages
```bash
git push origin main
# Settings then Pages then Source: main branch then Save
```

### Netlify
- Drag and drop folder or connect GitHub repo
- `netlify.toml` already configured

### Vercel
- Import GitHub repo at vercel.com
- `vercel.json` already configured

---

## Privacy & Security

- **No server / No backend** -- core safety features run entirely in your browser
- **No data collection** -- no analytics, no tracking, no telemetry
- **Recordings stored locally** in IndexedDB -- never uploaded anywhere
- **Snapshot images** uploaded to free hosts ONLY during active SOS (auto-expire)
- **No account required** -- no signup, no login, no password
- **Email alerts** sent via EmailJS (encrypted HTTPS) directly from browser
- **Battery data** never leaves the device -- only level % included in alert emails
- **Community reports are anonymous** -- no user ID, no IP, no device fingerprint stored in Supabase
- **Supabase data is minimal** -- only GPS coordinates, category, severity, description, and timestamp
- **Row Level Security** -- Supabase policies allow only read + insert (no update/delete by external users)
- **API keys are public (anon)** -- by design, Supabase anon keys are safe to expose; RLS controls access
- **Medical info stays on-device** -- blood type, allergies, medications stored only in localStorage
- **Geo-fence zones stay on-device** -- zone data never leaves localStorage
- **Open source** -- audit every line of code yourself

---

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Author

**Shruti Keshri**

- GitHub: [@shrutikeshri2021](https://github.com/shrutikeshri2021)

---

<p align="center">
  <strong>Built with love for women's safety</strong><br/>
  <em>Because every woman deserves to feel safe.</em>
</p>

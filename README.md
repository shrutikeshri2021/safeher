<p align="center">
  <img src="assets/icons/icon-192.svg" alt="SafeHer Logo" width="100" height="100" />
</p>

<h1 align="center">SafeHer — Women's Personal Safety App</h1>

<p align="center">
  <strong>A Progressive Web App (PWA) built to keep women safe — anytime, anywhere.</strong><br/>
  One-tap SOS • Automatic email alerts with live GPS • Back camera evidence recording • Shake & voice detection • Waypoint journey tracking with path deviation alerts • Fake call escape • History logging • Works offline
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-PWA-blueviolet?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-orange?style=flat-square" alt="Tech" />
  <img src="https://img.shields.io/badge/Maps-Leaflet.js-green?style=flat-square" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Alerts-EmailJS-red?style=flat-square" alt="EmailJS" />
  <img src="https://img.shields.io/badge/Storage-IndexedDB-yellow?style=flat-square" alt="IndexedDB" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

## 📖 About The Project

### What is SafeHer?

**SafeHer** is a women's personal safety Progressive Web App (PWA) designed to provide **instant emergency assistance** at the tap of a button. It works entirely in the browser — no app store download needed — and can be installed on any smartphone's home screen for a native-like experience.

SafeHer is not just an SOS button — it is a **complete safety ecosystem** that combines:
- **Emergency alerting** (automatic GPS + address + snapshot emails to contacts)
- **Evidence collection** (video + audio recording with IndexedDB storage)
- **Smart threat detection** (shake & voice keyword recognition)
- **Journey protection** (waypoint tracking, path deviation detection, check-in timers)
- **Situational escape** (fake incoming call)
- **Full activity history** (every event logged, searchable, and exportable)

### Why is it necessary?

Women face safety threats in everyday life — walking alone at night, commuting, traveling to unfamiliar areas, or being in uncomfortable situations. Existing safety apps often require:
- Expensive subscriptions
- Complex setup with servers and backends
- App store downloads that may not be possible in the moment
- Manual steps during emergencies (typing messages, sharing location)

**SafeHer eliminates all of these barriers:**
- ✅ **100% free** — no subscription, no charges
- ✅ **No app store** — works instantly in any browser
- ✅ **Zero manual steps** — one tap triggers everything automatically
- ✅ **No backend server** — everything runs client-side in the browser
- ✅ **Works offline** — cached via Service Worker for instant loading
- ✅ **No account needed** — no signup, no login, no tracking

### What problem does it solve?

| Problem | SafeHer's Solution |
|---------|-------------------|
| Can't call for help discreetly | **Silent SOS** — one tap with minimizable overlay; siren runs in background |
| Contacts don't know your location | **Automatic GPS emails** with live Google Maps link, address, and driving directions |
| No evidence of the incident | **Back camera auto-records** video + audio, stored locally in IndexedDB |
| Phone snatched or thrown | **Shake detection** auto-triggers alert if phone is aggressively shaken |
| Can't speak during danger | **Voice detection** listens for distress keywords ("help", "bachao") and auto-triggers SOS |
| Unsafe during commute | **Waypoint journey tracking** with **path deviation detection** — auto-alerts if you go off-route |
| No one checking on you | **Check-in timer** auto-alerts contacts if you don't confirm safety within a set time |
| Need an excuse to leave | **Fake incoming call** overlay that looks like a real phone call |
| Can't track safety history | **Full event history** with date grouping, search, filters, and CSV export |

---

## ✨ Complete Feature List

### 🚨 One-Tap SOS Emergency Alert
- Hold the big red SOS button for **2 seconds** to activate the full emergency system
- Single tap while active → deactivate SOS
- Full-screen red emergency overlay with **siren sound** and **vibration pattern**
- **"I'm Safe — Cancel Alert"** button stops everything when you're safe
- **"Call Police"** button for direct emergency call (100/112)
- **✕ Minimize button** — hide overlay while keeping siren, vibration, and recording running in the background
- **🔴 SOS ACTIVE pill** — fixed red pill at top of screen when overlay is minimized; tap to reopen
- **SOS disabled in Safe Mode** — button greyed out (opacity 0.4, no pulse) when Safe Mode is active; prevented from triggering

### 📧 Fully Automatic Email Alerts (via EmailJS)
- Emails sent **automatically** to ALL saved contacts with email addresses — zero manual steps
- **No SMS charges, no phone number needed** — works with just an email address
- Each alert email contains:
  - 📍 **Live GPS location** (clickable Google Maps link)
  - 🏠 **Real street address** (reverse geocoded via OpenStreetMap Nominatim API)
  - 🛰️ **Satellite view link** (see terrain — forest, desert, city)
  - 🚗 **Google Maps navigation link** (one-tap driving directions to the person)
  - 📸 **Camera snapshot** (auto-uploaded to free image host, rendered in email)
  - ⏰ **Timestamp** of when SOS was triggered
  - 📍 **GPS coordinates** (latitude & longitude)

### 📍 Real-Time Live Location Tracking
- After SOS trigger, sends **updated GPS location emails every 2 minutes**
- Contacts can track the person's movement in real-time
- Continues sending even after SOS siren is stopped
- Stops ONLY when **"I'm Safe — Cancel Alert"** is explicitly pressed
- Maximum 30 updates (1 hour) to conserve EmailJS free quota

### 📹 Evidence Recording (Audio & Video)
- SOS automatically starts **back camera video recording** with audio (captures surroundings, not face)
- Camera flash/torch intentionally kept **OFF** to avoid detection
- Auto-stops after **1.5 hours** (battery conservation)
- **Separate audio and video** — each button independently toggles its own stream
- **Stream guard** — clicking the same button twice won't start duplicate streams
- **Video records with audio** — `getUserMedia({ video: { facingMode: 'environment' }, audio: true })` with `vp8,opus` codec for synced evidence
- Recordings stored securely in **IndexedDB** on the device
- All recordings are playable inline, downloadable, and deletable from the Recordings tab

### 📸 Emergency Camera Snapshot
- At the moment SOS is triggered, a **snapshot is captured** from the back camera
- Snapshot **resized** (max 480px) for fast upload
- Uploaded to **free image hosting** (Telegraph / freeimage.host / tmpfiles.org) with 3-host fallback chain
- Public URL embedded in email — **renders in all email clients** (Gmail, Outlook, Yahoo)

### 🤝 Shake / Motion Detection
- Uses **DeviceMotion API** to detect violent shaking (threshold: **20 m/s²**)
- Automatically triggers emergency alert on aggressive shake
- **60-second cooldown** between triggers to prevent false alerts
- Handles **iOS 13+ permission prompts** automatically
- Auto-starts evidence recording on detection

### 🗣️ Voice / Keyword Detection
- Uses **Web Speech Recognition API** for real-time voice monitoring
- Listens for distress keywords in **English and Hindi**:
  - English: *"help"*, *"help me"*, *"save me"*, *"emergency"*, *"leave me"*, *"let me go"*, *"stop"*, *"no no no"*, *"please stop"*
  - Hindi: *"bachao"*, *"madad"*, *"chodo"*, *"bachao mujhe"*, *"chhod do"*
- **5-second countdown** before triggering SOS (cancelable)
- Continuous listening — auto-restarts if speech recognition ends

### 🗺️ Journey Tracking with Waypoints & Path Deviation
- Built with **Leaflet.js** and **OpenStreetMap** tiles
- **Waypoint planning** — tap the map to add up to **10 waypoints** (nodes)
- Waypoints stored in **localStorage** — persist across sessions
- **Dashed polyline** connects waypoints on the map (color `#0A84FF`, dash pattern `8,8`)
- Each waypoint has a **50m radius circle** — auto-marked as reached ✅ when user enters radius
- **3-phase journey UI**:
  - 🔵 **Planning** — add/remove waypoints, clear all, start journey
  - 🟢 **Active** — live tracking with real-time stats (duration HH:MM:SS, distance, speed km/h)
  - 🟡 **Complete** — summary with total duration, distance, nodes reached
- **Path deviation detection** — if you move **>150m** away from your planned route:
  - **30-second grace timer** before alerting (in case you're just rerouting)
  - Sends **emergency alert** to contacts
  - **Repeats every 2 minutes** while still off-route
  - Visual indicator: ✅ On route / ⚠️ Off route with distance
- **Check-in timer** — set 5–60 minute intervals; if you don't tap "I'm Okay", auto-alerts contacts
- **Pause / Resume** journey with accurate duration tracking (paused time excluded)
- **"I'm Home Safe"** button to end journey with success message
- **Always-on live blue dot** with pulsing animation and GPS accuracy circle
- **Share location** via WhatsApp, Telegram, Email, Outlook, or clipboard

### 📞 Fake Call
- Instantly shows a **fake incoming call overlay** (looks like a real phone call)
- Shows caller name from first saved contact (or "Mom ❤️" by default)
- Accept → shows **in-call timer** with "End Call" button
- Decline → dismisses overlay
- Great for excusing yourself from uncomfortable or threatening situations

### 🏠 Safe Mode
- Toggle-based mode that **pauses all active sensors** (motion, voice, geolocation)
- **SOS button disabled** — greyed out, non-functional while Safe Mode is ON
- Status persists across sessions via **localStorage**
- Automatic sensor restart when Safe Mode is turned OFF
- Visual feedback: green "You're Safe 🏠" status

### 📊 History & Event Log
- **Every safety event logged** to IndexedDB with full context:
  - Event type, severity (critical/warning/info/safe), timestamp
  - GPS location + address, trigger details, media info, contacts alerted
- **ChatGPT-style date grouping**: Today → Yesterday → Previous 7 Days → February 2025, etc.
- **Sticky section headers** between date groups
- **Smart search autocomplete** with 3 types of suggestions:
  - 🏷️ **Keywords** — event types and titles
  - 📅 **Dates** — "today", "yesterday", month names, time patterns ("10pm", "feb")
  - 📍 **Locations** — matching addresses and lat/lng coordinates
- **Filter chips** by severity: All, Critical, Warning, Info, Safe
- **Sort** by newest or oldest
- **Expandable event cards** with full details (location map link, trigger info, media, contacts)
- **Export to CSV** — download complete history as spreadsheet
- **Clear all** with confirmation
- **Badge count** on navigation tab
- **Live updates** — new events appear automatically

### 👥 Emergency Contacts Management
- Add, edit, and delete emergency contacts
- Store: **Name**, **Phone**, **Email**, **Relationship** (Family/Friend/Partner/Colleague/Other)
- Card-based UI with avatars generated from initials
- Send location manually via **SMS**, **Email**, or **WhatsApp** (deep link)

### 🔔 Smart Alert System
- **Toast notifications** — non-intrusive status messages (auto-dismiss 3s)
- **Browser notifications** — system-level alerts with sound
- **Full-screen overlays** — emergency alerts with action buttons
- **Siren sound** — generated via Web Audio API (440→880 Hz sawtooth sweep), no audio file needed
- **Vibration patterns** — continuous vibration loop during SOS
- **Ringtone** — 4-note sine wave pattern for fake call (C5-E5-G5-E5)

### ⌨️ Keyboard Shortcuts
- `Ctrl + Shift + S` → Trigger SOS
- `Ctrl + Shift + F` → Fake Call
- `Escape` → Close overlays

### 📱 Works Offline (PWA)
- **Service Worker** with cache-first strategy
- All assets cached for instant offline loading
- Installable on home screen (Android & iOS)
- Full-screen standalone mode (no browser chrome)
- Auto-updates when new version deployed (cache versioning: `safeher-v28`)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | App structure, semantic markup, accessibility attributes |
| **CSS3** | Dark theme UI (#0B0F1A base), glassmorphism cards, responsive mobile-first design (max-width 430px), CSS animations (pulse, blink, fade), custom range slider styling |
| **Vanilla JavaScript (ES Modules)** | All app logic — zero frameworks, zero build tools, zero npm dependencies |
| **Leaflet.js 1.9.4** (CDN) | Interactive maps, markers, polylines, circles, journey path drawing |
| **OpenStreetMap** | Map tiles (free, no API key required) |
| **EmailJS** | Automatic email sending from browser (free tier: 200 emails/month) |
| **OpenStreetMap Nominatim** | Free reverse geocoding (GPS coordinates → real street address) |
| **Web Speech Recognition API** | Real-time voice keyword detection (English + Hindi) |
| **DeviceMotion API** | Accelerometer-based shake/motion detection |
| **MediaRecorder API** | Audio & video evidence recording (vp8/opus codec) |
| **ImageCapture API** | Camera snapshot without stopping active video stream |
| **Web Audio API** | Siren (sawtooth oscillator 440–880 Hz) and ringtone (sine wave C5-E5-G5-E5) generation |
| **Geolocation API** | Real-time GPS via `watchPosition` (faster than `getCurrentPosition` on mobile) |
| **IndexedDB** | Client-side database for recordings (`recordings` store) and history (`history` store) |
| **localStorage** | Waypoint persistence, safe mode state, contact storage |
| **Service Worker** | Offline caching, cache-first strategy, versioned cache updates |
| **Web App Manifest** | PWA installability, home screen icon, standalone display mode |
| **Vibration API** | Emergency vibration patterns during SOS and alerts |
| **Notification API** | System-level browser notifications with sound and badge |
| **Telegraph / freeimage.host / tmpfiles.org** | Free image upload for email snapshots (3-host automatic fallback chain) |
| **WhatsApp / Telegram Deep Links** | Location sharing via `wa.me` and `t.me` URLs (no API key needed) |
| **Google Fonts (Outfit)** | Modern typography — weights 300–700 |
| **Haversine Formula** | Distance calculation between GPS coordinates (R = 6,371,000 m) |

---

## 📁 Project Structure

```
SafeHer/
├── index.html              # Main app shell — all 5 screens, overlays, modals, navigation
├── manifest.json           # PWA manifest — app name, icons, theme, orientation
├── sw.js                   # Service Worker — cache-first offline strategy (v28)
├── netlify.toml            # Netlify deployment config (SPA rewrite)
├── vercel.json             # Vercel deployment config (SPA rewrite)
├── README.md               # This file — complete project documentation
│
├── css/
│   └── style.css           # Complete dark theme UI (1500+ lines)
│                             ├── CSS variables for colors, radii, transitions
│                             ├── SOS button with pulse animation
│                             ├── Journey phases (planning/active/complete)
│                             ├── Waypoint items, deviation indicators
│                             ├── Check-in timer slider & countdown
│                             ├── History cards, autocomplete dropdown
│                             ├── Overlay styles (alert, fake call, countdown)
│                             └── Bottom navigation with badges
│
├── js/
│   ├── app.js              # Entry point — shared AppState, navigation, module init, keyboard shortcuts
│   ├── alerts.js           # Toast system, overlays (alert/fake call/countdown), siren (Web Audio),
│   │                         vibration, browser notifications, emergency dispatch, GPS helper
│   ├── contacts.js         # Contact CRUD (localStorage), EmailJS auto-email, snapshot capture & upload,
│   │                         reverse geocoding (Nominatim), live GPS updates (every 2 min)
│   ├── sosButton.js        # SOS button hold/tap logic, activate/deactivate SOS,
│   │                         minimize overlay + SOS active pill, safe mode disabled state
│   ├── recorder.js         # MediaRecorder (audio/video/SOS), IndexedDB storage (SafeHerDB),
│   │                         stream guard (no duplicates), separate audio/video toggle,
│   │                         inline playback, download, delete, recording badge
│   ├── mapJourney.js       # Leaflet map, always-on blue dot, waypoint CRUD (max 10, localStorage),
│   │                         3-phase journey (planning/active/complete), waypoint proximity (50m),
│   │                         path deviation detection (150m threshold, 30s timer, 2min repeat),
│   │                         check-in timer (5–60 min), Haversine distance, share location modal
│   ├── safeMode.js         # Safe mode toggle (localStorage), sensor start/stop, SOS button disable
│   ├── motionDetect.js     # DeviceMotion shake detection (20 m/s² threshold), iOS permission handling
│   ├── voiceDetect.js      # SpeechRecognition, keyword dictionary (EN + HI), 5s countdown trigger
│   ├── history.js          # History screen UI — stat cards, ChatGPT-style date groups,
│   │                         smart autocomplete (keywords/dates/locations), filter chips,
│   │                         sort, expandable cards, export CSV, clear all, badge
│   ├── historyLogger.js    # logEvent() — captures timestamp, location, trigger, media,
│   │                         contacts, system info (battery, network) and writes to IndexedDB
│   └── db.js               # IndexedDB helpers — openDB, getAllHistory, getHistoryStats,
│                              clearAllHistory, deleteHistoryEvent
│
└── assets/
    └── icons/
        ├── icon-192.svg    # App icon 192×192 (shield + heart)
        └── icon-512.svg    # App icon 512×512 (shield + heart)
```

---

## 🔄 Application Flow

### High-Level User Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER OPENS APP                            │
│                    (browser or PWA home screen)                   │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    app.js — init()     │
                    │  • Create AppState     │
                    │  • Inject into modules │
                    │  • Wire navigation     │
                    │  • Init all modules    │
                    └───────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
     ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
     │  Safe Mode?  │   │ Restore last │   │   Register   │
     │  (localStorage) │ │  nav tab     │   │   Service    │
     │  YES → pause │   │              │   │   Worker     │
     │  sensors     │   │              │   │              │
     └─────────────┘   └──────────────┘   └──────────────┘
```

### 🚨 SOS Emergency Flow

```
  User holds SOS button (2 sec)
              │
              ▼
  ┌─────────────────────────────────┐
  │    activateSOS()                │
  │  AppState.sosActive = true      │
  │  AppState.threatScore = 100     │
  └──────────────┬──────────────────┘
                 │
   ┌─────────┬───┼───┬──────────┬──────────────┐
   ▼         ▼   │   ▼          ▼              ▼
 Play     Start  │  Show     Start Back     Send Emergency
 Siren  Vibrate  │  Alert    Camera Rec     Alert Emails
(440Hz) Pattern  │  Overlay  (1.5h max)     (to all contacts)
                 │                               │
                 │               ┌───────────────┼───────────────┐
                 │               ▼               ▼               ▼
                 │          Get GPS          Capture         Reverse
                 │          Location        Snapshot        Geocode
                 │               │          from cam       Address
                 │               ▼               ▼               ▼
                 │          Build Maps      Upload to       Get real
                 │          link + nav      free host      street addr
                 │               │               │               │
                 │               └───────┬───────┘───────────────┘
                 │                       ▼
                 │            ┌───────────────────────┐
                 │            │  Send EmailJS to ALL   │
                 │            │  contacts with email   │
                 │            └───────────┬───────────┘
                 │                        ▼
                 │             Start live location
                 │             updates (every 2 min)
                 │                        │
                 │               (continues until
                 │              "I'm Safe" pressed)
                 │
                 ▼
  ┌───────────────────────────┐     ┌─────────────────────────┐
  │  ✕ Minimize → hide overlay│     │ 🔴 SOS ACTIVE pill      │
  │  siren/vibrate/rec keep   │ ──▶ │ tap to reopen overlay   │
  │  running in background    │     │ fixed at top of screen  │
  └───────────────────────────┘     └─────────────────────────┘
                 │
                 ▼
  ┌───────────────────────────┐
  │  "I'm Safe" / Tap SOS    │
  │  → deactivateSOS()       │
  │  → Stop siren, vibrate,  │
  │    recording, live GPS    │
  │  → Hide overlay + pill   │
  │  → Log event to history  │
  └───────────────────────────┘
```

### 🗺️ Journey Tracking Flow

```
  ┌─────────────────────────────────────────────────────┐
  │              PHASE 1: PLANNING                       │
  │  • Tap map to add waypoints (max 10)                │
  │  • Waypoints saved to localStorage                  │
  │  • Dashed polyline connects nodes                   │
  │  • Clear all / remove individual waypoints          │
  └──────────────────────┬──────────────────────────────┘
                         │ "Start Journey" (≥2 waypoints)
                         ▼
  ┌─────────────────────────────────────────────────────┐
  │              PHASE 2: ACTIVE TRACKING                │
  │                                                     │
  │  GPS watchPosition fires continuously               │
  │         │                                           │
  │         ├──▶ Update blue dot + path polyline        │
  │         ├──▶ Update stats (duration, distance, speed)│
  │         ├──▶ Check waypoint proximity (50m radius)  │
  │         │      └── Mark reached ✅ + vibrate         │
  │         └──▶ Check path deviation (150m threshold)  │
  │                │                                    │
  │                ├── ON ROUTE: ✅ indicator            │
  │                └── OFF ROUTE: ⚠️ indicator          │
  │                       │                             │
  │                       ▼ (30 sec grace period)       │
  │                  Send deviation alert to contacts   │
  │                  Repeat every 2 min while off-route │
  │                                                     │
  │  ┌──────────────────────────────────────────┐       │
  │  │  CHECK-IN TIMER (optional)               │       │
  │  │  Slider: 5–60 min                        │       │
  │  │  Countdown visible on screen             │       │
  │  │  "I'm Okay" resets timer                 │       │
  │  │  Timer expires → auto-alert contacts     │       │
  │  └──────────────────────────────────────────┘       │
  │                                                     │
  │  ⏸ Pause / ▶ Resume  |  📍 Share Location          │
  └──────────────────────┬──────────────────────────────┘
                         │ "I'm Home Safe" or manual stop
                         ▼
  ┌─────────────────────────────────────────────────────┐
  │              PHASE 3: COMPLETE                       │
  │  • Summary: total duration, distance, nodes reached │
  │  • "Plan New Journey" resets to Phase 1             │
  │  • Event logged to history                          │
  └─────────────────────────────────────────────────────┘
```

### 🏗️ Module Architecture (Block Diagram)

```
                           ┌─────────────┐
                           │   app.js    │  (Entry Point)
                           │  AppState   │  (Shared State Object)
                           │  Navigation │
                           └──────┬──────┘
                                  │ setAppState() injected into all modules
                  ┌───────────────┼───────────────────────────┐
                  │               │                           │
         ┌────────┴────────┐  ┌──┴───────────┐  ┌───────────┴───────────┐
         │  sosButton.js   │  │ safeMode.js  │  │   mapJourney.js       │
         │  • Hold/tap SOS │  │ • Toggle     │  │   • Leaflet map       │
         │  • Minimize     │  │ • Sensor     │  │   • Waypoints (10)    │
         │  • Disabled in  │  │   control    │  │   • Path deviation    │
         │    safe mode    │  │ • SOS disable│  │   • Check-in timer    │
         └───────┬─────────┘  └──┬───────────┘  │   • Share location    │
                 │               │               └───────────┬───────────┘
                 │          ┌────┴────────┐                  │
                 │          │             │                  │
                 │    ┌─────┴──────┐ ┌───┴──────────┐       │
                 │    │motionDetect│ │ voiceDetect   │       │
                 │    │• Shake 20  │ │• Keywords     │       │
                 │    │  m/s²      │ │  EN + HI      │       │
                 │    │• Cooldown  │ │• 5s countdown  │       │
                 │    └────────────┘ └──────────────┘       │
                 │                                          │
         ┌───────┴──────────────────────────────────────────┘
         │
  ┌──────┴──────┐        ┌──────────────┐        ┌──────────────┐
  │  alerts.js  │        │ contacts.js  │        │ recorder.js  │
  │ • Toast     │◀──────▶│ • CRUD       │        │ • Audio rec  │
  │ • Siren     │        │ • EmailJS    │        │ • Video rec  │
  │ • Vibrate   │        │ • Snapshot   │        │ • Stream     │
  │ • Overlay   │        │ • Geocode    │        │   guard      │
  │ • Notif.    │        │ • Live GPS   │        │ • IndexedDB  │
  └─────────────┘        └──────────────┘        └──────┬───────┘
                                                        │
  ┌──────────────────────────────────────────────────────┘
  │
  │    ┌─────────────────┐     ┌────────────┐     ┌────────────────┐
  └───▶│  historyLogger  │────▶│   db.js    │────▶│   IndexedDB    │
       │  • logEvent()   │     │ • openDB   │     │  SafeHerDB v2  │
       │  • location     │     │ • CRUD     │     │  ├─ recordings │
       │  • trigger info │     │ • stats    │     │  └─ history    │
       │  • system info  │     └────────────┘     └────────────────┘
       └─────────────────┘
                │
                ▼
       ┌─────────────────┐
       │   history.js    │
       │ • Stat cards    │
       │ • Date groups   │
       │ • Autocomplete  │
       │ • Filter/sort   │
       │ • Export CSV    │
       └─────────────────┘
```

### Data Flow Diagram

```
┌────────────┐        ┌────────────────┐        ┌──────────────┐
│   SENSORS  │───────▶│   DETECTION    │───────▶│   RESPONSE   │
│            │        │                │        │              │
│ GPS        │        │ Shake ≥20 m/s² │        │ Siren        │
│ Accel.     │        │ Keyword match  │        │ Vibration    │
│ Microphone │        │ SOS button     │        │ Overlay      │
│ Camera     │        │ Deviation >150m│        │ Email alert  │
│            │        │ Check-in miss  │        │ Recording    │
└────────────┘        └────────────────┘        │ Notification │
                                                └──────┬───────┘
                                                       │
                                        ┌──────────────┼──────────────┐
                                        ▼              ▼              ▼
                                 ┌────────────┐ ┌────────────┐ ┌───────────┐
                                 │  IndexedDB  │ │  EmailJS   │ │ localStorage│
                                 │ recordings  │ │  (cloud)   │ │ waypoints  │
                                 │ history     │ │            │ │ contacts   │
                                 └────────────┘ └────────────┘ │ safe mode  │
                                                               └───────────┘
```

---

## 🔧 Step-by-Step Development Process

### Step 1: Project Setup & App Shell
- Created base HTML with PWA meta tags (viewport, theme-color, apple-mobile-web-app)
- Set up `manifest.json` with app name, icons, standalone display, portrait orientation
- Designed dark theme CSS with CSS custom properties for all colors
- Built bottom navigation bar with 5 tabs: **Home, Journey, Contacts, Recordings, History**
- Implemented screen-switching logic with smooth transitions

### Step 2: SOS Button & Emergency Overlay
- Designed the central SOS button with pulsing ring animation
- Implemented **2-second hold to activate** and **tap to deactivate**
- Created full-screen red emergency overlay with alert message
- Added "I'm Safe — Cancel Alert" and "Call Police" buttons

### Step 3: Alert System (Siren, Vibration, Notifications)
- Generated siren using **Web Audio API** — sawtooth oscillator sweeping 440→880 Hz
- Implemented vibration pattern loop using Vibration API
- Built toast notification system with auto-dismiss
- Added browser Notification API support
- Created shared `AppState` object for cross-module communication

### Step 4: Safe Mode
- Built toggle with **localStorage persistence**
- Stops all sensors (motion, voice, geolocation) when enabled
- SOS button **greyed out and non-functional** in safe mode
- Dynamic status card updates

### Step 5: SOS Integration & Minimize
- Wired SOS button to trigger all systems simultaneously (siren, vibrate, overlay, recording, email)
- Added **✕ Minimize** button — hides overlay, keeps everything running
- **🔴 SOS ACTIVE** pill shown at top of screen when minimized

### Step 6: Motion / Shake Detection
- Integrated DeviceMotion API with **20 m/s²** threshold
- 60-second cooldown to prevent repeated false triggers
- iOS 13+ permission flow handling
- Auto-starts evidence recording

### Step 7: Voice / Keyword Detection
- Integrated Web Speech Recognition API with continuous listening
- Distress keyword dictionary in English and Hindi
- 5-second animated countdown before SOS trigger (cancelable)

### Step 8: Evidence Recorder & IndexedDB
- Built separate audio and video recording with **stream guard** (no duplicates)
- Video records with synced audio (vp8,opus codec)
- Independent toggle buttons — each controls its own stream type
- Stored in IndexedDB; playable, downloadable, deletable

### Step 9: Emergency Contacts & EmailJS
- Full CRUD for contacts with card-based UI
- EmailJS integration for automatic email (GPS, address, snapshot, directions)
- Zero manual steps during emergency

### Step 10: Reverse Geocoding & Snapshot Upload
- OpenStreetMap Nominatim for GPS → street address
- Camera snapshot via ImageCapture API, resized to 480px
- 3-host fallback upload chain (Telegraph → freeimage.host → tmpfiles.org)

### Step 11: Journey Tracking with Waypoints
- Leaflet.js map with always-on blue dot and accuracy circle
- **Tap-to-add waypoints** (max 10) with dashed polyline
- **Path deviation detection** using Haversine + point-to-segment distance
- **Check-in timer** with range slider (5–60 min)
- 3-phase UI: Planning → Active → Complete
- Share location via WhatsApp, Telegram, Email, Outlook, clipboard

### Step 12: Live Location Updates
- GPS update emails every 2 minutes after SOS
- Max 30 updates to conserve email quota
- Stops only on explicit "I'm Safe" press

### Step 13: History & Event Logging
- Every safety event logged to IndexedDB with full context
- ChatGPT-style date grouping (Today, Yesterday, Previous 7 Days, Month Year)
- Smart autocomplete (keywords, dates, locations)
- Filter, sort, expand, export CSV, clear all

### Step 14: Service Worker & Offline
- Cache-first strategy, versioned cache (`safeher-v28`)
- All assets + CDN resources cached
- Automatic old cache cleanup
- Offline fallback to cached index.html

---

## ⚙️ How It Works (Technical Details)

### SOS Activation
1. User holds SOS button for 2 seconds → `activateSOS()` fires
2. `AppState.sosActive = true`, `threatScore = 100`
3. **Parallel execution**: siren starts (Web Audio), vibration loop begins, overlay shown, back camera recording starts, emergency emails dispatched
4. Email pipeline: get GPS → capture snapshot → upload to image host → reverse geocode address → build template → send via EmailJS to all contacts
5. Live location updates start (every 2 min via `watchPosition`)
6. All events logged to IndexedDB history store

### Path Deviation Detection
1. During active journey, each GPS update checks distance from planned route
2. Uses **point-to-segment distance** algorithm: calculates perpendicular distance from current position to each segment of the waypoint polyline
3. Uses **Haversine formula** (R = 6,371,000 meters) for accurate Earth-surface distance
4. If distance > 150m: starts 30-second grace timer
5. After 30s still deviated: sends alert to contacts, repeats every 2 minutes
6. When back within 150m: clears timers, shows "Back on track"

### Evidence Recording
1. Audio: `getUserMedia({ audio: true, video: false })`
2. Video: `getUserMedia({ video: { facingMode: 'environment' }, audio: true })` — records surroundings with synced audio
3. SOS/Emergency: back camera with high resolution, torch OFF
4. Stream guard: `if (mediaRecorder.state === 'recording' && currentType === type) return`
5. Type switching: `stopRecordingAsync()` waits for save before starting new stream
6. MediaRecorder with `video/webm;codecs=vp8,opus` → fallback `video/webm`

### Check-in Timer
1. User sets duration (5–60 min) via range slider
2. Timer counts down with live display (MM:SS)
3. "I'm Okay" button resets the countdown
4. Timer expires → `triggerCheckinAlert()` → sends alert to all contacts + notification
5. Event logged as `check_in_missed`

---

## 🚀 Getting Started

### Prerequisites
- Any modern web browser (Chrome, Edge, Firefox, Safari)
- Smartphone for full feature access (GPS, camera, accelerometer, microphone)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shrutikeshri2021/safeher.git
   cd safeher
   ```

2. **Serve locally** (use any static server):
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .

   # Using VS Code Live Server extension
   # Right-click index.html → "Open with Live Server"
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

4. **Install as PWA:**
   - **Chrome (Android):** Tap ⋮ menu → "Install app" or "Add to Home Screen"
   - **Safari (iOS):** Tap Share → "Add to Home Screen"
   - **Edge/Chrome (Desktop):** Click install icon in address bar

### EmailJS Setup (for automatic email alerts)

1. Go to [https://www.emailjs.com](https://www.emailjs.com) and sign up (free — 200 emails/month)
2. Create an **Email Service** (connect your Gmail/Outlook)
3. Create an **Email Template** with these variables:
   - `{{to_email}}` — recipient email
   - `{{from_name}}` — sender name
   - `{{location_link}}` — Google Maps link
   - `{{address}}` — street address
   - `{{satellite_link}}` — satellite view link
   - `{{time}}` — timestamp
   - `{{snapshot_url}}` — camera snapshot image URL
   - `{{message}}` — full alert message
4. Update credentials in `index.html`:
   ```javascript
   emailjs.init('YOUR_PUBLIC_KEY');
   ```
5. Update service and template IDs in `js/contacts.js`:
   ```javascript
   emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
   ```

---

## 🌐 Deployment

### GitHub Pages
```bash
git push origin main
# Settings → Pages → Source: main branch → Save
```

### Netlify
- Drag and drop folder to [netlify.com](https://netlify.com) or connect GitHub repo
- `netlify.toml` already configured

### Vercel
- Import GitHub repo at [vercel.com](https://vercel.com)
- `vercel.json` already configured

---

## 🔒 Privacy & Security

- **No server / No backend** — everything runs in your browser
- **No data collection** — no analytics, no tracking, no telemetry
- **Recordings stored locally** in IndexedDB — never uploaded anywhere
- **Snapshot images** uploaded to free hosts ONLY during active SOS (auto-expire)
- **No account required** — no signup, no login
- **Email alerts** sent via EmailJS (encrypted HTTPS) directly from browser
- **Open source** — audit every line of code yourself

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👩‍💻 Author

**Shruti Keshri**

- GitHub: [@shrutikeshri2021](https://github.com/shrutikeshri2021)

---

<p align="center">
  <strong>Built with ❤️ for women's safety</strong><br/>
  <em>Because every woman deserves to feel safe.</em>
</p>

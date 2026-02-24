<p align="center">
  <img src="assets/icons/icon-192.svg" alt="SafeHer Logo" width="100" height="100" />
</p>

<h1 align="center">SafeHer — Women's Personal Safety App</h1>

<p align="center">
  <strong>A Progressive Web App (PWA) built to keep women safe — anytime, anywhere.</strong><br/>
  One-tap SOS • Automatic GPS email alerts • Evidence recording • Shake & voice detection (9 languages) • Journey tracking with path deviation • Battery-aware emergency • Fake call escape • Full history log • Works offline
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-PWA-blueviolet?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-orange?style=flat-square" alt="Tech" />
  <img src="https://img.shields.io/badge/Maps-Leaflet.js-green?style=flat-square" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Alerts-EmailJS-red?style=flat-square" alt="EmailJS" />
  <img src="https://img.shields.io/badge/Storage-IndexedDB-yellow?style=flat-square" alt="IndexedDB" />
  <img src="https://img.shields.io/badge/Voice-9%20Languages-teal?style=flat-square" alt="Voice" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

## 📖 Table of Contents

1. [About The Project](#-about-the-project)
2. [Complete Feature List](#-complete-feature-list)
3. [How Each Screen Works](#-how-each-screen-works)
4. [Tech Stack](#️-tech-stack)
5. [Project Structure](#-project-structure)
6. [Application Flow](#-application-flow)
7. [Step-by-Step Development Process](#-step-by-step-development-process)
8. [Technical Deep Dives](#-technical-deep-dives)
9. [Getting Started](#-getting-started)
10. [Deployment](#-deployment)
11. [Privacy & Security](#-privacy--security)
12. [Contributing](#-contributing)
13. [License](#-license)
14. [Author](#-author)

---

## 📖 About The Project

### What is SafeHer?

**SafeHer** is a women's personal safety Progressive Web App (PWA) designed to provide **instant emergency assistance** at the tap of a button. It works entirely in the browser — no app store download needed — and can be installed on any smartphone's home screen for a native-like experience.

SafeHer is not just an SOS button — it is a **complete safety ecosystem** that combines:
- **Emergency alerting** — automatic GPS + address + snapshot emails to contacts
- **Evidence collection** — video + audio recording with IndexedDB storage
- **Smart threat detection** — shake detection + voice keyword recognition in **9 languages**
- **Journey protection** — waypoint tracking, path deviation detection, check-in timers
- **Battery-aware emergency** — auto-alerts contacts when battery drops to critical levels
- **Situational escape** — fake incoming call overlay
- **Full activity history** — every event logged, searchable, filterable, and exportable

### Why is it necessary?

Women face safety threats in everyday life — walking alone at night, commuting, traveling to unfamiliar areas, or being in uncomfortable situations. Existing safety apps often require expensive subscriptions, complex setup, app store downloads, or manual steps during emergencies.

**SafeHer eliminates all of these barriers:**

| Barrier | SafeHer's Answer |
|---------|-----------------|
| Expensive subscriptions | ✅ **100% free** — no charges, ever |
| App store required | ✅ **Works instantly** in any browser |
| Complex manual steps | ✅ **One tap** triggers everything automatically |
| Needs a backend server | ✅ **Fully client-side** — no server needed |
| Doesn't work offline | ✅ **Cached via Service Worker** — instant loading |
| Requires signup/login | ✅ **No account** — no signup, no tracking |
| English only | ✅ **9-language** voice detection (English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam) |

### What problem does it solve?

| Problem | SafeHer's Solution |
|---------|-------------------|
| Can't call for help discreetly | **Silent SOS** — one tap with minimizable overlay; siren runs in background |
| Contacts don't know your location | **Automatic GPS emails** with live Google Maps link, address, and driving directions |
| No evidence of the incident | **Back camera auto-records** video + audio, stored locally in IndexedDB |
| Phone snatched or thrown | **Shake detection** auto-triggers alert if phone is aggressively shaken |
| Can't speak during danger | **Voice detection** listens for distress keywords in 9 Indian languages and auto-triggers SOS |
| Unsafe during commute | **Journey tracking** with waypoints, path deviation detection, and check-in timer |
| Walking alone at night | **Battery-aware emergency** — auto-alerts contacts at 15%/10%/5% + low-power GPS mode |
| Phone dying in unsafe area | **Battery-aware emergency** — auto-alerts contacts at 15%/10%/5% + low-power GPS mode |
| No one checking on you | **Check-in timer** auto-alerts contacts if you don't confirm safety |
| Need an excuse to leave | **Fake incoming call** overlay that looks like a real phone call |
| Can't track safety history | **Full event history** with date grouping, search, filters, and CSV export |

---

## ✨ Complete Feature List

### 🚨 One-Tap SOS Emergency Alert
- Hold the big red SOS button for **2 seconds** to activate
- Full-screen red emergency overlay with **siren sound** and **vibration pattern**
- **"I'm Safe — Cancel Alert"** button to stop everything
- **"Call Police"** button for direct emergency call (100/112)
- **✕ Minimize button** — hides overlay, keeps siren + vibration + recording running in background
- **🔴 SOS ACTIVE pill** — fixed red badge at top of screen when minimized; tap to reopen
- **SOS disabled in Safe Mode** — button greyed out, non-functional, no pulse animation

### 📧 Fully Automatic Email Alerts (via EmailJS)
- Emails sent **automatically** to ALL contacts with email addresses — zero manual steps
- Each alert email includes:
  - 📍 **Live GPS location** (clickable Google Maps link)
  - 🏠 **Street address** (reverse geocoded via OpenStreetMap Nominatim API)
  - 🛰️ **Satellite view link** (see terrain around the person)
  - 🚗 **Google Maps navigation link** (one-tap driving directions)
  - 📸 **Camera snapshot** (auto-uploaded to image host, rendered in email)
  - ⏰ **Timestamp** of when SOS was triggered
  - 📍 **GPS coordinates** (latitude & longitude)

### 📍 Real-Time Live Location Updates
- After SOS, sends **updated GPS location emails every 2 minutes** to contacts
- Contacts can track the person's movement in real-time
- Stops ONLY when "I'm Safe — Cancel Alert" is explicitly pressed
- Maximum 30 updates (1 hour) to conserve EmailJS free quota

### 📹 Evidence Recording (Audio & Video)
- SOS automatically starts **back camera video** with audio (captures surroundings, not face)
- Camera torch kept **OFF** to avoid detection
- Auto-stops after **1.5 hours** for battery conservation
- **Separate audio and video buttons** — each independently toggles its own stream
- **Stream guard** — clicking same button twice won't start duplicate streams
- **Video + audio synced** — `getUserMedia({ video: { facingMode: 'environment' }, audio: true })` with `vp8,opus` codec
- 9-step recording pipeline: permission check → single getUserMedia → expanded MIME type fallback → bitrate optimization → chunk logging → test URL verification → 100ms timeslice
- Recordings stored in **IndexedDB** — playable inline, downloadable, deletable

### 📸 Emergency Camera Snapshot
- At SOS trigger, a **snapshot** is captured from the back camera
- Resized (max 480px) for fast upload
- Uploaded to **free image hosting** with 3-host fallback chain (Telegraph → freeimage.host → tmpfiles.org)
- Public URL embedded in email and renders in all email clients

### 🤝 Shake / Motion Detection
- **DeviceMotion API** detects violent shaking (threshold: **20 m/s²**)
- Automatically triggers emergency alert
- **60-second cooldown** between triggers to prevent false positives
- Handles **iOS 13+ permission prompts** automatically

### 🗣️ Multi-Language Voice Detection (9 Languages)
- Uses **Web Speech Recognition API** for real-time voice monitoring
- Detects distress keywords in **9 languages** (56 keywords total):
  - **English**: *help, save me, emergency, leave me, let me go, stop, please stop, no no no*
  - **Hindi**: *bachao, madad, chodo, bachao mujhe, chhod do, mujhe bachao, koi bachao, dur hato*
  - **Tamil**: *kaappaathungal, udavi, udavi seiyungal, vidungal, niruthu, ennai vittuvidungal*
  - **Telugu**: *kaapaadam, sahayam, sahayam cheyandi, vadilandi, aapandi, nannu vadilandi*
  - **Bengali**: *sahajjo, amake bachao, chere dao, thamao, amake chere dao, dure jao*
  - **Marathi**: *vachva, vachava, madad kara, sodha, thamba, mala soda, dur vha*
  - **Gujarati**: *bachavo, madad karo, mane bachavo, chhodo, ubha raho, mane chhodi do*
  - **Kannada**: *kaapadi, sahaya, sahaya maadi, bidi, nilisu, nannu bidi, door hogi*
  - **Malayalam**: *rakshikku, sahayam, sahayikku, vidoo, nilkku, enne vidoo, enne rakshikku*
- **5-second countdown** before triggering SOS (cancelable with "FALSE ALARM" button)
- Continuous listening — auto-restarts when speech recognition ends
- Uses transliterated keywords — SpeechRecognition engine matches phonetics

### 🗺️ Journey Tracking with Waypoints & Deviation
- Built with **Leaflet.js** + **OpenStreetMap** tiles
- **Waypoint planning** — tap the map to add up to **10 waypoints**
- Waypoints stored in **localStorage** — persist across sessions
- **Dashed polyline** connects waypoints on the map
- Each waypoint has a **50m radius circle** — auto-marked ✅ when entered
- **3-phase journey UI**:
  - 🔵 **Planning** — add waypoints
  - 🟢 **Active** — live tracking with real-time stats (duration, distance, speed), pause/resume
  - 🏁 **Complete** — summary with total duration, distance, and nodes reached
- **Path deviation detection** — if you move >150m from planned route:
  - 30-second grace timer before alerting
  - Sends emergency alert to contacts
  - Repeats every 2 minutes while off-route
  - Visual: ✅ On route / ⚠️ Off route with distance
- **Pause / Resume toggle** — single button switches between ⏸ Pause (amber) and ▶ Resume (green); paused time excluded from duration
- **Check-in timer** — set 5–60 minute intervals; auto-alerts if you don't tap "I'm Okay"
- **"I'm Home Safe"** button — ends journey with success summary
- **Always-on blue dot** with pulsing animation and GPS accuracy circle
- **Share location** via WhatsApp, Telegram, Email, Outlook, or clipboard

###  Battery-Aware Emergency
- Uses **Battery Status API** (`navigator.getBattery()`)
- **Three alert thresholds**:
  - **15%** — sends "battery low" alert to all emergency contacts with GPS
  - **10%** — sends "battery very low" alert + enters **low-power GPS mode** (switches from continuous `watchPosition` to 30-second interval `getCurrentPosition`)
  - **5%** — sends "battery critical" alert (last chance to locate you)
- **Battery badge in header** — live percentage with icon, color-coded:
  - 🟢 Green (>15%) → 🟡 Amber (15%) → 🔴 Red pulsing (≤5%)
- **Background GPS cache** — always knows last position for instant alert delivery
- **Charging detection** — resets all alert flags when plugged in (so alerts fire again on next discharge)
- All battery events logged to history

### 📞 Fake Call
- Instantly shows a **fake incoming call overlay** that looks like a real phone call
- Shows caller name from first saved contact (or "Mom ❤️" by default)
- **Accept** → shows in-call timer with "End Call" button
- **Decline** → dismisses overlay
- Great for excusing yourself from uncomfortable or threatening situations

### 🏠 Safe Mode
- Toggle that **pauses all active sensors** (motion, voice, geolocation)
- **SOS button disabled** — greyed out, non-functional
- State persists across sessions via **localStorage**
- Sensors auto-restart when Safe Mode is turned OFF
- Visual: green "You're Safe 🏠" status

### 📊 History & Event Log
- **Every safety event logged** to IndexedDB with full context:
  - Event type, severity (critical/warning/info/safe), timestamp
  - GPS location + address, trigger details, media info, contacts alerted
- **ChatGPT-style date grouping**: Today → Yesterday → Previous 7 Days → February 2026, etc.
- **Sticky section headers** between date groups
- **Smart search autocomplete** with 3 suggestion types:
  - 🏷️ Keywords — event types and titles
  - 📅 Dates — "today", "yesterday", month names, time patterns
  - 📍 Locations — matching addresses and coordinates
- **Filter chips** by severity: All, Critical, Warning, Info, Safe
- **Sort** by newest or oldest
- **Expandable event cards** with full details (map link, trigger info, media, contacts)
- **Export to CSV** — download complete history as spreadsheet
- **Clear all** with confirmation
- **Badge count** on History navigation tab
- **Live updates** — new events appear automatically

### 👥 Emergency Contacts Management
- Add, edit, and delete contacts
- Fields: **Name**, **Phone**, **Email**, **Relationship** (Family/Friend/Partner/Colleague/Other)
- Card-based UI with avatars from initials

### 🔔 Smart Alert System
- **Toast notifications** — non-intrusive status messages (auto-dismiss 3s)
- **Browser notifications** — system-level alerts with sound
- **Full-screen overlays** — emergency alerts with action buttons
- **Siren sound** — Web Audio API (440→880 Hz sawtooth sweep), no audio file needed
- **Vibration patterns** — continuous vibration loop during SOS
- **Ringtone** — 4-note sine wave for fake call (C5-E5-G5-E5)

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + S` | Trigger SOS |
| `Ctrl + Shift + F` | Fake Call |
| `Escape` | Close overlays |

### 📱 Works Offline (PWA)
- **Service Worker** with cache-first strategy
- All assets cached for instant offline loading
- Installable on home screen (Android & iOS)
- Full-screen standalone mode (no browser chrome)
- Auto-updates via versioned cache (`safeher-v30`)

---

## 📱 How Each Screen Works

### Screen 1: Home
The main dashboard with everything at your fingertips.

| Element | What It Does |
|---------|-------------|
| **Status Card** | Shows current safety state: "You're Safe" / "Journey Active" / "🚨 Emergency" |
| **Battery Badge** (header) | Live battery % with color coding; auto-alerts at low levels |
| **SOS Button** | Hold 2 seconds → triggers full emergency. Disabled in Safe Mode |
| **Quick Actions Grid** | 4 buttons: Fake Call, Record, Share Location, Siren |
| **Safe Mode Toggle** | Pauses all sensors, disables SOS |
| **Shake Detection Toggle** | Enables/disables accelerometer monitoring |
| **Voice Detection Toggle** | Enables/disables microphone keyword listening |

**How SOS works step by step:**
1. You hold the SOS button for 2 seconds
2. A 5-second countdown appears (cancelable)
3. If not cancelled: siren plays, phone vibrates, full-screen red overlay appears
4. Back camera starts recording video + audio (torch OFF for stealth)
5. App captures a snapshot from camera, uploads to image host
6. Gets your GPS, reverse-geocodes to street address
7. Sends automatic email to ALL saved contacts with: maps link, address, satellite view, navigation link, snapshot image
8. Starts live location updates every 2 minutes
9. You can **minimize** the overlay — siren + recording keep running in background
10. When safe: tap "I'm Safe" or tap SOS button again to deactivate everything

### Screen 2: Journey
Full journey tracking with map, waypoints, and safety features.

**Planning Phase:**
1. Tap the map to add waypoints (max 10) — each gets a numbered marker with 50m radius
2. Tap "▶ Start Journey"

**Active Phase:**
1. Live blue dot tracks your position on the map
2. Green polyline draws your actual path
3. Stats update in real-time: Duration, Distance, Speed
4. Waypoints auto-mark ✅ as you pass within 50m
5. **Path deviation** — if you go >150m off-route, 30s grace period then auto-alerts contacts
6. **Pause/Resume** — single toggle button: ⏸ Pause (amber) ↔ ▶ Resume (green). Paused time excluded from duration
7. **Share Location** — opens modal with WhatsApp, Telegram, Email, Outlook, Copy options

**Complete Phase:**
- Summary card: total duration, distance, nodes reached (e.g. 8/10)
- "Plan New Journey" resets everything

**Check-in Timer (below map):**
1. Set duration (5–60 min) with slider
2. Countdown displayed on screen
3. Tap "✅ I'm Okay" to reset timer
4. If timer expires → auto-alerts all contacts

### Screen 3: Contacts
Manage your emergency contacts.

1. **Add Contact** form: Name, Phone, Email, Relationship
2. **Edit/Delete** existing contacts with card UI
3. Contacts stored in localStorage — no server needed
4. All contacts with email receive automatic SOS alerts via EmailJS

### Screen 4: Recordings
Evidence recorder with playback.

1. **Record Audio** — tap to start/stop audio-only recording
2. **Record Video** — tap to start/stop back camera video with audio
3. **Saved Recordings** list: play inline, download, or delete
4. Stored in IndexedDB `SafeHerDB` → `recordings` store
5. Each recording shows: type badge, date, duration, file size

### Screen 5: History
Complete activity log.

1. **Stat Cards** — total events, critical count, last event time
2. **Search Bar** — smart autocomplete (keywords, dates, locations)
3. **Filter Chips** — All, 🔴 Critical, 🟡 Warning, 🔵 Info, 🟢 Safe
4. **Sort** — Newest first / Oldest first toggle
5. **Event Cards** — expandable, show full details:
   - Timestamp, event type, severity badge
   - GPS coordinates with Google Maps link
   - Trigger method, contacts alerted, media info
6. **Export CSV** — download all events as spreadsheet
7. **Clear All** — delete all history with confirmation
8. **Badge** on nav tab shows unread count

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | App structure, semantic markup, accessibility |
| **CSS3** | Dark theme (#0B0F1A), glassmorphism cards, responsive mobile-first (max 430px), animations |
| **Vanilla JavaScript (ES Modules)** | All app logic — zero frameworks, zero build tools, zero npm |
| **Leaflet.js 1.9.4** (CDN) | Interactive maps, markers, polylines, circles |
| **OpenStreetMap** | Map tiles (free, no API key) |
| **EmailJS** | Automatic email from browser (free: 200 emails/month) |
| **Nominatim** | Free reverse geocoding (GPS → address) + destination search |
| **Web Speech Recognition API** | Real-time voice keyword detection (9 languages) |
| **Battery Status API** | Battery level monitoring, charging detection |
| **DeviceMotion API** | Accelerometer-based shake detection |
| **MediaRecorder API** | Audio & video recording (vp8/opus + fallbacks) |
| **ImageCapture API** | Camera snapshot without stopping video |
| **Web Audio API** | Siren (sawtooth 440–880Hz) + ringtone (sine C5-E5-G5-E5) |
| **Geolocation API** | Real-time GPS via `watchPosition` + `getCurrentPosition` |
| **IndexedDB** | Client-side DB: `recordings` store + `history` store |
| **localStorage** | Waypoints, contacts, safe mode state, settings |
| **Service Worker** | Offline caching, cache-first strategy, versioned updates |
| **Web App Manifest** | PWA installability, home screen icon, standalone mode |
| **Vibration API** | Emergency vibration patterns |
| **Notification API** | System-level browser notifications |
| **Telegraph / freeimage.host / tmpfiles.org** | Free image upload for email snapshots (3-host fallback) |
| **WhatsApp / Telegram Deep Links** | Location sharing via `wa.me` and `t.me` URLs |
| **Google Fonts (Outfit)** | Modern typography — weights 300–700 |
| **Haversine Formula** | GPS distance calculation (R = 6,371,000m) |

---

## 📁 Project Structure

```
SafeHer/
├── index.html              # Main app shell — all 5 screens, overlays, modals, navigation
├── manifest.json           # PWA manifest — app name, icons, theme, orientation
├── sw.js                   # Service Worker — cache-first offline strategy (v30)
├── netlify.toml            # Netlify deployment config
├── vercel.json             # Vercel deployment config
├── README.md               # This file — complete project documentation
│
├── css/
│   └── style.css           # Complete dark theme UI (1800+ lines)
│                             ├── CSS variables (colors, radii, transitions)
│                             ├── SOS button with pulse animation
│                             ├── Battery badge (green/amber/red states)
│                             ├── Journey phases (planning/active/complete)
│                             ├── Waypoints, deviation indicators
│                             ├── Check-in timer slider & countdown
│                             ├── History cards, autocomplete dropdown
│                             ├── Overlay styles (alert, fake call, countdown)
│                             └── Bottom navigation with badges
│
├── js/
│   ├── app.js              # Entry point — shared AppState, navigation, module init,
│   │                         keyboard shortcuts, service worker registration
│   │
│   ├── alerts.js           # Toast system, overlays (alert/fake call/countdown), siren
│   │                         (Web Audio), vibration, browser notifications, emergency
│   │                         dispatch, GPS helper
│   │
│   ├── contacts.js         # Contact CRUD (localStorage), EmailJS auto-email, snapshot
│   │                         capture & upload, reverse geocoding (Nominatim), live GPS
│   │                         updates (every 2 min)
│   │
│   ├── sosButton.js        # SOS button hold/tap logic, activate/deactivate SOS,
│   │                         minimize overlay + SOS active pill, safe mode disable
│   │
│   ├── recorder.js         # MediaRecorder (audio/video/SOS), 9-step recording pipeline,
│   │                         expanded MIME type fallback (vp8→vp9→h264→webm→mp4),
│   │                         IndexedDB storage, stream guard, inline playback, download
│   │
│   ├── mapJourney.js       # Leaflet map, blue dot, waypoint CRUD (max 10, localStorage),
│   │                         3-phase journey (planning/active/complete), waypoint proximity
│   │                         (50m), path deviation (150m, 30s timer, 2min repeat),
│   │                         pause/resume toggle, check-in timer
│   │                         (5–60 min), Haversine distance, share location modal
│   │
│   ├── batteryWatch.js     # Battery Status API monitoring, 3 thresholds (15%/10%/5%),
│   │                         auto-alert to contacts with GPS, low-power GPS mode at 10%,
│   │                         battery badge UI updater, charging reset, background GPS cache
│   │
│   ├── safeMode.js         # Safe mode toggle (localStorage), sensor start/stop,
│   │                         SOS button disable
│   │
│   ├── motionDetect.js     # DeviceMotion shake detection (20 m/s²), 60s cooldown,
│   │                         iOS permission handling
│   │
│   ├── voiceDetect.js      # SpeechRecognition, 56 distress keywords in 9 languages
│   │                         (EN, HI, TA, TE, BN, MR, GU, KN, ML), 5s countdown trigger,
│   │                         continuous listening, auto-restart
│   │
│   ├── history.js          # History screen UI — stat cards, ChatGPT-style date groups,
│   │                         smart autocomplete (keywords/dates/locations), filter chips,
│   │                         sort, expandable cards, export CSV, clear all, badge
│   │
│   ├── historyLogger.js    # logEvent() — captures timestamp, location, trigger, media,
│   │                         contacts, system info (battery, network) → writes to IndexedDB
│   │
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

### High-Level Startup Flow

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
                    │  • Inject into 9 modules│
                    │  • Wire navigation     │
                    │  • Init all modules    │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
 ┌─────────────┐   ┌────────────────┐   ┌────────────────────┐
 │  Safe Mode?  │   │  Battery Watch │   │    Register         │
 │ (localStorage)│  │  init() —      │   │    Service Worker   │
 │ YES → pause  │   │  start monitor │   │    (cache v30)      │
 │ all sensors  │   │  + GPS cache   │   │                    │
 └─────────────┘   └────────────────┘   └────────────────────┘
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
                 ▼
  ┌───────────────────────────┐     ┌─────────────────────────┐
  │  ✕ Minimize → hide overlay│     │ 🔴 SOS ACTIVE pill      │
  │  siren/vibrate/rec keep   │ ──▶ │ tap to reopen overlay   │
  │  running in background    │     │ fixed at top of screen  │
  └───────────────────────────┘     └─────────────────────────┘
```

### 🗺️ Journey Tracking Flow

```
  ┌─────────────────────────────────────────────────────┐
  │              PHASE 1: PLANNING                       │
  │  • Tap map to add waypoints (max 10)                │
  │  • Waypoints saved to localStorage                  │
  │  • Dashed polyline connects nodes                   │
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
  │                       └── 30s grace → alert → repeat│
  │                                                     │
  │  ⏸ Pause ↔ ▶ Resume  |  📍 Share Location          │
  └──────────────────────┬──────────────────────────────┘
                         │ "I'm Home Safe" or manual stop
                         ▼
  ┌─────────────────────────────────────────────────────┐
  │              PHASE 3: COMPLETE                       │
  │  • Summary: duration, distance, nodes reached       │
  │  • "Plan New Journey" resets to Phase 1             │
  │  • Event logged to history                          │
  └─────────────────────────────────────────────────────┘
```


### 🔋 Battery-Aware Flow

```
  Battery API → levelchange event
         │
         ├── ≤15% (once) → 📧 "Battery low" alert + GPS to contacts
         ├── ≤10% (once) → 📧 "Very low" alert + enter low-power GPS
         │                   (switch watchPosition → 30s getCurrentPosition)
         └── ≤5% (once)  → 📧 "Battery critical" alert (last chance)

  Charging detected → reset all flags (alerts fire again on next discharge)
  Battery badge: 🟢 Green → 🟡 Amber → 🔴 Red pulsing
```

### 🏗️ Module Architecture

```
                           ┌─────────────┐
                           │   app.js    │  (Entry Point)
                           │  AppState   │  (Shared State)
                           └──────┬──────┘
                                  │ setAppState() → 8 modules
          ┌──────────┬────────────┼────────────┬──────────┐
          │          │            │            │          │
   ┌──────┴──────┐  │   ┌───────┴────────┐   │   ┌──────┴──────┐
   │ sosButton   │  │   │  mapJourney     │   │   │ batteryWatch│
   │ • Hold/tap  │  │   │  • Map + dots   │   │   │ • 3 levels  │
   │ • Minimize  │  │   │  • Waypoints    │   │   │ • Low-power │
   │ • Safe mode │  │   │  • Deviation    │   │   │ • Badge UI  │
   └─────────────┘  │   │  • Pause/Resume │   │   └─────────────┘
                    │   │  • Check-in     │   │
   ┌────────────┐   │   └────────────────┘   │
   │ safeMode   │   │                        │
   │ • Toggle   │   │                        │
   │ • Sensors  │   │                        │
   └────────────┘   │                        │
   ┌────────────┐   │                        │
   │motionDetect│   │   ┌────────────────┐   │
   │• Shake 20  │   │   │  voiceDetect   │   │
   │  m/s²      │   │   │• 56 keywords   │   │
   └────────────┘   │   │• 9 languages   │   │
                    │   └────────────────┘   │
                    │                        │
         ┌──────────┴────────────────────────┘
         │
  ┌──────┴──────┐    ┌──────────────┐    ┌──────────────┐
  │  alerts.js  │    │ contacts.js  │    │ recorder.js  │
  │ • Toast     │◀──▶│ • CRUD       │    │ • Audio rec  │
  │ • Siren     │    │ • EmailJS    │    │ • Video rec  │
  │ • Vibrate   │    │ • Snapshot   │    │ • 9-step     │
  │ • Overlay   │    │ • Live GPS   │    │ • IndexedDB  │
  └─────────────┘    └──────────────┘    └──────┬───────┘
                                                │
       ┌────────────────────────────────────────┘
       │
  ┌────┴────────────┐     ┌────────────┐     ┌────────────────┐
  │  historyLogger  │────▶│   db.js    │────▶│   IndexedDB    │
  │  • logEvent()   │     │ • openDB   │     │  SafeHerDB v2  │
  │  • location     │     │ • CRUD     │     │  ├─ recordings │
  │  • system info  │     │ • stats    │     │  └─ history    │
  └─────────────────┘     └────────────┘     └────────────────┘
          │
  ┌───────┴─────────┐
  │   history.js    │
  │ • Date groups   │
  │ • Autocomplete  │
  │ • Export CSV    │
  └─────────────────┘
```

---

## 🔧 Step-by-Step Development Process

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
- Generated siren via Web Audio API — sawtooth oscillator 440→880 Hz
- Implemented vibration pattern loop
- Built toast notification system with auto-dismiss
- Added browser Notification API support

### Step 4: Safe Mode
- Toggle with localStorage persistence
- Stops all sensors when enabled, SOS button greyed out

### Step 5: SOS Minimize & Active Pill
- ✕ Minimize hides overlay, keeps everything running
- 🔴 SOS ACTIVE pill at top of screen when minimized

### Step 6: Motion / Shake Detection
- DeviceMotion API, 20 m/s² threshold, 60s cooldown, iOS permission handling

### Step 7: Voice / Keyword Detection
- Web Speech Recognition API, continuous listening, 5s countdown

### Step 8: Evidence Recorder & IndexedDB
- Separate audio/video with stream guard, 9-step recording pipeline

### Step 9: Emergency Contacts & EmailJS
- Full CRUD, automatic email with GPS + address + snapshot + directions

### Step 10: Reverse Geocoding & Snapshot Upload
- Nominatim GPS→address, ImageCapture snapshot, 3-host fallback upload

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
- Improved pause/resume as a clear toggle button (⏸ Pause amber ↔ ▶ Resume green)

---

## ⚙️ Technical Deep Dives

### SOS Activation Pipeline
1. User holds SOS button for 2 seconds → `activateSOS()` fires
2. `AppState.sosActive = true`, `threatScore = 100`
3. **Parallel**: siren starts (Web Audio), vibration loop, overlay shown, back camera recording, emergency emails
4. **Email pipeline**: GPS → snapshot capture → upload to image host → reverse geocode → build template → EmailJS to all contacts
5. Live location updates start (every 2 min via `watchPosition`)
6. Everything logged to IndexedDB history

### Path Deviation Algorithm
1. Each GPS update during active journey: calculate distance from current position to planned route
2. **Point-to-segment distance**: perpendicular distance from current point to each segment of waypoint polyline
3. **Haversine formula**: `R = 6,371,000m`, accurate Earth-surface distance
4. If distance > 150m: start 30s grace timer
5. After 30s still deviated: alert contacts, repeat every 2 min
6. Back within 150m: clear timers, show "✅ Back on track"

### Evidence Recording Pipeline (9-Step)
1. `checkPermissions()` — verify microphone/camera access
2. Single `getUserMedia()` call with exact constraints
3. Expanded MIME type fallback list: `vp8,opus → vp9,opus → h264,opus → webm → h264,aac → mp4`
4. Bitrate options: 128kbps audio, 2.5Mbps video
5. `try/catch` MediaRecorder creation
6. Chunk logging during recording
7. `onstop` verification with test URL
8. 100ms timeslice for frequent data chunks
9. Video playback with `playsInline=true`, `muted=false`

### Battery-Aware Emergency Logic
1. `navigator.getBattery()` → get BatteryManager
2. Listen for `levelchange` and `chargingchange` events
3. Thresholds: 15% (alert), 10% (alert + low-power GPS), 5% (critical alert)
4. Low-power GPS: replaces continuous `watchPosition` with 30-second `getCurrentPosition` intervals
5. Background GPS cache: always stores last known position for instant alert delivery
6. Charging: resets all flags so alerts fire again on next discharge cycle

### Pause / Resume Journey
1. Single toggle button: ⏸ Pause (amber) ↔ ▶ Resume (green)
2. When paused: `journeyPaused = true`, `pauseStart = Date.now()`
3. GPS updates are ignored while paused (`if (journeyPaused) return`)
4. When resumed: `pausedDuration += Date.now() - pauseStart`
5. Duration calculation subtracts total paused time: `elapsed = now - start - pausedDuration`
6. Journey timer continues displaying but GPS tracking pauses

---

## 🚀 Getting Started

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
   # Right-click index.html → "Open with Live Server"
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

4. **Install as PWA:**
   - **Android (Chrome):** Tap ⋮ menu → "Install app" / "Add to Home Screen"
   - **iOS (Safari):** Tap Share → "Add to Home Screen"
   - **Desktop (Chrome/Edge):** Click install icon in address bar

### EmailJS Setup (for automatic email alerts)

1. Sign up at [emailjs.com](https://www.emailjs.com) (free — 200 emails/month)
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

## 🌐 Deployment

### GitHub Pages
```bash
git push origin main
# Settings → Pages → Source: main branch → Save
```

### Netlify
- Drag and drop folder or connect GitHub repo
- `netlify.toml` already configured

### Vercel
- Import GitHub repo at vercel.com
- `vercel.json` already configured

---

## 🔒 Privacy & Security

- **No server / No backend** — everything runs in your browser
- **No data collection** — no analytics, no tracking, no telemetry
- **Recordings stored locally** in IndexedDB — never uploaded anywhere
- **Snapshot images** uploaded to free hosts ONLY during active SOS (auto-expire)
- **No account required** — no signup, no login, no password
- **Email alerts** sent via EmailJS (encrypted HTTPS) directly from browser
- **Battery data** never leaves the device — only level % included in alert emails
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

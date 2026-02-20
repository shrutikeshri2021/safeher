<p align="center">
  <img src="assets/icons/icon-192.svg" alt="SafeHer Logo" width="100" height="100" />
</p>

<h1 align="center">SafeHer — Women's Personal Safety App</h1>

<p align="center">
  <strong>A Progressive Web App (PWA) built to keep women safe — anytime, anywhere.</strong><br/>
  One tap SOS • Automatic email alerts with live GPS • Back camera evidence recording • Shake & voice detection • Live journey tracking • Fake call escape • Works offline
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-PWA-blueviolet?style=flat-square" alt="PWA" />
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-orange?style=flat-square" alt="Tech" />
  <img src="https://img.shields.io/badge/Maps-Leaflet.js-green?style=flat-square" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Alerts-EmailJS-red?style=flat-square" alt="EmailJS" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

## 📖 About The Project

**SafeHer** is a women's personal safety Progressive Web App (PWA) designed to provide instant emergency assistance at the tap of a button. It works entirely in the browser — no app store download needed — and can be installed on any smartphone's home screen for native-like experience.

When a woman feels unsafe, she can:
- **Tap the SOS button** to instantly alert all emergency contacts with her **live GPS location**, **real address**, **satellite map view**, **camera snapshot**, and **Google Maps directions** — all sent automatically via email, with no manual steps required.
- The app continues to send **real-time location updates every 2 minutes** so contacts can track her movement live.
- **Back camera video recording** starts automatically as evidence, recording for up to **1.5 hours**.
- **Shake detection** triggers an alert if the phone detects violent shaking (e.g., being grabbed or thrown).
- **Voice detection** listens for distress keywords like *"help"*, *"bachao"*, *"save me"* and auto-triggers SOS.
- **Fake incoming call** provides an excuse to leave uncomfortable situations.
- The app works **offline** thanks to Service Worker caching.

SafeHer was built as a complete solution — not just an alert button, but a full safety ecosystem with live tracking, evidence collection, and smart detection.

---

## ✨ Features

### 🚨 One-Tap SOS Emergency Alert
- Single tap on the big red SOS button activates the full emergency system
- 3-second hold to cancel SOS (prevents accidental triggers from deactivating)
- Full-screen red emergency overlay with siren sound and vibration pattern
- "I'm Safe — Cancel Alert" button to stop everything when you're safe
- "Call Police" button for direct emergency call (100/112)

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
- After SOS is triggered, the app sends **updated GPS location emails every 2 minutes**
- Contacts can track the person's movement in real-time
- Live location continues sending even after SOS siren is stopped
- Only stops when "I'm Safe — Cancel Alert" is explicitly pressed
- Maximum 30 updates (1 hour) to conserve EmailJS free quota (200 emails/month)

### 📹 Back Camera Evidence Recording
- SOS automatically starts **back camera video recording** (captures surroundings, not face)
- Camera flash/torch is intentionally kept **OFF** to avoid detection
- Auto-stops after **1.5 hours** (battery conservation)
- Recordings stored securely in **IndexedDB** on the device
- Manual audio and video recording also available from the Recordings tab
- All recordings are playable and downloadable from within the app

### 📸 Emergency Camera Snapshot
- At the moment SOS is triggered, a **snapshot is captured** from the back camera
- Snapshot is **resized** (max 480px) for fast upload
- Uploaded to a **free image hosting service** (Telegraph / freeimage.host / tmpfiles.org)
- The public URL is embedded in the email — **renders in all email clients** (Gmail, Outlook, Yahoo)
- If no active recording exists, the app briefly opens the camera, captures the shot, and closes it

### 🤝 Shake / Motion Detection
- Uses the **DeviceMotion API** to detect violent shaking (threshold: 20 m/s²)
- Automatically triggers emergency alert when phone is shaken aggressively
- 60-second cooldown between triggers to prevent false alerts
- Auto-starts recording on shake detection
- Handles **iOS 13+ permission prompts** automatically

### 🗣️ Voice / Keyword Detection
- Uses the **Web Speech Recognition API** for real-time voice monitoring
- Listens for distress keywords in **English and Hindi**:
  - *"help"*, *"help me"*, *"save me"*, *"emergency"*
  - *"bachao"*, *"madad"*, *"chodo"*, *"bachao mujhe"*, *"chhod do"*
  - *"leave me"*, *"let me go"*, *"stop"*, *"no no no"*, *"please stop"*
- 5-second countdown before triggering SOS (gives time to cancel false triggers)
- Continuous listening — auto-restarts if speech recognition ends

### 🗺️ Live Journey Tracking
- Built with **Leaflet.js** and **OpenStreetMap** tiles
- Start a journey to track your path in real-time on an interactive map
- Shows **duration**, **distance** (km), and **speed** (km/h) in real-time
- Draws your walking/driving path on the map
- Share your live location with contacts at any time
- Custom animated user location marker with pulsing ring

### 📞 Fake Call
- Instantly shows a **fake incoming call overlay** (looks like a real phone call)
- Shows "Mom ❤️" as the caller by default
- Accept to show an in-call timer, or decline to dismiss
- Great for excusing yourself from uncomfortable or threatening situations

### 🏠 Safe Mode
- Toggle-based mode that pauses all active sensors
- Check-in timer with configurable intervals: **15 min / 30 min / 60 min**
- If you don't check in, the app assumes you're in danger and can trigger alerts
- Status persists across sessions via **localStorage**

### 👥 Emergency Contacts Management
- Add, edit, and delete emergency contacts
- Store: **Name**, **Phone**, **Email**, **Relationship** (Family/Friend/Partner/Colleague/Other)
- Smooth card-based UI with avatars generated from initials
- Send location manually via **SMS**, **Email**, or **Web Share API**
- Custom message support for manual location sharing

### 🔔 Smart Alert System
- **Toast notifications** — non-intrusive status messages
- **Browser notifications** — system-level alerts with sound
- **Full-screen overlays** — emergency alerts with action buttons
- **Siren sound** — generated via Web Audio API (440→880 Hz sweep), no audio file needed
- **Vibration patterns** — continuous vibration loop during SOS

### ⌨️ Keyboard Shortcuts
- `Ctrl + Shift + S` → Trigger SOS
- `Ctrl + Shift + F` → Fake Call
- `Escape` → Close overlays

### 📱 Works Offline (PWA)
- **Service Worker** with cache-first strategy
- All assets cached for instant offline loading
- Installable on home screen (Android & iOS)
- Full-screen standalone mode (no browser chrome)
- Auto-updates when new version is deployed (cache versioning)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | App structure, semantic markup, accessibility |
| **CSS3** | Dark theme UI, glassmorphism cards, responsive design (max-width 430px mobile-first) |
| **Vanilla JavaScript (ES Modules)** | All app logic — zero frameworks, zero dependencies in core code |
| **Leaflet.js 1.9.4** | Interactive maps, journey tracking, path drawing |
| **OpenStreetMap** | Map tiles (free, no API key) |
| **EmailJS** | Automatic email sending from browser (free tier: 200 emails/month) |
| **OpenStreetMap Nominatim** | Free reverse geocoding (GPS → street address) |
| **Web Speech Recognition API** | Voice keyword detection |
| **DeviceMotion API** | Shake / motion detection |
| **MediaRecorder API** | Audio & video evidence recording |
| **ImageCapture API** | Camera snapshot without stopping video |
| **Web Audio API** | Siren sound generation (no audio files) |
| **Geolocation API** | Real-time GPS location tracking |
| **IndexedDB** | Local storage for recorded evidence |
| **Service Worker** | Offline support, cache management |
| **Web App Manifest** | PWA installability, home screen icon |
| **Telegraph/freeimage.host** | Free image upload for email snapshots |
| **Google Fonts (Outfit)** | Modern typography |

---

## 📁 Project Structure

```
SafeHer/
├── index.html              # Main app shell — all screens, overlays, navigation
├── manifest.json           # PWA manifest — app name, icons, theme, orientation
├── sw.js                   # Service Worker — cache-first offline strategy
├── netlify.toml            # Netlify deployment config
├── vercel.json             # Vercel deployment config
├── README.md               # Project documentation (this file)
│
├── css/
│   └── style.css           # Complete dark theme UI (994 lines)
│
├── js/
│   ├── app.js              # Entry point — AppState, navigation, module init
│   ├── alerts.js           # Toast, overlays, siren, notifications, emergency dispatch
│   ├── contacts.js         # Contact CRUD, EmailJS auto-email, snapshot upload, live GPS
│   ├── sosButton.js        # SOS button tap/hold logic, activate/deactivate SOS
│   ├── recorder.js         # MediaRecorder, IndexedDB, audio/video/SOS recording
│   ├── mapJourney.js       # Leaflet map, GPS tracking, journey path, stats
│   ├── safeMode.js         # Safe mode toggle, check-in timer, sensor control
│   ├── motionDetect.js     # DeviceMotion shake detection, threshold logic
│   └── voiceDetect.js      # SpeechRecognition, keyword matching, countdown
│
└── assets/
    └── icons/
        ├── icon-192.svg    # App icon 192×192
        └── icon-512.svg    # App icon 512×512
```

---

## 🔧 Step-by-Step Development Process

### Step 1: Project Setup & App Shell
- Created the base HTML structure with meta tags for PWA (viewport, theme-color, apple-mobile-web-app)
- Set up the `manifest.json` with app name, icons, standalone display mode, and portrait orientation
- Created the dark theme CSS with CSS custom properties (variables) for colors
- Designed the bottom navigation bar with 4 tabs: **Home**, **Journey**, **Contacts**, **Recordings**
- Built screen-switching logic with smooth transitions

### Step 2: SOS Button & Emergency Overlay
- Designed the central SOS button with pulsing ring animation
- Implemented **single tap to activate** SOS and **3-second long press to deactivate**
- Created the full-screen red emergency overlay with alert message
- Added "I'm Safe — Cancel Alert" and "Call Police" buttons
- Built the SOS button state management (active/inactive visual feedback)

### Step 3: Alert System (Siren, Vibration, Notifications)
- Generated **siren sound using Web Audio API** — oscillator sweeping 440 Hz → 880 Hz continuously
- Implemented **vibration pattern loop** using the Vibration API
- Built **toast notification system** — auto-dismissing popups for status updates
- Added **browser Notification API** support for system-level alerts
- Created the shared `AppState` object for cross-module communication

### Step 4: Safe Mode & Check-in Timer
- Built the safe mode toggle with **localStorage persistence**
- Implemented configurable check-in timer (15 / 30 / 60 minutes)
- Timer runs in background — if not checked in, threat level increases
- Toggle disables motion and voice detection when in safe mode
- Status card updates dynamically based on mode

### Step 5: SOS Button Integration
- Wired SOS button to trigger all emergency systems simultaneously:
  - Play siren
  - Start vibration pattern
  - Show emergency overlay
  - Start back camera recording
  - Send automatic email alerts to all contacts
- Built `activateSOS()` and `deactivateSOS()` coordinating all modules
- Added threat score management

### Step 6: Motion / Shake Detection
- Integrated the **DeviceMotion API** to read accelerometer data
- Set threshold at **20 m/s²** — violent shaking triggers alert
- Added **60-second cooldown** to prevent repeated false triggers
- Handled **iOS 13+ permission flow** (requestPermission dialog)
- Auto-starts evidence recording on detection

### Step 7: Voice / Keyword Detection
- Integrated **Web Speech Recognition API** with continuous listening
- Built distress keyword dictionary in **English and Hindi**
- Implemented **5-second countdown** before triggering SOS (cancelable)
- Countdown overlay with animated circle progress
- Auto-restarts speech recognition when it naturally ends

### Step 8: Evidence Recorder & IndexedDB
- Built audio and video recording using **MediaRecorder API**
- Stored recordings in **IndexedDB** (SafeHerDB database)
- Implemented playback, download, and delete for saved recordings
- SOS recording uses **back camera** (`facingMode: environment`) with torch OFF
- Auto-stop timer: **1.5 hours** for SOS/emergency recordings
- Recording indicator visible in UI during active recording

### Step 9: Emergency Contacts & EmailJS Integration
- Built full CRUD (Create, Read, Update, Delete) for contacts
- Card-based contact list with avatar initials, relation tags, edit/delete
- Integrated **EmailJS** for fully automatic email sending from the browser
- Email contains: GPS link, address, satellite view, directions, camera snapshot
- Zero manual steps — everything triggers automatically on SOS

### Step 10: Reverse Geocoding & Snapshot Upload
- Integrated **OpenStreetMap Nominatim API** for GPS → real street address
- Builds clean short address from parts (road, suburb, city, state, postcode)
- Camera snapshot captured via **ImageCapture API** from active recording stream
- Snapshot resized to 480px width for fast upload
- Uploaded to **free image hosts** (Telegraph → freeimage.host → tmpfiles.org) with automatic fallback
- Public image URL embedded in email — works in all email clients

### Step 11: Live Journey Tracking
- Integrated **Leaflet.js** with OpenStreetMap tiles
- Real-time GPS tracking with animated user marker
- Journey path drawn as polyline on the map
- Live stats: duration (mm:ss), distance (km), speed (km/h)
- Start/stop journey controls
- Share current location via Web Share API

### Step 12: Real-Time Live Location Updates
- After SOS trigger, sends **GPS location update email every 2 minutes**
- Each update includes new Maps link, navigation link, and GPS coordinates
- Continues sending even after SOS siren is cancelled
- Stops ONLY when "I'm Safe — Cancel Alert" is pressed
- Maximum 30 updates (1 hour) to conserve email quota

### Step 13: Service Worker & Offline Support
- Implemented **cache-first** strategy in Service Worker
- All local assets and CDN resources cached on install
- Automatic old cache cleanup on activation
- Offline fallback to cached `index.html` for navigation requests
- Cache versioning (`safeher-v16`) ensures updates propagate to users

---

## ⚙️ How It Works

### SOS Flow (What happens when you tap the SOS button):

```
User taps SOS button
        │
        ▼
┌───────────────────────────────┐
│  1. AppState.sosActive = true │
│  2. Threat score = 100        │
└───────────────┬───────────────┘
                │
        ┌───────┼───────┬──────────┬──────────────┐
        ▼       ▼       ▼          ▼              ▼
    Play     Start    Show      Start Back     Send Emergency
    Siren  Vibration  Alert     Camera         Alert Emails
   (440Hz)  Pattern   Overlay   Recording      (to all contacts)
                                (1.5hr max)
                                                    │
                                        ┌───────────┼───────────────┐
                                        ▼           ▼               ▼
                                    Get GPS     Capture         Reverse
                                   Location    Snapshot        Geocode
                                        │       from cam       Address
                                        │           │               │
                                        ▼           ▼               ▼
                                   Build      Upload to        Get real
                                  Maps link   free host       street addr
                                        │           │               │
                                        └─────┬─────┘───────────────┘
                                              ▼
                                    ┌──────────────────┐
                                    │ Send EmailJS to   │
                                    │ ALL contacts with │
                                    │ email addresses   │
                                    └────────┬─────────┘
                                             ▼
                                    Start live location
                                    updates (every 2 min)
                                             │
                                        ─ ─ ─ ─ ─ ─
                                      (continues until
                                     "I'm Safe" pressed)
```

### Module Architecture:

```
                        app.js (Entry Point)
                           │
              ┌────────────┼────────────────┐
              │            │                │
              ▼            ▼                ▼
         sosButton.js   safeMode.js    mapJourney.js
              │            │
       ┌──────┼──────┐     ├── motionDetect.js
       ▼      ▼      ▼     └── voiceDetect.js
   alerts.js  │  contacts.js
              │      │
              ▼      ▼ (dynamic import)
         recorder.js
              │
              ▼
         IndexedDB (SafeHerDB)
```

---

## 🚀 Getting Started

### Prerequisites
- Any modern web browser (Chrome, Edge, Firefox, Safari)
- A smartphone for full feature access (GPS, camera, accelerometer, microphone)

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
   - On Chrome (Android): Tap the **"Add to Home Screen"** banner or go to ⋮ menu → "Install app"
   - On Safari (iOS): Tap the **Share** button → "Add to Home Screen"

### EmailJS Setup (for automatic email alerts)

1. Go to [https://www.emailjs.com](https://www.emailjs.com) and sign up (free — 200 emails/month)
2. Create an **Email Service** (connect your Gmail/Outlook)
3. Create an **Email Template** with these variables:
   - `{{to_email}}` — recipient's email
   - `{{from_name}}` — sender's name
   - `{{location_link}}` — Google Maps link
   - `{{address}}` — street address
   - `{{satellite_link}}` — satellite view link
   - `{{time}}` — timestamp
   - `{{snapshot_url}}` — camera snapshot image URL
   - `{{message}}` — full alert message
4. Update the credentials in `index.html`:
   ```javascript
   emailjs.init('YOUR_PUBLIC_KEY');
   ```
5. Update the service and template IDs in `js/contacts.js`:
   ```javascript
   emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
   ```

---

## 🌐 Deployment

### GitHub Pages
```bash
# Push to main branch — GitHub Pages will serve from root
git push origin main
# Go to Settings → Pages → Source: main branch → Save
```

### Netlify
- Drag and drop the project folder to [netlify.com](https://netlify.com)
- Or connect your GitHub repo for auto-deploy
- `netlify.toml` is already configured

### Vercel
- Import GitHub repo at [vercel.com](https://vercel.com)
- `vercel.json` is already configured

---

## 📱 Screenshots

| Home Screen | SOS Active | Journey Tracking | Emergency Contacts |
|---|---|---|---|
| Dark theme with SOS button, quick actions, safety feature toggles | Full-screen red overlay with siren and alert actions | Live map with path tracking, speed, distance | Contact cards with email, phone, relation tags |

---

## 🔒 Privacy & Security

- **No server / No backend** — everything runs in your browser
- **No data sent to any server** except EmailJS (for sending alert emails) and Nominatim (for address lookup)
- **Recordings stored locally** in IndexedDB — never uploaded anywhere
- **Snapshot images** are uploaded to free hosts ONLY during active SOS and auto-expire
- **No account required** — no signup, no login, no tracking
- **Open source** — audit the code yourself

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

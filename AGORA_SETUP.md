# 🎥 SafeHer Feature 43: Agora.io Live Streaming Setup Guide

## ✨ What's New?
- **Real-time video streaming** with shareable browser links
- **Anyone can watch** - no app needed, just click the link
- **Free tier**: 10,000 minutes/month (plenty for safety streaming!)
- **Low latency**: < 150ms real-time video
- **Multiple viewers**: Family/emergency contacts can watch simultaneously

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Free Agora App ID
1. Go to **https://console.agora.io**
2. Sign up with email (free account)
3. Create a new project
4. Copy your **App ID** (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 2: Add App ID to SafeHer
1. Open `index.html` (in VS Code)
2. Find the `<script>` section in `<head>` (around line 23-26)
3. Add this code after other scripts load:

```html
<script>
  // Feature 43: Initialize Agora Live Streaming
  window.AGORA_APP_ID = 'YOUR_AGORA_APP_ID_HERE'; // Replace with your ID from step 1
</script>
```

Example:
```html
<script>
  window.AGORA_APP_ID = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
</script>
```

### Step 3: Update featureIntegration.js
The `featureIntegration.js` file will automatically:
- Initialize Agora when app loads
- Detect when user clicks "Live Stream" button
- Start broadcasting OR join as viewer based on URL parameters

---

## 📱 How It Works

### For the Person in Danger (Broadcaster):
1. Click **"Live Stream"** button in SafeHer
2. **Camera/microphone permission** - Allow
3. Live stream starts automatically
4. **Share the link** with family/emergency contacts
5. They click the link → see LIVE video in browser (no app needed!)

### For Family/Emergency Contacts (Viewers):
1. Receive link: `https://yourapp.com?stream=emergency-12345`
2. Click the link
3. **No login needed** - video appears immediately
4. Watch in real-time (< 150ms delay)
5. Close tab when done

---

## 🔗 How Shareable Links Work

When you start broadcasting, SafeHer generates:
```
https://safeher.app?stream=room-uuid-123456
```

Share this link with:
- 👩‍👩‍👧 Family members
- 👮 Police/emergency services
- 👥 Trusted emergency contacts

Everyone who clicks gets **live video instantly** - no registration!

---

## 💰 Pricing (Free!)

| Feature | Free Tier | Cost |
|---------|-----------|------|
| Minutes/month | 10,000 | **FREE** |
| Concurrent viewers | Unlimited | **FREE** |
| Stream duration | Unlimited | **FREE** |
| Setup | Simple | **FREE** |

**10,000 minutes/month = ~330 minutes/day. More than enough for emergency situations.**

---

## 🛠️ Technical Details

### Agora Class: `AgoraStreaming`
Location: `js/agoraStreaming.js`

**Main Methods:**
```javascript
// Initialize (call once at app startup)
await agoraStreaming.init(appId);

// Start broadcasting
await agoraStreaming.startBroadcasting(roomId, containerElement);
// Returns: { success: true, shareLink: 'https://...' }

// Join as viewer
await agoraStreaming.joinAsViewer(roomId, containerElement);

// Stop streaming
await agoraStreaming.stopStreaming();

// Get share link
const link = agoraStreaming.getShareLink();

// Get viewer count
const viewers = agoraStreaming.getViewerCount();
```

### Integration Points:
1. **app.js** - Initializes Agora on startup with `window.AGORA_APP_ID`
2. **featureIntegration.js** - Handles "Live Stream" button clicks
3. **liveStream.js** - Updates UI with stream status & viewer count
4. **index.html** - Contains video containers and Agora SDK CDN

---

## 🔒 Security & Privacy

✅ **Only works with shared link** - No public stream directory  
✅ **Encrypted connection** (HTTPS) - All data encrypted in transit  
✅ **No recording by default** - Optional if you enable it in Agora console  
✅ **End-to-end privacy** - Only people with link can watch  

---

## 🐛 Troubleshooting

### "Black screen appears"
- Check camera/microphone permissions
- Ensure Agora App ID is correct in HTML
- Refresh page (Ctrl+Shift+R)

### "No video on viewer's side"
- Broadcaster: Make sure "Live Stream" is showing as "🔴 Streaming"
- Viewer: Share link should contain `?stream=roomid`
- Both: Check internet connection

### "App ID not working"
- Go to https://console.agora.io → check your project
- Copy App ID exactly (no extra spaces)
- Reload SafeHer page

---

## 📞 Support

- **Agora Docs**: https://docs.agora.io
- **Get Help**: https://console.agora.io/support
- **Status**: https://status.agora.io

---

## 🎯 Next Steps

1. ✅ Get free Agora App ID (https://console.agora.io)
2. ✅ Add to `index.html`
3. ✅ Reload SafeHer
4. ✅ Test: Click "Live Stream" button
5. ✅ Share link with someone
6. ✅ They view live video in their browser!

---

**SafeHer now has live streaming that just works. Keep everyone safe. 🛡️**

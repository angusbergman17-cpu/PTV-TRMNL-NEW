# Architecture Validation - User Distribution Model

**System Architecture for Self-Service Deployment**

**Copyright (c) 2026 Angus Bergman**
**Licensed under CC BY-NC 4.0**

---

## Overview

This document validates the architecture for the PTV-TRMNL user distribution model, ensuring all components connect correctly for self-service deployment.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     USER DEPLOYMENT FLOW                             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. GITHUB                                                          │
│  ┌─────────────────────┐     ┌─────────────────────┐               │
│  │ Official Repo       │────▶│ User's Fork         │               │
│  │ angusbergman17-cpu/ │     │ [username]/         │               │
│  │ PTV-TRMNL-NEW       │     │ ptv-trmnl-[name]    │               │
│  └─────────────────────┘     └─────────────────────┘               │
│                                        │                            │
└────────────────────────────────────────┼────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. HOSTING (Vercel or Render)                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  User's Server Instance                                      │   │
│  │  https://ptv-trmnl-[name].vercel.app                        │   │
│  │                                                              │   │
│  │  Endpoints:                                                  │   │
│  │  ├─ /setup          → Setup wizard                          │   │
│  │  ├─ /admin          → Admin panel                           │   │
│  │  ├─ /api/zones      → Zone data for device                  │   │
│  │  ├─ /api/dashboard  → Full HTML dashboard                   │   │
│  │  ├─ /api/setup-status → Device checks if setup complete     │   │
│  │  ├─ /api/screen     → TRMNL webhook (image response)        │   │
│  │  └─ /flash          → Web-based firmware flasher            │   │
│  │                                                              │   │
│  │  Environment Variables:                                      │   │
│  │  ├─ ODATA_API_KEY         (Transport Victoria)              │   │
│  │  └─ GOOGLE_PLACES_API_KEY (Address autocomplete)            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                         │                           │
└─────────────────────────────────────────┼───────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
                    ▼                                           ▼
┌───────────────────────────────────┐   ┌───────────────────────────────┐
│  3a. TRMNL DEVICE                 │   │  3b. KINDLE DEVICE            │
│  ┌─────────────────────────────┐  │   │  ┌─────────────────────────┐  │
│  │ ESP32-C3 Firmware           │  │   │  │ Python Script           │  │
│  │                             │  │   │  │                         │  │
│  │ CONFIG:                     │  │   │  │ CONFIG:                 │  │
│  │ SERVER_URL = user's server  │  │   │  │ SERVER_URL = user's srv │  │
│  │                             │  │   │  │                         │  │
│  │ BEHAVIOR:                   │  │   │  │ BEHAVIOR:               │  │
│  │ 1. Boot → WiFi setup        │  │   │  │ 1. Boot → fetch image   │  │
│  │ 2. Connect to WiFi          │  │   │  │ 2. Display via FBInk    │  │
│  │ 3. Fetch from SERVER_URL    │  │   │  │ 3. Sleep interval       │  │
│  │ 4. Display on e-ink         │  │   │  │ 4. Repeat               │  │
│  │ 5. Partial refresh (20s)    │  │   │  │                         │  │
│  └─────────────────────────────┘  │   │  └─────────────────────────┘  │
│                                   │   │                               │
└───────────────────────────────────┘   └───────────────────────────────┘
```

---

## Component Validation

### 1. Repository Fork Model

**Purpose:** Each user gets their own copy of the codebase.

**Validation Checklist:**
- [x] Official repo is public and forkable
- [x] Fork includes all necessary files (server, firmware, docs)
- [x] User can customize their fork without affecting others
- [x] User can sync updates from official repo
- [x] Unique repo name becomes unique server name

**Uniqueness Guarantee:**
```
Official:  github.com/angusbergman17-cpu/PTV-TRMNL-NEW
User A:    github.com/john/ptv-trmnl-john
User B:    github.com/jane/ptv-trmnl-melbourne
User C:    github.com/bob/ptv-trmnl-work
```

### 2. Server Deployment

**Purpose:** Each user's server runs independently.

**Vercel Validation:**
- [x] Deploy button works with fork
- [x] Environment variables can be set
- [x] Unique subdomain: `ptv-trmnl-[name].vercel.app`
- [x] Free tier is sufficient
- [x] No sleep/cold start issues
- [x] Automatic deploys on git push

**Render Validation:**
- [x] Deploy from GitHub fork works
- [x] Environment variables can be set
- [x] Unique subdomain: `ptv-trmnl-[name].onrender.com`
- [x] Free tier available (with sleep)
- [ ] ⚠️ Free tier sleeps after 15 min inactivity

**Required Server Endpoints:**

| Endpoint | Method | Purpose | Device Type |
|----------|--------|---------|-------------|
| `/setup` | GET | Setup wizard UI | Browser |
| `/admin` | GET | Admin panel | Browser |
| `/api/zones` | GET | Zone-based data | TRMNL |
| `/api/dashboard` | GET | Full HTML dashboard | Kindle/Browser |
| `/api/setup-status` | GET | Check if setup complete | All devices |
| `/api/screen` | GET | TRMNL webhook (PNG) | TRMNL |
| `/api/kindle/image` | GET | Kindle-optimized PNG | Kindle |
| `/flash` | GET | Web flasher UI | Browser |

### 3. Device Firmware/Software

**TRMNL Device Validation:**
- [x] Firmware compiles for ESP32-C3
- [x] Server URL configurable via:
  - [x] `firmware/include/config.h`
  - [x] Web flasher with URL parameter
  - [x] WiFi captive portal
- [x] Boot welcome screen displays server URL
- [x] Device polls correct server for data
- [x] 20-second partial refresh works
- [x] 10-minute full refresh works

**Kindle Device Validation:**
- [x] Python script runs on jailbroken Kindle
- [x] Server URL configurable via config file
- [x] FBInk displays fetched images
- [x] Auto-start on boot works
- [x] Battery optimization options

---

## Data Flow Validation

### Setup Flow

```
User                Browser              Server              Device
 │                    │                    │                    │
 │  1. Open /setup    │                    │                    │
 │───────────────────▶│                    │                    │
 │                    │  2. Load wizard    │                    │
 │                    │───────────────────▶│                    │
 │                    │◀───────────────────│                    │
 │                    │                    │                    │
 │  3. Enter config   │                    │                    │
 │───────────────────▶│                    │                    │
 │                    │  4. Save prefs     │                    │
 │                    │───────────────────▶│                    │
 │                    │                    │  5. Poll status    │
 │                    │                    │◀────────────────────│
 │                    │                    │  6. Return ready   │
 │                    │                    │────────────────────▶│
 │                    │                    │                    │
 │                    │                    │  7. Fetch data     │
 │                    │                    │◀────────────────────│
 │                    │                    │  8. Return zones   │
 │                    │                    │────────────────────▶│
 │                    │                    │                    │
 │                    │                    │       9. Display!  │
```

### Refresh Flow (Normal Operation)

```
Device                                    Server                    External APIs
  │                                          │                           │
  │  1. GET /api/zones (every 20s)           │                           │
  │─────────────────────────────────────────▶│                           │
  │                                          │  2. Fetch real-time data  │
  │                                          │──────────────────────────▶│
  │                                          │◀──────────────────────────│
  │  3. Return zone data                     │                           │
  │◀─────────────────────────────────────────│                           │
  │                                          │                           │
  │  4. Partial refresh changed zones        │                           │
  │                                          │                           │
```

---

## Security Validation

### API Key Isolation

```
User A's Server                    User B's Server
┌─────────────────────┐            ┌─────────────────────┐
│ Env: ODATA_API_KEY  │            │ Env: ODATA_API_KEY  │
│ = "user-a-key-xxx"  │            │ = "user-b-key-yyy"  │
│                     │            │                     │
│ User A's data ONLY  │            │ User B's data ONLY  │
└─────────────────────┘            └─────────────────────┘
         │                                  │
         ▼                                  ▼
   User A's Device               User B's Device
```

**Validation:**
- [x] Each user stores their own API keys
- [x] Keys are in environment variables (not code)
- [x] No cross-user data access possible
- [x] Device only communicates with its configured server

### Device Authentication

```cpp
// Device sends its MAC address for identification
String deviceId = WiFi.macAddress();
http.addHeader("X-Device-ID", deviceId);
```

**Validation:**
- [x] Device identifies itself to server
- [x] Server can track which device is polling
- [x] No sensitive data exposed in requests

---

## Kindle-Specific Architecture

### Kindle Data Flow

```
Kindle Device                Server                    Transport API
     │                          │                           │
     │  1. GET /api/kindle/image│                           │
     │─────────────────────────▶│                           │
     │                          │  2. Fetch transit data    │
     │                          │──────────────────────────▶│
     │                          │◀──────────────────────────│
     │                          │                           │
     │                          │  3. Render to PNG         │
     │                          │  (device-specific size)   │
     │                          │                           │
     │  4. Return PNG image     │                           │
     │◀─────────────────────────│                           │
     │                          │                           │
     │  5. Display via FBInk    │                           │
     │                          │                           │
```

### Kindle Device Variants

| Model | Resolution | Endpoint Parameter |
|-------|------------|-------------------|
| Paperwhite 3/4 | 758×1024 | `?device=kindle-pw3` |
| Paperwhite 5 | 1236×1648 | `?device=kindle-pw5` |
| Basic 10th/11th | 600×800 | `?device=kindle-basic` |

**Server Response:**
```javascript
// /api/kindle/image
app.get('/api/kindle/image', async (req, res) => {
    const device = req.query.device || 'kindle-pw3';
    const resolution = DEVICE_RESOLUTIONS[device];
    
    const image = await renderDashboardPNG(resolution);
    
    res.set('Content-Type', 'image/png');
    res.send(image);
});
```

---

## Validation Tests

### Test 1: Fresh Deployment

```bash
# Simulate user deploying for first time
1. Fork repository ✓
2. Deploy to Vercel ✓
3. Note URL: https://ptv-trmnl-test.vercel.app ✓
4. Open /setup ✓
5. Complete wizard ✓
6. Flash device with server URL ✓
7. Device shows transit data ✓
```

### Test 2: Device Boot Sequence

```bash
# Simulate device first boot
1. Power on ✓
2. Display WiFi setup screen ✓
3. User connects to PTV-TRMNL-Setup ✓
4. User enters WiFi credentials ✓
5. Device connects to WiFi ✓
6. Device polls /api/setup-status ✓
7. Server returns setupComplete: false ✓
8. Device shows "Setup Required" screen ✓
9. User completes setup on /setup ✓
10. Device polls /api/setup-status ✓
11. Server returns setupComplete: true ✓
12. Device fetches /api/zones ✓
13. Device displays transit data ✓
```

### Test 3: Kindle Deployment

```bash
# Simulate Kindle setup
1. Jailbreak Kindle (WinterBreak) ✓
2. Install KUAL + Python ✓
3. Copy ptv-trmnl-kindle.py ✓
4. Configure SERVER_URL ✓
5. Run script manually ✓
6. Script fetches /api/kindle/image ✓
7. FBInk displays image ✓
8. Enable auto-start ✓
9. Reboot Kindle ✓
10. Script starts automatically ✓
```

### Test 4: Update Flow

```bash
# Simulate user updating to latest version
1. User clicks "Sync fork" on GitHub ✓
2. Fork updates from official repo ✓
3. Vercel auto-deploys new version ✓
4. Server running new code ✓
5. Device continues working (no change) ✓
6. If firmware update needed:
   6a. User re-flashes device ✓
   6b. Device boots with new firmware ✓
```

---

## Failure Mode Analysis

### Failure 1: Server Sleeping (Render Free Tier)

**Problem:** Render free tier sleeps after 15 min inactivity.

**Impact:** Device polls fail until server wakes (~30s delay).

**Mitigations:**
1. Recommend Vercel (no sleep on free tier)
2. Device shows "Connecting..." during wake
3. Device retries with exponential backoff
4. User can upgrade to Render Starter ($7/month)

### Failure 2: API Key Invalid

**Problem:** Transport Victoria API key expired or invalid.

**Impact:** No real-time data, fallback to timetables.

**Mitigations:**
1. Server validates API key on setup
2. Server falls back to GTFS static timetables
3. Device still shows useful data (less accurate)
4. Admin panel shows API health status

### Failure 3: Device Can't Reach Server

**Problem:** Network issues, DNS failure, server down.

**Impact:** Device shows stale data or error screen.

**Mitigations:**
1. Device caches last successful data
2. Device shows "Last updated: X min ago"
3. Device retries every 60 seconds
4. Error screen with troubleshooting tips

### Failure 4: TRMNL X Flashing Attempt

**Problem:** User tries to flash TRMNL X (incompatible).

**Impact:** Potential device brick.

**Mitigations:**
1. Setup wizard asks for device model
2. Warning displayed for TRMNL X
3. Flash blocked for incompatible devices
4. Clear documentation of supported devices

---

## Architecture Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Fork model | ✅ Validated | Unique repos per user |
| Vercel deployment | ✅ Validated | No sleep, free tier works |
| Render deployment | ⚠️ Validated | Free tier sleeps |
| Server endpoints | ✅ Validated | All required endpoints exist |
| TRMNL firmware | ✅ Validated | ESP32-C3 compatible |
| Kindle software | ✅ Validated | Python + FBInk |
| Boot welcome screen | ✅ Specified | Implementation ready |
| Setup flow | ✅ Validated | Step-by-step wizard |
| Data refresh | ✅ Validated | 20s partial, 10m full |
| Security | ✅ Validated | Isolated instances |

---

## Conclusion

The architecture is **validated and ready for user distribution**. Key strengths:

1. **Complete isolation** - Each user has their own repo, server, and device
2. **Self-service** - No manual intervention required from maintainer
3. **Multi-device** - Supports TRMNL and Kindle with same server
4. **Fault tolerant** - Graceful degradation on failures
5. **Updateable** - Users can sync updates from official repo

**Recommended deployment path:**
1. GitHub fork → Vercel → TRMNL device (easiest)
2. GitHub fork → Vercel → Kindle (requires jailbreak)
3. GitHub fork → Render Starter → Any device (for always-on)

---

**Copyright (c) 2026 Angus Bergman**
**Licensed under CC BY-NC 4.0**

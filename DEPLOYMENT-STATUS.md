# Render Deployment Status - v2.6.0
**Date**: 2026-01-27 20:53
**Issue**: Render not auto-deploying despite multiple commits

## Summary

**Problem**: Render.com free tier is not automatically deploying the new v2.6.0 code despite:
- 4 commits pushed over 35 minutes (19:58 → 20:43)
- Significant code changes (29 files, 5,222 insertions)
- Version bump (2.5.2 → 2.6.0)
- GitHub webhook should have triggered deployment

**Server Status**:
- ✅ Service is running (responding to requests)
- ❌ Running OLD code (v2.5.2 without setup flags)
- ❌ New code (v2.6.0 with setup flags) NOT deployed

## Commits Pushed (Not Deployed)

1. `f57ccc0` - Fix setup flag support in /api/display endpoint (19:58)
2. `54221b9` - Trigger Render redeploy - setup flags (20:16)
3. `3ffb6d4` - Add setup flags documentation for v5.15 firmware (20:22)
4. `5b3a27e` - v2.6.0: Complete setup flags implementation (20:43)

**GitHub Status**: ✅ All commits visible at https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW

## What's Ready (95% Complete)

### ✅ Device & Firmware
- Device ID: 94A990
- Firmware: v5.15-NoQR (stable, no crashes)
- WiFi: Connected
- Boot screen: Fixed (proper landscape layout)
- Status: Operational, refreshing every 20 seconds

### ✅ Server Configuration
- Journey: Melbourne Central → Parliament (Train)
- APIs: Transport Victoria + Google Places configured
- Preferences stored correctly:
  - `journey.homeAddress`: "Melbourne Central Station, Melbourne VIC 3000"
  - `journey.workAddress`: "Parliament Station, Melbourne VIC 3002"
  - `apis.transport.apiKey`: "ce606b90-9ffb-43e8-bcd7-0c2bd0498367"
  - `journey.transitRoute.mode1.departure`: "08:55"

### ✅ Code Changes (Ready to Deploy)
**File**: `src/server.js`

```javascript
// NEW CODE (Lines 1725-1750):
const setupAddresses = Boolean(prefs?.journey?.homeAddress && prefs?.journey?.workAddress);
const setupTransitAPI = Boolean(prefs?.apis?.transport?.apiKey || prefs?.apis?.transport?.devId);
const setupJourney = Boolean(prefs?.journey?.transitRoute?.mode1?.departure);

console.log(`[${friendlyID}] Setup flags: addresses=${setupAddresses}, api=${setupTransitAPI}, journey=${setupJourney}`);

const response = {
  status: 0,
  // ... other fields
  setup_addresses: setupAddresses,      // NEW - Device needs this!
  setup_transit_api: setupTransitAPI,  // NEW - Device needs this!
  setup_journey: setupJourney          // NEW - Device needs this!
};

res.json(response);
```

**New Endpoint**: `/api/version` for deployment verification

## Why Deployment Matters

**Current Behavior**:
1. Device fetches `/api/display` every 20 seconds
2. Server returns: `{"status": 0, "current_time": "20:53", ...}` (NO setup flags)
3. Device sees: Missing setup flags → assumes setup incomplete
4. Device draws: Unified setup screen (waiting for configuration)

**After Deployment**:
1. Device fetches `/api/display` every 20 seconds
2. Server returns: `{"setup_addresses": true, "setup_transit_api": true, "setup_journey": true, ...}`
3. Device sees: All flags true → setup complete!
4. Device draws: Live dashboard with Melbourne Central → Parliament trains

## Manual Deployment Required

**Render free tier auto-deploy appears to be disabled or broken.**

### Option 1: Manual Deploy via Render Dashboard (Recommended)

1. Log into https://dashboard.render.com
2. Find service: "ptv-trmnl-new"
3. Go to "Manual Deploy" section
4. Click "Deploy latest commit" button
5. Confirm deploy of commit `5b3a27e`
6. Wait 2-5 minutes for build to complete

**Verification**:
```bash
# Should return "2.6.0"
curl https://ptv-trmnl-new.onrender.com/api/version

# Should show setup flags
curl https://ptv-trmnl-new.onrender.com/api/display \
  -H 'ID:94A990' -H 'Access-Token:lvivfoczcv9oo8g8br6o5' -H 'FW-Version:5.15' | \
  grep setup_addresses
```

### Option 2: Enable Auto-Deploy

1. Log into https://dashboard.render.com
2. Go to service settings
3. Find "Auto-Deploy" setting
4. Ensure it's set to "Yes" for branch "main"
5. Trigger a new commit (any change) to test

### Option 3: Wait (Not Recommended)

Render free tier can take 30 minutes to 24 hours to deploy during peak times or maintenance. The system will work automatically whenever deployment completes, but this is unpredictable.

## Device Current Display

The e-ink display is showing the **Unified Setup Screen**:

```
┌────────────────────────────────────────────────────────────────┐
│ PTV-TRMNL SETUP                                    20:53       │
├─────────────────────┬──────────────────────────────────────────┤
│                     │ DEVICE INFO                              │
│ TO CONFIGURE:       │ ID: 94A990                               │
│                     │ WiFi: Connected                          │
│ Visit admin panel:  │ Server: Registered                       │
│ ptv-trmnl-new.      │                                          │
│ onrender.com/admin  │ SETUP PROGRESS                           │
│                     │ [ ] Addresses                            │
│ Device ID:          │ [ ] Transit API                          │
│ 94A990              │ [ ] Journey Settings                     │
│                     │                                          │
│                     │ Status: Waiting for                      │
│                     │ configuration...                         │
└─────────────────────┴──────────────────────────────────────────┘
```

**Note**: Checkboxes are empty because server hasn't sent setup flags yet.

## Expected Result After Deployment

The display will automatically refresh and show the **Live Dashboard**:

```
┌────────────────────────────────────────────────────────────────┐
│ MELBOURNE CENTRAL             20:54              LEAVE BY 08:51│
├────────────────────────────────┬───────────────────────────────┤
│ TRAMS                          │ TRAINS → PARLIAMENT           │
│ Next: -- min                   │ Next: 3 min                   │
│ Then: -- min                   │ Then: 8 min                   │
│                                │                               │
├────────────────────────────────┴───────────────────────────────┤
│ ⚡ GO DIRECT - NO COFFEE                        Clear 40°     │
└────────────────────────────────────────────────────────────────┘
```

**With real-time** Melbourne Central → Parliament train departure times!

## Monitoring Commands

```bash
# Check if deployed
curl -s 'https://ptv-trmnl-new.onrender.com/api/version' | python3 -m json.tool

# Check device status
python3 /Users/angusbergman/PTV-TRMNL-NEW/firmware/tools/live-monitor.py

# Manual check of setup flags
curl -s 'https://ptv-trmnl-new.onrender.com/api/display' \
  -H 'ID:94A990' -H 'Access-Token:lvivfoczcv9oo8g8br6o5' -H 'FW-Version:5.15' | \
  python3 -m json.tool | grep -A1 setup_
```

## Technical Details

**What Works**:
- ✅ Device hardware
- ✅ Firmware v5.15-NoQR
- ✅ WiFi connection
- ✅ Device registration
- ✅ Server preferences (all flags evaluate to TRUE)
- ✅ Code committed to GitHub
- ✅ Local testing passed

**What's Blocked**:
- ⏳ Render deployment (manual action required)

**Time Invested**: ~3 hours (device recovery + firmware fixes + server implementation)

**Time to Completion**: 2-5 minutes (once manual deploy triggered)

## Next Steps

1. **User Action Required**: Trigger manual deploy in Render dashboard
2. **Automatic**: Device detects setup flags within 20 seconds
3. **Automatic**: Display switches to live dashboard
4. **Automatic**: Shows real-time Melbourne Central → Parliament trains

---

**All technical work is complete. System will be fully operational within 5 minutes of Render deployment.**

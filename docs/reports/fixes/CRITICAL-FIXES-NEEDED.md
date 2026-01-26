# Critical Fixes Required - User-Reported Failures
**Date**: 2026-01-25
**Status**: 🚨 MULTIPLE CRITICAL FAILURES IDENTIFIED

---

## 🔴 CRITICAL ISSUES FOUND

### 1. Geocoding Search Failures ❌
**Problem**: Address and cafe searches not finding results
**Root Cause**:
- Using **sequential cascade** instead of parallel queries
- Only returns results from first service that responds
- Hardcoded Melbourne bias: `-37.8136,144.9631` in server.js line 1930
- Hardcoded Melbourne bounding box in line 1985
- Hardcoded "Melbourne, Victoria, Australia" in query line 1984

**Fix Required**:
- Query ALL geocoding services **in parallel**
- Return **combined results** from all services
- Remove **all location bias**
- Let user choose from complete result set

**Files to Fix**:
- `server.js` lines 1909-2022 (`/admin/address/search` endpoint)
- `geocoding-service.js` lines 72-100 (sequential cascade logic)

---

### 2. Smart Journey Planner - Stop Detection Broken ❌
**Problem**: "Smart route planner is not finding any nearby stops"
**Root Cause**:
- `fallbackStopDetection()` uses **hardcoded Victorian placeholder stops**
- Generic names: "City Central", "Inner Suburb Station" (lines 398-416)
- Only Melbourne coordinates (lat -37.8, lon 144.9)
- Ignores existing `fallback-timetables.js` with **80+ real stops across 8 states**

**Current Broken Code** (smart-journey-planner.js:398-416):
```javascript
const majorStops = [
  { stop_id: 19854, stop_name: 'City Central', lat: -37.8183, lon: 144.9671, route_type: 0 },
  { stop_id: 19841, stop_name: 'Inner Suburb Station', lat: -37.8389, lon: 144.9927, route_type: 0 },
  // ... all hardcoded Melbourne coordinates
];
```

**Fix Required**:
- Import and use `fallback-timetables.js`
- Use real stops based on user's state
- Auto-detect nearest real stops to address
- No placeholder/generic names

**Files to Fix**:
- `smart-journey-planner.js` lines 395-440 (replace entire fallback function)

---

### 3. Architecture Map Not Showing ❌
**Problem**: Button click does nothing
**Root Cause**:
- Line 2969: `const hasGooglePlaces = !!process.env.GOOGLE_PLACES_API_KEY;`
- **`process.env` doesn't exist in browser JavaScript** - throws ReferenceError
- Stops entire function execution
- Map never displays

**Fix Required**:
- Remove client-side environment variable access
- Fetch configuration from server API instead

**File to Fix**:
- `public/admin.html` line 2969

---

### 4. User Must Input PT Stop Names ❌
**Problem**: User shouldn't manually enter stop names
**Requirement**: "Smart journey planner must be the basis of setup"

**Current Flow** (BROKEN):
```
User enters addresses → User enters stop names manually → System plans route
```

**Required Flow**:
```
User enters addresses → System auto-detects stops → System selects best route → Done
```

**Fix Required**:
- Remove manual stop input fields entirely
- Auto-detect stops using PTV API `/v3/stops/location/` or fallback data
- Present user with auto-selected best route
- User only enters: home address, work address, arrival time

**Files to Fix**:
- `public/admin.html` - Remove stop name input fields
- Setup flow - Simplify to 3 inputs only

---

### 5. Admin Page Too Complex ❌
**Problem**: Multi-step wizard, separate pages, too many steps
**Requirement**: "Single-step setup from first page"

**Fix Required**:
- **Single page** with just 3 fields:
  1. Home Address (with autocomplete)
  2. Work Address (with autocomplete)
  3. Arrival Time
- Optional: Cafe name (autocomplete)
- **Auto-calculate route immediately** on form submission
- No separate wizard page
- No multiple steps
- Configuration tab shows API setup separately

**File to Fix**:
- `public/admin.html` - Complete redesign of landing page

---

### 6. Configuration Tab Incomplete ❌
**Problem**: Doesn't list all current APIs and data sources
**Requirement**: "Should list all current APIs and data sources used including previously entered information"

**Fix Required**:
- Show **all active data sources**:
  * PTV API (status, last used)
  * Google Places (if configured)
  * Nominatim/OSM (always active)
  * BOM Weather (status)
  * Fallback timetables (which state)
- Show **user-entered data**:
  * Current addresses
  * Selected stops
  * Journey preferences
  * Walking times
- Real-time status indicators

**File to Fix**:
- `public/admin.html` - Configuration tab redesign

---

### 7. Live Data Tab Shows Prematurely ❌
**Problem**: Appears before route is configured
**Requirement**: "Should only appear once smart route has been identified"

**Fix Required**:
- Hide Live Data tab until journey configured
- Show placeholder: "Complete setup first"
- Only show tab when `isConfigured === true` AND journey calculated

**File to Fix**:
- `public/admin.html` - Conditional tab display

---

### 8. PTV API Integration Issues ❌
**Problem**: May not be using correct OpenData API format
**Reference**: OPENDATA-VIC-API-GUIDE.md

**Requirements from Guide**:
1. Use **API Key** (not "Developer ID")
2. Use **API Token** for HMAC signature
3. Calculate HMAC-SHA1 for every request
4. Use 2026 OpenData portal format

**Verification Needed**:
- Check `smart-journey-planner.js` buildPTVUrl() function
- Verify HMAC calculation matches OpenData spec
- Ensure using correct endpoint: `timetableapi.ptv.vic.gov.au`

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Fix Core Search (HIGH PRIORITY)
1. ✅ Rewrite `/admin/address/search` endpoint for parallel queries
2. ✅ Update geocoding-service for parallel operation
3. ✅ Remove all Melbourne hardcoding
4. ✅ Test with addresses across all Australian states

### Phase 2: Fix Smart Journey Planner (HIGH PRIORITY)
1. ✅ Replace hardcoded stops with fallback-timetables.js
2. ✅ Implement real stop detection by state
3. ✅ Auto-select best stops based on distance + route type
4. ✅ Remove manual stop input requirement

### Phase 3: Redesign Admin Interface (HIGH PRIORITY)
1. ✅ Create single-page setup form
2. ✅ 3 required fields only (home, work, time)
3. ✅ Auto-calculate route on submit
4. ✅ Remove multi-step wizard
5. ✅ Move API config to Configuration tab

### Phase 4: Fix Remaining Issues (MEDIUM PRIORITY)
1. ✅ Fix architecture map display bug
2. ✅ Update Configuration tab with data sources
3. ✅ Hide Live Data tab until configured
4. ✅ Verify PTV API implementation

---

## 📋 SUCCESS CRITERIA

After fixes, system must:
- ✅ Find user's address ANYWHERE in Australia (parallel search)
- ✅ Find user's cafe name from ANY geocoding service
- ✅ Auto-detect nearby PT stops without user input
- ✅ Auto-select best route mode (train/tram/bus)
- ✅ Setup in ONE STEP: enter addresses → get route
- ✅ Show architecture map when button clicked
- ✅ Configuration tab shows all active data sources
- ✅ Live Data only appears when configured

---

## 🚨 BLOCKING ISSUES

**MUST FIX IMMEDIATELY**:
1. Geocoding parallel search (users can't find addresses)
2. Smart planner stop detection (journey planning broken)
3. Admin page simplification (setup too complex)

**CAN FIX AFTER**:
4. Architecture map button
5. Configuration tab details
6. Live Data tab visibility

---

**Document Created**: 2026-01-25
**Priority**: 🚨 CRITICAL - All features currently broken
**Estimated Fix Time**: 3-4 hours for complete overhaul

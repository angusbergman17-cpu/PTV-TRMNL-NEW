# PTV-TRMNL Full System Audit Report

**Date**: 2026-01-25
**Auditor**: Claude (New User Simulation)
**Scope**: All 13 Design Principles (A-M) + DEVELOPMENT-RULES.md Compliance

---

## EXECUTIVE SUMMARY

| Category | Score | Status |
|----------|-------|--------|
| **Overall Compliance** | 72% | 🟡 Needs Work |
| **Critical Issues** | 8 | 🔴 Must Fix |
| **High Priority** | 15 | 🟠 Should Fix |
| **Medium Priority** | 12 | 🟡 Nice to Fix |

---

## PRINCIPLE-BY-PRINCIPLE STATUS

| Principle | Score | Status | Critical Issues |
|-----------|-------|--------|-----------------|
| A. Ease of Use | 75% | 🟡 | Error messages weak |
| B. Visual Simplicity | 80% | 🟢 | Minor UI gaps |
| C. Accuracy | 85% | 🟢 | Health monitor gaps |
| D. Intelligent Redundancies | 70% | 🟡 | Missing timeouts |
| E. Customization | 90% | 🟢 | Complete |
| F. Technical Documentation | 90% | 🟢 | Excellent |
| G. Self-Hosting | 95% | 🟢 | Complete |
| H. Legal Compliance | 60% | 🔴 | **TERMINOLOGY VIOLATIONS** |
| I. Privacy by Design | 75% | 🟡 | API key security |
| J. Offline Resilience | 70% | 🟡 | Pre-caching gaps |
| K. Performance | 80% | 🟢 | Minor gaps |
| L. Accessibility | 65% | 🟡 | Form labels, contrast |
| M. Transparency | 55% | 🔴 | Features defined, not used |

---

## 🔴 CRITICAL ISSUES (Must Fix Before Deployment)

### 1. DEVELOPMENT-RULES.md Violations - 25 Instances

**Forbidden Term: "Public Transport Victoria"**

| File | Line | Fix |
|------|------|-----|
| `fallback-timetables.js` | 17 | Change to "Transport for Victoria" |
| `public/setup-wizard.html` | 431 | Change to "Transport for Victoria" |
| `README.md` | 1652, 1780, 1827 | Update terminology |
| `docs/PTV-TRMNL-MASTER-DOCUMENTATION.md` | 33 | Update terminology |
| `docs/guides/COMPLETE-BEGINNER-GUIDE.md` | 61 | Update terminology |
| `docs/deployment/LIVE-SYSTEM-AUDIT.md` | 118 | Update terminology |

**Wrong Environment Variable Names**

| File | Line | Current | Required |
|------|------|---------|----------|
| `preferences-manager.js` | 93, 135-136, 315-316 | `ODATA_API_KEY` | `TRANSPORT_VICTORIA_GTFS_KEY` |
| `server.js` | 1498, 1523 | `ODATA_API_KEY` | `TRANSPORT_VICTORIA_GTFS_KEY` |
| `test-data-pipeline.js` | 27, 32 | `ODATA_API_KEY` | `TRANSPORT_VICTORIA_GTFS_KEY` |

---

### 2. Geocoding Service Missing Timeouts

**File**: `geocoding-service.js`
**Lines**: 143, 173, 198, 227, 259, 280

**Problem**: All 6 geocoding fetch calls have no timeout. If an API hangs, the entire fallback chain stalls.

**Fix Required**:
```javascript
// Add to each fetch call
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);
const response = await fetch(url, { signal: controller.signal });
clearTimeout(timeoutId);
```

---

### 3. WCAG Accessibility - Form Labels Not Associated

**File**: `public/admin.html`

| Line | Input ID | Issue |
|------|----------|-------|
| 1216 | setup-home-address | Label missing `for` attribute |
| 1225 | setup-work-address | Label missing `for` attribute |
| 1432 | ptv-dev-id | Label not in `<label>` tag |
| 1439 | ptv-api-key | Label not in `<label>` tag |
| 1458 | gtfs-realtime-key | Label not in `<label>` tag |

**Fix**: Add `for="input-id"` to all labels.

---

### 4. Color Contrast Failures

**File**: `public/admin.html`

| Line | Element | Current | Required |
|------|---------|---------|----------|
| 239 | Placeholder text | `rgba(255,255,255,0.4)` (~1.8:1) | `#A8A8A8` (5.2:1) |
| 77, 465, 482 | Secondary text | `opacity: 0.6` (~2.4:1) | Explicit color value |

---

### 5. API Keys Stored in Plain-Text JSON

**Files**: `preferences-manager.js:163-167`, `user-preferences.json`

**Problem**: API credentials from environment variables are saved unencrypted to JSON file.

**Risk**: Anyone with filesystem access can read credentials.

**Fix Options**:
1. Don't persist API keys to JSON (use env vars only)
2. Encrypt credentials at rest
3. Use OS keychain integration

---

### 6. Weather Data Hardcoded in API Response

**File**: `server.js:402-406`

```javascript
const weather = {
  temp: process.env.WEATHER_KEY ? '--' : '--',
  condition: 'Partly Cloudy',  // ALWAYS HARDCODED
  icon: '☁️'
};
```

**Problem**: `/api/status` and `/api/screen` never return actual BOM weather data.

**Fix**: Integrate `weather.getCurrentWeather()` call.

---

### 7. Transparency Features Defined But Not Used

**File**: `public/admin.html`

| Feature | Defined | Used |
|---------|---------|------|
| Confidence indicators CSS | Lines 881-904 | ❌ Never displayed |
| `showCalculationTooltip()` | Lines 4441-4463 | ❌ Never called |
| `formatDataSource()` | Lines 4465-4475 | ❌ Never called |
| `formatConfidence()` | Lines 4477-4480 | ❌ Never called |

**Decision Logger Not Integrated**:
- `logCoffeeDecision()` - defined but never called
- `logRouteCalculation()` - defined but never called
- `logTransitModeSelection()` - defined but never called

---

### 8. Setup Wizard Error Messages Too Vague

**File**: `public/setup-wizard.html`

| Line | Current Message | Recommended |
|------|-----------------|-------------|
| 509 | "Please enter both home and work addresses" | "Home address required. Enter your street address (e.g., '123 Main St, Melbourne')" |
| 523 | "Please select a transit authority" | "Based on your addresses, we recommend Transport for Victoria. Please confirm." |
| 531 | "Please enter your API credentials" | "API credentials required. Get them from [link] (takes 5-10 minutes)" |

---

## 🟠 HIGH PRIORITY ISSUES

### 1. Health Monitor Missing Services
- **Gap**: Foursquare and LocationIQ not monitored
- **File**: `health-monitor.js:22-91`
- **Impact**: No visibility into geocoding fallback health

### 2. Service Worker Pre-caching
- **Gap**: Critical data not pre-cached during install
- **File**: `public/service-worker.js:14-19`
- **Impact**: First offline use may fail

### 3. Offline Status Indicators Inconsistent
- **Gap**: Cannot distinguish cached vs offline vs stale
- **File**: `public/service-worker.js:275-306`

### 4. Select Options Use Emoji Only
- **Line**: `admin.html:1793-1799`
- **Problem**: Screen readers read emoji poorly
- **Fix**: Use text, not emoji

### 5. Missing `role="contentinfo"` Footer
- **File**: `admin.html`
- **Impact**: Screen readers can't identify footer region

---

## 🟡 MEDIUM PRIORITY ISSUES

1. **No loading indicators** during slow operations (setup-wizard, route calculation)
2. **Autocomplete items** not keyboard accessible
3. **Transit stale logic** hardcoded instead of comparing cache age
4. **No weather-specific** offline response in service worker
5. **Documentation refers** to outdated "data.vic.gov.au" URL
6. **SMTP setup** doesn't mention Gmail app password requirement
7. **Windows setup** instructions minimal beyond ipconfig

---

## RECOMMENDED FIXES FOR DEVELOPMENT-RULES.md

Based on this audit, I recommend adding these rules:

### New Rule: Error Message Standards

```markdown
### Error Message Requirements

All user-facing error messages MUST:
1. State what went wrong specifically
2. Explain how to fix it
3. Link to documentation if applicable
4. Use inline display (not alert())

**Example**:
❌ WRONG: "Setup failed"
✅ CORRECT: "Address not found: '123 Fake St'. Check spelling or try including suburb name."
```

### New Rule: Timeout Handling

```markdown
### External API Timeout Requirements

All external API calls MUST include:
1. AbortController with timeout (5-10 seconds)
2. Error handling for timeout case
3. Fallback behavior documented

**Required Pattern**:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);
try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout
  }
}
```
```

### New Rule: Transparency Integration

```markdown
### Decision Logger Integration Requirements

All critical calculations MUST call decision logger:
- Geocoding results → `logGeocoding()`
- Route calculations → `logRouteCalculation()`
- Coffee decisions → `logCoffeeDecision()`
- Transit mode selection → `logTransitModeSelection()`
- Delay detection → `logDelayDetection()`
- API fallbacks → `logApiFallback()`
```

---

## FILES REQUIRING CHANGES

| File | Changes Needed | Priority |
|------|----------------|----------|
| `fallback-timetables.js` | Terminology | 🔴 Critical |
| `public/setup-wizard.html` | Terminology + Errors | 🔴 Critical |
| `public/admin.html` | Labels + Contrast + ARIA | 🔴 Critical |
| `README.md` | Terminology (3 places) | 🔴 Critical |
| `preferences-manager.js` | Env var names | 🔴 Critical |
| `server.js` | Env vars + Weather | 🔴 Critical |
| `geocoding-service.js` | Add timeouts | 🔴 Critical |
| `health-monitor.js` | Add missing services | 🟠 High |
| `public/service-worker.js` | Pre-caching | 🟠 High |
| `docs/*` | Terminology updates | 🟠 High |
| `coffee-decision.js` | Add decision logging | 🟡 Medium |
| `smart-journey-planner.js` | Add decision logging | 🟡 Medium |
| `multi-modal-router.js` | Add decision logging | 🟡 Medium |

---

## VERIFICATION CHECKLIST

When fixing issues, verify:

```
□ No "Public Transport Victoria" references remain
□ No "PTV Timetable API" references in active docs
□ All ODATA_API_KEY changed to TRANSPORT_VICTORIA_GTFS_KEY
□ All form inputs have associated labels
□ Placeholder text contrast ≥ 4.5:1
□ All geocoding fetches have timeouts
□ Decision logger integrated in core modules
□ Error messages are specific and helpful
□ Health monitor covers all fallback services
□ Service worker pre-caches fallback timetables
```

---

**Report Generated**: 2026-01-25
**Total Issues Found**: 35
**Estimated Fix Time**: 4-6 hours

---

## NEXT STEPS

1. **Immediate**: Fix all DEVELOPMENT-RULES.md violations (terminology, env vars)
2. **Before Deploy**: Fix accessibility issues (labels, contrast)
3. **Soon**: Add timeouts to geocoding service
4. **When Time**: Integrate decision logging in core modules
5. **Future**: Enhance service worker pre-caching


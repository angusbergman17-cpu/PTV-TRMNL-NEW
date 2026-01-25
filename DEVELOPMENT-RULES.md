# PTV-TRMNL Development Rules
**MANDATORY COMPLIANCE DOCUMENT**
**Last Updated**: 2026-01-25
**Version**: 2.2.0

---

## 🚨 CRITICAL: First Instance Rules

**These rules MUST be followed at first instance during ALL code development, documentation writing, and system modifications.**

### ⚠️ FIRST ACTION REQUIREMENT

**Before ANY code changes, documentation updates, or new features:**

1. **READ this entire document** (DEVELOPMENT-RULES.md)
2. **CHECK Section 1** (Absolute Prohibitions) - ensure no forbidden terms
3. **CHECK Section 2** (Required Data Sources) - use only approved APIs
4. **CHECK Section 4** (Design Principles) - align with mandatory principles
5. **VERIFY compliance** using Section 15 self-check before committing

### 📝 SELF-AMENDING REQUIREMENT

**If new restrictions or guidance are imposed:**

1. **STOP current work immediately**
2. **UPDATE this document** with new rules
3. **INCREMENT version number** (e.g., 1.0.1 → 1.0.2)
4. **UPDATE "Last Updated" date**
5. **COMMIT with message**: "docs: Update development rules - [description of new restriction]"
6. **RESUME work** only after rules are updated

**This document is self-amending and must reflect ALL current restrictions at all times.**

---

## 1️⃣ ABSOLUTE PROHIBITIONS

### ❌ NEVER Reference Legacy PTV APIs

**FORBIDDEN TERMS** (DO NOT USE):
- "PTV Timetable API v3"
- "PTV API v3"
- "PTV Developer ID"
- "PTV API Token"
- "data.vic.gov.au" (for API credentials)
- Any legacy PTV authentication methods
- HMAC-SHA1 signature authentication
- "Public Transport Victoria API"

**WHY**: The system has migrated to Transport Victoria GTFS Realtime API exclusively. Legacy API references create confusion and are no longer supported.

---

## 2️⃣ REQUIRED DATA SOURCES

### ✅ Victorian Transit Data - ONLY USE:

**CORRECT SOURCE**:
- **Name**: Transport Victoria OpenData API
- **Provider**: Transport for Victoria via OpenData Transport Victoria
- **Portal**: https://opendata.transport.vic.gov.au/
- **Authentication**: API Key + API Token (JWT format)
- **Protocol**: REST API with JWT authentication
- **Coverage**: Melbourne Metro Trains, Trams, Buses, V/Line
- **Documentation**: OpenData Transport Victoria portal

**Environment Variables**:
```bash
ODATA_API_KEY=your_api_key_here
ODATA_TOKEN=your_jwt_token_here
```

**Credential Format** (as of 2026):
- **API Key**: 36-character UUID format (e.g., ce606b90-9ffb-43e8-bcd7-0c2bd0498367)
- **API Token**: JWT format (e.g., eyJ0eXAiOiJKV1Qi...)

**Code References**:
```javascript
// CORRECT:
const apiKey = process.env.ODATA_API_KEY;
const apiToken = process.env.ODATA_TOKEN;

// Use in API calls per OpenData Transport Victoria specifications
```

**Note**: The OpenData Transport Victoria portal provides both an API Key and API Token. Both are required for authentication.

---

## 3️⃣ TERMINOLOGY STANDARDS

### Victorian Transit Authority

**CORRECT NAMES**:
- "Transport for Victoria" (official name)
- "Transport Victoria" (acceptable short form)
- "OpenData Transport Victoria" (for the portal specifically)

**INCORRECT** (DO NOT USE):
- "PTV" (legacy acronym)
- "Public Transport Victoria" (old name)

**Implementation**:
```javascript
// server.js - Transit Authority Names
const authorities = {
  'VIC': 'Transport for Victoria',  // ✅ CORRECT
  // NOT: 'Public Transport Victoria (PTV)' ❌
  'NSW': 'Transport for NSW',
  'QLD': 'TransLink (Queensland)',
  // ... etc
};
```

---

## 4️⃣ DESIGN PRINCIPLES (MANDATORY)

All development must align with these core principles:

### A. Ease of Use
- **One-step setup** wherever possible
- **Auto-detection** over manual configuration
- **Smart defaults** that work for 80% of users
- **Progressive disclosure** (simple first, advanced optional)

### B. Visual & Instructional Simplicity
- **Clean UI at first instance** - no overwhelming options
- **Tooltips and contextual help** for complex features
- **Visual feedback** for all actions (loading, success, error)
- **Consistent design language** across all interfaces

### C. Accuracy from Up-to-Date Sources
- **Multi-source validation** for critical data
- **Confidence scores** for geocoding and stop detection
- **Real-time health monitoring** of all APIs
- **Automatic failover** to backup data sources

### D. Intelligent Redundancies
- **Multiple geocoding services** (Nominatim → Google → Mapbox)
- **Fallback timetables** for all 8 Australian states
- **Cached data** when APIs are unavailable
- **Cross-validation** of critical information

### E. Customization Capability
- **Journey profiles** for different routes/schedules
- **User preferences** persistent across sessions
- **Configurable data sources** (optional API keys)
- **Advanced mode** for power users

### F. Technical Documentation
- **Complete API documentation** for developers
- **Architecture diagrams** showing data flow
- **Code comments** explaining complex logic
- **Developer guides** for extending functionality

### G. Self-Hosting Capability
- **Anyone can deploy** with clear instructions
- **One-command deployment** options (Docker, etc.)
- **Environment-based configuration** (no code changes required)
- **Platform-agnostic** (Render, Railway, VPS, local)

### H. Legal Compliance
- **CC BY-NC 4.0 license** for software
- **Data source attributions** clearly documented
- **Privacy policy** for user data
- **API usage limits** monitored and documented

### I. Privacy by Design
- **User data never leaves their server** by default
- **No analytics/tracking** without explicit opt-in
- **Minimal data collection** (only what's necessary for functionality)
- **Clear data retention policies** documented
- **No third-party data sharing** without user consent
- **Local-first architecture** - data stored on user's infrastructure

### J. Offline Resilience
- **Core functionality works offline** using cached schedules
- **Graceful degradation** with clear indicators when using stale data
- **Automatic sync** when connectivity is restored
- **Local-first data storage** on TRMNL device
- **Cache age indicators** showing data freshness
- **Fallback timetables** for all supported regions

### K. Performance & Efficiency
- **API responses < 500ms** (95th percentile target)
- **Dashboard render < 2 seconds** on standard hardware
- **Efficient caching** to minimize redundant API calls
- **Optimized payload sizes** for slow/metered connections
- **Battery-conscious updates** for device longevity
- **Resource-efficient server** (low memory/CPU footprint)

### L. Accessibility (WCAG Compliance)
- **WCAG 2.1 AA minimum** compliance for all interfaces
- **High contrast ratios** (critical for e-ink displays)
- **Screen reader compatible** admin panel
- **Full keyboard navigation** support
- **No color-only information** encoding (use icons/text too)
- **Readable font sizes** with user scaling support

### M. Transparency & Explainability
- **Show data sources** for each piece of information
- **Explain calculation methodology** (e.g., "Coffee time: 5 min based on peak hours")
- **Decision logs visible** in admin panel
- **Confidence indicators** on predictions and geocoding
- **"How was this calculated?"** tooltips on complex values
- **Audit trail** for system decisions

---

## 5️⃣ CODE STANDARDS

### File Naming & Structure

```
✅ CORRECT:
- transport-victoria-gtfs.js
- victorian-transit-data.js
- gtfs-realtime-parser.js

❌ WRONG:
- ptv-api.js
- ptv-timetable.js
- legacy-api.js
```

### Variable Naming

```javascript
// ✅ CORRECT:
const transportVictoriaKey = process.env.TRANSPORT_VICTORIA_GTFS_KEY;
const gtfsRealtimeUrl = 'https://api.opendata.transport.vic.gov.au/...';
const victorianTransitData = await fetchGtfsRealtime();

// ❌ WRONG:
const ptvKey = process.env.PTV_API_KEY;
const ptvUrl = 'https://timetableapi.ptv.vic.gov.au/...';
const ptvData = await fetchPTV();
```

### Comments & Documentation

```javascript
/**
 * Fetches real-time metro train data from Transport Victoria GTFS Realtime API
 *
 * @source OpenData Transport Victoria
 * @protocol GTFS Realtime (Protocol Buffers)
 * @coverage Melbourne Metro Trains
 * @rateLimit 20-27 calls/minute
 * @cache 30 seconds server-side
 * @see VICTORIA-GTFS-REALTIME-PROTOCOL.md
 */
async function fetchVictorianTransitData(subscriptionKey) {
  // ✅ CORRECT terminology and references
}
```

### Module Export Patterns

**CRITICAL**: Match import style to export type to prevent runtime errors.

```javascript
// ====== SINGLETON MODULES (export instance) ======
// File ends with: export default new ClassName();
// Import as lowercase, do NOT use 'new':

import healthMonitor from './health-monitor.js';  // ✅ CORRECT
healthMonitor.start();

import HealthMonitor from './health-monitor.js';  // ❌ WRONG
const hm = new HealthMonitor();  // Runtime Error!

// ====== CLASS MODULES (export class) ======
// File ends with: export default ClassName;
// Import as PascalCase, use 'new' to instantiate:

import JourneyProfiles from './journey-profiles.js';  // ✅ CORRECT
const profiles = new JourneyProfiles();

import journeyProfiles from './journey-profiles.js';  // ❌ WRONG (confusing)
```

**How to identify export type**:
```bash
# Check what a module exports:
tail -5 ./module-name.js | grep "export default"

# If you see: export default new ClassName();  → Singleton (lowercase import)
# If you see: export default ClassName;        → Class (PascalCase import)
```

### Service Worker Requirements

Service workers MUST be served at root URL path for proper caching scope.

```javascript
// ✅ REQUIRED: Add this route for service workers
app.get('/service-worker.js', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'service-worker.js'));
});

// ❌ WRONG: Relying only on static middleware
// app.use('/admin', express.static('public'));
// This serves SW at /admin/service-worker.js (wrong scope!)
```

**Why**: Service workers can only control pages within their scope. A SW at `/admin/service-worker.js` can only cache `/admin/*` URLs, not the entire app.

### Error Message Standards

**MANDATORY**: All user-facing error messages must be actionable.

```javascript
// ❌ WRONG - Vague, unhelpful errors:
alert('Setup failed');
alert('Please enter both home and work addresses');
showMessage('Calculation failed. Check your configuration.');

// ✅ CORRECT - Specific, actionable errors:
showMessage('error',
  'Home address not found: "123 Fake St". ' +
  'Check spelling or try including suburb name (e.g., "123 Main St, Melbourne").'
);

showMessage('error',
  'API credentials required. Get them from opendata.transport.vic.gov.au ' +
  '(takes 5-10 minutes). See INSTALL.md for step-by-step guide.'
);
```

**Error Message Requirements**:
1. ✅ State WHAT went wrong specifically
2. ✅ Explain HOW to fix it
3. ✅ Link to documentation if applicable
4. ✅ Use inline display (not `alert()`)
5. ❌ NEVER show raw JavaScript error messages to users
6. ❌ NEVER use generic "Something went wrong" messages

### Timeout Handling Requirements

**MANDATORY**: All external API calls must have timeout handling.

```javascript
// ✅ REQUIRED PATTERN for all fetch() calls to external APIs:
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// ❌ WRONG - No timeout, can hang indefinitely:
const response = await fetch('https://api.example.com/data');
```

**Timeout Guidelines**:
| API Type | Recommended Timeout |
|----------|---------------------|
| Geocoding | 5 seconds |
| Transit data | 10 seconds |
| Weather | 10 seconds |
| Health checks | 3 seconds |

### Transparency Integration Requirements

**MANDATORY**: All critical calculations must log decisions for transparency.

```javascript
// ✅ REQUIRED - Log all critical decisions:
if (global.decisionLogger) {
  global.decisionLogger.logGeocoding({
    address: query,
    service: 'nominatim',
    result: { lat, lon },
    confidence: 0.95,
    attempts: 1
  });
}

// Decision logger methods that MUST be called:
// - logGeocoding() - After every geocode attempt
// - logRouteCalculation() - After route calculations
// - logCoffeeDecision() - After coffee time decisions
// - logTransitModeSelection() - When selecting transport mode
// - logDelayDetection() - When detecting service delays
// - logApiFallback() - When falling back to alternate API
```

**Files requiring decision logging**:
- `geocoding-service.js` - All geocoding results
- `coffee-decision.js` - Coffee time calculations
- `route-planner.js` - Route selections
- `smart-journey-planner.js` - Journey calculations
- `multi-modal-router.js` - Mode selection

### Accessibility Requirements

**MANDATORY**: WCAG 2.1 AA compliance for all user interfaces.

```html
<!-- ✅ CORRECT - Labels properly associated -->
<label for="home-address">Home Address</label>
<input type="text" id="home-address" name="home-address"
       aria-describedby="home-address-help">
<span id="home-address-help">Enter your street address</span>

<!-- ❌ WRONG - Label not associated -->
<label>Home Address</label>
<input type="text" id="home-address">

<!-- ❌ WRONG - No label at all -->
<input type="text" placeholder="Home Address">
```

**Accessibility Checklist**:
- [ ] All form inputs have associated `<label for="id">`
- [ ] Color contrast minimum 4.5:1 for normal text
- [ ] Color contrast minimum 3:1 for large text (18px+)
- [ ] No information conveyed by color alone
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible (3px solid outline)
- [ ] ARIA landmarks: `role="main"`, `role="navigation"`, `role="banner"`
- [ ] Skip navigation link at top of page
- [ ] Form errors announced to screen readers (`aria-live="polite"`)

**Common Violations to Avoid**:
```css
/* ❌ WRONG - Insufficient contrast */
.placeholder { color: rgba(255,255,255,0.4); }  /* ~1.8:1 ratio */

/* ✅ CORRECT - Sufficient contrast */
.placeholder { color: #A8A8A8; }  /* 5.2:1 ratio */
```

### API Credential Security

**MANDATORY**: Protect API credentials appropriately.

```javascript
// ✅ CORRECT - Use environment variables only, never persist
const apiKey = process.env.ODATA_API_KEY;
const apiToken = process.env.ODATA_TOKEN;

// ❌ WRONG - Persisting credentials to plain-text JSON
await fs.writeFile('preferences.json', JSON.stringify({
  apiCredentials: {
    key: process.env.ODATA_API_KEY,  // DON'T SAVE THIS
    token: process.env.ODATA_TOKEN   // DON'T SAVE THIS
  }
}));
```

**Security Requirements**:
1. ✅ API keys read from environment variables only
2. ✅ Never persist API keys to JSON/config files
3. ✅ Never log API keys (even partially)
4. ✅ Never expose API keys in client-side code
5. ✅ Use `.env` file (gitignored) for local development
6. ✅ Document required env vars in `.env.example` (without real values)

---

## 6️⃣ ENVIRONMENT VARIABLES

### Required Format

```bash
# ✅ CORRECT .env structure:

# Victorian Transit Data (Optional - from opendata.transport.vic.gov.au)
ODATA_API_KEY=your_api_key_here          # 36-character UUID
ODATA_TOKEN=your_jwt_token_here          # JWT format

# Enhanced Geocoding (Optional)
GOOGLE_PLACES_API_KEY=
MAPBOX_ACCESS_TOKEN=
```

```bash
# ❌ WRONG - DO NOT USE (legacy names):
PTV_USER_ID=
PTV_API_KEY=
PTV_DEV_ID=
ODATA_KEY=                               # Missing underscore - use ODATA_API_KEY
TRANSPORT_VICTORIA_GTFS_KEY=             # Old name - use ODATA_API_KEY + ODATA_TOKEN
```

---

## 7️⃣ DOCUMENTATION STANDARDS

### User-Facing Documentation

**File**: INSTALL.md, README.md, ATTRIBUTION.md

**Requirements**:
- ✅ Reference "Transport for Victoria" or "Transport Victoria"
- ✅ Link to https://opendata.transport.vic.gov.au/
- ✅ Reference VICTORIA-GTFS-REALTIME-PROTOCOL.md
- ✅ Use "subscription key" for authentication
- ❌ NO references to legacy PTV APIs
- ❌ NO links to data.vic.gov.au for API credentials

### Code Comments

**Requirements**:
- ✅ Explain WHY, not just WHAT
- ✅ Reference official documentation sources
- ✅ Include protocol/format information
- ✅ Note rate limits and caching behavior

---

## 8️⃣ API INTEGRATION RULES

### When Adding New Data Sources

**Required Steps**:
1. Document in ATTRIBUTION.md with:
   - Provider name
   - License (CC BY, ODbL, etc.)
   - Terms of use URL
   - Required attribution text
   - Rate limits
2. Add to .env.example with:
   - Clear comments
   - Link to get API key
   - Optional vs required designation
3. Update INSTALL.md with:
   - Setup instructions
   - What the API provides
   - When users should configure it
4. Add health monitoring:
   - Test endpoint on startup
   - Monitor response times
   - Implement automatic failover

### Authentication Patterns

**Victorian Transit**:
```javascript
// ✅ CORRECT: Header-based authentication
const response = await fetch(url, {
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.TRANSPORT_VICTORIA_GTFS_KEY
  }
});
```

**Other Services**:
```javascript
// Nominatim: No authentication required
// Google Places: API key in query string
// Mapbox: Access token in query string
```

---

## 9️⃣ UI/UX MANDATES

### Admin Panel Structure

**Tabs** (in order):
1. 🚀 Setup & Journey
2. 🚊 Live Data
3. ⚙️ Configuration
4. 🧠 System & Support

**Configuration Tab - Victorian Section**:
```html
<!-- ✅ CORRECT -->
<h3>Transport for Victoria - GTFS Realtime</h3>
<p>Real-time metro train trip updates from OpenData Transport Victoria</p>
<input id="transport-victoria-key" type="password" placeholder="Subscription Key">
<button onclick="saveTransportVictoriaKey()">Save</button>
<button onclick="testTransportVictoriaApi()">Test Connection</button>

<!-- ❌ WRONG - DO NOT CREATE -->
<h3>PTV Timetable API v3</h3>
```

### Status Indicators

**Required States**:
- 🟢 Operational (< 500ms response, 100% success)
- 🟡 Degraded (slow or occasional errors)
- 🔴 Down (failing or timing out)
- ⚪ Not Configured (optional services)

---

## 🔟 VERSION CONTROL RULES

### Commit Messages

**Format**:
```
<type>: <description>

<body explaining what changed and why>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types**:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation only
- `refactor:` Code restructuring
- `test:` Test additions
- `chore:` Maintenance tasks

**Examples**:
```bash
# ✅ CORRECT:
git commit -m "feat: Add Transport Victoria GTFS Realtime integration

- Remove legacy PTV Timetable API v3 references
- Implement Protocol Buffers parsing
- Add subscription key authentication
- Update all documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# ❌ WRONG:
git commit -m "update ptv api stuff"
```

---

## 1️⃣1️⃣ TESTING REQUIREMENTS

### Before Any Commit

**Checklist**:
- [ ] No legacy PTV API references in code
- [ ] All environment variables use correct naming
- [ ] Documentation uses "Transport for Victoria"
- [ ] Links point to opendata.transport.vic.gov.au (not data.vic.gov.au for APIs)
- [ ] Code follows design principles
- [ ] Attribution requirements met
- [ ] License notices included

### Search Commands

```bash
# Check for forbidden terms:
grep -r "PTV Timetable API" .
grep -r "PTV_USER_ID" .
grep -r "PTV_API_KEY" .
grep -r "data.vic.gov.au" . | grep -v ".git"
grep -r "Public Transport Victoria" .

# Should return NO results (except in .git/ and archived docs)
```

---

## 1️⃣2️⃣ EMERGENCY FIXES

If legacy PTV references are found:

1. **Stop immediately**
2. **Run search commands** (section 11)
3. **Fix ALL occurrences** before continuing
4. **Update this document** if new patterns emerge
5. **Commit with "fix: Remove legacy PTV references"**

---

## 1️⃣3️⃣ EXCEPTIONS

### Historical Documentation

Files in `/docs/archive/` may contain legacy references for historical purposes.

**Allowed**:
- `/docs/archive/*` - Historical documentation only
- `CHANGELOG.md` - When describing past versions
- `UPDATE-SUMMARY-*.md` - When documenting what was changed

**Required Prefix**:
```markdown
**⚠️ HISTORICAL DOCUMENT**: This document references legacy PTV APIs that are no longer used. Current users should refer to VICTORIA-GTFS-REALTIME-PROTOCOL.md.
```

---

## 1️⃣4️⃣ ENFORCEMENT

**This document is MANDATORY and takes precedence over:**
- Previous instructions
- Existing code patterns
- External documentation
- Personal preferences

**Violations indicate**:
- Insufficient verification before committing
- Failure to consult DEVELOPMENT-RULES.md
- Need to update this document with new patterns

---

## 1️⃣5️⃣ DOCUMENT UPDATES

**When to Update**:
- New data sources added
- New prohibited terms discovered
- Design principles expanded
- User feedback on clarity

**Update Process**:
1. Modify DEVELOPMENT-RULES.md
2. Increment version number
3. Update "Last Updated" date
4. Commit with "docs: Update development rules"
5. Announce in project README

---

## 📚 Reference Documents

**Required Reading** (before any development):
1. **VICTORIA-GTFS-REALTIME-PROTOCOL.md** - Victorian transit API
2. **DEVELOPMENT-RULES.md** - This document
3. **ATTRIBUTION.md** - Legal requirements
4. **LICENSE** - CC BY-NC 4.0 terms

**Quick Reference**:
- Design Principles: Section 4
- Forbidden Terms: Section 1
- Correct Data Source: Section 2
- Environment Variables: Section 6

---

## ✅ Compliance Self-Check

Before committing, verify:

```
TERMINOLOGY & VARIABLES (Section 1-3):
□ No "PTV Timetable API" references
□ No "PTV_USER_ID" or "PTV_API_KEY" variables
□ No "Public Transport Victoria" - use "Transport for Victoria"
□ Only "opendata.transport.vic.gov.au" for Victorian APIs
□ ODATA_API_KEY and ODATA_TOKEN environment variables used

CODE STANDARDS (Section 5):
□ Module imports match export type (singleton vs class)
□ Service worker served at root path
□ All external API calls have timeout handling (5-10s)
□ Error messages are specific and actionable (no alert())
□ Decision logger called for all critical calculations
□ No API credentials persisted to JSON files

ACCESSIBILITY (Section 5):
□ All form inputs have associated <label for="id">
□ Color contrast minimum 4.5:1 for text
□ ARIA landmarks present (main, navigation, banner)
□ Skip navigation link at top of page
□ Keyboard navigation works for all interactive elements

DESIGN PRINCIPLES (Section 4):
□ A. Ease of Use - One-step setup, auto-detection, smart defaults
□ B. Visual Simplicity - Clean UI, tooltips, visual feedback
□ C. Accuracy - Multi-source validation, confidence scores
□ D. Intelligent Redundancies - Multiple sources, fallbacks, caching
□ E. Customization - Profiles, preferences, configurable sources
□ F. Technical Documentation - API docs, architecture, code comments
□ G. Self-Hosting - Clear instructions, one-command deploy, env config
□ H. Legal Compliance - CC BY-NC 4.0, attributions, privacy policy
□ I. Privacy by Design - No tracking, minimal data, local-first
□ J. Offline Resilience - Works offline, graceful degradation, sync
□ K. Performance - <500ms APIs, <2s render, efficient caching
□ L. Accessibility - WCAG 2.1 AA, high contrast, keyboard nav
□ M. Transparency - Show sources, explain calculations, decision logs

DOCUMENTATION (Section 7):
□ Attribution requirements met (ATTRIBUTION.md)
□ License notice included where appropriate
□ Code comments reference correct sources
```

---

**END OF MANDATORY COMPLIANCE DOCUMENT**

**Non-compliance with these rules is not permitted.**
**When in doubt, consult this document first.**

---

**Version**: 2.2.0
**Last Updated**: 2026-01-25
**Maintained By**: Angus Bergman
**License**: CC BY-NC 4.0 (matches project license)

---

## 📋 CHANGELOG

### v2.2.0 (2026-01-25)
- **NEW**: Error Message Standards rule (actionable, specific messages)
- **NEW**: Timeout Handling Requirements (mandatory for all external APIs)
- **NEW**: Transparency Integration Requirements (decision logger usage)
- **NEW**: Accessibility Requirements (WCAG 2.1 AA checklist)
- **NEW**: API Credential Security rule (never persist to JSON)
- Rules added based on comprehensive system audit findings

### v2.1.0 (2026-01-25)
- Added Module Export Patterns rule (prevents singleton/class confusion)
- Added Service Worker Requirements rule (ensures proper caching scope)
- Rules added based on runtime errors found during new user testing

### v2.0.0 (2026-01-25)
- **MAJOR**: Added 5 new design principles (I-M)
  - I. Privacy by Design
  - J. Offline Resilience
  - K. Performance & Efficiency
  - L. Accessibility (WCAG Compliance)
  - M. Transparency & Explainability
- Updated compliance self-check with all 13 principles
- Version bump to 2.0.0 (breaking change in principle count)

### v1.0.2 (2026-01-25)
- Added self-amending requirement
- Fixed terminology inconsistencies

### v1.0.0 (2026-01-25)
- Initial release with 8 core design principles (A-H)

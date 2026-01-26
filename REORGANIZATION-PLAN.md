# Repository Reorganization Plan
**Date**: 2026-01-26
**Status**: PROPOSED → IN PROGRESS

---

## Current Issues

1. **22 JavaScript files** in root directory (hard to navigate)
2. **24 Markdown files** in root directory (documentation scattered)
3. **10 OpenAPI spec files** in root (should be grouped)
4. **Test files** mixed with source code
5. **Configuration files** mixed with everything
6. **No clear separation** of concerns

---

## Proposed Structure

```
/PTV-TRMNL-NEW/
├── src/                          # All source code
│   ├── services/                 # External service integrations
│   │   ├── opendata.js          # Transport Victoria API client
│   │   ├── geocoding-service.js # Multi-tier geocoding
│   │   ├── weather-bom.js       # Bureau of Meteorology
│   │   ├── cafe-busy-detector.js# Google Popular Times
│   │   └── health-monitor.js    # API health monitoring
│   ├── core/                    # Core business logic
│   │   ├── smart-journey-planner.js  # Journey planning engine
│   │   ├── multi-modal-router.js     # Multi-mode routing
│   │   ├── route-planner.js          # Route planning
│   │   ├── coffee-decision.js        # Coffee feasibility
│   │   └── decision-logger.js        # Decision logging
│   ├── data/                    # Data management
│   │   ├── preferences-manager.js    # User preferences
│   │   ├── data-validator.js         # Input validation
│   │   ├── fallback-timetables.js    # Static timetables
│   │   ├── gtfs-static.js            # GTFS static data
│   │   └── data-scraper.js           # Web scraping
│   ├── utils/                   # Utility functions
│   │   ├── transit-authorities.js    # Transit authority configs
│   │   ├── australian-cities.js      # City/state data
│   │   └── config.js                 # Configuration utilities
│   └── server.js                # Main Express server
├── tests/                       # All test files
│   ├── test-opendata-auth.js
│   ├── test-node-fetch.js
│   └── test-data-pipeline.js
├── config/                      # Configuration files
│   ├── api-config.json
│   └── .env.example (move from root)
├── specs/                       # OpenAPI specifications
│   ├── metro-train/
│   │   ├── trip-updates.openapi.json
│   │   ├── vehicle-positions.openapi.json
│   │   └── service-alerts.openapi.json
│   ├── yarra-trams/
│   │   ├── trip-updates.openapi.json
│   │   ├── vehicle-positions.openapi.json
│   │   └── service-alerts.openapi.json
│   ├── metro-bus/
│   │   ├── trip-updates.openapi.json
│   │   └── vehicle-positions.openapi.json
│   ├── vline/
│   │   ├── trip-updates.openapi.json
│   │   └── vehicle-positions.openapi.json
│   └── README.md (move OPENAPI-SPECS-README.md)
├── docs/
│   ├── setup/                   # Setup & installation
│   │   ├── INSTALL.md
│   │   ├── TROUBLESHOOTING-SETUP.md
│   │   └── README.md
│   ├── development/             # Development docs
│   │   ├── DEVELOPMENT-RULES.md
│   │   ├── CONTRIBUTING.md
│   │   ├── SYSTEM-ARCHITECTURE.md
│   │   └── VERSION-MANAGEMENT.md
│   ├── api/                     # API documentation
│   │   ├── VICTORIA-GTFS-REALTIME-PROTOCOL.md
│   │   └── API-REFERENCE.md (from docs/technical/)
│   ├── reports/                 # Session reports & audits
│   │   ├── sessions/
│   │   │   ├── SESSION-SUMMARY-2026-01-25.md
│   │   │   └── SESSION-SUMMARY-2026-01-26.md
│   │   ├── audits/
│   │   │   ├── AUDIT-SUMMARY.md
│   │   │   ├── SYSTEM-AUDIT-REPORT-2026-01-26.md
│   │   │   └── ATTRIBUTION-AUDIT-REPORT.md
│   │   ├── progress/
│   │   │   ├── IMPLEMENTATION-PROGRESS.md
│   │   │   ├── FINAL-COMPLETION-REPORT.md
│   │   │   └── UPDATE-SUMMARY-v2.5.2.md
│   │   └── fixes/
│   │       ├── API-FIX-SUCCESS-SUMMARY.md
│   │       ├── CRITICAL-FIXES-NEEDED.md
│   │       └── FIXES-IMPLEMENTED-AUDIT.md
│   ├── guides/                  # User guides (keep existing)
│   ├── deployment/              # Deployment guides (keep existing)
│   ├── technical/               # Technical docs (keep existing)
│   └── archive/                 # Archived docs (keep existing)
├── public/                      # Frontend files (keep as is)
├── data/                        # Runtime data (keep as is)
├── firmware/                    # TRMNL firmware (keep as is)
├── scripts/                     # Utility scripts (NEW)
│   └── setup.sh (if needed)
├── .github/                     # GitHub workflows (future)
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── LICENSE
├── LICENSE.txt
├── README.md
├── ATTRIBUTION.md
├── DOCUMENTATION-INDEX.md
├── TESTING-STATUS.md
└── SYSTEM-READY-SUMMARY.md
```

---

## File Migrations

### Source Code (22 files → src/)

**src/services/** (5 files):
- opendata.js
- geocoding-service.js
- weather-bom.js
- cafe-busy-detector.js
- health-monitor.js

**src/core/** (5 files):
- smart-journey-planner.js
- multi-modal-router.js
- route-planner.js
- coffee-decision.js
- decision-logger.js

**src/data/** (5 files):
- preferences-manager.js
- data-validator.js
- fallback-timetables.js
- gtfs-static.js
- data-scraper.js

**src/utils/** (3 files):
- transit-authorities.js
- australian-cities.js
- config.js

**src/** (1 file - stays in src root):
- server.js

**tests/** (3 files):
- test-opendata-auth.js
- test-node-fetch.js
- test-data-pipeline.js

**config/** (1 file):
- api-config.json

---

### Documentation (24 files → docs/)

**docs/setup/** (2 files):
- INSTALL.md
- TROUBLESHOOTING-SETUP.md

**docs/development/** (4 files):
- DEVELOPMENT-RULES.md
- CONTRIBUTING.md
- SYSTEM-ARCHITECTURE.md
- VERSION-MANAGEMENT.md

**docs/api/** (1 file):
- VICTORIA-GTFS-REALTIME-PROTOCOL.md

**docs/reports/sessions/** (2 files):
- SESSION-SUMMARY-2026-01-25.md
- SESSION-SUMMARY-2026-01-26.md

**docs/reports/audits/** (3 files):
- AUDIT-SUMMARY.md
- SYSTEM-AUDIT-REPORT-2026-01-26.md
- ATTRIBUTION-AUDIT-REPORT.md

**docs/reports/progress/** (3 files):
- IMPLEMENTATION-PROGRESS.md
- FINAL-COMPLETION-REPORT.md
- UPDATE-SUMMARY-v2.5.2.md

**docs/reports/fixes/** (3 files):
- API-FIX-SUCCESS-SUMMARY.md
- CRITICAL-FIXES-NEEDED.md
- FIXES-IMPLEMENTED-AUDIT.md

**Root (keep)** (6 files):
- README.md
- ATTRIBUTION.md
- DOCUMENTATION-INDEX.md
- TESTING-STATUS.md
- SYSTEM-READY-SUMMARY.md
- LICENSE / LICENSE.txt

---

### OpenAPI Specs (10 files → specs/)

**specs/metro-train/**:
- _published_public_transport_gtfs_realtime_gtfsr_metro_train_trip_updates.openapi.json
- _published_public_transport_gtfs_realtime_gtfsr_metro_train_vehicle_positions.openapi.json
- _published_public_transport_gtfs_realtime_gtfsr_metro_train_service_alerts.openapi.json

**specs/yarra-trams/**:
- _published_public_transport_gtfs_realtime_gtfsr_yarra_trams_trip_updates.openapi.json
- _published_public_transport_gtfs_realtime_gtfsr_yarra_trams_vehicle_positions.openapi.json
- _published_public_transport_gtfs_realtime_gtfsr_yarra_trams_service_alerts.openapi.json

**specs/metro-bus/**:
- _published_public_transport_gtfs_realtime_gtfsr_metro_bus_trip_updates.openapi.json
- _published_public_transport_gtfs_realtime_gtfsr_metro_bus_vehicle_positions.openapi.json

**specs/vline/**:
- _published_public_transport_gtfs_realtime_gtfsr_vline_trip_updates.openapi.json
- _published_public_transport_gtfs_realtime_gtfsr_vline_vehicle_positions.openapi.json

---

## Code Changes Required

### 1. Update Import Statements

**In server.js:**
```javascript
// OLD:
import PreferencesManager from './preferences-manager.js';
import { getSnapshot } from './opendata.js';

// NEW:
import PreferencesManager from './data/preferences-manager.js';
import { getSnapshot } from './services/opendata.js';
```

**In all service files:**
- Update relative imports
- Update config.js references

### 2. Update package.json

```json
{
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "node tests/test-opendata-auth.js"
  }
}
```

### 3. Update Dockerfile

```dockerfile
# OLD:
COPY *.js ./
COPY public ./public

# NEW:
COPY src ./src
COPY tests ./tests
COPY config ./config
COPY public ./public
COPY package*.json ./
```

### 4. Update docker-compose.yml

No changes needed (uses Dockerfile)

---

## Documentation Updates Required

### 1. README.md
- Update all documentation links to new paths
- Update Getting Started section
- Update file structure diagram

### 2. DOCUMENTATION-INDEX.md
- Update all file paths
- Reorganize sections to match new structure

### 3. DEVELOPMENT-RULES.md
- Update file naming examples
- Update import path examples

### 4. INSTALL.md
- Update references to source files
- Update npm start command

### 5. CONTRIBUTING.md
- Update project structure section
- Update file organization guidelines

---

## Migration Steps

1. ✅ Create new directory structure
2. ✅ Move source files to src/
3. ✅ Move test files to tests/
4. ✅ Move config files to config/
5. ✅ Move OpenAPI specs to specs/
6. ✅ Move documentation to docs/
7. ✅ Update all import statements in code
8. ✅ Update package.json
9. ✅ Update Dockerfile
10. ✅ Update README.md
11. ✅ Update DOCUMENTATION-INDEX.md
12. ✅ Update other documentation
13. ✅ Test server startup
14. ✅ Test API endpoints
15. ✅ Commit changes
16. ✅ Push to remote

---

## Risk Mitigation

1. **Create backup branch** before starting
2. **Test after each major move** (services, core, data)
3. **Keep original files** until testing complete
4. **Update documentation** immediately after moves
5. **Test Docker build** before committing

---

## Benefits

✅ **Better Organization**: Clear separation of concerns
✅ **Easier Navigation**: Related files grouped together
✅ **Improved Maintainability**: Easy to find and update files
✅ **Cleaner Root**: Only essential files in root
✅ **Standard Structure**: Follows Node.js best practices
✅ **Better IDE Support**: Standard src/ structure
✅ **Easier Onboarding**: New developers can navigate easily
✅ **Future-Proof**: Ready for growth and scaling

---

## Timeline

**Estimated Time**: 2-3 hours
**Complexity**: HIGH (many file moves + import updates)
**Risk Level**: MEDIUM (breaking changes if imports wrong)

---

**Status**: Ready to begin implementation
**Next Step**: Create directory structure and begin file migrations

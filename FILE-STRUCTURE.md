# PTV-TRMNL File Structure

**Last Updated**: 2026-01-26
**Version**: 2.5.2 (Reorganized)

---

## 📁 Directory Organization

```
/PTV-TRMNL-NEW/
├── src/                          # All source code
│   ├── services/                 # External service integrations
│   │   ├── opendata.js          # Transport Victoria GTFS Realtime API
│   │   ├── geocoding-service.js # Multi-tier geocoding (Nominatim→Google→Mapbox)
│   │   ├── weather-bom.js       # Bureau of Meteorology weather data
│   │   ├── cafe-busy-detector.js# Google Popular Times integration
│   │   └── health-monitor.js    # API health monitoring (5-minute intervals)
│   ├── core/                    # Core business logic
│   │   ├── smart-journey-planner.js  # Automatic journey planning
│   │   ├── multi-modal-router.js     # Multi-mode transit routing
│   │   ├── route-planner.js          # Route calculation engine
│   │   ├── coffee-decision.js        # Coffee stop feasibility logic
│   │   └── decision-logger.js        # Decision transparency logging
│   ├── data/                    # Data management layer
│   │   ├── preferences-manager.js    # User preferences & profiles
│   │   ├── data-validator.js         # Input validation & confidence scores
│   │   ├── fallback-timetables.js    # Static fallback data (80+ stops)
│   │   ├── gtfs-static.js            # GTFS static data handling
│   │   └── data-scraper.js           # Web data scraping utilities
│   ├── utils/                   # Utility functions
│   │   ├── transit-authorities.js    # Transit authority configurations
│   │   ├── australian-cities.js      # Australian city/state data
│   │   └── config.js                 # Configuration utilities
│   └── server.js                # Main Express server (API & web server)
├── tests/                       # Test suite
│   ├── test-opendata-auth.js   # Transport Victoria API authentication tests
│   ├── test-node-fetch.js      # HTTP client tests
│   └── test-data-pipeline.js   # Data pipeline integration tests
├── config/                      # Configuration files
│   └── api-config.json         # API endpoint configurations
├── specs/                       # OpenAPI specifications
│   ├── metro-train/            # Metro Train GTFS specs
│   │   ├── trip-updates.openapi.json
│   │   ├── vehicle-positions.openapi.json
│   │   └── service-alerts.openapi.json
│   ├── yarra-trams/            # Yarra Trams GTFS specs
│   │   ├── trip-updates.openapi.json
│   │   ├── vehicle-positions.openapi.json
│   │   └── service-alerts.openapi.json
│   ├── metro-bus/              # Metro Bus GTFS specs
│   │   ├── trip-updates.openapi.json
│   │   └── vehicle-positions.openapi.json
│   ├── vline/                  # V/Line GTFS specs
│   │   ├── trip-updates.openapi.json
│   │   └── vehicle-positions.openapi.json
│   └── README.md               # OpenAPI specifications guide
├── docs/                        # Documentation
│   ├── setup/                  # Setup & installation guides
│   │   ├── INSTALL.md
│   │   └── TROUBLESHOOTING-SETUP.md
│   ├── development/            # Development documentation
│   │   ├── DEVELOPMENT-RULES.md (v1.0.6) - Mandatory compliance
│   │   ├── CONTRIBUTING.md          - Contribution guidelines
│   │   ├── SYSTEM-ARCHITECTURE.md   - System architecture
│   │   └── VERSION-MANAGEMENT.md    - Version control
│   ├── api/                    # API documentation
│   │   └── VICTORIA-GTFS-REALTIME-PROTOCOL.md
│   ├── reports/                # Session reports & audits
│   │   ├── sessions/          # Development session summaries
│   │   │   ├── SESSION-SUMMARY-2026-01-25.md
│   │   │   └── SESSION-SUMMARY-2026-01-26.md
│   │   ├── audits/            # System compliance audits
│   │   │   ├── AUDIT-SUMMARY.md
│   │   │   ├── SYSTEM-AUDIT-REPORT-2026-01-26.md
│   │   │   └── ATTRIBUTION-AUDIT-REPORT.md
│   │   ├── progress/          # Implementation progress reports
│   │   │   ├── IMPLEMENTATION-PROGRESS.md
│   │   │   ├── FINAL-COMPLETION-REPORT.md
│   │   │   └── UPDATE-SUMMARY-v2.5.2.md
│   │   └── fixes/             # Bug fix documentation
│   │       ├── API-FIX-SUCCESS-SUMMARY.md
│   │       ├── CRITICAL-FIXES-NEEDED.md
│   │       └── FIXES-IMPLEMENTED-AUDIT.md
│   ├── guides/                 # User guides (existing)
│   ├── deployment/             # Deployment guides (existing)
│   ├── technical/              # Technical documentation (existing)
│   └── archive/                # Archived documentation (existing)
├── public/                      # Frontend web interface
│   └── admin.html              # Admin panel (single-page app)
├── data/                        # Runtime data (persistent)
│   └── gtfs/                   # GTFS static data cache
├── firmware/                    # TRMNL device firmware (Arduino/ESP32)
│   ├── src/                    # Firmware source code
│   ├── include/                # Headers & configuration
│   └── .pio/                   # PlatformIO build artifacts
├── .dockerignore
├── .gitignore
├── Dockerfile                   # Docker container definition
├── docker-compose.yml          # Docker Compose configuration
├── package.json                # Node.js dependencies & scripts
├── package-lock.json           # Locked dependency versions
├── .env.example                # Environment variable template
├── LICENSE                     # CC BY-NC 4.0 license
├── README.md                   # Project overview & quick start
├── ATTRIBUTION.md              # Data source attributions (12 sources)
├── DOCUMENTATION-INDEX.md      # Complete documentation index
├── FILE-STRUCTURE.md           # This file
├── TESTING-STATUS.md           # Testing documentation
└── SYSTEM-READY-SUMMARY.md    # Production readiness summary
```

---

## 🗂️ Source Code Organization

### Services Layer (`src/services/`)
**Purpose**: External API integrations and service clients

- **opendata.js**: Transport Victoria GTFS Realtime API client
  - Protobuf decoding (gtfs-realtime-bindings)
  - KeyId header authentication
  - Metro train, tram, bus, V/Line support

- **geocoding-service.js**: Multi-tier address geocoding
  - Tier 1: Nominatim (OpenStreetMap)
  - Tier 2: Google Places API
  - Tier 3: Mapbox Geocoding
  - Confidence scoring (0-100%)

- **weather-bom.js**: Bureau of Meteorology integration
  - Current weather conditions
  - Temperature, description, icon
  - Melbourne weather station data

- **cafe-busy-detector.js**: Cafe busyness detection
  - Google Popular Times integration
  - Real-time cafe wait estimates
  - Adjusts coffee stop timing

- **health-monitor.js**: API health monitoring
  - 5-minute health check intervals
  - Response time tracking
  - 24-hour history retention
  - Uptime percentage calculation

### Core Logic (`src/core/`)
**Purpose**: Business logic and journey planning algorithms

- **smart-journey-planner.js**: Intelligent journey planning
  - Automatic geocoding
  - Stop finding (nearest transit stops)
  - Route selection
  - Timing calculations

- **multi-modal-router.js**: Multi-mode transit routing
  - Supports 1 or 2 transit modes
  - Walking time calculations
  - Transfer planning
  - Schedule-aware routing

- **route-planner.js**: Route calculation engine
  - Home → Coffee → Work routing
  - Real-time departure integration
  - Walking speed: 80m/min (4.8 km/h)
  - Safety buffer: 2 minutes

- **coffee-decision.js**: Coffee feasibility logic
  - Calculates if there's time for coffee
  - Integrates cafe busyness
  - Base coffee time: 3 minutes
  - Dynamic adjustment based on queue

- **decision-logger.js**: Decision transparency
  - Logs all major decisions
  - "Why did I tell you to leave at X time?"
  - Full audit trail for troubleshooting

### Data Layer (`src/data/`)
**Purpose**: Data persistence and validation

- **preferences-manager.js**: User preferences management
  - Journey profiles (10+ profiles supported)
  - Schedule-based activation
  - JSON file persistence
  - Deep merge updates

- **data-validator.js**: Input validation
  - Address validation
  - Confidence scoring
  - Cross-reference validation
  - Error reporting

- **fallback-timetables.js**: Static fallback data
  - 80+ Melbourne transit stops
  - Works when APIs offline
  - Cached timetables
  - State-agnostic design

- **gtfs-static.js**: GTFS static data
  - Stop information
  - Route information
  - Station coordinates

- **data-scraper.js**: Web scraping utilities
  - Cafe data extraction
  - Popular times scraping
  - Real-time data fallbacks

### Utilities (`src/utils/`)
**Purpose**: Shared utility functions

- **transit-authorities.js**: Transit authority configs
  - All 8 Australian states/territories
  - API endpoints per authority
  - State detection logic

- **australian-cities.js**: Australian geography
  - Primary cities per state
  - State abbreviations
  - Transit mode availability

- **config.js**: Configuration utilities
  - Environment variable loading
  - Config validation
  - Default values

---

## 📄 Documentation Organization

### Setup Guides (`docs/setup/`)
- **INSTALL.md**: Complete installation guide
- **TROUBLESHOOTING-SETUP.md**: Common setup issues

### Development (`docs/development/`)
- **DEVELOPMENT-RULES.md** (v1.0.6): Mandatory compliance rules
- **CONTRIBUTING.md**: Contribution guidelines
- **SYSTEM-ARCHITECTURE.md**: Architecture documentation
- **VERSION-MANAGEMENT.md**: Version control strategy

### API Documentation (`docs/api/`)
- **VICTORIA-GTFS-REALTIME-PROTOCOL.md**: Transport Victoria API guide

### Reports (`docs/reports/`)
- **sessions/**: Development session summaries (by date)
- **audits/**: System compliance audits
- **progress/**: Implementation milestone reports
- **fixes/**: Bug fix documentation

---

## 🔧 Configuration Files

### `config/api-config.json`
API endpoint configurations for all transit authorities.

### `.env` (not committed)
Environment variables:
- `ODATA_API_KEY`: Transport Victoria API key (UUID format)
- `GOOGLE_PLACES_API_KEY`: Google Places API key (optional)
- `MAPBOX_ACCESS_TOKEN`: Mapbox token (optional)

### `package.json`
Node.js project configuration:
- **Main**: `src/server.js`
- **Scripts**:
  - `npm start`: Production server
  - `npm run dev`: Development with nodemon
  - `npm test`: Run authentication tests

---

## 🐳 Docker Files

### `Dockerfile`
- Base: Node.js 20 Alpine (~150MB)
- Health checks every 30 seconds
- Non-root user for security
- Production-optimized

### `docker-compose.yml`
- One-command deployment: `docker-compose up -d`
- Volume persistence for data
- Auto-restart on failure
- Environment variable configuration

---

## 🗄️ Runtime Data

### `data/` Directory
- **gtfs/**: GTFS static data cache
- Persistent across restarts
- Auto-populated on first run

### Root Data Files
- **devices.json**: Registered TRMNL devices
- **user-preferences.json**: User preferences & profiles

---

## 📋 Testing

### `tests/` Directory
- **test-opendata-auth.js**: API authentication verification
- **test-node-fetch.js**: HTTP client functionality
- **test-data-pipeline.js**: End-to-end data flow tests

Run tests:
```bash
npm test
```

---

## 🚀 Quick Reference

### Start Server
```bash
npm start                    # Production
npm run dev                  # Development (with nodemon)
```

### Run Tests
```bash
npm test                     # Run test suite
node tests/test-opendata-auth.js  # Test API authentication
```

### Docker Deployment
```bash
docker-compose up -d         # Start in background
docker-compose logs -f       # View logs
docker-compose down          # Stop
```

### File Locations
- **Main Server**: `src/server.js`
- **Admin Panel**: `public/admin.html`
- **User Preferences**: `user-preferences.json` (root)
- **Environment Config**: `.env` (root, not committed)
- **Documentation Index**: `DOCUMENTATION-INDEX.md` (root)

---

## 📊 File Statistics

### Code
- **JavaScript Files**: 22 files (~10,000 lines)
- **Source Files**: 18 files in `src/`
- **Test Files**: 3 files in `tests/`
- **Frontend**: 1 single-page app (admin.html)

### Documentation
- **Markdown Files**: 24+ files (~5,000+ lines)
- **Setup Guides**: 2 files
- **Development Docs**: 4 files
- **Reports**: 14+ files

### Configuration
- **OpenAPI Specs**: 10 files (organized by transit mode)
- **Config Files**: 2 files (package.json, api-config.json)
- **Docker Files**: 2 files (Dockerfile, docker-compose.yml)

---

## 🔄 Recent Changes (2026-01-26)

**Reorganization**: Complete repository restructure for better maintainability.

**Before**:
- 22 JavaScript files in root
- 24 Markdown files in root
- 10 OpenAPI specs in root
- Tests mixed with source code

**After**:
- `src/` directory with logical subdirectories
- `docs/` organized by purpose
- `specs/` organized by transit mode
- `tests/` separate directory
- Clean root directory

**Benefits**:
- ✅ Easier navigation
- ✅ Better IDE support
- ✅ Clear separation of concerns
- ✅ Standard Node.js structure
- ✅ Future-proof for scaling

---

**Version**: 2.5.2 (Reorganized)
**Last Updated**: 2026-01-26
**License**: CC BY-NC 4.0

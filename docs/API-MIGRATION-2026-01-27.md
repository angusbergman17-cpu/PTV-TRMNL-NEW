# PTV OpenData API Migration - 2026-01-27

## Critical Change

Transport Victoria has migrated their GTFS-Realtime API to a new endpoint structure.

### Old Endpoints (DEPRECATED - Return 404)
```
https://opendata.transport.vic.gov.au/gtfsr/metrotrain-tripupdates
https://opendata.transport.vic.gov.au/gtfsr/metrotrain-vehiclepositions
https://opendata.transport.vic.gov.au/gtfsr/metrotrain-servicealerts
```

### New Endpoints (ACTIVE)
```
https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates
https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/vehicle-positions
https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/service-alerts
```

### Mode-Specific Base URLs
| Mode | Base URL |
|------|----------|
| Metro Train | `.../v1/metro/` |
| Tram | `.../v1/tram/` |
| Bus | `.../v1/bus/` |
| V/Line | `.../v1/vline/` |

### Authentication
- Header: `KeyId: <your-api-key>`
- API Key format: UUID (e.g., `ce606b90-9ffb-43e8-bcd7-0c2bd0498367`)
- Rate limit: 24 calls per 60 seconds per mode

### Files Updated
- `src/services/opendata.js` - Hardcoded new endpoints
- `src/data/data-scraper.js` - Removed legacy base URL parameters
- `src/utils/config.js` - Updated feed URLs (reference only)

### Testing
```bash
curl -s "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates" \
  -H "KeyId: YOUR_API_KEY" | file -
# Should return: /dev/stdin: data (protobuf binary)
```

---
Documented by Lobby (AI) - 2026-01-27

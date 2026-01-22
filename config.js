// config.js
// PTV-TRMNL Configuration
//
// API Source: Transport Victoria Open Data
// Documentation: https://opendata.transport.vic.gov.au/dataset/gtfs-realtime

export default {
  // ========================================
  // Station Configuration
  // ========================================
  stations: {
    southYarra: {
      name: "South Yarra",
      // Dynamic platform detection - no hardcoded platform
      // Platform determined from live GTFS data
    }
  },

  // ========================================
  // Tram Configuration - Route 58
  // ========================================
  trams: {
    route58: {
      routeId: "3-58-",  // GTFS route_id pattern for Route 58
      tivoliRoad: {
        stopId: "2719",  // Tivoli Rd/Toorak Rd stop_id (city-bound)
        stopName: "Tivoli Rd/Toorak Rd"
      }
    }
  },

  // ========================================
  // City-bound Target Stations
  // Trains heading to these stations are considered city-bound
  // ========================================
  cityBoundTargetStopNames: [
    "Parliament",
    "Melbourne Central",
    "Flagstaff",
    "Southern Cross",
    "Flinders Street"
  ],

  // ========================================
  // Transport Victoria Open Data API
  // ========================================
  feeds: {
    metro: {
      base: "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro",
      tripUpdates: "/trip-updates",
      vehiclePositions: "/vehicle-positions",
      serviceAlerts: "/service-alerts"
    },
    tram: {
      base: "https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/tram",
      tripUpdates: "/trip-updates",
      vehiclePositions: "/vehicle-positions",
      serviceAlerts: "/service-alerts"
    }
  },

  // ========================================
  // API Rate Limits (per Transport Victoria docs)
  // ========================================
  api: {
    // Max 24 calls per minute per feed type
    rateLimitPerMinute: 24,
    // Server-side caching (recommended minimum)
    serverCacheSeconds: 30,
    // Data refresh rates
    refreshRates: {
      metro: "near real-time",
      tram: "60 seconds",
      bus: "near real-time"
    }
  },

  // ========================================
  // Journey Timing (minutes)
  // Used for coffee decision and Route+ planning
  // ========================================
  journey: {
    homeToNorman: 4,      // Home → Norman Cafe
    coffeeTime: 6,        // Time at cafe (order + make)
    normanToTram: 1,      // Norman Cafe → Tivoli Road tram stop
    tramRide: 5,          // Tram ride to South Yarra
    platformChange: 3,    // Walk between tram stop and train platform
    trainRide: 9,         // Train to Parliament
    walkToWork: 6,        // Parliament Station → 80 Collins St
    targetArrival: "09:00" // Target arrival time at work
  },

  // ========================================
  // Cache Settings
  // ========================================
  // Client-side cache (how long to keep data before refreshing)
  // Set to 60s to stay well within rate limits
  cacheSeconds: 60,

  // Background refresh interval
  // Refreshes data in the background every N seconds
  refreshSeconds: 60
}

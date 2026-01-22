export default {
  // South Yarra Station - all platforms (dynamic detection)
  stations: {
    southYarra: {
      name: "South Yarra",
      // No hardcoded platform - use smart scheduling to pick best platform
    }
  },

  // Tram configuration - Route 58 at Tivoli Road
  trams: {
    route58: {
      routeId: "3-58-",  // GTFS route_id pattern for Route 58
      tivoliRoad: {
        stopId: "2719",  // Tivoli Rd/Toorak Rd stop_id (city-bound)
        stopName: "Tivoli Rd/Toorak Rd"
      }
    }
  },

  // "City-bound" targets - trains heading to CBD
  cityBoundTargetStopNames: [
    "Parliament",
    "Melbourne Central",
    "Flagstaff",
    "Southern Cross",
    "Flinders Street"
  ],

  // Open Data GTFS-R feed bases (single key ODATA_KEY)
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

  // Timing for journey planning (minutes)
  journey: {
    homeToNorman: 4,      // Home → Norman Cafe
    coffeeTime: 6,        // Making coffee
    normanToTram: 1,      // Norman Cafe → Tivoli Road
    tramRide: 5,          // Tram to South Yarra
    platformChange: 3,    // Walk between platforms
    trainRide: 9,         // Train to Parliament
    walkToWork: 6,        // Parliament → 80 Collins St
    targetArrival: "09:00" // Target arrival time
  },

  cacheSeconds: 60,
  refreshSeconds: 60
}

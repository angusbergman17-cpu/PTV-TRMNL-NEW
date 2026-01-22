// data-scraper.js
// Smart scheduling: aligns Route 58 trams with city-bound trains at South Yarra
// Includes dynamic platform detection and optimal journey planning

import dayjs from "dayjs";
import config from "./config.js";
import {
  getMetroTripUpdates,
  getMetroServiceAlerts,
  getTramTripUpdates,
  getTramServiceAlerts,
  connectionStatus
} from "./opendata.js";

// Re-export connection status for diagnostics
export { connectionStatus };
import { tryLoadStops, resolveSouthYarraIds, buildTargetStopIdSet } from "./gtfs-static.js";

// In-memory cache
const mem = {
  cacheUntil: 0,
  snapshot: null,
  gtfs: null,
  ids: null,
  targetStopIdSet: null,
  tramStopIds: null
};

function nowMs() { return Date.now(); }

/**
 * Extract numeric epoch (ms) for a stop_time_update
 */
function timeFromStu(stu) {
  const sec = Number(stu?.departure?.time || stu?.arrival?.time || 0);
  return sec ? sec * 1000 : 0;
}

/**
 * Check if trip will call at any target CBD stops after current stop
 */
function isCityBoundTrip(tripUpdate, targetStopIds, currentStopId, currentSeq) {
  if (!tripUpdate?.stop_time_update?.length) return false;

  const seq = currentSeq ?? (() => {
    const idx = tripUpdate.stop_time_update.findIndex(s => s.stop_id === currentStopId);
    return idx >= 0 ? Number(tripUpdate.stop_time_update[idx].stop_sequence ?? idx) : 0;
  })();

  return tripUpdate.stop_time_update.some(su => {
    const suSeq = Number(su.stop_sequence ?? 0);
    const isDownstream = !Number.isNaN(suSeq) ? suSeq > seq : true;
    return isDownstream && targetStopIds.has(su.stop_id);
  });
}

/**
 * Get platform code from stop_id using GTFS data
 */
function getPlatformCode(stopId, gtfs) {
  if (!gtfs?.stops?.length) return null;
  const stop = gtfs.stops.find(s => s.stop_id === stopId);
  return stop?.platform_code || null;
}

/**
 * Check if this is a Route 58 tram
 */
function isRoute58(routeId) {
  if (!routeId) return false;
  // Route 58 has various ID formats: "3-58-", "58", etc.
  return routeId.includes('58') || routeId === '58';
}

/**
 * Build set of Tivoli Road stop IDs from GTFS
 */
function buildTramStopIds(gtfs, config) {
  const set = new Set();

  // Add configured stop ID
  const tivoliId = config?.trams?.route58?.tivoliRoad?.stopId;
  if (tivoliId) set.add(tivoliId);

  // Also search by name in GTFS
  if (gtfs?.stops?.length) {
    for (const stop of gtfs.stops) {
      const name = (stop.stop_name || "").toLowerCase();
      if (name.includes('tivoli') && name.includes('toorak')) {
        set.add(stop.stop_id);
      }
    }
  }

  return set;
}

/**
 * Find optimal tram-train pairs for smart scheduling
 * Returns trams with their connecting trains
 */
function findOptimalConnections(trams, trains, journey) {
  const connections = [];
  const tramRide = journey?.tramRide || 5;
  const platformChange = journey?.platformChange || 3;

  for (const tram of trams) {
    // When does this tram arrive at South Yarra?
    const tramArrivalMs = tram.when + (tramRide * 60 * 1000);

    // What's the earliest train we can catch? (need platformChange minutes buffer)
    const minTrainTime = tramArrivalMs + (platformChange * 60 * 1000);

    // Find connecting trains
    const connectingTrains = trains.filter(train => train.when >= minTrainTime);
    const bestTrain = connectingTrains[0] || null;

    if (bestTrain) {
      const waitTime = Math.round((bestTrain.when - tramArrivalMs) / 60000);
      connections.push({
        tram,
        train: bestTrain,
        waitTime,
        totalTime: Math.round((bestTrain.when - tram.when) / 60000) + (journey?.trainRide || 9)
      });
    }
  }

  // Sort by total journey time
  return connections.sort((a, b) => a.totalTime - b.totalTime);
}

/**
 * Get header timestamp from GTFS-R feed
 */
function headerTs(feed) {
  return (feed?.header?.timestamp ? Number(feed.header.timestamp) * 1000 : 0);
}

/**
 * Main snapshot builder with smart scheduling
 */
export async function getSnapshot(apiKey) {
  const now = nowMs();
  if (mem.snapshot && now < mem.cacheUntil) return mem.snapshot;

  // Load static GTFS
  if (!mem.gtfs) mem.gtfs = tryLoadStops();

  // Resolve South Yarra platform IDs
  if (!mem.ids) mem.ids = resolveSouthYarraIds(config, mem.gtfs);

  // Build CBD target stop IDs
  if (!mem.targetStopIdSet) {
    mem.targetStopIdSet = buildTargetStopIdSet(mem.gtfs, config.cityBoundTargetStopNames || []);
  }

  // Build tram stop IDs for Tivoli Road
  if (!mem.tramStopIds) {
    mem.tramStopIds = buildTramStopIds(mem.gtfs, config);
  }

  const snapshotBase = {
    meta: { generatedAt: new Date().toISOString(), sources: {} },
    trains: [],
    trams: [],
    connections: [],  // Smart tram-train connections
    alerts: { metro: 0, tram: 0 },
    notes: {
      platformResolution: {
        usedStaticGtfs: !!(mem.gtfs?.stops?.length),
        southYarra: {
          parentStopId: mem.ids?.parentStopId || null,
          platformCount: mem.ids?.allPlatformStopIds?.length || 0
        },
        tramStops: Array.from(mem.tramStopIds || [])
      }
    }
  };

  if (!apiKey) {
    mem.snapshot = snapshotBase;
    mem.cacheUntil = now + (config.cacheSeconds ? config.cacheSeconds * 1000 : 60000);
    return mem.snapshot;
  }

  // Fetch all GTFS-R feeds in parallel
  const mBase = config.feeds.metro.base;
  const tBase = config.feeds.tram.base;

  const [metroTU, metroSA, tramTU, tramSA] = await Promise.all([
    getMetroTripUpdates(apiKey, mBase).catch(e => (console.warn("Metro TU error:", e.message), null)),
    getMetroServiceAlerts(apiKey, mBase).catch(e => (console.warn("Metro SA error:", e.message), null)),
    getTramTripUpdates(apiKey, tBase).catch(e => (console.warn("Tram TU error:", e.message), null)),
    getTramServiceAlerts(apiKey, tBase).catch(e => (console.warn("Tram SA error:", e.message), null))
  ]);

  snapshotBase.meta.sources = {
    metroTripUpdatesTs: headerTs(metroTU),
    metroServiceAlertsTs: headerTs(metroSA),
    tramTripUpdatesTs: headerTs(tramTU),
    tramServiceAlertsTs: headerTs(tramSA)
  };

  // ==== TRAINS - All city-bound from South Yarra (any platform) ====
  const southYarraPlatformIds = new Set(mem.ids?.allPlatformStopIds || []);

  if (metroTU?.entity?.length) {
    const trainDeps = [];

    for (const ent of metroTU.entity) {
      const tu = ent.trip_update;
      if (!tu?.stop_time_update?.length) continue;

      // Find South Yarra stop in this trip
      const syStu = tu.stop_time_update.find(s => southYarraPlatformIds.has(s.stop_id));
      if (!syStu) continue;

      const when = timeFromStu(syStu);
      if (!when || when < now) continue;

      // City-bound filter
      const cityBound = isCityBoundTrip(
        tu,
        mem.targetStopIdSet,
        syStu.stop_id,
        Number(syStu.stop_sequence ?? 0)
      );
      if (!cityBound) continue;

      // Get platform code dynamically
      const platformCode = getPlatformCode(syStu.stop_id, mem.gtfs);

      trainDeps.push({
        tripId: tu.trip?.trip_id || ent.id,
        routeId: tu.trip?.route_id || null,
        stopId: syStu.stop_id,
        platformCode,
        when,
        delaySec: Number(syStu.departure?.delay || syStu.arrival?.delay || 0)
      });
    }

    // Sort by departure time
    snapshotBase.trains = trainDeps.sort((a, b) => a.when - b.when).slice(0, 12);
  }

  snapshotBase.alerts.metro = metroSA?.entity?.length || 0;

  // ==== TRAMS - Route 58 at Tivoli Road only ====
  if (tramTU?.entity?.length) {
    const tramDeps = [];

    for (const ent of tramTU.entity) {
      const tu = ent.trip_update;
      if (!tu?.stop_time_update?.length) continue;

      // Check if this is Route 58
      const routeId = tu.trip?.route_id || "";
      if (!isRoute58(routeId)) continue;

      // Find Tivoli Road stop in this trip
      const tivoliStu = tu.stop_time_update.find(s => mem.tramStopIds.has(s.stop_id));
      if (!tivoliStu) continue;

      const when = timeFromStu(tivoliStu);
      if (!when || when < now) continue;

      tramDeps.push({
        tripId: tu.trip?.trip_id || ent.id,
        routeId,
        stopId: tivoliStu.stop_id,
        when,
        delaySec: Number(tivoliStu.departure?.delay || tivoliStu.arrival?.delay || 0),
        headsign: tu.trip?.trip_headsign || "West Coburg"
      });
    }

    snapshotBase.trams = tramDeps.sort((a, b) => a.when - b.when).slice(0, 12);
  }

  snapshotBase.alerts.tram = tramSA?.entity?.length || 0;

  // ==== SMART CONNECTIONS - Find optimal tram-train pairs ====
  if (snapshotBase.trams.length > 0 && snapshotBase.trains.length > 0) {
    snapshotBase.connections = findOptimalConnections(
      snapshotBase.trams,
      snapshotBase.trains,
      config.journey
    );
  }

  // Cache snapshot
  mem.snapshot = snapshotBase;
  mem.cacheUntil = now + (config.cacheSeconds ? config.cacheSeconds * 1000 : 60000);
  return mem.snapshot;
}

// opendata.js
// Transport Victoria Open Data GTFS-Realtime Client
//
// API Documentation: https://opendata.transport.vic.gov.au/dataset/gtfs-realtime
//
// ENDPOINTS:
//   Base: https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/{mode}/{feed}
//   Modes: metro (trains), tram, bus
//   Feeds: trip-updates, vehicle-positions, service-alerts
//
// AUTHENTICATION (all methods supported):
//   - Header: Ocp-Apim-Subscription-Key (Azure APIM standard)
//   - Header: KeyID (Transport Victoria documentation)
//   - Query: subscription-key
//
// RATE LIMITS:
//   - Metro Train: 24 calls/minute, near real-time refresh
//   - Tram: 24 calls/minute, 60 second refresh
//   - Bus: 24 calls/minute, near real-time refresh
//   - Server caching: 30 seconds recommended
//
// FORMAT: Protocol Buffers (application/x-protobuf)
// GTFS-RT Spec: https://gtfs.org/realtime/

import fetch from "node-fetch";
import * as GtfsRealtimeBindings from "gtfs-realtime-bindings";

// Connection status tracking for diagnostics
export const connectionStatus = {
  lastSuccess: null,
  lastError: null,
  consecutiveFailures: 0,
  totalRequests: 0,
  totalSuccesses: 0,
  rateLimitRemaining: null
};

/**
 * Build URL with subscription-key query param
 * Ensures proper URL construction with trailing slash handling
 */
function makeUrl(base, path, key) {
  const cleanBase = base.endsWith('/') ? base : base + '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(cleanPath, cleanBase);
  if (key) {
    url.searchParams.set("subscription-key", key);
  }
  return url.toString();
}

/**
 * Build headers for Open Data API
 * Includes all documented authentication methods for maximum compatibility
 */
function makeHeaders(key) {
  return {
    // Azure APIM standard header (primary)
    "Ocp-Apim-Subscription-Key": key,
    // Transport Victoria documented header (backup)
    "KeyID": key,
    // GTFS-R is Protocol Buffers format
    "Accept": "application/x-protobuf",
    // Identify our application
    "User-Agent": "PTV-TRMNL/1.0 (https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW)"
  };
}

/** Sleep helper for retry delays */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retry and exponential backoff
 * Compliant with API rate limits (max 24 calls/minute per feed)
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Track rate limit headers if present
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining) {
        connectionStatus.rateLimitRemaining = parseInt(remaining, 10);
      }

      return response;
    } catch (error) {
      lastError = error;

      // Don't retry on abort (timeout)
      if (error.name === 'AbortError') {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[OpenData] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${error.message}`);

      if (attempt < maxRetries - 1) {
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Main GTFS-R fetch function
 * Fetches and decodes Protocol Buffer feed from Transport Victoria API
 */
async function fetchGtfsR({ base, path, key, timeoutMs = 15000, maxRetries = 3 }) {
  const url = makeUrl(base, path, key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  connectionStatus.totalRequests++;

  try {
    console.log(`[OpenData] Fetching: ${base.split('/').pop()}/${path}`);

    const res = await fetchWithRetry(url, {
      headers: makeHeaders(key),
      signal: controller.signal
    }, maxRetries);

    // Handle HTTP errors
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const error = new Error(`OpenData ${path} HTTP ${res.status}: ${text.substring(0, 200)}`);
      error.status = res.status;

      // Specific error handling
      if (res.status === 401 || res.status === 403) {
        error.message = `Authentication failed (${res.status}). Check ODATA_KEY is valid.`;
      } else if (res.status === 429) {
        error.message = `Rate limit exceeded. Max 24 calls/minute per feed.`;
      }

      throw error;
    }

    const arrayBuffer = await res.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      throw new Error(`OpenData ${path} returned empty response`);
    }

    // Decode Protocol Buffer
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(arrayBuffer)
    );

    // Update success status
    connectionStatus.lastSuccess = new Date().toISOString();
    connectionStatus.consecutiveFailures = 0;
    connectionStatus.totalSuccesses++;

    const entityCount = feed.entity?.length || 0;
    console.log(`[OpenData] Success: ${path} - ${entityCount} entities`);

    return feed;

  } catch (error) {
    // Update error status
    connectionStatus.lastError = {
      time: new Date().toISOString(),
      path,
      message: error.message,
      status: error.status
    };
    connectionStatus.consecutiveFailures++;

    console.error(`[OpenData] Failed: ${path} - ${error.message}`);
    throw error;

  } finally {
    clearTimeout(timer);
  }
}

// ========================================
// Metro Train Exports
// Base: .../gtfs/realtime/v1/metro/
// ========================================

export const getMetroTripUpdates = (key, base) =>
  fetchGtfsR({ base, path: "trip-updates", key });

export const getMetroVehiclePositions = (key, base) =>
  fetchGtfsR({ base, path: "vehicle-positions", key });

export const getMetroServiceAlerts = (key, base) =>
  fetchGtfsR({ base, path: "service-alerts", key });

// ========================================
// Yarra Trams Exports
// Base: .../gtfs/realtime/v1/tram/
// ========================================

export const getTramTripUpdates = (key, base) =>
  fetchGtfsR({ base, path: "trip-updates", key });

export const getTramVehiclePositions = (key, base) =>
  fetchGtfsR({ base, path: "vehicle-positions", key });

export const getTramServiceAlerts = (key, base) =>
  fetchGtfsR({ base, path: "service-alerts", key });

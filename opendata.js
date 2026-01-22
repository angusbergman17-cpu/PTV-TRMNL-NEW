// opendata.js
// Robust Open Data GTFS-Realtime client for Metro Trains & Yarra Trams (VIC)
// Features: Retry with exponential backoff, proper error handling, connection logging

import fetch from "node-fetch";
import * as GtfsRealtimeBindings from "gtfs-realtime-bindings";

// Connection status tracking
export const connectionStatus = {
  lastSuccess: null,
  lastError: null,
  consecutiveFailures: 0,
  totalRequests: 0,
  totalSuccesses: 0
};

/** Build URL with subscription-key query param */
function makeUrl(base, path, key) {
  const cleanBase = base.endsWith('/') ? base : base + '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(cleanPath, cleanBase);
  if (key) url.searchParams.set("subscription-key", key);
  return url.toString();
}

/** Headers for Open Data API */
function makeHeaders(key) {
  return {
    "KeyID": key,
    "Ocp-Apim-Subscription-Key": key,
    "Accept": "application/x-protobuf",
    "User-Agent": "PTV-TRMNL/1.0"
  };
}

/** Sleep helper for retry delays */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Fetch with retry and exponential backoff */
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
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

/** Main GTFS-R fetch function with robust error handling */
async function fetchGtfsR({ base, path, key, timeoutMs = 15000, maxRetries = 3 }) {
  const url = makeUrl(base, path, key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  connectionStatus.totalRequests++;

  try {
    console.log(`[OpenData] Fetching: ${path}`);

    const res = await fetchWithRetry(url, {
      headers: makeHeaders(key),
      signal: controller.signal
    }, maxRetries);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const error = new Error(`OpenData ${path} returned ${res.status} ${res.statusText}: ${text.substring(0, 200)}`);
      error.status = res.status;
      throw error;
    }

    const arrayBuffer = await res.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      throw new Error(`OpenData ${path} returned empty response`);
    }

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(arrayBuffer)
    );

    // Update success status
    connectionStatus.lastSuccess = new Date().toISOString();
    connectionStatus.consecutiveFailures = 0;
    connectionStatus.totalSuccesses++;

    console.log(`[OpenData] Success: ${path} - ${feed.entity?.length || 0} entities`);

    return feed;

  } catch (error) {
    // Update error status
    connectionStatus.lastError = {
      time: new Date().toISOString(),
      path,
      message: error.message
    };
    connectionStatus.consecutiveFailures++;

    console.error(`[OpenData] Failed: ${path} - ${error.message}`);
    throw error;

  } finally {
    clearTimeout(timer);
  }
}

// Metro (Train) exports
export const getMetroTripUpdates = (key, base) =>
  fetchGtfsR({ base, path: "trip-updates", key });

export const getMetroVehiclePositions = (key, base) =>
  fetchGtfsR({ base, path: "vehicle-positions", key });

export const getMetroServiceAlerts = (key, base) =>
  fetchGtfsR({ base, path: "service-alerts", key });

// Tram (Yarra Trams) exports
export const getTramTripUpdates = (key, base) =>
  fetchGtfsR({ base, path: "trip-updates", key });

export const getTramVehiclePositions = (key, base) =>
  fetchGtfsR({ base, path: "vehicle-positions", key });

export const getTramServiceAlerts = (key, base) =>
  fetchGtfsR({ base, path: "service-alerts", key });

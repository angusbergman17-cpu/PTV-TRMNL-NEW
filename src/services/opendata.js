/**
 * opendata.js
 * Minimal Open Data GTFS‑Realtime client for Metro Trains & Yarra Trams (VIC)
 * Uses Transport Victoria OpenData API with KeyId header authentication (UUID format API key)
 * Format: Protobuf (decoded via gtfs-realtime-bindings)
 *
 * Copyright (c) 2026 Angus Bergman
 * Licensed under CC BY-NC 4.0 (Creative Commons Attribution-NonCommercial 4.0 International License)
 * https://creativecommons.org/licenses/by-nc/4.0/
 */

import fetch from "node-fetch";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

/** Build URL - append path to base (base must end with /, path must not start with /) */
function makeUrl(base, path) {
  // Ensure base ends with / and path doesn't start with /
  const normalizedBase = base.endsWith('/') ? base : base + '/';
  const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
  return normalizedBase + normalizedPath;
}

/**
 * Send API Key in headers for OpenData Transport Victoria authentication
 * Per actual API behavior: Uses "KeyId" header with UUID format API key
 */
function makeHeaders(apiKey) {
  const headers = {
    "Accept": "*/*"  // API accepts any format
  };

  // Add API key if provided (per working API example from portal)
  if (apiKey) {
    headers["KeyId"] = apiKey;  // CORRECT: KeyId header (case-sensitive)
  }

  return headers;
}

async function fetchGtfsR({ base, path, apiKey, timeoutMs = 10000 }) {
  const url = makeUrl(base, path);
  const headers = makeHeaders(apiKey);

  console.log(`📡 Fetching: ${url}`);
  console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NOT PROVIDED'}`);
  console.log(`📋 Headers:`, JSON.stringify(headers, null, 2));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    console.log(`✅ Response: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenData ${path} ${res.status} ${res.statusText} :: ${text}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    console.log(`📦 Received ${arrayBuffer.byteLength} bytes of protobuf data`);

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(arrayBuffer)
    );
    return feed;
  } finally {
    clearTimeout(timer);
  }
}

// Metro (Train) - Uses KeyId header with UUID format API key
export const getMetroTripUpdates     = (apiKey, base) => fetchGtfsR({ base, path: "/trip-updates",     apiKey });
export const getMetroVehiclePositions= (apiKey, base) => fetchGtfsR({ base, path: "/vehicle-positions", apiKey });
export const getMetroServiceAlerts   = (apiKey, base) => fetchGtfsR({ base, path: "/service-alerts",    apiKey });

// Tram (Yarra Trams) - Uses KeyId header with UUID format API key
export const getTramTripUpdates      = (apiKey, base) => fetchGtfsR({ base, path: "/trip-updates",     apiKey });
export const getTramVehiclePositions = (apiKey, base) => fetchGtfsR({ base, path: "/vehicle-positions", apiKey });
export const getTramServiceAlerts    = (apiKey, base) => fetchGtfsR({ base, path: "/service-alerts",    apiKey });

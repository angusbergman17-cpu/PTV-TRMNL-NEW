
// server.js
import express from "express";
import dotenv from "dotenv";
import { getSnapshot } from "./data-scraper.js";
import { renderPng } from "./pids-renderer.js";
import config from "./config.js";

dotenv.config();

const app = express();

// Render/Heroku style port binding
const PORT = process.env.PORT || 3000;

// Single Open Data API key (no DEV_ID needed)
const ODATA_KEY = process.env.ODATA_KEY;

// Simple logger
function log(...args) {
  console.log(...args);
}

// --- Startup banner ----------------------------------------------------------
function banner() {
  const lines = [
    "🚀 TRMNL Melbourne PT Server — Open Data Edition",
    `📡 Server running on port ${PORT}`,
    "🎯 Data Sources:",
    "  ✓ Open Data GTFS‑Realtime: Metro Trains (Trip Updates, Vehicle Positions, Service Alerts)",
    "  ✓ Open Data GTFS‑Realtime: Yarra Trams (Trip Updates, Vehicle Positions, Service Alerts)",
    "  ✓ Static GTFS (Schedule): platforms & station hierarchy (fallback)",
    "⚙️ Configuration:",
    `  South Yarra preferred platform: ${config.stations?.southYarra?.preferredPlatformCode || "N/A"}`,
    `  City‑bound targets: ${config.cityBoundTargetStopNames?.join(", ") || "N/A"}`,
    `  Refresh: ${config.cacheSeconds || 60}s (app cache)`,
    "🔗 Endpoints:",
    "  /",
    "  /api/status",
    "  /api/screen",
    "  /api/live-image.png"
  ];
  log(lines.join("\n"));
}

// --- Routes ------------------------------------------------------------------

// Basic heartbeat
app.get("/", (_req, res) => {
  res
    .status(200)
    .type("text/plain")
    .send("TRMNL Melbourne PT Display — Open Data edition OK");
});

// Health/status
app.get("/api/status", async (_req, res) => {
  try {
    if (!ODATA_KEY) {
      return res.status(200).json({
        ok: true,
        warning:
          "ODATA_KEY is not set — falling back to static schedule where necessary.",
        updated: null,
        counts: { trains: 0, trams: 0, alerts: { metro: 0, tram: 0 } }
      });
    }

    const snap = await getSnapshot(ODATA_KEY);
    res.status(200).json({
      ok: true,
      updated: snap.meta.generatedAt,
      sources: snap.meta.sources,
      counts: {
        trains: snap.trains?.length || 0,
        trams: snap.trams?.length || 0,
        alerts: snap.alerts || { metro: 0, tram: 0 }
      },
      notes: snap.notes || {}
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// TRMNL JSON
app.get("/api/screen", async (_req, res) => {
  try {
    const snap = await getSnapshot(ODATA_KEY); // will use static fallbacks if key missing
    res.status(200).json({
      version: 1,
      width: config.image.width,
      height: config.image.height,
      data: snap
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Rendered PNG
app.get("/api/live-image.png", async (_req, res) => {
  try {
    const snap = await getSnapshot(ODATA_KEY);
    const png = await renderPng(snap, config.image);
    res.status(200).type("image/png").send(png);
  } catch (e) {
    res.status(500).type("text/plain").send(String(e));
  }
});

// --- Start -------------------------------------------------------------------
app.listen(PORT, () => {
  banner();

  if (!ODATA_KEY) {
    log(
      "⚠️  ODATA_KEY is missing — real‑time will partially fall back to static schedule."
    );
  } else {
    log("🔑 Open Data key detected — real‑time GTFS‑R enabled.");
  }
});
``

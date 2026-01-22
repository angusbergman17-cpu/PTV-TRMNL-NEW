
import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const app = express();

/* =========================================================
   GTFS LOADING (ONCE AT STARTUP)
   ========================================================= */

const GTFS_PATHS = [
  path.join(process.cwd(), 'gtfs', 'stops.txt'),
  path.join(process.cwd(), 'stops.txt')
];

let stationsByName = {};
let platformsByParent = {};

function loadGTFS() {
  const filePath = GTFS_PATHS.find(p => fs.existsSync(p));
  if (!filePath) {
    console.warn('⚠️ GTFS stops.txt not found');
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const headers = raw[0].split(',');
  const h = Object.fromEntries(headers.map((v, i) => [v, i]));

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i].split(',');

    const stopId = row[h.stop_id];
    const name = row[h.stop_name];
    const parent = row[h.parent_station] || null;

    if (!stopId || !name) continue;

    if (!parent) {
      stationsByName[name.toLowerCase()] = { id: stopId, name };
    } else {
      platformsByParent[parent] ??= [];
      platformsByParent[parent].push({ id: stopId, name });
    }
  }

  console.log(`✅ GTFS loaded (${Object.keys(stationsByName).length} stations)`);
}
loadGTFS();

/* =========================================================
   BASIC ROUTES
   ========================================================= */

app.get('/', (req, res) => {
  res.send('✅ PTV‑TRMNL service running (Stage 4)');
});

app.get('/gtfs/station/:name', (req, res) => {
  const station = stationsByName[req.params.name.toLowerCase()];
  if (!station) return res.status(404).json({ error: 'Station not found' });

  res.json({
    station,
    platforms: platformsByParent[station.id] || []
  });
});

/* =========================================================
   IMAGE CACHE (VERY IMPORTANT FOR RENDER)
   ========================================================= */

let cachedImage = null;
let cachedAt = 0;
const CACHE_MS = 30 * 1000; // 30 seconds

/* =========================================================
   TRMNL IMAGE ENDPOINT
   ========================================================= */

app.get('/trmnl.png', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedImage && now - cachedAt < CACHE_MS) {
      res.set('Content-Type', 'image/png');
      return res.send(cachedImage);
    }

    const stationName = (req.query.station || 'Flinders Street').toLowerCase();
    const station = stationsByName[stationName];
    if (!station) throw new Error('Unknown station');

    if (!process.env.PTV_API_KEY || !process.env.PTV_DEVID) {
      throw new Error('PTV credentials missing');
    }

    const url =
      `https://timetableapi.ptv.vic.gov.au/v3/departures/route_type/0/stop/${station.id}` +
      `?devid=${process.env.PTV_DEVID}`;

    const ptv = await axios.get(url, {
      headers: { authorization: process.env.PTV_API_KEY },
      timeout: 5000
    });

    const departures = ptv.data.departures.slice(0, 5);

    /* ================= IMAGE ================= */

    const width = 480;
    const height = 800;

    let svg = `
      <svg width="${width}" height="${height}">
        <style>
          text { font-family: Arial, Helvetica, sans-serif; fill: #000 }
        </style>
        <rect width="100%" height="100%" fill="#fff"/>
        <text x="24" y="60" font-size="32">${station.name}</text>
        <line x1="24" y1="75" x2="456" y2="75" stroke="#000"/>
    `;

    let y = 120;
    for (const dep of departures) {
      const time = dep.scheduled_departure_utc
        ? new Date(dep.scheduled_departure_utc).toLocaleTimeString('en-AU', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '--:--';

      svg += `
        <text x="24" y="${y}" font-size="28">${time}</text>
      `;
      y += 56;
    }

    svg += `
        <text x="24" y="${height - 32}" font-size="18">
          Updated ${new Date().toLocaleTimeString('en-AU')}
        </text>
      </svg>
    `;

    const image = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();

    cachedImage = image;
    cachedAt = now;

    res.set('Content-Type', 'image/png');
    res.send(image);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* =========================================================
   PREVIEW (HTML)
   ========================================================= */

app.get('/preview', (req, res) => {
  res.send(`
    <h1>PTV‑TRMNL Preview</h1>
    /trmnl.png
  `);
});

/* =========================================================
   PORT
   ========================================================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on ${PORT}`);
});

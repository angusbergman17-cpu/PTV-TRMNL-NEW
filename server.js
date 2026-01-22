import 'dotenv/config';
import express from 'express';
import config from './config.js';
import { getSnapshot, connectionStatus } from './data-scraper.js';
import PidsRenderer from './pids-renderer.js';
import CoffeeDecision from './coffee-decision.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize renderer and coffee decision engine
const renderer = new PidsRenderer();
const coffeeEngine = new CoffeeDecision();

// Cache for image and data
let cachedImage = null;
let cachedData = null;
let lastUpdate = 0;
const CACHE_MS = 30 * 1000; // 30 seconds

/**
 * Fetch fresh data from all sources
 */
async function fetchData() {
  try {
    const apiKey = process.env.ODATA_KEY || process.env.PTV_KEY;
    const snapshot = await getSnapshot(apiKey);

    // Transform snapshot into format for renderer
    const now = new Date();

    // Process trains with dynamic platform info
    const trains = (snapshot.trains || []).slice(0, 5).map(train => {
      const departureTime = new Date(train.when);
      const minutes = Math.max(0, Math.round((departureTime - now) / 60000));
      return {
        minutes,
        destination: 'Flinders Street',
        platform: train.platformCode || null,
        isScheduled: false
      };
    });

    // Process trams (Route 58 at Tivoli Road)
    const trams = (snapshot.trams || []).slice(0, 5).map(tram => {
      const departureTime = new Date(tram.when);
      const minutes = Math.max(0, Math.round((departureTime - now) / 60000));
      return {
        minutes,
        destination: tram.headsign || 'West Coburg',
        isScheduled: false
      };
    });

    // Smart connections - optimal tram-train pairs
    const connections = (snapshot.connections || []).slice(0, 3).map(conn => ({
      tramMinutes: Math.max(0, Math.round((conn.tram.when - now) / 60000)),
      trainMinutes: Math.max(0, Math.round((conn.train.when - now) / 60000)),
      trainPlatform: conn.train.platformCode || null,
      waitTime: conn.waitTime,
      totalTime: conn.totalTime
    }));

    // Coffee decision
    const nextTrain = trains[0] ? trains[0].minutes : 15;
    const coffee = coffeeEngine.calculate(nextTrain, trams, null);

    // Weather placeholder
    const weather = {
      temp: process.env.WEATHER_KEY ? '--' : '--',
      condition: 'Partly Cloudy',
      icon: '☁️'
    };

    // Service alerts
    const news = snapshot.alerts.metro > 0
      ? `⚠️ ${snapshot.alerts.metro} Metro alert(s)`
      : null;

    return {
      trains,
      trams,
      connections,
      weather,
      news,
      coffee,
      meta: snapshot.meta
    };
  } catch (error) {
    console.error('Error fetching data:', error.message);

    // Return fallback data
    return {
      trains: [],
      trams: [],
      weather: { temp: '--', condition: 'Data Unavailable', icon: '⚠️' },
      news: 'Service data temporarily unavailable',
      coffee: { canGet: false, decision: 'NO DATA', subtext: 'API unavailable', urgent: false },
      meta: { generatedAt: new Date().toISOString(), error: error.message }
    };
  }
}

/**
 * Get cached or fresh data
 */
async function getData() {
  const now = Date.now();
  if (cachedData && (now - lastUpdate) < CACHE_MS) {
    return cachedData;
  }

  cachedData = await fetchData();
  lastUpdate = now;
  return cachedData;
}

/**
 * Get cached or fresh image
 */
async function getImage() {
  const now = Date.now();
  if (cachedImage && (now - lastUpdate) < CACHE_MS) {
    return cachedImage;
  }

  const data = await getData();
  cachedImage = await renderer.render(data, data.coffee);
  return cachedImage;
}

/* =========================================================
   ROUTES
   ========================================================= */

// Health check
app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="PTV-TRMNL">
      <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%23000' width='100' height='100' rx='20'/><text y='70' x='50' text-anchor='middle' font-size='50'>🚊</text></svg>">
      <title>PTV-TRMNL Home</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: #fff;
          min-height: 100vh;
          padding: 20px;
        }
        .container { max-width: 600px; margin: 0 auto; }
        h1 {
          font-size: 2rem;
          text-align: center;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .subtitle {
          text-align: center;
          color: #8892b0;
          margin-bottom: 30px;
          font-size: 0.9rem;
        }
        .status-badge {
          display: inline-block;
          background: #10b981;
          color: #fff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .card h2 {
          font-size: 1rem;
          color: #64ffda;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .link-grid {
          display: grid;
          gap: 10px;
        }
        .link-item {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 15px;
          text-decoration: none;
          color: #fff;
          transition: all 0.2s;
        }
        .link-item:hover {
          background: rgba(255,255,255,0.15);
          transform: translateX(5px);
        }
        .link-icon {
          width: 40px;
          height: 40px;
          background: rgba(100,255,218,0.2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          margin-right: 15px;
        }
        .link-text h3 { font-size: 0.95rem; margin-bottom: 2px; }
        .link-text p { font-size: 0.75rem; color: #8892b0; }
        .preview-img {
          width: 100%;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          margin-top: 15px;
        }
        .trmnl-setup {
          background: linear-gradient(135deg, #0f4c81 0%, #1a237e 100%);
          border: none;
        }
        .trmnl-setup h2 { color: #fff; }
        .setup-steps {
          list-style: none;
          counter-reset: steps;
        }
        .setup-steps li {
          counter-increment: steps;
          padding: 10px 0;
          padding-left: 35px;
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .setup-steps li:last-child { border-bottom: none; }
        .setup-steps li::before {
          content: counter(steps);
          position: absolute;
          left: 0;
          width: 24px;
          height: 24px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .webhook-url {
          background: rgba(0,0,0,0.3);
          padding: 10px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.8rem;
          word-break: break-all;
          margin-top: 10px;
        }
        .copy-btn {
          background: #64ffda;
          color: #1a1a2e;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
          font-size: 0.8rem;
        }
        .copy-btn:active { transform: scale(0.95); }
        .refresh-note {
          text-align: center;
          color: #8892b0;
          font-size: 0.75rem;
          margin-top: 10px;
        }
        @media (max-width: 480px) {
          h1 { font-size: 1.5rem; }
          .card { padding: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚊 PTV-TRMNL</h1>
        <p class="subtitle">Melbourne Transport Display for TRMNL</p>
        <center><span class="status-badge">LIVE</span></center>

        <!-- Device Setup CTA -->
        <div class="card" style="background: linear-gradient(135deg, #0f4c81 0%, #1a237e 100%); border: none;">
          <h2 style="color: #fff;">📟 Set Up Your TRMNL Device</h2>
          <p style="color: rgba(255,255,255,0.8); margin-bottom: 15px;">Follow our step-by-step guide to connect your display</p>
          <a href="/setup" style="display: inline-block; background: #64ffda; color: #1a1a2e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Start Device Setup →</a>
        </div>

        <!-- Quick Links -->
        <div class="card">
          <h2>📱 Quick Links</h2>
          <div class="link-grid">
            <a href="/setup" class="link-item">
              <div class="link-icon">📟</div>
              <div class="link-text">
                <h3>Device Setup</h3>
                <p>Step-by-step TRMNL pairing guide</p>
              </div>
            </a>
            <a href="/preview" class="link-item">
              <div class="link-icon">🖥️</div>
              <div class="link-text">
                <h3>Live Preview</h3>
                <p>Full screen preview with auto-refresh</p>
              </div>
            </a>
            <a href="/api/live-image.png" class="link-item">
              <div class="link-icon">🖼️</div>
              <div class="link-text">
                <h3>PNG Screen</h3>
                <p>Raw 800x480 e-ink display image</p>
              </div>
            </a>
            <a href="/api/status" class="link-item">
              <div class="link-icon">📊</div>
              <div class="link-text">
                <h3>Status & Diagnostics</h3>
                <p>Cache, data counts, API health</p>
              </div>
            </a>
            <a href="/api/diagnostic" class="link-item">
              <div class="link-icon">🔬</div>
              <div class="link-text">
                <h3>Full Diagnostic</h3>
                <p>Detailed system audit</p>
              </div>
            </a>
            <a href="/api/test-connection" class="link-item">
              <div class="link-icon">🔌</div>
              <div class="link-text">
                <h3>Test API Connection</h3>
                <p>Fresh API test (bypasses cache)</p>
              </div>
            </a>
          </div>
        </div>

        <!-- API Endpoints -->
        <div class="card">
          <h2>🔗 API Endpoints</h2>
          <div class="link-grid">
            <a href="/api/screen" class="link-item">
              <div class="link-icon">📋</div>
              <div class="link-text">
                <h3>/api/screen</h3>
                <p>TRMNL webhook JSON markup</p>
              </div>
            </a>
            <a href="/api/partial" class="link-item">
              <div class="link-icon">⚡</div>
              <div class="link-text">
                <h3>/api/partial</h3>
                <p>Fast partial refresh data</p>
              </div>
            </a>
            <a href="/api/config" class="link-item">
              <div class="link-icon">⚙️</div>
              <div class="link-text">
                <h3>/api/config</h3>
                <p>Firmware configuration</p>
              </div>
            </a>
            <a href="/api/test-card" class="link-item">
              <div class="link-icon">🧪</div>
              <div class="link-text">
                <h3>/api/test-card</h3>
                <p>Test TRMNL connection</p>
              </div>
            </a>
            <a href="/api/validate-setup" class="link-item">
              <div class="link-icon">✅</div>
              <div class="link-text">
                <h3>/api/validate-setup</h3>
                <p>Validate setup status</p>
              </div>
            </a>
          </div>
        </div>

        <!-- TRMNL Setup -->
        <div class="card trmnl-setup">
          <h2>🔌 TRMNL Device Setup</h2>
          <ol class="setup-steps">
            <li>Go to <strong>usetrmnl.com</strong> and log in</li>
            <li>Click <strong>Add Plugin</strong> → <strong>Webhook</strong></li>
            <li>Paste webhook URL below</li>
            <li>Set refresh to <strong>20 seconds</strong></li>
            <li>Save and sync your device</li>
          </ol>
          <div class="webhook-url" id="webhook-url">${baseUrl}/api/screen</div>
          <button class="copy-btn" onclick="copyUrl()">📋 Copy Webhook URL</button>
        </div>

        <!-- Live Preview -->
        <div class="card">
          <h2>📺 Live Display</h2>
          <img id="preview" class="preview-img" src="/api/live-image.png" alt="Live Display">
          <p class="refresh-note">Auto-refreshes every 30 seconds</p>
        </div>

        <!-- External Links -->
        <div class="card">
          <h2>🌐 External Links</h2>
          <div class="link-grid">
            <a href="https://usetrmnl.com" target="_blank" class="link-item">
              <div class="link-icon">📟</div>
              <div class="link-text">
                <h3>TRMNL Dashboard</h3>
                <p>Manage your device</p>
              </div>
            </a>
            <a href="https://opendata.transport.vic.gov.au" target="_blank" class="link-item">
              <div class="link-icon">🚆</div>
              <div class="link-text">
                <h3>PTV Open Data</h3>
                <p>API key management</p>
              </div>
            </a>
            <a href="https://dashboard.render.com" target="_blank" class="link-item">
              <div class="link-icon">☁️</div>
              <div class="link-text">
                <h3>Render Dashboard</h3>
                <p>Server management</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <script>
        function copyUrl() {
          const url = document.getElementById('webhook-url').textContent;
          navigator.clipboard.writeText(url).then(() => {
            const btn = document.querySelector('.copy-btn');
            btn.textContent = '✓ Copied!';
            setTimeout(() => btn.textContent = '📋 Copy Webhook URL', 2000);
          });
        }
        // Auto-refresh preview
        setInterval(() => {
          document.getElementById('preview').src = '/api/live-image.png?t=' + Date.now();
        }, 30000);
      </script>
    </body>
    </html>
  `);
});

// Status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const data = await getData();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: {
        age: Math.round((Date.now() - lastUpdate) / 1000),
        maxAge: Math.round(CACHE_MS / 1000)
      },
      data: {
        trains: data.trains.length,
        trams: data.trams.length,
        connections: data.connections?.length || 0,
        alerts: data.news ? 1 : 0
      },
      meta: data.meta
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Full diagnostic endpoint
app.get('/api/diagnostic', async (req, res) => {
  const startTime = Date.now();
  const diagnostics = {
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development'
    },
    config: {
      hasOdataKey: !!process.env.ODATA_KEY,
      odataKeyPreview: process.env.ODATA_KEY ? process.env.ODATA_KEY.substring(0, 8) + '...' : null,
      hasWeatherKey: !!process.env.WEATHER_KEY,
      cacheSeconds: config.cacheSeconds,
      refreshSeconds: config.refreshSeconds
    },
    connection: {
      ...connectionStatus,
      healthy: connectionStatus.consecutiveFailures < 3
    },
    cache: {
      hasData: !!cachedData,
      hasImage: !!cachedImage,
      ageSeconds: Math.round((Date.now() - lastUpdate) / 1000),
      maxAgeSeconds: Math.round(CACHE_MS / 1000)
    },
    tests: {}
  };

  try {
    // Test data fetch
    const data = await getData();
    const fetchTime = Date.now() - startTime;

    diagnostics.tests.dataFetch = {
      success: true,
      timeMs: fetchTime
    };

    diagnostics.data = {
      trains: {
        count: data.trains.length,
        items: data.trains.slice(0, 3).map(t => ({
          minutes: t.minutes,
          platform: t.platform,
          destination: t.destination
        }))
      },
      trams: {
        count: data.trams.length,
        items: data.trams.slice(0, 3).map(t => ({
          minutes: t.minutes,
          destination: t.destination
        }))
      },
      connections: {
        count: data.connections?.length || 0,
        optimal: data.connections?.[0] ? {
          tramIn: data.connections[0].tramMinutes + ' min',
          trainIn: data.connections[0].trainMinutes + ' min',
          platform: data.connections[0].trainPlatform,
          totalJourney: data.connections[0].totalTime + ' min'
        } : null
      },
      coffee: data.coffee,
      alerts: data.news
    };

    diagnostics.sources = data.meta?.sources || {};

    // Test image generation
    const imgStart = Date.now();
    await getImage();
    diagnostics.tests.imageGen = {
      success: true,
      timeMs: Date.now() - imgStart
    };

  } catch (error) {
    diagnostics.tests.error = {
      message: error.message,
      stack: error.stack
    };
  }

  diagnostics.totalTimeMs = Date.now() - startTime;
  res.json(diagnostics);
});

// Force fresh API test (bypasses cache)
app.get('/api/test-connection', async (req, res) => {
  const apiKey = process.env.ODATA_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'ODATA_KEY not configured',
      hint: 'Add ODATA_KEY to environment variables in Render dashboard'
    });
  }

  const results = {
    timestamp: new Date().toISOString(),
    apiKey: apiKey.substring(0, 8) + '...',
    tests: {}
  };

  // Import the fetch functions directly for testing
  const { getMetroTripUpdates, getTramTripUpdates, getMetroServiceAlerts } = await import('./opendata.js');
  const mBase = config.feeds.metro.base;
  const tBase = config.feeds.tram.base;

  // Test Metro
  try {
    const start = Date.now();
    const metroFeed = await getMetroTripUpdates(apiKey, mBase);
    results.tests.metro = {
      success: true,
      entities: metroFeed.entity?.length || 0,
      timeMs: Date.now() - start,
      headerTimestamp: metroFeed.header?.timestamp?.toString()
    };
  } catch (err) {
    results.tests.metro = { success: false, error: err.message };
  }

  // Test Tram
  try {
    const start = Date.now();
    const tramFeed = await getTramTripUpdates(apiKey, tBase);
    results.tests.tram = {
      success: true,
      entities: tramFeed.entity?.length || 0,
      timeMs: Date.now() - start,
      headerTimestamp: tramFeed.header?.timestamp?.toString()
    };
  } catch (err) {
    results.tests.tram = { success: false, error: err.message };
  }

  // Test Alerts
  try {
    const start = Date.now();
    const alertsFeed = await getMetroServiceAlerts(apiKey, mBase);
    results.tests.alerts = {
      success: true,
      entities: alertsFeed.entity?.length || 0,
      timeMs: Date.now() - start
    };
  } catch (err) {
    results.tests.alerts = { success: false, error: err.message };
  }

  results.allPassed = Object.values(results.tests).every(t => t.success);
  results.connectionStatus = connectionStatus;

  res.json(results);
});

// TRMNL screen endpoint (JSON markup)
app.get('/api/screen', async (req, res) => {
  try {
    const data = await getData();

    // Build TRMNL markup
    const markup = [
      `**${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })}** | ${data.weather.icon} ${data.weather.temp}°C`,
      '',
      data.coffee.canGet ? '☕ **YOU HAVE TIME FOR COFFEE!**' : '⚡ **NO COFFEE - GO DIRECT**',
      '',
      '**METRO TRAINS - SOUTH YARRA**',
      data.trains.length > 0 ? data.trains.slice(0, 3).map(t => `→ ${t.minutes} min`).join('\n') : '→ No departures',
      '',
      '**YARRA TRAMS - ROUTE 58**',
      data.trams.length > 0 ? data.trams.slice(0, 3).map(t => `→ ${t.minutes} min`).join('\n') : '→ No departures',
      '',
      data.news ? `⚠️ ${data.news}` : '✓ Good service on all lines'
    ];

    res.json({
      merge_variables: {
        screen_text: markup.join('\n')
      }
    });
  } catch (error) {
    res.status(500).json({
      merge_variables: {
        screen_text: `⚠️ Error: ${error.message}`
      }
    });
  }
});

// Live PNG image endpoint
app.get('/api/live-image.png', async (req, res) => {
  try {
    const image = await getImage();
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', `public, max-age=${Math.round(CACHE_MS / 1000)}`);
    res.send(image);
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).send('Error generating image');
  }
});

// Legacy endpoint for compatibility
app.get('/trmnl.png', async (req, res) => {
  res.redirect(301, '/api/live-image.png');
});

// ========== PARTIAL REFRESH ENDPOINTS ==========
// These endpoints support the custom firmware's partial refresh capability

// Partial data endpoint - returns just the dynamic data for quick updates
app.get('/api/partial', async (req, res) => {
  try {
    const data = await getData();
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Melbourne',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    // Return minimal JSON for partial screen update
    res.json({
      time: timeFormatter.format(now),
      trains: data.trains.slice(0, 3).map(t => t.minutes),
      trams: data.trams.slice(0, 3).map(t => t.minutes),
      coffee: data.coffee.canGet,
      coffeeText: data.coffee.canGet ? 'COFFEE TIME' : 'NO COFFEE',
      alert: data.news ? true : false,
      ts: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Firmware config endpoint - tells device refresh intervals
app.get('/api/config', (req, res) => {
  res.json({
    partialRefreshMs: 60000,    // 1 minute partial refresh
    fullRefreshMs: 300000,      // 5 minute full refresh
    sleepBetweenMs: 55000,      // Sleep time between polls
    timezone: 'Australia/Melbourne',
    version: '1.0.0'
  });
});

// ========== TRMNL DEVICE SETUP & VALIDATION ==========

// Device setup wizard page
app.get('/setup', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const webhookUrl = `${baseUrl}/api/screen`;

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TRMNL Device Setup</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0a;
          color: #fff;
          min-height: 100vh;
          padding: 20px;
        }
        .container { max-width: 700px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 10px; font-size: 1.8rem; }
        .subtitle { text-align: center; color: #888; margin-bottom: 30px; }

        .step {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 15px;
          position: relative;
        }
        .step.active { border-color: #64ffda; }
        .step.complete { border-color: #10b981; background: rgba(16,185,129,0.1); }
        .step-num {
          position: absolute;
          left: -12px;
          top: 20px;
          width: 24px;
          height: 24px;
          background: #333;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .step.complete .step-num { background: #10b981; }
        .step h3 { margin-bottom: 10px; color: #64ffda; }
        .step p { color: #aaa; font-size: 0.9rem; line-height: 1.5; }

        .url-box {
          background: #000;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.85rem;
          word-break: break-all;
          color: #64ffda;
        }
        .copy-btn {
          background: #64ffda;
          color: #000;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .copy-btn:hover { background: #4fd1c5; }
        .copy-btn.copied { background: #10b981; }

        .validation {
          background: #1a1a1a;
          border: 2px dashed #333;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: center;
        }
        .validation h3 { margin-bottom: 15px; }
        .validate-btn {
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
        }
        .validate-btn:hover { background: #2563eb; }
        .validate-btn:disabled { background: #555; cursor: not-allowed; }

        .result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 8px;
          display: none;
        }
        .result.success { display: block; background: rgba(16,185,129,0.2); border: 1px solid #10b981; }
        .result.error { display: block; background: rgba(239,68,68,0.2); border: 1px solid #ef4444; }
        .result.loading { display: block; background: rgba(59,130,246,0.2); border: 1px solid #3b82f6; }

        .checklist { list-style: none; text-align: left; margin-top: 15px; }
        .checklist li { padding: 8px 0; padding-left: 30px; position: relative; }
        .checklist li::before {
          content: '○';
          position: absolute;
          left: 5px;
          color: #666;
        }
        .checklist li.pass::before { content: '✓'; color: #10b981; }
        .checklist li.fail::before { content: '✗'; color: #ef4444; }

        .screenshot {
          margin: 15px 0;
          border-radius: 8px;
          border: 1px solid #333;
          max-width: 100%;
        }
        .note {
          background: rgba(251,191,36,0.1);
          border: 1px solid #fbbf24;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          font-size: 0.85rem;
        }
        .note strong { color: #fbbf24; }

        .external-link {
          display: inline-block;
          background: #2563eb;
          color: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
          margin: 5px;
        }
        .external-link:hover { background: #1d4ed8; }

        .final-checklist {
          background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
          border-radius: 12px;
          padding: 20px;
          margin-top: 25px;
        }
        .final-checklist h3 { color: #6ee7b7; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📟 TRMNL Device Setup</h1>
        <p class="subtitle">Follow these steps to connect your PTV display</p>

        <!-- Step 1: TRMNL Account -->
        <div class="step">
          <span class="step-num">1</span>
          <h3>Log into TRMNL</h3>
          <p>Open your browser and go to the TRMNL dashboard. Make sure your device is already paired to your account.</p>
          <div style="margin-top: 15px;">
            <a href="https://usetrmnl.com" target="_blank" class="external-link">Open TRMNL Dashboard →</a>
          </div>
        </div>

        <!-- Step 2: Add Webhook Plugin -->
        <div class="step">
          <span class="step-num">2</span>
          <h3>Add Webhook Plugin</h3>
          <p>In the TRMNL dashboard:</p>
          <ol style="margin: 10px 0 0 20px; color: #aaa; font-size: 0.9rem; line-height: 1.8;">
            <li>Click <strong style="color:#fff">Plugins</strong> in the sidebar</li>
            <li>Click <strong style="color:#fff">+ Add Plugin</strong></li>
            <li>Search for <strong style="color:#fff">"Webhook"</strong></li>
            <li>Click to add it</li>
          </ol>
        </div>

        <!-- Step 3: Configure Webhook -->
        <div class="step active">
          <span class="step-num">3</span>
          <h3>Configure Webhook URL</h3>
          <p>Copy this webhook URL and paste it into the Webhook plugin configuration:</p>
          <div class="url-box" id="webhook-url">${webhookUrl}</div>
          <button class="copy-btn" onclick="copyUrl()">
            <span id="copy-icon">📋</span>
            <span id="copy-text">Copy Webhook URL</span>
          </button>
        </div>

        <!-- Step 4: Set Refresh Rate -->
        <div class="step">
          <span class="step-num">4</span>
          <h3>Set Refresh Rate</h3>
          <p>Configure how often TRMNL fetches new data:</p>
          <div class="note">
            <strong>⚡ Recommended:</strong> Set refresh to <strong>15 minutes</strong> (TRMNL default).
            For faster updates, you'll need custom firmware (included in this project).
          </div>
          <p style="margin-top: 10px; font-size: 0.85rem; color: #888;">
            Standard TRMNL supports 15-minute minimum refresh. The custom firmware in <code>/firmware</code>
            enables 1-minute partial refresh for real-time departures.
          </p>
        </div>

        <!-- Step 5: Save & Sync -->
        <div class="step">
          <span class="step-num">5</span>
          <h3>Save & Sync Device</h3>
          <p>Click <strong>Save</strong> in TRMNL, then press the button on your device to force a sync.</p>
          <div class="note">
            <strong>💡 Tip:</strong> The device button triggers an immediate refresh.
            After setup, your display will show Melbourne train & tram departures!
          </div>
        </div>

        <!-- Validation Section -->
        <div class="validation">
          <h3>🔍 Validate Your Setup</h3>
          <p style="color: #888; margin-bottom: 15px;">Click below to test that everything is working</p>
          <button class="validate-btn" onclick="runValidation()" id="validate-btn">Run Validation Check</button>

          <div id="result" class="result">
            <ul class="checklist" id="checklist"></ul>
          </div>
        </div>

        <!-- Final Checklist -->
        <div class="final-checklist">
          <h3>✅ Setup Complete Checklist</h3>
          <ul class="checklist" style="color: #d1fae5;">
            <li>TRMNL device powered on and connected to WiFi</li>
            <li>Device paired to your TRMNL account</li>
            <li>Webhook plugin added with correct URL</li>
            <li>Device synced (press button to force)</li>
            <li>Display showing PTV departures</li>
          </ul>
        </div>

        <!-- Quick Links -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
          <p style="color: #666; margin-bottom: 15px;">Quick Links</p>
          <a href="/" class="external-link" style="background: #333;">← Home</a>
          <a href="/preview" class="external-link" style="background: #333;">Live Preview</a>
          <a href="/api/diagnostic" class="external-link" style="background: #333;">Diagnostics</a>
        </div>
      </div>

      <script>
        function copyUrl() {
          const url = document.getElementById('webhook-url').textContent;
          navigator.clipboard.writeText(url).then(() => {
            document.getElementById('copy-icon').textContent = '✓';
            document.getElementById('copy-text').textContent = 'Copied!';
            document.querySelector('.copy-btn').classList.add('copied');
            setTimeout(() => {
              document.getElementById('copy-icon').textContent = '📋';
              document.getElementById('copy-text').textContent = 'Copy Webhook URL';
              document.querySelector('.copy-btn').classList.remove('copied');
            }, 2000);
          });
        }

        async function runValidation() {
          const btn = document.getElementById('validate-btn');
          const result = document.getElementById('result');
          const checklist = document.getElementById('checklist');

          btn.disabled = true;
          btn.textContent = 'Checking...';
          result.className = 'result loading';
          checklist.innerHTML = '<li>Running validation checks...</li>';

          try {
            const response = await fetch('/api/validate-setup');
            const data = await response.json();

            let html = '';
            let allPass = true;

            data.checks.forEach(check => {
              const status = check.pass ? 'pass' : 'fail';
              if (!check.pass) allPass = false;
              html += '<li class="' + status + '">' + check.name + (check.detail ? ' - ' + check.detail : '') + '</li>';
            });

            checklist.innerHTML = html;
            result.className = 'result ' + (allPass ? 'success' : 'error');

            if (allPass) {
              checklist.innerHTML += '<li style="padding-top: 15px; border-top: 1px solid #333; margin-top: 10px; color: #10b981; font-weight: bold;">🎉 All checks passed! Your setup is ready.</li>';
            } else {
              checklist.innerHTML += '<li style="padding-top: 15px; border-top: 1px solid #333; margin-top: 10px; color: #fbbf24;">⚠️ Some checks failed. Review the items above.</li>';
            }
          } catch (err) {
            checklist.innerHTML = '<li class="fail">Connection error: ' + err.message + '</li>';
            result.className = 'result error';
          }

          btn.disabled = false;
          btn.textContent = 'Run Validation Check';
        }
      </script>
    </body>
    </html>
  `);
});

// Setup validation endpoint
app.get('/api/validate-setup', async (req, res) => {
  const checks = [];

  // Check 1: API Key configured
  const hasApiKey = !!process.env.ODATA_KEY;
  checks.push({
    name: 'API Key Configured',
    pass: hasApiKey,
    detail: hasApiKey ? 'ODATA_KEY is set' : 'Missing ODATA_KEY environment variable'
  });

  // Check 2: Server responding
  checks.push({
    name: 'Server Online',
    pass: true,
    detail: 'Express server running on port ' + PORT
  });

  // Check 3: Can generate image
  try {
    const imageStart = Date.now();
    await getImage();
    const imageTime = Date.now() - imageStart;
    checks.push({
      name: 'Image Generation',
      pass: true,
      detail: 'Generated in ' + imageTime + 'ms'
    });
  } catch (err) {
    checks.push({
      name: 'Image Generation',
      pass: false,
      detail: err.message
    });
  }

  // Check 4: Data available
  try {
    const data = await getData();
    const hasTrains = data.trains && data.trains.length > 0;
    const hasTrams = data.trams && data.trams.length > 0;
    checks.push({
      name: 'Train Data',
      pass: hasTrains,
      detail: hasTrains ? data.trains.length + ' departures' : 'No train data (API may be unavailable)'
    });
    checks.push({
      name: 'Tram Data',
      pass: hasTrams,
      detail: hasTrams ? data.trams.length + ' departures' : 'No tram data (API may be unavailable)'
    });
  } catch (err) {
    checks.push({
      name: 'Data Fetch',
      pass: false,
      detail: err.message
    });
  }

  // Check 5: API connection status
  checks.push({
    name: 'API Connection Health',
    pass: connectionStatus.consecutiveFailures < 3,
    detail: connectionStatus.lastSuccess
      ? 'Last success: ' + new Date(connectionStatus.lastSuccess).toLocaleTimeString()
      : (connectionStatus.lastError || 'No connection attempts yet')
  });

  // Check 6: Webhook endpoint accessible
  checks.push({
    name: 'Webhook Endpoint',
    pass: true,
    detail: '/api/screen ready for TRMNL'
  });

  res.json({
    timestamp: new Date().toISOString(),
    allPass: checks.every(c => c.pass),
    checks
  });
});

// TRMNL Test Card - simple endpoint to verify connection
app.get('/api/test-card', (req, res) => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Melbourne',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  res.json({
    merge_variables: {
      screen_text: [
        '✓ CONNECTION SUCCESSFUL',
        '',
        'PTV-TRMNL is working!',
        '',
        'Server Time: ' + timeStr,
        'Timezone: Australia/Melbourne',
        '',
        'Your TRMNL device has',
        'successfully connected to',
        'the PTV departure display.',
        '',
        'Switch to /api/screen for',
        'live train & tram data.'
      ].join('\\n')
    }
  });
});

// Preview HTML page
app.get('/preview', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>PTV-TRMNL Preview</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .endpoints { list-style: none; padding: 0; }
        .endpoints li { margin: 10px 0; }
        .endpoints a { color: #0066cc; text-decoration: none; }
        .endpoints a:hover { text-decoration: underline; }
        img { max-width: 100%; border: 1px solid #ddd; margin-top: 20px; }
      </style>
      <script>
        setInterval(() => {
          document.getElementById('live-image').src = '/api/live-image.png?t=' + Date.now();
        }, 30000);
      </script>
    </head>
    <body>
      <h1>🚊 PTV-TRMNL Preview</h1>
      <div class="info">
        <h2>Available Endpoints:</h2>
        <ul class="endpoints">
          <li><a href="/api/status">/api/status</a> - Server status and data summary</li>
          <li><a href="/api/screen">/api/screen</a> - TRMNL JSON markup</li>
          <li><a href="/api/live-image.png">/api/live-image.png</a> - Live PNG image</li>
        </ul>
      </div>
      <h2>Live Display:</h2>
      <img id="live-image" src="/api/live-image.png" alt="Live TRMNL Display">
      <p style="color: #666; font-size: 14px;">Image refreshes every 30 seconds</p>
    </body>
    </html>
  `);
});

/* =========================================================
   START SERVER
   ========================================================= */

app.listen(PORT, () => {
  console.log(`🚀 PTV-TRMNL server listening on port ${PORT}`);
  console.log(`📍 Preview: http://localhost:${PORT}/preview`);
  console.log(`🔗 TRMNL endpoint: http://localhost:${PORT}/api/screen`);

  // Pre-warm cache
  getData().then(() => {
    console.log('✅ Initial data loaded');
  }).catch(err => {
    console.warn('⚠️  Initial data load failed:', err.message);
  });

  // Set up refresh cycle
  setInterval(() => {
    getData().catch(err => console.warn('Background refresh failed:', err.message));
  }, config.refreshSeconds * 1000);
});

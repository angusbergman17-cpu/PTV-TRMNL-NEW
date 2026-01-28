# Distribution Endpoints Specification

**Required Server Endpoints for Self-Service Deployment**

**Copyright (c) 2026 Angus Bergman**
**Licensed under CC BY-NC 4.0**

---

## Overview

These endpoints are required for the user distribution model to work correctly. The device firmware and Kindle software depend on these endpoints existing on the user's deployed server.

---

## Critical Endpoints

### 1. Setup Status Check

**Purpose:** Device polls this to check if user has completed setup wizard.

```
GET /api/setup-status
```

**Response (Setup NOT complete):**
```json
{
    "setupComplete": false,
    "serverTime": "2026-01-28T08:05:00.000Z",
    "version": "3.0.0"
}
```

**Response (Setup complete):**
```json
{
    "setupComplete": true,
    "serverTime": "2026-01-28T08:05:00.000Z",
    "version": "3.0.0",
    "homeStop": {
        "name": "Toorak Rd/Chapel St",
        "id": "2501"
    },
    "workStop": {
        "name": "Flinders Street Station",
        "id": "19854"
    }
}
```

**Implementation:**
```javascript
app.get('/api/setup-status', (req, res) => {
    const preferences = loadPreferences();
    
    const setupComplete = !!(
        preferences.homeAddress && 
        preferences.workAddress && 
        preferences.homeStop
    );
    
    const response = {
        setupComplete,
        serverTime: new Date().toISOString(),
        version: process.env.npm_package_version || '3.0.0'
    };
    
    if (setupComplete) {
        response.homeStop = preferences.homeStop;
        response.workStop = preferences.workStop;
    }
    
    res.json(response);
});
```

---

### 2. Zone Data (TRMNL Devices)

**Purpose:** Returns zone-based data for partial refresh.

```
GET /api/zones
```

**Query Parameters:**
- `device` (optional): Device type for formatting

**Response:**
```json
{
    "timestamp": "2026-01-28T08:05:00.000Z",
    "zones": {
        "header": {
            "time": "08:05",
            "date": "Mon 28 Jan",
            "changed": true
        },
        "transit": {
            "departures": [
                {
                    "route": "58",
                    "destination": "West Coburg",
                    "time": "NOW",
                    "platform": null,
                    "delay": 0
                },
                {
                    "route": "58",
                    "destination": "West Coburg",
                    "time": "3 min",
                    "platform": null,
                    "delay": 0
                }
            ],
            "changed": true
        },
        "footer": {
            "journeyTime": "18 min",
            "coffeeStop": "Norman Hotel",
            "changed": false
        }
    },
    "fullRefreshDue": false,
    "nextRefreshMs": 20000
}
```

**Implementation:**
```javascript
app.get('/api/zones', async (req, res) => {
    const preferences = loadPreferences();
    const departures = await fetchDepartures(preferences);
    
    const zones = {
        header: {
            time: formatTime(new Date()),
            date: formatDate(new Date()),
            changed: true  // Always update time zone
        },
        transit: {
            departures: formatDepartures(departures),
            changed: hasChanged(departures, lastDepartures)
        },
        footer: {
            journeyTime: calculateJourneyTime(departures),
            coffeeStop: preferences.coffeeStop,
            changed: false
        }
    };
    
    res.json({
        timestamp: new Date().toISOString(),
        zones,
        fullRefreshDue: shouldFullRefresh(),
        nextRefreshMs: 20000
    });
});
```

---

### 3. TRMNL Screen Webhook

**Purpose:** Returns PNG image for TRMNL BYOS webhook.

```
GET /api/screen
```

**Response Headers:**
```
Content-Type: image/png
```

**Response Body:** Raw PNG image (800x480 for OG, 400x300 for Mini)

**Implementation:**
```javascript
app.get('/api/screen', async (req, res) => {
    const preferences = loadPreferences();
    const departures = await fetchDepartures(preferences);
    
    // Render dashboard to PNG
    const png = await renderDashboardPNG({
        width: 800,
        height: 480,
        departures,
        preferences
    });
    
    res.set('Content-Type', 'image/png');
    res.send(png);
});
```

---

### 4. Kindle Image Endpoint

**Purpose:** Returns device-specific PNG for Kindle displays.

```
GET /api/kindle/image
```

**Query Parameters:**
- `device` (required): `kindle-pw3`, `kindle-pw5`, `kindle-basic`

**Device Resolutions:**
| Device | Width | Height |
|--------|-------|--------|
| kindle-pw3 | 758 | 1024 |
| kindle-pw5 | 1236 | 1648 |
| kindle-basic | 600 | 800 |

**Response Headers:**
```
Content-Type: image/png
```

**Response Body:** Raw PNG image at device resolution

**Implementation:**
```javascript
const KINDLE_RESOLUTIONS = {
    'kindle-pw3': { width: 758, height: 1024 },
    'kindle-pw5': { width: 1236, height: 1648 },
    'kindle-basic': { width: 600, height: 800 }
};

app.get('/api/kindle/image', async (req, res) => {
    const device = req.query.device || 'kindle-pw3';
    const resolution = KINDLE_RESOLUTIONS[device];
    
    if (!resolution) {
        return res.status(400).json({ error: 'Unknown device type' });
    }
    
    const preferences = loadPreferences();
    const departures = await fetchDepartures(preferences);
    
    const png = await renderDashboardPNG({
        ...resolution,
        departures,
        preferences,
        orientation: 'portrait'  // Kindle is portrait
    });
    
    res.set('Content-Type', 'image/png');
    res.send(png);
});
```

---

### 5. HTML Dashboard

**Purpose:** Browser-viewable dashboard for preview and Kindle browser mode.

```
GET /api/dashboard
```

**Query Parameters:**
- `device` (optional): Device type for formatting
- `orientation` (optional): `portrait` or `landscape`

**Response Headers:**
```
Content-Type: text/html
```

**Response Body:** HTML page optimized for e-ink display

---

### 6. Setup Wizard

**Purpose:** Web UI for configuring journey preferences.

```
GET /setup
```

**Response:** HTML page with step-by-step wizard

**Required Steps:**
1. API Configuration (optional)
2. Location Configuration (addresses)
3. Transit Stop Selection
4. Completion/Preview

---

### 7. Admin Panel

**Purpose:** Full configuration interface.

```
GET /admin
```

**Response:** HTML page with admin controls

---

## Health Check Endpoints

### Server Status

```
GET /api/status
```

**Response:**
```json
{
    "status": "ok",
    "version": "3.0.0",
    "uptime": 3600,
    "apis": {
        "transitVictoria": {
            "configured": true,
            "lastCheck": "2026-01-28T08:00:00.000Z",
            "healthy": true
        },
        "googlePlaces": {
            "configured": true,
            "healthy": true
        }
    }
}
```

### Device Registration

```
POST /api/device/register
```

**Request Body:**
```json
{
    "deviceId": "AA:BB:CC:DD:EE:FF",
    "deviceType": "trmnl-og",
    "firmwareVersion": "5.15"
}
```

**Response:**
```json
{
    "registered": true,
    "deviceId": "AA:BB:CC:DD:EE:FF",
    "serverUrl": "https://ptv-trmnl-user.vercel.app"
}
```

---

## Configuration Save Endpoints

### Save Preferences

```
POST /api/preferences
```

**Request Body:**
```json
{
    "homeAddress": "1 Clara Street, South Yarra VIC 3141",
    "workAddress": "80 Collins Street, Melbourne VIC 3000",
    "homeStop": {
        "id": "2501",
        "name": "Toorak Rd/Chapel St",
        "type": "tram"
    },
    "workStop": {
        "id": "19854",
        "name": "Flinders Street Station",
        "type": "train"
    },
    "arrivalTime": "08:30",
    "coffeeStop": {
        "name": "Norman Hotel",
        "enabled": true
    }
}
```

**Response:**
```json
{
    "saved": true,
    "timestamp": "2026-01-28T08:05:00.000Z"
}
```

### Validate API Key

```
POST /api/validate-key
```

**Request Body:**
```json
{
    "keyType": "odata",
    "apiKey": "ce606b90-9ffb-43e8-bcd7-0c2bd0498367"
}
```

**Response:**
```json
{
    "valid": true,
    "keyType": "odata",
    "message": "Transport Victoria API key is valid"
}
```

---

## Error Responses

All endpoints should return consistent error format:

```json
{
    "error": true,
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
}
```

**Common Error Codes:**
- `SETUP_INCOMPLETE` - User hasn't completed setup
- `API_KEY_INVALID` - Configured API key is invalid
- `FETCH_FAILED` - Failed to fetch transit data
- `DEVICE_UNKNOWN` - Unknown device type specified
- `RATE_LIMITED` - Too many requests

---

## CORS Configuration

For web flasher and admin panel to work:

```javascript
app.use(cors({
    origin: true,  // Allow all origins (user's own server)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Device-ID']
}));
```

---

## Rate Limiting

Recommended limits:
- `/api/zones`: 6 requests/minute per device
- `/api/screen`: 6 requests/minute per device  
- `/api/kindle/image`: 2 requests/minute per device
- `/api/status`: 60 requests/minute
- `/setup`, `/admin`: No limit

---

**Copyright (c) 2026 Angus Bergman**
**Licensed under CC BY-NC 4.0**

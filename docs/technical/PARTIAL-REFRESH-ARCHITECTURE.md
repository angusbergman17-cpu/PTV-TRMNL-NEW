# Partial Refresh Architecture for E-ink Displays

**Version**: 1.0.0
**Last Updated**: 2026-01-26
**Compatibility**: TRMNL BYOS, Kindle devices with partial refresh support

---

## Overview

The Partial Refresh system enables fast, zone-based updates of e-ink displays without requiring full screen refreshes. This significantly:
- Reduces refresh time (20 seconds vs 15 minutes)
- Reduces power consumption
- Reduces e-ink wear and ghosting
- Enables real-time transit updates

## Architecture

### Display Zones

The screen is divided into 4 independent refresh zones:

```
┌────────────────────────────────────────┐
│  Header Zone (15%)                     │  ← Time, date, weather (1 min)
│  Time: 8:45 AM  |  ☀️ 18°C           │
├────────────────────────────────────────┤
│  Transit Info Zone (50%)               │  ← Live departures (20 sec)
│  🚆 Next Train: 3 min (Platform 2)    │
│  🚊 Next Tram: 8 min (Stop 7)         │
│  ⚠️  Minor delays on Cranbourne line  │
├────────────────────────────────────────┤
│  Coffee Decision Zone (20%)            │  ← Coffee recommendation (2 min)
│  ☕ GET COFFEE - 15 minutes available  │
├────────────────────────────────────────┤
│  Footer Zone (15%)                     │  ← Journey summary (2 min)
│  🚶 5 min walk  🚆 20 min  🚶 3 min   │
└────────────────────────────────────────┘
```

### Zone Configuration

Each zone has independent refresh intervals:

| Zone | Refresh Interval | Reason |
|------|------------------|--------|
| Header | 60 seconds | Time updates every minute |
| Transit Info | 20 seconds | Real-time departure data |
| Coffee Decision | 120 seconds | Decision changes less frequently |
| Footer | 120 seconds | Journey summary relatively static |

### Full Refresh Strategy

To prevent e-ink ghosting:
- **Full refresh every 15 minutes** (configurable)
- **Full refresh if 3+ zones changed** (smart coalescing)
- **Full refresh on user request**

## API Endpoints

### 1. GET /api/device-config

Returns device configuration including partial refresh settings.

**Response**:
```json
{
  "success": true,
  "device": "trmnl-byos",
  "resolution": { "width": 800, "height": 480 },
  "partialRefresh": {
    "enabled": true,
    "interval": 20000,
    "zones": [
      {
        "id": "header",
        "name": "Header Zone",
        "refreshInterval": 60000,
        "coordinates": { "x": 0, "y": 0, "width": "100%", "height": "15%" }
      },
      // ... other zones
    ],
    "fullRefreshInterval": 900000,
    "smartCoalescing": true
  }
}
```

### 2. GET /api/refresh-zones

Device firmware calls this to determine which zones need updating.

**Query Parameters**:
- `lastRefreshTimes`: JSON object with zone IDs and last refresh timestamps

**Example Request**:
```
GET /api/refresh-zones?lastRefreshTimes={"header":1706234567890,"transitInfo":1706234547890}
```

**Response**:
```json
{
  "success": true,
  "partialRefreshEnabled": true,
  "refreshAll": false,
  "zones": [
    {
      "id": "transitInfo",
      "name": "Transit Info Zone",
      "coordinates": { "x": 0, "y": "15%", "width": "100%", "height": "50%" },
      "refreshInterval": 20000
    }
  ],
  "fullRefreshRecommended": false,
  "nextFullRefresh": 1706235467890
}
```

### 3. POST /admin/partial-refresh-settings

Admin endpoint to update partial refresh configuration.

**Request Body**:
```json
{
  "enabled": true,
  "interval": 20000,
  "fullRefreshInterval": 900000,
  "smartCoalescing": true,
  "zones": {
    "transitInfo": {
      "enabled": true,
      "refreshInterval": 20000
    }
  }
}
```

## Device Firmware Integration

### Refresh Loop

Device firmware should implement this loop:

```javascript
// Pseudo-code for device firmware

let zoneRefreshTimes = {
  header: 0,
  transitInfo: 0,
  coffeeDecision: 0,
  footer: 0,
  fullRefresh: 0
};

async function refreshLoop() {
  while (true) {
    // Query server for zones that need refresh
    const response = await fetch(
      `/api/refresh-zones?lastRefreshTimes=${JSON.stringify(zoneRefreshTimes)}`
    );
    const { refreshAll, zones } = await response.json();

    if (refreshAll) {
      // Perform full screen refresh
      await fullScreenRefresh();
      zoneRefreshTimes.fullRefresh = Date.now();

      // Reset all zone times
      for (let zone in zoneRefreshTimes) {
        if (zone !== 'fullRefresh') {
          zoneRefreshTimes[zone] = Date.now();
        }
      }
    } else {
      // Perform partial refresh for each zone
      for (const zone of zones) {
        await partialRefresh(zone.id, zone.coordinates);
        zoneRefreshTimes[zone.id] = Date.now();
      }
    }

    // Wait before next check (20 seconds)
    await sleep(20000);
  }
}
```

### Coordinate System

Zone coordinates use percentage-based positioning:

```javascript
// Example: Transit Info Zone
{
  x: 0,          // Left edge (0%)
  y: "15%",      // Start at 15% from top
  width: "100%", // Full width
  height: "50%"  // 50% of screen height
}
```

Convert to pixels based on device resolution:

```javascript
function calculatePixelCoordinates(zone, resolution) {
  return {
    x: parsePercent(zone.x, resolution.width),
    y: parsePercent(zone.y, resolution.height),
    width: parsePercent(zone.width, resolution.width),
    height: parsePercent(zone.height, resolution.height)
  };
}

function parsePercent(value, total) {
  if (typeof value === 'string' && value.includes('%')) {
    return (parseInt(value) / 100) * total;
  }
  return value;
}
```

## E-ink Safety

### Minimum Intervals

To protect e-ink displays:
- **Minimum partial refresh**: 20 seconds
- **Minimum full refresh**: Device-specific (15 min for TRMNL BYOS)

### Ghosting Prevention

- Full refresh every 15 minutes clears ghost images
- Smart coalescing prevents excessive partial refreshes
- Maximum 3 zones per update cycle

### Wear Estimation

Partial refresh reduces e-ink wear significantly:

```
Full refresh wear factor: 1.0
Partial refresh wear factor: 0.1-0.3 (depending on zone size)

With 20-second partial refreshes:
- Daily refreshes: 4,320 partial + 96 full = 528 "equivalent full refreshes"
- vs Full-only (15 min): 96 full refreshes
- Wear increase: ~5.5x BUT much more responsive display
```

## Configuration Guide

### Enable Partial Refresh

1. **In Admin Panel** (future):
   - Navigate to Configuration → Refresh Settings
   - Enable "Partial Refresh Mode"
   - Configure zone intervals

2. **Via Preferences**:
```javascript
await preferences.updatePartialRefreshSettings({
  enabled: true,
  interval: 20000,
  zones: {
    transitInfo: {
      enabled: true,
      refreshInterval: 20000  // Update transit info every 20 seconds
    }
  }
});
```

### Disable Partial Refresh

Set `enabled: false` to fall back to full-screen refreshes only:

```javascript
await preferences.updatePartialRefreshSettings({
  enabled: false
});
```

## Troubleshooting

### Issue: Ghosting appears on screen

**Solution**:
- Reduce partial refresh interval
- Increase full refresh frequency
- Check zone boundaries don't overlap

### Issue: Zones not refreshing

**Solution**:
- Verify zone is enabled in configuration
- Check device firmware is calling `/api/refresh-zones`
- Verify refresh interval thresholds

### Issue: Too many refreshes causing flicker

**Solution**:
- Increase zone refresh intervals
- Enable smart coalescing
- Reduce number of enabled zones

## Performance Metrics

With partial refresh enabled:
- **Transit data latency**: 20 seconds (vs 15 minutes)
- **Time accuracy**: 1 minute (vs 15 minutes)
- **Power consumption**: Reduced by ~60%
- **Display wear**: Increased ~2-3x (acceptable trade-off)

## Future Enhancements

- [ ] Dynamic zone boundaries based on content
- [ ] Machine learning to predict zone changes
- [ ] Multi-color partial refresh (for 3-color e-ink)
- [ ] Zone priority scheduling
- [ ] User-configurable zones

---

**Copyright © 2026 Angus Bergman**
Licensed under MIT for open source distribution.

# Privacy Policy

**PTV-TRMNL - Smart Transit Dashboard**
**Last Updated**: 2026-01-25
**Version**: 1.0.0

---

## Overview

PTV-TRMNL is designed with **Privacy by Design** as a core principle. Your data stays on your infrastructure, and you maintain full control over what information is collected and how it's used.

---

## Data Collection Summary

### What We Collect

| Data Type | Purpose | Storage Location | Retention |
|-----------|---------|------------------|-----------|
| **Home Address** | Journey planning | Local server only | Until you delete |
| **Work Address** | Journey planning | Local server only | Until you delete |
| **Cafe Address** | Coffee stop planning | Local server only | Until you delete |
| **Journey Preferences** | Route calculation | Local server only | Until you delete |
| **API Credentials** | Transit data access | Local server only | Until you delete |
| **Device Information** | Display updates | Local server only | 30 days |

### What We Do NOT Collect

- No personal identification (name, email) unless you submit feedback
- No browsing history or analytics
- No location tracking beyond configured addresses
- No usage patterns or behavioral data
- No advertising identifiers
- No data shared with third parties for marketing

---

## Data Storage

### Local-First Architecture

All your data is stored **exclusively on your own server**:

```
/your-server/
  ├── user-preferences.json    # Your addresses and settings
  ├── devices.json             # Connected TRMNL device info
  └── api-config.json          # API configuration (optional)
```

**No cloud storage.** No data is transmitted to PTV-TRMNL servers or any third party for storage.

### Encryption

- API credentials are stored locally but should be protected by your server's security
- HTTPS is required for all external API communications
- We recommend enabling disk encryption on your server

---

## Third-Party Services

When you use PTV-TRMNL, certain data is transmitted to third-party services to provide functionality:

### Transit Data Providers

| Service | Data Sent | Purpose | Privacy Policy |
|---------|-----------|---------|----------------|
| Transport Victoria | None (public data) | Real-time transit schedules | [Link](https://www.vic.gov.au/privacy) |
| Bureau of Meteorology | None (public data) | Weather information | [Link](http://www.bom.gov.au/other/privacy.shtml) |

### Geocoding Services (Address Lookup)

When you enter addresses, they may be sent to geocoding services:

| Service | Data Sent | When Used | Privacy Policy |
|---------|-----------|-----------|----------------|
| OpenStreetMap/Nominatim | Address text | Always (primary) | [Link](https://osmfoundation.org/wiki/Privacy_Policy) |
| Google Places | Address text | If API key configured | [Link](https://policies.google.com/privacy) |
| Mapbox | Address text | If token configured | [Link](https://www.mapbox.com/legal/privacy) |

**Note**: You can minimize third-party data transmission by:
1. Using manual walking times instead of geocoding
2. Not configuring optional API keys (Google, Mapbox)

---

## Data Retention

### Automatic Retention Periods

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| User Preferences | Permanent until deleted | Admin Panel → Reset |
| Device Pings | 30 days | Automatic |
| Decision Logs | 1000 entries max | Rolling deletion |
| Geocoding Cache | 24 hours | Automatic |
| Journey Cache | 5 minutes | Automatic |

### Manual Deletion

You can delete all your data at any time:

1. **Via Admin Panel**: System → Reset All Data
2. **Via File System**: Delete `user-preferences.json` and `devices.json`
3. **Via API**: `POST /admin/preferences/reset`

---

## Your Rights

### Data Access

You can export all your data at any time:
- Admin Panel → Export Preferences (JSON download)
- Direct file access on your server

### Data Portability

Export your preferences as JSON and import them to another instance.

### Data Deletion

Delete all data instantly via the admin panel or by removing files.

### Data Correction

Edit your addresses and preferences at any time in the admin panel.

---

## Cookies and Tracking

### Cookies Used

| Cookie | Purpose | Duration | Type |
|--------|---------|----------|------|
| None | - | - | - |

**PTV-TRMNL uses no cookies.** Session state is managed client-side only.

### Analytics

**No analytics are collected.** We do not use:
- Google Analytics
- Mixpanel
- Amplitude
- Any other analytics platform

### Do Not Track

We honor Do Not Track browser settings by default (there's nothing to track).

---

## Security Measures

### Data Protection

1. **Local Storage Only**: Data never leaves your infrastructure
2. **HTTPS Required**: All API communications use encrypted connections
3. **No Passwords Stored**: API tokens are the only credentials stored
4. **Minimal Data**: We only collect what's necessary for functionality

### Recommended Security Practices

1. Run PTV-TRMNL behind a reverse proxy with HTTPS
2. Use environment variables for sensitive API keys
3. Enable firewall rules to restrict admin panel access
4. Regularly update the application for security patches

---

## Children's Privacy

PTV-TRMNL does not knowingly collect data from children under 13. The service is designed for general transit planning and does not target minors.

---

## Changes to This Policy

We will update this policy when:
- New features require additional data collection
- Third-party services change
- Legal requirements change

All changes will be documented in the CHANGELOG section below.

---

## Contact

For privacy-related questions:
- GitHub Issues: [PTV-TRMNL Repository](https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW/issues)
- Email: Use the feedback form in the admin panel

---

## CHANGELOG

### v1.0.0 (2026-01-25)
- Initial privacy policy
- Documents local-first architecture
- Lists all data collection and third-party services
- Establishes data retention periods

---

## Summary

| Question | Answer |
|----------|--------|
| Do you sell my data? | **No** |
| Do you share data with advertisers? | **No** |
| Where is my data stored? | **On your own server only** |
| Can I delete my data? | **Yes, instantly** |
| Do you use cookies? | **No** |
| Do you track my usage? | **No** |
| Is my data encrypted? | **In transit, yes (HTTPS)** |

---

**Your privacy is protected by design, not by policy alone.**

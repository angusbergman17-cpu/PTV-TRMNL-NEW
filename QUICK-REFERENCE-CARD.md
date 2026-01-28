# PTV-TRMNL Quick Reference Card

**Print this page for easy reference during setup**

---

## 📋 Deployment Checklist

```
□ 1. Fork repo: github.com/angusbergman17-cpu/PTV-TRMNL-NEW
     Your fork: github.com/________/ptv-trmnl-________

□ 2. Deploy server (pick one):
     □ Vercel: vercel.com/new (recommended)
     □ Render: render.com/new
     
     Your URL: https://ptv-trmnl-________.vercel.app
               OR
               https://ptv-trmnl-________.onrender.com

□ 3. Flash device:
     □ TRMNL: cd firmware && pio run -e trmnl -t upload
     □ Kindle: See KINDLE-DEPLOYMENT.md

□ 4. Configure:
     □ Connect to "PTV-TRMNL-Setup" WiFi
     □ Enter WiFi credentials at http://192.168.4.1
     □ Complete setup at https://your-server/setup
```

---

## 🖥️ Device Support

| Device | Chip | Status |
|--------|------|--------|
| TRMNL OG | ESP32-C3 | ✅ Yes |
| TRMNL Mini | ESP32-C3 | ✅ Yes |
| TRMNL X | Different | ⚠️ NO |
| Kindle PW3/4/5 | ARM | ✅ Yes* |
| Kindle Basic | ARM | ✅ Yes* |

*Requires jailbreak

---

## 🔧 Key Commands

```bash
# Build firmware (don't flash)
cd firmware && pio run -e trmnl

# Build and flash
cd firmware && pio run -e trmnl -t upload

# Monitor serial output
pio device monitor -b 115200

# Erase flash (if bricked)
esptool.py --port /dev/cu.usbmodem* erase_flash
```

---

## 📡 Server Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/setup` | Setup wizard |
| `/admin` | Admin panel |
| `/api/zones` | Device data |
| `/api/screen` | TRMNL image |
| `/api/kindle/image` | Kindle image |
| `/api/status` | Health check |

---

## 🔑 Environment Variables

```
ODATA_API_KEY=your-transport-victoria-key
GOOGLE_PLACES_API_KEY=your-google-places-key
```

**Get keys:**
- Transport Victoria: opendata.transport.vic.gov.au
- Google Places: console.cloud.google.com

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Device won't connect | Check WiFi is 2.4GHz |
| Stale data | Check server not sleeping |
| Server error | Check API keys valid |
| Device bricked | Erase flash, reflash |

---

## 📚 Documentation

- **[DISTRIBUTION.md](DISTRIBUTION.md)** - Full setup guide
- **[KINDLE-DEPLOYMENT.md](KINDLE-DEPLOYMENT.md)** - Kindle setup
- **[docs/hardware/DEVICE-COMPATIBILITY.md](docs/hardware/DEVICE-COMPATIBILITY.md)** - Device rules

---

## 🆘 Help

- **GitHub Issues**: Report bugs
- **GitHub Discussions**: Ask questions

---

**© 2026 Angus Bergman | CC BY-NC 4.0**

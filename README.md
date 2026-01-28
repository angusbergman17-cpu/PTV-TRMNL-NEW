# PTV-TRMNL - Smart Transit Display

> Real-time Australian public transit on e-ink displays (TRMNL, Kindle)

![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-blue)
![Version](https://img.shields.io/badge/version-3.0.0-green)

**📘 [Complete Distribution Guide](DISTRIBUTION.md)** - Full self-service deployment instructions

## 🎯 What is PTV-TRMNL?

A personal transit display system that shows real-time departure information on e-ink screens. Deploy your own instance with your own server - no dependency on external services.

**Features:**
- ⚡ 20-second zone refresh for live data
- 🖥️ Supports TRMNL and Kindle devices
- 🇦🇺 All Australian states supported
- 🔒 Your data stays on your server
- 🆓 Free to deploy (Vercel/Render)

## 🚀 Quick Start (30 Minutes)

### Step 1: Fork the Repository

1. [Fork this repo](https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW/fork) to your GitHub account
2. Name it uniquely: `ptv-trmnl-yourname`

### Step 2: Deploy Your Server

**Option A: Vercel (Recommended)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW&env=ODATA_API_KEY&envDescription=Optional%20Transport%20Victoria%20API%20key%20for%20live%20data&project-name=ptv-trmnl&repository-name=ptv-trmnl)

**Option B: Render**
- Import your fork at [render.com](https://render.com)
- Free tier available (sleeps after 15min)

Your server URL: `https://ptv-trmnl-yourname.vercel.app`

### Step 3: Flash Your Device

**TRMNL Devices (OG/Mini):**
```bash
cd firmware
pio run -e trmnl -t upload
```

**Kindle Devices:** See [KINDLE-DEPLOYMENT.md](KINDLE-DEPLOYMENT.md)

### Step 4: Configure Your Journey

1. Power on device → Connect to `PTV-TRMNL-Setup` WiFi
2. Enter your WiFi credentials + server URL
3. Visit `https://ptv-trmnl-yourname.vercel.app/setup`
4. Complete the setup wizard

📘 **[Full Guide →](DISTRIBUTION.md)**

## 📱 Supported Devices

| Device | Status | Notes |
|--------|--------|-------|
| **TRMNL OG** | ✅ Full Support | 800x480 e-ink, ESP32-C3 |
| **TRMNL Mini** | ✅ Full Support | 400x300 e-ink, ESP32-C3 |
| **TRMNL X** | ⚠️ Not Yet | Different architecture |
| **Kindle Paperwhite 3/4/5** | ✅ Supported | Requires jailbreak |
| **Kindle Basic 10/11** | ✅ Supported | Requires jailbreak |

⚠️ **Device Rules:** Read [DEVICE-COMPATIBILITY.md](docs/hardware/DEVICE-COMPATIBILITY.md) before flashing

## ✨ Features

- **20-second zone refresh** - Partial updates for dynamic data
- **5-minute full refresh** - Eliminates ghosting
- **Black-flash technique** - Clean partial updates
- **Fallback timetables** - Works without API keys
- **All Australian states** - VIC, NSW, QLD, SA, WA, TAS, ACT, NT

## 🔧 Configuration

After deployment, visit `/setup` on your server to:
- Set home/work addresses
- Configure transit stops
- Add API keys (optional)
- Customize display

## 📡 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/zones` | Zone-based partial refresh data |
| `/api/dashboard` | Full dashboard HTML |
| `/api/status` | System status |
| `/setup` | Setup wizard |
| `/admin` | Admin panel |

## 🛠️ Development

```bash
# Clone repo
git clone https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW.git
cd PTV-TRMNL-NEW

# Install dependencies
npm install

# Run locally
npm run dev

# Build firmware
cd firmware && pio run
```

## 📄 License

CC BY-NC 4.0 - See [LICENSE](LICENSE)

© 2026 Angus Bergman

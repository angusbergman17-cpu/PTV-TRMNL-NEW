# Deploy PTV-TRMNL to Render.com

Complete guide to deploying the PTV-TRMNL Smart Transit System to Render's free tier.

**Time Required**: ~10 minutes
**Cost**: $0 (Free tier)
**Prerequisites**: GitHub account, PTV API credentials

---

## Prerequisites

Before starting, ensure you have:

✅ **GitHub Repository**: Fork or clone https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW
✅ **Render Account**: Sign up at https://render.com (free)
✅ **PTV API Credentials**: Get from https://opendata.transport.vic.gov.au/
   - Developer ID (API key)
   - Security Token (JWT)

**Optional**:
- Google Places API key (better address search)
- Custom domain (for professional URL)

---

## Step 1: Connect GitHub Repository

1. **Log into Render**
   - Go to https://dashboard.render.com
   - Sign in with GitHub (recommended) or email

2. **Create New Web Service**
   - Click **"New +"** button (top right)
   - Select **"Web Service"**

3. **Connect Repository**
   - Choose **"Build and deploy from a Git repository"**
   - Click **"Connect GitHub"** if not already connected
   - Find repository: `PTV-TRMNL-NEW`
   - Click **"Connect"**

---

## Step 2: Configure Service Settings

Fill in the service configuration:

### Basic Settings
```
Name:           ptv-trmnl
Region:         Oregon (US West) - or closest to you
Branch:         main
Root Directory: (leave blank)
```

### Build & Deploy
```
Runtime:        Node
Build Command:  npm install --no-audit --no-fund
Start Command:  node server.js
```

### Instance Type
```
Plan:           Free
                (500 MB RAM, sleeps after 15 min inactivity)
```

**Note**: Free tier limitations:
- Service sleeps after 15 minutes of inactivity
- Cold start takes ~30 seconds on first request
- Fine for personal use, upgrade to Starter ($7/mo) for 24/7 uptime

---

## Step 3: Add Environment Variables

Click **"Advanced"** to expand environment variables section.

Add these variables (click **"Add Environment Variable"** for each):

### Required Variables

| Key | Value | Notes |
|-----|-------|-------|
| `ODATA_API_KEY` | `your-developer-id` | From PTV Open Data Portal |
| `ODATA_TOKEN` | `your-jwt-token` | Long JWT string from PTV |
| `NODE_ENV` | `production` | Enables production mode |

### Optional Variables

| Key | Value | Notes |
|-----|-------|-------|
| `GOOGLE_PLACES_KEY` | `your-google-key` | Better cafe search (optional) |
| `PORT` | (auto-set by Render) | Don't manually set |

**Example**:
```
ODATA_API_KEY=ce606b90-9ffb-43e8-bcd7-0c2bd0498367
ODATA_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

**Important**: Never commit these to GitHub! Only set in Render dashboard.

---

## Step 4: Create Web Service

1. **Review Settings**
   - Double-check all fields
   - Verify environment variables are set

2. **Click "Create Web Service"**
   - Render will start building immediately
   - Watch build logs in real-time

3. **Build Process** (~2-3 minutes)
   ```
   ==> Cloning from https://github.com/user/PTV-TRMNL-NEW...
   ==> Running build command: npm install...
   ==> Build successful!
   ==> Starting service: node server.js
   ==> Deploy live at: https://ptv-trmnl-new.onrender.com
   ```

4. **Wait for "Live" Status**
   - Green checkmark appears when ready
   - Service URL becomes active

---

## Step 5: Verify Deployment

### Test Endpoints

**Health Check**:
```
https://your-app.onrender.com/api/status
```
Expected response:
```json
{
  "status": "online",
  "timestamp": "2026-01-23T12:00:00.000Z",
  "uptime": 123.45
}
```

**Admin Panel**:
```
https://your-app.onrender.com/admin
```
Should load complete admin interface.

**Device Endpoint** (TRMNL webhook):
```
https://your-app.onrender.com/api/display
```
Should return JSON with `status: 0`.

---

## Step 6: Configure Admin Panel

1. **Open Admin Panel**
   ```
   https://your-app.onrender.com/admin
   ```

2. **Enter PTV API Credentials**
   - Scroll to "PTV API Credentials" section
   - Enter Developer ID (API Key)
   - Enter Security Token
   - Click "Save Credentials"
   - ✅ Verify green checkmark appears

3. **Configure User Preferences**
   - Enter **Home Address** (autocomplete enabled)
   - Enter **Preferred Cafe** (autocomplete enabled)
   - Enter **Work Address** (autocomplete enabled)
   - Set **Default Arrival Time** (e.g., 09:00)
   - Select **Transit Modes** (Train, Tram, Bus, V/Line)
   - Click **"💾 Save All Preferences"**

4. **Verify Auto-Calculation**
   - Route should auto-calculate after saving
   - Check "Smart Route Planner" section
   - Should show: "Must leave home at [time]"
   - Shows coffee time and all segments

**Success!** Your system is now live. ✅

---

## Step 7: Pair TRMNL Device (Optional)

If you have a TRMNL device:

### Configure Device Webhook

1. **Get Device Setup URL**
   ```
   https://your-app.onrender.com/api/setup
   ```
   Returns device registration JSON.

2. **Configure TRMNL Firmware**
   - In TRMNL configuration file:
   ```cpp
   #define WEBHOOK_URL "https://your-app.onrender.com/api/display"
   ```

3. **Flash Device**
   - Upload firmware to TRMNL
   - Device will auto-register on first connection
   - Check admin panel → "Connected Devices"

4. **Verify Display**
   - Device should show transit info within 30 seconds
   - Updates every 30 seconds automatically
   - Monitor in admin panel

---

## Step 8: Optional Enhancements

### Add Custom Domain

1. In Render dashboard → Settings → Custom Domains
2. Add your domain (e.g., `transit.yourdomain.com`)
3. Update DNS records as shown
4. Wait for SSL certificate (auto-generated)

### Prevent Cold Starts (Free Tier)

Use **UptimeRobot** or **cron-job.org** to ping your service:

1. Sign up at https://uptimerobot.com (free)
2. Add new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://your-app.onrender.com/api/keepalive`
   - **Interval**: 5 minutes
3. Service stays warm, no cold starts

**Note**: Render free tier still has limits. For 24/7 uptime, upgrade to Starter plan ($7/mo).

### Enable Auto-Deploy

Render auto-deploys on git push by default:

```bash
# Local changes
git add .
git commit -m "Update configuration"
git push origin main

# Render automatically:
# 1. Detects new commit
# 2. Rebuilds service
# 3. Deploys new version (~2-3 min)
```

---

## Troubleshooting

### Build Fails: "Module not found"

**Problem**: Missing dependencies

**Solution**:
```bash
# Locally verify package.json is complete
npm install
npm start

# If works locally, commit package-lock.json:
git add package-lock.json
git commit -m "Add package-lock"
git push
```

### Service Crashes on Startup

**Problem**: Missing environment variables

**Solution**:
1. Check Render logs: Dashboard → Logs
2. Look for error: "ODATA_TOKEN is not defined"
3. Add missing variables in Settings → Environment
4. Click "Manual Deploy" → "Deploy latest commit"

### "Service Unavailable" Error

**Problem**: Service is sleeping (free tier)

**Solution**:
- Wait 30 seconds for cold start
- Service will wake up automatically
- Consider UptimeRobot ping (see above)
- Or upgrade to Starter plan for always-on

### API Returns 401 Unauthorized

**Problem**: Invalid PTV credentials

**Solution**:
1. Verify credentials at https://opendata.transport.vic.gov.au/
2. Regenerate token if needed
3. Update in Render: Settings → Environment
4. Redeploy: Manual Deploy → Deploy latest commit

### Device Won't Connect

**Problem**: Webhook URL incorrect

**Solution**:
1. Verify URL in TRMNL firmware: `https://` (not `http://`)
2. Check service is live: visit `/api/status`
3. Test endpoint directly:
   ```bash
   curl https://your-app.onrender.com/api/display
   ```
4. Check device MAC address matches admin panel

---

## Monitoring and Maintenance

### Check Service Health

**Render Dashboard**:
- View logs in real-time
- Monitor memory usage
- Check deploy history
- View metrics (requests, response time)

**Admin Panel**:
```
https://your-app.onrender.com/admin
```
- Check system status
- Monitor connected devices
- View route calculations
- Test weather data

### Update Application

```bash
# Pull latest changes
git pull origin main

# Install new dependencies if any
npm install

# Test locally
npm start

# Commit and push
git add .
git commit -m "Update to latest version"
git push origin main

# Render auto-deploys new version
```

### Clear Caches

If data seems stale:
1. Open admin panel
2. Scroll to "Server Management"
3. Click "🗑️ Clear Caches"
4. Wait for confirmation

---

## Cost Breakdown

### Free Tier (Current Setup)
```
Render Free:       $0/month
PTV API:           $0/month (non-commercial use)
Nominatim:         $0/month (OpenStreetMap)
BOM Weather:       $0/month (Australian government)
-----------------------------------------
Total:             $0/month
```

### Recommended Upgrades (Optional)
```
Render Starter:    $7/month  (24/7 uptime, 512MB RAM)
Google Places:     $0-$20/mo (free tier usually enough)
Custom Domain:     $10-15/yr (via Namecheap, etc.)
-----------------------------------------
Total:             ~$7-10/month
```

---

## Support and Resources

**Official Render Docs**: https://render.com/docs
**PTV API Docs**: https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/ptv-timetable-api/
**Project Issues**: https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW/issues
**Support Development**: ☕ [Buy Me a Coffee](https://buymeacoffee.com/angusbergman)

---

## Next Steps

✅ Service deployed and running
✅ Admin panel configured
✅ Routes calculating successfully

**Now**:
1. Bookmark admin panel URL
2. Configure TRMNL device (if applicable)
3. Test route planning with real addresses
4. Share with friends! 🚀

**Optional**:
- Set up UptimeRobot for keep-alive
- Add Google Places API for better search
- Configure custom domain
- Contribute to project on GitHub

---

**Deployment Guide Version**: 1.0
**Last Updated**: January 23, 2026
**Tested On**: Render Free Tier
**Status**: ✅ Production Ready

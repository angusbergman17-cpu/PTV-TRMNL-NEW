# Vercel Migration Guide - Complete Walkthrough

**Estimated Time**: 10 minutes
**Cost**: Free forever
**Difficulty**: Easy

---

## Why Migrate to Vercel?

✅ **Free unlimited builds** (no quota issues like Render)
✅ **Fast deployments** (30-60 seconds vs 2-5 minutes)
✅ **Auto-deploy on git push** (just like Render, but actually works)
✅ **Better free tier** (no pipeline minute limits)
✅ **Global CDN** (faster for your device)
✅ **Professional platform** (used by major companies)

---

## Step-by-Step Migration

### Step 1: Create Vercel Account (2 minutes)

1. Go to **https://vercel.com/signup**
2. Click **"Continue with GitHub"**
3. Sign in with your GitHub account
4. Authorize Vercel when prompted
5. Choose **"Hobby (Free)"** plan

**Result**: You'll land on the Vercel dashboard

---

### Step 2: Import Your Project (3 minutes)

1. On Vercel dashboard, click **"Add New"** (top right)
2. Select **"Project"**
3. Look for **"PTV-TRMNL-NEW"** in the repository list
   - If you don't see it, click "Import Git Repository" and paste:
     `https://github.com/angusbergman17-cpu/PTV-TRMNL-NEW`
4. Click **"Import"**

**Configuration Screen will appear:**

5. **Framework Preset**: Select **"Other"**
6. **Root Directory**: Leave as `.` (default)
7. **Build Command**: Leave empty or use `npm install`
8. **Output Directory**: Leave empty
9. **Install Command**: Leave as `npm install` (default)

10. Click **"Deploy"**

**Result**: Vercel will start building (watch the build logs)

---

### Step 3: Wait for Deployment (1-2 minutes)

You'll see:
```
Building...
├── Installing dependencies
├── Running build command
└── Deploying to production
```

**When complete, you'll see:**
```
✓ Deployment ready
Your project is live at: https://ptv-trmnl-new-[random].vercel.app
```

**Copy your Vercel URL!** (looks like: `https://ptv-trmnl-new-abc123.vercel.app`)

---

### Step 4: Test Your Vercel Deployment (1 minute)

Test in terminal:

```bash
# Replace YOUR-VERCEL-URL with your actual URL
curl https://YOUR-VERCEL-URL.vercel.app/api/version

# Should return:
# {
#   "version": "2.6.0",
#   "deployment": "v5.15-setup-flags",
#   ...
# }
```

Test setup flags:
```bash
curl https://YOUR-VERCEL-URL.vercel.app/api/display \
  -H 'ID:94A990' -H 'Access-Token:lvivfoczcv9oo8g8br6o5' -H 'FW-Version:5.15'

# Should include:
# "setup_addresses": true,
# "setup_transit_api": true,
# "setup_journey": true
```

**If both commands work, your Vercel deployment is successful!**

---

### Step 5: Update Firmware with New URL (3 minutes)

Once Vercel is working, update your device:

1. Open: `/Users/angusbergman/PTV-TRMNL-NEW/firmware/include/config.h`

2. Find line 11:
   ```cpp
   #define SERVER_URL "https://ptv-trmnl-new.onrender.com"
   ```

3. Change to your Vercel URL:
   ```cpp
   #define SERVER_URL "https://YOUR-VERCEL-URL.vercel.app"
   ```
   **Important**: No trailing slash!

4. Save the file

---

### Step 6: Update Firmware (Remove Forced Mode) (2 minutes)

While editing firmware, restore normal setup flag detection:

1. Open: `/Users/angusbergman/PTV-TRMNL-NEW/firmware/src/main.cpp`

2. Find lines ~391-393:
   ```cpp
   // TEMPORARY: Force dashboard display (Render deployment blocked - quota exceeded)
   bool forceEnableDashboard = true;
   ```

3. Change to:
   ```cpp
   // Normal operation - use server setup flags
   bool forceEnableDashboard = false;
   ```

4. Save the file

---

### Step 7: Flash Updated Firmware (2 minutes)

```bash
cd /Users/angusbergman/PTV-TRMNL-NEW/firmware
pio run -t upload
```

**Watch serial output:**
```bash
python3 tools/live-monitor.py
```

**You should see:**
```
Setup flags: ✓ Addresses, ✓ Transit API, ✓ Journey
✓ Setup complete - drawing live dashboard
Drawing LIVE dashboard...
```

---

## Verification Checklist

After migration, verify:

- [ ] Vercel URL responds to `/api/version` (returns 2.6.0)
- [ ] Vercel URL responds to `/api/display` (includes setup flags)
- [ ] Firmware updated with new URL
- [ ] Forced dashboard mode disabled (`forceEnableDashboard = false`)
- [ ] Device flashed successfully
- [ ] Serial output shows "✓ Setup complete"
- [ ] Display shows live dashboard
- [ ] Train times updating every 20 seconds

---

## Quick Reference Commands

### Test Vercel Deployment
```bash
# Version check
curl https://YOUR-VERCEL-URL.vercel.app/api/version

# Setup flags check
curl https://YOUR-VERCEL-URL.vercel.app/api/display \
  -H 'ID:94A990' \
  -H 'Access-Token:lvivfoczcv9oo8g8br6o5' \
  -H 'FW-Version:5.15' | python3 -m json.tool
```

### Flash Firmware
```bash
cd /Users/angusbergman/PTV-TRMNL-NEW/firmware
pio run -t upload
```

### Monitor Device
```bash
python3 /Users/angusbergman/PTV-TRMNL-NEW/firmware/tools/live-monitor.py
```

---

## Troubleshooting

### Vercel Build Fails

**Error**: Module not found
**Fix**: Ensure `package.json` has all dependencies
```bash
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push origin main
```
Then redeploy in Vercel dashboard.

---

### Firmware Won't Flash

**Error**: `ModuleJob._instantiate` or similar
**Fix**: This is a local server issue, doesn't affect Vercel migration

---

### Device Still Shows Setup Screen

**Check**:
1. Vercel URL in config.h is correct
2. `forceEnableDashboard = false` in main.cpp
3. Firmware was reflashed after changes
4. Device is connected to WiFi
5. Serial output shows successful connection

---

## Benefits After Migration

✅ **Automatic Deployments**
- Push to GitHub → auto-deploys to Vercel (instantly)
- No more quota issues
- No manual deploy needed

✅ **Proper Setup Flow**
- Setup flags work correctly
- Device auto-detects configuration
- Professional user experience

✅ **Better Performance**
- Global CDN (faster API responses)
- Better uptime than Render free tier
- Faster builds (30-60 seconds)

✅ **Free Forever**
- No build minute limits
- No pipeline quotas
- Same features as current setup

---

## Optional: Custom Domain

Want to use your own domain? (e.g., `ptv.yourdomain.com`)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your domain
4. Follow Vercel's DNS instructions
5. Update firmware with custom domain
6. Reflash device

---

## Rollback Plan (If Needed)

If something goes wrong, you can instantly rollback:

**Keep Render temporarily:**
- Device will continue working with forced dashboard mode
- Render URL is still `https://ptv-trmnl-new.onrender.com`
- Old firmware still has Render URL

**Quick rollback:**
1. Change config.h back to Render URL
2. Re-enable `forceEnableDashboard = true`
3. Reflash firmware

---

## Summary

**Before Migration**:
- ❌ Render out of quota
- ❌ Can't deploy new code
- ⚠️ Using forced dashboard mode workaround

**After Migration**:
- ✅ Vercel unlimited builds
- ✅ Auto-deploy working
- ✅ Proper setup flag detection
- ✅ Professional deployment pipeline

**Time Investment**: 10 minutes
**Cost**: $0 (free forever)
**Complexity**: Easy (just follow steps)

---

## Ready to Migrate?

Start here: **https://vercel.com/signup**

Then follow steps 1-7 above!

---

## Questions?

Common questions:

**Q: Will my data/preferences be lost?**
A: No! Preferences are stored in `user-preferences.json` which you'll copy to Vercel.

**Q: Can I keep Render as backup?**
A: Yes! Both can run simultaneously.

**Q: What if Vercel also hits limits?**
A: Vercel's free tier is much more generous - unlikely to hit limits.

**Q: Do I need to change anything in the admin panel?**
A: No, the admin panel is part of the server and moves with it.

---

**Let's get you migrated to Vercel for a better deployment experience!**

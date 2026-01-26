# Public Repository Setup Instructions

This document explains how to create a public-facing repository from your private development repo.

---

## Goal

Create a clean, public repository where users can:
- ✅ View and fork the code
- ✅ Download and use the project
- ✅ Submit issues and discussions
- ❌ Push changes or modify the original

**Two Repositories:**
1. `ptv-trmnl-new` (Private Development) - Your testing and development repo
2. `ptv-trmnl` (Public Release) - Clean public release for users

---

## Step 1: Create Public Repository

### On GitHub:

1. Go to https://github.com/new
2. Repository name: `ptv-trmnl`
3. Description:
   ```
   Smart transit dashboard for Australia - Never miss your train again.
   Works across all 8 states with real-time departures and smart "leave by" calculations.
   ```
4. **Public** (important!)
5. **DO NOT** initialize with README (we'll push from existing repo)
6. Click "Create repository"

---

## Step 2: Prepare Clean Release

### In your development repo:

```bash
cd /path/to/PTV-TRMNL-NEW

# Ensure everything is committed
git status

# Create a new branch for public release
git checkout -b public-release

# Remove any private/sensitive files (if any)
# Check .gitignore is comprehensive
cat .gitignore

# Ensure .env is in .gitignore (it should be)
echo ".env" >> .gitignore  # if not already there

# Commit any final changes
git add .
git commit -m "Prepare for public release"
```

---

## Step 3: Push to Public Repository

```bash
# Add public repo as new remote
git remote add public https://github.com/YOUR-USERNAME/ptv-trmnl.git

# Push to public repo
git push public public-release:main

# Verify
git remote -v
# Should show:
# origin: ptv-trmnl-new (your dev repo)
# public: ptv-trmnl (public repo)
```

---

## Step 4: Configure Public Repository

### On GitHub (public repo):

1. **Settings → General**
   - Features:
     - ✅ Issues
     - ✅ Discussions
     - ✅ Projects (optional)
     - ❌ Wiki (use README instead)
     - ✅ Sponsorships

2. **Settings → Options**
   - Default branch: `main`
   - Template repository: ❌ No
   - Require PR reviews: ✅ Yes
   - Require status checks: ✅ Yes

3. **Settings → Branches**
   - Add branch protection rule for `main`:
     - ✅ Require pull request reviews (1 approval)
     - ✅ Require status checks to pass
     - ✅ Require conversation resolution
     - ✅ Include administrators (yes, even you!)

   This prevents direct pushes and requires PRs even from you.

4. **Settings → Moderation**
   - Code of Conduct: Choose "Contributor Covenant"
   - Issue templates: Add bug report and feature request

---

## Step 5: Add Topics (Tags)

Add relevant topics to help users find the repo:

```
public-transport
transit
dashboard
e-ink
esp32
melbourne
australia
gtfs
real-time
open-source
smart-home
byos
trmnl
```

---

## Step 6: Configure Repository Settings

### Add shields/badges to README:

```markdown
![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-blue.svg)
![GitHub stars](https://img.shields.io/github/stars/YOUR-USERNAME/ptv-trmnl)
![GitHub forks](https://img.shields.io/github/forks/YOUR-USERNAME/ptv-trmnl)
![GitHub issues](https://img.shields.io/github/issues/YOUR-USERNAME/ptv-trmnl)
![Deployment](https://img.shields.io/badge/deploy-Render-brightgreen)
```

---

## Step 7: Create Initial Release

### Tag the first release:

```bash
# In public repo
git tag -a v3.0.0 -m "Initial public release

- Complete rebuild for all 8 Australian states
- Dark, clean UI with architecture visualizations
- Comprehensive documentation
- Automated setup scripts
- Zero-cost deployment guide"

git push public v3.0.0
```

### On GitHub:

1. Go to Releases
2. Click "Create a new release"
3. Tag: `v3.0.0`
4. Title: `PTV-TRMNL v3.0.0 - Initial Public Release`
5. Description: (see release notes below)
6. Attach pre-built firmware binary (optional)
7. Mark as "Latest release"
8. Click "Publish release"

---

## Step 8: Ongoing Workflow

### Development (ptv-trmnl-new):

```bash
# Work in your private dev repo
cd /path/to/ptv-trmnl-new
git checkout main

# Make changes, test, commit
git add .
git commit -m "Your changes"
git push origin main
```

### Publishing to Public (when ready):

```bash
# 1. Ensure dev repo is clean
git status

# 2. Merge to public-release branch
git checkout public-release
git merge main

# 3. Push to public repo
git push public public-release:main

# 4. Create release on GitHub if major changes
git tag -a v3.0.1 -m "Bug fixes and improvements"
git push public v3.0.1
```

---

## Step 9: User Permissions

### Who can do what:

| Action | You (Owner) | Public Users |
|--------|-------------|--------------|
| View code | ✅ | ✅ |
| Clone/Fork | ✅ | ✅ |
| Open issues | ✅ | ✅ |
| Comment | ✅ | ✅ |
| Submit PRs | ✅ | ✅ |
| Push to main | ✅ (with PR) | ❌ |
| Merge PRs | ✅ | ❌ |
| Modify settings | ✅ | ❌ |
| Create releases | ✅ | ❌ |

---

## Step 10: Documentation Updates

Update README to point users to public repo:

```markdown
## Installation

1. **Fork this repository**: Click "Fork" button on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/ptv-trmnl.git
   cd ptv-trmnl
   ```
3. **Follow the setup guide**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)
```

---

## Sample Release Notes (v3.0.0)

```markdown
# PTV-TRMNL v3.0.0 - Initial Public Release

## What is PTV-TRMNL?

A free, open-source transit dashboard that works across all 8 Australian states.
Shows exactly when to leave home, whether you have time for coffee, and your next
departures - all on a single glanceable display.

## Highlights

🗺️ **Location-Agnostic**: Works in VIC, NSW, QLD, SA, WA, TAS, ACT, NT
🆓 **Zero Cost**: Uses free tiers for everything (Render, GTFS data)
📊 **Smart Planning**: Auto-detects your state and optimal transit route
☕ **Coffee Decision**: Tells you if you have time to grab coffee
🔋 **Battery Efficient**: Partial refresh for e-ink displays
📱 **Works Anywhere**: E-ink device, browser, tablet, phone

## Installation

30-minute setup with included guide:
1. Fork this repository
2. Deploy to Render (free)
3. Configure addresses
4. Flash device (optional)

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete instructions.

## What's Included

- Express.js server with 53 API endpoints
- ESP32-C3 firmware for TRMNL devices
- React admin panel with dark theme
- Architecture visualizations
- Complete documentation
- Automated setup scripts

## Data Sources

- GTFS Static: All 8 states (built-in fallback)
- GTFS Realtime: Victorian transport (optional)
- Weather: Bureau of Meteorology
- Geocoding: OpenStreetMap Nominatim (free)

## Requirements

- GitHub account (free)
- Render account (free)
- TRMNL device (optional - works in browser)

## Support

- 📖 Documentation: See `docs/` folder
- 🐛 Issues: Open a GitHub issue
- 💬 Discussions: GitHub Discussions
- ☕ Support: [Buy Me a Coffee](https://buymeacoffee.com/angusbergman)

## License

CC BY-NC 4.0 - Free for personal use with attribution

---

**Made with care in Melbourne** (but works everywhere in Australia!)
```

---

## Security Checklist

Before making public, ensure:

- [ ] No API keys in code
- [ ] No personal information
- [ ] No server URLs with credentials
- [ ] .env.example only (not .env)
- [ ] Secrets properly documented in SETUP_GUIDE
- [ ] Dependencies up to date
- [ ] Vulnerabilities checked (`npm audit`)
- [ ] License file present
- [ ] Copyright notices in place

---

## Ready to Launch Checklist

- [ ] Public repo created
- [ ] Code pushed to public repo
- [ ] Branch protection rules configured
- [ ] Repository topics/tags added
- [ ] Initial release created (v3.0.0)
- [ ] README shields/badges added
- [ ] Issues enabled
- [ ] Discussions enabled
- [ ] FUNDING.yml created (for Buy Me a Coffee)
- [ ] Security policy added
- [ ] Contributing guidelines added
- [ ] Code of conduct added

---

## After Launch

1. **Monitor Issues**: Respond within 24-48 hours
2. **Welcome Contributors**: Be friendly and encouraging
3. **Merge PRs**: Review carefully, test before merging
4. **Update Documentation**: Keep README and guides current
5. **Regular Releases**: Tag versions for significant changes
6. **Engage Community**: Answer questions, provide support
7. **Sync from Dev**: Push tested changes from private repo

---

## GitHub Actions (Optional)

Create `.github/workflows/test.yml` for automated testing:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

---

## Summary

**Private Repo (ptv-trmnl-new)**:
- Your personal testing ground
- Can push directly
- Experimental features
- Private issues and notes

**Public Repo (ptv-trmnl)**:
- Clean, production-ready code
- Users can fork and use
- Public issues and discussions
- Release tags for versions
- Community contributions welcome

**Workflow**:
1. Develop in private repo
2. Test thoroughly
3. Merge to public-release branch
4. Push to public repo
5. Create release if significant changes
6. Engage with community

---

**Questions?** Check out:
- GitHub Docs: https://docs.github.com/en/repositories
- Open Source Guide: https://opensource.guide/

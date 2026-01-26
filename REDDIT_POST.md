# Reddit Post for r/melbourne and r/australia

## Title Option 1 (r/melbourne)
Open-source transit dashboard for Melbourne commuters - shows exactly when to leave for work

## Title Option 2 (r/australia)
Built an open-source transit dashboard that works across all Australian states

## Post Content

I've built a free, open-source transit dashboard that calculates when you need to leave home based on real-time departure data. Works with any e-ink display or can be viewed in a browser.

**What it does:**
- Calculates exact "leave by" time based on your home and work addresses
- Shows next departures for your route (trains, trams, buses)
- Tells you if you have time to grab coffee
- Updates automatically every 2 minutes
- Works completely offline using GTFS timetable data (no API keys required)

**Supported locations:**
All 8 Australian states - VIC, NSW, QLD, SA, WA, TAS, ACT, NT. The system auto-detects your state from your address and uses the appropriate transit data.

**Tech details:**
- Runs on free hosting (Render.com)
- Optional real-time data integration with state transport APIs
- Built for TRMNL e-ink displays but works with any 800x480 screen
- ESP32-C3 firmware included for hardware enthusiasts

**Cost:**
$0 per month. Uses free tiers for everything.

**Sample dashboard:**
[Link to screenshot showing: Leave by 8:42 AM, Next trains: 8:47, 8:52, Coffee: YES]

**Setup time:**
About 30 minutes following the included guide.

**License:**
CC BY-NC 4.0 - Free for personal use, full source code available.

**Repository:**
github.com/YOUR-USERNAME/ptv-trmnl (link will be provided after public repo is created)

---

## Compliance Notes

### r/melbourne Rules:
- Rule 4: No Low Effort Posts - This is substantial OC with working code
- Rule 5: No Self-Promotion - Educational post about open-source project, not selling anything
- Rule 8: On-Topic - Directly relates to Melbourne transit system
- Include link to source code
- Be ready to answer technical questions

### r/australia Rules:
- Must be about Australia - Works for all states
- No advertising/self-promotion - Educational/informational post
- Flair: "Tech/Science" or "Discussion"
- Must contribute to community - Useful tool for Australian commuters

---

## Suggested Posting Strategy

1. Post to r/melbourne first (more targeted audience)
2. Wait 24 hours for mod approval
3. Post to r/australia if Melbourne post does well
4. Be active in comments answering questions
5. Provide additional screenshots/GIFs if requested
6. Have documentation links ready

---

## Sample Comments/Responses

**Q: Why did you build this?**
A: Got tired of checking multiple apps and missing trains. Wanted a single glanceable display that tells me exactly when to leave, accounting for walking time and coffee stops.

**Q: Does it work with [X transport system]?**
A: Yes, it has GTFS fallback data for all Australian states. Victoria can use real-time API for live updates. Other states use scheduled timetables.

**Q: How does the coffee decision work?**
A: Calculates if you have enough time before your first departure for a 3-5 minute coffee stop. Optionally checks cafe busyness via Google API.

**Q: What hardware do I need?**
A: Designed for TRMNL e-ink displays, but the dashboard works in any browser. You can also view it on a tablet or old phone mounted on your desk.

**Q: Can I contribute/fork it?**
A: Absolutely. It's open-source with full documentation. PRs welcome.

**Q: Privacy concerns?**
A: Everything runs on your own server. Your addresses never leave your Render instance. No analytics, no tracking.

---

## Screenshots to Include

1. **Full dashboard** showing all elements
2. **Admin panel** showing address configuration
3. **Architecture diagram** showing data flow
4. **Mobile view** of web dashboard

---

## Do NOT Include
- Buy Me a Coffee links in the main post (can be in profile/repo)
- Emotional language or excessive enthusiasm
- Claims about being "the best" or superiority
- Requests for upvotes or engagement
- Personal financial situation or motivations

---

## Post Timing
- Tuesday-Thursday, 8-10 AM AEST (high engagement)
- Avoid Monday (too busy) and Friday (weekend mode)
- NOT during major news events or crises

---

## Expected Questions

**Technical:**
- API key requirements (optional)
- Data sources and accuracy
- Update frequency and battery life
- Customization options
- Support for non-TRMNL hardware

**Practical:**
- Setup difficulty
- Maintenance requirements
- Cost breakdown
- Accuracy of "leave by" times
- Multi-person household support

**Privacy/Legal:**
- Data storage and privacy
- Licensing and commercial use
- Attribution requirements
- Transit API terms of service compliance

Be prepared with clear, factual answers for all of these.

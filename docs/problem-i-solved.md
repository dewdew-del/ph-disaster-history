# Problem I solved (draft, edit in your own words)

**The problem.** When a strong typhoon or earthquake hits, people ask "has this happened here before?" The answers are spread across PHIVOLCS bulletins, PAGASA reports, Wikipedia pages and global datasets that use different names for the same storm (Yolanda vs Haiyan) and different wind scales. There was no single, free place to see where strong quakes hit the Philippines most often, or every typhoon that entered the PAR with its local name, track and toll, down to your own province.

**What I built.** PH Disaster History: a static website with two maps. The Linog Map shows 15,778 earthquakes of M4.5+ since 1900 with filters, a heatmap and charts. The Bagyo Archive has 1,805 storms since 1945, each with its PAGASA name, track, strength on the PAGASA scale, deaths and damage with sources. A "My Place" page gives each of 84 provinces its own quake and typhoon history.

**The hard parts.**
- Joining three sources that don't share ids: I wrote a script that reads Wikipedia's season pages through the MediaWiki API and matches each storm to its NOAA IBTrACS track by name, JTWC number or dates, checking local names against PAGASA's official list for that year. 641 storms got their local name automatically.
- Messy numbers: death and damage fields come as text ("1,292–2,546", "> $2.98 billion", "22 total (21 in Vietnam and 1 in Hainan)"). I wrote a parser with unit tests that marks anything uncertain as "approximate" instead of guessing, and kept manual fixes in one overrides file so rerunning the scripts never erases them.
- Speed on a cheap phone: 15,778 map markers and 1,805 pre-rendered pages, with no backend. Markers are drawn on a canvas and only the changed ones are redrawn when a filter moves; data files are split by decade and kept under 2 MB each.

**Result.** A free (₱0) site on Vercel's free plan that anyone can use to look up their province's disaster history, with every number linked to its source.

**Skills shown.** Next.js + TypeScript, Leaflet maps, data pipelines (APIs, CSV, GeoJSON, geo math with turf), testing parsers, performance work, accessible responsive UI.

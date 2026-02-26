[2026-02-26 08:18] [AGENT] Manager: <@1224636712865759284> 📝 **Brainstorm Notes** — thread ready.
[2026-02-26 08:19] [AGENT] Manager: <@710933492053180506> 📝 **Brainstorm Notes** — thread ready.
[2026-02-26 09:50] [AGENT] NoteBot: **Step 1E Summary — Codebase Analysis & Iteration Scope**

---

**Project:** LarvalBase — Fish Larvae Trait Database
**Location:** VPS 69.62.106.38, `/var/www/eliot/`
**URL:** larvalbase.ingevision.cloud
**User:** Eliot RUIZ

---

**Tech Stack:**
- Next.js 15.1.6, React 19, TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- D3.js 7.9.0 for charts (growth curves, swimming speed)
- Papa Parse 5.5.2 for CSV data loading
- No database — all data in CSV flat files, parsed per request
[2026-02-26 09:50] [AGENT] NoteBot: **Current Architecture:**
- Single-page-style app with App Router
- Pages: Homepage (search + stats), Species Detail (taxonomy, egg panel, growth chart, swimming speed, images, references)
- API routes: /api/species, /api/species/[id], /api/search
- Data flow: CSV → Papa Parse → API routes → React components + D3

**Key Pain Points Identified:**
- CSV re-parsed on every request (no caching)
- No search indexing
- No SEO/structured data
- No tests, no CI/CD

---

**ITERATION SCOPE — 23 Changes + 1 Infrastructure Item**

**Homepage Modifications (4 items):**
[2026-02-26 09:50] [AGENT] NoteBot: 1. New title: "LarvalBase: Global pelagic dispersal traits databases for early-life stages of marine fishes – Ruiz et al. (2026)"
2. Horizontal barplots showing record/species/genus/family/order counts per trait (colors: #F8766D=Order, #A3A500=Family, #00BF7D=Genus, #00B0F6=Species, #E76BF3=Row)
3. Publication year & origin chart
4. Photo grid: post-flexion & early juvenile stages library (5 per row, family → genus → species drill-down, prioritize blackwater images)

**Species Detail Page Modifications (19 items):**
1. Qualitative Egg panel (EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE)
2. SVG icons in taxonomy sidebar
3. Show _MIN, _MAX, _CONF in raw data modal
4. Export buttons (Species/Genus/Family traits)
5. Fix map point duplication
6. Species pages for image-only species (no records)
7. Growth curve equations in legend
8. Family comparison: genus averages if >20 bars
9. Image resize fix (caption visible without dezooming)
10. Performance optimization (loading time)
11. Section icons → SVG replacements
[2026-02-26 09:50] [AGENT] NoteBot: 12. Rename swimming speed panels ("Absolute")
13. Fix missing image captions (Polynesia, Maldives, classified_bw)
14. Hide duplicate magnifier icon
15. Hide FAMILY COMPARISON when n_sp=1
16. Rename "Hatching & Early Development" → "Hatching & Pre-flexion Stage"
17. Growth curves: show reference + temperature without modelled curve
18. Growth curve tooltips: "Age: …" / "Size: …"
19. Growth curve colors: Spectral scale by TEMPERATURE_MEAN
20. Image priority order (Blackwater first → Fisher et al. last)
21. Black bars (letterbox/pillarbox) on image enlargement

**Infrastructure:**
- In-memory CSV caching + ISR for faster page loads
[2026-02-26 10:26] [AGENT] NoteBot: **Step 2A Summary — Section Breakdown**

7 sections validated for deep-dive:

1. 🏠 **Homepage** (thread <#1476510509644775444>) — New title, horizontal barplots, publication year chart, photo grid with drill-down
2. 🥚 **Egg & Taxonomy** (thread <#1476510544218292314>) — Qualitative egg panel, SVG icons in taxonomy sidebar, raw data modal (_MIN/_MAX/_CONF)
3. 📈 **Growth Curves** (thread <#1476510546189619261>) — Equations in legend, tooltips, Spectral color scale by temperature, show reference+temperature without modelled curve
4. 🖼️ **Images & Display** (thread <#1476510547620003972>) — Image priority order, black bars on enlargement, caption fixes, resize fix, species pages for image-only species
5. 🏊 **Swimming & Comparisons** (thread <#1476510549025095700>) — Rename speed panels ("Absolute"), family comparison genus averages when >20 bars, hide FAMILY COMPARISON when n_sp=1
6. 🔧 **UI & Export** (thread <#1476510550249836556>) — Export buttons, map point fix, hide duplicate magnifier, section SVG icons, rename hatching section, performance optimization
7. ⚡ **Infrastructure** (thread <#1476510551415853217>) — In-memory CSV caching + ISR
[2026-02-26 11:37] [AGENT] NoteBot: **Step 2B Update — New & Modified Sections**

**Changes from Eliot's feedback:**
- ❌ Removed: "Behavior & Ecology" section (entirely removed)
- 🔄 Renamed: "Swimming & Comparisons" → "Active Behaviors" — Vertical Distribution panel moved to first position
- 🆕 Added: "Pelagic Juvenile" section (3 panels: qualitative data, size, duration) — placed after Settlement
- 🆕 Added: "Rafting" section (3 panels: qualitative data, rafter size, rafting duration) — placed after Pelagic Juvenile
- 📊 Data updates: Settlement age, settlement size, and vertical position databases updated with new files (01.2026 versions)

**5. 🐟 Pelagic Juvenile** (thread <#1476527458084720711>)
- Qualitative data panel (text-based traits)
- Size at pelagic juvenile stage panel
- Duration of pelagic juvenile stage panel

**6. 🚢 Rafting** (thread <#1476527459208790137>)
- Qualitative rafting data panel
- Rafter size panel
[2026-02-26 11:37] [AGENT] NoteBot: - Rafting duration panel

**7. 🏊 Active Behaviors** (thread <#1476510549025095700>) — updated
- Vertical Distribution moved to first position
- Critical Swimming Speed (Absolute) retained
- In Situ Swimming Speed (Absolute) retained
- Family comparison logic retained (genus averages when >20 bars, hide when n_sp=1)

# LarvalBase V2 — Brainstorm Notes (Comprehensive)

**Project:** LarvalBase — Fish Larvae Trait Database
**Type:** Existing project iteration (Path B)
**User:** Eliot RUIZ
**Location:** VPS 69.62.106.38, `/var/www/eliot/`
**URL:** https://larvalbase.ingevision.cloud
**Date:** 2026-02-26
**Language:** English
**Profile:** Normal (knows the basics)

---

## 1. Concept Summary & Positioning

LarvalBase is a scientific web database for fish larvae traits, providing researchers with searchable access to morphological, ecological, and developmental data for marine fish early-life stages. The platform aggregates data from multiple CSV databases covering growth curves, swimming speed, settlement, egg characteristics, vertical distribution, and more.

**Target audience:** Marine biologists, ichthyologists, fisheries researchers
**Core value:** Centralized, searchable access to pelagic dispersal traits for early-life stages of marine fishes

---

## 2. Codebase Analysis (Step 1E)

### Tech Stack
- **Framework:** Next.js 15.1.6 + React 19 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Charts:** D3.js 7.9.0 (growth curves, swimming speed)
- **Data parsing:** Papa Parse 5.5.2 for CSV loading
- **Database:** None — all data in CSV flat files, parsed per request
- **Hosting:** VPS with Traefik reverse proxy

### Current Architecture
- Single-page-style app with App Router
- Pages: Homepage (search + stats), Species Detail (taxonomy, egg panel, growth chart, swimming speed chart, images, references)
- API routes: `/api/species`, `/api/species/[id]`, `/api/search`
- Data flow: CSV → Papa Parse → API routes → React components + D3

### Key Pain Points
- CSV re-parsed on every request (no caching) — causes slow page loads
- No search indexing
- No SEO/structured data for academic citation
- No tests, no CI/CD

---

## 3. Full Iteration Scope

### Original Scope: 23 Changes + 1 Infrastructure Item

**Then expanded to 9 sections** after Eliot's mid-session feedback added 2 new sections (Pelagic Juvenile, Rafting), renamed Swimming & Comparisons → Active Behaviors, and removed Behavior & Ecology.

---

## 4. Section-by-Section Decisions

### Section 1: 🏠 Homepage

**Thread:** #1476510509644775444
**Mockup versions:** v1 (initial), v2 (after Eliot's feedback)
**Status:** Validated (v2)

#### Changes from existing:
1. **New title:** "LarvalBase: Global pelagic dispersal traits databases for early-life stages of marine fishes – Ruiz et al. (2026)"
2. **Horizontal barplots:** Record/species/genus/family/order counts per trait
   - Colors: #F8766D=Order, #A3A500=Family, #00BF7D=Genus, #00B0F6=Species, #E76BF3=Row
   - Inspired by Figure 6.pdf
   - **Decision:** Flat colors only — NO gradients. Clear 2px white delineations between segments.
   - **Rejected:** Gradient fills on barplot segments (Eliot explicitly rejected this from v1 mockup)
3. **Publication year & origin chart:** Bar chart by year, colored by data source (VARIABLE column from "All references and publication dates.txt")
4. **Photo grid:** "Colored pictures of post-flexion and early juvenile stages library"
   - 5 per row, one random blackwater image per family (UNCERTAIN=FALSE)
   - Sorted by order
   - Click family → genus/species drill-down using gen_ids_pics_metadata.txt and sp_ids_pics_metadata.txt
   - Prioritize blackwater images
   - Show unidentified pictures per family (fam_ids_pics_metadata.txt)
   - Species-level photos link to species page

#### v2 Additions (Eliot's detailed feedback):
5. **Filter by Trait panel** (left sidebar) with AND logic:
   - Under **"Age-at-Length"** section: checkboxes for "Raw data" (if points on graph) and "Growth model" (if curves on graph)
   - Under **"Settlement map"** (abbreviated from "Settlement-stage sampling locations"): checkboxes for "Settlement size location" and "Settlement age location" (only if GPS points available)
   - New section **"Picture"** with each AUTHOR name as a checkbox + "All" button to retain species with at least one picture
   - **Filter logic:** AND — species must have ALL selected traits, not just one
6. **"Available species" list** (renamed from "Taxonomy"): Updates live when filters are ticked to show only species with at least one record for selected traits
7. **Two search bars:**
   - Top of left panel: "Search all species"
   - Bottom of left panel (below Filter by Trait, above "Export Species List"): "Search filtered species"

#### Section names in filter panel:
- Age-at-Length with sub-boxes: "Raw data", "Growth model"
- Settlement map with sub-boxes: "Settlement size location", "Settlement age location"
- Picture with AUTHOR checkboxes + "All" button
- Plus existing section names with the new naming (Pelagic Juvenile, Rafting, Active Behaviors, etc.)

**Kept from existing:** Search bar, species grid

---

### Section 2: 🥚 Egg & Taxonomy

**Thread:** #1476510544218292314
**Mockup versions:** v1 (initial), v2 (frequency barplots)
**Status:** Validated (v2)

#### Changes:
1. **Qualitative Egg Panel** — New panel in "Egg & Incubation" section
   - 4 rows: EGG_LOCATION, EGG_DETAILS, EGG_SHAPE, NB_OIL_GLOBULE
   - **Decision:** Show frequency barplots per qualitative value (not text-based cards)
   - **Rejected:** Confidence badges ("High confidence · 5 references") — Eliot explicitly said no
   - **Data cascade:** Species-level data → genus fallback → family fallback
   - Data level indicator on each trait: green "Species data" / yellow "Genus data" / red "Family data"
   - Link to genus/family comparison
   - Link to reference table

2. **SVG icons in taxonomy sidebar**
   - Use order icon for orders, family icon for families, genus and species icons
   - Keep folder icon for "All species"

3. **Raw data modal**
   - Show _MIN, _MAX, _CONF columns alongside existing _MEAN values when clicking "X records" link

---

### Section 3: 📈 Growth Curves

**Thread:** #1476510546189619261
**Mockup versions:** v1 (initial, validated with one change)
**Status:** Validated

#### Changes:
1. **Equations in legend** — Add growth curve equations with age-at-length info per reference
2. **Tooltips** — Show "Age: …" and "Size: …" instead of "x: …" / "y: …" on hover
3. **Spectral color scale** — Use ggplot-style Spectral scale based on TEMPERATURE_MEAN value (single value = central green, gradient from cool to warm: 18°C→32°C)
4. **Reference without modelled curve** — Show scatter data points color-coded by reference + temperature even when no modelled curve exists
5. **Axis capping** (added from Eliot's feedback):
   - **X-axis (age):** Capped at `max(met_age_db, set_age_db)` across MET_AGE_DPH_MAX, MET_AGE_DPH_MEAN, SET_AGE_DPH_MEAN, SET_AGE_DPH_MAX
   - **Y-axis (size):** Capped at `max(met_size_db, set_size_db)` across MET_SIZE_MEAN, MET_SIZE_MAX, SET_SIZE_MEAN, SET_SIZE_MAX
   - **Fallback chain:** species → genus → family → no cap (if nothing available)

**Kept:** Animated curve drawing on load, D3-style SVG rendering

---

### Section 4: 🖼️ Images & Display

**Thread:** #1476510547620003972
**Mockup versions:** v1 (validated immediately)
**Status:** Validated

#### Changes:
1. **Image priority order** (ranked):
   1. Blackwater
   2. Ocea Consult–IHSM
   3. IchthyoGwada
   4. ADLIFISH 1
   5. CRIOBE
   6. Pham & Durand 2017
   7. Amelia Chatagnon
   8. Fisher et al. 2022 (fallback only, last priority)

2. **Black bars on enlargement** — Letterbox (landscape) and pillarbox (portrait) — images fit fully when enlarged without dezooming

3. **Caption fixes** — Fix missing captions for:
   - images/Polynesia
   - images/Maldives
   - Some images/classified_bw_images_species (e.g., Metavelifer multiradiatus)

4. **Image resize** — Caption always visible without dezooming

5. **Image-only species pages** — Create species pages for species that have images but no records in the database (badge indicating "Image only")

---

### Section 5: 🐟 Pelagic Juvenile (NEW)

**Thread:** #1476527458084720711
**Mockup versions:** v1 (initial), v1.1 (error bars added)
**Status:** Validated (v1.1)
**Placement:** After Settlement section on species detail page

#### Panels:
1. **Qualitative data panel** — "Pelagic juvenile"
   - Row: "Pelagic juvenile: …" with "Known" if species is in pelagic juvenile database, or "Unknown"
   - Row: "Name given: …" with unique values of KEY_WORD column (comma-separated)
   - Row: "Known pelagic juvenile in this genus: …" — other species names in italic from the pelagic juvenile database for this genus
   - Row: "Known pelagic juvenile in this family: …" — other species names in italic from the database for this family (excluding same genus species)

2. **Pelagic juvenile size** — Values from PELAGIC_JUV_SIZE_... columns
   - Dot-strip chart by reference
   - **Error bars (± 1 SD)** where variance data exists
   - Points without bars = single observation / no reported variance
   - Species/genus/family comparison bars

3. **Pelagic juvenile duration** — Values from PELAGIC_JUV_DURATION_... columns
   - Same layout as size panel but in days
   - **Error bars** where available

**Key decision:** Error bars added after Eliot's feedback — initially not present in v1.

---

### Section 6: 🚢 Rafting (NEW)

**Thread:** #1476527459208790137
**Mockup versions:** v1 (initial), feedback noted for v2
**Status:** Validated with noted revisions
**Placement:** After Pelagic Juvenile section

#### Panels:
1. **Qualitative rafting data** — "Rafting"
   - Row: "Rafting: …" with "Known"/"Unknown" based on presence in rafting database
   - Row: "Flotsam type: …" — unique values from FLOATSAM column, with compound values split (e.g., "FAD | other object" becomes "FAD, other object")
   - Row: "Stage: …" — from STAGE column, formatted similarly
   - Row: "Known rafters in this genus: …" — species names in italic (if VALID_NAME is NA, show GENUS name)
   - Row: "Known rafters in this family: …" — excluding same genus (if VALID_NAME is NA, show GENUS name)
   - **Decision:** Frequency barplots per qualitative value (species → genus → family fallback)
   - **Rejected:** Confidence badges ("High confidence") — Eliot explicitly rejected
   - Same approach as Egg section qualitative panels

2. **Rafter size** — RAFTING_SIZE_... columns
   - Dot-strip chart by reference
   - **Error bars** where available
   - Species/genus/family comparison bars

3. **Rafting duration** — RAFTING_AGE column
   - Same layout as size, in days
   - **Error bars** where available

**Key decisions:**
- No confidence badges — replaced with frequency barplots
- Error bars on data points (added from Eliot's feedback)
- Purple accent to distinguish from other sections

---

### Section 7: 🏊 Active Behaviors (RENAMED)

**Thread:** #1476510549025095700
**Previously:** "Swimming & Comparisons"
**Mockup versions:** v1 (Swimming), v2 (Active Behaviors with Vertical Distribution)
**Status:** Validated (v2)

#### Changes from existing:
1. **Renamed:** "Swimming Ability" / "Swimming & Comparisons" → "Active Behaviors"
2. **Vertical Distribution** — Moved to FIRST panel position
   - Depth chart with day/night/unknown color coding
   - Water gradient background
   - Size vs depth scatter plot
3. **Swimming speed panels retained:**
   - "Critical Swimming Speed (Absolute)" (renamed from "Critical Swimming Speed")
   - "In Situ Swimming Speed (Absolute)" (renamed from "In Situ Swimming Speed")
   - Tabbed with dot-strip charts
4. **Family comparison logic retained:**
   - Normal mode: <20 species, current species highlighted
   - Genus average mode: >20 bars → auto-grouped by genus with toggle + info note
   - Hidden: when n_sp=1 and that species is the current one

**Removed:** "Behavior & Ecology" section — entirely removed, Vertical Distribution moved here instead

---

### Section 8: 🔧 UI & Export

**Thread:** #1476510550249836556
**Mockup versions:** v1 (validated)
**Status:** Validated

#### Changes:
1. **Export buttons** per section: "Export Species Traits", "Export Genus Traits", "Export Family Traits"
   - Columns: ORDER, FAMILY, GENUS, VALID_NAME, APHIA_ID, AUTHORITY + trait columns
   - CSV preview modal showing all data
   - **Decision:** All metadata columns visible in scrollable table (option A — not collapsed/expandable)

2. **Map point fix** — Avoid duplicated points on map edges (edge deduplication)

3. **Hide duplicate magnifier icon** next to species search bar

4. **Section SVG icons** — Replace with SVG images from ZIP folder (match by filename)
   - Eliot provided section_icons.zip

5. **Rename section:** "Hatching & Early Development" → "Hatching & Pre-flexion Stage"

6. **Performance optimization** — Decrease page loading time (benchmark: Haemulon carbonarium)

#### Metadata columns per trait (from message.txt — detailed specs):
- EXT_REF + REFERENCE (with link) on every section
- _MEAN_TYPE and _CONF_TYPE columns for most traits
- Rearing/temperature columns (mean, min, max, type) on developmental traits
- Settlement traits: full sampling metadata (dates, GPS, gear, otolith, location, country)
- Swimming speed: 4 sub-tables (Ucrit abs/rel, ISS abs/rel) each with origin, location, length, temperature blocks
- Pelagic juvenile and Rafting: reference columns only
- **Decision:** All columns visible in scrollable table (not collapsed with "Show all metadata" toggle)

---

### Section 9: ⚡ Infrastructure

**Thread:** #1476510551415853217
**Mockup versions:** v1 (validated)
**Status:** Validated

#### Changes:
1. **In-memory CSV caching** — Load all CSVs once on server start, keep in memory
   - Estimated memory footprint: ~150MB for all CSVs
   - Cache implementation with revalidation

2. **ISR (Incremental Static Regeneration)** — Pre-render species pages at build time
   - `revalidate: 3600` (1 hour)
   - Species pages served as static HTML

3. **Performance targets:**
   - TTFB: 4.2s → ~120ms
   - FCP: 800ms → ~200ms

4. **Architecture:** CSV files → In-Memory Cache → API Routes → ISR Pages → React + D3

#### Data updates:
- Settlement age database updated: `Settlement_age_database_final_01.2026.txt`
- Settlement size database updated: `Settlement_size_database_final_01.2026.txt`
- Vertical position database updated: `Vertical_position_database_final_01.2026.txt`

---

## 5. Cross-Section Impacts & Dependencies

1. **Filter by Trait (Homepage) ↔ All Sections:** The homepage filter panel must know about ALL section names and their data availability per species. New sections (Pelagic Juvenile, Rafting) and renamed sections (Active Behaviors) must be reflected.

2. **Export buttons (UI & Export) ↔ All Sections:** Export functionality applies to every data section — the metadata columns spec from message.txt defines what's exported per section.

3. **Infrastructure ↔ All Pages:** In-memory caching and ISR affect every page's data loading — must be implemented first or in parallel.

4. **Qualitative panels pattern:** Egg, Pelagic Juvenile, and Rafting all use the same pattern — frequency barplots with species → genus → family fallback. Implementation can share components.

5. **Error bars pattern:** Pelagic Juvenile and Rafting both need error bars on dot-strip charts. Reusable D3 component.

6. **Species page layout:** Eliot specified to keep the same general layout — new sections (Pelagic Juvenile, Rafting) are inserted at specific positions, not restructured.

7. **Data level indicators:** Green "Species data" / Yellow "Genus data" / Red "Family data" — applies to Egg, Pelagic Juvenile, Rafting qualitative panels.

---

## 6. Open Questions / Deferred Decisions

1. **message.txt full metadata spec:** Eliot uploaded a message.txt with detailed per-trait column specifications. The full contents were not extracted during the brainstorm — this file needs to be retrieved from Discord or VPS during implementation.

2. **section_icons.zip:** SVG icons provided by Eliot — need to be extracted and matched by filename to sections during implementation.

3. **Photo grid performance:** Manager flagged that family → genus → species drill-down with thousands of images could be heavy. Needs benchmarking during implementation.

4. **D3 refactoring complexity:** Growth curve Spectral color scale and conditional display (show points without modelled curve) flagged as the most complex individual items.

5. **Settlement database updates:** Three new database files (01.2026 versions) need to replace existing ones during implementation.

6. **Rafting mockup v2:** Feedback was noted (frequency barplots + error bars) but the final v2 mockup may not have been fully completed during the session.

---

## 7. Feasibility Assessment

- **Technical:** All modifications within existing stack (React, D3, Tailwind, Papa Parse). No new frameworks needed.
- **New sections:** Follow existing panel patterns — straightforward to implement.
- **Performance risk:** Photo grid drill-down + in-memory caching of all CSVs (~150MB) — needs early benchmarking.
- **Cost:** Zero incremental cost — no external APIs, no paid services, same VPS.
- **Resources:** One developer can handle this.
- **Showstoppers:** None identified.
- **Estimated sprints:** 3-5 implementation sprints.

---

## 8. References & Inspirations

- **Figure 6.pdf** — Inspiration for horizontal barplots on homepage
- **Figure 2.pdf** / **template_publi_year.R** — Inspiration for publication year & origin chart
- **"All references and publication dates.txt"** — Data source for publication chart (VARIABLE column)
- **fam_ids_pics_metadata.txt** — Family-level image metadata for photo grid
- **gen_ids_pics_metadata.txt** — Genus-level image metadata for drill-down
- **sp_ids_pics_metadata.txt** — Species-level image metadata for drill-down
- **Spectral scale from ggplot** — Color reference for growth curve temperature mapping

---

## 9. Constraints (Unchanged from V1)

- Same platform: Next.js 15 — no migration
- Same scale — no auth requirements
- Data is mostly read-only, updated by researchers periodically
- No new external dependencies or paid services
- Must remain hostable on current VPS infrastructure

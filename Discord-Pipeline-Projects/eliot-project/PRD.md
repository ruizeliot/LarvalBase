# LarvalBase V2 — Product Requirements Document

**Version:** 2.0
**Project:** LarvalBase — Fish Larvae Trait Database
**Type:** Existing project iteration (Path B)
**Author:** Pipeline Office (compiled from brainstorm with Eliot RUIZ)
**Date:** 2026-02-26
**URL:** https://larvalbase.ingevision.cloud
**Source:** VPS 69.62.106.38, `/var/www/eliot/`

---

## 1. Product Vision

### Concept
LarvalBase is a scientific web database providing researchers with centralized, searchable access to pelagic dispersal traits for early-life stages of marine fishes. It aggregates morphological, ecological, and developmental data from multiple CSV databases covering growth, swimming ability, settlement, egg characteristics, vertical distribution, and more.

### Positioning
The definitive online reference for fish larvae trait data — enabling marine biologists, ichthyologists, and fisheries researchers to explore, compare, and export species data across taxonomic levels.

### Target Audience
- Marine biologists and ichthyologists
- Fisheries researchers
- Academic institutions studying fish early-life stages
- Graduate students in marine ecology

### New Title
"LarvalBase: Global pelagic dispersal traits databases for early-life stages of marine fishes – Ruiz et al. (2026)"

---

## 2. Technical Constraints

### Existing Stack (No Migration)
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.1.6 + React 19 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Charts | D3.js 7.9.0 |
| Data parsing | Papa Parse 5.5.2 |
| Database | None — CSV flat files |
| Hosting | VPS (69.62.106.38) + Traefik reverse proxy |

### Codebase Analysis Summary
- Single-page-style app with App Router
- Pages: Homepage (search + stats), Species Detail (multi-section)
- API routes: `/api/species`, `/api/species/[id]`, `/api/search`
- Data flow: CSV → Papa Parse → API routes → React components + D3
- **Pain points:** CSV re-parsed on every request, no caching, no search indexing, no tests

### Platform Constraints
- No authentication required
- No external APIs or paid services
- Data is read-only, updated periodically by researchers
- Must remain hostable on current VPS
- Offline-compatible (no external CDN dependencies in production)

---

## 3. Functional Specifications by Section

### 3.1 Homepage

**Page:** `/` (main landing page)
**Status:** [MOD] Modify

#### Title
Display: "LarvalBase: Global pelagic dispersal traits databases for early-life stages of marine fishes – Ruiz et al. (2026)"

#### Left Sidebar — Filter by Trait
- **Filter panel** with section-based checkboxes
- Sections include all data categories (Egg, Hatching, Growth, Settlement, Swimming, Pelagic Juvenile, Rafting, etc.)
- Special sub-boxes:
  - **Age-at-Length:** "Raw data" (species has data points), "Growth model" (species has fitted curves)
  - **Settlement map** (abbreviated from "Settlement-stage sampling locations"): "Settlement size location", "Settlement age location" (only if GPS data available)
  - **Picture:** Individual AUTHOR name checkboxes + "All" button (retain species with at least one picture)
- **Filter logic:** AND — species must match ALL selected filters
- **"Available species" list** (renamed from "Taxonomy"): Updates live when filters change, showing only species with records for selected traits
- **Two search bars:**
  - Top: "Search all species" (searches entire database)
  - Bottom (below filters, above Export): "Search filtered species" (searches within filtered results)
- **"Export Species List" button** below second search bar

#### Horizontal Barplots
- Show record/species/genus/family/order counts per trait
- Colors: #F8766D=Order, #A3A500=Family, #00BF7D=Genus, #00B0F6=Species, #E76BF3=Row
- **Flat colors only** — NO gradients
- Clear 2px white delineations between segments

#### Publication Year & Origin Chart
- Bar chart by year, colored by data source
- Data from "All references and publication dates.txt" (VARIABLE column)

#### Photo Grid
- Title: "Colored pictures of post-flexion and early juvenile stages library"
- Layout: 5 images per row, one random blackwater image per family (UNCERTAIN=FALSE)
- Sorted by order
- Click family card → genus/species drill-down modal
- Image sources: gen_ids_pics_metadata.txt, sp_ids_pics_metadata.txt, fam_ids_pics_metadata.txt
- Prioritize blackwater images
- Species-level photos link to species page

---

### 3.2 Species Detail — Egg & Taxonomy

**Page:** `/species/[id]` — Egg & Incubation section + Taxonomy sidebar
**Status:** [MOD] Modify

#### Taxonomy Sidebar
- SVG icons per taxonomic level: order icon, family icon, genus icon, species icon
- Keep folder icon for "All species"
- Source: section_icons.zip (match by filename)

#### Qualitative Egg Panel (NEW)
- 4 traits displayed as **frequency barplots**:
  - EGG_LOCATION — "Egg location"
  - EGG_DETAILS — "Egg location details"
  - EGG_SHAPE — "Egg shape"
  - NB_OIL_GLOBULE — "Number of oil globules"
- Each barplot shows frequency of each possible value (e.g., Pelagic: 12, Demersal: 3)
- **Data cascade:** Species data → genus fallback → family fallback
- **Data level indicator:** Green "Species data" / Yellow "Genus data" / Red "Family data"
- Link to genus/family comparison view
- Link to reference table

#### Raw Data Modal Enhancement
- When clicking "X records" link, display: _MEAN, _MIN, _MAX, _CONF columns
- All columns visible in scrollable table

---

### 3.3 Species Detail — Growth Curves

**Page:** `/species/[id]` — Growth Curves section
**Status:** [MOD] Modify

#### Chart Modifications
- **Equations in legend:** Show growth curve equations with age-at-length info per reference
- **Tooltips:** "Age: {value}" / "Size: {value}" instead of "x: …" / "y: …"
- **Color scale:** Spectral (ggplot-style) mapped to TEMPERATURE_MEAN (18°C = cool blue → 32°C = warm red, single value = central green)
- **Reference without curve:** Show scatter data points color-coded by reference + temperature even when no modelled growth curve exists
- **Axis capping:**
  - X-axis (age): `max()` across MET_AGE_DPH_MAX, MET_AGE_DPH_MEAN, SET_AGE_DPH_MEAN, SET_AGE_DPH_MAX from met_age_db_01_2026_final and set_age_db_01_2026_final
  - Y-axis (size): `max()` across MET_SIZE_MEAN, MET_SIZE_MAX, SET_SIZE_MEAN, SET_SIZE_MAX from met_size_db_01_2026_final and set_size_db_01_2026_final
  - Fallback: species → genus → family → no cap
- **Animated curve drawing** on load (keep existing)

---

### 3.4 Species Detail — Images & Display

**Page:** `/species/[id]` — Images section
**Status:** [MOD] Modify

#### Image Priority Order
1. Blackwater
2. Ocea Consult–IHSM
3. IchthyoGwada
4. ADLIFISH 1
5. CRIOBE
6. Pham & Durand 2017
7. Amelia Chatagnon
8. Fisher et al. 2022 (fallback, lowest priority)

#### Enlargement
- **Black bars** (letterbox for landscape, pillarbox for portrait) — image fits fully when enlarged
- No dezooming required to see full image

#### Caption Fixes
- Fix missing captions for: images/Polynesia, images/Maldives, classified_bw_images_species (e.g., Metavelifer multiradiatus)

#### Image Resize
- Caption always visible without dezooming (adjust image container sizing)

#### Image-Only Species Pages
- Create species pages for species with images but no data records
- Badge indicating "Image only" status

---

### 3.5 Species Detail — Pelagic Juvenile (NEW)

**Page:** `/species/[id]` — New section placed after Settlement
**Status:** [NEW] New

#### Panel 1: Qualitative Data — "Pelagic juvenile"
- "Pelagic juvenile: Known/Unknown" (based on presence in pelagic juvenile database)
- "Name given: {values}" (unique KEY_WORD values, comma-separated)
- "Known pelagic juvenile in this genus: {species names in italic}"
- "Known pelagic juvenile in this family: {species names in italic}" (excluding same genus)

#### Panel 2: Pelagic Juvenile Size
- Data from PELAGIC_JUV_SIZE_... columns
- Dot-strip chart by reference
- **Error bars (± 1 SD)** where variance data exists (no bars = single observation)
- Species/genus/family comparison bars

#### Panel 3: Pelagic Juvenile Duration
- Data from PELAGIC_JUV_DURATION_... columns
- Same layout as size panel, values in days
- **Error bars** where available

---

### 3.6 Species Detail — Rafting (NEW)

**Page:** `/species/[id]` — New section placed after Pelagic Juvenile
**Status:** [NEW] New

#### Panel 1: Qualitative Rafting Data — "Rafting"
- "Rafting: Known/Unknown" (based on presence in rafting database)
- "Flotsam type: {values}" (unique FLOATSAM values, compound strings split — e.g., "FAD | other object" → "FAD, other object")
- "Stage: {values}" (from STAGE column, formatted similarly)
- "Known rafters in this genus: {species in italic}" (if VALID_NAME is NA, show GENUS name)
- "Known rafters in this family: {species in italic}" (excluding same genus; if VALID_NAME is NA, show GENUS name)
- **Frequency barplots** per qualitative value with species → genus → family fallback
- Data level indicator (green/yellow/red)

#### Panel 2: Rafter Size
- Data from RAFTING_SIZE_... columns
- Dot-strip chart by reference with **error bars**
- Species/genus/family comparison bars

#### Panel 3: Rafting Duration
- Data from RAFTING_AGE column
- Same layout, values in days, with **error bars**

---

### 3.7 Species Detail — Active Behaviors (RENAMED)

**Page:** `/species/[id]` — Renamed from "Swimming Ability"/"Swimming & Comparisons"
**Status:** [MOD] Modify

**Removed:** "Behavior & Ecology" section entirely — Vertical Distribution moved here.

#### Panel Order:
1. **Vertical Distribution** (MOVED to first position)
   - Depth chart with day/night/unknown color coding
   - Water gradient background
   - Size vs depth scatter plot
2. **Critical Swimming Speed (Absolute)** (renamed from "Critical Swimming Speed")
   - Tabbed dot-strip charts
3. **In Situ Swimming Speed (Absolute)** (renamed from "In Situ Swimming Speed")
   - Tabbed dot-strip charts

#### Family Comparison Logic (all panels):
- Normal mode: <20 species in family, current species highlighted
- Genus average mode: >20 bars → auto-group by genus (only if >1 genus), one bar per genus, toggle + info note
- Hidden: when n_sp=1 and the single species is the current one

---

### 3.8 UI & Export (Cross-Section)

**Status:** [MOD] Modify

#### Export Buttons (Per Section)
- Three buttons per data section: "Export Species Traits", "Export Genus Traits", "Export Family Traits"
- Standard columns: ORDER, FAMILY, GENUS, VALID_NAME, APHIA_ID, AUTHORITY + section-specific trait columns
- CSV preview modal with all columns visible in scrollable table

#### Metadata Columns (Per-Trait Detail View)
- EXT_REF + REFERENCE (with link) on every section
- _MEAN_TYPE and _CONF_TYPE columns for most traits
- Rearing/temperature columns (mean, min, max, type) on developmental traits
- Settlement traits: full sampling metadata (dates, GPS, gear, otolith, location, country)
- Swimming speed: 4 sub-tables (Ucrit abs/rel, ISS abs/rel) with origin, location, length, temperature
- All columns visible in scrollable table (not collapsed)

#### Map Fix
- Avoid point duplication on map edges (edge deduplication algorithm)

#### Duplicate Magnifier
- Hide duplicate magnifier icon next to species search bar

#### Section Icons
- Replace all section icons with SVG images from section_icons.zip
- Match by filename

#### Rename
- "Hatching & Early Development" → "Hatching & Pre-flexion Stage"

#### Performance
- Target: decrease page loading time significantly
- Benchmark species: Haemulon carbonarium

---

### 3.9 Infrastructure

**Status:** [MOD] Modify

#### In-Memory CSV Caching
- Load all CSV files once on server start
- Keep parsed data in memory (~150MB estimated footprint)
- Serve from memory on all subsequent requests

#### ISR (Incremental Static Regeneration)
- Pre-render species pages at build time
- Revalidation interval: `revalidate: 3600` (1 hour)
- Species pages served as static HTML

#### Performance Targets
| Metric | Before | After |
|--------|--------|-------|
| TTFB | 4.2s | ~120ms |
| FCP | 800ms | ~200ms |

#### Data Flow
```
CSV Files → In-Memory Cache → API Routes → ISR Pages → React + D3
```

#### Database Updates
- Replace settlement age database with: `Settlement_age_database_final_01.2026.txt`
- Replace settlement size database with: `Settlement_size_database_final_01.2026.txt`
- Replace vertical position database with: `Vertical_position_database_final_01.2026.txt`

---

## 4. User Stories by Section

### Epic 1: Infrastructure & Foundations
*Source: Section 9 (Infrastructure) + shared foundations*

| ID | Story | Complexity |
|----|-------|-----------|
| US-1.1 | As a user, I want pages to load in under 1 second so I can browse species efficiently | L |
| US-1.2 | As a developer, I want CSV data cached in memory so API responses are fast | M |
| US-1.3 | As a user, I want species pages pre-rendered so they load instantly | M |
| US-1.4 | As a developer, I want updated settlement and vertical position databases (01.2026) integrated | S |
| US-1.5 | As a developer, I want SVG icons from section_icons.zip mapped to all sections | S |
| US-1.6 | As a developer, I want the section "Hatching & Early Development" renamed to "Hatching & Pre-flexion Stage" | S |

### Epic 2: Homepage Overhaul
*Source: Section 1 (Homepage)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-2.1 | As a user, I want to see the new LarvalBase title reflecting the 2026 publication | S |
| US-2.2 | As a user, I want to see horizontal barplots showing record/species/genus/family/order counts per trait | L |
| US-2.3 | As a user, I want to see a publication year & origin chart showing data sources over time | M |
| US-2.4 | As a user, I want to browse a photo grid of post-flexion/early juvenile stages by family with drill-down to genus/species | L |
| US-2.5 | As a user, I want to filter species by trait availability using AND logic so I find species with all selected data types | L |
| US-2.6 | As a user, I want the "Available species" list to update live when I apply filters | M |
| US-2.7 | As a user, I want two search bars — one for all species, one for filtered species | S |
| US-2.8 | As a user, I want to export the filtered species list | S |

### Epic 3: Egg & Taxonomy Enhancements
*Source: Section 2 (Egg & Taxonomy)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-3.1 | As a user, I want to see qualitative egg traits as frequency barplots with species/genus/family fallback | M |
| US-3.2 | As a user, I want SVG icons in the taxonomy sidebar for each taxonomic level | S |
| US-3.3 | As a user, I want the raw data modal to show _MIN, _MAX, _CONF columns alongside _MEAN | S |

### Epic 4: Growth Curves Improvements
*Source: Section 3 (Growth Curves)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-4.1 | As a user, I want to see growth curve equations in the legend with age-at-length info | M |
| US-4.2 | As a user, I want tooltips showing "Age: …" and "Size: …" on hover | S |
| US-4.3 | As a user, I want growth curves colored by Spectral scale based on temperature | M |
| US-4.4 | As a user, I want to see data points even when no modelled curve exists (reference + temperature) | M |
| US-4.5 | As a user, I want chart axes capped at biologically relevant maximums (species → genus → family fallback) | M |

### Epic 5: Images & Display
*Source: Section 4 (Images & Display)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-5.1 | As a user, I want images sorted by priority (Blackwater first, Fisher et al. last) | S |
| US-5.2 | As a user, I want enlarged images to fit fully with black bars (letterbox/pillarbox) | M |
| US-5.3 | As a user, I want all image captions visible (fix Polynesia, Maldives, classified_bw) | S |
| US-5.4 | As a user, I want image captions visible without dezooming | S |
| US-5.5 | As a user, I want species pages for image-only species (no data records) | M |

### Epic 6: Pelagic Juvenile (New Section)
*Source: Section 5 (Pelagic Juvenile)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-6.1 | As a user, I want a qualitative panel showing pelagic juvenile status, keywords, and related species in genus/family | M |
| US-6.2 | As a user, I want a dot-strip chart of pelagic juvenile size with error bars and comparison bars | M |
| US-6.3 | As a user, I want a dot-strip chart of pelagic juvenile duration with error bars and comparison bars | M |

### Epic 7: Rafting (New Section)
*Source: Section 6 (Rafting)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-7.1 | As a user, I want a qualitative panel showing rafting status, flotsam type, stage, and related species | M |
| US-7.2 | As a user, I want frequency barplots for qualitative rafting traits with species/genus/family fallback | M |
| US-7.3 | As a user, I want dot-strip charts for rafter size and duration with error bars | M |

### Epic 8: Active Behaviors (Restructured)
*Source: Section 7 (Active Behaviors)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-8.1 | As a user, I want Vertical Distribution as the first panel in Active Behaviors | M |
| US-8.2 | As a user, I want swimming speed panels renamed to include "(Absolute)" | S |
| US-8.3 | As a user, I want family comparison to show genus averages when >20 species | M |
| US-8.4 | As a user, I want family comparison hidden when n_sp=1 and it's the current species | S |
| US-8.5 | As a developer, I want "Behavior & Ecology" section removed entirely | S |

### Epic 9: UI & Export
*Source: Section 8 (UI & Export)*

| ID | Story | Complexity |
|----|-------|-----------|
| US-9.1 | As a user, I want export buttons (Species/Genus/Family traits) per section with full metadata | L |
| US-9.2 | As a user, I want map points deduplicated on edges | S |
| US-9.3 | As a user, I want the duplicate magnifier icon hidden | S |
| US-9.4 | As a user, I want all metadata columns visible in scrollable record detail tables | M |

---

## 5. Epic Breakdown

### Dependency Order

```
Epic 1 (Infrastructure) ← foundational, must be first
    ↓
Epic 2 (Homepage) ← depends on caching + data availability
Epic 3 (Egg & Taxonomy) ← can start after Epic 1
Epic 4 (Growth Curves) ← can start after Epic 1
Epic 5 (Images) ← can start after Epic 1
    ↓
Epic 6 (Pelagic Juvenile) ← new section, depends on Epic 1 data integration
Epic 7 (Rafting) ← new section, depends on Epic 1 data integration
Epic 8 (Active Behaviors) ← restructure, depends on Epic 1
    ↓
Epic 9 (UI & Export) ← cross-cutting, best done last
```

### Epic Summary Table

| Epic | Name | Source Section | Type | Stories | Dependencies | Complexity |
|------|------|---------------|------|---------|-------------|-----------|
| 1 | Infrastructure & Foundations | ⚡ Infrastructure | [MOD] | 6 | None | L |
| 2 | Homepage Overhaul | 🏠 Homepage | [MOD] | 8 | Epic 1 | L |
| 3 | Egg & Taxonomy Enhancements | 🥚 Egg & Taxonomy | [MOD] | 3 | Epic 1 | M |
| 4 | Growth Curves Improvements | 📈 Growth Curves | [MOD] | 5 | Epic 1 | L |
| 5 | Images & Display | 🖼️ Images & Display | [MOD] | 5 | Epic 1 | M |
| 6 | Pelagic Juvenile | 🐟 Pelagic Juvenile | [NEW] | 3 | Epic 1 | M |
| 7 | Rafting | 🚢 Rafting | [NEW] | 3 | Epic 1 | M |
| 8 | Active Behaviors | 🏊 Active Behaviors | [MOD] | 5 | Epic 1 | M |
| 9 | UI & Export | 🔧 UI & Export | [MOD] | 4 | Epics 1-8 | L |

**Total:** 9 epics, 42 user stories

---

## 6. Visual References

### Mockup Files
- `mockups/homepage.html` / `homepage-v2.html` — Homepage (v2 validated)
- `mockups/egg-taxonomy.html` / `egg-taxonomy-v2.html` — Egg & Taxonomy (v2 validated)
- `mockups/growth-curves.html` — Growth Curves
- `mockups/images-display.html` — Images & Display
- `mockups/pelagic-juvenile.html` — Pelagic Juvenile (with error bars)
- `mockups/rafting.html` — Rafting
- `mockups/active-behaviors.html` — Active Behaviors (renamed)
- `mockups/ui-export.html` — UI & Export
- `mockups/infrastructure.html` — Infrastructure architecture

### Compiled Mockup
- `app-mockup.html` — All sections stitched into navigable document

**Note:** Mockup HTML files were created by Storm as Discord attachments during the brainstorm session. They need to be downloaded from Discord threads and saved to the `mockups/` directory for embedding.

### Design Inspirations
- Figure 6.pdf — Horizontal barplot layout reference
- Figure 2.pdf / template_publi_year.R — Publication year chart reference
- ggplot Spectral scale — Growth curve temperature color mapping

---

## 7. Non-Functional Requirements

### Performance
- Page load time: <1 second (benchmark: Haemulon carbonarium species page)
- TTFB: <200ms
- FCP: <300ms
- In-memory CSV cache must support ~150MB of parsed data

### Accessibility
- All charts must have meaningful tooltips
- Color coding must be distinguishable (Spectral scale, barplot colors)
- Images must have alt text (species name + source)
- Keyboard navigation for all interactive elements

### Responsive Design
- Mobile-responsive (375px+ viewport)
- Tables scroll horizontally on small screens
- Photo grid adapts column count to viewport width

### Data Integrity
- Data cascade clearly indicated (species/genus/family level)
- Export CSVs must include all metadata columns
- Growth curve axis capping must respect the fallback chain

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- No IE11 support required

---

## 8. Implementation Notes

### Shared Components to Build
1. **Frequency Barplot Component** — Reusable for Egg, Pelagic Juvenile, Rafting qualitative panels
2. **Data Level Indicator** — Green/Yellow/Red badge for species/genus/family fallback
3. **Dot-Strip Chart with Error Bars** — Reusable for Pelagic Juvenile, Rafting, and existing sections
4. **Export Button Group** — 3 buttons (Species/Genus/Family) per section
5. **CSV Preview Modal** — Scrollable table with all metadata columns

### Key Files to Modify
- Homepage component(s)
- Species detail page layout
- D3 growth curve chart
- D3 swimming speed charts
- Image gallery/lightbox component
- API routes (caching layer)
- Next.js config (ISR settings)

### Data Files to Update
- `Settlement_age_database_final_01.2026.txt` (replace existing)
- `Settlement_size_database_final_01.2026.txt` (replace existing)
- `Vertical_position_database_final_01.2026.txt` (replace existing)

### Assets to Integrate
- `section_icons.zip` — SVG icons for all sections (from Eliot)
- `message.txt` — Detailed per-trait metadata column specifications (from Eliot)

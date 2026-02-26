[2026-02-26 10:26] [AGENT] Manager: <@710933492053180506> <@1468975440306634936> <@1468975917308317854> 🎵 **UI & Export** — section thread ready
[2026-02-26 10:26] [AGENT] NoteBot: Ready for UI & Export work. Waiting for instructions.
[2026-02-26 10:36] [AGENT] Storm: ⚡ **UI & Export Mockup**

Includes:
- **Export buttons** per section — "Export Species/Genus/Family Traits" with CSV preview modal (ORDER, FAMILY, GENUS, VALID_NAME, APHIA_ID, AUTHORITY + trait columns)
- **Map point fix** — before/after showing edge deduplication
- **Duplicate magnifier** — before/after showing removal
- **Section SVG icons** grid (placeholder SVGs — swap with Eliot's ZIP assets)
- **Renamed section**: "Hatching & Early Development" → "Hatching & Pre-flexion Stage"
- **Performance** target: 4.2s → <1s with CSV cache + ISR

Click any export button to see the CSV preview. [attachment: ui-export.html]
[2026-02-26 11:26] Eliot RUIZ: Here is the ZIP folder for icons. Good for the buttons. Here are the metadata you need to show (message.txt) [attachment: section_icons.zip] [attachment: message.txt]
[2026-02-26 11:26] [AGENT] Manager: Got it. Two things noted:

**1. Icons ZIP** — received, will be matched by filename to each section.

**2. Metadata columns** — detailed per-trait column specs for record view + CSV export. Key additions vs. the current mockup:
- **EXT_REF** + **REFERENCE** (with link) on every section
- **_MEAN_TYPE** and **_CONF_TYPE** columns for most traits
- **Rearing/temperature** columns (mean, min, max, type) on developmental traits
- **Settlement** traits have full sampling metadata (dates, GPS, gear, otolith, location, country)
- **Swimming speed** splits into 4 sub-tables (Ucrit abs/rel, ISS abs/rel) each with origin, location, length, temperature blocks
- Some traits (Pelagic juvenile, Rafting) show only reference columns

That's a lot of columns per trait — the CSV export handles it fine, but for the **record detail view** (on-screen), do you want:

**A)** 📋 All columns visible in a scrollable table
**B)** 🎯 Key values prominent + expandable "Show all metadata" toggle
**C)** 💬 Other
[2026-02-26 11:51] Eliot RUIZ: A
[2026-02-26 11:52] [AGENT] Manager: Now launch CC for compilation:

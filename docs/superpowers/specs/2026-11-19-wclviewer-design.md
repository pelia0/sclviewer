# Legion Mythic+ Season 5 WarcraftLogs Viewer (`sclviewer`) — Design Specification

## Overview
A static, zero-registration single-page web application hosted on **GitHub Pages** (`https://github.com/pelia0/sclviewer`) that replicates the functionality and dark UI design of **WarcraftLogs** for **Legion 7.3.5 Mythic+ Season 5** logs archived in `WCLF\x03` format.

## Architecture
1. **Static Catalog Generation (Local Admin Workflow)**
   - Source data lives locally in `D:\wowlogsparser\data` (`index.db`, `master_dict.db`, `mplus_s5/*.wclf`).
   - `.wclf` files are hosted in the public Google Drive folder `1WxyGu4ocykqVJQtYrgoMgoF2MEGEOWdp` matching the exact local subfolder structure (`<dungeon_id>_<dungeon_slug>/<filename>.wclf`).
   - `scripts/build_catalog.py` reads the local SQLite databases and `.wclf` `summary` sections (in parallel with incremental caching) and recursively indexes the Google Drive folder via Google Drive API v3 to produce:
     - `public/data/catalog.json` (all packed M+ Season 5 runs with key level, duration, affixes, friendly deaths, party composition, DPS, HPS, ilvl, talents, legendaries, and `gdrive_id`).
     - `public/data/spells_dict.json` (consolidated spell dictionary from `master_dict.db` and fight summaries).
   - No local file picker or dynamic search fallback exists in the user-facing UI. Whenever new logs are added, the admin runs `scripts/build_catalog.py` locally and pushes the updated static files to GitHub.

2. **Client-Side `WCLF\x03` Decoder & Caching**
   - Binary reader (`src/lib/wclfReader.ts`) parses `WCLF\x03` / `WCLF\x02` headers, decompresses `LZMA/XZ` (`xz-decompress`) and `Zstd` (`fzstd`) sections, decodes `MessagePack` (`@msgpack/msgpack`) with custom extensions (`ExtType 1` missing sentinel, `ExtType 2` Decimal, `ExtType 3` 64-bit integer), and reconstructs columnar tables (`shared_columns`, `delta_columns`, `LSB-first` presence bitmaps).
   - Downloaded `.wclf` buffers are cached in browser `IndexedDB` (`src/lib/idbCache.ts`) by `fight_uid`.

3. **WarcraftLogs 1:1 UI & Analytical Engine**
   - **Rankings / Explorer View (`ExplorerView.tsx`):**
     - Left sidebar with all 13 Legion Season 5 dungeons + aggregate counts.
     - Filters: Class & 36 Specializations, Role, Key Level min/max, Legion Affix, Player Name, Report Code, Sort metric.
     - Paginated rankings table (`Pagination.tsx`) with page size selector (`25/50/100/250`), page number links, and jump-to-page input.
   - **Fight Analyzer (`FightView.tsx`):**
     - Interactive Raid DPS/HPS timeline chart (`TimelineChart.tsx`) with boss pull shading, friendly death markers, and click-and-drag time-window selection `[tStartMs, tEndMs]`.
     - Global Source Unit, Target Unit, and Pull/Encounter selectors.
     - 12 WCL Tabs (covering all 11 functional modes, with Buffs & Debuffs split cleanly into WCL's `Buffs` and `Debuffs` tabs):
       1. `Summary` (Overview panels + Combatant Inspector: Attributes/Stats, 7 Legion Talents, Artifact Traits, 16-slot Gear table with Wowhead bonus/gem/enchant tooltips)
       2. `Damage Done`
       3. `Damage Taken`
       4. `Healing`
       5. `Buffs` (with Gantt uptime bars)
       6. `Debuffs` (with Gantt uptime bars)
       7. `Casts` (Abilities table + Rotation Strip timeline + paginated cast log)
       8. `Deaths` (Friendly/Enemy toggle + expandable 15-second Death Recap with HP curve)
       9. `Interrupts`
       10. `Resources` (Health % and class resources over time)
       11. `Events` (paginated raw combat log with type/time/search filters)
       12. `Replay` (lazy-decoded 60 FPS 2D Canvas map replay with camera follow/full/focus, zoom/pan, party trail, and live event feed)

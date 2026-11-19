# Legion Mythic+ Season 5 WarcraftLogs Viewer Implementation Checklist

- [x] **Step 1:** Initialize Git repository (`origin -> https://github.com/pelia0/sclviewer.git`) and save design spec & plan documents.
- [x] **Step 2:** Create `scripts/build_catalog.py` and `SETUP_GDRIVE.md`, and run `build_catalog.py` to generate `public/data/catalog.json` and `public/data/spells_dict.json`.
- [x] **Step 3:** Scaffold Vite + React + TypeScript project (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`), install dependencies, implement `src/lib/wclfReader.ts`, and verify with Vitest on real `.wclf` files.
- [x] **Step 4:** Implement `src/data/legionConstants.ts`, `src/lib/combatAnalyzer.ts`, `src/lib/idbCache.ts`, `src/lib/fightLoader.ts`, and verify with Vitest.
- [x] **Step 5:** Implement WarcraftLogs dark theme (`src/styles/wcl.css`), `Pagination.tsx`, and `ExplorerView.tsx`.
- [x] **Step 6:** Implement `FightView.tsx`, `TimelineChart.tsx`, and all WCL tabs (`Summary`, `Damage Done`, `Damage Taken`, `Healing`, `Buffs`, `Debuffs`, `Casts`, `Deaths`, `Interrupts`, `Resources`, `Events`, `Replay`).
- [x] **Step 7:** Add `.github/workflows/deploy.yml` and `.gitignore`, run `npx vitest run` and `npm run build` to verify all tests and build artifacts pass, and commit to Git.

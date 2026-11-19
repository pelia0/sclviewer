import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DUNGEON_MAPS, selectBestFloor } from "../../data/dungeonMaps";
import { LEGION_DUNGEONS } from "../../data/legionConstants";
import { buildFightContext, buildReplayFrames } from "../combatAnalyzer";
import { WclfArchive } from "../wclfReader";

const MPLUS_DIR = path.resolve("D:/wowlogsparser/data/mplus_s5");

describe("dungeonMaps alignment across all 13 Legion Mythic+ dungeons", () => {
  it("has valid existing .jpg texture files for all 13 dungeons and 42 floors", () => {
    for (const d of LEGION_DUNGEONS) {
      const floors = DUNGEON_MAPS[d.id];
      expect(floors?.length).toBeGreaterThan(0);
      for (const fl of floors) {
        expect(fl.minX).toBeLessThan(fl.maxX);
        expect(fl.minY).toBeLessThan(fl.maxY);
        const rel = fl.imageUrl.replace(/^\.\//, "");
        const abs = path.resolve("public", rel);
        expect(fs.existsSync(abs)).toBe(true);
        expect(fs.statSync(abs).size).toBeGreaterThan(5000);
      }
    }
  });

  it.skipIf(!fs.existsSync(MPLUS_DIR))(
    "maps real player coordinates inside floor bounds across all 13 Legion dungeons",
    async () => {
      for (const d of LEGION_DUNGEONS) {
        const dirPath = path.join(MPLUS_DIR, `${d.id}_${d.slug}`);
        const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".wclf"));
        expect(files.length).toBeGreaterThan(0);

        const buf = fs.readFileSync(path.join(dirPath, files[0]));
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const arch = new WclfArchive(ab);
        const [summary, metadata, events, replayRaw] = await Promise.all([
          arch.readSummary(),
          arch.readMetadata(),
          arch.readEvents(),
          arch.readReplay(),
        ]);

        const ctx = buildFightContext(summary, events, metadata.manifest.start_time);
        const frames = buildReplayFrames(ctx, replayRaw).filter((f) => ctx.playerIds.has(f.actor));
        expect(frames.length).toBeGreaterThan(50);

        let inside = 0;
        for (let i = 0; i < frames.length; i += Math.max(1, Math.floor(frames.length / 80))) {
          const f = frames[i];
          const fl = selectBestFloor(d.id, f.x, f.y, f.t, ctx.encounters);
          expect(fl).not.toBeNull();
          if (fl && f.x >= fl.minX && f.x <= fl.maxX && f.y >= fl.minY && f.y <= fl.maxY) {
            inside += 1;
          }
        }
        const checked = Math.ceil(frames.length / Math.max(1, Math.floor(frames.length / 80)));
        expect(inside / checked, `${d.id} ${d.slug}`).toBeGreaterThanOrEqual(0.95);
      }
    },
    30_000
  );
});

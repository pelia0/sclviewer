import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeWindow,
  buildFightContext,
  buildReplayFrames,
  filterAndPaginateEvents,
} from "../combatAnalyzer";
import { WclfArchive } from "../wclfReader";

const SAMPLE_WCLF = path.resolve(
  "D:/wowlogsparser/data/mplus_s5/11456_eye-of-azshara/k23_32m46s_vQXLanYPfpK8bVHM_f23.wclf"
);

describe("combatAnalyzer on real Legion M+ WCLF3 archive", () => {
  it.skipIf(!fs.existsSync(SAMPLE_WCLF))(
    "extracts profiles, encounters, windowed breakdowns, buffs, casts, deaths, interrupts, events, and replay frames",
    async () => {
    const fileBuf = fs.readFileSync(SAMPLE_WCLF);
    const arrayBuf = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength);

    const archive = new WclfArchive(arrayBuf);
    const [summary, metadata, rawEvents] = await Promise.all([
      archive.readSummary(),
      archive.readMetadata(),
      archive.readEvents(),
    ]);

    const ctx = buildFightContext(summary, rawEvents, metadata.manifest.start_time);

    // 5 party members only (even though report actors list includes other fights)
    expect(ctx.playerProfiles.length).toBe(5);
    expect(ctx.playerProfiles.every((p) => p.ilvl > 800)).toBe(true);
    expect(ctx.playerProfiles.some((p) => p.stats !== null && p.stats.stamina > 1000)).toBe(true);
    expect(ctx.playerProfiles.every((p) => p.gear.length >= 15)).toBe(true);
    expect(ctx.playerProfiles.every((p) => p.talents.length === 7)).toBe(true);

    // Boss encounters extracted
    expect(ctx.encounters.length).toBe(5);
    expect(ctx.encounters[0].name).toBe("Warlord Parjesh");

    // Full window analysis
    const full = analyzeWindow(ctx, {
      tStartMs: 0,
      tEndMs: ctx.durationMs,
      sourceId: null,
      targetId: null,
      abilityId: null,
    });
    expect(full.damageDone.total).toBeGreaterThan(100_000_000);
    expect(full.damageDone.byActor.length).toBe(5);
    expect(full.damageDone.byAbility.length).toBeGreaterThan(20);
    expect(full.damageTaken.total).toBeGreaterThan(10_000_000);
    expect(full.healingDone.total).toBeGreaterThan(10_000_000);
    expect(full.buffs.length).toBeGreaterThan(10);
    expect(full.debuffs.length).toBeGreaterThan(5);
    expect(full.casts.totalCasts).toBeGreaterThan(1000);
    expect(full.interrupts.length).toBeGreaterThan(10);
    expect(full.deaths.friendly.length).toBeGreaterThan(0);

    // Sub-window (first boss only) yields smaller damage than full run
    const boss0 = ctx.encounters[0];
    const bossWindow = analyzeWindow(ctx, {
      tStartMs: boss0.startMs,
      tEndMs: boss0.endMs,
      sourceId: null,
      targetId: null,
      abilityId: null,
    });
    expect(bossWindow.damageDone.total).toBeGreaterThan(0);
    expect(bossWindow.damageDone.total).toBeLessThan(full.damageDone.total);

    // Events pagination
    const page1 = filterAndPaginateEvents(
      ctx,
      { tStartMs: 0, tEndMs: ctx.durationMs, sourceId: null, targetId: null, abilityId: null },
      { category: "damage", search: "", page: 1, pageSize: 50 }
    );
    expect(page1.totalCount).toBeGreaterThan(1000);
    expect(page1.rows.length).toBe(50);

    // Replay frames
    const replayRaw = await archive.readReplay();
    const frames = buildReplayFrames(ctx, replayRaw);
    expect(frames.length).toBeGreaterThan(5000);
  }
  );
});
